import { beforeEach, describe, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { generateTaxPdf } from "@/lib/exports/pdf";
import { computeWalletTaxes } from "@/lib/tax/cost-basis";
import { seedDatabase } from "./seed-helper";

describe("pdf export", () => {
  beforeEach(() => {
    seedDatabase();
  });

  test("generates PDF bytes", async () => {
    const wallet = await prisma.wallet.findFirstOrThrow({
      where: { address: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh" }
    });

    const result = await computeWalletTaxes({
      walletId: wallet.id,
      taxYear: 2025
    });

    const bytes = await generateTaxPdf({
      walletAddress: wallet.address,
      network: wallet.network,
      periodStart: "2025-01-01",
      periodEnd: "2025-12-31",
      balances: result.balances,
      monthly: result.monthly,
      patrimonioEstimadoBrl: result.totals.patrimonioEstimadoBrl,
      ganhosRealizadosBrl: result.totals.realizedGainBrl,
      pendingReviewCount: result.totals.reviewPendingCount,
      methodologyNotes: "Teste smoke"
    });

    const header = Buffer.from(bytes).subarray(0, 4).toString("utf8");
    expect(header).toBe("%PDF");
    expect(bytes.length).toBeGreaterThan(1000);
  });
});

