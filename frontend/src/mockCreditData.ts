// Stands in for a live wallet-history indexer that would compute these
// fields from the borrower's on-chain transaction history and feed them
// into the `creditData` witness.

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
