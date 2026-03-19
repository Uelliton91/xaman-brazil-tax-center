import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, withRateLimit } from "@/lib/api";
import { applyManualOverride } from "@/lib/tax/manual-review";
import { computeWalletTaxes } from "@/lib/tax/cost-basis";

const schema = z.object({
  eventType: z.string().optional(),
  valuationBrl: z.number().optional(),
  notes: z.string().optional(),
  markSelfTransfer: z.boolean().optional(),
  sessionId: z.string().optional(),
  taxYear: z.number().int().optional()
});

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  const limited = withRateLimit(request);
  if (limited) {
    return limited;
  }

  try {
    const { id } = await context.params;
    const body = schema.parse(await request.json());

    const eventType = body.eventType
      ? (body.eventType as
          | "ACQUISITION"
          | "DISPOSAL"
          | "SWAP"
          | "TRANSFER_IN"
          | "TRANSFER_OUT"
          | "AIRDROP"
          | "REWARD"
          | "FEE"
          | "UNKNOWN_MANUAL_REVIEW"
          | "INFO_IGNORED")
      : undefined;

    const updated = await applyManualOverride(id, {
      eventType,
      valuationBrl: body.valuationBrl,
      notes: body.notes,
      markSelfTransfer: body.markSelfTransfer,
      sessionId: body.sessionId
    });

    const taxYear = body.taxYear ?? updated.occurredAt.getUTCFullYear();
    const recalculated = await computeWalletTaxes({
      walletId: updated.walletId,
      taxYear
    });

    return NextResponse.json({
      event: updated,
      recalculated
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Erro ao aplicar revisão", 400);
  }
}
