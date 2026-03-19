import { demoPricePoints } from "@/lib/demo/market-data";
import { PriceProvider, PriceQuote } from "./types";

export class MockPriceProvider implements PriceProvider {
  readonly name = "MOCK_PRICE";

  async getUsdPrice(input: { assetKey: string; at: Date }): Promise<PriceQuote | null> {
    const target = input.at.getTime();
    const points = demoPricePoints
      .filter((point) => point.assetKey === input.assetKey)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    if (points.length === 0) {
      return null;
    }

    const chosen =
      points.find((point) => new Date(point.at).getTime() <= target) ?? points[points.length - 1];

    return {
      priceUsd: chosen.priceUsd,
      confidence: chosen.confidence,
      source: chosen.provider
    };
  }
}

