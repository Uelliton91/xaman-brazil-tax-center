import { z } from "zod";

export const rulesConfigSchema = z.object({
  costBasis: z.object({
    method: z.literal("weighted_average"),
    includeFeesInAcquisitionCost: z.boolean(),
    disposeFeeTreatment: z.enum(["expense", "add_to_cost", "ignore"])
  }),
  monthly: z.object({
    reportingThresholdBRL: z.number().nonnegative(),
    gainsExemptionDisposalThresholdBRL: z.number().nonnegative(),
    darfDueDayRule: z.string(),
    reportingDueDayRule: z.string()
  }),
  annual: z.object({
    snapshotDate: z.string(),
    exchangeAnnualStatementDueRule: z.string(),
    assetBalanceDisplayMode: z.string()
  }),
  classification: z.object({
    eventCategoryMap: z.record(z.string(), z.string()),
    selfTransferHeuristicsEnabled: z.boolean()
  }),
  valuation: z.object({
    preferredFxSource: z.string(),
    fallbackFxSource: z.string(),
    priceProviderOrder: z.array(z.string()),
    minConfidenceAutoAccept: z.number().min(0).max(1)
  }),
  manualReview: z.object({
    requiredForLowConfidence: z.boolean(),
    requiredForAmbiguousInflow: z.boolean(),
    allowValuationOverride: z.boolean(),
    allowClassificationOverride: z.boolean()
  })
});

export type RulesConfig = z.infer<typeof rulesConfigSchema>;

