import crypto from "node:crypto";

export type XamanJwtPayload = {
  sub?: string;
  account?: string;
  network?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
};

function base64UrlDecode(input: string): Buffer {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4;
  const padded = pad ? normalized + "=".repeat(4 - pad) : normalized;
  return Buffer.from(padded, "base64");
}

function base64UrlEncode(input: Buffer): string {
  return input
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function verifyXamanJwt(token: string, secret: string): XamanJwtPayload {
  const [rawHeader, rawPayload, rawSignature] = token.split(".");
  if (!rawHeader || !rawPayload || !rawSignature) {
    throw new Error("JWT malformado");
  }

  const header = JSON.parse(base64UrlDecode(rawHeader).toString("utf8")) as { alg?: string };
  if (header.alg !== "HS256") {
    throw new Error("Algoritmo JWT nÃ£o suportado");
  }

  const data = `${rawHeader}.${rawPayload}`;
  const expected = base64UrlEncode(crypto.createHmac("sha256", secret).update(data).digest());

  if (!crypto.timingSafeEqual(Buffer.from(rawSignature), Buffer.from(expected))) {
    throw new Error("Assinatura JWT invÃ¡lida");
  }

  const payload = JSON.parse(base64UrlDecode(rawPayload).toString("utf8")) as XamanJwtPayload;
  if (payload.exp && Date.now() >= payload.exp * 1000) {
    throw new Error("JWT expirado");
  }

  return payload;
}

