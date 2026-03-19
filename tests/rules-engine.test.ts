import { beforeEach, describe, expect, test } from "vitest";
import { resolveRulesetByDate, evaluateMonthlyThresholds } from "@/lib/rules/engine";
import { seedDatabase } from "./seed-helper";

describe("rules engine", () => {
  beforeEach(() => {
    seedDatabase();
  });

  test("resolves pre-2026 ruleset", async () => {
    const resolved = await resolveRulesetByDate({
      taxYear: 2025,
      at: new Date("2025-11-20T12:00:00.000Z")
    });

    expect(resolved.ruleset.version).toBe("BR-2023.1");
  });

  test("resolves post-2026 transition ruleset", async () => {
    const resolved = await resolveRulesetByDate({
      taxYear: 2026,
      at: new Date("2026-07-15T12:00:00.000Z")
    });

    expect(resolved.ruleset.version).toBe("BR-2026.1");
    expect(resolved.config.monthly.reportingThresholdBRL).toBe(35000);
  });

  test("monthly thresholds emit expected alerts", async () => {
    const resolved = await resolveRulesetByDate({
      taxYear: 2025,
      at: new Date("2025-03-31T23:59:59.000Z")
    });

    const alerts = evaluateMonthlyThresholds({
      disposalGrossBrl: 50000,
      operationVolumeBrl: 40000,
      config: resolved.config
    });

    expect(alerts).toContain("volume_reporting_threshold");
    expect(alerts).toContain("disposal_tax_threshold");
  });
});

