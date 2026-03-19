import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, withRateLimit } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  taxYear: z.coerce.number().int().optional()
});

export async function GET(request: NextRequest) {
  const limited = withRateLimit(request);
  if (limited) {
    return limited;
  }

  try {
    const url = new URL(request.url);
    const parsed = schema.parse({
      taxYear: url.searchParams.get("taxYear") ?? undefined
    });

    const rulesets = await prisma.ruleset.findMany({
      where: {
        jurisdiction: "BR",
        ...(parsed.taxYear ? { taxYear: parsed.taxYear } : {})
      },
      orderBy: [
        {
          taxYear: "asc"
        },
        {
          effectiveFrom: "asc"
        }
      ]
    });

    return NextResponse.json({ rulesets });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Erro ao listar rulesets", 400);
  }
}

