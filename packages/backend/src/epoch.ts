import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import type { Hex } from 'viem';
import { supabase } from './supabase';
import { ESCROW, escrowAbi, operator, publicClient, walletClient } from './chain';

// Keep in sync with index.ts
const RATE_PER_VIEW = 0.0005;
const USDC_UNITS = 1_000_000;

// Round DOWN so we never promise more than the DB says was earned.
const toUnits = (usdc: number) => BigInt(Math.floor(usdc * USDC_UNITS));

export async function runEpoch() {
  // 1. On-chain state
  const [chainEpoch, chainAllocated, deposited] = await Promise.all([
    publicClient.readContract({ address: ESCROW, abi: escrowAbi, functionName: 'epoch' }),
    publicClient.readContract({ address: ESCROW, abi: escrowAbi, functionName: 'totalAllocated' }),
    publicClient.readContract({ address: ESCROW, abi: escrowAbi, functionName: 'totalDeposited' }),
  ]);
  const newEpoch = Number(chainEpoch) + 1;

  // 2. DB must not already contain the epoch about to publish
  const { data: clash } = await supabase.from('epochs').select('epoch').eq('epoch', newEpoch).maybeSingle();
  if (clash) {
    throw new Error(
      `DB already has epoch ${newEpoch} but chain is at ${chainEpoch}. ` +
        `If you restarted Anvil, clear the epochs and claim_proofs tables.`
    );
  }

  // 3. Carry forward last epoch's cumulative amounts so leaves never decrease
  const totals = new Map<string, bigint>(); // lowercase address -> cumulative base units
  if (chainEpoch > 0n) {
    const { data, error } = await supabase
      .from('claim_proofs')
      .select('address, cumulative_amount')
      .eq('epoch', Number(chainEpoch));
    if (error) throw error;
    for (const r of data ?? []) totals.set(r.address, BigInt(r.cumulative_amount));
  }

  // 4. DID -> wallet (fine locally; paginate once you pass 1000 rows)
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('privy_did, wallet_address')
    .not('wallet_address', 'is', null);
  if (pErr) throw pErr;
  const walletOf = new Map<string, string>(
    (profiles ?? []).map((p) => [p.privy_did, String(p.wallet_address).toLowerCase()])
  );

  // 5. Total earned per DID, in base units
  const earned = new Map<string, bigint>();
  const add = (did: string, amt: bigint) => earned.set(did, (earned.get(did) ?? 0n) + amt);

  //    creators: sum of campaign_joins.earned (assumed to be USDC, e.g. 100 = 100 USDC)
  const { data: joins, error: jErr } = await supabase.from('campaign_joins').select('creator_id, earned');
  if (jErr) throw jErr;
  for (const j of joins ?? []) add(j.creator_id, toUnits(Number(j.earned)));

  //    viewers: equal share of the pool. Split by ALL members so shares don't jump
  //    when wallets get linked later.
  const [{ data: pool }, { data: members }] = await Promise.all([
    supabase.from('reward_pool').select('verified_views').eq('id', 1).single(),
    supabase.from('reward_members').select('privy_did'),
  ]);
  const memberCount = Math.max(1, members?.length ?? 1);
  const viewerShare = toUnits((Number(pool?.verified_views ?? 0) * RATE_PER_VIEW) / memberCount);
  for (const m of members ?? []) add(m.privy_did, viewerShare);

  // 6. Merge into one leaf per address: max(previous, new)
  let skipped = 0;
  for (const [did, units] of earned) {
    const addr = walletOf.get(did);
    if (!addr) {
      skipped++;
      continue;
    }
    const prev = totals.get(addr) ?? 0n;
    totals.set(addr, units > prev ? units : prev);
  }

  const entries = [...totals].filter(([, v]) => v > 0n);
  if (!entries.length) return console.log('Nothing to publish (no earners with linked wallets).');

  const total = entries.reduce((s, [, v]) => s + v, 0n);
  if (total > deposited) throw new Error(`Allocated ${total} exceeds deposited ${deposited}`);
  if (chainEpoch > 0n && total === chainAllocated) return console.log('No new earnings since last epoch.');
  if (total < chainAllocated) throw new Error(`Total ${total} is below on-chain allocated ${chainAllocated}`);

  // 7. Build tree (leaf = keccak(keccak(abi.encode(address, uint256))), matches the contract)
  const tree = StandardMerkleTree.of(
    entries.map(([addr, v]) => [addr, v.toString()]),
    ['address', 'uint256']
  );

  // 8. Publish on-chain (simulate first so reverts show a readable error)
  const { request } = await publicClient.simulateContract({
    account: operator,
    address: ESCROW,
    abi: escrowAbi,
    functionName: 'publishEpoch',
    args: [tree.root as Hex, total],
  });
  const hash = await walletClient.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') throw new Error(`publishEpoch reverted: ${hash}`);

  // 9. Store epoch + proofs. If this fails, just rerun: a new root replaces the old one.
  const { error: eErr } = await supabase.from('epochs').insert({
    epoch: newEpoch,
    root: tree.root,
    total_allocated: total.toString(),
    published_tx_hash: hash,
  });
  if (eErr) throw eErr;

  const rows = [];
  for (const [i, value] of tree.entries()) {
    const [address, amount] = value as string[];
    rows.push({ epoch: newEpoch, address, cumulative_amount: amount, proof: tree.getProof(i) });
  }
  const { error: cErr } = await supabase.from('claim_proofs').insert(rows);
  if (cErr) throw cErr;

  console.log(
    `Epoch ${newEpoch} published: ${rows.length} leaves, total ${total} units, ` +
      `${skipped} earners skipped (no wallet), tx ${hash}`
  );
}