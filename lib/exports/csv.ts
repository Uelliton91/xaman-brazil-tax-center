import Papa from "papaparse";
import { NormalizedEvent, Asset } from "@prisma/client";

export type CsvEventRow = NormalizedEvent & {
  assetSold: Asset | null;
  assetAcquired: Asset | null;
};

export function generateTaxCsv(rows: CsvEventRow[]): string {
  const data = rows.map((row) => ({
    datetime: row.occurredAt.toISOString(),
    network: row.network,
    tx_hash: row.txHash ?? "",
    event_type: row.eventType,
    asset_sold: row.assetSold?.displayName ?? "",
    asset_acquired: row.assetAcquired?.displayName ?? "",
    quantity_sold: row.quantitySold?.toString() ?? "",
    quantity_acquired: row.quantityAcquired?.toString() ?? "",
    sold_issuer: row.assetSold?.issuer ?? "",
    acquired_issuer: row.assetAcquired?.issuer ?? "",
    sold_token_id: row.assetSold?.tokenId ?? "",
    acquired_token_id: row.assetAcquired?.tokenId ?? "",
    value_source: row.valuationSource ?? "",
    valuation_brl: row.valuationBrl?.toString() ?? "",
    fx_source: row.fxSource ?? "",
    confidence: row.confidence,
    manual_override: row.manualOverrideApplied ? "true" : "false",
    notes: row.notes ?? ""
  }));

  return Papa.unparse(data, {
    delimiter: ",",
    quotes: true
  });
}

