import { NextRequest } from "next/server";

type Entry = {
  count: number;
  resetAt: number;
};

const LIMIT = 45;
const WINDOW_MS = 60_000;

const memory = new Map<string, Entry>();

function getKey(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }

  return req.headers.get("x-real-ip") ?? "unknown";
}

export function checkRateLimit(req: NextRequest): { ok: true } | { ok: false; retryAfter: number } {
  const key = getKey(req);
  const now = Date.now();
  const entry = memory.get(key);

  if (!entry || now > entry.resetAt) {
    memory.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }

  if (entry.count >= LIMIT) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
  }

  entry.count += 1;
  memory.set(key, entry);
  return { ok: true };
}

