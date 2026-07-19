# Ghost Credit

A private, verifiable credit score for undercollateralized DeFi lending, built on Midnight.

Built for the MLH Midnight Hackathon (DeFi track) — Jul 17-19, 2026.

## The pitch

DeFi lending is stuck at 150%+ collateralization because lenders can't evaluate a
borrower's creditworthiness without seeing their entire wallet history. Ghost Credit
lets a borrower prove "my score is above 700 and I've never been liquidated" as a
zero-knowledge circuit. The lending pool contract verifies the proof and disburses a
loan. Balances, wallets, and transaction history never touch the public ledger.

## Repo layout

```
ghost-credit/
├── contracts/                  # Compact smart contract (the core of the submission)
│   └── src/
│       ├── ghost-credit.compact   # Contract source: ledger + circuits
│       ├── witnesses.ts           # Private-state witness implementations
│       └── index.ts               # Compiled-contract wiring (witnesses + zk assets)
├── src/                         # Deploy/interact harness (npm workspace root)
│   ├── config.ts                 # Network config: local devnet / preview / preprod
│   ├── providers.ts               # MidnightProviders wiring (indexer, proof, zk config)
│   ├── wallet.ts                   # Wallet provider (seed or mnemonic)
│   ├── server.ts                   # Dev API: deploys once, exposes circuits over HTTP
│   └── test/ghost-credit.test.ts    # Deploys the contract and exercises every circuit
├── frontend/                   # Minimal 2-screen React app (borrower / lender view)
│   └── src/
│       ├── App.tsx, BorrowerView.tsx, LenderView.tsx
│       ├── ghostCreditApi.ts      # Client for src/server.ts
│       └── mockCreditData.ts      # Seeded wallet-history fixture for the demo
├── package.json                # Root workspace: deploy/test harness
└── docker-compose.yml           # Local devnet: node + indexer + proof server
```

## Setup

1. Install the Compact toolchain (compiler + proof server client):
   ```
   curl --proto '=https' --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
   compact update
   ```
   (see https://docs.midnight.network/getting-started/installation for details)

2. Install deps (npm workspace — installs both root and `contracts/`):
   ```
   npm install
   cd frontend && npm install && cd ..
   ```

3. Compile the contract:
   ```
   cd contracts && npm run build && cd ..
   ```

4. Bring up a local devnet (node + indexer + proof server) and deploy + exercise
   the contract against it:
   ```
   npm run env:up
   npm run test:local
   ```
   This deploys `ghost-credit.compact`, calls `requestLoan` with a qualifying
   credit profile (generating a real ZK proof), and calls `repayLoan` — end to
   end against a running Midnight node. Tear down with `npm run env:down`.

5. Deploy to Preprod instead (get tNIGHT + DUST from the faucet first, see
   `.env.preprod.example`):
   ```
   cp .env.preprod.example .env.preprod   # fill in your seed or mnemonic
   npm run test:preprod
   ```

6. Run the demo frontend against a real deployed contract (three terminals):
   ```
   npm run env:up        # local devnet: node + indexer + proof server
   npm run dev:api        # deploys the contract, serves its circuits over HTTP on :8787
   cd frontend && npm run dev
   ```
   The Borrower panel calls the real `requestLoan`/`repayLoan` circuits through
   `src/server.ts` and generates an actual ZK proof per request (a few seconds
   — that's the proof server, not a fake delay). `src/server.ts` exists because
   proof generation and signing normally happen in-browser via a wallet
   extension (the Midnight DApp Connector); this bridge reuses the same
   deploy/interact code the tests use so the demo doesn't depend on having a
   Midnight wallet extension installed.

## How it works

- **Identity**: a borrower is identified on-chain by `persistentHash("ghost-credit:user:pk:v1" || secretKey)`,
  a hash of a witness-held secret — never a wallet address, and never `ownPublicKey()`
  (which is prover-claimed and unverifiable, so it can't gate access).
- **Credit check**: `requestLoan` takes a `CreditProfile` (score, liquidation count,
  account age) entirely from a witness. The circuit asserts it clears the lender's
  bar; the profile itself never leaves the prover.
- **What lands on the ledger**: only the borrower's identity hash and the loan
  amount, in the `loans` map. `getLoanStatus` lets anyone check whether a given
  identity hash holds a loan and for how much — that's the entire public surface.

## Status

- [x] Compile `ghost-credit.compact` with real toolchain and fix any compiler errors
- [x] Deploy and exercise every circuit (`requestLoan`, `repayLoan`, `getLoanStatus`) against a real local Midnight devnet with actual ZK proofs — `npm run test:local`
- [x] Frontend calls the real deployed contract (approve, reject, repay all verified against local devnet) via the `src/server.ts` dev bridge
- [ ] Deploy to Preprod — script is wired (`npm run test:preprod`), just needs a funded wallet seed (get tNIGHT from the faucet)
- [ ] Wire witnesses to real wallet-history inputs (currently mocked in `frontend/src/mockCreditData.ts`) — needs a live Solana/EVM indexer, out of scope for the hackathon demo
- [ ] Real browser wallet connection via the Midnight DApp Connector (Lace) — `src/server.ts` is a dev-only stand-in; swapping it for `@midnight-ntwrk/dapp-connector-api` so proof generation happens client-side is the last step for a production submission
