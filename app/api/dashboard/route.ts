import { NetworkType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, withRateLimit } from "@/lib/api";
import { getDashboardData } from "@/lib/tax/dashboard";

const schema = z.object({
  walletId: z.string().min(1),
  taxYear: z.coerce.number().int().default(new Date().getUTCFullYear()),
  month: z.string().optional(),
  network: z.nativeEnum(NetworkType).optional(),
  assetKey: z.string().optional()
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
      taxYear: url.searchParams.get("taxYear") ?? undefined,
      month: url.searchParams.get("month") ?? undefined,
      network: url.searchParams.get("network") ?? undefined,
      assetKey: url.searchParams.get("assetKey") ?? undefined
    });

    const data = await getDashboardData(parsed);
    return NextResponse.json(data);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Falha ao carregar dashboard", 400);
  }
}

