import { AccountTxPage, LedgerProvider, LedgerTransaction } from "./types";

type RpcTransactionEnvelope = {
  tx?: Record<string, unknown>;
  tx_json?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  validated?: boolean;
  close_time_iso?: string;
  ledger_index?: number;
};

type RpcResponse = {
  result?: {
    transactions?: RpcTransactionEnvelope[];
    marker?: unknown;
    error?: string;
    error_message?: string;
  };
};

export class JsonRpcLedgerProvider implements LedgerProvider {
  readonly name: string;

  constructor(private readonly endpoint: string, name: string) {
    this.name = name;
  }

  async fetchAccountTxPage(input: {
    network: "XRPL" | "XAHAU";
    account: string;
    marker?: string | null;
    limit?: number;
  }): Promise<AccountTxPage> {
    const payload = {
      method: "account_tx",
      params: [
        {
          account: input.account,
          ledger_index_min: -1,
          ledger_index_max: -1,
          forward: true,
          binary: false,
          limit: input.limit ?? 50,
          marker: input.marker ? JSON.parse(input.marker) : undefined
        }
      ]
    };

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Falha em account_tx (${this.name}): ${response.status}`);
    }

    const json = (await response.json()) as RpcResponse;
    if (json.result?.error) {
      const detail = json.result.error_message ? `: ${json.result.error_message}` : "";
      throw new Error(`${this.name} account_tx error ${json.result.error}${detail}`);
    }

    const txs = json.result?.transactions ?? [];

    const rippleEpochMs = Date.UTC(2000, 0, 1, 0, 0, 0);
    const resolveCloseTimeIso = (entry: RpcTransactionEnvelope, tx: Record<string, unknown>): string => {
      const txDateIso = tx.date_iso;
      if (typeof txDateIso === "string") {
        return txDateIso;
      }

      if (typeof entry.close_time_iso === "string") {
        return entry.close_time_iso;
      }

      const rippleSeconds = Number(tx.date);
      if (Number.isFinite(rippleSeconds) && rippleSeconds > 0) {
        return new Date(rippleEpochMs + rippleSeconds * 1000).toISOString();
      }

      return new Date().toISOString();
    };

    const mapped: LedgerTransaction[] = txs
      .map((entry) => {
        const tx = entry.tx ?? entry.tx_json;
        const meta = entry.meta;
        if (!tx || !meta) {
          return null;
        }

        const hash = String(tx.hash ?? "");
        if (!hash) {
          return null;
        }

        const ledgerIndex = Number(tx.ledger_index ?? entry.ledger_index ?? 0);
        const closeTimeIso = resolveCloseTimeIso(entry, tx);

        return {
          hash,
          ledger_index: ledgerIndex,
          close_time_iso: closeTimeIso,
          tx,
          meta
        };
      })
      .filter((value): value is LedgerTransaction => value !== null);

    return {
      transactions: mapped,
      marker: json.result?.marker ? JSON.stringify(json.result.marker) : null
    };
  }
}

