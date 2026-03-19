export type LedgerNetwork = "XRPL" | "XAHAU";

export type LedgerTransaction = {
  hash: string;
  ledger_index: number;
  close_time_iso: string;
  tx: Record<string, unknown>;
  meta: Record<string, unknown>;
};

export type AccountTxPage = {
  transactions: LedgerTransaction[];
  marker?: string | null;
};

export interface LedgerProvider {
  readonly name: string;
  fetchAccountTxPage(input: {
    network: LedgerNetwork;
    account: string;
    marker?: string | null;
    limit?: number;
  }): Promise<AccountTxPage>;
}

