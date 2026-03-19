import { env } from "@/lib/env";
import { JsonRpcLedgerProvider } from "./json-rpc-ledger-provider";
import { MockLedgerProvider } from "./mock-ledger-provider";
import { LedgerNetwork, LedgerProvider } from "./types";

const xrplProvider = new JsonRpcLedgerProvider(env.XRPL_RPC_URL, "XRPL_RPC");
const xahauProvider = new JsonRpcLedgerProvider(env.XAHAU_RPC_URL, "XAHAU_RPC");
const mockProvider = new MockLedgerProvider();

export function getLedgerProvider(network: LedgerNetwork, forceMock = false): LedgerProvider {
  if (forceMock || env.USE_MOCK_LEDGER) {
    return mockProvider;
  }

  return network === "XRPL" ? xrplProvider : xahauProvider;
}

