import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, withRateLimit } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { generateTaxCsv } from "@/lib/exports/csv";

const schema = z.object({
  walletId: z.string().min(1),
  taxYear: z.coerce.number().int()
});

export async function GET(request: NextRequest) {
  const limited = withRateLimit(request);
  if (limited) {
    return limited;
  }

  try {
    const url = new URL(request.url);
    const parsed = schema.parse({
      walletId: url.searchParams.get("walletId"),
      taxYear: url.searchParams.get("taxYear")
    });

    const wallet = await prisma.wallet.findUnique({ where: { id: parsed.walletId } });
    if (!wallet) {
      return jsonError("Carteira nÃ£o encontrada", 404);
    }

    const events = await prisma.normalizedEvent.findMany({
      where: {
        walletId: parsed.walletId,
        occurredAt: {
          gte: new Date(Date.UTC(parsed.taxYear, 0, 1, 0, 0, 0)),
          lte: new Date(Date.UTC(parsed.taxYear, 11, 31, 23, 59, 59))
        }
      },
      include: {
        assetSold: true,
        assetAcquired: true
      },
      orderBy: {
        occurredAt: "asc"
      }
    });

    const csv = generateTaxCsv(events);
    const fileName = `xaman-brazil-tax-${wallet.network.toLowerCase()}-${parsed.taxYear}.csv`;

    await prisma.report.create({
      data: {
        walletId: wallet.id,
        taxYear: parsed.taxYear,
        periodStart: new Date(Date.UTC(parsed.taxYear, 0, 1, 0, 0, 0)),
        periodEnd: new Date(Date.UTC(parsed.taxYear, 11, 31, 23, 59, 59)),
        format: "CSV",
        fileName,
        summaryJson: {
          rows: events.length
        }
      }
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${fileName}"`
      }
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Erro ao gerar CSV", 400);
  }
}

