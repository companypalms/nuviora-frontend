// src/pages/my-group/GroupCharts.tsx
// Gráficos de "Mi grupo" (spec §17), siempre con los pedidos del grupo. Los datos son los mismos de las
// tablas (MyGroupController): aquí solo se dibujan.
import React from "react";
import { Box, Paper, Typography, useTheme } from "@mui/material";
import {
    Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Line, LineChart, ReferenceLine, ResponsiveContainer,
    Tooltip as ChartTooltip, XAxis, YAxis,
} from "recharts";
import { fmtPct } from "../sales-groups/weights";
import { GroupAgency, GroupMetrics, MyGroupData } from "../../interfaces/assignment.types";

const firstName = (name: string) => name.split(" ")[0];
const dayLabel = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const pctLabel = (v: unknown) => (typeof v === "number" ? fmtPct(v) : "—");

/** Colores del tema, para que los gráficos se lean bien en claro y en oscuro. */
function useChartColors() {
    const t = useTheme();
    return {
        success: t.palette.success.main,
        warning: t.palette.warning.main,
        error: t.palette.error.main,
        info: t.palette.info.main,
        muted: t.palette.text.secondary,
        grid: t.palette.divider,
        tooltip: {
            contentStyle: { borderRadius: 8, border: "none", background: t.palette.background.paper, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", fontSize: 12 },
            labelStyle: { color: t.palette.text.primary, fontWeight: 700 },
        },
        tick: { fill: t.palette.text.secondary, fontSize: 11 },
    };
}

/** Semáforo de la spec §8.5 en colores de gráfico: rojo < 45 %, amarillo hasta 50 %, verde desde 50 %. */
const effColor = (v: number | null, c: ReturnType<typeof useChartColors>) =>
    v === null ? c.muted : v < 45 ? c.error : v < 50 ? c.warning : c.success;

const ChartBox: React.FC<{ title: string; hint?: string; height?: number; children: React.ReactElement }> = ({ title, hint, height = 220, children }) => (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={700}>{title}</Typography>
        {hint && <Typography variant="caption" color="text.secondary" display="block">{hint}</Typography>}
        <Box sx={{ width: "100%", height, mt: 1 }}>
            <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
        </Box>
    </Paper>
);

const Empty: React.FC<{ text: string }> = ({ text }) => (
    <Typography variant="caption" color="text.secondary" display="block" sx={{ py: 3, textAlign: "center" }}>{text}</Typography>
);

/* ─────────────────────────── Del período (Rendimiento) ─────────────────────────── */

export const PeriodCharts: React.FC<{ metrics: GroupMetrics; data: MyGroupData }> = ({ metrics, data }) => {
    const c = useChartColors();
    const series = metrics.series;
    if (!series) return null;

    const weekly = series.granularity === "week";
    const points = series.points.map((p) => ({ ...p, label: weekly ? `Sem. ${dayLabel(p.date)}` : dayLabel(p.date) }));
    const hasOrders = points.some((p) => p.assigned > 0);
    const comparedEff = metrics.compare?.totals.effectiveness ?? null;

    const sellers = data.members.map((m) => {
        const r = metrics.rows.find((x) => x.user_id === m.id);
        return {
            name: `${m.is_leader ? "★ " : ""}${firstName(m.name)}`,
            effectiveness: r?.effectiveness ?? null,
            assigned: r?.assigned ?? 0,
            delivered: r?.delivered ?? 0,
            upsells: r?.delivered_with_upsell ?? 0,
            upsell_pct: r?.upsell_pct ?? null,
        };
    });
    const barsHeight = Math.max(160, sellers.length * 34 + 30);
    const funnel = series.funnel;
    const funnelTotal = funnel.reduce((a, f) => a + f.count, 0);

    return (
        <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr" }} gap={1.5} mt={2}>
            <ChartBox
                title="Efectividad del grupo"
                hint={`${weekly ? "Por semana" : "Por día"}, de las órdenes que entraron ese ${weekly ? "período" : "día"}. Los últimos días suben a medida que se entregan.`}
            >
                {hasOrders ? (
                    <LineChart data={points} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={c.grid} />
                        <XAxis dataKey="label" tick={c.tick} interval="preserveStartEnd" minTickGap={12} />
                        <YAxis domain={[0, 100]} tick={c.tick} tickFormatter={(v) => `${v}%`} width={46} />
                        <ChartTooltip {...c.tooltip} formatter={(v) => [pctLabel(v), "Efectividad"]} />
                        <ReferenceLine y={45} stroke={c.error} strokeDasharray="4 4" />
                        <ReferenceLine y={50} stroke={c.success} strokeDasharray="4 4" label={{ value: "50 %", position: "insideTopLeft", fill: c.success, fontSize: 10 }} />
                        {comparedEff !== null && (
                            <ReferenceLine y={comparedEff} stroke={c.muted} strokeDasharray="2 6"
                                label={{ value: `Comparado: ${fmtPct(comparedEff)}`, position: "insideBottomLeft", fill: c.muted, fontSize: 10 }} />
                        )}
                        <Line type="monotone" dataKey="effectiveness" stroke={c.info} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                    </LineChart>
                ) : <Empty text="No entraron órdenes del grupo en estas fechas." />}
            </ChartBox>

            <ChartBox title={weekly ? "Entregas por semana" : "Entregas por día"} hint="Pedidos de tus vendedoras que pasaron a Entregado en esa fecha.">
                {points.some((p) => p.deliveries > 0) ? (
                    <BarChart data={points} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={c.grid} />
                        <XAxis dataKey="label" tick={c.tick} interval="preserveStartEnd" minTickGap={12} />
                        <YAxis allowDecimals={false} tick={c.tick} width={40} />
                        <ChartTooltip {...c.tooltip} formatter={(v) => [v as number, "Entregas"]} />
                        <Bar dataKey="deliveries" fill={c.success} radius={[6, 6, 0, 0]}>
                            {points.length <= 16 && <LabelList dataKey="deliveries" position="top" fill={c.muted} fontSize={10} />}
                        </Bar>
                    </BarChart>
                ) : <Empty text="Ninguna entrega en estas fechas." />}
            </ChartBox>

            <ChartBox title="Efectividad por vendedora" hint="Entregadas ÷ asignadas, con el semáforo: rojo bajo 45 %, amarillo hasta 50 %, verde desde 50 %." height={barsHeight}>
                <BarChart data={sellers} layout="vertical" margin={{ top: 0, right: 48, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={c.grid} />
                    <XAxis type="number" domain={[0, 100]} tick={c.tick} tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="name" tick={c.tick} width={80} />
                    <ChartTooltip {...c.tooltip} formatter={(v, _n, item) => [`${pctLabel(v)} (${item?.payload?.delivered ?? 0} de ${item?.payload?.assigned ?? 0})`, "Efectividad"]} />
                    <ReferenceLine x={50} stroke={c.success} strokeDasharray="4 4" />
                    <Bar dataKey="effectiveness" radius={[0, 6, 6, 0]}>
                        {sellers.map((s, i) => <Cell key={i} fill={effColor(s.effectiveness, c)} />)}
                        <LabelList dataKey="effectiveness" position="right" formatter={pctLabel} fill={c.muted} fontSize={10} />
                    </Bar>
                </BarChart>
            </ChartBox>

            <ChartBox title="Upsells por vendedora" hint="Entregadas con upsell (barras) y la tasa: entregadas con upsell ÷ entregadas (línea)." height={barsHeight}>
                <ComposedChart data={sellers} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={c.grid} />
                    <XAxis dataKey="name" tick={c.tick} interval={0} />
                    <YAxis yAxisId="n" allowDecimals={false} tick={c.tick} width={40} />
                    <YAxis yAxisId="p" orientation="right" domain={[0, 100]} tick={c.tick} tickFormatter={(v) => `${v}%`} width={46} />
                    <ChartTooltip {...c.tooltip} formatter={(v, name) => (name === "upsell_pct" ? [pctLabel(v), "Tasa de upsell"] : [v as number, "Con upsell"])} />
                    <Bar yAxisId="n" dataKey="upsells" fill={c.info} radius={[6, 6, 0, 0]} />
                    <Line yAxisId="p" type="monotone" dataKey="upsell_pct" stroke={c.warning} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                </ComposedChart>
            </ChartBox>

            <Box sx={{ gridColumn: { md: "1 / -1" } }}>
                <ChartBox
                    title="Dónde están las órdenes del período"
                    hint={`Las ${funnelTotal} órdenes que entraron en estas fechas, por la etapa en la que están hoy.`}
                    height={Math.max(180, funnel.length * 26 + 20)}
                >
                    {funnelTotal > 0 ? (
                        <BarChart data={funnel} layout="vertical" margin={{ top: 0, right: 40, left: 8, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={c.grid} />
                            <XAxis type="number" allowDecimals={false} tick={c.tick} />
                            <YAxis type="category" dataKey="stage" tick={c.tick} width={150} />
                            <ChartTooltip {...c.tooltip} formatter={(v) => [`${v} (${fmtPct(Number(v) / funnelTotal * 100)})`, "Órdenes"]} />
                            <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                                {funnel.map((f, i) => (
                                    <Cell key={i} fill={f.stage === "Entregadas" ? c.success : f.stage.startsWith("Canceladas") ? c.error : f.stage.startsWith("Novedades") ? c.warning : c.info} />
                                ))}
                                <LabelList dataKey="count" position="right" fill={c.muted} fontSize={10} />
                            </Bar>
                        </BarChart>
                    ) : <Empty text="No entraron órdenes del grupo en estas fechas." />}
                </ChartBox>
            </Box>
        </Box>
    );
};

/* ─────────────────────────── Ahora mismo: carga activa ─────────────────────────── */

export const LoadChart: React.FC<{ data: MyGroupData }> = ({ data }) => {
    const c = useChartColors();
    const rows = data.members.map((m) => ({ name: `${m.is_leader ? "★ " : ""}${firstName(m.name)}`, load: m.load, saturated: m.saturated }));
    const avg = data.saturation.average;
    const limit = avg !== null ? Math.max(avg * data.saturation.threshold, data.saturation.min_load) : null;

    return (
        <ChartBox
            title="Carga activa por vendedora"
            hint={`Asignado a vendedor + Reprogramado para hoy.${avg !== null ? ` Promedio ${fmtPct(avg).replace(" %", "")}; se avisa desde ${Math.round(((data.saturation.threshold ?? 1) - 1) * 100)} % por encima.` : ""}`}
            height={Math.max(166, rows.length * 32 + 46)}
        >
            <BarChart data={rows} layout="vertical" margin={{ top: 16, right: 32, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={c.grid} />
                <XAxis type="number" allowDecimals={false} tick={c.tick} />
                <YAxis type="category" dataKey="name" tick={c.tick} width={80} />
                <ChartTooltip {...c.tooltip} formatter={(v, _n, item) => [`${v}${item?.payload?.saturated ? " · saturada" : ""}`, "Carga"]} />
                {avg !== null && <ReferenceLine x={avg} stroke={c.muted} strokeDasharray="4 4" label={{ value: "Promedio", position: "insideTopRight", fill: c.muted, fontSize: 10 }} />}
                {limit !== null && <ReferenceLine x={limit} stroke={c.warning} strokeDasharray="2 4" label={{ value: "Aviso", position: "insideTopLeft", fill: c.warning, fontSize: 10 }} />}
                <Bar dataKey="load" radius={[0, 6, 6, 0]}>
                    {rows.map((r, i) => <Cell key={i} fill={r.saturated ? c.warning : c.info} />)}
                    <LabelList dataKey="load" position="right" fill={c.muted} fontSize={10} />
                </Bar>
            </BarChart>
        </ChartBox>
    );
};

/* ─────────────────────────── Agencia elegida ─────────────────────────── */

export const AgencyChart: React.FC<{ agency: GroupAgency }> = ({ agency }) => {
    const c = useChartColors();
    const rows = agency.by_status;
    if (rows.length === 0) return null;

    return (
        <Box mt={1.5}>
            <ChartBox title={`Pedidos del grupo en ${agency.name}, por estado`} hint="Dónde están hoy los que recibió en el período." height={Math.max(140, rows.length * 28 + 20)}>
                <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 40, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={c.grid} />
                    <XAxis type="number" allowDecimals={false} tick={c.tick} />
                    <YAxis type="category" dataKey="status" tick={c.tick} width={150} />
                    <ChartTooltip {...c.tooltip} formatter={(v) => [v as number, "Pedidos"]} />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                        {rows.map((r, i) => (
                            <Cell key={i} fill={r.status === "Entregado" ? c.success : ["Cancelado", "Rechazado"].includes(r.status) ? c.error : r.status.startsWith("Novedad") ? c.warning : c.info} />
                        ))}
                        <LabelList dataKey="count" position="right" fill={c.muted} fontSize={10} />
                    </Bar>
                </BarChart>
            </ChartBox>
        </Box>
    );
};
