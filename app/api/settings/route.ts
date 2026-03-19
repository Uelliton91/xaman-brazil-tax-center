import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, withRateLimit } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const getSchema = z.object({
  sessionId: z.string().min(1)
});

const postSchema = z.object({
  sessionId: z.string().min(1),
  brazilTaxMode: z.boolean().optional(),
  annualReminderEnabled: z.boolean().optional(),
  monthlyReminderEnabled: z.boolean().optional(),
  thresholdBannerEnabled: z.boolean().optional()
});

export async function GET(request: NextRequest) {
  const limited = withRateLimit(request);
  if (limited) {
    return limited;
  }

  try {
    const url = new URL(request.url);
    const parsed = getSchema.parse({
      sessionId: url.searchParams.get("sessionId")
    });

    const [session, reminders] = await Promise.all([
      prisma.userSession.findUnique({ where: { id: parsed.sessionId } }),
      prisma.reminderSetting.findUnique({ where: { sessionId: parsed.sessionId } })
    ]);

    return NextResponse.json({ session, reminders });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Erro ao carregar configuraÃ§Ãµes", 400);
  }
}

export async function POST(request: NextRequest) {
  const limited = withRateLimit(request);
  if (limited) {
    return limited;
  }

  try {
    const body = postSchema.parse(await request.json());

    const session = await prisma.userSession.update({
      where: {
        id: body.sessionId
      },
      data: {
        ...(body.brazilTaxMode !== undefined ? { brazilTaxMode: body.brazilTaxMode } : {})
      }
    });

    const reminders = await prisma.reminderSetting.upsert({
      where: {
        sessionId: body.sessionId
      },
      create: {
        sessionId: body.sessionId,
        annualReminderEnabled: body.annualReminderEnabled ?? true,
        monthlyReminderEnabled: body.monthlyReminderEnabled ?? true,
        thresholdBannerEnabled: body.thresholdBannerEnabled ?? true
      },
      update: {
        ...(body.annualReminderEnabled !== undefined ? { annualReminderEnabled: body.annualReminderEnabled } : {}),
        ...(body.monthlyReminderEnabled !== undefined ? { monthlyReminderEnabled: body.monthlyReminderEnabled } : {}),
        ...(body.thresholdBannerEnabled !== undefined ? { thresholdBannerEnabled: body.thresholdBannerEnabled } : {})
      }
    });

    return NextResponse.json({
      session,
      reminders
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Erro ao salvar configuraÃ§Ãµes", 400);
  }
}

