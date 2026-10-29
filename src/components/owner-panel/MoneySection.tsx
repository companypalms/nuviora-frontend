// src/components/owner-panel/MoneySection.tsx
// Panel del dueño › Dinero (diccionario de métricas, §2): las tarjetas (ganancia ya ganada y en camino, costo por pedido
// y por venta, por cobrar), la ganancia de cada día, la cascada "¿a dónde se fue el dinero?", la ganancia por producto y
// el efectivo que tiene cada agencia. Los números y sus explicaciones vienen del backend (Metrics\Rules\MoneyRules).
import React, { FC } from "react";
import { Alert, Box, Stack, Typography, alpha, useTheme } from "@mui/material";
import {
    Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis,
} from "recharts";
import { Panel } from "../ui/surface/Panel";
import { MetricCard } from "./MetricCard";
import { BoxTitle, ChartTip, Empty, SectionTitle } from "./parts";
import { MoneyPoint, MoneyResponse, ProductProfit, WaterfallStep, count, money, pct, pointLabel, pointTitle } from "./ownerPanel";

/** Dólares cortos para los ejes y las etiquetas: "$1,2 mil". */
const shortMoney = (v: number) => {
    const abs = Math.abs(v);
    const sign = v < 0 ? "−" : "";
    if (abs >= 1000) return `${sign}$${new Intl.NumberFormat("es-VE", { maximumFractionDigits: 1 }).format(abs / 1000)} mil`;
    return `${sign}$${new Intl.NumberFormat("es-VE", { maximumFractionDigits: 0 }).format(abs)}`;
};

function useMoneyColors() {
    const t = useTheme();
    return {
        gain: t.palette.success.main,
        loss: t.palette.error.main,
        pending: alpha(t.palette.success.main, 0.35),
        start: t.palette.info.main,
        cost: alpha(t.palette.error.main, 0.75),
        grid: t.palette.divider,
        tick: { fill: t.palette.text.secondary, fontSize: 11 },
        hover: t.palette.action.hover,
    };
}

/* ─────────────── Ganancia de cada día ─────────────── */

const DayTip: FC<{ active?: boolean; payload?: { payload: MoneyPoint & { title: string } }[] }> = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    const line = (label: string, v: number) => <Typography variant="body2">{label}: <b>{money(v)}</b></Typography>;

    return (
        <ChartTip>
            <Typography variant="subtitle2" fontWeight={800} sx={{ textTransform: "capitalize" }}>{p.title}</Typography>
            <Typography variant="body2" sx={{ color: p.profit < 0 ? "error.main" : "success.main", fontWeight: 700, mb: 0.5 }}>
                Ya ganado: {money(p.profit)}
            </Typography>
            {line("Vendido", p.revenue)}
            {line("Costos de los pedidos", p.product + p.commissions + p.shipping)}
            {line("Publicidad", p.ads)}
            {line("Gastos", p.expenses)}
            {p.open > 0 && (
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                    En camino: <b>{money(p.pending)}</b> ({count(p.open)} pendiente{p.open === 1 ? "" : "s"})
                </Typography>
            )}
        </ChartTip>
    );
};

