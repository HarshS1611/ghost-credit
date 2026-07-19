// Dev-only bridge: the production path is proof generation and signing in
// the browser via the Midnight DApp Connector, not a server. This exists
// because that needs a wallet extension this environment can't test against
// — it still does real circuit calls and real ZK proofs against local devnet.

import { createHash, randomBytes } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { deployContract, submitCallTx, type DeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import type { ContractAddress } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import type { EnvironmentConfiguration } from "@midnight-ntwrk/testkit-js";
import pino from "pino";

import { getConfig } from "./config.js";
import { MidnightWalletProvider, syncWallet } from "./wallet.js";
import { buildProviders, type GhostCreditProviders } from "./providers.js";
import {
  CompiledGhostCreditContract,
  Contract,
  ledger,
  zkConfigPath,
  createGhostCreditPrivateState,
} from "../contracts/src/index.js";

const ALICE_LOCAL_SEED = "0000000000000000000000000000000000000000000000000000000000000001";
const PORT = Number(process.env["PORT"] ?? 8787);
const MIN_SCORE = 700n;

const logger = pino({ level: process.env["LOG_LEVEL"] ?? "info", transport: { target: "pino-pretty" } });

function secretKeyFor(borrowerId: string): Uint8Array {
  return new Uint8Array(createHash("sha256").update(`ghost-credit-demo:${borrowerId}`).digest());
}

function privateStateIdFor(borrowerId: string): string {
  return `ghost-credit-${borrowerId}`;
}

let providers: GhostCreditProviders;
let contractAddress: ContractAddress;

async function queryLedgerState(p: GhostCreditProviders) {
  const state = await p.publicDataProvider.queryContractState(contractAddress);
  if (!state) throw new Error("Contract state not found");
  return ledger(state.data);
}

async function requestLoan(borrowerId: string, profile: { score: number; liquidationCount: number; accountAgeMonths: number }, loanAmount: number) {
  const privateStateId = privateStateIdFor(borrowerId);
  await providers.privateStateProvider.set(privateStateId, createGhostCreditPrivateState(secretKeyFor(borrowerId), profile));

  await submitCallTx<Contract, "requestLoan">(providers, {
    compiledContract: CompiledGhostCreditContract,
    contractAddress,
    privateStateId,
    circuitId: "requestLoan",
    args: [BigInt(loanAmount), MIN_SCORE],
  });

  const state = await queryLedgerState(providers);
  return { contractAddress, totalLoansIssued: state.totalLoansIssued.toString(), loanAmount };
}

async function repayLoan(borrowerId: string) {
  const privateStateId = privateStateIdFor(borrowerId);

  await submitCallTx<Contract, "repayLoan">(providers, {
    compiledContract: CompiledGhostCreditContract,
    contractAddress,
    privateStateId,
    circuitId: "repayLoan",
  });

  const state = await queryLedgerState(providers);
  return { contractAddress, totalLoansIssued: state.totalLoansIssued.toString() };
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(body));
}

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  try {
    if (req.method === "GET" && req.url === "/api/status") {
      const state = await queryLedgerState(providers);
      sendJson(res, 200, { contractAddress, totalLoansIssued: state.totalLoansIssued.toString(), loanCount: state.loans.size().toString() });
      return;
    }

    if (req.method === "POST" && req.url === "/api/request-loan") {
      const body = (await readBody(req)) as { borrowerId: string; profile: { score: number; liquidationCount: number; accountAgeMonths: number }; loanAmount: number };
      try {
        const result = await requestLoan(body.borrowerId, body.profile, body.loanAmount);
        sendJson(res, 200, { approved: true, ...result });
      } catch (err) {
        logger.warn(`requestLoan rejected for ${body.borrowerId}: ${err instanceof Error ? err.message : String(err)}`);
        sendJson(res, 200, { approved: false, reason: err instanceof Error ? err.message : String(err) });
      }
      return;
    }

    if (req.method === "POST" && req.url === "/api/repay-loan") {
      const body = (await readBody(req)) as { borrowerId: string };
      const result = await repayLoan(body.borrowerId);
      sendJson(res, 200, { repaid: true, ...result });
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (err) {
    logger.error(err);
    sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
  }
}

async function main() {
  const config = getConfig();
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

  const wallet = await MidnightWalletProvider.build(logger, envConfig, { kind: "seed", value: ALICE_LOCAL_SEED });
  await wallet.start();
  await syncWallet(logger, wallet.wallet, 10 * 60_000);

  providers = buildProviders(wallet, zkConfigPath, config);

  logger.info("Deploying Ghost Credit contract...");
  const deployed: DeployedContract<Contract> = await deployContract<Contract>(providers, {
    compiledContract: CompiledGhostCreditContract,
    privateStateId: "ghost-credit-deployer",
    initialPrivateState: createGhostCreditPrivateState(new Uint8Array(randomBytes(32)), {
      score: 0,
      liquidationCount: 0,
      accountAgeMonths: 0,
    }),
  });
  contractAddress = deployed.deployTxData.public.contractAddress;
  logger.info(`Contract deployed at: ${contractAddress}`);

  const server = createServer((req, res) => void handleRequest(req, res));
  server.listen(PORT, () => logger.info(`Ghost Credit dev API listening on http://127.0.0.1:${PORT}`));

  const shutdown = async () => {
    logger.info("Shutting down...");
    server.close();
    await wallet.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
