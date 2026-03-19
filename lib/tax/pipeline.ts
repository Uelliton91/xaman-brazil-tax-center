import { syncWalletTransactions } from "./ingestion";
import { normalizeWalletTransactions } from "./normalization";
import { enrichValuations } from "./valuation";
import { computeWalletTaxes } from "./cost-basis";

export async function runWalletPipeline(input: {
  walletId: string;
  forceMock?: boolean;
  taxYear: number;
}) {
  const sync = await syncWalletTransactions({
    walletId: input.walletId,
    forceMock: input.forceMock
  });

  const normalization = await normalizeWalletTransactions({
    walletId: input.walletId
  });

  const valuation = await enrichValuations({
    walletId: input.walletId,
    forceMock: input.forceMock
  });

  const tax = await computeWalletTaxes({
    walletId: input.walletId,
    taxYear: input.taxYear
  });

  return {
    sync,
    normalization,
    valuation,
    tax
  };
}

