import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, withRateLimit } from "@/lib/api";
import { computeWalletTaxes } from "@/lib/tax/cost-basis";

const schema = z.object({
  walletId: z.string().min(1),
  taxYear: z.number().int()
});

export async function POST(request: NextRequest) {
  const limited = withRateLimit(request);
  if (limited) {
    return limited;
  }

  try {
    const body = schema.parse(await request.json());
    const result = await computeWalletTaxes(body);

    return NextResponse.json({
      ok: true,
      result
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Erro no recÃ¡lculo", 400);
  }
}

