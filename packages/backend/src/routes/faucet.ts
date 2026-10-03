import { Router } from "express";
import { createWalletClient, createPublicClient, http, parseAbi, parseEther, isAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import { verifyPrivyToken } from "../privyAuth";
import { supabase } from "../supabase";

const router = Router();
const transport = http(process.env.RPC_URL);
const wallet = createWalletClient({
  account: privateKeyToAccount(process.env.FAUCET_SEPOLIA_PRIVATE_KEY as `0x${string}`),
  chain: arbitrumSepolia,
  transport,
});
const client = createPublicClient({ chain: arbitrumSepolia, transport });

const DRIP_ETH = parseEther("0.0002");
const MIN_ETH = parseEther("0.0001");

// One faucet request signs at a time, so nonces can't collide.
let queue: Promise<unknown> = Promise.resolve();
const serial = <T,>(fn: () => Promise<T>) => {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
};

router.post("/", async (req, res) => {
  const did = await verifyPrivyToken(req.headers.authorization);
  if (!did) return res.sendStatus(401);
  const address = req.body.address as `0x${string}`;
  if (!isAddress(address)) return res.sendStatus(400);

  try {
    const { data: profile } = await supabase
      .from("profiles").select("role").eq("privy_did", did).maybeSingle();

    const out = await serial(async () => {
      let eth: `0x${string}` | undefined;
      let usdc: `0x${string}` | undefined;

      if ((await client.getBalance({ address })) < MIN_ETH) {
        eth = await wallet.sendTransaction({ to: address, value: DRIP_ETH });
        await client.waitForTransactionReceipt({ hash: eth }); // mined before the next tx
      }

      if (profile?.role === "advertiser") {
        usdc = await wallet.writeContract({
          address: process.env.USDC_ADDRESS as `0x${string}`,
          abi: parseAbi(["function mint(address,uint256)"]),
          functionName: "mint",
          args: [address, 10_000n * 10n ** 6n],
        });
        await client.waitForTransactionReceipt({ hash: usdc }); // keeps the queue's next request clean
      }

      return { hash: usdc ?? eth ?? null, eth, usdc };
    });

    res.json(out);
  } catch (e) {
    console.error("[faucet]", e);
    res.sendStatus(500);
  }
});

export default router;
