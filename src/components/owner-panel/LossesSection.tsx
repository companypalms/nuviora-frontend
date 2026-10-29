// src/components/owner-panel/LossesSection.tsx
// Panel del dueño › Pérdidas (diccionario de métricas, §4 y §8): las tarjetas, el análisis con IA de los motivos, la dona
// de motivos de cancelación, en qué momento y quién cancela, los rechazos por su última novedad y los últimos motivos
// escritos. Los números y sus explicaciones vienen del backend (Metrics\Rules\LossRules).
import React, { FC } from "react";
import { Box, Chip, Stack, Typography, useTheme } from "@mui/material";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as ChartTooltip } from "recharts";
import { Panel } from "../ui/surface/Panel";
import { MetricCard } from "./MetricCard";
import { AiInsights } from "./AiInsights";
import { BoxTitle, ChartTip, Empty, SectionTitle } from "./parts";
import { CountRow, Filters, LossesResponse, count, pct } from "./ownerPanel";

const share = (n: number, total: number) => (total > 0 ? pct(Math.round((n / total) * 1000) / 10) : "—");

/** Colores de la dona: uno por motivo, en el mismo orden siempre. */
function usePalette() {
    const t = useTheme();
    return [t.palette.error.main, t.palette.warning.main, t.palette.info.main, t.palette.secondary.main, t.palette.success.main,
        "#8e24aa", "#00897b", "#6d4c41", t.palette.grey[500], t.palette.grey[400], t.palette.grey[300]];
}

/** Barras horizontales simples: nombre, cantidad y % del total. */
const CountBars: FC<{ rows: CountRow[]; color?: string; empty: string }> = ({ rows, color, empty }) => {
    const total = rows.reduce((a, r) => a + r.count, 0);
    const max = Math.max(...rows.map((r) => r.count), 1);
    if (total === 0) return <Empty text={empty} />;
    return (
        <Stack spacing={1.25}>
            {rows.map((r) => (
                <Box key={r.label}>
                    <Stack direction="row" justifyContent="space-between" gap={1}>
                        <Typography variant="body2" fontWeight={600}>{r.label}</Typography>
                        <Typography variant="body2"><b>{count(r.count)}</b> <Typography component="span" variant="caption" color="text.secondary">({share(r.count, total)})</Typography></Typography>
                    </Stack>
                    <Box sx={{ height: 8, borderRadius: 4, bgcolor: "action.hover", overflow: "hidden", mt: 0.5 }}>
                        <Box sx={{ height: "100%", width: `${(r.count / max) * 100}%`, bgcolor: color ?? "error.main", borderRadius: 4 }} />
                    </Box>
                </Box>
            ))}
        </Stack>
    );
};

const ReasonTip: FC<{ active?: boolean; payload?: { payload: CountRow & { total: number } }[] }> = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const r = payload[0].payload;
    return (
        <ChartTip>
            <Typography variant="subtitle2" fontWeight={800}>{r.label}</Typography>
            <Typography variant="body2">{count(r.count)} cancelado{r.count === 1 ? "" : "s"} ({share(r.count, r.total)})</Typography>
        </ChartTip>
    );
};

