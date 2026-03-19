import { env } from "@/lib/env";
import { MockPriceProvider } from "./mock-price-provider";
import { PriceProvider } from "./types";

class EmptyPriceProvider implements PriceProvider {
  readonly name = "EMPTY_PRICE";

  async getUsdPrice() {
    return null;
  }
}

const mockProvider = new MockPriceProvider();
const emptyProvider = new EmptyPriceProvider();

export function getPriceProvider(forceMock = false): PriceProvider {
  if (forceMock || env.USE_MOCK_PRICE) {
    return mockProvider;
  }

  return emptyProvider;
}

