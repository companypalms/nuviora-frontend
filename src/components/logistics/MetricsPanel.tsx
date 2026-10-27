// src/components/logistics/MetricsPanel.tsx
// Las métricas del §27 ("que deben poder calcularse desde el día 1") de un centro, por rango de días. Para administración.
import React, { useCallback, useEffect, useState } from "react";
import { Box, Button, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { toast } from "react-toastify";
import { api, errorMessage } from "./logistics";

type Stats = { count: number; avg: number | null; median: number | null; p90: number | null };
type Metrics = {
    range: { from: string; to: string }; sla: { target: number; limit: number }; orders: number;
    served: { total: number; own: number; agency: number; own_pct: number | null; agency_pct: number | null; without_channel: number };
    delivery: Record<"propia" | "agencia", { delivered: number; within_target_pct: number | null; within_limit_pct: number | null; minutes: Stats }>;
    assignment_minutes: Stats;
    resolved_in: { key: string; label: string; count: number; pct: number | null }[];
    riders_rounds: { rider_id: number; name: string; r1_sent: number; r1_confirmed: number; r1_rate_pct: number | null; r2_sent: number; r2_confirmed: number; r2_rate_pct: number | null; response_seconds: Stats }[];
    overflow: { reason: string; label: string; count: number }[];
    routes: { simple: number; double: number; triple: number; exceptional: number; interrupted: number; recovery: number };
    eta: { count: number; predicted_avg: number | null; real_avg: number | null; diff_avg: number | null; within_5_pct: number | null };
    novelties: {
        total: number; by_type: { label: string; count: number }[]; by_channel: { propia: number; agencia: number };
        by_rider: { name: string; count: number }[]; by_operator: { name: string; count: number }[];
        resolved_by_operator: number; escalated_to_sales: number; open: number; resolved_by_operator_pct: number | null; escalated_pct: number | null;
    };
    returns: { in_range: number; received: number; pending_now: number; hours_to_return: Stats };
    cash: { in_custody_usd: number; riders_with_cash: { name: string; total_usd: number }[]; collections: number; handovers: number; differences: number; hours_to_handover: Stats };
    riders_pay: { rider_id: number; name: string; deliveries: number; earned_usd: number; failed_legs: number; paid_usd: number }[];
    incidents: { total: number; by_type: { label: string; count: number }[]; kept_going: number; interrupted: number; reassigned: number };
    delivery_rate: Record<"propia" | "agencia", { delivered: number; not_delivered: number; rate_pct: number | null }>;
};

const day = (d: Date) => d.toISOString().slice(0, 10);
const pct = (v: number | null) => (v === null ? "—" : `${v}%`);
const num = (v: number | null, unit = "") => (v === null ? "—" : `${v}${unit}`);
const usd = (v: number) => `$${v.toFixed(2)}`;

const Section: React.FC<{ title: string; note?: string; children: React.ReactNode }> = ({ title, note, children }) => (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{title}</Typography>
        {note && <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>{note}</Typography>}
        {children}
    </Paper>
);

const Tiles: React.FC<{ items: [string, string][] }> = ({ items }) => (
    <Box sx={{ display: "grid", gap: 1.5, mt: 1, gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: `repeat(${Math.min(items.length, 6)}, 1fr)` } }}>
        {items.map(([label, value]) => (
            <Box key={label}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{value}</Typography>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
            </Box>
        ))}
    </Box>
);

const Grid: React.FC<{ head: string[]; rows: (string | number)[][]; empty?: string }> = ({ head, rows, empty = "Sin datos en el rango." }) =>
    rows.length === 0 ? <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{empty}</Typography> : (
        <TableContainer sx={{ mt: 1 }}>
            <Table size="small">
                <TableHead><TableRow>{head.map((h, i) => <TableCell key={h} align={i === 0 ? "left" : "right"}>{h}</TableCell>)}</TableRow></TableHead>
                <TableBody>
                    {rows.map((r, i) => <TableRow key={i}>{r.map((c, j) => <TableCell key={j} align={j === 0 ? "left" : "right"}>{c}</TableCell>)}</TableRow>)}
                </TableBody>
            </Table>
        </TableContainer>
    );

