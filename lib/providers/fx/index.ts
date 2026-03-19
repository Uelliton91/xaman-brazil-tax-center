import { env } from "@/lib/env";
import { BcbPtaxFxProvider } from "./bcb-ptax-provider";
import { MockFxProvider } from "./mock-fx-provider";
import { FxProvider } from "./types";

const mockProvider = new MockFxProvider();
const bcbProvider = new BcbPtaxFxProvider();

export function getFxProvider(forceMock = false): FxProvider {
  if (forceMock || env.USE_MOCK_FX) {
    return mockProvider;
  }

  return bcbProvider;
}

