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
├── contracts/                 # Compact smart contract (the core of the submission)
│   ├── src/
│   │   ├── ghost-credit.compact   # Contract source: ledger + circuits
│   │   ├── witnesses.ts           # Private-state witness implementations
│   │   └── index.ts               # Re-exports generated contract API
│   ├── package.json
│   └── tsconfig.json
├── frontend/                   # Minimal 2-screen React app (borrower / lender view)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── BorrowerView.tsx
│   │   ├── LenderView.tsx
│   │   └── mockCreditData.ts      # Seeded wallet-history fixture for the demo
│   ├── package.json
│   └── index.html
├── scripts/
│   └── deploy.ts                # Deploys the compiled contract to Preprod/mainnet
└── docker-compose.yml           # Local proof server
```

## Setup

1. Install the Compact toolchain (compiler + proof server):
   ```
   curl --proto '=https' --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
   compact update
   ```
   (see https://docs.midnight.network/getting-started/installation for details)

2. Install deps:
   ```
   cd contracts && npm install
   cd ../frontend && npm install
   ```

3. Compile the contract:
   ```
   cd contracts
   npm run build
   ```

4. Start the proof server (needed before any deploy/interact call):
   ```
   docker compose up -d
   ```

5. Deploy to Preprod (get tNIGHT from the faucet first):
   ```
   npx ts-node scripts/deploy.ts
   ```

6. Run the frontend:
   ```
   cd frontend && npm run dev
   ```

## Demo script (3 min)

1. Show a normal DeFi lending dashboard leaking full wallet history (10s).
2. Borrower connects wallet in Ghost Credit → generates proof locally (20s).
3. Lender view: only a green checkmark + approved loan amount, nothing else (20s).
4. Submit `requestLoan` on-chain, show the tx hash on the Midnight explorer (30s).
5. One sentence: "This is the only reason DeFi is stuck at 150% collateral."

## Status

- [x] Compile `ghost-credit.compact` with real toolchain and fix any compiler errors
- [ ] Wire witnesses to real wallet-history inputs (currently mocked in `frontend/src/mockCreditData.ts`) — needs a live Solana/EVM indexer, out of scope for the hackathon demo
- [ ] Deploy to Preprod, then mainnet if time allows — needs a funded wallet seed (get tNIGHT from the faucet) and Midnight RPC config in `scripts/deploy.ts`
- [ ] Connect frontend to deployed contract via Midnight DApp Connector — depends on the Preprod deploy above
