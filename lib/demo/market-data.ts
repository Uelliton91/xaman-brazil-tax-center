export type DemoPricePoint = {
  assetKey: string;
  at: string;
  priceUsd: number;
  confidence: number;
  provider: "MOCK_PRICE";
};

export const demoPricePoints: DemoPricePoint[] = [
  { assetKey: "XRPL:NATIVE:XRP", at: "2025-01-10T00:00:00.000Z", priceUsd: 0.95, confidence: 0.95, provider: "MOCK_PRICE" },
  { assetKey: "XRPL:NATIVE:XRP", at: "2025-03-15T00:00:00.000Z", priceUsd: 1.05, confidence: 0.95, provider: "MOCK_PRICE" },
  { assetKey: "XRPL:NATIVE:XRP", at: "2025-07-05T00:00:00.000Z", priceUsd: 1.12, confidence: 0.95, provider: "MOCK_PRICE" },
  { assetKey: "XRPL:NATIVE:XRP", at: "2025-11-20T00:00:00.000Z", priceUsd: 1.20, confidence: 0.94, provider: "MOCK_PRICE" },
  { assetKey: "XRPL:ISSUED:rIssuerBRZ111111111111111111111:BRZ", at: "2025-03-15T00:00:00.000Z", priceUsd: 0.6, confidence: 0.72, provider: "MOCK_PRICE" },
  { assetKey: "XAHAU:NATIVE:XAH", at: "2025-10-11T00:00:00.000Z", priceUsd: 0.31, confidence: 0.7, provider: "MOCK_PRICE" }
];

export type DemoFxPoint = {
  at: string;
  usdToBrl: number;
  provider: "MOCK_FX";
};

export const demoFxRates: DemoFxPoint[] = [
  { at: "2025-01-10T00:00:00.000Z", usdToBrl: 5.35, provider: "MOCK_FX" },
  { at: "2025-03-15T00:00:00.000Z", usdToBrl: 5.24, provider: "MOCK_FX" },
  { at: "2025-05-20T00:00:00.000Z", usdToBrl: 5.11, provider: "MOCK_FX" },
  { at: "2025-07-05T00:00:00.000Z", usdToBrl: 5.01, provider: "MOCK_FX" },
  { at: "2025-08-10T00:00:00.000Z", usdToBrl: 5.00, provider: "MOCK_FX" },
  { at: "2025-10-11T00:00:00.000Z", usdToBrl: 5.17, provider: "MOCK_FX" },
  { at: "2025-11-20T00:00:00.000Z", usdToBrl: 5.22, provider: "MOCK_FX" },
  { at: "2025-12-15T00:00:00.000Z", usdToBrl: 5.3, provider: "MOCK_FX" }
];

