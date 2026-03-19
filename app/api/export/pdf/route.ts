import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, withRateLimit } from "@/lib/api";
import { generateTaxPdf } from "@/lib/exports/pdf";
import { prisma } from "@/lib/prisma";
import { computeWalletTaxes } from "@/lib/tax/cost-basis";

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

    const result = await computeWalletTaxes({
      walletId: parsed.walletId,
      taxYear: parsed.taxYear
    });

    const pdfBytes = await generateTaxPdf({
      walletAddress: wallet.address,
      network: wallet.network,
      periodStart: `${parsed.taxYear}-01-01`,
      periodEnd: `${parsed.taxYear}-12-31`,
      balances: result.balances,
      monthly: result.monthly,
      patrimonioEstimadoBrl: result.totals.patrimonioEstimadoBrl,
      ganhosRealizadosBrl: result.totals.realizedGainBrl,
      pendingReviewCount: result.totals.reviewPendingCount,
      methodologyNotes:
        "CÃ¡lculo baseado em custo mÃ©dio ponderado por ativo, valuation por valor executado quando disponÃ­vel e fallback para preÃ§o histÃ³rico + FX."
    });

    const fileName = `xaman-brazil-tax-${wallet.network.toLowerCase()}-${parsed.taxYear}.pdf`;

    await prisma.report.create({
      data: {
        walletId: wallet.id,
        taxYear: parsed.taxYear,
        periodStart: new Date(Date.UTC(parsed.taxYear, 0, 1, 0, 0, 0)),
        periodEnd: new Date(Date.UTC(parsed.taxYear, 11, 31, 23, 59, 59)),
        format: "PDF",
        fileName,
        summaryJson: {
          monthlyRows: result.monthly.length,
          balances: result.balances.length
        }
      }
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${fileName}"`
      }
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Erro ao gerar PDF", 400);
  }
}

