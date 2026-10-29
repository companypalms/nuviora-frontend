// src/pages/owner-panel/OwnerPanel.tsx
// Panel del dueño (Etapa 2, guias/DICCIONARIO-METRICAS.md): una sola pantalla, sin pestañas, con filtros y secciones
// que se prenden con "Ver", y arriba las alertas (§6). Solo el Admin (la ruta y el backend). Solo lee, salvo las metas y
// los límites de las alertas que pone el dueño en "Metas y límites".
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { toast } from "react-toastify";
import { useSearchParams } from "react-router-dom";
import { Layout } from "../../components/ui/Layout";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { OwnerFilters } from "../../components/owner-panel/OwnerFilters";
import { SalesSection } from "../../components/owner-panel/SalesSection";
import { MoneySection } from "../../components/owner-panel/MoneySection";
import { FunnelSection } from "../../components/owner-panel/FunnelSection";
import { LossesSection } from "../../components/owner-panel/LossesSection";
import { TeamSection } from "../../components/owner-panel/TeamSection";
import { AlertsBar } from "../../components/owner-panel/AlertsBar";
import { GoalsDialog } from "../../components/owner-panel/GoalsDialog";
import { PeriodSummary } from "../../components/owner-panel/parts";
import {
    AlertItem, AlertsResponse, Filters, PanelAlert, PanelOptions, ViewKey, fetchAlerts, fetchFunnel, fetchLosses, fetchMoney, fetchOptions, fetchSales,
    fetchTeam, loadPrefs, savePrefs,
} from "../../components/owner-panel/ownerPanel";
import { todayCaracas } from "../../components/finance/finance";

const daysBefore = (ymd: string, n: number) => {
    const d = new Date(`${ymd}T12:00:00`);
    d.setDate(d.getDate() - n);
    return d.toLocaleDateString("en-CA");
};

/** Lo mismo que revisa el backend, para avisar antes de preguntar. */
const checkDates = (f: Filters, today: string): string | null => {
    if (f.preset !== "custom") return null;
    if (!f.from || !f.to) return "Elige las dos fechas.";
    if (f.to < f.from) return "«Hasta» no puede ser antes de «Desde».";
    if (f.from > today) return "El período no puede empezar en el futuro.";
    if ((new Date(f.to).getTime() - new Date(f.from).getTime()) / 86400000 + 1 > 400) return "Máximo 400 días.";
    return null;
};

/** Los períodos que llegan hasta ahora se recalculan solos cada 2 minutos. */
const LIVE_REFRESH_MS = 120_000;

/** Los datos de una sección: se piden solo si está prendida, y de nuevo cuando cambian los filtros o se actualiza. */
function useSection<T>(enabled: boolean, filters: Filters, ready: boolean, tick: number, fetcher: (f: Filters) => Promise<T>) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (!enabled || !ready) return;
        let alive = true;
        setLoading(true);
        fetcher(filters)
            .then((r) => { if (alive) setData(r); })
            .catch((e) => { if (alive) toast.error(e.message); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [enabled, filters, ready, tick, fetcher]);
    return { data, loading };
}

