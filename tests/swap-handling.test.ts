import { beforeEach, describe, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { computeWalletTaxes } from "@/lib/tax/cost-basis";
import { seedDatabase } from "./seed-helper";

describe("swap handling", () => {
  beforeEach(() => {
    seedDatabase();
  });

  test("swap produces disposal gain and acquisition inventory", async () => {
    const wallet = await prisma.wallet.findFirstOrThrow({
      where: {
        address: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh"
      }
    });

    const swapEvent = await prisma.normalizedEvent.findFirstOrThrow({
      where: {
        walletId: wallet.id,
        txHash: "XRPLTX0002SWAP"
      }
    });

    expect(Number(swapEvent.proceedsBrl ?? 0)).toBe(1300);
    expect(Number(swapEvent.realizedGainBrl ?? 0)).toBe(260);

    const result = await computeWalletTaxes({
      walletId: wallet.id,
      taxYear: 2025
    });

    const brz = result.balances.find((item) => item.assetKey.includes(":BRZ"));
    expect(brz).toBeDefined();
    expect(Number(brz.quantity.toFixed(4))).toBe(400);
    expect(Number(brz.totalCostBrl.toFixed(2))).toBe(1300);
  });
});

