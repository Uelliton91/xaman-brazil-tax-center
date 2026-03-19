export type FxQuote = {
  usdToBrl: number;
  source: string;
};

export interface FxProvider {
  readonly name: string;
  getUsdToBrl(at: Date): Promise<FxQuote | null>;
}

