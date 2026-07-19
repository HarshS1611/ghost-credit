import type { WitnessContext } from "@midnight-ntwrk/compact-runtime";

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
