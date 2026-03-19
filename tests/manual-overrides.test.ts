import { beforeEach, describe, expect, test } from "vitest";
import { EventStatus, EventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { applyManualOverride } from "@/lib/tax/manual-review";
import { computeWalletTaxes } from "@/lib/tax/cost-basis";
import { seedDatabase } from "./seed-helper";

describe("manual overrides", () => {
  beforeEach(() => {
    seedDatabase();
  });

  test("manual override updates classification and valuation", async () => {
    const event = await prisma.normalizedEvent.findFirstOrThrow({
      where: {
        txHash: "XRPLTX0006AMB"
      }
    });

    const updated = await applyManualOverride(event.id, {
      eventType: EventType.TRANSFER_OUT,
      valuationBrl: 600,
      notes: "Transferência comprovada via carteira própria"
    });

    expect(updated.status).toBe(EventStatus.REVIEWED);
    expect(updated.manualOverrideApplied).toBe(true);
    expect(Number(updated.valuationBrl ?? 0)).toBe(600);

    await computeWalletTaxes({
      walletId: updated.walletId,
      taxYear: 2025
    });

    const override = await prisma.manualOverride.findFirst({
      where: {
        normalizedEventId: updated.id
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    expect(override).not.toBeNull();
  });
});

