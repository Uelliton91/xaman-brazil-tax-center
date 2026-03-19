const { PrismaClient, NetworkType, SessionMode, RulesetStatus, EventType, EventStatus, ValuationSource, SyncStatus } = require("@prisma/client");

const prisma = new PrismaClient();

const baseRulesConfig = {
  costBasis: {
    method: "weighted_average",
    includeFeesInAcquisitionCost: true,
    disposeFeeTreatment: "expense"
  },
  monthly: {
    reportingThresholdBRL: 30000,
    gainsExemptionDisposalThresholdBRL: 35000,
    darfDueDayRule: "last_business_day_next_month",
    reportingDueDayRule: "last_business_day_next_month"
  },
  annual: {
    snapshotDate: "12-31",
    exchangeAnnualStatementDueRule: "last_business_day_january_next_year",
    assetBalanceDisplayMode: "acquisition_cost_brl"
  },
  classification: {
    eventCategoryMap: {
      acquisition: "income_or_purchase",
      disposal: "capital_event",
      swap: "dual_leg",
      airdrop: "manual_review_default",
      reward: "manual_review_default",
      transfer_in: "non_tax_default",
      transfer_out: "non_tax_default",
      fee: "deductible_configurable",
      unknown_manual_review: "manual_review"
    },
    selfTransferHeuristicsEnabled: true
  },
  valuation: {
    preferredFxSource: "bcb_ptax",
    fallbackFxSource: "mock",
    priceProviderOrder: ["executed_pair", "market_primary", "market_secondary", "manual_override"],
    minConfidenceAutoAccept: 0.8
  },
  manualReview: {
    requiredForLowConfidence: true,
    requiredForAmbiguousInflow: true,
    allowValuationOverride: true,
    allowClassificationOverride: true
  }
};

const demoAddress = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
const demoAddressXahau = "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY";

