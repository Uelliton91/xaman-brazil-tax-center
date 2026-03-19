import { demoFxRates } from "@/lib/demo/market-data";
import { FxProvider, FxQuote } from "./types";

export class MockFxProvider implements FxProvider {
  readonly name = "MOCK_FX";

  async getUsdToBrl(at: Date): Promise<FxQuote | null> {
    const target = at.getTime();
    const ordered = demoFxRates.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    const chosen = ordered.find((item) => new Date(item.at).getTime() <= target) ?? ordered.at(-1);

    if (!chosen) {
      return null;
    }

    return {
      usdToBrl: chosen.usdToBrl,
      source: chosen.provider
    };
  }
}