export const OwnerPanel: React.FC = () => {
    const prefs = useMemo(loadPrefs, []);
    const today = todayCaracas();
    const [filters, setFilters] = useState<Filters>({ preset: prefs.preset, from: daysBefore(today, 6), to: today, shop: "", city: "", product: "" });
    const [views, setViews] = useState<ViewKey[]>(prefs.views);
    const [teamRole, setTeamRole] = useState(prefs.teamRole);
    const [options, setOptions] = useState<PanelOptions | null>(null);
    const [tick, setTick] = useState(0);
    const [alerts, setAlerts] = useState<AlertsResponse | null>(null);
    // "?metas=1": se llega desde "Poner metas" del Dashboard y abre la ventana de metas
    const [params, setParams] = useSearchParams();
    const [goalsOpen, setGoalsOpen] = useState(params.get("metas") === "1");
    const [focus, setFocus] = useState<{ role: string; id: number; name: string } | null>(null);

    const dateError = checkDates(filters, today);
    const fetchTeamRole = useCallback((f: Filters) => fetchTeam(f, teamRole), [teamRole]);
    const sales = useSection(views.includes("sales"), filters, !dateError, tick, fetchSales);
    const money = useSection(views.includes("money"), filters, !dateError, tick, fetchMoney);
    const funnel = useSection(views.includes("funnel"), filters, !dateError, tick, fetchFunnel);
    const losses = useSection(views.includes("losses"), filters, !dateError, tick, fetchLosses);
    const team = useSection(views.includes("team"), filters, !dateError, tick, fetchTeamRole);
    // El período y el aviso de lo que se sigue entregando son los mismos para todas las secciones: se muestran una vez
    const summary = (views.includes("sales") ? sales.data : null) ?? (views.includes("money") ? money.data : null)
        ?? (views.includes("funnel") ? funnel.data : null) ?? (views.includes("losses") ? losses.data : null)
        ?? (views.includes("team") ? team.data : null);

    useEffect(() => { fetchOptions().then(setOptions).catch((e) => toast.error(e.message)); }, []);

    // Las alertas no dependen de los filtros: se piden al entrar y cada vez que el panel se actualiza
    useEffect(() => {
        let alive = true;
        fetchAlerts().then((r) => { if (alive) setAlerts(r); }).catch((e) => toast.error(e.message));
        return () => { alive = false; };
    }, [tick]);

    // El panel recuerda las secciones prendidas, el período (no las fechas elegidas a mano) y el rol de Equipo
    useEffect(() => {
        savePrefs({ views, preset: filters.preset === "custom" ? prefs.preset : filters.preset, teamRole });
    }, [views, filters.preset, prefs.preset, teamRole]);

    const live = filters.preset === "today" || filters.preset === "7d" || filters.preset === "month" || (filters.preset === "custom" && filters.to >= today);
    useEffect(() => {
        if (!live) return;
        const id = window.setInterval(() => setTick((t) => t + 1), LIVE_REFRESH_MS);
        return () => window.clearInterval(id);
    }, [live]);

    const refresh = useCallback(() => setTick((t) => t + 1), []);
    const focused = useCallback(() => setFocus(null), []);
    const closeGoals = () => {
        setGoalsOpen(false);
        if (params.has("metas")) setParams({}, { replace: true });
    };

    /** Tocar una alerta: prende su sección, muestra los días que miró (sin filtros: es del negocio entero) y, si se tocó a una persona, su detalle. */
    const goTo = (a: PanelAlert, item?: AlertItem) => {
        if (!views.includes(a.section)) setViews([...views, a.section]);
        if (a.role) setTeamRole(a.role);
        const period = a.period;
        if (period) {
            setFilters((f) => ({ ...f, preset: period.preset, from: period.from ?? f.from, to: period.to ?? f.to, shop: "", city: "", product: "" }));
        }
        if (item?.id && a.role) setFocus({ role: a.role, id: item.id, name: item.name ?? "" });
        window.setTimeout(() => document.getElementById(`seccion-${a.section}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    };
    const calculating = <Typography color="text.secondary" sx={{ p: 2 }}>Calculando…</Typography>;

    return (
        <Layout>
            <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: 1280, mx: "auto" }}>
                <DescripcionDeVista
                    title="Panel del dueño"
                    description="Los números más importantes del negocio en un solo lugar. Pasa el cursor (o toca, en el celular) sobre cualquier número para ver cómo se calcula."
                />
                <Stack spacing={2.5}>
                    <OwnerFilters
                        filters={filters}
                        onChange={setFilters}
                        options={options}
                        views={views}
                        onViews={setViews}
                        updatedAt={summary?.updated_at}
                        onRefresh={refresh}
                        onGoals={() => setGoalsOpen(true)}
                        dateError={dateError}
                    />

                    <AlertsBar data={alerts} onGo={goTo} onSetup={() => setGoalsOpen(true)} />

                    {views.length === 0 && (
                        <Typography color="text.secondary" sx={{ p: 3, textAlign: "center" }}>
                            Prende al menos una sección en «Ver» para ver sus números.
                        </Typography>
                    )}

                    {summary && <PeriodSummary data={summary} />}

                    {views.includes("sales") && <Box id="seccion-sales">{sales.data ? <SalesSection data={sales.data} loading={sales.loading} /> : calculating}</Box>}
                    {views.includes("money") && <Box id="seccion-money">{money.data ? <MoneySection data={money.data} loading={money.loading} /> : calculating}</Box>}
                    {views.includes("funnel") && <Box id="seccion-funnel">{funnel.data ? <FunnelSection data={funnel.data} loading={funnel.loading} /> : calculating}</Box>}
                    {views.includes("losses") && (
                        <Box id="seccion-losses">
                            {losses.data ? <LossesSection data={losses.data} loading={losses.loading} filters={filters} ready={!dateError} /> : calculating}
                        </Box>
                    )}
                    {views.includes("team") && (
                        <Box id="seccion-team">
                            {team.data
                                ? <TeamSection data={team.data} loading={team.loading} role={teamRole} onRole={setTeamRole} filters={filters} focus={focus} onFocused={focused} />
                                : calculating}
                        </Box>
                    )}
                </Stack>
            </Box>
            <GoalsDialog open={goalsOpen} onClose={closeGoals} onSaved={refresh} />
        </Layout>
    );
};
