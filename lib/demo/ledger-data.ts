export type DemoAssetRef = {
  assetType: "NATIVE" | "ISSUED" | "NFT";
  currencyCode?: string;
  issuer?: string;
  tokenId?: string;
  symbol?: string;
};

export type DemoTaxHint = {
  eventType:
    | "ACQUISITION"
    | "DISPOSAL"
    | "SWAP"
    | "TRANSFER_IN"
    | "TRANSFER_OUT"
    | "AIRDROP"
    | "REWARD"
    | "FEE"
    | "UNKNOWN_MANUAL_REVIEW"
    | "INFO_IGNORED";
  assetSold?: DemoAssetRef;
  assetAcquired?: DemoAssetRef;
  feeAsset?: DemoAssetRef;
  quantitySold?: string;
  quantityAcquired?: string;
  feeQuantity?: string;
  valuationBrl?: string;
  valuationSource?: "EXECUTED_PAIR" | "DERIVED_PAIR" | "MARKET_PRICE" | "MANUAL_OVERRIDE" | "UNAVAILABLE";
  confidence: number;
  classificationReason: string;
};

export type DemoLedgerTransaction = {
  hash: string;
  ledger_index: number;
  close_time_iso: string;
  tx: Record<string, unknown>;
  meta: Record<string, unknown> & { taxHint?: DemoTaxHint };
};

export const DEMO_WALLET_XRPL = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
export const DEMO_WALLET_XAHAU = "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY";