const statsText = (s: Stats, unit: string) => s.count ? `${num(s.avg, unit)} · mediana ${num(s.median, unit)} · P90 ${num(s.p90, unit)}` : "—";

export const MetricsPanel: React.FC<{ centerId: number }> = ({ centerId }) => {
    const [from, setFrom] = useState(day(new Date(Date.now() - 6 * 86400000)));
    const [to, setTo] = useState(day(new Date()));
    const [m, setM] = useState<Metrics | null>(null);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await api<{ metrics: Metrics }>(`/logistics/centers/${centerId}/metrics?from=${from}&to=${to}`);
            setM(r.metrics);
        } catch (e) { toast.error(errorMessage(e)); } finally { setLoading(false); }
    }, [centerId, from, to]);
    // Al abrir y al cambiar de centro; las fechas se aplican con "Ver"
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { load(); }, [centerId]);

    return (
        <Stack spacing={2}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { sm: "center" } }}>
                    <TextField type="date" size="small" label="Desde" value={from} onChange={(e) => setFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                    <TextField type="date" size="small" label="Hasta" value={to} onChange={(e) => setTo(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                    <Button variant="contained" onClick={load} disabled={loading}>Ver</Button>
                    <Typography variant="caption" color="text.secondary">Cada orden cuenta en el día en que empezó su SLA.</Typography>
                </Stack>
            </Paper>
            {!m ? <Typography color="text.secondary" sx={{ p: 2 }}>{loading ? "Calculando…" : "Sin datos."}</Typography> : <>
                <Section title="Flota propia y agencia" note="Órdenes atendidas (con rider o agencia). Las que se cancelaron antes de tener canal no cuentan.">
                    <Tiles items={[
                        ["Órdenes en el rango", String(m.orders)], ["Atendidas", String(m.served.total)],
                        ["Flota propia", `${m.served.own} · ${pct(m.served.own_pct)}`], ["Agencia", `${m.served.agency} · ${pct(m.served.agency_pct)}`],
                        ["Sin canal", String(m.served.without_channel)],
                    ]} />
                </Section>

                <Section title="Entregas a tiempo" note={`Desde que arrancó el SLA hasta la entrega. Objetivo ${m.sla.target} min, límite ${m.sla.limit} min.`}>
                    <Grid head={["Canal", "Entregadas", `≤ ${m.sla.target} min`, `≤ ${m.sla.limit} min`, "Tiempo de entrega"]} rows={(["propia", "agencia"] as const).map((c) => [
                        c === "propia" ? "Flota propia" : "Agencia", m.delivery[c].delivered, pct(m.delivery[c].within_target_pct), pct(m.delivery[c].within_limit_pct),
                        statsText(m.delivery[c].minutes, " min"),
                    ])} />
                    <Typography variant="body2" sx={{ mt: 1 }}>Tiempo hasta que un rider confirma: {statsText(m.assignment_minutes, " min")}</Typography>
                </Section>

                <Section title="Dónde se resolvió cada orden">
                    <Grid head={["", "Órdenes", "%"]} rows={m.resolved_in.map((r) => [r.label, r.count, pct(r.pct)])} />
                    {m.overflow.length > 0 && <>
                        <Typography variant="body2" sx={{ mt: 2, fontWeight: 600 }}>Motivo del paso a la agencia</Typography>
                        <Grid head={["Motivo", "Órdenes"]} rows={m.overflow.map((o) => [o.label, o.count])} />
                    </>}
                </Section>

                <Section title="Rutas">
                    <Tiles items={[
                        ["Simples", String(m.routes.simple)], ["Dobles", String(m.routes.double)], ["De 3 paradas", String(m.routes.triple)],
                        ["Excepcionales", String(m.routes.exceptional)], ["Interrumpidas", String(m.routes.interrupted)], ["De recuperación", String(m.routes.recovery)],
                    ]} />
                </Section>

                <Section title="ETA previsto contra tiempo real" note="Entregas de la flota propia. Positivo: tardó más de lo previsto.">
                    <Tiles items={[
                        ["Entregas comparadas", String(m.eta.count)], ["Previsto (promedio)", num(m.eta.predicted_avg, " min")], ["Real (promedio)", num(m.eta.real_avg, " min")],
                        ["Diferencia (promedio)", num(m.eta.diff_avg, " min")], ["Dentro de ±5 min", pct(m.eta.within_5_pct)],
                    ]} />
                </Section>

                <Section title="Riders en las rondas" note="Cuántas oportunidades recibió cada uno, cuántas confirmó y cuánto tardó en confirmar.">
                    <Grid head={["Rider", "R1 recibidas", "R1 confirmadas", "R1 %", "R2 recibidas", "R2 confirmadas", "R2 %", "Respuesta"]}
                        rows={m.riders_rounds.map((r) => [r.name, r.r1_sent, r.r1_confirmed, pct(r.r1_rate_pct), r.r2_sent, r.r2_confirmed, pct(r.r2_rate_pct),
                            r.response_seconds.count ? `${num(r.response_seconds.median, " s")} (mediana)` : "—"])} />
                </Section>

                <Section title="Novedades">
                    <Tiles items={[
                        ["Total", String(m.novelties.total)], ["Resueltas por el operador", `${m.novelties.resolved_by_operator} · ${pct(m.novelties.resolved_by_operator_pct)}`],
                        ["Escaladas a ventas", `${m.novelties.escalated_to_sales} · ${pct(m.novelties.escalated_pct)}`], ["Abiertas", String(m.novelties.open)],
                        ["En agencia", String(m.novelties.by_channel.agencia)],
                    ]} />
                    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" } }}>
                        <Grid head={["Tipo", "Novedades"]} rows={m.novelties.by_type.map((t) => [t.label, t.count])} />
                        <Grid head={["Rider", "Novedades"]} rows={m.novelties.by_rider.map((t) => [t.name, t.count])} />
                        <Grid head={["Operador", "Novedades"]} rows={m.novelties.by_operator.map((t) => [t.name, t.count])} />
                    </Box>
                </Section>

                <Section title="Retornos y efectivo">
                    <Tiles items={[
                        ["Retornos en el rango", String(m.returns.in_range)], ["Pendientes ahora", String(m.returns.pending_now)],
                        ["Hasta devolverlo", statsText(m.returns.hours_to_return, " h")],
                        ["Efectivo en custodia ahora", usd(m.cash.in_custody_usd)], ["Diferencias de caja", String(m.cash.differences)],
                        ["Del cobro a la entrega", statsText(m.cash.hours_to_handover, " h")],
                    ]} />
                    {m.cash.riders_with_cash.length > 0 && <Grid head={["Rider con efectivo", "USD"]} rows={m.cash.riders_with_cash.map((r) => [r.name, usd(r.total_usd)])} />}
                </Section>

                <Section title="Carreras y pagos por rider">
                    <Grid head={["Rider", "Entregas", "Idas pagadas", "Ganado", "Pagado"]} rows={m.riders_pay.map((r) => [r.name, r.deliveries, r.failed_legs, usd(r.earned_usd), usd(r.paid_usd)])} />
                </Section>

                <Section title="Incidencias graves y delivery rate">
                    <Tiles items={[
                        ["Incidencias graves", String(m.incidents.total)], ["Siguió la ruta", String(m.incidents.kept_going)], ["Ruta interrumpida", String(m.incidents.interrupted)],
                        ["Con reemplazo", String(m.incidents.reassigned)],
                        ["Delivery rate propia", pct(m.delivery_rate.propia.rate_pct)], ["Delivery rate agencia", pct(m.delivery_rate.agencia.rate_pct)],
                    ]} />
                    {m.incidents.by_type.length > 0 && <Grid head={["Tipo", "Incidencias"]} rows={m.incidents.by_type.map((t) => [t.label, t.count])} />}
                </Section>
            </>}
        </Stack>
    );
};
