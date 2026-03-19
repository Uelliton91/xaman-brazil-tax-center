# RULES.md

## Tax Rules Engine Model (MVP)

## 1. Goal

Create a **configurable, versioned, effective-date tax rules engine** for Brazilian crypto tax assistance. The engine must support historical transitions and avoid hardcoded legal assumptions in code paths.

## 2. Ruleset structure

Ruleset record fields:

- `id`
- `jurisdiction` (`BR`)
- `taxYear` (int)
- `effectiveFrom` (ISO datetime)
- `effectiveTo` (nullable)
- `version` (semver or monotonic)
- `status` (`draft|active|deprecated`)
- `configJson` (validated by Zod schema)
- `sourceNotes` (official references)

## 3. Config model (`configJson`)

```json
{
  "costBasis": {
    "method": "weighted_average",
    "includeFeesInAcquisitionCost": true,
    "disposeFeeTreatment": "expense"
  },
  "monthly": {
    "reportingThresholdBRL": 30000,
    "gainsExemptionDisposalThresholdBRL": 35000,
    "darfDueDayRule": "last_business_day_next_month",
    "reportingDueDayRule": "last_business_day_next_month"
  },
  "annual": {
    "snapshotDate": "12-31",
    "exchangeAnnualStatementDueRule": "last_business_day_january_next_year",
    "assetBalanceDisplayMode": "acquisition_cost_brl"
  },
  "classification": {
    "eventCategoryMap": {
      "acquisition": "income_or_purchase",
      "disposal": "capital_event",
      "swap": "dual_leg",
      "airdrop": "manual_review_default",
      "reward": "manual_review_default",
      "transfer_in": "non_tax_default",
      "transfer_out": "non_tax_default",
      "fee": "deductible_configurable",
      "unknown_manual_review": "manual_review"
    },
    "selfTransferHeuristicsEnabled": true
  },
  "valuation": {
    "preferredFxSource": "bcb_ptax",
    "fallbackFxSource": "mock",
    "priceProviderOrder": ["executed_pair", "market_primary", "market_secondary", "manual_override"],
    "minConfidenceAutoAccept": 0.8
  },
  "manualReview": {
    "requiredForLowConfidence": true,
    "requiredForAmbiguousInflow": true,
    "allowValuationOverride": true,
    "allowClassificationOverride": true
  }
}
```

## 4. Effective-date resolution

Given `eventTimestamp` and `taxYear`:

1. Filter rulesets by `jurisdiction=BR` and matching `taxYear`.
2. Select ruleset where `effectiveFrom <= eventTimestamp < effectiveTo` (`effectiveTo=null` means open-ended).
3. If no exact taxYear match, fallback to nearest previous taxYear active rule with explicit warning.
4. Persist chosen `rulesetId` in each computed tax result and report.

## 5. Monthly threshold handling

Engine computes monthly aggregates by calendar month (Brazil timezone aware for reporting views):

- total disposal gross BRL
- total realized gain/loss BRL
- total operation volume BRL

Then applies ruleset thresholds:

- `reportingThresholdBRL` alert (obligation awareness)
- `gainsExemptionDisposalThresholdBRL` alert (potential taxation trigger)

Alerts are **assistive**, not filing actions.

## 6. Annual statement handling

At year-end (`12-31` by default):

- snapshot inventory balances by asset identity
- compute acquisition cost basis and estimated BRL reference values
- list realized gains/losses in year
- list unresolved manual-review events
- include rule version and methodology notes

## 7. Classification caveats

Default caveats in MVP:

- `airdrop` and `reward` are not auto-finalized as taxable income by default; route to manual review unless high-confidence, rule-enabled treatment exists.
- `swap` is modeled as disposal + acquisition (dual leg) when both legs are inferable; otherwise manual review.
- transfer heuristics can propose self-transfer but require user confirmation in ambiguous cases.
- NFTs and AMM/DEX events may be partially supported; unknown patterns become `unknown_manual_review`.

## 8. Manual review cases

Events must enter manual review when any condition holds:

- classification confidence below `minConfidenceAutoAccept`
- valuation source missing or stale
- counterpart asset identity unresolved
- conflicting heuristic outputs
- user-marked override pending recalculation

Manual actions captured:

- override type (`classification|valuation|self_transfer|notes`)
- old/new values
- timestamp
- actor/session
- reason

## 9. Seeded historical rulesets (MVP examples)

MVP seeds example configs illustrating change management:

- `BR-2019.1` effective 2019-08-01 (legacy reporting threshold model)
- `BR-2023.1` effective 2023-01-01 (gain/disclosure labels update)
- `BR-2026.1` effective 2026-07-01 (DeCripto transition placeholder)

Note: values are editable in-app/DB and documented as configurable assumptions.

## 10. Validation and safety

- Ruleset JSON validated with Zod before activation
- Prevent overlapping effective ranges for same `jurisdiction + taxYear`
- Soft-deprecate, never hard-delete used rulesets
- Recalculation requires explicit ruleset version lock for reproducibility
