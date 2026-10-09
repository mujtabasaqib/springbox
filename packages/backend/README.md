# Backend (epoch job)

A script, not a server. Once per epoch it:

1. Reads creator earnings from Supabase.
2. Builds a Merkle tree of cumulative amounts (carried forward so leaves never decrease).
3. Publishes the root to the escrow on-chain and stores proofs in Supabase.
4. Refunds unspent budget for campaigns marked `ended`.

## Run locally

```bash
npm install
cp .env.example .env
npm run epoch
```

## Structure

```
src/
  epoch.ts            Publish and refund logic
  chain.ts            Chain, clients, escrow ABI
  supabase.ts         Supabase client
  scripts/runEpoch.ts Entry point
```

## Environment variables

`OPERATOR_PRIVATE_KEY`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `RPC_URL`, `CHAIN_ID`, `ESCROW_DEPLOY_BLOCK`, and the escrow address. See .env.example

## Scheduling

Runs daily through GitHub Actions (`.github/workflows/epoch.yml`). Add the variables above as repository secrets. The operator key lives only in GitHub secrets and is never deployed to Vercel. Use a testnet-only, low-funded key.

## Notes

- The epoch is skipped when there are no new earnings.
- Re-running is safe: refunds are checked against on-chain state.

## License

MIT