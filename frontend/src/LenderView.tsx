import { useState } from "react";
import type { BorrowerFixture } from "./mockCreditData";

type Props = {
  approvedLoan: { borrower: BorrowerFixture; amount: number; contractAddress: string } | null;
  onRepay: () => Promise<void>;
};

export default function LenderView({ approvedLoan, onRepay }: Props) {
  const [repaying, setRepaying] = useState(false);

  const handleRepay = async () => {
    setRepaying(true);
    try {
      await onRepay();
    } finally {
      setRepaying(false);
    }
  };

  return (
    <div className="panel side-by-side">
      <div>
        <h2>Lender — a normal DeFi dashboard</h2>
        <p className="dim">What most lending protocols show today.</p>
        {approvedLoan ? (
          <ul className="exposed">
            {approvedLoan.borrower.exposedHistory.map((h) => (
              <li key={h.label}>
                <strong>{h.label}:</strong> {h.detail}
              </li>
            ))}
          </ul>
        ) : (
          <p className="dim">Waiting for a loan request...</p>
        )}
      </div>

      <div>
        <h2>Lender — Ghost Credit</h2>
        <p className="dim">What this lender actually sees.</p>
        {approvedLoan ? (
          <div className="checkmark-box">
            <div className="checkmark">✓</div>
            <p>Loan approved: {approvedLoan.amount} USDC</p>
            <p className="dim">Score, history, and wallet: not disclosed</p>
            <p className="dim" title={approvedLoan.contractAddress}>
              On-chain at {approvedLoan.contractAddress.slice(0, 16)}…
            </p>
            <button onClick={handleRepay} disabled={repaying}>
              {repaying ? "Submitting repayment..." : "Repay loan"}
            </button>
          </div>
        ) : (
          <p className="dim">Waiting for a loan request...</p>
        )}
      </div>
    </div>
  );
}
