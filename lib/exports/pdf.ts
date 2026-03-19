import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type BalanceRow = {
  assetKey: string;
  displayName: string;
  quantity: number;
  totalCostBrl: number;
  averageCostBrl: number;
};

type MonthlyRow = {
  month: string;
  disposalGrossBrl: number;
  realizedGainBrl: number;
  operationVolumeBrl: number;
  alerts: string[];
};

export async function generateTaxPdf(input: {
  walletAddress: string;
  network: string;
  periodStart: string;
  periodEnd: string;
  balances: BalanceRow[];
  monthly: MonthlyRow[];
  patrimonioEstimadoBrl: number;
  ganhosRealizadosBrl: number;
  pendingReviewCount: number;
  methodologyNotes: string;
}) {
  const pdf = await PDFDocument.create();
  let page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = 800;

  const line = (text: string, opts?: { bold?: boolean; size?: number; color?: [number, number, number] }) => {
    if (y < 50) {
      y = 800;
      page = pdf.addPage([595, 842]);
    }

    page.drawText(text, {
      x: 40,
      y,
      size: opts?.size ?? 10,
      font: opts?.bold ? bold : font,
      color: opts?.color ? rgb(opts.color[0], opts.color[1], opts.color[2]) : rgb(0.1, 0.12, 0.18)
    });
    y -= (opts?.size ?? 10) + 6;
  };

  line("Xaman Brazil Tax Center", { bold: true, size: 18 });
  line("Demonstrativo Fiscal Assistivo (nÃ£o Ã© declaraÃ§Ã£o automÃ¡tica)", { size: 11 });
  line(`Carteira: ${input.walletAddress}`);
  line(`Rede: ${input.network}`);
  line(`PerÃ­odo analisado: ${input.periodStart} atÃ© ${input.periodEnd}`);
  y -= 6;

  line("Resumo", { bold: true, size: 13 });
  line(`PatrimÃ´nio estimado em BRL: R$ ${input.patrimonioEstimadoBrl.toFixed(2)}`);
  line(`Ganhos/perdas realizados: R$ ${input.ganhosRealizadosBrl.toFixed(2)}`);
  line(`Eventos pendentes de revisÃ£o manual: ${input.pendingReviewCount}`);
  y -= 6;

  line("Ativos e saldos finais", { bold: true, size: 13 });
  if (!input.balances.length) {
    line("Sem ativos com saldo no perÃ­odo.");
  }

  for (const balance of input.balances) {
    line(
      `${balance.displayName} | Quantidade: ${balance.quantity.toFixed(8)} | Custo total BRL: R$ ${balance.totalCostBrl.toFixed(
        2
      )} | Custo mÃ©dio: R$ ${balance.averageCostBrl.toFixed(2)}`
    );
  }
  y -= 6;

  line("AlienaÃ§Ãµes / trocas e ganhos", { bold: true, size: 13 });
  for (const month of input.monthly) {
    line(
      `${month.month} | AlienaÃ§Ãµes BRL: R$ ${month.disposalGrossBrl.toFixed(2)} | Ganho/perda BRL: R$ ${month.realizedGainBrl.toFixed(
        2
      )}`
    );
    if (month.alerts.length > 0) {
      line(`Alertas: ${month.alerts.join(", ")}`);
    }
  }

  y -= 6;
  line("Notas metodolÃ³gicas", { bold: true, size: 13 });
  line(input.methodologyNotes);
  y -= 6;

  line("Disclaimer jurÃ­dico/fiscal", { bold: true, size: 13 });
  line("Este relatÃ³rio Ã© assistivo e educacional. NÃ£o constitui consultoria jurÃ­dica, fiscal ou contÃ¡bil.");
  line("Revise os dados com profissional habilitado antes de qualquer entrega formal Ã  Receita Federal.");

  return pdf.save();
}

