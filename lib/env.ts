import { z } from "zod";

function parseEnvBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "n", "off"].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  XAMAN_API_SECRET: z.string().optional(),
  XRPL_RPC_URL: z.string().default("https://s1.ripple.com:51234"),
  XAHAU_RPC_URL: z.string().default("https://xahau.network"),
  USE_MOCK_LEDGER: z.boolean().default(true),
  USE_MOCK_PRICE: z.boolean().default(true),
  USE_MOCK_FX: z.boolean().default(true),
  APP_BASE_URL: z.string().default("http://localhost:3000")
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  XAMAN_API_SECRET: process.env.XAMAN_API_SECRET,
  XRPL_RPC_URL: process.env.XRPL_RPC_URL,
  XAHAU_RPC_URL: process.env.XAHAU_RPC_URL,
  USE_MOCK_LEDGER: parseEnvBoolean(process.env.USE_MOCK_LEDGER, true),
  USE_MOCK_PRICE: parseEnvBoolean(process.env.USE_MOCK_PRICE, true),
  USE_MOCK_FX: parseEnvBoolean(process.env.USE_MOCK_FX, true),
  APP_BASE_URL: process.env.APP_BASE_URL
});

