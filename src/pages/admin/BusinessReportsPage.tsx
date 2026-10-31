// src/pages/admin/BusinessReportsPage.tsx
// .48b (2026-10-31): los reportes del negocio del asistente. Diario (los últimos 3 días), semanal (la semana pasada) y
// mensual (el mes pasado), en los días de las revisiones del calendario. Los números son los del Panel del dueño, ya
// revisados ("números comprobados"); la IA solo los explica. "Volver a generar" crea otra versión.
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, MenuItem, Paper, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";
import { CheckCircleRounded, InsightsRounded, RefreshRounded, WarningAmberRounded } from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { Loading } from "../../components/ui/content/Loading";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { useValidateSession } from "../../hooks/useValidateSession";
import { api, dateTime } from "../../components/meta-ads/metaAds";
import { MetricCard } from "../../components/owner-panel/MetricCard";
import { MetricCardData, MetricFormat, formatValue, money } from "../../components/owner-panel/ownerPanel";

type ReportType = "daily" | "weekly" | "monthly";
type Product = { name: string; revenue: number; ads: number; profit: number; delivered: number };
type Person = { name: string; value: number; previous: number | null };
type TeamBlock = { label: string; metric: string; format: MetricFormat; best: Person[]; dropped: Person[] } | null;
type Problem = { key: string; severity: "grave" | "aviso"; text: string; count: number; amount: number | null; examples: string[] };
type Facts = {
    type: ReportType; type_label: string; period: { from: string; to: string; label: string }; compare_label: string; maturing: boolean;
    cards: { sales?: MetricCardData[]; money?: MetricCardData[]; losses?: MetricCardData[] };
    waterfall: { key: string; label: string; amount: number }[];
    products: { best: Product[]; losing: Product[] };
    reasons: { label: string; count: number; pct: number }[];
    team: { sellers: TeamBlock; agencies: TeamBlock };
    goals: { label: string; status: string | null; progress: number | null; text: string }[];
    alerts: { level: "red" | "yellow" | "pending"; title: string; items: string[] }[];
    check: { ok: boolean; text: string; problems: Problem[] };
};
type AiText = { resumen: string; ventas: string; dinero: string; perdidas: string; equipo: string; que_mirar: string[] };
type Report = {
    id: number; type: ReportType; from: string; to: string; version: number; status: "ok" | "example" | "no_ai" | "error"; created_at: string;
    requested_by: string | null; model: string | null; error: string | null; warnings: string[]; facts: Facts; text: AiText | null;
};
type HistoryRow = { id: number; from: string; to: string; version: number; auto: boolean; created_at: string };
type Data = { type: ReportType; report: Report | null; history: HistoryRow[]; counts: Partial<Record<ReportType, number>>; runs_left: number };

const TYPES: { key: ReportType; label: string; when: string }[] = [
    { key: "daily", label: "Diario", when: "Sale solo de lunes a sábado a las 7:15, con los últimos 3 días (hoy no cuenta)." },
    { key: "weekly", label: "Semanal", when: "Sale solo el día de tu revisión semanal (jueves) a las 7:15, con la semana pasada de lunes a domingo." },
    { key: "monthly", label: "Mensual", when: "Sale solo el día 8 a las 7:15, con el mes pasado completo." },
];
const card = { borderRadius: 3, border: "1px solid", borderColor: "divider", p: 2 } as const;
const grid = { display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))", lg: "repeat(5, minmax(0, 1fr))" }, gap: { xs: 1, sm: 1.5 } } as const;
const ALERT_COLOR = { red: "error", yellow: "warning", pending: "default" } as const;

const Section: React.FC<{ title: string; text?: string; children?: React.ReactNode }> = ({ title, text, children }) => (
    <Paper elevation={0} sx={card}>
        <Typography variant="subtitle1" fontWeight="bold">{title}</Typography>
        {text && <Typography variant="body2" sx={{ mt: 0.5, mb: children ? 1.5 : 0 }}>{text}</Typography>}
        {children}
    </Paper>
);

const TeamList: React.FC<{ block: TeamBlock }> = ({ block }) => {
    if (!block || (block.best.length === 0 && block.dropped.length === 0)) return null;
    const line = (p: Person) => `${p.name}: ${formatValue(p.value, block.format)}${p.previous !== null ? ` (antes ${formatValue(p.previous, block.format)})` : ""}`;
    return (
        <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2">{block.label} · por {block.metric}</Typography>
            {block.best.map((p, i) => <Typography key={`b${i}`} variant="body2">🏆 {line(p)}</Typography>)}
            {block.dropped.map((p, i) => <Typography key={`d${i}`} variant="body2" color="error.main">↓ {line(p)}</Typography>)}
        </Box>
    );
};

