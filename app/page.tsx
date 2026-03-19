"use client";

import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatBrl, formatQty } from "@/lib/utils";
import { LegalDisclaimer } from "@/components/legal-disclaimer";

type EventType =
  | "ACQUISITION"
  | "DISPOSAL"
  | "SWAP"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "AIRDROP"
  | "REWARD"
  | "FEE"
  | "UNKNOWN_MANUAL_REVIEW"
  | "INFO_IGNORED";

type SessionState = {
  sessionId: string;
  walletId: string;
  address: string;
  network: "XRPL" | "XAHAU";
};

type DashboardResponse = {
  wallet: {
    id: string;
    address: string;
    network: "XRPL" | "XAHAU";
  };
  syncStatus: {
    status: string;
    provider: string;
    lastSyncedAt: string | null;
  } | null;
  summary: {
    patrimonioEstimadoBrl: number;
    ganhosRealizadosBrl: number;
    totalAlienacoesBrl: number;
    saldoFinalPorAtivo: Array<{
      assetKey: string;
      displayName: string;
      quantity: number;
      totalCostBrl: number;
      averageCostBrl: number;
    }>;
    alertasMensais: Array<{
      month: string;
      alerts: string[];
      disposalGrossBrl: number;
      operationVolumeBrl: number;
    }>;
  };
  pendingManualEvents: Array<{
    id: string;
    occurredAt: string;
    txHash: string | null;
    eventType: EventType;
    classificationReason: string;
    valuationBrl: string | null;
    confidence: number;
  }>;
  events: Array<{
    id: string;
    occurredAt: string;
    txHash: string | null;
    eventType: EventType;
    status: string;
    confidence: number;
    valuationBrl: string | null;
    quantitySold: string | null;
    quantityAcquired: string | null;
    assetSold: { displayName: string | null } | null;
    assetAcquired: { displayName: string | null } | null;
    manualOverrideApplied: boolean;
    notes: string | null;
    overrides: Array<{
      overrideType: string;
      createdAt: string;
      reason: string | null;
    }>;
  }>;
};

type SettingsResponse = {
  session: {
    id: string;
    brazilTaxMode: boolean;
  } | null;
  reminders: {
    annualReminderEnabled: boolean;
    monthlyReminderEnabled: boolean;
    thresholdBannerEnabled: boolean;
  } | null;
};

type OverrideDraft = {
  eventType?: EventType;
  valuationBrl?: number;
  notes?: string;
  markSelfTransfer?: boolean;
};

const EVENT_TYPES = [
  "ACQUISITION",
  "DISPOSAL",
  "SWAP",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "AIRDROP",
  "REWARD",
  "FEE",
  "UNKNOWN_MANUAL_REVIEW",
  "INFO_IGNORED"
] as const;

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Falha de comunicaÃ§Ã£o com API");
  }

  return response.json() as Promise<T>;
}

function parseXAppStyle() {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  return params.get("xAppStyle")?.toUpperCase() ?? null;
}

