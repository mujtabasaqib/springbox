# Frontend

Next.js app that serves the advertiser and creator dashboards **and** the API used by the SDK. Deployed on Vercel.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000
```

## Structure

```
app/
  (marketing)/     Landing, about, how-it-works
  dashboard/       Advertiser and creator dashboards
  v1/              API routes (ads, events, campaigns, claims, faucet, profiles, publisher)
components/        UI and wallet components
lib/
  server/          Server-only helpers (Supabase, Privy auth, tokens, chain reads)
  data/            Dashboard data fetching
  onchain.ts       Fund, claim and withdraw transactions
```

## API

| Route | Purpose |
|---|---|
| `POST /v1/ads/request` | Returns an ad and a signed token (CORS open for the SDK) |
| `POST /v1/events` | Records an impression or click after verifying the token |
| `/v1/campaigns/*` | Create, fund (verifies the tx on-chain), end |
| `/v1/claims/*` | Claim state, history, record claim and withdraw |
| `POST /v1/faucet` | Testnet ETH and USDC with a per-wallet cooldown |
| `/v1/profiles/*`, `/v1/publisher/me` | Role and publisher ID |

Protected routes expect `Authorization: Bearer <Privy token>`.

## Environment variables

Public (`NEXT_PUBLIC_`): Privy app ID, Supabase URL, Supabase publishable key, plus any chain vars read by `lib/chain.ts`.

Server only (never prefix with `NEXT_PUBLIC_`): `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `PRIVY_APP_ID`, `PRIVY_APP_SECRET`, `TOKEN_SECRET`, `FAUCET_SEPOLIA_PRIVATE_KEY`, `RPC_URL`, `CHAIN_ID`, `USDC_ADDRESS`, and the escrow address.

The operator key is **not** used here. It lives only in the epoch job. 
See .env.example

## Deploy

Import the repo in Vercel, set the root directory to `packages/frontend`, and add the variables above.

## License

AGPL-3.0