const ProfitChart: FC<{ data: MoneyResponse }> = ({ data }) => {
    const c = useMoneyColors();
    const { granularity, points, help } = data.series;
    const rows = points.map((p) => ({ ...p, title: pointTitle(p.date, granularity), label: pointLabel(p.date, granularity) }));
    const title = granularity === "week" ? "Ganancia de cada semana" : granularity === "month" ? "Ganancia de cada mes" : "Ganancia de cada día";

    return (
        <Panel>
            <BoxTitle title={title} subtitle="Verde: ya ganado. Rojo: ese día vas perdiendo. Claro: lo que todavía pueden sumar sus pedidos pendientes." help={help} />
            <Box sx={{ width: "100%", height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rows} stackOffset="sign" margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={c.grid} />
                        <XAxis dataKey="label" tick={c.tick} interval="preserveStartEnd" minTickGap={10} />
                        <YAxis tick={c.tick} width={56} tickFormatter={shortMoney} />
                        <ReferenceLine y={0} stroke={c.tick.fill} />
                        <ChartTooltip content={<DayTip />} cursor={{ fill: c.hover }} />
                        <Bar dataKey="profit" stackId="m">
                            {rows.map((r) => <Cell key={r.date} fill={r.profit < 0 ? c.loss : c.gain} />)}
                        </Bar>
                        <Bar dataKey="pending" stackId="m" fill={c.pending} radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </Box>
        </Panel>
    );
};

/* ─────────────── ¿A dónde se fue el dinero? ─────────────── */

type StepRow = WaterfallStep & { range: [number, number]; share: number | null };

const StepTip: FC<{ active?: boolean; payload?: { payload: StepRow }[] }> = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const s = payload[0].payload;
    return (
        <ChartTip>
            <Typography variant="subtitle2" fontWeight={800}>{s.label}: {money(s.kind === "cost" ? -s.amount : s.amount)}</Typography>
            {s.share !== null && s.kind !== "start" && (
                <Typography variant="body2" color="text.secondary">{pct(s.share)} de lo vendido</Typography>
            )}
            <Typography variant="body2" sx={{ mt: 0.5 }}>{s.help}</Typography>
        </ChartTip>
    );
};

