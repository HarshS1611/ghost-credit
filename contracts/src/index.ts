// Re-exports everything the Compact compiler generates once
// `compact compile src/ghost-credit.compact src/managed/ghost-credit` has
// been run locally. This file is the single import point consuming apps
// (the frontend, deploy scripts) use to talk to the contract.
export * from "./managed/ghost-credit/contract/index.js";
export * from "./witnesses.js";
