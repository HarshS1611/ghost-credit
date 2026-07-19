// Requires wallet seed + MidnightProviders config, see
// https://docs.midnight.network/guides (Configure MidnightProviders)

import { deployContract } from "@midnight-ntwrk/midnight-js-contracts";
import * as GhostCredit from "../contracts/src/index.js";
import { createGhostCreditPrivateState } from "../contracts/src/witnesses.js";

async function main() {
  // TODO: load a real wallet seed from env, and real providers per the
  // "Configure MidnightProviders" guide.
  const initialPrivateState = createGhostCreditPrivateState(
    new Uint8Array(32),
    { score: 0, liquidationCount: 0, accountAgeMonths: 0 }
  );

  console.log("Deploying Ghost Credit contract...");
  // const deployed = await deployContract(providers, {
  //   contract: GhostCredit,
  //   privateStateId: "ghostCreditPrivateState",
  //   initialPrivateState,
  // });
  // console.log("Deployed at:", deployed.deployTxData.public.contractAddress);
}

main().catch(console.error);
