// NIGHT doesn't produce DUST automatically — it has to be registered via an
// on-chain transaction. Safe to re-run; no-ops if already registered.

import { WebSocket } from "ws";
// @ts-expect-error WebSocket global assignment for apollo
globalThis.WebSocket = WebSocket;

import * as Rx from "rxjs";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { unshieldedToken } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import type { EnvironmentConfiguration } from "@midnight-ntwrk/testkit-js";
import pino from "pino";

import { getConfig } from "./config.js";
import { MidnightWalletProvider, type WalletSecret } from "./wallet.js";

// Not wallet.ts's syncWallet(): that waits on dust sync progress, which
// never completes on a fresh wallet until after registration succeeds.
function waitForBaseSync(wallet: { state: () => Rx.Observable<{ isSynced: boolean }> }) {
  return Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(2_000),
      Rx.filter((s) => s.isSynced),
    ),
  );
}

const logger = pino({ level: process.env["LOG_LEVEL"] ?? "info", transport: { target: "pino-pretty" } });

function resolveSecret(net: string): WalletSecret {
  const upper = net.toUpperCase();
  const mnemonicEnv = `MIDNIGHT_${upper}_MNEMONIC`;
  const seedEnv = `MIDNIGHT_${upper}_SEED`;
  const mnemonic = process.env[mnemonicEnv]?.trim().replace(/\s+/g, " ");
  const seedHex = process.env[seedEnv]?.trim();

  if (mnemonic) return { kind: "mnemonic", value: mnemonic };
  if (seedHex) return { kind: "seed", value: seedHex };
  throw new Error(`Either ${mnemonicEnv} or ${seedEnv} is required. Set one in .env.${net} or the shell.`);
}

function formatNight(raw: bigint): string {
  return `${(raw / 1_000_000n).toLocaleString()}.${(raw % 1_000_000n).toString().padStart(6, "0")}`;
}

function formatDust(raw: bigint): string {
  return `${(raw / 1_000_000_000_000_000n).toLocaleString()}.${(raw % 1_000_000_000_000_000n).toString().padStart(15, "0")}`;
}

async function main() {
  const network = process.env["MIDNIGHT_NETWORK"] ?? "preprod";
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

  const provider = await MidnightWalletProvider.build(logger, envConfig, resolveSecret(network));
  await provider.start();
  logger.info("Waiting for shielded+unshielded sync (ignoring dust sync progress)...");
  await waitForBaseSync(provider.wallet);

  const state = await Rx.firstValueFrom(provider.wallet.state());
  const nightBalance = state.unshielded.balances[unshieldedToken().raw] ?? 0n;
  const dustBalance = state.dust.balance(new Date());

  logger.info(`NIGHT balance: ${formatNight(nightBalance)}`);
  logger.info(`DUST balance: ${formatDust(dustBalance)}`);

  if (dustBalance > 0n) {
    logger.info("DUST already available — nothing to register.");
    return;
  }

  const unregisteredCoins = state.unshielded.availableCoins.filter(
    (coin: any) => coin.meta?.registeredForDustGeneration !== true,
  );

  if (unregisteredCoins.length === 0) {
    logger.info("All NIGHT already registered. Waiting for DUST to generate...");
  } else {
    logger.info(`Registering ${unregisteredCoins.length} NIGHT UTXO(s) for DUST generation...`);
    // No dustReceiverAddress passed — defaults to this wallet's own DUST address.
    const recipe = await provider.wallet.registerNightUtxosForDustGeneration(
      unregisteredCoins,
      provider.unshieldedKeystore.getPublicKey(),
      (payload: Uint8Array) => provider.unshieldedKeystore.signData(payload),
    );
    const finalized = await provider.wallet.finalizeRecipe(recipe);
    const txId = await provider.wallet.submitTransaction(finalized);
    logger.info(`Registration transaction submitted: ${txId}`);
  }

  logger.info("Waiting for DUST to generate (this can take a couple of minutes)...");
  await Rx.firstValueFrom(
    provider.wallet.state().pipe(
      Rx.throttleTime(5_000),
      Rx.filter((s) => s.dust.balance(new Date()) > 0n),
    ),
  );

  const finalState = await Rx.firstValueFrom(provider.wallet.state());
  logger.info(`DUST balance now: ${formatDust(finalState.dust.balance(new Date()))}`);

  await provider.stop();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
