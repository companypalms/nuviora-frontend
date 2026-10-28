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
    cash: { in_custody_usd: number; riders_with_cash: { name: string; total_usd: number }[]; collections: number; handovers: number; differences: number; shift_differences: number; hours_to_handover: Stats };
    riders_pay: { rider_id: number; name: string; deliveries: number; earned_usd: number; failed_legs: number; paid_usd: number }[];
    incidents: { total: number; by_type: { label: string; count: number }[]; kept_going: number; interrupted: number; reassigned: number };
    delivery_rate: Record<"propia" | "agencia", { delivered: number; not_delivered: number; rate_pct: number | null }>;
    signals: Record<"riders" | "operators", { averages: Record<string, number>; rows: ({ id: number; name: string; flags: string[] } & Record<string, number | string | string[]>)[] }>;
};
type Sheet = {
    generated_at: string;
    pieces: { product: string; variant: string | null; quantity: number }[];
    returns: { order: string | null; rider: string | null; items: { name: string; size: string | null; quantity: number }[]; returned_at: string | null; received_by: string | null }[];
};

const SIGNALS: Record<"riders" | "operators", [string, string][]> = {
    riders: [["no_responde", "\"No responde\""], ["fallidas", "Fallidas"], ["fuera_del_sitio", "Fuera del sitio"], ["diferencias_caja", "Diferencias de caja"],
        ["retornos_vencidos", "Retornos vencidos"], ["a_mano", "Asignadas a mano"]],
    operators: [["a_mano", "Asignó a mano"], ["novedades_resueltas", "Novedades que resolvió"], ["diferencias_caja", "Diferencias de caja que recibió"]],
};

const day = (d: Date) => d.toISOString().slice(0, 10);
const pct = (v: number | null) => (v === null ? "—" : `${v}%`);
const num = (v: number | null, unit = "") => (v === null ? "—" : `${Math.round(v * 10) / 10}${unit}`);
// Lo que se mide en horas: bajo una hora, en minutos ("0,01 h" no se lee)
const span = (h: number | null) => (h === null ? "—" : h < 1 ? `${Math.round(h * 60)} min` : `${Math.round(h * 10) / 10} h`);
const usd = (v: number) => `$${v.toFixed(2)}`;

const Section: React.FC<{ title: string; note?: string; children: React.ReactNode }> = ({ title, note, children }) => (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{title}</Typography>
        {note && <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>{note}</Typography>}
        {children}
    </Paper>
);

