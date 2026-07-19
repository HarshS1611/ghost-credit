import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";
import path from "node:path";

export * from "./managed/ghost-credit/contract/index.js";
export * from "./witnesses.js";

import * as CompiledGhostCredit from "./managed/ghost-credit/contract/index.js";
import * as Witnesses from "./witnesses.js";

const currentDir = path.resolve(new URL(import.meta.url).pathname, "..");
export const zkConfigPath = path.resolve(currentDir, "managed", "ghost-credit");

export const CompiledGhostCreditContract = CompiledContract.make<
  CompiledGhostCredit.Contract<Witnesses.GhostCreditPrivateState>
>("GhostCredit", CompiledGhostCredit.Contract<Witnesses.GhostCreditPrivateState>).pipe(
  CompiledContract.withWitnesses(Witnesses.witnesses),
  CompiledContract.withCompiledFileAssets(zkConfigPath),
);
