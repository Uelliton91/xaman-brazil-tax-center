import { getDemoHistory } from "@/lib/demo/ledger-data";
import { AccountTxPage, LedgerProvider } from "./types";

const PAGE_SIZE = 3;

export class MockLedgerProvider implements LedgerProvider {
  readonly name = "MOCK_LEDGER";

  async fetchAccountTxPage(input: {
    network: "XRPL" | "XAHAU";
    account: string;
    marker?: string | null;
    limit?: number;
  }): Promise<AccountTxPage> {
    const full = getDemoHistory(input.network, input.account);
    const size = input.limit ?? PAGE_SIZE;
    const start = input.marker ? Number(input.marker) : 0;
    const safeStart = Number.isNaN(start) ? 0 : start;
    const end = safeStart + size;

    return {
      transactions: full.slice(safeStart, end),
      marker: end < full.length ? String(end) : null
    };
  }
}

