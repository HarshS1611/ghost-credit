import { useState } from "react";
import BorrowerView from "./BorrowerView";
import LenderView from "./LenderView";
import type { BorrowerFixture } from "./mockCreditData";
import { repayLoan } from "./ghostCreditApi";
import "./styles.css";

export default function App() {
  const [approvedLoan, setApprovedLoan] = useState<{
    borrower: BorrowerFixture;
    amount: number;
    contractAddress: string;
  } | null>(null);

  const handleRepay = async () => {
    if (!approvedLoan) return;
    await repayLoan(approvedLoan.borrower.id);
    setApprovedLoan(null);
  };

  return (
    <div className="app">
      <header>
        <h1>Ghost Credit</h1>
        <p className="dim">Private, verifiable credit scores for undercollateralized DeFi lending — built on Midnight.</p>
      </header>

      <BorrowerView
        onLoanApproved={(borrower, amount, contractAddress) => setApprovedLoan({ borrower, amount, contractAddress })}
      />

      <LenderView approvedLoan={approvedLoan} onRepay={handleRepay} />
    </div>
  );
}