const Waterfall: FC<{ steps: WaterfallStep[] }> = ({ steps }) => {
    const c = useMoneyColors();
    const revenue = steps.find((s) => s.kind === "start")?.amount ?? 0;
    let running = 0;
    const rows: StepRow[] = steps.map((s) => {
        let range: [number, number];
        if (s.kind === "start") {
            running = s.amount;
            range = [0, s.amount];
        } else if (s.kind === "cost") {
            range = [running - s.amount, running];
            running -= s.amount;
        } else {
            range = [Math.min(0, s.amount), Math.max(0, s.amount)];
        }
        return { ...s, range, share: revenue > 0 ? Math.round((s.amount / revenue) * 1000) / 10 : null };
    });
    const fill = (s: StepRow) => (s.kind === "start" ? c.start : s.kind === "cost" ? c.cost : s.amount < 0 ? c.loss : c.gain);

    return (
        <Panel sx={{ minWidth: 0 }}>
            <BoxTitle title="¿A dónde se fue el dinero?" subtitle="De lo vendido, lo que se llevó cada costo hasta llegar a la ganancia. Pasa el cursor por cada barra." />
            {revenue === 0 && rows.every((r) => r.amount === 0) ? <Empty text="Sin ventas ni costos en este período." /> : (
                // Acostada: los nombres de cada paso se leen completos también en el celular
                <Box sx={{ width: "100%", height: rows.length * 36 + 30 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 56, left: 4, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={c.grid} />
                            <XAxis type="number" tick={c.tick} tickFormatter={shortMoney} />
                            <YAxis type="category" dataKey="label" tick={c.tick} width={84} />
                            <ReferenceLine x={0} stroke={c.tick.fill} />
                            <ChartTooltip content={<StepTip />} cursor={{ fill: c.hover }} />
                            <Bar dataKey="range" radius={[3, 3, 3, 3]}>
                                {rows.map((r) => <Cell key={r.key} fill={fill(r)} />)}
                                <LabelList dataKey="amount" position="right" fontSize={10} fill={c.tick.fill}
                                    formatter={(v: unknown) => (typeof v === "number" ? shortMoney(v) : "")} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </Box>
            )}
        </Panel>
    );
};

/* ─────────────── Ganancia por producto ─────────────── */

const ProductTip: FC<{ active?: boolean; payload?: { payload: ProductProfit }[] }> = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    return (
        <ChartTip>
            <Typography variant="subtitle2" fontWeight={800}>{p.name}</Typography>
            <Typography variant="body2" sx={{ color: p.profit < 0 ? "error.main" : "success.main", fontWeight: 700, mb: 0.5 }}>Ganancia: {money(p.profit)}</Typography>
            <Typography variant="body2">Vendido: <b>{money(p.revenue)}</b> ({count(p.delivered)} entregado{p.delivered === 1 ? "" : "s"})</Typography>
            <Typography variant="body2">Costos de sus pedidos: <b>{money(p.costs)}</b></Typography>
            <Typography variant="body2">Su publicidad: <b>{money(p.ads)}</b></Typography>
        </ChartTip>
    );
};

const Products: FC<{ data: MoneyResponse }> = ({ data }) => {
    const c = useMoneyColors();
    const rows = data.products.rows;

    return (
        <Panel sx={{ minWidth: 0 }}>
            <BoxTitle title="Ganancia por producto" subtitle="Antes de los gastos del negocio. En rojo, los que te hacen perder." help={data.products.help} />
            {rows.length === 0 ? <Empty text="Sin ventas ni publicidad de productos en este período." /> : (
                <Box sx={{ width: "100%", height: Math.max(160, rows.length * 34 + 30) }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 56, left: 8, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={c.grid} />
                            <XAxis type="number" tick={c.tick} tickFormatter={shortMoney} />
                            <YAxis type="category" dataKey="name" tick={c.tick} width={120} />
                            <ReferenceLine x={0} stroke={c.tick.fill} />
                            <ChartTooltip content={<ProductTip />} cursor={{ fill: c.hover }} />
                            <Bar dataKey="profit" radius={[0, 4, 4, 0]}>
                                {rows.map((r, i) => <Cell key={i} fill={r.profit < 0 ? c.loss : c.gain} />)}
                                <LabelList dataKey="profit" position="right" fontSize={10} fill={c.tick.fill}
                                    formatter={(v: unknown) => (typeof v === "number" ? shortMoney(v) : "")} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </Box>
            )}
        </Panel>
    );
};

/* ─────────────── Por cobrar ─────────────── */

const Receivables: FC<{ data: MoneyResponse }> = ({ data }) => {
    const c = useMoneyColors();
    const { rows, total, help } = data.receivables;
    const max = Math.max(...rows.map((r) => Math.abs(r.usd)), 1);

    return (
        <Panel sx={{ minWidth: 0 }}>
            <BoxTitle title={`Por cobrar: ${money(total)}`} subtitle="El efectivo que cada agencia te tiene ahora mismo. No depende del período ni de los filtros." help={help} />
            {rows.length === 0 ? <Empty text="Nadie te debe efectivo ahora mismo." /> : (
                <Stack spacing={1.25}>
                    {rows.map((r) => (
                        <Box key={r.agency_id ?? "propios"}>
                            <Stack direction="row" justifyContent="space-between" gap={1}>
                                <Typography variant="body2" fontWeight={600} noWrap>{r.name}</Typography>
                                <Typography variant="body2" fontWeight={700}>{money(r.usd)}</Typography>
                            </Stack>
                            <Box sx={{ height: 8, borderRadius: 4, bgcolor: "action.hover", overflow: "hidden", mt: 0.5 }}>
                                <Box sx={{ height: "100%", width: `${(Math.abs(r.usd) / max) * 100}%`, bgcolor: r.usd < 0 ? c.loss : c.start, borderRadius: 4 }} />
                            </Box>
                        </Box>
                    ))}
                </Stack>
            )}
        </Panel>
    );
};

/* ─────────────── La sección ─────────────── */

export const MoneySection: FC<{ data: MoneyResponse; loading: boolean }> = ({ data, loading }) => (
    <Stack spacing={2} sx={{ opacity: loading ? 0.55 : 1, transition: "opacity .2s" }}>
        <SectionTitle title="Dinero" />

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))", lg: "repeat(5, minmax(0, 1fr))" }, gap: { xs: 1, sm: 1.5 } }}>
            {data.cards.map((c) => <MetricCard key={c.key} card={c} compareLabel={data.previous.label} />)}
        </Box>

        {data.warnings.length > 0 && (
            <Alert severity="warning" variant="outlined" sx={{ py: 0.25 }}>
                <Typography variant="body2" fontWeight={700}>Ojo con estos números:</Typography>
                <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                    {data.warnings.map((w) => <li key={w}><Typography variant="body2">{w}</Typography></li>)}
                </Box>
            </Alert>
        )}

        {data.series.points.length > 1 && <ProfitChart data={data} />}

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
            <Waterfall steps={data.waterfall} />
            <Products data={data} />
            <Receivables data={data} />
        </Box>
    </Stack>
);
