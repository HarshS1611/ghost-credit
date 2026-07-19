import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { WebSocket } from "ws";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { deployContract, submitCallTx, type DeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import type { ContractAddress } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { type EnvironmentConfiguration, waitForFunds } from "@midnight-ntwrk/testkit-js";
import { randomBytes } from "node:crypto";
import pino from "pino";

import { getConfig } from "../config.js";
import { MidnightWalletProvider, syncWallet, type WalletSecret } from "../wallet.js";
import { buildProviders, type GhostCreditProviders } from "../providers.js";
import {
  CompiledGhostCreditContract,
  Contract,
  ledger,
  zkConfigPath,
  createGhostCreditPrivateState,
} from "../../contracts/src/index.js";

// Required for GraphQL subscriptions in Node.js
// @ts-expect-error WebSocket global assignment for apollo
globalThis.WebSocket = WebSocket;

const ALICE_LOCAL_SEED = "0000000000000000000000000000000000000000000000000000000000000001";
const PRIVATE_STATE_ID = "GhostCreditBorrowerState";

const logger = pino({
  level: process.env["LOG_LEVEL"] ?? "info",
  transport: { target: "pino-pretty" },
});

const network = process.env["MIDNIGHT_NETWORK"] ?? "local";

function resolveSecret(net: string): WalletSecret {
  if (net === "local") return { kind: "seed", value: ALICE_LOCAL_SEED };

  const upper = net.toUpperCase();
  const mnemonicEnv = `MIDNIGHT_${upper}_MNEMONIC`;
  const seedEnv = `MIDNIGHT_${upper}_SEED`;
  const mnemonic = process.env[mnemonicEnv]?.trim().replace(/\s+/g, " ");
  const seedHex = process.env[seedEnv]?.trim();

  if (mnemonic && seedHex) {
    throw new Error(`Set only one of ${mnemonicEnv} or ${seedEnv} (both are defined).`);
  }
  if (mnemonic) return { kind: "mnemonic", value: mnemonic };
  if (seedHex) {
    if (!/^[0-9a-fA-F]+$/.test(seedHex) || seedHex.length % 2 !== 0) {
      throw new Error(`${seedEnv} must be a hex string of even length (no 0x prefix).`);
    }
    return { kind: "seed", value: seedHex };
  }
  throw new Error(`Either ${mnemonicEnv} or ${seedEnv} is required for network '${net}'. Set one in .env.${net} or the shell.`);
}

// Borrower whose private profile clears the lender's bar (score 700+, no
// liquidations, 6+ months history) — matches the "Wallet A" fixture the
// frontend demo uses.
const QUALIFYING_PROFILE = { score: 742, liquidationCount: 0, accountAgeMonths: 14 };
const LOAN_AMOUNT = 500n;
const MIN_SCORE = 700n;

describe(`Ghost Credit Contract (${network})`, () => {
  let wallet: MidnightWalletProvider;
  let providers: GhostCreditProviders;
  let contractAddress: ContractAddress;

  const config = getConfig();
  const secret = resolveSecret(network);
  const isRemote = network !== "local";
  const syncTimeoutMs = Number(
    process.env["MIDNIGHT_SYNC_TIMEOUT_MS"] ?? (isRemote ? 60 * 60_000 : 10 * 60_000),
  );

  async function queryLedger(p: GhostCreditProviders) {
    const state = await p.publicDataProvider.queryContractState(contractAddress);
    expect(state).not.toBeNull();
    return ledger(state!.data);
  }

  beforeAll(async () => {
    setNetworkId(config.networkId);

    const envConfig: EnvironmentConfiguration = {
      walletNetworkId: config.networkId,
      networkId: config.networkId,
      indexer: config.indexer,
      indexerWS: config.indexerWS,
      node: config.node,
      nodeWS: config.nodeWS,
      faucet: config.faucet,
      proofServer: config.proofServer,
    };

    wallet = await MidnightWalletProvider.build(logger, envConfig, secret);
    await wallet.start();
    await syncWallet(logger, wallet.wallet, syncTimeoutMs);

    if (isRemote) {
      const nightBalance = await waitForFunds(wallet.wallet, envConfig, false, wallet.unshieldedKeystore);
      logger.info(`Wallet NIGHT balance on '${network}': ${nightBalance}`);
    }

    providers = buildProviders(wallet, zkConfigPath, config);
    logger.info(`Providers initialized on '${network}'. Ready to test!`);
  }, syncTimeoutMs + 60_000);

  afterAll(async () => {
    if (wallet) {
      logger.info("Stopping wallet...");
      await wallet.stop();
    }
  });

  it("deploys the contract with a qualifying borrower profile", async () => {
    const deployed: DeployedContract<Contract> = await deployContract<Contract>(providers, {
      compiledContract: CompiledGhostCreditContract,
      privateStateId: PRIVATE_STATE_ID,
      initialPrivateState: createGhostCreditPrivateState(
        new Uint8Array(randomBytes(32)),
        QUALIFYING_PROFILE,
      ),
    });

    contractAddress = deployed.deployTxData.public.contractAddress;
    logger.info(`Contract deployed at: ${contractAddress}`);
    expect(contractAddress).toBeDefined();

    const state = await queryLedger(providers);
    expect(state.loans.isEmpty()).toBe(true);
    expect(state.totalLoansIssued).toBe(0n);
  });

  it("approves a loan for a qualifying borrower without disclosing their credit profile", async () => {
    await submitCallTx<Contract, "requestLoan">(providers, {
      compiledContract: CompiledGhostCreditContract,
      contractAddress,
      privateStateId: PRIVATE_STATE_ID,
      circuitId: "requestLoan",
      args: [LOAN_AMOUNT, MIN_SCORE],
    });

    const state = await queryLedger(providers);
    expect(state.totalLoansIssued).toBe(1n);
    expect(state.loans.size()).toBe(1n);
  });

  it("clears the loan on repayment", async () => {
    await submitCallTx<Contract, "repayLoan">(providers, {
      compiledContract: CompiledGhostCreditContract,
      contractAddress,
      privateStateId: PRIVATE_STATE_ID,
      circuitId: "repayLoan",
    });

    const state = await queryLedger(providers);
    expect(state.loans.isEmpty()).toBe(true);
  });
});
