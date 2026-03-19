import { beforeEach, describe, expect, test } from "vitest";
import { EventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { enrichValuations } from "@/lib/tax/valuation";
import { seedDatabase } from "./seed-helper";

describe("valuation fallback", () => {
  beforeEach(() => {
    seedDatabase();
  });

  test("falls back to market price + FX when executed value is absent", async () => {
    const wallet = await prisma.wallet.findFirstOrThrow({
      where: { address: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh" }
    });

    const xrp = await prisma.asset.findUniqueOrThrow({
      where: {
        internalKey: "XRPL:NATIVE:XRP"
      }
    });

    const raw = await prisma.rawTransaction.create({
      data: {
        walletId: wallet.id,
        network: wallet.network,
        txHash: "XRPLTXVALFALLBACK1",
        ledgerIndex: 999111,
        txType: "Payment",
        executedAt: new Date("2025-11-22T00:00:00.000Z"),
        rawJson: {
          tx: {
            TransactionType: "Payment"
          },
          meta: {
            TransactionResult: "tesSUCCESS"
          }
        },
        sourceProvider: "TEST"
      }
    });

    await prisma.normalizedEvent.create({
      data: {
        walletId: wallet.id,
        rawTransactionId: raw.id,
        occurredAt: new Date("2025-11-22T00:00:00.000Z"),
        network: wallet.network,
        txHash: "XRPLTXVALFALLBACK1",
        eventType: EventType.DISPOSAL,
        status: "NEEDS_REVIEW",
        confidence: 0.7,
        classificationReason: "Teste fallback valuation",
        assetSoldId: xrp.id,
        quantitySold: 10
      }
    });

    await enrichValuations({
      walletId: wallet.id,
      forceMock: true
    });

    const valued = await prisma.normalizedEvent.findFirstOrThrow({
      where: {
        txHash: "XRPLTXVALFALLBACK1"
      }
    });

    expect(Number(valued.valuationBrl ?? 0)).toBeGreaterThan(0);
    expect(valued.valuationSource).toBe("MARKET_PRICE");
  });
});

