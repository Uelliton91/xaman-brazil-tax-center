import { SyncStatus } from "@prisma/client";
import { isLikelyClassicAddress } from "@/lib/address";
import { prisma } from "@/lib/prisma";
import { getLedgerProvider } from "@/lib/providers/ledger";

async function fetchWithRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 200));
      }
    }
  }

  throw lastError;
}

export async function syncWalletTransactions(input: {
  walletId: string;
  forceMock?: boolean;
  limitPerPage?: number;
}) {
  const wallet = await prisma.wallet.findUnique({
    where: {
      id: input.walletId
    }
  });

  if (!wallet) {
    throw new Error("Carteira nÃ£o encontrada");
  }

  if (!isLikelyClassicAddress(wallet.address)) {
    throw new Error("EndereÃ§o da carteira invÃ¡lido para sincronizaÃ§Ã£o.");
  }

  const provider = getLedgerProvider(wallet.network, Boolean(input.forceMock));
  const checkpoint = await prisma.syncCheckpoint.findUnique({
    where: {
      walletId: wallet.id
    }
  });

  await prisma.syncCheckpoint.upsert({
    where: {
      walletId: wallet.id
    },
    create: {
      walletId: wallet.id,
      network: wallet.network,
      provider: provider.name,
      status: SyncStatus.RUNNING,
      marker: checkpoint?.marker
    },
    update: {
      status: SyncStatus.RUNNING,
      provider: provider.name,
      error: null
    }
  });

  let marker: string | null | undefined = checkpoint?.marker ?? null;
  let fetched = 0;
  let inserted = 0;
  let pageCount = 0;

  try {
    while (true) {
      const page = await fetchWithRetry(() =>
        provider.fetchAccountTxPage({
          network: wallet.network,
          account: wallet.address,
          marker,
          limit: input.limitPerPage ?? 50
        })
      );

      pageCount += 1;
      if (!page.transactions.length) {
        marker = page.marker;
        break;
      }

      for (const transaction of page.transactions) {
        fetched += 1;
        await prisma.rawTransaction.upsert({
          where: {
            walletId_network_txHash: {
              walletId: wallet.id,
              network: wallet.network,
              txHash: transaction.hash
            }
          },
          create: {
            walletId: wallet.id,
            network: wallet.network,
            txHash: transaction.hash,
            ledgerIndex: transaction.ledger_index,
            txType: String(transaction.tx.TransactionType ?? "Unknown"),
            executedAt: new Date(transaction.close_time_iso),
            rawJson: transaction as unknown as object,
            sourceProvider: provider.name,
            ingestionMarker: marker ?? null
          },
          update: {
            ledgerIndex: transaction.ledger_index,
            txType: String(transaction.tx.TransactionType ?? "Unknown"),
            executedAt: new Date(transaction.close_time_iso),
            rawJson: transaction as unknown as object,
            sourceProvider: provider.name,
            ingestionMarker: marker ?? null
          }
        });
        inserted += 1;
      }

      marker = page.marker;
      if (!marker) {
        break;
      }

      if (pageCount > 3000) {
        throw new Error("ProteÃ§Ã£o de paginaÃ§Ã£o acionada");
      }
    }

    await prisma.syncCheckpoint.upsert({
      where: { walletId: wallet.id },
      create: {
        walletId: wallet.id,
        network: wallet.network,
        provider: provider.name,
        marker,
        status: SyncStatus.SUCCESS,
        lastSyncedAt: new Date()
      },
      update: {
        marker,
        status: SyncStatus.SUCCESS,
        lastSyncedAt: new Date(),
        error: null,
        provider: provider.name
      }
    });

    await prisma.auditLog.create({
      data: {
        walletId: wallet.id,
        action: "SYNC_COMPLETED",
        detailsJson: {
          fetched,
          inserted,
          pageCount,
          provider: provider.name
        }
      }
    });

    return {
      fetched,
      inserted,
      pageCount,
      provider: provider.name
    };
  } catch (error) {
    await prisma.syncCheckpoint.upsert({
      where: { walletId: wallet.id },
      create: {
        walletId: wallet.id,
        network: wallet.network,
        provider: provider.name,
        marker,
        status: SyncStatus.FAILED,
        error: error instanceof Error ? error.message : "Erro desconhecido"
      },
      update: {
        status: SyncStatus.FAILED,
        error: error instanceof Error ? error.message : "Erro desconhecido"
      }
    });

    throw error;
  }
}

