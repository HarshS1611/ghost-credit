import type { WitnessContext } from "@midnight-ntwrk/compact-runtime";

// Private state kept locally by the borrower's wallet/app — never sent
// on-chain. secretKey identifies the borrower to the circuit without
// revealing a wallet address; creditProfile holds the score computed
// off-chain from their wallet history (see ../../frontend/src/mockCreditData.ts
// for how this is derived in the demo).
export type GhostCreditPrivateState = {
  secretKey: Uint8Array;
  creditProfile: {
    score: number;
    liquidationCount: number;
    accountAgeMonths: number;
  };
};

export const createGhostCreditPrivateState = (
  secretKey: Uint8Array,
  creditProfile: GhostCreditPrivateState["creditProfile"]
): GhostCreditPrivateState => ({ secretKey, creditProfile });

// Witness implementations. Each receives a WitnessContext with access to
// the current ledger + private state and must return [newPrivateState, value].
export const witnesses = {
  localSecretKey: ({
    privateState,
  }: WitnessContext<unknown, GhostCreditPrivateState>): [GhostCreditPrivateState, Uint8Array] => [
    privateState,
    privateState.secretKey,
  ],

  creditData: ({
    privateState,
  }: WitnessContext<unknown, GhostCreditPrivateState>): [
    GhostCreditPrivateState,
    { score: bigint; liquidationCount: bigint; accountAgeMonths: bigint }
  ] => [
    privateState,
    {
      score: BigInt(privateState.creditProfile.score),
      liquidationCount: BigInt(privateState.creditProfile.liquidationCount),
      accountAgeMonths: BigInt(privateState.creditProfile.accountAgeMonths),
    },
  ],
};
