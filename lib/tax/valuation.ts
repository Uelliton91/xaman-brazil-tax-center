import { EventStatus, EventType, ValuationSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getFxProvider } from "@/lib/providers/fx";
import { getPriceProvider } from "@/lib/providers/price";

type EventWithAsset = Awaited<ReturnType<typeof loadEvents>>[number];

function numeric(input: unknown): number | null {
  if (input === null || input === undefined) {
    return null;
  }

  const value = Number(input);
  return Number.isFinite(value) ? value : null;
}

async function loadEvents(walletId: string) {
  return prisma.normalizedEvent.findMany({
    where: { walletId },
    include: {
      assetSold: true,
      assetAcquired: true
    },
    orderBy: {
      occurredAt: "asc"
    }
  });
}

function resolveValuationTarget(event: EventWithAsset): { assetKey: string; quantity: number } | null {
  if (event.eventType === EventType.SWAP || event.eventType === EventType.DISPOSAL || event.eventType === EventType.TRANSFER_OUT) {
    const quantity = numeric(event.quantitySold);
    if (!event.assetSold?.internalKey || !quantity || quantity <= 0) {
      return null;
    }

    return {
      assetKey: event.assetSold.internalKey,
      quantity
    };
  }

  const quantity = numeric(event.quantityAcquired);
  if (!event.assetAcquired?.internalKey || !quantity || quantity <= 0) {
    return null;
  }

  return {
    assetKey: event.assetAcquired.internalKey,
    quantity
  };
}

export async function enrichValuations(input: { walletId: string; forceMock?: boolean }) {
  const events = await loadEvents(input.walletId);
  const priceProvider = getPriceProvider(Boolean(input.forceMock));
  const fxProvider = getFxProvider(Boolean(input.forceMock));

  let updated = 0;

  for (const event of events) {
    if (event.valuationBrl && event.valuationSource && event.valuationSource !== ValuationSource.UNAVAILABLE) {
      continue;
    }

    const target = resolveValuationTarget(event);
    if (!target) {
      await prisma.normalizedEvent.update({
        where: { id: event.id },
        data: {
          valuationSource: ValuationSource.UNAVAILABLE,
          status: EventStatus.NEEDS_REVIEW,
          classificationReason: `${event.classificationReason} | Sem ativo/quantidade para valuation.`
        }
      });
      updated += 1;
      continue;
    }

    const quote = await priceProvider.getUsdPrice({
      assetKey: target.assetKey,
      at: event.occurredAt
    });

    const fx = await fxProvider.getUsdToBrl(event.occurredAt);

    if (!quote || !fx) {
      await prisma.normalizedEvent.update({
        where: { id: event.id },
        data: {
          valuationSource: ValuationSource.UNAVAILABLE,
          status: EventStatus.NEEDS_REVIEW,
          priceSource: quote?.source,
          fxSource: fx?.source
        }
      });
      updated += 1;
      continue;
    }

    const valuationBrl = target.quantity * quote.priceUsd * fx.usdToBrl;
    const valuationSource =
      event.eventType === EventType.SWAP ? ValuationSource.DERIVED_PAIR : ValuationSource.MARKET_PRICE;

    const baseStatus = event.status;
    const confidence = Math.min(event.confidence, quote.confidence);
    const status = confidence < 0.8 ? EventStatus.NEEDS_REVIEW : baseStatus;

    if (event.assetSoldId) {
      await prisma.pricePoint.upsert({
        where: {
          assetId_provider_quotedAt: {
            assetId: event.assetSoldId,
            provider: quote.source,
            quotedAt: new Date(event.occurredAt.toISOString().slice(0, 10) + "T00:00:00.000Z")
          }
        },
        create: {
          assetId: event.assetSoldId,
          provider: quote.source,
          quotedAt: new Date(event.occurredAt.toISOString().slice(0, 10) + "T00:00:00.000Z"),
          priceUsd: quote.priceUsd,
          confidence: quote.confidence
        },
        update: {
          priceUsd: quote.priceUsd,
          confidence: quote.confidence
        }
      });
    }

    await prisma.fxRate.upsert({
      where: {
        base_quote_provider_quotedAt: {
          base: "USD",
          quote: "BRL",
          provider: fx.source,
          quotedAt: new Date(event.occurredAt.toISOString().slice(0, 10) + "T00:00:00.000Z")
        }
      },
      create: {
        base: "USD",
        quote: "BRL",
        provider: fx.source,
        quotedAt: new Date(event.occurredAt.toISOString().slice(0, 10) + "T00:00:00.000Z"),
        rate: fx.usdToBrl
      },
      update: {
        rate: fx.usdToBrl
      }
    });

    await prisma.normalizedEvent.update({
      where: {
        id: event.id
      },
      data: {
        valuationBrl,
        valuationSource,
        priceSource: quote.source,
        fxSource: fx.source,
        confidence,
        status
      }
    });

    updated += 1;
  }

  await prisma.auditLog.create({
    data: {
      walletId: input.walletId,
      action: "VALUATION_COMPLETED",
      detailsJson: {
        updated,
        priceProvider: priceProvider.name,
        fxProvider: fxProvider.name
      }
    }
  });

  return {
    updated,
    priceProvider: priceProvider.name,
    fxProvider: fxProvider.name
  };
}

