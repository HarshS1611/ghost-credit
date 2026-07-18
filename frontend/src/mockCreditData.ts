// Seeded fixture standing in for a real multi-chain wallet-history indexer.
// In the full version, this is computed from the borrower's Solana/EVM
// transaction history (repayments, liquidations, account age, asset mix)
// and fed into the `creditData` witness. For the demo, it lets us show the
// full flow without depending on live indexer infrastructure.

export type WalletHistoryEntry = {
  label: string;
  detail: string;
};

export type BorrowerFixture = {
  id: string;
  displayName: string;
  score: number;
  liquidationCount: number;
  accountAgeMonths: number;
  // What a normal, non-private DeFi dashboard would show a lender today —
  // this is the data Ghost Credit keeps off the ledger entirely.
  exposedHistory: WalletHistoryEntry[];
};

export const borrowers: BorrowerFixture[] = [
  {
    id: "borrower-1",
    displayName: "Wallet A",
    score: 742,
    liquidationCount: 0,
    accountAgeMonths: 14,
    exposedHistory: [
      { label: "Balance", detail: "12.4 SOL, 3,200 USDC" },
      { label: "Repayment history", detail: "6 loans repaid on time" },
      { label: "Trading activity", detail: "Active on 3 DEXs, avg. position 800 USDC" },
    ],
  },
  {
    id: "borrower-2",
    displayName: "Wallet B",
    score: 610,
    liquidationCount: 1,
    accountAgeMonths: 4,
    exposedHistory: [
      { label: "Balance", detail: "1.1 SOL, 90 USDC" },
      { label: "Repayment history", detail: "1 liquidation event 2 months ago" },
      { label: "Trading activity", detail: "New wallet, 2 swaps total" },
    ],
  },
];