async function main() {
  await prisma.manualOverride.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.report.deleteMany();
  await prisma.normalizedEvent.deleteMany();
  await prisma.rawTransaction.deleteMany();
  await prisma.pricePoint.deleteMany();
  await prisma.fxRate.deleteMany();
  await prisma.syncCheckpoint.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.reminderSetting.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.ruleset.deleteMany();

  const rulesLegacy = await prisma.ruleset.create({
    data: {
      jurisdiction: "BR",
      taxYear: 2019,
      effectiveFrom: new Date("2019-08-01T00:00:00.000Z"),
      effectiveTo: new Date("2022-12-31T23:59:59.000Z"),
      version: "BR-2019.1",
      status: RulesetStatus.ACTIVE,
      configJson: baseRulesConfig,
      sourceNotes: "IN RFB 1.888/2019 baseline"
    }
  });

  const rulesCurrent = await prisma.ruleset.create({
    data: {
      jurisdiction: "BR",
      taxYear: 2023,
      effectiveFrom: new Date("2023-01-01T00:00:00.000Z"),
      effectiveTo: new Date("2026-06-30T23:59:59.000Z"),
      version: "BR-2023.1",
      status: RulesetStatus.ACTIVE,
      configJson: baseRulesConfig,
      sourceNotes: "Receita guidance and PTAX references"
    }
  });

  await prisma.ruleset.create({
    data: {
      jurisdiction: "BR",
      taxYear: 2026,
      effectiveFrom: new Date("2026-07-01T00:00:00.000Z"),
      version: "BR-2026.1",
      status: RulesetStatus.ACTIVE,
      configJson: {
        ...baseRulesConfig,
        monthly: {
          ...baseRulesConfig.monthly,
          reportingThresholdBRL: 35000
        }
      },
      sourceNotes: "DeCripto transition placeholder"
    }
  });

  const session = await prisma.userSession.create({
    data: {
      mode: SessionMode.DEMO,
      consentAccepted: true,
      brazilTaxMode: true
    }
  });

  const [walletXrpl, walletXahau] = await Promise.all([
    prisma.wallet.create({
      data: {
        sessionId: session.id,
        address: demoAddress,
        network: NetworkType.XRPL,
        label: "Demo XRPL"
      }
    }),
    prisma.wallet.create({
      data: {
        sessionId: session.id,
        address: demoAddressXahau,
        network: NetworkType.XAHAU,
        label: "Demo Xahau"
      }
    })
  ]);

  await prisma.reminderSetting.create({
    data: {
      sessionId: session.id,
      annualReminderEnabled: true,
      monthlyReminderEnabled: true,
      thresholdBannerEnabled: true
    }
  });

  const assets = await Promise.all([
    prisma.asset.create({
      data: {
        network: NetworkType.XRPL,
        assetType: "NATIVE",
        symbol: "XRP",
        currencyCode: "XRP",
        internalKey: "XRPL:NATIVE:XRP",
        displayName: "XRP"
      }
    }),
    prisma.asset.create({
      data: {
        network: NetworkType.XRPL,
        assetType: "ISSUED",
        symbol: "BRZ",
        currencyCode: "BRZ",
        issuer: "rIssuerBRZ111111111111111111111",
        internalKey: "XRPL:ISSUED:rIssuerBRZ111111111111111111111:BRZ",
        displayName: "BRZ (rIssuerB...)"
      }
    }),
    prisma.asset.create({
      data: {
        network: NetworkType.XRPL,
        assetType: "ISSUED",
        symbol: "ABC",
        currencyCode: "ABC",
        issuer: "rIssuerABC111111111111111111111",
        internalKey: "XRPL:ISSUED:rIssuerABC111111111111111111111:ABC",
        displayName: "ABC (rIssuerA...)"
      }
    }),
    prisma.asset.create({
      data: {
        network: NetworkType.XRPL,
        assetType: "NFT",
        symbol: "NFT-XRPL",
        tokenId: "00080000AABBCCDDEEFF0011223344556677889900AA",
        internalKey: "XRPL:NFT:00080000AABBCCDDEEFF0011223344556677889900AA",
        displayName: "NFT XRPL Demo"
      }
    }),
    prisma.asset.create({
      data: {
        network: NetworkType.XAHAU,
        assetType: "NATIVE",
        symbol: "XAH",
        currencyCode: "XAH",
        internalKey: "XAHAU:NATIVE:XAH",
        displayName: "XAH"
      }
    })
  ]);

  const xrp = assets[0];
  const brz = assets[1];
  const abc = assets[2];
  const nft = assets[3];
  const xah = assets[4];

  const rawTxData = [
    { hash: "XRPLTX0001BUY", date: "2025-01-10T12:10:00.000Z", type: "Payment" },
    { hash: "XRPLTX0002SWAP", date: "2025-03-15T15:45:00.000Z", type: "OfferCreate" },
    { hash: "XRPLTX0003AIRDROP", date: "2025-05-20T09:00:00.000Z", type: "Payment" },
    { hash: "XRPLTX0004SELL", date: "2025-07-05T18:30:00.000Z", type: "Payment" },
    { hash: "XRPLTX0005NFT", date: "2025-08-10T10:15:00.000Z", type: "NFTokenAcceptOffer" },
    { hash: "XRPLTX0006AMB", date: "2025-11-20T20:05:00.000Z", type: "Payment" },
    { hash: "XRPLTX0007AMM", date: "2025-12-15T14:45:00.000Z", type: "AMMDeposit" }
  ];

  const rawMap = {};
  for (const tx of rawTxData) {
    const raw = await prisma.rawTransaction.create({
      data: {
        walletId: walletXrpl.id,
        network: NetworkType.XRPL,
        txHash: tx.hash,
        ledgerIndex: 90000000 + Math.floor(Math.random() * 90000),
        txType: tx.type,
        executedAt: new Date(tx.date),
        rawJson: {
          tx: { hash: tx.hash, TransactionType: tx.type },
          meta: { TransactionResult: "tesSUCCESS" }
        },
        sourceProvider: "MOCK_LEDGER"
      }
    });
    rawMap[tx.hash] = raw;
  }

  const rawXah = await prisma.rawTransaction.create({
    data: {
      walletId: walletXahau.id,
      network: NetworkType.XAHAU,
      txHash: "XAHAUTX0001PAY",
      ledgerIndex: 30222411,
      txType: "Payment",
      executedAt: new Date("2025-10-11T11:00:00.000Z"),
      rawJson: { tx: { hash: "XAHAUTX0001PAY", TransactionType: "Payment" }, meta: { TransactionResult: "tesSUCCESS" } },
      sourceProvider: "MOCK_LEDGER"
    }
  });

  await prisma.normalizedEvent.createMany({
    data: [
      {
        walletId: walletXrpl.id,
        rawTransactionId: rawMap.XRPLTX0001BUY.id,
        rulesetId: rulesCurrent.id,
        occurredAt: new Date("2025-01-10T12:10:00.000Z"),
        network: NetworkType.XRPL,
        txHash: "XRPLTX0001BUY",
        eventType: EventType.ACQUISITION,
        status: EventStatus.AUTO,
        confidence: 0.97,
        classificationReason: "Compra identificada no dataset demo",
        assetAcquiredId: xrp.id,
        feeAssetId: xrp.id,
        quantityAcquired: 1000,
        feeQuantity: 0.000012,
        valuationBrl: 5200,
        valuationSource: ValuationSource.EXECUTED_PAIR,
        fxSource: "MOCK_FX",
        priceSource: "MOCK_PRICE"
      },
      {
        walletId: walletXrpl.id,
        rawTransactionId: rawMap.XRPLTX0002SWAP.id,
        rulesetId: rulesCurrent.id,
        occurredAt: new Date("2025-03-15T15:45:00.000Z"),
        network: NetworkType.XRPL,
        txHash: "XRPLTX0002SWAP",
        eventType: EventType.SWAP,
        status: EventStatus.AUTO,
        confidence: 0.91,
        classificationReason: "Swap com duas pernas",
        assetSoldId: xrp.id,
        assetAcquiredId: brz.id,
        feeAssetId: xrp.id,
        quantitySold: 200,
        quantityAcquired: 400,
        feeQuantity: 0.000015,
        valuationBrl: 1300,
        proceedsBrl: 1300,
        costBasisBrl: 1040,
        realizedGainBrl: 260,
        valuationSource: ValuationSource.DERIVED_PAIR,
        fxSource: "MOCK_FX",
        priceSource: "MOCK_PRICE"
      },
      {
        walletId: walletXrpl.id,
        rawTransactionId: rawMap.XRPLTX0003AIRDROP.id,
        rulesetId: rulesCurrent.id,
        occurredAt: new Date("2025-05-20T09:00:00.000Z"),
        network: NetworkType.XRPL,
        txHash: "XRPLTX0003AIRDROP",
        eventType: EventType.AIRDROP,
        status: EventStatus.NEEDS_REVIEW,
        confidence: 0.45,
        classificationReason: "Airdrop ambíguo",
        assetAcquiredId: abc.id,
        quantityAcquired: 50,
        valuationSource: ValuationSource.UNAVAILABLE
      },
      {
        walletId: walletXrpl.id,
        rawTransactionId: rawMap.XRPLTX0004SELL.id,
        rulesetId: rulesCurrent.id,
        occurredAt: new Date("2025-07-05T18:30:00.000Z"),
        network: NetworkType.XRPL,
        txHash: "XRPLTX0004SELL",
        eventType: EventType.DISPOSAL,
        status: EventStatus.AUTO,
        confidence: 0.92,
        classificationReason: "Venda parcial",
        assetSoldId: xrp.id,
        quantitySold: 300,
        valuationBrl: 2400,
        proceedsBrl: 2400,
        costBasisBrl: 1560,
        realizedGainBrl: 840,
        valuationSource: ValuationSource.EXECUTED_PAIR,
        fxSource: "MOCK_FX",
        priceSource: "MOCK_PRICE"
      },
      {
        walletId: walletXrpl.id,
        rawTransactionId: rawMap.XRPLTX0005NFT.id,
        rulesetId: rulesCurrent.id,
        occurredAt: new Date("2025-08-10T10:15:00.000Z"),
        network: NetworkType.XRPL,
        txHash: "XRPLTX0005NFT",
        eventType: EventType.DISPOSAL,
        status: EventStatus.NEEDS_REVIEW,
        confidence: 0.88,
        classificationReason: "Venda de NFT sem custo de aquisição cadastrado",
        assetSoldId: nft.id,
        quantitySold: 1,
        valuationBrl: 450,
        proceedsBrl: 450,
        costBasisBrl: 0,
        realizedGainBrl: 450,
        valuationSource: ValuationSource.EXECUTED_PAIR
      },
      {
        walletId: walletXrpl.id,
        rawTransactionId: rawMap.XRPLTX0006AMB.id,
        rulesetId: rulesCurrent.id,
        occurredAt: new Date("2025-11-20T20:05:00.000Z"),
        network: NetworkType.XRPL,
        txHash: "XRPLTX0006AMB",
        eventType: EventType.UNKNOWN_MANUAL_REVIEW,
        status: EventStatus.NEEDS_REVIEW,
        confidence: 0.35,
        classificationReason: "Possível auto-transferência",
        assetSoldId: xrp.id,
        quantitySold: 100,
        valuationSource: ValuationSource.UNAVAILABLE
      },
      {
        walletId: walletXrpl.id,
        rawTransactionId: rawMap.XRPLTX0007AMM.id,
        rulesetId: rulesCurrent.id,
        occurredAt: new Date("2025-12-15T14:45:00.000Z"),
        network: NetworkType.XRPL,
        txHash: "XRPLTX0007AMM",
        eventType: EventType.INFO_IGNORED,
        status: EventStatus.NEEDS_REVIEW,
        confidence: 0.5,
        classificationReason: "AMM informacional no MVP",
        valuationSource: ValuationSource.UNAVAILABLE
      },
      {
        walletId: walletXahau.id,
        rawTransactionId: rawXah.id,
        rulesetId: rulesLegacy.id,
        occurredAt: new Date("2025-10-11T11:00:00.000Z"),
        network: NetworkType.XAHAU,
        txHash: "XAHAUTX0001PAY",
        eventType: EventType.TRANSFER_IN,
        status: EventStatus.NEEDS_REVIEW,
        confidence: 0.76,
        classificationReason: "Entrada em Xahau sem natureza tributária concluída",
        assetAcquiredId: xah.id,
        quantityAcquired: 50,
        valuationBrl: 80,
        valuationSource: ValuationSource.MARKET_PRICE,
        fxSource: "MOCK_FX",
        priceSource: "MOCK_PRICE"
      }
    ]
  });

  await prisma.syncCheckpoint.createMany({
    data: [
      {
        walletId: walletXrpl.id,
        network: NetworkType.XRPL,
        provider: "MOCK_LEDGER",
        status: SyncStatus.SUCCESS,
        lastSyncedAt: new Date()
      },
      {
        walletId: walletXahau.id,
        network: NetworkType.XAHAU,
        provider: "MOCK_LEDGER",
        status: SyncStatus.SUCCESS,
        lastSyncedAt: new Date()
      }
    ]
  });

  await prisma.auditLog.create({
    data: {
      walletId: walletXrpl.id,
      action: "SEED_COMPLETED",
      detailsJson: {
        note: "Demo dataset created"
      }
    }
  });

  console.log("Seed finalizado");
  console.log({ sessionId: session.id, walletXrpl: walletXrpl.id, walletXahau: walletXahau.id });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

