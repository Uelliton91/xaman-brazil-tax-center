import { EventStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, withRateLimit } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  walletId: z.string().min(1),
  status: z.nativeEnum(EventStatus).optional(),
  includeRaw: z.coerce.boolean().default(false)
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
      status: url.searchParams.get("status") ?? undefined,
      includeRaw: url.searchParams.get("includeRaw") ?? "false"
    });

    const events = await prisma.normalizedEvent.findMany({
      where: {
        walletId: parsed.walletId,
        ...(parsed.status ? { status: parsed.status } : {})
      },
      include: {
        assetSold: true,
        assetAcquired: true,
        feeAsset: true,
        rawTransaction: parsed.includeRaw,
        overrides: {
          orderBy: {
            createdAt: "desc"
          }
        }
      },
      orderBy: {
        occurredAt: "desc"
      }
    });

    return NextResponse.json({
      events
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Erro ao listar eventos", 400);
  }
}