export default function HomePage() {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<SessionState | null>(null);
  const [taxYear, setTaxYear] = useState<number>(new Date().getUTCFullYear());
  const [mode, setMode] = useState<"demo" | "xapp">("demo");
  const [address, setAddress] = useState("rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh");
  const [network, setNetwork] = useState<"XRPL" | "XAHAU">("XRPL");
  const [brazilTaxMode, setBrazilTaxMode] = useState(true);
  const [consentAccepted, setConsentAccepted] = useState(true);
  const [forceMock, setForceMock] = useState(false);
  const [filterMonth, setFilterMonth] = useState("");
  const [filterAsset, setFilterAsset] = useState("");
  const [filterNetwork, setFilterNetwork] = useState<"" | "XRPL" | "XAHAU">("");
  const [showRaw, setShowRaw] = useState(false);
  const [overrideDrafts, setOverrideDrafts] = useState<Record<string, OverrideDraft>>({});

  useEffect(() => {
    const cached = localStorage.getItem("xaman-tax-session");
    if (!cached) {
      return;
    }

    try {
      const parsed = JSON.parse(cached) as SessionState;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSession(parsed);
      setAddress(parsed.address);
      setNetwork(parsed.network);
    } catch {
      localStorage.removeItem("xaman-tax-session");
    }
  }, []);

  useEffect(() => {
    const style = parseXAppStyle();
    if (!style) {
      return;
    }

    const root = document.documentElement;
    if (style === "DARK" || style === "MOONLIGHT" || style === "ROYAL") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, []);

  const dashboardQuery = useQuery<DashboardResponse>({
    enabled: Boolean(session?.walletId),
    queryKey: ["dashboard", session?.walletId, taxYear, filterMonth, filterAsset, filterNetwork],
    queryFn: () =>
      apiJson<DashboardResponse>(
        `/api/dashboard?walletId=${session?.walletId}&taxYear=${taxYear}${
          filterMonth ? `&month=${encodeURIComponent(filterMonth)}` : ""
        }${filterAsset ? `&assetKey=${encodeURIComponent(filterAsset)}` : ""}${
          filterNetwork ? `&network=${encodeURIComponent(filterNetwork)}` : ""
        }`
      )
  });

  const settingsQuery = useQuery<SettingsResponse>({
    enabled: Boolean(session?.sessionId),
    queryKey: ["settings", session?.sessionId],
    queryFn: () => apiJson<SettingsResponse>(`/api/settings?sessionId=${session?.sessionId}`)
  });

  const rulesQuery = useQuery<{ rulesets: Array<{ id: string; taxYear: number; version: string; effectiveFrom: string }> }>({
    queryKey: ["rulesets", taxYear],
    queryFn: () => apiJson(`/api/rulesets?taxYear=${taxYear}`)
  });

  const rawEventsQuery = useQuery<{ events: Array<{ id: string; txHash: string; rawTransaction: { rawJson: unknown } | null }> }>({
    enabled: Boolean(session?.walletId) && showRaw,
    queryKey: ["events-raw", session?.walletId],
    queryFn: () => apiJson(`/api/events?walletId=${session?.walletId}&includeRaw=true`)
  });

  const bootstrapMutation = useMutation({
    mutationFn: () =>
      apiJson<{
        session: { id: string };
        wallet: { id: string; address: string; network: "XRPL" | "XAHAU" };
      }>("/api/session/bootstrap", {
        method: "POST",
        body: JSON.stringify({
          mode,
          address,
          network,
          brazilTaxMode,
          consentAccepted
        })
      }),
    onSuccess(data) {
      const nextSession: SessionState = {
        sessionId: data.session.id,
        walletId: data.wallet.id,
        address: data.wallet.address,
        network: data.wallet.network
      };
      setSession(nextSession);
      localStorage.setItem("xaman-tax-session", JSON.stringify(nextSession));
      queryClient.invalidateQueries();
    }
  });

  const syncMutation = useMutation({
    mutationFn: () =>
      apiJson("/api/sync", {
        method: "POST",
        body: JSON.stringify({
          walletId: session?.walletId,
          forceMock,
          taxYear
        })
      }),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["events-raw"] });
    }
  });

  const recalcMutation = useMutation({
    mutationFn: () =>
      apiJson("/api/recalculate", {
        method: "POST",
        body: JSON.stringify({
          walletId: session?.walletId,
          taxYear
        })
      }),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });

  const overrideMutation = useMutation({
    mutationFn: async (input: { eventId: string; payload: OverrideDraft }) =>
      apiJson(`/api/events/${input.eventId}/override`, {
        method: "POST",
        body: JSON.stringify({
          ...input.payload,
          sessionId: session?.sessionId,
          taxYear
        })
      }),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["events-raw"] });
    }
  });

  const settingsMutation = useMutation({
    mutationFn: () =>
      apiJson("/api/settings", {
        method: "POST",
        body: JSON.stringify({
          sessionId: session?.sessionId,
          brazilTaxMode,
          annualReminderEnabled: settingsQuery.data?.reminders?.annualReminderEnabled,
          monthlyReminderEnabled: settingsQuery.data?.reminders?.monthlyReminderEnabled,
          thresholdBannerEnabled: settingsQuery.data?.reminders?.thresholdBannerEnabled
        })
      }),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    }
  });

  const alerts = dashboardQuery.data?.summary.alertasMensais ?? [];

  const manualReviewRows = useMemo(() => dashboardQuery.data?.pendingManualEvents ?? [], [dashboardQuery.data]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 pb-12 pt-4">
      <section className="card mb-4">
        <h1 className="text-xl font-bold">Xaman Brazil Tax Center</h1>
        <p className="mt-1 text-sm text-muted">
          Assistente fiscal para XRPL/Xahau. NÃ£o solicita seed, nÃ£o executa entrega automÃ¡tica e nÃ£o substitui orientaÃ§Ã£o profissional.
        </p>
      </section>

      <section className="card mb-4">
        <h2 className="mb-3 text-base font-semibold">1) SessÃ£o e carteira</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-muted">Modo</span>
            <select className="select" value={mode} onChange={(e) => setMode(e.target.value as "demo" | "xapp")}>
              <option value="demo">Demo/manual</option>
              <option value="xapp">xApp autenticado</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-muted">Rede</span>
            <select className="select" value={network} onChange={(e) => setNetwork(e.target.value as "XRPL" | "XAHAU")}>
              <option value="XRPL">XRPL</option>
              <option value="XAHAU">Xahau</option>
            </select>
          </label>

          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-muted">EndereÃ§o (somente leitura)</span>
            <input className="input" value={address} onChange={(e) => setAddress(e.target.value.trim())} placeholder="r..." />
          </label>

          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={brazilTaxMode} onChange={(e) => setBrazilTaxMode(e.target.checked)} />
            Modo Fiscal Brasil habilitado
          </label>

          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={consentAccepted} onChange={(e) => setConsentAccepted(e.target.checked)} />
            Concordo com processamento assistivo de dados fiscais
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-primary" onClick={() => bootstrapMutation.mutate()} disabled={bootstrapMutation.isPending}>
            {bootstrapMutation.isPending ? "Iniciando..." : "Iniciar sessÃ£o"}
          </button>
          {session ? <span className="badge border-success text-success">SessÃ£o ativa: {session.address}</span> : null}
          {bootstrapMutation.error ? <span className="text-sm text-red-600">{bootstrapMutation.error.message}</span> : null}
        </div>
      </section>

      <section className="card mb-4">
        <h2 className="mb-3 text-base font-semibold">2) SincronizaÃ§Ã£o e cÃ¡lculo</h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block text-muted">Ano fiscal</span>
            <input
              className="input"
              type="number"
              value={taxYear}
              onChange={(e) => setTaxYear(Number(e.target.value))}
              min={2019}
              max={2030}
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-muted">Filtro mÃªs (AAAA-MM)</span>
            <input className="input" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} placeholder="2025-07" />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-muted">Filtro ativo (internalKey)</span>
            <input className="input" value={filterAsset} onChange={(e) => setFilterAsset(e.target.value)} placeholder="XRPL:NATIVE:XRP" />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-muted">Filtro rede</span>
            <select className="select" value={filterNetwork} onChange={(e) => setFilterNetwork(e.target.value as "" | "XRPL" | "XAHAU")}>
              <option value="">Todas</option>
              <option value="XRPL">XRPL</option>
              <option value="XAHAU">Xahau</option>
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={forceMock} onChange={(e) => setForceMock(e.target.checked)} />
            ForÃ§ar provedores mock (recomendado para MVP local)
          </label>

          <button className="btn-primary" onClick={() => syncMutation.mutate()} disabled={!session || syncMutation.isPending}>
            {syncMutation.isPending ? "Sincronizando..." : "Sincronizar e recalcular"}
          </button>

          <button className="btn-secondary" onClick={() => recalcMutation.mutate()} disabled={!session || recalcMutation.isPending}>
            Recalcular
          </button>

          <button
            className="btn-secondary"
            onClick={() => {
              if (session) {
                window.location.href = `/api/export/csv?walletId=${session.walletId}&taxYear=${taxYear}`;
              }
            }}
            disabled={!session}
          >
            Exportar CSV
          </button>

          <button
            className="btn-secondary"
            onClick={() => {
              if (session) {
                window.location.href = `/api/export/pdf?walletId=${session.walletId}&taxYear=${taxYear}`;
              }
            }}
            disabled={!session}
          >
            Exportar PDF
          </button>
        </div>

        <p className="mt-2 text-xs text-muted">
          Status de sync: {dashboardQuery.data?.syncStatus?.status ?? "--"} | Provedor: {dashboardQuery.data?.syncStatus?.provider ?? "--"}
        </p>
        {(syncMutation.error || recalcMutation.error) && (
          <p className="mt-2 text-sm text-red-600">{(syncMutation.error ?? recalcMutation.error)?.message}</p>
        )}
      </section>

      <section className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <article className="card">
          <h3 className="text-sm text-muted">PatrimÃ´nio estimado em BRL</h3>
          <p className="mt-2 text-2xl font-bold">{formatBrl(dashboardQuery.data?.summary.patrimonioEstimadoBrl)}</p>
        </article>
        <article className="card">
          <h3 className="text-sm text-muted">Ganhos/perdas realizados</h3>
          <p className="mt-2 text-2xl font-bold">{formatBrl(dashboardQuery.data?.summary.ganhosRealizadosBrl)}</p>
        </article>
        <article className="card">
          <h3 className="text-sm text-muted">AlienaÃ§Ãµes no perÃ­odo</h3>
          <p className="mt-2 text-2xl font-bold">{formatBrl(dashboardQuery.data?.summary.totalAlienacoesBrl)}</p>
        </article>
      </section>

      <section className="card mb-4">
        <h2 className="mb-3 text-base font-semibold">3) Alertas mensais e lembretes</h2>
        {alerts.length === 0 ? <p className="text-sm text-muted">Sem alertas de limite para o filtro atual.</p> : null}
        {alerts.map((row) => (
          <div key={row.month} className="mb-2 rounded-xl border border-warning/30 bg-warning/10 p-3">
            <p className="text-sm font-semibold">{row.month}</p>
            <p className="text-sm">Alertas: {row.alerts.join(", ")}</p>
            <p className="text-sm">Volume no mÃªs: {formatBrl(row.operationVolumeBrl)}</p>
          </div>
        ))}
        <p className="mt-2 text-xs text-muted">
          Lembretes locais: entrega anual de IR e monitoramento mensal de obrigaÃ§Ãµes (DARF/reporting) configurÃ¡veis na seÃ§Ã£o de configuraÃ§Ãµes.
        </p>
      </section>

      <section className="card mb-4">
        <h2 className="mb-3 text-base font-semibold">4) TransaÃ§Ãµes normalizadas</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Ativo vendido</th>
                <th>Ativo adquirido</th>
                <th>Quantidade</th>
                <th>BRL</th>
                <th>ConfianÃ§a</th>
                <th>RevisÃ£o</th>
                <th>Trilha manual</th>
              </tr>
            </thead>
            <tbody>
              {(dashboardQuery.data?.events ?? []).map((event) => (
                <tr key={event.id}>
                  <td>{new Date(event.occurredAt).toLocaleString("pt-BR")}</td>
                  <td>{event.eventType}</td>
                  <td>{event.assetSold?.displayName ?? "-"}</td>
                  <td>{event.assetAcquired?.displayName ?? "-"}</td>
                  <td>
                    {formatQty(event.quantitySold)} / {formatQty(event.quantityAcquired)}
                  </td>
                  <td>{formatBrl(event.valuationBrl ? Number(event.valuationBrl) : null)}</td>
                  <td>{Math.round(event.confidence * 100)}%</td>
                  <td>{event.manualOverrideApplied ? "manual" : event.status}</td>
                  <td>
                    {event.overrides?.[0]
                      ? `${event.overrides[0].overrideType} em ${new Date(event.overrides[0].createdAt).toLocaleDateString(
                          "pt-BR"
                        )}`
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card mb-4">
        <h2 className="mb-3 text-base font-semibold">5) RevisÃ£o manual obrigatÃ³ria</h2>
        {manualReviewRows.length === 0 ? <p className="text-sm text-muted">Nenhum evento pendente.</p> : null}
        {manualReviewRows.map((row) => {
          const draft = overrideDrafts[row.id] ?? {};
          return (
            <div key={row.id} className="mb-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-sm font-semibold">{new Date(row.occurredAt).toLocaleString("pt-BR")} | {row.eventType}</p>
              <p className="text-xs text-muted">Motivo: {row.classificationReason}</p>
              <p className="text-xs text-muted">ConfianÃ§a: {Math.round(row.confidence * 100)}%</p>

              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="text-xs">
                  <span className="mb-1 block text-muted">Nova classificaÃ§Ã£o</span>
                  <select
                    className="select"
                    value={draft.eventType ?? row.eventType}
                    onChange={(e) =>
                      setOverrideDrafts((prev) => ({
                        ...prev,
                        [row.id]: { ...draft, eventType: e.target.value as EventType }
                      }))
                    }
                  >
                    {EVENT_TYPES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-xs">
                  <span className="mb-1 block text-muted">Valuation manual (BRL)</span>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    value={draft.valuationBrl ?? ""}
                    onChange={(e) =>
                      setOverrideDrafts((prev) => ({
                        ...prev,
                        [row.id]: {
                          ...draft,
                          valuationBrl: e.target.value ? Number(e.target.value) : undefined
                        }
                      }))
                    }
                  />
                </label>

                <label className="text-xs sm:col-span-2">
                  <span className="mb-1 block text-muted">Notas</span>
                  <input
                    className="input"
                    value={draft.notes ?? ""}
                    onChange={(e) =>
                      setOverrideDrafts((prev) => ({
                        ...prev,
                        [row.id]: {
                          ...draft,
                          notes: e.target.value
                        }
                      }))
                    }
                  />
                </label>

                <label className="inline-flex items-center gap-2 text-xs sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={draft.markSelfTransfer ?? false}
                    onChange={(e) =>
                      setOverrideDrafts((prev) => ({
                        ...prev,
                        [row.id]: {
                          ...draft,
                          markSelfTransfer: e.target.checked
                        }
                      }))
                    }
                  />
                  Marcar como auto-transferÃªncia
                </label>
              </div>

              <div className="mt-2 flex gap-2">
                <button
                  className="btn-primary"
                  onClick={() => overrideMutation.mutate({ eventId: row.id, payload: draft })}
                  disabled={overrideMutation.isPending}
                >
                  Aplicar revisÃ£o
                </button>
              </div>
            </div>
          );
        })}

        {overrideMutation.error ? <p className="text-sm text-red-600">{overrideMutation.error.message}</p> : null}
      </section>

      <section className="card mb-4">
        <h2 className="mb-3 text-base font-semibold">6) Regras e configuraÃ§Ãµes</h2>
        <div className="mb-2 flex items-center gap-2">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={brazilTaxMode} onChange={(e) => setBrazilTaxMode(e.target.checked)} />
            Modo Fiscal Brasil
          </label>
          <button className="btn-secondary" onClick={() => settingsMutation.mutate()} disabled={!session || settingsMutation.isPending}>
            Salvar configuraÃ§Ãµes
          </button>
        </div>

        <div className="text-xs text-muted">
          <p>
            Lembrete anual: {settingsQuery.data?.reminders?.annualReminderEnabled ? "ativo" : "inativo"} | Lembrete mensal: {" "}
            {settingsQuery.data?.reminders?.monthlyReminderEnabled ? "ativo" : "inativo"}
          </p>
        </div>

        <div className="mt-3">
          <p className="text-sm font-semibold">Rulesets disponÃ­veis ({taxYear})</p>
          <ul className="mt-1 text-xs text-muted">
            {(rulesQuery.data?.rulesets ?? []).map((rule) => (
              <li key={rule.id}>
                {rule.version} | inÃ­cio: {new Date(rule.effectiveFrom).toLocaleDateString("pt-BR")}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card mb-4">
        <h2 className="mb-3 text-base font-semibold">7) Visualizador de transaÃ§Ã£o bruta (debug)</h2>
        <button className="btn-secondary" onClick={() => setShowRaw((prev) => !prev)}>
          {showRaw ? "Ocultar" : "Mostrar"} transaÃ§Ãµes brutas
        </button>
        {showRaw ? (
          <div className="mt-3 space-y-2">
            {(rawEventsQuery.data?.events ?? []).slice(0, 5).map((event) => (
              <details key={event.id} className="rounded-xl border border-slate-200 p-2 dark:border-slate-700">
                <summary className="cursor-pointer text-sm">{event.txHash}</summary>
                <pre className="mt-2 overflow-auto text-xs">{JSON.stringify(event.rawTransaction?.rawJson, null, 2)}</pre>
              </details>
            ))}
          </div>
        ) : null}
      </section>

      <LegalDisclaimer />
    </main>
  );
}

