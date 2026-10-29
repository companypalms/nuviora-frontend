// src/components/owner-panel/SalesSection.tsx
// Panel del dueño › Ventas y pedidos (diccionario de métricas, §1, §3 y §8): las tarjetas, qué pasó con los pedidos
// creados en el período (barra de colores) y los pedidos de cada día pintados según lo que pasó con ellos.
import React, { FC } from "react";
import { Box, Stack, Typography, useTheme } from "@mui/material";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import { Panel } from "../ui/surface/Panel";
import { Explain } from "./Explain";
import { MetricCard } from "./MetricCard";
import { BoxTitle, ChartTip, Empty, SectionTitle } from "./parts";
import { SalesResponse, SeriesPoint, StatusKey, count, money, pct, pointLabel, pointTitle } from "./ownerPanel";

function useStatusColors(): Record<StatusKey, string> {
    const t = useTheme();
    return { delivered: t.palette.success.main, open: t.palette.warning.main, not_delivered: t.palette.error.main };
}

const share = (n: number, total: number) => (total > 0 ? pct(Math.round((n / total) * 1000) / 10) : "—");

/* ─────────────── ¿Qué pasó con los pedidos creados? ─────────────── */

const StatusBar: FC<{ data: SalesResponse }> = ({ data }) => {
    const colors = useStatusColors();
    const total = data.status.reduce((a, s) => a + s.count, 0);

    return (
        <Panel>
            <BoxTitle
                title={`¿Qué pasó con los ${count(total)} pedidos creados?`}
                subtitle="Cómo están hoy los pedidos que entraron en este período. Pasa el cursor por cada color."
            />
            {total === 0 ? <Empty text="No entraron pedidos en este período con estos filtros." /> : (
                <>
                    <Box sx={{ display: "flex", height: 30, borderRadius: 2, overflow: "hidden", gap: "2px" }}>
                        {data.status.filter((s) => s.count > 0).map((s) => (
                            <Explain key={s.key} title={`${s.label}: ${count(s.count)} (${share(s.count, total)})`} help={s.help}>
                                <Box sx={{ flexGrow: s.count, minWidth: 6, bgcolor: colors[s.key], cursor: "help", transition: "filter .15s", "&:hover": { filter: "brightness(1.12)" } }} />
                            </Explain>
                        ))}
                    </Box>
                    <Stack direction="row" flexWrap="wrap" columnGap={3} rowGap={1} sx={{ mt: 1.5 }}>
                        {data.status.map((s) => (
                            <Explain key={s.key} title={s.label} help={s.help}>
                                <Stack direction="row" alignItems="center" gap={0.75} sx={{ cursor: "help" }}>
                                    <Box sx={{ width: 12, height: 12, borderRadius: "3px", bgcolor: colors[s.key] }} />
                                    <Typography variant="body2" fontWeight={700}>{s.label}</Typography>
                                    <Typography variant="body2">{count(s.count)}</Typography>
                                    <Typography variant="body2" color="text.secondary">({share(s.count, total)})</Typography>
                                </Stack>
                            </Explain>
                        ))}
                    </Stack>
                </>
            )}
        </Panel>
    );
};

/* ─────────────── Pedidos de cada día ─────────────── */

const DayTooltip: FC<{ active?: boolean; payload?: { payload: SeriesPoint & { title: string } }[] }> = ({ active, payload }) => {
    const colors = useStatusColors();
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    const rows: [StatusKey, string, number][] = [["delivered", "Entregados", p.delivered], ["open", "En camino", p.open], ["not_delivered", "No entregados", p.not_delivered]];

    return (
        <ChartTip>
            <Typography variant="subtitle2" fontWeight={800} sx={{ textTransform: "capitalize" }}>{p.title}</Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>{count(p.created)} pedidos creados</Typography>
            {rows.map(([k, label, n]) => (
                <Stack key={k} direction="row" alignItems="center" gap={0.75}>
                    <Box sx={{ width: 10, height: 10, borderRadius: "2px", bgcolor: colors[k] }} />
                    <Typography variant="body2">{label}: <b>{count(n)}</b></Typography>
                </Stack>
            ))}
            <Typography variant="body2" sx={{ mt: 0.5 }}>Efectividad: <b>{pct(p.effectiveness)}</b></Typography>
            <Typography variant="body2">Monto vendido: <b>{money(p.revenue)}</b></Typography>
        </ChartTip>
    );
};

const DailyChart: FC<{ data: SalesResponse }> = ({ data }) => {
    const t = useTheme();
    const colors = useStatusColors();
    const { granularity, points, help } = data.series;
    const rows = points.map((p) => ({ ...p, title: pointTitle(p.date, granularity), label: pointLabel(p.date, granularity) }));
    const title = granularity === "week" ? "Pedidos de cada semana" : granularity === "month" ? "Pedidos de cada mes" : "Pedidos de cada día";
    const tick = { fill: t.palette.text.secondary, fontSize: 11 };

    return (
        <Panel>
            <BoxTitle title={title} subtitle="La barra es el total de pedidos creados; los colores, lo que pasó con ellos." help={help} />
            <Box sx={{ width: "100%", height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={t.palette.divider} />
                        <XAxis dataKey="label" tick={tick} interval="preserveStartEnd" minTickGap={10} />
                        <YAxis allowDecimals={false} tick={tick} width={40} />
                        <ChartTooltip content={<DayTooltip />} cursor={{ fill: t.palette.action.hover }} />
                        <Bar dataKey="delivered" stackId="s" fill={colors.delivered} />
                        <Bar dataKey="open" stackId="s" fill={colors.open} />
                        <Bar dataKey="not_delivered" stackId="s" fill={colors.not_delivered} radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </Box>
        </Panel>
    );
};

/* ─────────────── La sección ─────────────── */

export const SalesSection: FC<{ data: SalesResponse; loading: boolean }> = ({ data, loading }) => {
    const extra = data.excluded.exchange + data.excluded.return;

    return (
        <Stack spacing={2} sx={{ opacity: loading ? 0.55 : 1, transition: "opacity .2s" }}>
            <SectionTitle title="Ventas y pedidos" />

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))", lg: "repeat(5, minmax(0, 1fr))" }, gap: { xs: 1, sm: 1.5 } }}>
                {data.cards.map((c) => <MetricCard key={c.key} card={c} compareLabel={data.previous.label} />)}
            </Box>

            <StatusBar data={data} />

            {data.series.points.length > 1 && <DailyChart data={data} />}

            {extra > 0 && (
                <Explain title="Cambios y devoluciones" help={data.excluded.help}>
                    <Typography variant="body2" color="text.secondary" sx={{ cursor: "help", alignSelf: "flex-start" }}>
                        Aparte: {count(data.excluded.exchange)} cambio{data.excluded.exchange === 1 ? "" : "s"} y {count(data.excluded.return)} devoluci{data.excluded.return === 1 ? "ón" : "ones"} creados en este período (no son ventas nuevas).
                    </Typography>
                </Explain>
            )}
        </Stack>
    );
};
