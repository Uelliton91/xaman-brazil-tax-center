import { EventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { evaluateMonthlyThresholds, resolveRulesetByDate } from "@/lib/rules/engine";

type Inventory = {
  quantity: number;
  totalCostBrl: number;
};

type MonthlyAgg = {
  month: string;
  disposalGrossBrl: number;
  realizedGainBrl: number;
  operationVolumeBrl: number;
  alerts: string[];
};

function monthKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function toNumber(value: unknown): number {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

export type TaxComputationResult = {
  monthly: MonthlyAgg[];
  balances: Array<{
    assetKey: string;
    displayName: string;
    quantity: number;
    totalCostBrl: number;
    averageCostBrl: number;
  }>;
  totals: {
    patrimonioEstimadoBrl: number;
    realizedGainBrl: number;
    reviewPendingCount: number;
  };
};

export async function computeWalletTaxes(input: { walletId: string; taxYear: number }): Promise<TaxComputationResult> {
  const events = await prisma.normalizedEvent.findMany({
    where: {
      walletId: input.walletId,
      occurredAt: {
        lte: new Date(Date.UTC(input.taxYear, 11, 31, 23, 59, 59))
      }
    },
    include: {
      assetSold: true,
      assetAcquired: true
    },
    orderBy: {
      occurredAt: "asc"
    }
  });

  const inventory = new Map<string, Inventory>();
  const monthlyMap = new Map<string, MonthlyAgg>();

  const ensureMonthly = (month: string): MonthlyAgg => {
    const existing = monthlyMap.get(month);
    if (existing) {
      return existing;
    }

    const created: MonthlyAgg = {
      month,
      disposalGrossBrl: 0,
      realizedGainBrl: 0,
      operationVolumeBrl: 0,
      alerts: []
    };

    monthlyMap.set(month, created);
    return created;
  };

  for (const event of events) {
    const eventYear = event.occurredAt.getUTCFullYear();
    const month = monthKey(event.occurredAt);
    const monthAgg = ensureMonthly(month);

    const rulesResolved = await resolveRulesetByDate({
      taxYear: eventYear,
      at: event.occurredAt
    });

    const rules = rulesResolved.config;

    const soldQty = toNumber(event.quantitySold);
    const acquiredQty = toNumber(event.quantityAcquired);
    const valuationBrl = toNumber(event.valuationBrl);
    const feeQty = toNumber(event.feeQuantity);

    const applyAcquisition = (assetKey: string, qty: number, baseCost: number) => {
      const current = inventory.get(assetKey) ?? { quantity: 0, totalCostBrl: 0 };
      current.quantity += qty;
      current.totalCostBrl += baseCost;
      inventory.set(assetKey, current);
    };

    const applyDisposal = (assetKey: string, qty: number, proceedsBrl: number) => {
      const current = inventory.get(assetKey) ?? { quantity: 0, totalCostBrl: 0 };
      const safeQty = current.quantity <= 0 ? 0 : Math.min(qty, current.quantity);
      const avgCost = current.quantity > 0 ? current.totalCostBrl / current.quantity : 0;
      const costBasis = avgCost * safeQty;
      const gain = proceedsBrl - costBasis;

      current.quantity -= safeQty;
      current.totalCostBrl -= costBasis;

      inventory.set(assetKey, current);

      monthAgg.disposalGrossBrl += proceedsBrl;
      monthAgg.realizedGainBrl += gain;
      monthAgg.operationVolumeBrl += proceedsBrl;

      return {
        costBasis,
        gain,
        proceeds: proceedsBrl
      };
    };

    let costBasisToPersist: number | null = null;
    let proceedsToPersist: number | null = null;
    let gainToPersist: number | null = null;

    switch (event.eventType) {
      case EventType.ACQUISITION:
      case EventType.TRANSFER_IN:
      case EventType.REWARD:
      case EventType.AIRDROP: {
        if (event.assetAcquired?.internalKey && acquiredQty > 0 && valuationBrl > 0) {
          const feeCost =
            rules.costBasis.includeFeesInAcquisitionCost && acquiredQty > 0
              ? (valuationBrl / acquiredQty) * feeQty
              : 0;
          applyAcquisition(event.assetAcquired.internalKey, acquiredQty, valuationBrl + feeCost);
          monthAgg.operationVolumeBrl += valuationBrl;
        }
        break;
      }
      case EventType.DISPOSAL:
      case EventType.TRANSFER_OUT: {
        if (event.assetSold?.internalKey && soldQty > 0 && valuationBrl > 0) {
          const disposal = applyDisposal(event.assetSold.internalKey, soldQty, valuationBrl);
          costBasisToPersist = disposal.costBasis;
          proceedsToPersist = disposal.proceeds;
          gainToPersist = disposal.gain;
        }
        break;
      }
      case EventType.SWAP: {
        if (event.assetSold?.internalKey && soldQty > 0 && valuationBrl > 0) {
          const disposal = applyDisposal(event.assetSold.internalKey, soldQty, valuationBrl);
          costBasisToPersist = disposal.costBasis;
          proceedsToPersist = disposal.proceeds;
          gainToPersist = disposal.gain;

          if (event.assetAcquired?.internalKey && acquiredQty > 0) {
            applyAcquisition(event.assetAcquired.internalKey, acquiredQty, valuationBrl);
          }
        }
        break;
      }
      default:
        break;
    }

    await prisma.normalizedEvent.update({
      where: {
        id: event.id
      },
      data: {
        rulesetId: rulesResolved.ruleset.id,
        costBasisBrl: costBasisToPersist,
        proceedsBrl: proceedsToPersist,
        realizedGainBrl: gainToPersist
      }
    });

    monthAgg.alerts = evaluateMonthlyThresholds({
      disposalGrossBrl: monthAgg.disposalGrossBrl,
      operationVolumeBrl: monthAgg.operationVolumeBrl,
      config: rules
    });
  }

  const balances = Array.from(inventory.entries()).map(([assetKey, value]) => {
    const averageCost = value.quantity > 0 ? value.totalCostBrl / value.quantity : 0;
    return {
      assetKey,
      displayName: assetKey,
      quantity: value.quantity,
      totalCostBrl: value.totalCostBrl,
      averageCostBrl: averageCost
    };
  });

  const reviewPendingCount = await prisma.normalizedEvent.count({
    where: {
      walletId: input.walletId,
      status: "NEEDS_REVIEW"
    }
  });

  const realizedGainBrl = Array.from(monthlyMap.values()).reduce((acc, row) => acc + row.realizedGainBrl, 0);
  const patrimonioEstimadoBrl = balances.reduce((acc, row) => acc + row.totalCostBrl, 0);

  await prisma.auditLog.create({
    data: {
      walletId: input.walletId,
      action: "TAX_COMPUTATION_COMPLETED",
      detailsJson: {
        taxYear: input.taxYear,
        monthlyRows: monthlyMap.size,
        balances: balances.length
      }
    }
  });

  return {
    monthly: Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month)),
    balances,
    totals: {
      patrimonioEstimadoBrl,
      realizedGainBrl,
      reviewPendingCount
    }
  };
}

