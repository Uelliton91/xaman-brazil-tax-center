-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mode" TEXT NOT NULL,
    "xamanUserToken" TEXT,
    "xamanAccount" TEXT,
    "consentAccepted" BOOLEAN NOT NULL DEFAULT false,
    "brazilTaxMode" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Wallet_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "UserSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RawTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletId" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "ledgerIndex" INTEGER,
    "txType" TEXT NOT NULL,
    "executedAt" DATETIME NOT NULL,
    "rawJson" JSONB NOT NULL,
    "sourceProvider" TEXT NOT NULL,
    "ingestionMarker" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RawTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "network" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "symbol" TEXT,
    "issuer" TEXT,
    "currencyCode" TEXT,
    "tokenId" TEXT,
    "internalKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "NormalizedEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletId" TEXT NOT NULL,
    "rawTransactionId" TEXT,
    "rulesetId" TEXT,
    "occurredAt" DATETIME NOT NULL,
    "network" TEXT NOT NULL,
    "txHash" TEXT,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AUTO',
    "confidence" REAL NOT NULL,
    "classificationReason" TEXT NOT NULL,
    "assetSoldId" TEXT,
    "assetAcquiredId" TEXT,
    "feeAssetId" TEXT,
    "quantitySold" DECIMAL,
    "quantityAcquired" DECIMAL,
    "feeQuantity" DECIMAL,
    "valuationBrl" DECIMAL,
    "proceedsBrl" DECIMAL,
    "costBasisBrl" DECIMAL,
    "realizedGainBrl" DECIMAL,
    "valuationSource" TEXT,
    "fxSource" TEXT,
    "priceSource" TEXT,
    "notes" TEXT,
    "manualOverrideApplied" BOOLEAN NOT NULL DEFAULT false,
    "metadataJson" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NormalizedEvent_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NormalizedEvent_rawTransactionId_fkey" FOREIGN KEY ("rawTransactionId") REFERENCES "RawTransaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "NormalizedEvent_rulesetId_fkey" FOREIGN KEY ("rulesetId") REFERENCES "Ruleset" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "NormalizedEvent_assetSoldId_fkey" FOREIGN KEY ("assetSoldId") REFERENCES "Asset" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "NormalizedEvent_assetAcquiredId_fkey" FOREIGN KEY ("assetAcquiredId") REFERENCES "Asset" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "NormalizedEvent_feeAssetId_fkey" FOREIGN KEY ("feeAssetId") REFERENCES "Asset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ManualOverride" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "normalizedEventId" TEXT NOT NULL,
    "createdBySessionId" TEXT,
    "overrideType" TEXT NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ManualOverride_normalizedEventId_fkey" FOREIGN KEY ("normalizedEventId") REFERENCES "NormalizedEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ManualOverride_createdBySessionId_fkey" FOREIGN KEY ("createdBySessionId") REFERENCES "UserSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletId" TEXT,
    "normalizedEventId" TEXT,
    "action" TEXT NOT NULL,
    "detailsJson" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_normalizedEventId_fkey" FOREIGN KEY ("normalizedEventId") REFERENCES "NormalizedEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PricePoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "quotedAt" DATETIME NOT NULL,
    "priceUsd" DECIMAL NOT NULL,
    "confidence" REAL NOT NULL,
    "metadataJson" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PricePoint_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FxRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "base" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "quotedAt" DATETIME NOT NULL,
    "rate" DECIMAL NOT NULL,
    "metadataJson" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Ruleset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jurisdiction" TEXT NOT NULL,
    "taxYear" INTEGER NOT NULL,
    "effectiveFrom" DATETIME NOT NULL,
    "effectiveTo" DATETIME,
    "version" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "configJson" JSONB NOT NULL,
    "sourceNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletId" TEXT NOT NULL,
    "rulesetId" TEXT,
    "taxYear" INTEGER NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "format" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "summaryJson" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Report_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Report_rulesetId_fkey" FOREIGN KEY ("rulesetId") REFERENCES "Ruleset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SyncCheckpoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletId" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "marker" TEXT,
    "lastLedgerIndex" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'IDLE',
    "provider" TEXT NOT NULL,
    "lastSyncedAt" DATETIME,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SyncCheckpoint_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReminderSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "annualReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "monthlyReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "thresholdBannerEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReminderSetting_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "UserSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Wallet_address_network_idx" ON "Wallet"("address", "network");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_sessionId_address_network_key" ON "Wallet"("sessionId", "address", "network");

-- CreateIndex
CREATE INDEX "RawTransaction_walletId_executedAt_idx" ON "RawTransaction"("walletId", "executedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RawTransaction_walletId_network_txHash_key" ON "RawTransaction"("walletId", "network", "txHash");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_internalKey_key" ON "Asset"("internalKey");

-- CreateIndex
CREATE UNIQUE INDEX "NormalizedEvent_rawTransactionId_key" ON "NormalizedEvent"("rawTransactionId");

-- CreateIndex
CREATE INDEX "NormalizedEvent_walletId_occurredAt_idx" ON "NormalizedEvent"("walletId", "occurredAt");

-- CreateIndex
CREATE INDEX "NormalizedEvent_status_idx" ON "NormalizedEvent"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PricePoint_assetId_provider_quotedAt_key" ON "PricePoint"("assetId", "provider", "quotedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FxRate_base_quote_provider_quotedAt_key" ON "FxRate"("base", "quote", "provider", "quotedAt");

-- CreateIndex
CREATE INDEX "Ruleset_jurisdiction_taxYear_effectiveFrom_effectiveTo_idx" ON "Ruleset"("jurisdiction", "taxYear", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "Ruleset_jurisdiction_taxYear_version_key" ON "Ruleset"("jurisdiction", "taxYear", "version");

-- CreateIndex
CREATE UNIQUE INDEX "SyncCheckpoint_walletId_key" ON "SyncCheckpoint"("walletId");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderSetting_sessionId_key" ON "ReminderSetting"("sessionId");


