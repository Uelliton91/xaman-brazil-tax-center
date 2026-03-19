import { EventStatus, EventType, NetworkType, ValuationSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrCreateAsset, parseAmountToAsset, AssetIdentityInput } from "./assets";

type Candidate = {
  eventType: EventType;
  confidence: number;
  reason: string;
  status: EventStatus;
  assetSold?: AssetIdentityInput;
  assetAcquired?: AssetIdentityInput;
  feeAsset?: AssetIdentityInput;
  quantitySold?: number;
  quantityAcquired?: number;
  feeQuantity?: number;
  valuationBrl?: number;
  valuationSource?: ValuationSource;
};

function parseHint(network: NetworkType, rawMeta: Record<string, unknown>): Candidate | null {
  const hint = rawMeta.taxHint;
  if (!hint || typeof hint !== "object") {
    return null;
  }

  const value = hint as Record<string, unknown>;
  const eventType = value.eventType;
  if (typeof eventType !== "string") {
    return null;
  }

  const build = (asset: unknown): AssetIdentityInput | undefined => {
    if (!asset || typeof asset !== "object") {
      return undefined;
    }

    const obj = asset as Record<string, unknown>;
    const rawType = String(obj.assetType ?? "UNKNOWN");
    const assetType = rawType === "NATIVE" || rawType === "ISSUED" || rawType === "NFT" ? rawType : "UNKNOWN";

    return {
      network,
      assetType,
      currencyCode: typeof obj.currencyCode === "string" ? obj.currencyCode : undefined,
      issuer: typeof obj.issuer === "string" ? obj.issuer : undefined,
      tokenId: typeof obj.tokenId === "string" ? obj.tokenId : undefined,
      symbol: typeof obj.symbol === "string" ? obj.symbol : undefined
    };
  };

  const confidence = Number(value.confidence ?? 0.5);
  const needsReview = confidence < 0.8 || eventType === "AIRDROP" || eventType === "REWARD" || eventType === "UNKNOWN_MANUAL_REVIEW";

  return {
    eventType: (eventType in EventType ? eventType : "UNKNOWN_MANUAL_REVIEW") as EventType,
    confidence,
    reason: typeof value.classificationReason === "string" ? value.classificationReason : "ClassificaÃ§Ã£o via taxHint",
    status: needsReview ? EventStatus.NEEDS_REVIEW : EventStatus.AUTO,
    assetSold: build(value.assetSold),
    assetAcquired: build(value.assetAcquired),
    feeAsset: build(value.feeAsset),
    quantitySold: value.quantitySold ? Number(value.quantitySold) : undefined,
    quantityAcquired: value.quantityAcquired ? Number(value.quantityAcquired) : undefined,
    feeQuantity: value.feeQuantity ? Number(value.feeQuantity) : undefined,
    valuationBrl: value.valuationBrl ? Number(value.valuationBrl) : undefined,
    valuationSource:
      typeof value.valuationSource === "string" && value.valuationSource in ValuationSource
        ? (value.valuationSource as ValuationSource)
        : undefined
  };
}

