import { Router } from "express";
import { createWalletClient, createTestClient, http, parseAbi, parseEther, isAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { verifyPrivyToken } from "../privyAuth";

const router = Router();
const transport = http(process.env.RPC_URL);
const wallet = createWalletClient({ account: privateKeyToAccount(process.env.FAUCET_PRIVATE_KEY as `0x${string}`), chain: foundry, transport });
const anvil = createTestClient({ chain: foundry, mode: "anvil", transport });

router.post("/", async (req, res) => {
  if (!(await verifyPrivyToken(req.headers.authorization))) return res.sendStatus(401);
  const address = req.body.address as `0x${string}`;
if (!isAddress(address)) return res.sendStatus(400);
   //console.log("[faucet] funding", address);
  try {
    await anvil.setBalance({ address, value: parseEther("100") });
    const hash = await wallet.writeContract({
      address: process.env.USDC_ADDRESS as `0x${string}`,
      abi: parseAbi(["function mint(address,uint256)"]),
      functionName: "mint",
      args: [address, 10_000n * 10n ** 6n],
    });
    res.json({ hash });
  } catch (e) {
    console.error("[faucet]", e);
    res.sendStatus(500);
  }
});

export default router;