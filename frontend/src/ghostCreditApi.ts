// Talks to the local dev API (src/server.ts at the repo root) that deploys
// Ghost Credit to a real local Midnight devnet and exposes its circuits over
// HTTP. See src/server.ts for why this bridge exists instead of a browser
// wallet connection.

const API_BASE = import.meta.env.VITE_GHOST_CREDIT_API ?? "http://127.0.0.1:8787";

export type CreditProfile = {
  score: number;
  liquidationCount: number;
  accountAgeMonths: number;
};

export type RequestLoanResult =
  | { approved: true; contractAddress: string; totalLoansIssued: string; loanAmount: number }
  | { approved: false; reason: string };

export async function requestLoan(
  borrowerId: string,
  profile: CreditProfile,
  loanAmount: number,
): Promise<RequestLoanResult> {
  const res = await fetch(`${API_BASE}/api/request-loan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ borrowerId, profile, loanAmount }),
  });
  if (!res.ok) throw new Error(`request-loan failed: ${res.status}`);
  return res.json();
}

export async function repayLoan(borrowerId: string): Promise<{ repaid: true; contractAddress: string; totalLoansIssued: string }> {
  const res = await fetch(`${API_BASE}/api/repay-loan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ borrowerId }),
  });
  if (!res.ok) throw new Error(`repay-loan failed: ${res.status}`);
  return res.json();
}

export async function getStatus(): Promise<{ contractAddress: string; totalLoansIssued: string; loanCount: string }> {
  const res = await fetch(`${API_BASE}/api/status`);
  if (!res.ok) throw new Error(`status failed: ${res.status}`);
  return res.json();
}
