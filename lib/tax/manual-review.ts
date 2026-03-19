import { EventStatus, EventType, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const overrideSchema = z.object({
  eventType: z.nativeEnum(EventType).optional(),
  valuationBrl: z.number().nonnegative().optional(),
  notes: z.string().max(2000).optional(),
  markSelfTransfer: z.boolean().optional(),
  sessionId: z.string().optional()
});

export type OverrideInput = z.infer<typeof overrideSchema>;

export async function applyManualOverride(eventId: string, input: OverrideInput) {
  const parsed = overrideSchema.parse(input);

  const event = await prisma.normalizedEvent.findUnique({
    where: {
      id: eventId
    }
  });

  if (!event) {
    throw new Error("Evento nÃ£o encontrado");
  }

  const previous = {
    eventType: event.eventType,
    valuationBrl: event.valuationBrl,
    notes: event.notes,
    status: event.status
  };

  const updates: Prisma.NormalizedEventUpdateInput = {
    status: EventStatus.REVIEWED,
    manualOverrideApplied: true
  };

  let overrideType: "CLASSIFICATION" | "VALUATION" | "SELF_TRANSFER" | "NOTES" = "NOTES";

  if (parsed.markSelfTransfer) {
    updates.eventType = EventType.TRANSFER_OUT;
    updates.classificationReason = "Marcado como auto-transferÃªncia pelo usuÃ¡rio.";
    overrideType = "SELF_TRANSFER";
  }

  if (parsed.eventType) {
    updates.eventType = parsed.eventType;
    overrideType = "CLASSIFICATION";
  }

  if (parsed.valuationBrl !== undefined) {
    updates.valuationBrl = parsed.valuationBrl;
    updates.valuationSource = "MANUAL_OVERRIDE";
    overrideType = "VALUATION";
  }

  if (parsed.notes) {
    updates.notes = parsed.notes;
    if (overrideType === "NOTES") {
      overrideType = "NOTES";
    }
  }

  const updated = await prisma.normalizedEvent.update({
    where: {
      id: eventId
    },
    data: updates
  });

  await prisma.manualOverride.create({
    data: {
      normalizedEventId: eventId,
      createdBySessionId: parsed.sessionId,
      overrideType,
      previousValue: previous,
      newValue: {
        eventType: updated.eventType,
        valuationBrl: updated.valuationBrl,
        notes: updated.notes,
        status: updated.status,
        markSelfTransfer: parsed.markSelfTransfer ?? false
      },
      reason: parsed.notes
    }
  });

  await prisma.auditLog.create({
    data: {
      walletId: updated.walletId,
      normalizedEventId: eventId,
      action: "MANUAL_OVERRIDE_APPLIED",
      detailsJson: {
        overrideType,
        sessionId: parsed.sessionId ?? null
      }
    }
  });

  return updated;
}

