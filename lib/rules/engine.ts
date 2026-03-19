import { Ruleset, RulesetStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rulesConfigSchema, RulesConfig } from "./schema";

export async function resolveRulesetByDate(params: {
  jurisdiction?: string;
  taxYear: number;
  at: Date;
}): Promise<{ ruleset: Ruleset; config: RulesConfig }> {
  const jurisdiction = params.jurisdiction ?? "BR";
  const target = params.at;

  const candidates = await prisma.ruleset.findMany({
    where: {
      jurisdiction,
      taxYear: params.taxYear,
      status: RulesetStatus.ACTIVE,
      effectiveFrom: {
        lte: target
      }
    },
    orderBy: {
      effectiveFrom: "desc"
    }
  });

  const exact = candidates.find((item) => !item.effectiveTo || item.effectiveTo > target);

  if (exact) {
    return {
      ruleset: exact,
      config: rulesConfigSchema.parse(exact.configJson)
    };
  }

  const fallback = await prisma.ruleset.findFirst({
    where: {
      jurisdiction,
      status: RulesetStatus.ACTIVE,
      effectiveFrom: {
        lte: target
      }
    },
    orderBy: [
      {
        taxYear: "desc"
      },
      {
        effectiveFrom: "desc"
      }
    ]
  });

  if (!fallback) {
    throw new Error("Nenhum ruleset ativo encontrado");
  }

  return {
    ruleset: fallback,
    config: rulesConfigSchema.parse(fallback.configJson)
  };
}

export function evaluateMonthlyThresholds(input: {
  disposalGrossBrl: number;
  operationVolumeBrl: number;
  config: RulesConfig;
}) {
  const alerts: string[] = [];

  if (input.operationVolumeBrl >= input.config.monthly.reportingThresholdBRL) {
    alerts.push("volume_reporting_threshold");
  }

  if (input.disposalGrossBrl >= input.config.monthly.gainsExemptionDisposalThresholdBRL) {
    alerts.push("disposal_tax_threshold");
  }

  return alerts;
}

