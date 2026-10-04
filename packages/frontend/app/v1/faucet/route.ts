import { NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http, parseAbi, parseEther, isAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';
import { verifyPrivyToken } from '@/lib/server/privyAuth';
import { supabase } from '@/lib/server/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DRIP_ETH = parseEther('0.0001');
const MIN_ETH = parseEther('0.00005');

// Cooldown per wallet, per token (seconds).
const ETH_COOLDOWN = 24 * 60 * 60;
const USDC_COOLDOWN = 24 * 60 * 60;

function clients() {
  const transport = http(process.env.RPC_URL);
  const wallet = createWalletClient({
    account: privateKeyToAccount(process.env.FAUCET_SEPOLIA_PRIVATE_KEY as `0x${string}`),
    chain: arbitrumSepolia,
    transport,
  });
  const client = createPublicClient({ chain: arbitrumSepolia, transport });
  return { wallet, client };
}

let queue: Promise<unknown> = Promise.resolve();
const serial = <T,>(fn: () => Promise<T>) => {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
};

const status = (code: number) => new NextResponse(null, { status: code });

// Returns 0 if granted (reserved), otherwise seconds remaining.
async function reserve(key: string, cooldown: number): Promise<number> {
  const { data, error } = await supabase.rpc('faucet_reserve', {
    p_key: key,
    p_cooldown_seconds: cooldown,
  });
  if (error) throw error;
  return Number(data);
}

// Called when the send fails, so a failed drip doesn't burn the user's cooldown.
async function release(key: string) {
  await supabase.from('faucet_claims').delete().eq('key', key);
}

export async function POST(req: Request) {
  const did = await verifyPrivyToken(req.headers.get('authorization'));
  if (!did) return status(401);

  const body = await req.json().catch(() => null);
  const address = body?.address as `0x${string}`;
  if (!address || !isAddress(address)) return status(400);
  const addr = address.toLowerCase();

  try {
    const { wallet, client } = clients();
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('privy_did', did).maybeSingle();

    const out = await serial(async () => {
      let eth: `0x${string}` | undefined;
      let usdc: `0x${string}` | undefined;
      const limited: { eth?: number; usdc?: number } = {};

      if ((await client.getBalance({ address })) < MIN_ETH) {
        const key = `eth:${addr}`;
        const wait = await reserve(key, ETH_COOLDOWN);
        if (wait > 0) {
          limited.eth = wait;
        } else {
          try {
            eth = await wallet.sendTransaction({ to: address, value: DRIP_ETH });
            await client.waitForTransactionReceipt({ hash: eth });
          } catch (e) {
            await release(key);
            throw e;
          }
        }
      }

      if (profile?.role === 'advertiser') {
        const key = `usdc:${addr}`;
        const wait = await reserve(key, USDC_COOLDOWN);
        if (wait > 0) {
          limited.usdc = wait;
        } else {
          try {
            usdc = await wallet.writeContract({
              address: process.env.USDC_ADDRESS as `0x${string}`,
              abi: parseAbi(['function mint(address,uint256)']),
              functionName: 'mint',
              args: [address, 10_000n * 10n ** 6n],
            });
            await client.waitForTransactionReceipt({ hash: usdc });
          } catch (e) {
            await release(key);
            throw e;
          }
        }
      }

      return { hash: usdc ?? eth ?? null, eth, usdc, limited };
    });

    // Nothing was sent and something was blocked by the cooldown -> 429
    if (!out.hash && (out.limited.eth || out.limited.usdc)) {
      const retryAfter = Math.max(out.limited.eth ?? 0, out.limited.usdc ?? 0);
      return NextResponse.json(
        { error: 'rate_limited', retryAfterSeconds: retryAfter },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      );
    }

    return NextResponse.json(out);
  } catch (e) {
    console.error('[faucet]', e);
    return status(500);
  }
}