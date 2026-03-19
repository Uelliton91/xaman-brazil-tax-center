import { beforeEach, describe, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { generateTaxCsv } from "@/lib/exports/csv";
import { seedDatabase } from "./seed-helper";

describe("csv export", () => {
  beforeEach(() => {
    seedDatabase();
  });

  test("generates detailed CSV rows", async () => {
    const wallet = await prisma.wallet.findFirstOrThrow({
      where: { address: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh" }
    });

    const rows = await prisma.normalizedEvent.findMany({
      where: { walletId: wallet.id },
      include: { assetSold: true, assetAcquired: true },
      orderBy: { occurredAt: "asc" }
    });

    const csv = generateTaxCsv(rows);

    expect(csv).toContain("datetime");
    expect(csv).toContain("event_type");
    expect(csv).toContain("XRPLTX0002SWAP");
  });
});

