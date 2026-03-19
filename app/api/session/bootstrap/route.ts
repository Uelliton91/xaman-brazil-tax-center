import { NetworkType, SessionMode } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, withRateLimit } from "@/lib/api";
import { verifyXamanJwt } from "@/lib/auth/xaman-jwt";
import { isLikelyClassicAddress } from "@/lib/address";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { DEMO_WALLET_XRPL } from "@/lib/demo/ledger-data";

const schema = z.object({
  mode: z.enum(["demo", "xapp"]).default("demo"),
  address: z.string().optional(),
  network: z.nativeEnum(NetworkType).default(NetworkType.XRPL),
  brazilTaxMode: z.boolean().default(true),
  consentAccepted: z.boolean().default(true),
  xamanJwt: z.string().optional(),
  xamanUserToken: z.string().optional()
});

export async function POST(request: NextRequest) {
  const limited = withRateLimit(request);
  if (limited) {
    return limited;
  }

  try {
    const body = schema.parse(await request.json());

    let mode = body.mode;
    let address = body.address;
    let network = body.network;
    let xamanAccount: string | undefined;

    if (mode === "xapp") {
      if (!body.xamanJwt || !env.XAMAN_API_SECRET) {
        return jsonError("JWT xApp ausente ou secret do app nÃ£o configurado", 400);
      }

      const payload = verifyXamanJwt(body.xamanJwt, env.XAMAN_API_SECRET);
      xamanAccount = (payload.account as string | undefined) ?? (payload.sub as string | undefined);
      if (!xamanAccount) {
        return jsonError("NÃ£o foi possÃ­vel identificar a conta no JWT", 400);
      }

      address = xamanAccount;
      network = body.network;
    }

    if (!address) {
      mode = "demo";
      address = DEMO_WALLET_XRPL;
      network = NetworkType.XRPL;
    }

    if (!isLikelyClassicAddress(address)) {
      return jsonError(
        "EndereÃ§o invÃ¡lido. Use um endereÃ§o clÃ¡ssico completo comeÃ§ando com 'r' (ex.: r...).",
        400
      );
    }

    const session = await prisma.userSession.create({
      data: {
        mode: mode === "xapp" ? SessionMode.XAPP : SessionMode.DEMO,
        xamanUserToken: body.xamanUserToken,
        xamanAccount,
        brazilTaxMode: body.brazilTaxMode,
        consentAccepted: body.consentAccepted
      }
    });

    const wallet = await prisma.wallet.create({
      data: {
        sessionId: session.id,
        address,
        network
      }
    });

    await prisma.reminderSetting.upsert({
      where: { sessionId: session.id },
      create: {
        sessionId: session.id
      },
      update: {}
    });

    return NextResponse.json({
      session,
      wallet,
      disclaimer:
        "Ferramenta assistiva. NÃ£o substitui orientaÃ§Ã£o contÃ¡bil, jurÃ­dica ou entrega automÃ¡tica de obrigaÃ§Ãµes fiscais."
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Erro ao iniciar sessÃ£o", 400);
  }
}

