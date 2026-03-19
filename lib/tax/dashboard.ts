import { EventStatus, EventType, NetworkType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeWalletTaxes } from "./cost-basis";

export async function getDashboardData(input: {
  walletId: string;
  taxYear: number;
  month?: string;
  network?: NetworkType;
  assetKey?: string;
}) {
  const [wallet, checkpoint, taxResult] = await Promise.all([
    prisma.wallet.findUnique({
      where: {
        id: input.walletId
      }
    }),
    prisma.syncCheckpoint.findUnique({
      where: {
        walletId: input.walletId
      }
    }),
    computeWalletTaxes({
      walletId: input.walletId,
      taxYear: input.taxYear
    })
  ]);

  if (!wallet) {
    throw new Error("Carteira nÃ£o encontrada");
  }

  const where: Record<string, unknown> = {
    walletId: input.walletId,
    occurredAt: {
      gte: new Date(Date.UTC(input.taxYear, 0, 1, 0, 0, 0)),
      lte: new Date(Date.UTC(input.taxYear, 11, 31, 23, 59, 59))
    }
  };

  if (input.network) {
    where.network = input.network;
  }

  if (input.month) {
    const [year, month] = input.month.split("-").map(Number);
    if (year && month) {
      where.occurredAt = {
        gte: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)),
        lte: new Date(Date.UTC(year, month, 0, 23, 59, 59))
      };
    }
  }

  if (input.assetKey) {
    where.OR = [
      {
        assetSold: {
          internalKey: input.assetKey
        }
      },
      {
        assetAcquired: {
          internalKey: input.assetKey
        }
      }
    ];
  }

  const events = await prisma.normalizedEvent.findMany({
    where,
    include: {
      assetSold: true,
      assetAcquired: true,
      feeAsset: true,
      overrides: {
        orderBy: {
          createdAt: "desc"
        },
        take: 1
      }
    },
    orderBy: {
      occurredAt: "asc"
    }
  });

  const pendingManualEvents = events.filter(
    (event) => event.status === EventStatus.NEEDS_REVIEW || event.eventType === EventType.UNKNOWN_MANUAL_REVIEW
  );

  const totalDisposals = events
    .filter((event) => event.eventType === EventType.DISPOSAL || event.eventType === EventType.SWAP)
    .reduce((acc, event) => acc + Number(event.proceedsBrl ?? 0), 0);

  return {
    wallet,
    syncStatus: checkpoint,
    taxResult,
    events,
    pendingManualEvents,
    summary: {
      patrimonioEstimadoBrl: taxResult.totals.patrimonioEstimadoBrl,
      ganhosRealizadosBrl: taxResult.totals.realizedGainBrl,
      totalAlienacoesBrl: totalDisposals,
      saldoFinalPorAtivo: taxResult.balances,
      alertasMensais: taxResult.monthly.filter((month) => month.alerts.length > 0)
    }
  };
}