const Tiles: React.FC<{ items: ([string, string] | [string, string, string])[] }> = ({ items }) => (
    <Box sx={{ display: "grid", gap: 1.5, mt: 1, gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: `repeat(${Math.min(items.length, 6)}, 1fr)` } }}>
        {items.map(([label, value, detail]) => (
            <Box key={label}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{value}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{label}</Typography>
                {detail && <Typography variant="caption" color="text.secondary">{detail}</Typography>}
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
// Un tiempo en horas para Tiles: el promedio arriba, la mediana y el P90 debajo
const hoursTile = (label: string, s: Stats): [string, string, string] =>
    [label, s.count ? span(s.avg) : "—", s.count ? `mediana ${span(s.median)} · P90 ${span(s.p90)}` : ""];

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
                        hoursTile("Hasta devolverlo", m.returns.hours_to_return),
                        ["Efectivo en custodia ahora", usd(m.cash.in_custody_usd)], ["Diferencias de caja con riders", String(m.cash.differences)],
                        ["Diferencias en cambio de turno", String(m.cash.shift_differences)],
                        hoursTile("Del cobro a la entrega", m.cash.hours_to_handover),
                    ]} />
                    {m.cash.riders_with_cash.length > 0 && <Grid head={["Rider con efectivo", "USD"]} rows={m.cash.riders_with_cash.map((r) => [r.name, usd(r.total_usd)])} />}
                </Section>

                <Section title="Carreras y pagos por rider">
                    <Grid head={["Rider", "Entregas", "Idas pagadas", "Ganado", "Pagado"]} rows={m.riders_pay.map((r) => [r.name, r.deliveries, r.failed_legs, usd(r.earned_usd), usd(r.paid_usd)])} />
                </Section>

                {(["riders", "operators"] as const).map((who) => (
                    <Section key={who} title={who === "riders" ? "Señales raras por rider" : "Señales raras por operador"}
                        note="En rojo, quien tiene el doble del promedio o más (y al menos 2 casos): es lo que hay que mirar de cerca.">
                        <Grid head={["", ...SIGNALS[who].map(([, l]) => l)]} rows={m.signals[who].rows.map((r) => [
                            r.flags.length ? `⚠ ${r.name}` : r.name,
                            ...SIGNALS[who].map(([k]) => (r.flags.includes(k) ? `${r[k]} (alto)` : String(r[k] ?? 0))),
                        ])} />
                        <Typography variant="caption" color="text.secondary">
                            Promedio: {SIGNALS[who].map(([k, l]) => `${l} ${m.signals[who].averages[k] ?? 0}`).join(" · ")}
                        </Typography>
                    </Section>
                ))}

                <ReviewSheet centerId={centerId} />

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

const PIECES_HEAD = ["Producto", "Variante o talla", "Piezas"];
const RETURNS_HEAD = ["Orden", "Piezas", "Recibido", "Lo recibió", "Rider"];

/** Imprime solo la hoja, en un marco aparte: con window.print() salían todas las métricas y el menú. */
const printSheet = (title: string, tables: { head: string[]; rows: (string | number)[][]; empty: string }[]) => {
    const esc = (v: string | number) => String(v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[c]!);
    const body = tables.map((t) => t.rows.length === 0 ? `<p>${esc(t.empty)}</p>`
        : `<table><tr>${t.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr>${t.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</table>`).join("");
    const frame = document.createElement("iframe");
    frame.style.cssText = "position:fixed;width:0;height:0;border:0";
    document.body.appendChild(frame);
    const doc = frame.contentDocument!;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
        body{font-family:Arial,sans-serif;font-size:12px;margin:16px}h1{font-size:16px}table{border-collapse:collapse;width:100%;margin:12px 0}
        th,td{border:1px solid #999;padding:4px 6px;text-align:left}th{background:#eee}</style></head><body><h1>${esc(title)}</h1>${body}</body></html>`);
    doc.close();
    frame.contentWindow!.focus();
    frame.contentWindow!.print();
    setTimeout(() => frame.remove(), 1000);
};

/** La hoja de la revisión semanal de defectuosos (idea 2 de Fran): lo que está en revisión en el almacén, para imprimir. */
const ReviewSheet: React.FC<{ centerId: number }> = ({ centerId }) => {
    const [sheet, setSheet] = useState<Sheet | null>(null);
    const load = () => api<Sheet>(`/logistics/centers/${centerId}/review-sheet`).then(setSheet).catch((e) => toast.error(errorMessage(e)));
    const tables = sheet ? [
        { head: PIECES_HEAD, rows: sheet.pieces.map((p) => [p.product, p.variant ?? "—", p.quantity]), empty: "No hay piezas defectuosas en el almacén." },
        { head: RETURNS_HEAD, empty: "No hay retornos esperando decisión.",
            rows: sheet.returns.map((r) => [r.order ?? "—", r.items.map((i) => `${i.quantity}× ${i.name}${i.size ? ` (${i.size})` : ""}`).join(", "),
                r.returned_at ? new Date(r.returned_at).toLocaleString("es-VE") : "—", r.received_by ?? "—", r.rider ?? "—"]) },
    ] : [];

    return (
        <Section title="Revisión semanal de defectuosos" note="Las piezas defectuosas o en revisión del almacén del centro y los retornos que esperan decisión.">
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Button size="small" variant="outlined" onClick={load}>Ver la hoja</Button>
                {sheet && <Button size="small" onClick={() => printSheet(`Revisión semanal de defectuosos · ${new Date(sheet.generated_at).toLocaleString("es-VE")}`, tables)}>Imprimir</Button>}
            </Stack>
            {tables.map((t) => <Grid key={t.head[0]} head={t.head} rows={t.rows} empty={t.empty} />)}
        </Section>
    );
};
