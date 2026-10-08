# Contracts

Foundry project with the USDC escrow and a permit-enabled mock USDC for testnet.

## Escrow

- `createCampaign(budget)` and `createCampaignWithPermit(...)` fund a campaign. The permit version needs one signature and one transaction.
- `publishEpoch(root, total)` is operator-only and sets the Merkle root.
- `claim(cumulativeAmount, proof)` pays out the difference between the cumulative amount and what was already claimed.
- `refund(campaignId, advertiser, amount)` returns unspent budget to the advertiser.

## Mock USDC

`MockUSDCPermit` is an ERC-20 with 6 decimals, `permit`, and an open `mint`. **Testnet only.**

## Build and test

```bash
forge build
forge test -vv
```

## Deploy

```bash
forge script script/Deploy.s.sol \
  --rpc-url $RPC_URL \
  --broadcast
```

Record the escrow address and its deploy block, then set them in the frontend and backend environments.

## Network

Live contract and Mock USDC on Arbitrum Sepolia

Escrow: `https://sepolia.arbiscan.io/address/0xA9a6d56f7D8791e77622c7110A9D1A24a3D1f62E`

USDC: `https://sepolia.arbiscan.io/address/0xB5B63eE7A19D3183850524539B89C749a57B79e0`

## License

MIT