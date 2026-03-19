import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, withRateLimit } from "@/lib/api";
import { runWalletPipeline } from "@/lib/tax/pipeline";

const schema = z.object({
  walletId: z.string().min(1),
  forceMock: z.boolean().default(true),
  taxYear: z.number().int().default(new Date().getUTCFullYear())
});

export async function POST(request: NextRequest) {
  const limited = withRateLimit(request);
  if (limited) {
    return limited;
  }

  try {
    const body = schema.parse(await request.json());
    const result = await runWalletPipeline(body);

    return NextResponse.json({
      ok: true,
      ...result
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Falha na sincronizaÃ§Ã£o", 500);
  }
}