function inferCandidate(params: {
  network: NetworkType;
  walletAddress: string;
  tx: Record<string, unknown>;
  meta: Record<string, unknown>;
}): Candidate {
  const fromHint = parseHint(params.network, params.meta);
  if (fromHint) {
    return fromHint;
  }

  const txType = String(params.tx.TransactionType ?? "Unknown");
  const account = String(params.tx.Account ?? "");
  const destination = String(params.tx.Destination ?? "");
  const amount = params.tx.Amount ?? params.meta.delivered_amount;
  const parsedAmount = parseAmountToAsset(amount, params.network);

  if (txType === "Payment" && parsedAmount) {
    if (destination === params.walletAddress) {
      return {
        eventType: EventType.TRANSFER_IN,
        confidence: 0.7,
        reason: "Pagamento recebido sem contraparte comercial explÃ­cita.",
        status: EventStatus.NEEDS_REVIEW,
        assetAcquired: parsedAmount.asset,
        quantityAcquired: parsedAmount.quantity
      };
    }

    if (account === params.walletAddress) {
      return {
        eventType: EventType.TRANSFER_OUT,
        confidence: 0.68,
        reason: "Pagamento enviado sem confirmaÃ§Ã£o de alienaÃ§Ã£o econÃ´mica.",
        status: EventStatus.NEEDS_REVIEW,
        assetSold: parsedAmount.asset,
        quantitySold: parsedAmount.quantity
      };
    }
  }

  if (txType === "OfferCreate") {
    const gets = parseAmountToAsset(params.tx.TakerGets, params.network);
    const pays = parseAmountToAsset(params.tx.TakerPays, params.network);

    if (gets && pays) {
      return {
        eventType: EventType.SWAP,
        confidence: 0.62,
        reason: "Oferta detectada com duas pernas de ativo.",
        status: EventStatus.NEEDS_REVIEW,
        assetSold: gets.asset,
        quantitySold: gets.quantity,
        assetAcquired: pays.asset,
        quantityAcquired: pays.quantity
      };
    }
  }

  if (txType.startsWith("AMM")) {
    return {
      eventType: EventType.INFO_IGNORED,
      confidence: 0.5,
      reason: "Evento AMM tratado como informacional no MVP.",
      status: EventStatus.NEEDS_REVIEW
    };
  }

  return {
    eventType: EventType.UNKNOWN_MANUAL_REVIEW,
    confidence: 0.3,
    reason: `Tipo de transaÃ§Ã£o sem regra especÃ­fica: ${txType}`,
    status: EventStatus.NEEDS_REVIEW
  };
}

export async function normalizeWalletTransactions(input: { walletId: string }) {
  const wallet = await prisma.wallet.findUnique({
    where: { id: input.walletId }
  });

  if (!wallet) {
    throw new Error("Carteira nÃ£o encontrada");
  }

  const rawItems = await prisma.rawTransaction.findMany({
    where: {
      walletId: input.walletId
    },
    orderBy: {
      executedAt: "asc"
    }
  });

  let normalizedCount = 0;

  for (const raw of rawItems) {
    const container = raw.rawJson as unknown as {
      tx?: Record<string, unknown>;
      meta?: Record<string, unknown>;
    };

    const tx = container.tx ?? {};
    const meta = container.meta ?? {};

    const candidate = inferCandidate({
      network: wallet.network,
      walletAddress: wallet.address,
      tx,
      meta
    });

    const soldAsset = candidate.assetSold ? await getOrCreateAsset(prisma, candidate.assetSold) : null;
    const acquiredAsset = candidate.assetAcquired ? await getOrCreateAsset(prisma, candidate.assetAcquired) : null;
    const feeAsset = candidate.feeAsset ? await getOrCreateAsset(prisma, candidate.feeAsset) : null;

    await prisma.normalizedEvent.upsert({
      where: {
        rawTransactionId: raw.id
      },
      create: {
        walletId: raw.walletId,
        rawTransactionId: raw.id,
        occurredAt: raw.executedAt,
        network: raw.network,
        txHash: raw.txHash,
        eventType: candidate.eventType,
        status: candidate.status,
        confidence: candidate.confidence,
        classificationReason: candidate.reason,
        assetSoldId: soldAsset?.id,
        assetAcquiredId: acquiredAsset?.id,
        feeAssetId: feeAsset?.id,
        quantitySold: candidate.quantitySold,
        quantityAcquired: candidate.quantityAcquired,
        feeQuantity: candidate.feeQuantity,
        valuationBrl: candidate.valuationBrl,
        valuationSource: candidate.valuationSource,
        metadataJson: {
          normalizedAt: new Date().toISOString(),
          txType: raw.txType
        }
      },
      update: {
        occurredAt: raw.executedAt,
        network: raw.network,
        txHash: raw.txHash,
        eventType: candidate.eventType,
        status: candidate.status,
        confidence: candidate.confidence,
        classificationReason: candidate.reason,
        assetSoldId: soldAsset?.id,
        assetAcquiredId: acquiredAsset?.id,
        feeAssetId: feeAsset?.id,
        quantitySold: candidate.quantitySold,
        quantityAcquired: candidate.quantityAcquired,
        feeQuantity: candidate.feeQuantity,
        valuationBrl: candidate.valuationBrl,
        valuationSource: candidate.valuationSource
      }
    });

    normalizedCount += 1;
  }

  await prisma.auditLog.create({
    data: {
      walletId: input.walletId,
      action: "NORMALIZATION_COMPLETED",
      detailsJson: { normalizedCount }
    }
  });

  return {
    normalizedCount
  };
}

