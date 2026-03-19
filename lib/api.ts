import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

export function withRateLimit(request: NextRequest): NextResponse | null {
  const result = checkRateLimit(request);
  if (result.ok) {
    return null;
  }

  return NextResponse.json(
    {
      error: "Limite de requisiÃ§Ãµes excedido. Tente novamente em alguns segundos."
    },
    {
      status: 429,
      headers: {
        "retry-after": String(result.retryAfter)
      }
    }
  );
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json(
    {
      error: message
    },
    {
      status
    }
  );
}

