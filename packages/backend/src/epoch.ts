import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import { parseAbi, parseAbiItem, parseEventLogs, type Hex } from 'viem';
import { supabase } from './supabase';
import { ESCROW, escrowAbi, operator, publicClient, walletClient } from './chain';

const USDC_UNITS = 1_000_000;

const CAMPAIGN_CHAIN_ID_COL = 'onchain_campaign_id'; // campaigns.<this> = onchain id
const JOINS_CAMPAIGN_COL = 'campaign_id'; // campaign_joins.<this> = campaigns.id
const ENDED_STATUS = 'ended'; // set by your "End campaign" route; stop crediting views at the same time
const REFUNDED_STATUS = 'refunded';

// Block the escrow was deployed at, to keep getLogs ranges small on public RPCs.
const DEPLOY_BLOCK = BigInt(process.env.ESCROW_DEPLOY_BLOCK ?? 0);

const refundAbi = parseAbi(['function refund(uint256 campaignId, address advertiser, uint256 amount)']);
const fundedEvent = parseAbiItem(
  'event CampaignFunded(uint256 indexed campaignId, address indexed advertiser, uint256 budget)'
);
const refundedEvent = parseAbiItem(
  'event Refunded(uint256 indexed campaignId, address indexed advertiser, uint256 amount)'
);

// Leaves round DOWN (never promise more than earned)...
const toUnits = (usdc: number) => BigInt(Math.floor(usdc * USDC_UNITS));
// ...campaign spend rounds UP (never refund money that creators may have earned).
const toUnitsCeil = (usdc: number) => BigInt(Math.ceil(usdc * USDC_UNITS));

export async function runEpoch() {
  await publishStep();
  await refundEndedCampaigns(); // runs even when there was nothing new to publish
}

async function publishStep() {
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

  // 4. DID -> wallet (paginate once you pass 1000 rows)
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('privy_did, wallet_address')
    .not('wallet_address', 'is', null);
  if (pErr) throw pErr;
  const walletOf = new Map<string, string>(
    (profiles ?? []).map((p) => [p.privy_did, String(p.wallet_address).toLowerCase()])
  );

  // 5. Total earned per creator DID, in base units (viewer pool removed for v1)
  const earned = new Map<string, bigint>();
  const { data: joins, error: jErr } = await supabase.from('campaign_joins').select('creator_id, earned');
  if (jErr) throw jErr;
  for (const j of joins ?? []) {
    earned.set(j.creator_id, (earned.get(j.creator_id) ?? 0n) + toUnits(Number(j.earned)));
  }

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

/**
 * For every campaign marked 'ended': refund = budget - (everything creators earned on it).
 * Spend counts ALL joins, including creators without a linked wallet, so their money
 * stays reserved in the contract. Idempotent: the Refunded event is the source of truth.
 */
async function refundEndedCampaigns() {
  const { data: ended, error } = await supabase.from('campaigns').select('*').eq('status', ENDED_STATUS);
  if (error) throw error;

  for (const c of ended ?? []) {
    try {
      const onchainId = BigInt(c[CAMPAIGN_CHAIN_ID_COL]);

      // Advertiser + budget come from the funding tx receipt
      const fundReceipt = await publicClient.getTransactionReceipt({ hash: c.fund_tx_hash });
      const fundedLog = parseEventLogs({ abi: [fundedEvent], eventName: 'CampaignFunded', logs: fundReceipt.logs })
        .find((l) => l.args.campaignId === onchainId);
      if (!fundedLog) {
        console.warn(`Campaign ${c.id}: no CampaignFunded in fund tx, skipping.`);
        continue;
      }
      const { advertiser, budget } = fundedLog.args;

      let spent = toUnitsCeil(Number(c.spent));
      if (spent > budget) spent = budget;
      const amount = budget - spent;

      if (amount === 0n) {
        await supabase.from('campaigns').update({ status: REFUNDED_STATUS }).eq('id', c.id);
        console.log(`Campaign ${c.id}: fully spent, nothing to refund.`);
        continue;
      }

      let hash: Hex;
      try {
        const { request } = await publicClient.simulateContract({
          account: operator,
          address: ESCROW,
          abi: refundAbi,
          functionName: 'refund',
          args: [onchainId, advertiser, amount],
        });
        hash = await walletClient.writeContract(request);
      } catch (simErr) {
        // Simulation failed: maybe it was already refunded (DB update failed last run).
        // Only now do the (chunked) log scan, so the normal path makes no getLogs call.
        if (await alreadyRefunded(onchainId, fundReceipt.blockNumber)) {
          await supabase.from('campaigns').update({ status: REFUNDED_STATUS }).eq('id', c.id);
          console.log(`Campaign ${c.id}: already refunded onchain, status synced.`);
          continue;
        }
        throw simErr;
      }

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') throw new Error(`refund reverted: ${hash}`);

      await supabase
      .from('campaigns')
      .update({ status: REFUNDED_STATUS, refund_tx_hash: hash, refunded_at: new Date().toISOString() })
      .eq('id', c.id);
      console.log(`Campaign ${c.id}: refunded ${amount} units to ${advertiser}, tx ${hash}`);
    } catch (e) {
      console.error(`Campaign ${c.id}: refund failed:`, e);
    }
  }
}

// Fallback only: scans in <=9k-block chunks to match RPC's limit
async function alreadyRefunded(campaignId: bigint, fromBlock: bigint) {
  const STEP = 9_000n;
  const latest = await publicClient.getBlockNumber();
  for (let from = fromBlock; from <= latest; from += STEP) {
    const to = from + STEP - 1n > latest ? latest : from + STEP - 1n;
    const logs = await publicClient.getLogs({
      address: ESCROW, event: refundedEvent, args: { campaignId }, fromBlock: from, toBlock: to,
    });
    if (logs.length) return true;
  }
  return false;
}