import { AssetType, NetworkType, PrismaClient } from "@prisma/client";

export type AssetIdentityInput = {
  network: NetworkType;
  assetType: AssetType;
  currencyCode?: string | null;
  issuer?: string | null;
  tokenId?: string | null;
  symbol?: string | null;
};

export function buildAssetInternalKey(input: AssetIdentityInput): string {
  if (input.assetType === "NATIVE") {
    return `${input.network}:NATIVE:${input.currencyCode ?? "NATIVE"}`;
  }

  if (input.assetType === "ISSUED") {
    return `${input.network}:ISSUED:${input.issuer ?? "UNKNOWN"}:${input.currencyCode ?? "UNK"}`;
  }

  if (input.assetType === "NFT") {
    return `${input.network}:NFT:${input.tokenId ?? "UNKNOWN"}`;
  }

  return `${input.network}:UNKNOWN:${input.currencyCode ?? "UNK"}`;
}

export function assetDisplayName(input: AssetIdentityInput): string {
  if (input.assetType === "NATIVE") {
    return input.symbol ?? input.currencyCode ?? (input.network === "XAHAU" ? "XAH" : "XRP");
  }

  if (input.assetType === "ISSUED") {
    const sym = input.symbol ?? input.currencyCode ?? "TOKEN";
    const issuer = input.issuer ? ` (${input.issuer.slice(0, 8)}...)` : "";
    return `${sym}${issuer}`;
  }

  if (input.assetType === "NFT") {
    return input.symbol ?? `NFT ${input.tokenId?.slice(0, 8) ?? "UNK"}`;
  }

  return input.symbol ?? "Ativo desconhecido";
}

export async function getOrCreateAsset(prisma: PrismaClient, input: AssetIdentityInput) {
  const internalKey = buildAssetInternalKey(input);

  const existing = await prisma.asset.findUnique({
    where: { internalKey }
  });

  if (existing) {
    return existing;
  }

  return prisma.asset.create({
    data: {
      network: input.network,
      assetType: input.assetType,
      symbol: input.symbol ?? undefined,
      issuer: input.issuer ?? undefined,
      currencyCode: input.currencyCode ?? undefined,
      tokenId: input.tokenId ?? undefined,
      internalKey,
      displayName: assetDisplayName(input)
    }
  });
}

export function dropToXrp(valueDrops: string): number {
  return Number(valueDrops) / 1_000_000;
}

export function parseAmountToAsset(amount: unknown, network: NetworkType): {
  asset: AssetIdentityInput;
  quantity: number;
} | null {
  if (typeof amount === "string") {
    return {
      asset: {
        network,
        assetType: "NATIVE",
        currencyCode: network === "XAHAU" ? "XAH" : "XRP",
        symbol: network === "XAHAU" ? "XAH" : "XRP"
      },
      quantity: dropToXrp(amount)
    };
  }

  if (amount && typeof amount === "object") {
    const obj = amount as { currency?: unknown; issuer?: unknown; value?: unknown };
    if (typeof obj.value === "string") {
      return {
        asset: {
          network,
          assetType: "ISSUED",
          currencyCode: typeof obj.currency === "string" ? obj.currency : "UNK",
          issuer: typeof obj.issuer === "string" ? obj.issuer : undefined,
          symbol: typeof obj.currency === "string" ? obj.currency : "UNK"
        },
        quantity: Number(obj.value)
      };
    }
  }

  return null;
}

