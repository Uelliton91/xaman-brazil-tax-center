import { FxProvider, FxQuote } from "./types";

export class BcbPtaxFxProvider implements FxProvider {
  readonly name = "BCB_PTAX";

  async getUsdToBrl(at: Date): Promise<FxQuote | null> {
    const month = String(at.getUTCMonth() + 1).padStart(2, "0");
    const day = String(at.getUTCDate()).padStart(2, "0");
    const year = at.getUTCFullYear();
    const mmddyyyy = `${month}-${day}-${year}`;

    const url =
      "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/" +
      `CotacaoMoedaDia(moeda=@moeda,dataCotacao=@dataCotacao)?@moeda='USD'&@dataCotacao='${mmddyyyy}'&$format=json`;

    const response = await fetch(url, {
      headers: {
        accept: "application/json"
      }
    });

    if (!response.ok) {
      return null;
    }

    const json = (await response.json()) as {
      value?: Array<{
        cotacaoVenda?: number;
        tipoBoletim?: string;
      }>;
    };

    const items = json.value ?? [];
    const closing = items.find((row) => row.tipoBoletim?.toLowerCase().includes("fechamento"));
    const chosen = closing ?? items.at(-1);

    if (!chosen?.cotacaoVenda) {
      return null;
    }

    return {
      usdToBrl: Number(chosen.cotacaoVenda),
      source: this.name
    };
  }
}

