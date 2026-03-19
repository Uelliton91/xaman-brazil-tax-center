import { beforeEach, describe, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { computeWalletTaxes } from "@/lib/tax/cost-basis";
import { seedDatabase } from "./seed-helper";

describe("weighted average cost basis", () => {
  beforeEach(() => {
    seedDatabase();
  });

  test("computes balances and realized gains", async () => {
    const wallet = await prisma.wallet.findFirstOrThrow({
      where: {
        address: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh"
      }
    });

    const result = await computeWalletTaxes({
      walletId: wallet.id,
      taxYear: 2025
    });

    const xrpBalance = result.balances.find((item) => item.assetKey === "XRPL:NATIVE:XRP");

    expect(xrpBalance).toBeDefined();
    expect(Number(xrpBalance.quantity.toFixed(6))).toBe(500);
    expect(Number(result.totals.realizedGainBrl.toFixed(2))).toBe(1550);
  });
});