const ReasonsDonut: FC<{ data: LossesResponse }> = ({ data }) => {
    const palette = usePalette();
    const rows = data.reasons.rows;
    const total = rows.reduce((a, r) => a + r.count, 0);
    const withTotal = rows.map((r) => ({ ...r, total }));

    return (
        <Panel sx={{ minWidth: 0 }}>
            <BoxTitle title="¿Por qué se cancelan?" subtitle="El motivo de la lista que eligió quien canceló." help={data.reasons.help} />
            {total === 0 ? <Empty text="No hay pedidos cancelados en este período." /> : (
                <Stack direction={{ xs: "column", sm: "row" }} alignItems="center" gap={2}>
                    <Box sx={{ width: 190, height: 190, flexShrink: 0, position: "relative" }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={withTotal} dataKey="count" nameKey="label" innerRadius={55} outerRadius={90} paddingAngle={1} stroke="none">
                                    {withTotal.map((r, i) => <Cell key={r.key ?? r.label} fill={palette[i % palette.length]} />)}
                                </Pie>
                                <ChartTooltip content={<ReasonTip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none", textAlign: "center" }}>
                            <Box>
                                <Typography fontWeight={800} fontSize={22}>{count(total)}</Typography>
                                <Typography variant="caption" color="text.secondary">cancelados</Typography>
                            </Box>
                        </Box>
                    </Box>
                    <Stack spacing={0.75} sx={{ minWidth: 0, flex: 1 }}>
                        {rows.map((r, i) => (
                            <Stack key={r.key ?? r.label} direction="row" alignItems="center" gap={1}>
                                <Box sx={{ width: 10, height: 10, borderRadius: "2px", bgcolor: palette[i % palette.length], flexShrink: 0 }} />
                                <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>{r.label}</Typography>
                                <Typography variant="body2" fontWeight={700}>{count(r.count)}</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ width: 48, textAlign: "right" }}>{share(r.count, total)}</Typography>
                            </Stack>
                        ))}
                    </Stack>
                </Stack>
            )}
        </Panel>
    );
};

const Latest: FC<{ data: LossesResponse }> = ({ data }) => (
    <Panel>
        <BoxTitle title="Últimos motivos escritos" subtitle="Lo que escribió quien canceló, tal cual, del más nuevo al más viejo." help={data.latest.help} />
        {data.latest.rows.length === 0 ? <Empty text="No hay motivos escritos en este período." /> : (
            <Stack divider={<Box sx={{ borderTop: "1px solid", borderColor: "divider" }} />}>
                {data.latest.rows.map((r, i) => (
                    <Box key={i} sx={{ py: 1 }}>
                        <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                                {r.cancelled_at ? `${r.cancelled_at.slice(8, 10)}/${r.cancelled_at.slice(5, 7)} ${r.cancelled_at.slice(11, 16)}` : ""} · #{r.order_number} · {r.who}
                            </Typography>
                            <Chip size="small" label={r.category} />
                            <Chip size="small" variant="outlined" label={r.stage} />
                        </Stack>
                        <Typography variant="body2">{r.reason}</Typography>
                    </Box>
                ))}
            </Stack>
        )}
    </Panel>
);

export const LossesSection: FC<{ data: LossesResponse; loading: boolean; filters: Filters; ready: boolean }> = ({ data, loading, filters, ready }) => {
    const t = useTheme();

    return (
        <Stack spacing={2} sx={{ opacity: loading ? 0.55 : 1, transition: "opacity .2s" }}>
            <SectionTitle title="Pérdidas" />

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))", lg: "repeat(5, minmax(0, 1fr))" }, gap: { xs: 1, sm: 1.5 } }}>
                {data.cards.map((c) => <MetricCard key={c.key} card={c} compareLabel={data.previous.label} />)}
            </Box>

            <AiInsights filters={filters} ready={ready} />

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
                <ReasonsDonut data={data} />
                <Panel sx={{ minWidth: 0 }}>
                    <BoxTitle title="¿En qué momento se cancelan?" subtitle="El estado que tenía el pedido justo antes de cancelarse." help={data.stages.help} />
                    <CountBars rows={data.stages.rows} color={t.palette.warning.main} empty="No hay pedidos cancelados en este período." />
                </Panel>
                <Panel sx={{ minWidth: 0 }}>
                    <BoxTitle title="¿Quién cancela?" subtitle="Vendedora, administración o el cierre automático de la jornada." help={data.who.help} />
                    <CountBars rows={data.who.rows} color={t.palette.info.main} empty="No hay pedidos cancelados en este período." />
                </Panel>
                <Panel sx={{ minWidth: 0 }}>
                    <BoxTitle title="Rechazos en puerta" subtitle="Según la última novedad que tuvo el pedido antes de rechazarse." help={data.novelties.help} />
                    <CountBars rows={data.novelties.rows} empty="No hubo rechazos en puerta en este período." />
                </Panel>
            </Box>

            <Latest data={data} />
        </Stack>
    );
};
