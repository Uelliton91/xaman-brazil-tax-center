export type PriceQuote = {
  priceUsd: number;
  confidence: number;
  source: string;
};

export interface PriceProvider {
  readonly name: string;
  getUsdPrice(input: { assetKey: string; at: Date }): Promise<PriceQuote | null>;
}