const ReportView: React.FC<{ r: Report }> = ({ r }) => {
    const f = r.facts;
    const t = r.text;
    const compare = `Antes (${f.compare_label})`;
    const panelLink = `/panel-dueno?desde=${f.period.from}&hasta=${f.period.to}`;
    return (
        <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }}>
                <Box>
                    <Typography variant="h6" fontWeight="bold">{f.period.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                        Comparado con {f.compare_label} · hecho {dateTime(r.created_at)}{r.requested_by ? ` por ${r.requested_by}` : " (automático)"}{r.model ? ` · ${r.model}` : ""}
                    </Typography>
                </Box>
                <Button size="small" startIcon={<InsightsRounded />} component={RouterLink} to={panelLink}>Abrir estas fechas en el Panel</Button>
            </Stack>

            {f.check.ok ? (
                <Alert icon={<CheckCircleRounded />} severity="success"><b>Números comprobados.</b> {f.check.text}</Alert>
            ) : (
                <Alert icon={<WarningAmberRounded />} severity="warning">
                    <b>Ojo con estos números.</b> {f.check.text}
                    {f.check.problems.map((p) => (
                        <Typography key={p.key} variant="body2" sx={{ mt: 0.5 }}>
                            {p.severity === "grave" ? "✗" : "!"} {p.count}{p.amount !== null ? ` (${money(p.amount)})` : ""} · {p.text}{p.examples.length ? ` Ej.: ${p.examples.slice(0, 3).join("; ")}.` : ""}
                        </Typography>
                    ))}
                </Alert>
            )}
            {f.maturing && <Alert severity="info">Los pedidos de los últimos días todavía se están entregando: entregados, efectividad y ganancia pueden subir. Por eso esas comparaciones salen en gris.</Alert>}
            {r.status === "example" && <Alert severity="warning">Ejemplo: en esta PC no hay IA. Los números son los del Panel; el texto lo armó el sistema.</Alert>}
            {(r.status === "no_ai" || r.status === "error") && r.error && <Alert severity="warning">{r.error}</Alert>}
            {r.warnings.length > 0 && (
                <Alert severity="error">La IA escribió números que no están en los datos: <b>{r.warnings.join(", ")}</b>. Fíate de las tarjetas, no de esos números.</Alert>
            )}

            {t && (
                <Section title="Resumen" text={t.resumen}>
                    {t.que_mirar.length > 0 && (
                        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "action.hover" }}>
                            <Typography variant="subtitle2">Qué mirar primero</Typography>
                            {t.que_mirar.map((x, i) => <Typography key={i} variant="body2">{i + 1}. {x}</Typography>)}
                        </Box>
                    )}
                </Section>
            )}

            <Section title="Ventas" text={t?.ventas}>
                <Box sx={grid}>{(f.cards.sales ?? []).map((c) => <MetricCard key={c.key} card={c} compareLabel={compare} />)}</Box>
            </Section>

            <Section title="Dinero" text={t?.dinero}>
                <Box sx={grid}>{(f.cards.money ?? []).map((c) => <MetricCard key={c.key} card={c} compareLabel={compare} />)}</Box>
                {f.waterfall.length > 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                        A dónde se fue el dinero: {f.waterfall.map((w) => `${w.label} ${money(w.amount)}`).join(" · ")}
                    </Typography>
                )}
                {(f.products.best.length > 0 || f.products.losing.length > 0) && (
                    <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mt: 1.5 }}>
                        {f.products.best.length > 0 && (
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="subtitle2">Los que más dejaron (después de su publicidad)</Typography>
                                {f.products.best.map((p, i) => <Typography key={i} variant="body2">{p.name}: <b>{money(p.profit)}</b> · vendido {money(p.revenue)} · {p.delivered} entregados</Typography>)}
                            </Box>
                        )}
                        {f.products.losing.length > 0 && (
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="subtitle2" color="error.main">Los que perdieron</Typography>
                                {f.products.losing.map((p, i) => <Typography key={i} variant="body2">{p.name}: <b>{money(p.profit)}</b> · vendido {money(p.revenue)} · publicidad {money(p.ads)}</Typography>)}
                            </Box>
                        )}
                    </Stack>
                )}
            </Section>

            <Section title="Dónde se pierden pedidos" text={t?.perdidas}>
                <Box sx={grid}>{(f.cards.losses ?? []).map((c) => <MetricCard key={c.key} card={c} compareLabel={compare} />)}</Box>
                {f.reasons.length > 0 && (
                    <Typography variant="body2" sx={{ mt: 1.5 }}>
                        Motivos de cancelación más comunes: {f.reasons.map((x) => `${x.label} (${x.count}, ${formatValue(x.pct, "percent")})`).join(" · ")}
                    </Typography>
                )}
            </Section>

            {(f.team.sellers || f.team.agencies) && (
                <Section title="Equipo" text={t?.equipo || undefined}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                        <TeamList block={f.team.sellers} />
                        <TeamList block={f.team.agencies} />
                    </Stack>
                </Section>
            )}

            {f.goals.length > 0 && (
                <Section title="Metas">
                    {f.goals.map((g, i) => <Typography key={i} variant="body2"><b>{g.label}:</b> {g.text}</Typography>)}
                </Section>
            )}

            {f.alerts.length > 0 && (
                <Section title="Alertas (tus límites)">
                    <Stack spacing={1}>
                        {f.alerts.map((a, i) => (
                            <Box key={i}>
                                <Chip size="small" color={ALERT_COLOR[a.level]} label={a.title} sx={{ mb: 0.5 }} />
                                {a.items.map((x, j) => <Typography key={j} variant="body2">{x}</Typography>)}
                            </Box>
                        ))}
                    </Stack>
                </Section>
            )}
        </Stack>
    );
};

