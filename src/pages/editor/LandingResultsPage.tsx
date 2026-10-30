// src/pages/editor/LandingResultsPage.tsx
// Etapa 5, paso 6c (2026-10-30): "Mis resultados" del Editor de landings. Sus indicadores del período (entregas a tiempo,
// lo devuelto, tests ganados, la compra después contra antes con los mismos anuncios y el % de visita) y cómo les fue a
// sus landings publicadas. Sin dólares.
import React, { useCallback, useEffect, useState } from "react";
import { Box, Chip, Paper, Stack, Tooltip, Typography } from "@mui/material";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { Loading } from "../../components/ui/content/Loading";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { useValidateSession } from "../../hooks/useValidateSession";
import { api, dateTime } from "../../components/meta-ads/metaAds";
import { Better, MetricFormat, PeriodInfo, formatValue } from "../../components/owner-panel/ownerPanel";
import { TEST_COLOR, TestResult } from "../../components/meta-ads/landingTasksShared";

type Preset = "7d" | "month" | "last_month";
type Metric = { key: string; label: string; format: MetricFormat; better: Better; help: string };
type Side = { conversion: number | null; visit: number | null } | null;
type ResultTask = {
    id: number; code: string; product: string | null; landing: string | null; status: string; status_label: string; published_at: string | null; tested_at: string | null;
    state: TestResult["state"]; state_label: string | null; change: number | null; before: Side; after: Side; on_time: boolean | null; versions: number; returned: number;
};
type Data = { period: PeriodInfo; metrics: Metric[]; me: { values: Record<string, number | null>; details: Record<string, string> }; tasks: ResultTask[] };

const PRESETS: { key: Preset; label: string }[] = [{ key: "7d", label: "Últimos 7 días" }, { key: "month", label: "Este mes" }, { key: "last_month", label: "Mes pasado" }];
const card = { borderRadius: 3, border: "1px solid", borderColor: "divider", p: 2 } as const;
const pct = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${new Intl.NumberFormat("es-VE", { maximumFractionDigits: 2 }).format(v)} %`);

export const LandingResultsPage: React.FC = () => {
    const { loadingSession, isValid } = useValidateSession();
    const [preset, setPreset] = useState<Preset>("month");
    const [data, setData] = useState<Data | null>(null);

    const load = useCallback(() => {
        api<Data>(`/landing-editor/results?periodo=${preset}`).then(setData).catch((e) => toast.error(e.message));
    }, [preset]);
    useEffect(() => { if (isValid) load(); }, [isValid, load]);

    if (loadingSession || !isValid || !data) return <Loading />;

    return (
        <Layout>
            <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: 1000, mx: "auto" }}>
                <DescripcionDeVista title="Mis resultados" description="Cómo te va: tus entregas y cómo les fue a tus landings publicadas con los mismos anuncios, antes y después." />
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                    {PRESETS.map((p) => <Chip key={p.key} label={p.label} color={preset === p.key ? "primary" : "default"} variant={preset === p.key ? "filled" : "outlined"} onClick={() => setPreset(p.key)} />)}
                    <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>{data.period.from === data.period.to ? data.period.from : `${data.period.from} al ${data.period.to}`}</Typography>
                </Stack>

                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))" }, gap: 1.5, mb: 2 }}>
                    {data.metrics.map((m) => {
                        const v = data.me.values[m.key] ?? null;
                        return (
                            <Tooltip key={m.key} title={m.help}>
                                <Paper elevation={0} sx={{ ...card, p: 1.5, minWidth: 0 }}>
                                    <Typography variant="caption" color="text.secondary" component="div">{m.label}</Typography>
                                    <Typography variant="h6" fontWeight={700} color={m.key === "conversion_change" && v !== null ? (v >= 0 ? "success.main" : "warning.main") : "text.primary"}>
                                        {m.key === "conversion_change" && v !== null && v > 0 ? "+" : ""}{formatValue(v, m.format)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" component="div">{data.me.details[m.key] ?? " "}</Typography>
                                </Paper>
                            </Tooltip>
                        );
                    })}
                </Box>

                <Paper elevation={0} sx={card}>
                    <Typography variant="subtitle1" fontWeight="bold">Tus landings publicadas</Typography>
                    <Typography variant="caption" color="text.secondary" component="div">En test arriba y después lo testeado, lo más nuevo primero. Los mismos anuncios antes y después.</Typography>
                    {data.tasks.length === 0 ? <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Todavía no publicaste ninguna landing.</Typography>
                        : data.tasks.map((t) => (
                            <Box key={t.id} sx={{ py: 1.25, borderBottom: "1px solid", borderColor: "divider", "&:last-child": { borderBottom: 0 } }}>
                                <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                                    <Chip size="small" color="primary" label={t.code} sx={{ fontWeight: 700 }} />
                                    <Typography variant="body2" fontWeight={700}>{t.product}</Typography>
                                    {t.landing && <Chip size="small" variant="outlined" label={t.landing} />}
                                    <Chip size="small" color={TEST_COLOR[t.state]} label={t.state_label ?? t.status_label} />
                                </Stack>
                                <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
                                    {[
                                        t.before && t.after ? `Compra ${pct(t.before.conversion)} → ${pct(t.after.conversion)}${t.change !== null ? ` (${t.change > 0 ? "+" : ""}${pct(t.change)})` : ""}` : null,
                                        t.before && t.after ? `visita ${pct(t.before.visit)} → ${pct(t.after.visit)}` : null,
                                        t.on_time === null ? null : t.on_time ? "entregada a tiempo" : "entregada tarde",
                                        t.versions > 1 ? `${t.versions} versiones (${t.returned} ${t.returned === 1 ? "devuelta" : "devueltas"})` : null,
                                        t.tested_at ? `testeada el ${dateTime(t.tested_at)}` : t.published_at ? `publicada el ${dateTime(t.published_at)}` : null,
                                    ].filter(Boolean).join(" · ")}
                                </Typography>
                            </Box>
                        ))}
                </Paper>
            </Box>
        </Layout>
    );
};
