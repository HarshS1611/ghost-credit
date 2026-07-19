import { useState } from "react";
import { borrowers, type BorrowerFixture } from "./mockCreditData";

const MIN_SCORE = 700;

type Props = {
  onLoanApproved: (borrower: BorrowerFixture, amount: number) => void;
};

export default function BorrowerView({ onLoanApproved }: Props) {
  const [selectedId, setSelectedId] = useState(borrowers[0].id);
  const [proving, setProving] = useState(false);
  const [result, setResult] = useState<"idle" | "approved" | "rejected">("idle");

  const borrower = borrowers.find((b) => b.id === selectedId)!;

  // Stands in for ghostCreditContract.callTx.requestLoan(loanAmount, MIN_SCORE)
  // against the deployed contract and local proof server.
  const runProof = async () => {
    setProving(true);
    setResult("idle");
    await new Promise((r) => setTimeout(r, 1200));

    const passes =
      borrower.score >= MIN_SCORE &&
      borrower.liquidationCount === 0 &&
      borrower.accountAgeMonths >= 6;

    setProving(false);
    setResult(passes ? "approved" : "rejected");
    if (passes) onLoanApproved(borrower, 500);
  };

  return (
    <div className="panel">
      <h2>Borrower</h2>
      <p className="dim">Connect a wallet and request a loan.</p>

      <label>
        Wallet
        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          {borrowers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.displayName}
            </option>
          ))}
        </select>
      </label>

      <div className="private-box">
        <strong>Private inputs (never leave your device)</strong>
        <ul>
          <li>Score: {borrower.score}</li>
          <li>Liquidations: {borrower.liquidationCount}</li>
          <li>Account age: {borrower.accountAgeMonths} months</li>
        </ul>
      </div>

      <button onClick={runProof} disabled={proving}>
        {proving ? "Generating proof..." : `Request 500 USDC loan (needs score ≥ ${MIN_SCORE})`}
      </button>

      {result === "approved" && <p className="ok">Proof verified. Loan approved.</p>}
      {result === "rejected" && <p className="fail">Proof failed threshold — loan denied.</p>}
    </div>
  );
}