export const BusinessReportsPage: React.FC = () => {
    const { loadingSession, isValid } = useValidateSession();
    const [type, setType] = useState<ReportType>("daily");
    const [id, setId] = useState<number | "">("");
    const [data, setData] = useState<Data | null>(null);
    const [running, setRunning] = useState(false);

    const load = useCallback(() => {
        const q = new URLSearchParams({ type });
        if (id !== "") q.set("id", String(id));
        api<Data>(`/business-reports?${q}`).then(setData).catch((e) => toast.error(e.message));
    }, [type, id]);
    useEffect(() => { if (isValid) load(); }, [isValid, load]);

    const run = async () => {
        setRunning(true);
        try {
            const r = await api<{ report: Report; runs_left: number }>("/business-reports/run", "POST", { type });
            setId("");
            setData((d) => d ? { ...d, report: r.report, runs_left: r.runs_left } : d);
            load();
            toast.success("Reporte actualizado");
        } catch (e) { toast.error((e as Error).message); } finally { setRunning(false); }
    };

    if (loadingSession || !isValid || !data) return <Loading />;
    const r = data.type === type ? data.report : null;
    const info = TYPES.find((x) => x.key === type)!;

    return (
        <Layout>
            <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: 1100, mx: "auto" }}>
                <DescripcionDeVista title="Reportes del negocio"
                    description="Cómo va tu negocio, explicado en simple. Los números son los de tu Panel, revisados por un segundo cálculo; la IA solo los explica y no puede inventar ninguno." />
                <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", mb: 2 }}>
                    <Tabs value={type} onChange={(_, v) => { setType(v); setId(""); }} variant="scrollable" allowScrollButtonsMobile>
                        {TYPES.map((x) => <Tab key={x.key} value={x.key} label={`${x.label}${data.counts[x.key] ? ` (${data.counts[x.key]})` : ""}`} />)}
                    </Tabs>
                </Paper>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} justifyContent="space-between" sx={{ mb: 2 }}>
                    <TextField select size="small" label="Reporte" value={r?.id ?? ""} onChange={(e) => setId(Number(e.target.value))} sx={{ minWidth: { sm: 320 } }} disabled={data.history.length === 0}>
                        {data.history.map((h) => (
                            <MenuItem key={h.id} value={h.id}>{h.from === h.to ? h.from : `${h.from} al ${h.to}`} · v{h.version}{h.auto ? " (automático)" : ""}</MenuItem>
                        ))}
                    </TextField>
                    <Button size="small" variant="outlined" startIcon={running ? <CircularProgress size={14} /> : <RefreshRounded />} disabled={running || data.runs_left <= 0} onClick={run}>
                        {running ? "Generando…" : `Volver a generar (${data.runs_left})`}
                    </Button>
                </Stack>
                {!r ? (
                    <Alert severity="info">Todavía no hay reporte {info.label.toLowerCase()}. {info.when} También puedes tocar "Volver a generar".</Alert>
                ) : (
                    <ReportView r={r} />
                )}
                <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 2 }}>{info.when}</Typography>
            </Box>
        </Layout>
    );
};