const xrplHistory: DemoLedgerTransaction[] = [
  {
    hash: "XRPLTX0001BUY",
    ledger_index: 91234001,
    close_time_iso: "2025-01-10T12:10:00.000Z",
    tx: {
      TransactionType: "Payment",
      Account: "rExchangeDesk111111111111111111111",
      Destination: DEMO_WALLET_XRPL,
      Amount: "1000000000",
      Fee: "12"
    },
    meta: {
      TransactionResult: "tesSUCCESS",
      delivered_amount: "1000000000",
      taxHint: {
        eventType: "ACQUISITION",
        assetAcquired: { assetType: "NATIVE", currencyCode: "XRP", symbol: "XRP" },
        feeAsset: { assetType: "NATIVE", currencyCode: "XRP", symbol: "XRP" },
        quantityAcquired: "1000",
        feeQuantity: "0.000012",
        valuationBrl: "5200",
        valuationSource: "EXECUTED_PAIR",
        confidence: 0.97,
        classificationReason: "Compra inferida por pagamento recebido de contraparte de exchange no dataset demo."
      }
    }
  },
  {
    hash: "XRPLTX0002SWAP",
    ledger_index: 91678012,
    close_time_iso: "2025-03-15T15:45:00.000Z",
    tx: {
      TransactionType: "OfferCreate",
      Account: DEMO_WALLET_XRPL,
      TakerGets: "200000000",
      TakerPays: { currency: "BRZ", issuer: "rIssuerBRZ111111111111111111111", value: "400" },
      Fee: "15"
    },
    meta: {
      TransactionResult: "tesSUCCESS",
      taxHint: {
        eventType: "SWAP",
        assetSold: { assetType: "NATIVE", currencyCode: "XRP", symbol: "XRP" },
        assetAcquired: {
          assetType: "ISSUED",
          currencyCode: "BRZ",
          issuer: "rIssuerBRZ111111111111111111111",
          symbol: "BRZ"
        },
        feeAsset: { assetType: "NATIVE", currencyCode: "XRP", symbol: "XRP" },
        quantitySold: "200",
        quantityAcquired: "400",
        feeQuantity: "0.000015",
        valuationBrl: "1300",
        valuationSource: "DERIVED_PAIR",
        confidence: 0.91,
        classificationReason: "Oferta executada com duas pernas econÃ´micas (alienaÃ§Ã£o e aquisiÃ§Ã£o)."
      }
    }
  },
  {
    hash: "XRPLTX0003AIRDROP",
    ledger_index: 92000155,
    close_time_iso: "2025-05-20T09:00:00.000Z",
    tx: {
      TransactionType: "Payment",
      Account: "rPromoCampaign11111111111111111111",
      Destination: DEMO_WALLET_XRPL,
      Amount: { currency: "ABC", issuer: "rIssuerABC111111111111111111111", value: "50" },
      Fee: "12"
    },
    meta: {
      TransactionResult: "tesSUCCESS",
      taxHint: {
        eventType: "AIRDROP",
        assetAcquired: {
          assetType: "ISSUED",
          currencyCode: "ABC",
          issuer: "rIssuerABC111111111111111111111",
          symbol: "ABC"
        },
        feeAsset: { assetType: "NATIVE", currencyCode: "XRP", symbol: "XRP" },
        quantityAcquired: "50",
        feeQuantity: "0.000012",
        valuationSource: "UNAVAILABLE",
        confidence: 0.45,
        classificationReason: "Entrada sem contraparte econÃ´mica verificÃ¡vel; requer revisÃ£o manual."
      }
    }
  },
  {
    hash: "XRPLTX0004SELL",
    ledger_index: 92455111,
    close_time_iso: "2025-07-05T18:30:00.000Z",
    tx: {
      TransactionType: "Payment",
      Account: DEMO_WALLET_XRPL,
      Destination: "rExchangeDesk111111111111111111111",
      Amount: "300000000",
      Fee: "13"
    },
    meta: {
      TransactionResult: "tesSUCCESS",
      delivered_amount: "300000000",
      taxHint: {
        eventType: "DISPOSAL",
        assetSold: { assetType: "NATIVE", currencyCode: "XRP", symbol: "XRP" },
        feeAsset: { assetType: "NATIVE", currencyCode: "XRP", symbol: "XRP" },
        quantitySold: "300",
        feeQuantity: "0.000013",
        valuationBrl: "2400",
        valuationSource: "EXECUTED_PAIR",
        confidence: 0.92,
        classificationReason: "SaÃ­da para contraparte de exchange com valor executado conhecido no cenÃ¡rio demo."
      }
    }
  },
  {
    hash: "XRPLTX0005NFT",
    ledger_index: 92600421,
    close_time_iso: "2025-08-10T10:15:00.000Z",
    tx: {
      TransactionType: "NFTokenAcceptOffer",
      Account: DEMO_WALLET_XRPL,
      NFTokenID: "00080000AABBCCDDEEFF0011223344556677889900AA",
      Amount: "50000000",
      Fee: "20"
    },
    meta: {
      TransactionResult: "tesSUCCESS",
      taxHint: {
        eventType: "DISPOSAL",
        assetSold: {
          assetType: "NFT",
          tokenId: "00080000AABBCCDDEEFF0011223344556677889900AA",
          symbol: "NFT-XRPL"
        },
        feeAsset: { assetType: "NATIVE", currencyCode: "XRP", symbol: "XRP" },
        quantitySold: "1",
        feeQuantity: "0.00002",
        valuationBrl: "450",
        valuationSource: "EXECUTED_PAIR",
        confidence: 0.88,
        classificationReason: "Venda de NFT com contraprestaÃ§Ã£o nativa explÃ­cita."
      }
    }
  },
  {
    hash: "XRPLTX0006AMB",
    ledger_index: 93122000,
    close_time_iso: "2025-11-20T20:05:00.000Z",
    tx: {
      TransactionType: "Payment",
      Account: DEMO_WALLET_XRPL,
      Destination: "rPossivelCarteiraPropria1111111111111",
      Amount: "100000000",
      Fee: "12"
    },
    meta: {
      TransactionResult: "tesSUCCESS",
      delivered_amount: "100000000",
      taxHint: {
        eventType: "UNKNOWN_MANUAL_REVIEW",
        assetSold: { assetType: "NATIVE", currencyCode: "XRP", symbol: "XRP" },
        feeAsset: { assetType: "NATIVE", currencyCode: "XRP", symbol: "XRP" },
        quantitySold: "100",
        feeQuantity: "0.000012",
        valuationSource: "UNAVAILABLE",
        confidence: 0.35,
        classificationReason: "TransferÃªncia potencialmente prÃ³pria, sem prova conclusiva de alienaÃ§Ã£o."
      }
    }
  },
  {
    hash: "XRPLTX0007AMM",
    ledger_index: 93333999,
    close_time_iso: "2025-12-15T14:45:00.000Z",
    tx: {
      TransactionType: "AMMDeposit",
      Account: DEMO_WALLET_XRPL,
      Amount: "50000000",
      Amount2: { currency: "BRZ", issuer: "rIssuerBRZ111111111111111111111", value: "100" },
      Fee: "20"
    },
    meta: {
      TransactionResult: "tesSUCCESS",
      taxHint: {
        eventType: "INFO_IGNORED",
        confidence: 0.5,
        classificationReason: "Evento AMM registrado como informacional no MVP."
      }
    }
  }
];

const xahauHistory: DemoLedgerTransaction[] = [
  {
    hash: "XAHAUTX0001PAY",
    ledger_index: 30222411,
    close_time_iso: "2025-10-11T11:00:00.000Z",
    tx: {
      TransactionType: "Payment",
      Account: "rXahauCounterParty111111111111111111",
      Destination: DEMO_WALLET_XAHAU,
      Amount: "50000000",
      Fee: "10"
    },
    meta: {
      TransactionResult: "tesSUCCESS",
      delivered_amount: "50000000",
      taxHint: {
        eventType: "TRANSFER_IN",
        assetAcquired: { assetType: "NATIVE", currencyCode: "XAH", symbol: "XAH" },
        quantityAcquired: "50",
        valuationSource: "MARKET_PRICE",
        confidence: 0.76,
        classificationReason: "Recebimento em rede Xahau sem confirmaÃ§Ã£o de natureza tributÃ¡ria."
      }
    }
  }
];

export function getDemoHistory(network: "XRPL" | "XAHAU", account: string): DemoLedgerTransaction[] {
  if (network === "XRPL" && account === DEMO_WALLET_XRPL) {
    return xrplHistory;
  }

  if (network === "XAHAU" && account === DEMO_WALLET_XAHAU) {
    return xahauHistory;
  }

  return [];
}

