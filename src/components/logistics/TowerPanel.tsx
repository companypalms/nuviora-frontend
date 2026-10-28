// src/components/logistics/TowerPanel.tsx
// La torre de control del operador (logística propia, §21): el turno del centro (§4.2, §31.1), las alertas (§25), el
// resumen de arriba (§21.1) y la cola de prioridad (§21.3) con el reloj del SLA y la acción que toca en cada orden. Se
// refresca cada 5 segundos; los relojes corren cada segundo entre una consulta y otra.
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Link, Paper, Stack, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import { HistoryRounded, PhoneRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { playNotificationSound } from "../../lib/sound";
import {
    api, CenterBoard, clientName, clock, errorMessage, hour, mapsLink, minutes, OrdersResponse, RouteProposal, SLA_COLOR, STATUS_COLOR, TowerOrder,
} from "./logistics";
import { AgencyDialog, AssignDialog, DetailDialog, IncidentDialog, NoveltyDialog } from "./OrderDialogs";

const STATE_COLOR = { abierto: "success", sin_operador: "error", cerrado: "default", inactivo: "default" } as const;
const ALERT_SEVERITY = { critical: "error", red: "error", warning: "warning", info: "info" } as const;

/** §21.1. */
const TILES: { key: keyof OrdersResponse["summary"]; label: string; danger?: boolean }[] = [
    { key: "incidencias", label: "Incidencias graves", danger: true },
    { key: "sin_rider", label: "Sin rider / buscando" },
    { key: "preparando_listos", label: "Preparando / listos" },
    { key: "rutas_activas", label: "Rutas propias activas" },
    { key: "en_agencia", label: "Activos en agencia" },
    { key: "sla_riesgo", label: "SLA en riesgo", danger: true },
    { key: "novedades", label: "Novedades abiertas", danger: true },
    { key: "retornos", label: "Retornos pendientes" },
    { key: "efectivo_limite", label: "Riders con USD 60 o más", danger: true },
    { key: "diferencias", label: "Diferencias de caja", danger: true },
];

export const TowerPanel: React.FC<{ centerId: number; isAdmin: boolean }> = ({ centerId, isAdmin }) => {
    const [board, setBoard] = useState<CenterBoard | null>(null);
    const [data, setData] = useState<OrdersResponse | null>(null);
    const [fetchedAt, setFetchedAt] = useState(Date.now());
    const [, setTick] = useState(0);
    const [busy, setBusy] = useState<number | null>(null);
    const [assign, setAssign] = useState<TowerOrder | null>(null);
    const [agency, setAgency] = useState<TowerOrder | null>(null);
    const [novelty, setNovelty] = useState<TowerOrder | null>(null);
    const [incident, setIncident] = useState<TowerOrder | null>(null);
    const [detail, setDetail] = useState<number | null>(null);
    const [closing, setClosing] = useState<{ items: { texto: string; total: number }[] } | null>(null);
    const [reason, setReason] = useState("");
    const [proposals, setProposals] = useState<RouteProposal[]>([]);
    const [exceptional, setExceptional] = useState<RouteProposal | null>(null);
    const [reorder, setReorder] = useState<number | null>(null);
    const seenAlerts = useRef<Set<number> | null>(null);

    const load = useCallback(async () => {
        try {
            const [b, o] = await Promise.all([
                api<{ center: CenterBoard }>(`/logistics/centers/${centerId}/board`),
                api<OrdersResponse>(`/logistics/centers/${centerId}/orders`),
            ]);
            setBoard(b.center); setData(o); setFetchedAt(Date.now());
            // §24.1: las rutas que propone el sistema; si Google falla, la torre sigue igual
            api<{ proposals: RouteProposal[] }>(`/logistics/centers/${centerId}/route-proposals`)
                .then((r) => setProposals(r.proposals)).catch(() => setProposals([]));
            // Suena cuando llega una alerta roja nueva (minuto 3 sin rider, novedad, sin operador…), no las que ya estaban
            const urgent = b.center.alerts.filter((a) => a.level === "critical" || a.level === "red");
            if (seenAlerts.current && urgent.some((a) => !seenAlerts.current!.has(a.id))) playNotificationSound();
            seenAlerts.current = new Set(b.center.alerts.map((a) => a.id));
        } catch (e) { toast.error(errorMessage(e)); }
    }, [centerId]);

    useEffect(() => {
        seenAlerts.current = null;
        load();
        const poll = setInterval(load, 5000);
        const tick = setInterval(() => setTick((t) => t + 1), 1000);
        return () => { clearInterval(poll); clearInterval(tick); };
    }, [load]);

    const elapsed = (Date.now() - fetchedAt) / 1000;

    const act = async (row: TowerOrder, path: string, body?: Record<string, unknown>) => {
        setBusy(row.id);
        try {
            const r = await api<{ message: string }>(`/logistics/orders/${row.id}/${path}`, "POST", body);
            toast.success(r.message);
            await load();
        } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(null); }
    };

    // Informe del 27/10, sección 06 punto 4 (Fran: "rápido y fácil"): la que entra confirma el efectivo que recibe o dice cuánto hay
    const [handover, setHandover] = useState<"open" | "close" | null>(null);
    const [cashOk, setCashOk] = useState(true);
    const [cashUsd, setCashUsd] = useState("");
    const [cashVes, setCashVes] = useState("");
    const [receive, setReceive] = useState<{ usd: string; ves: string; method: string } | null>(null);
    const cashBody = () => (cashOk ? { cash_ok: true } : { cash_usd: Number(cashUsd || 0), cash_ves: Number(cashVes || 0) });

    const startShift = async () => {
        try {
            const r = await api<{ message: string }>(`/logistics/centers/${centerId}/shift/start`, "POST", cashBody());
            toast.success(r.message);
            setHandover(null);
            load();
        } catch (e) { toast.error(errorMessage(e)); }
    };

    /** Administración marca como recibido el efectivo que le entregó la operadora ("se marca como pagado", Fran). */
    const receiveCash = async () => {
        if (!receive) return;
        try {
            const r = await api<{ message: string }>(`/logistics/centers/${centerId}/cash/received`, "POST",
                { usd: Number(receive.usd || 0), ves: Number(receive.ves || 0), method: receive.method || null });
            toast.success(r.message);
            setReceive(null);
            load();
        } catch (e) { toast.error(errorMessage(e)); }
    };

    const askClose = async () => {
        try {
            const r = await api<{ pending: { texto: string; total: number }[] }>(`/logistics/centers/${centerId}/shift/pending`);
            setReason(""); setCashOk(true); setCashUsd(""); setCashVes(""); setClosing({ items: r.pending });
        } catch (e) { toast.error(errorMessage(e)); }
    };

    const closeShift = async () => {
        try {
            const r = await api<{ message: string }>(`/logistics/centers/${centerId}/shift/close`, "POST", { reason: reason || null, ...cashBody() });
            toast.success(r.message);
            setClosing(null);
            load();
        } catch (e) { toast.error(errorMessage(e)); }
    };

    const voteRoad = async (id: number, vote: "activo" | "despejado") => {
        try {
            const r = await api<{ message: string }>(`/logistics/road-reports/${id}/vote`, "POST", { vote });
            toast.success(r.message);
            load();
        } catch (e) { toast.error(errorMessage(e)); }
    };

    const resolveAlert = async (id: number) => {
        try {
            await api(`/logistics/centers/${centerId}/alerts/${id}/resolve`, "POST");
            load();
        } catch (e) { toast.error(errorMessage(e)); }
    };

    const done = () => { setAssign(null); setAgency(null); setNovelty(null); setIncident(null); setReorder(null); load(); };

    /** §24.1: "IF operator approves: update route; rider does not re-accept". */
    const approveRoute = async (p: RouteProposal, asException = false) => {
        if (p.exceptional && !asException) { setExceptional(p); return; }
        setBusy(p.add_logistics_order_id);
        try {
            const r = await api<{ message: string }>("/logistics/routes/approve", "POST", {
                add_logistics_order_id: p.add_logistics_order_id, stops: p.stops.map((s) => s.logistics_order_id), exceptional: asException,
            });
            toast.success(r.message);
            setExceptional(null);
            await load();
        } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(null); }
    };

    if (!board || !data) return <Typography color="text.secondary" sx={{ p: 2 }}>Cargando la torre…</Typography>;

    return (
        <Stack spacing={2}>
            {/* Turno (§4.2, §31.1) */}
            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
                    <Box>
                        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
                            <Typography variant="h6">{board.name}</Typography>
                            <Chip size="small" color={STATE_COLOR[board.state]} label={board.state_label} />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                            {board.today_hours ? `Hoy abre de ${board.today_hours[0]} a ${board.today_hours[1]}` : "Hoy no abre"}
                            {board.dispatch_cutoff ? ` · corte de despacho ${board.dispatch_cutoff}${board.before_cutoff ? "" : " (ya pasó)"}` : ""}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {board.active_shift ? `Turno de ${board.active_shift.user?.names ?? "?"} desde las ${hour(board.active_shift.started_at)}` : "Nadie tiene el turno abierto."}
                        </Typography>
                    </Box>
                    {board.is_active && (board.active_shift
                        ? <Button variant="outlined" color="inherit" onClick={askClose}>Cerrar turno</Button>
                        : <Button variant="contained" onClick={() => { setCashOk(true); setCashUsd(""); setCashVes(""); setHandover("open"); }}>Iniciar turno</Button>)}
                </Stack>
                {/* Informe del 27/10, sección 06 punto 3: el efectivo que tiene el centro, para la operadora y para administración */}
                <Stack direction="row" spacing={1.5} sx={{ mt: 1.5, alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
                    <Typography variant="body2"><b>Caja del centro:</b> {cashLine(board.cash)}</Typography>
                    {isAdmin && (board.cash.usd > 0 || board.cash.ves > 0) &&
                        <Button size="small" onClick={() => setReceive({ usd: String(board.cash.usd), ves: String(board.cash.ves), method: "" })}>Me lo entregaron</Button>}
                </Stack>
                {!board.is_active && <Alert severity="info" sx={{ mt: 1.5 }}>El centro está apagado: {board.city ?? "la ciudad"} sigue con sus agencias. Lo enciende el Admin en Configuración.</Alert>}
                {board.is_active && !board.active_shift && board.last_close?.close_type === "con_pendientes" && (
                    <Alert severity="warning" sx={{ mt: 1.5 }}>El turno anterior cerró con pendientes{board.last_close.close_reason ? `: ${board.last_close.close_reason}` : "."}</Alert>
                )}
            </Paper>

            {/* Alertas (§25) */}
            {board.alerts.length > 0 && (
                <Stack spacing={1}>
                    {board.alerts.map((a) => (
                        <Alert key={a.id} severity={ALERT_SEVERITY[a.level]} variant={a.level === "critical" || a.level === "red" ? "filled" : "standard"}
                            action={<Button color="inherit" size="small" onClick={() => resolveAlert(a.id)}>Listo</Button>}>
                            <b>{hour(a.created_at)}</b> · {a.message}
                        </Alert>
                    ))}
                </Stack>
            )}

            {/* Resumen (§21.1) */}
            <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(5, 1fr)", xl: "repeat(10, 1fr)" } }}>
                {TILES.map((t) => {
                    const v = data.summary[t.key];
                    return (
                        <Paper key={t.key} elevation={0} sx={{ p: 1.5, borderRadius: 3, border: "1px solid", borderColor: t.danger && v > 0 ? "error.main" : "divider" }}>
                            <Typography variant="h5" sx={{ fontWeight: 700, color: t.danger && v > 0 ? "error.main" : "text.primary" }}>{v}</Typography>
                            <Typography variant="caption" color="text.secondary">{t.label}</Typography>
                        </Paper>
                    );
                })}
            </Box>

            {/* §15: lo que reportaron los riders en la vía (se quita solo si nadie confirma que sigue) */}
            {data.road_reports.length > 0 && (
                <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>En la vía</Typography>
                    <Stack spacing={1}>
                        {data.road_reports.map((r) => (
                            <Stack key={r.id} direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
                                <Box>
                                    <Typography variant="body2"><b>{r.type_label}</b>{r.comment ? ` · ${r.comment}` : ""}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {r.reporter ?? "Un rider"} a las {hour(r.reported_at)}{r.still_count > 0 ? ` · ${r.still_count} confirmación(es)` : ""} · se quita a las {hour(r.expires_at)} ·{" "}
                                        <Link href={mapsLink(r.lat, r.lng)} target="_blank" rel="noopener">ver en el mapa</Link>
                                    </Typography>
                                </Box>
                                <Stack direction="row" spacing={1}>
                                    <Button size="small" onClick={() => voteRoad(r.id, "activo")}>Sigue activo</Button>
                                    <Button size="small" color="success" onClick={() => voteRoad(r.id, "despejado")}>Despejado</Button>
                                </Stack>
                            </Stack>
                        ))}
                    </Stack>
                </Paper>
            )}

            {/* §9.3, §24.1: sumar una orden a la ruta de un rider que todavía no salió, sin pedirle otra aceptación */}
            {proposals.length > 0 && (
                <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor: "primary.main" }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Rutas propuestas</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                        El rider todavía no salió: puede llevarse otra orden en la misma salida. Todas las entregas quedan dentro de {proposals[0].limit_minutes} min.
                    </Typography>
                    <Stack spacing={1.5}>
                        {proposals.map((p) => (
                            <Stack key={p.add_logistics_order_id} direction={{ xs: "column", md: "row" }} spacing={1.5}
                                sx={{ alignItems: { md: "center" }, justifyContent: "space-between", borderTop: "1px solid", borderColor: "divider", pt: 1.5 }}>
                                <Box>
                                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 0.5 }}>
                                        <Typography variant="body2">Sumar <b>{p.add_order_name ?? `#${p.add_logistics_order_id}`}</b> a la ruta de <b>{p.rider.names ?? "rider"}</b></Typography>
                                        {p.exceptional && <Chip size="small" color="warning" label={`Excepcional · ${p.stops.length} paradas`} />}
                                    </Stack>
                                    {p.stops.map((s) => (
                                        <Typography key={s.logistics_order_id} variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                            {s.stop}. {s.order_name ?? `#${s.logistics_order_id}`} · {s.stop === 1 ? "desde el centro" : "desde la parada anterior"}{" "}
                                            {(s.leg_meters / 1000).toFixed(1)} km · entrega a los <b>{minutes(s.projected_minutes)}</b> de su SLA
                                        </Typography>
                                    ))}
                                    <Typography variant="caption" color="text.secondary">Sale en ~{minutes(p.depart_in_minutes)} · {p.service_minutes} min por parada · ruta de {minutes(p.total_minutes)}</Typography>
                                </Box>
                                <Button variant="contained" size="small" disabled={busy === p.add_logistics_order_id} onClick={() => approveRoute(p)} sx={{ flexShrink: 0 }}>Armar ruta</Button>
                            </Stack>
                        ))}
                    </Stack>
                </Paper>
            )}

            {/* Cola de prioridad (§21.3) */}
            <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
                <Box sx={{ px: 2, pt: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Cola de prioridad</Typography>
                    <Typography variant="caption" color="text.secondary">
                        Lo más urgente arriba. SLA: objetivo {data.settings.sla_target_minutes} min, límite {data.settings.sla_limit_minutes} min.
                    </Typography>
                </Box>
                {data.orders.length === 0 ? <Typography color="text.secondary" sx={{ p: 2 }}>No hay órdenes en curso en el centro.</Typography> : (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Qué toca</TableCell><TableCell>Orden</TableCell><TableCell>Estado</TableCell><TableCell>SLA</TableCell>
                                    <TableCell>Rider / agencia</TableCell><TableCell align="right">Acciones</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.orders.map((o) => (
                                    <OrderRow key={o.id} o={o} elapsed={elapsed} busy={busy === o.id} isAdmin={isAdmin} onAct={(p, body) => act(o, p, body)}
                                        onAssign={() => setAssign(o)} onAgency={() => setAgency(o)} onNovelty={() => setNovelty(o)} onIncident={() => setIncident(o)}
                                        onDetail={() => setDetail(o.id)} onReorder={() => o.route && setReorder(o.route.id)} />
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            <AssignDialog row={assign} onClose={() => setAssign(null)} onDone={done} />
            <AgencyDialog row={agency} onClose={() => setAgency(null)} onDone={done} />
            <NoveltyDialog row={novelty} onClose={() => setNovelty(null)} onDone={done} />
            <IncidentDialog row={incident} onClose={() => setIncident(null)} onDone={done} />
            <DetailDialog id={detail} onClose={() => setDetail(null)} />
            <ReorderDialog routeId={reorder} stops={data.orders.filter((o) => o.route?.id === reorder)} onClose={() => setReorder(null)} onDone={done} />

            {/* Cambio de turno: la que entra confirma lo que recibe */}
            <Dialog open={handover === "open"} onClose={() => setHandover(null)} fullWidth maxWidth="xs">
                <DialogTitle>Iniciar turno</DialogTitle>
                <DialogContent>
                    <CashCheck title={`Recibes en la caja ${cashLine(board.cash)}${board.cash.returns ? ` y ${board.cash.returns} retorno(s) en revisión` : ""}`}
                        ok={cashOk} setOk={setCashOk} usd={cashUsd} setUsd={setCashUsd} ves={cashVes} setVes={setCashVes} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setHandover(null)}>Cancelar</Button>
                    <Button variant="contained" onClick={startShift}>Iniciar turno</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={!!receive} onClose={() => setReceive(null)} fullWidth maxWidth="xs">
                <DialogTitle>Efectivo que te entregó el centro</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Según el sistema, la caja tiene {cashLine(board.cash)}. Al guardarlo, baja de la caja del centro.</Typography>
                    <Stack spacing={1.5}>
                        <TextField label="Dólares" type="number" size="small" value={receive?.usd ?? ""} onChange={(e) => setReceive((r) => r && { ...r, usd: e.target.value })} />
                        <TextField label="Bolívares" type="number" size="small" value={receive?.ves ?? ""} onChange={(e) => setReceive((r) => r && { ...r, ves: e.target.value })} />
                        <TextField label="Cómo (efectivo, depósito…)" size="small" value={receive?.method ?? ""} onChange={(e) => setReceive((r) => r && { ...r, method: e.target.value })} />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setReceive(null)}>Cancelar</Button>
                    <Button variant="contained" onClick={receiveCash}>Guardar</Button>
                </DialogActions>
            </Dialog>

            {/* §10: tres paradas solo como excepción, con aprobación expresa del operador */}
            <Dialog open={!!exceptional} onClose={() => setExceptional(null)} fullWidth maxWidth="xs">
                <DialogTitle>Ruta excepcional de {exceptional?.stops.length} paradas</DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        Lo normal son 2 paradas. Apruébala solo si los destinos están muy cerca entre sí:
                    </Typography>
                    {exceptional?.stops.map((s) => (
                        <Typography key={s.logistics_order_id} variant="body2" sx={{ mt: 0.5 }}>
                            {s.stop}. {s.order_name} · {(s.leg_meters / 1000).toFixed(1)} km {s.stop === 1 ? "desde el centro" : "desde la anterior"} · {minutes(s.projected_minutes)}
                        </Typography>
                    ))}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setExceptional(null)}>Cancelar</Button>
                    <Button variant="contained" color="warning" onClick={() => exceptional && approveRoute(exceptional, true)}>Aprobar la excepción</Button>
                </DialogActions>
            </Dialog>

            {/* §31.1: cerrar con pendientes pide el motivo y quedan a la vista del siguiente operador */}
            <Dialog open={!!closing} onClose={() => setClosing(null)} fullWidth maxWidth="xs">
                <DialogTitle>Cerrar turno</DialogTitle>
                <DialogContent>
                    <CashCheck title={`Dejas en la caja ${cashLine(board.cash)}`} ok={cashOk} setOk={setCashOk} usd={cashUsd} setUsd={setCashUsd} ves={cashVes} setVes={setCashVes} />
                    {closing && closing.items.length === 0 ? <Typography>No quedan pendientes: el turno cierra limpio.</Typography> : (
                        <>
                            <Typography variant="body2" sx={{ mb: 1 }}>Quedan pendientes:</Typography>
                            {closing?.items.map((p, i) => <Typography key={i} variant="body2">• {p.texto}: {p.total}</Typography>)}
                            <TextField label="Motivo para cerrar así" value={reason} onChange={(e) => setReason(e.target.value)} fullWidth size="small" multiline minRows={2} sx={{ mt: 2 }} />
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setClosing(null)}>Cancelar</Button>
                    <Button variant="contained" onClick={closeShift} disabled={!!closing && closing.items.length > 0 && !reason.trim()}>Cerrar turno</Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
};

const OrderRow: React.FC<{
    o: TowerOrder; elapsed: number; busy: boolean; isAdmin: boolean; onAct: (path: string, body?: Record<string, unknown>) => void;
    onAssign: () => void; onAgency: () => void; onNovelty: () => void; onIncident: () => void; onDetail: () => void; onReorder: () => void;
}> = ({ o, elapsed, busy, isAdmin, onAct, onAssign, onAgency, onNovelty, onIncident, onDetail, onReorder }) => {
    const sla = o.sla_minutes !== null ? o.sla_minutes + elapsed / 60 : null;
    const searching = o.searching_seconds !== null ? o.searching_seconds + elapsed : null;
    const agencyIn = o.agency_in_seconds !== null ? o.agency_in_seconds - elapsed : null;
    const s = o.status;
    const urgent = o.priority !== null && o.priority <= 5;
    const who = o.rider?.names ?? (o.agency ? `Agencia ${o.agency.names}` : "—");
    const phone = o.rider?.phone ?? null;

    return (
        <TableRow hover sx={urgent ? { bgcolor: (t) => t.palette.mode === "dark" ? "rgba(229,72,77,0.12)" : "rgba(217,58,64,0.06)" } : undefined}>
            <TableCell>
                {o.priority_label
                    ? <Chip size="small" color={urgent ? "error" : o.priority === 7 ? "primary" : "default"} variant={urgent ? "filled" : "outlined"} label={o.priority_label} />
                    : <Typography variant="caption" color="text.secondary">Sin acción</Typography>}
            </TableCell>
            <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{o.order?.name ?? `#${o.order_id}`}</Typography>
                <Typography variant="caption" color="text.secondary">{clientName(o)}{o.order?.client?.address1 ? ` · ${o.order.client.address1}` : ""}</Typography>
            </TableCell>
            <TableCell>
                <Chip size="small" color={STATUS_COLOR[s] ?? "default"} label={o.status_label} />
                {/* §10: la parada dentro de su ruta */}
                {o.route && (
                    <Typography variant="caption" color={o.route.exceptional ? "warning.main" : "primary"} sx={{ display: "block", mt: 0.5 }}>
                        Ruta #{o.route.id} · parada {o.route.stop} de {o.route.stops}{o.route.exceptional ? " · excepcional" : ""}{o.route.locked ? " · cerrada" : ""}
                    </Typography>
                )}
                {s === "buscando_rider" && searching !== null && (
                    <Typography variant="caption" sx={{ display: "block", mt: 0.5 }} color={agencyIn !== null && agencyIn < 120 ? "error" : "text.secondary"}>
                        {o.round ? `R${o.round.number} · ` : ""}buscando {clock(searching)}{o.pickup_rider ? "" : ` · agencia en ${clock(agencyIn)}`}
                    </Typography>
                )}
                {o.pickup_rider && (
                    <Typography variant="caption" color="warning.main" sx={{ display: "block" }}>Reemplazo: el paquete está con {o.pickup_rider.names}</Typography>
                )}
                {o.ready && s === "buscando_rider" && <Typography variant="caption" color="primary" sx={{ display: "block" }}>Paquete listo</Typography>}
                {s === "asignado_agencia" && <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{o.handed_to_agency ? "Ya la tiene la agencia" : "Paquete en el centro"}</Typography>}
                {s === "retorno_pendiente" && (
                    <Typography variant="caption" color={o.return_overdue ? "error" : "text.secondary"} sx={{ display: "block", mt: 0.5 }}>
                        {o.return_overdue ? "Venció el plazo" : `Plazo: ${hour(o.return_deadline)}`} · {o.return_to_review ? "al recibirlo va a revisión" : "vuelve apartada para la orden"}
                    </Typography>
                )}
            </TableCell>
            <TableCell>
                {sla !== null ? <Chip size="small" variant="outlined" color={o.sla_level ? SLA_COLOR[o.sla_level] : "default"} label={minutes(sla)} /> : "—"}
            </TableCell>
            <TableCell>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                    <Typography variant="body2">{who}</Typography>
                    {phone && <Tooltip title={phone}><IconButton size="small" href={`tel:${phone}`}><PhoneRounded fontSize="inherit" /></IconButton></Tooltip>}
                </Stack>
            </TableCell>
            <TableCell align="right">
                <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", flexWrap: "wrap", rowGap: 1 }}>
                    {o.open_incident && <Button size="small" color="error" variant={o.priority_key === "incidencia" ? "contained" : "outlined"} onClick={onIncident}>Incidencia</Button>}
                    {o.open_novelty && <Button size="small" color="error" variant={o.priority_key === "novedad" ? "contained" : "outlined"} onClick={onNovelty}>Novedad</Button>}
                    {/* Fran, 27/10: a mano solo desde el minuto 3, cuando las rondas no la colocaron */}
                    {s === "buscando_rider" && (() => {
                        const wait = o.calls_in_seconds !== null ? o.calls_in_seconds - elapsed : 0;
                        return wait > 0
                            ? <Tooltip title="A mano solo desde el minuto 3: hasta entonces la toman las rondas"><span><Button size="small" disabled>A mano en {clock(wait)}</Button></span></Tooltip>
                            : <Button size="small" variant="contained" onClick={onAssign}>Asignar a mano</Button>;
                    })()}
                    {/* Con el paquete en la calle (§14), la agencia no lo puede recoger en el centro */}
                    {s === "buscando_rider" && !o.pickup_rider && <Button size="small" color="secondary" onClick={onAgency}>A la agencia</Button>}
                    {s === "rider_confirmado" && !o.pickup_rider && <Button size="small" variant="contained" disabled={busy} onClick={() => onAct("prepare")}>Preparar</Button>}
                    {!o.pickup_rider && ((s === "buscando_rider" && !o.ready) || s === "rider_confirmado" || s === "preparando") &&
                        <Button size="small" variant={s === "preparando" ? "contained" : "text"} disabled={busy} onClick={() => onAct("ready")}>Listo</Button>}
                    {/* §10.2: antes de salir, el operador puede cambiar el orden (queda auditado) */}
                    {o.route && !o.route.locked && o.route.status === "abierta" && o.route.stop === 1 &&
                        <Button size="small" disabled={busy} onClick={onReorder}>Cambiar orden</Button>}
                    {!o.pickup_rider && ["rider_confirmado", "preparando", "listo_despacho"].includes(s) &&
                        <Button size="small" variant={s === "listo_despacho" ? "contained" : "text"} color="success" disabled={busy}
                            onClick={() => (!o.route || window.confirm(`Sale la ruta completa: las ${o.route.stops} paradas. ¿El rider recibió todos los paquetes?`)) && onAct("depart")}>
                            {o.route ? `Confirmar salida (${o.route.stops} paradas)` : "Confirmar salida"}
                        </Button>}
                    {/* §14.3: el reemplazo recibe el paquete del rider que tuvo la incidencia */}
                    {o.pickup_rider && o.rider_id && ["rider_confirmado", "preparando", "listo_despacho"].includes(s) &&
                        <Button size="small" variant="contained" color="success" disabled={busy} onClick={() => onAct("transfer")}>Confirmar traspaso</Button>}
                    {s === "asignado_agencia" && !o.handed_to_agency && <Button size="small" variant="contained" color="secondary" disabled={busy} onClick={() => onAct("hand-to-agency")}>Entregar a la agencia</Button>}
                    {/* §16.1: el operador recibe el retorno; solo administración lo reingresa o lo da de baja */}
                    {s === "retorno_pendiente" &&
                        <Button size="small" variant="contained" color={o.return_overdue ? "error" : "primary"} disabled={busy} onClick={() => onAct("receive-return")}>Recibir retorno</Button>}
                    {s === "en_revision" && isAdmin && <>
                        <Button size="small" variant="contained" color="success" disabled={busy} onClick={() => onAct("review", { action: "restock" })}>Reingresar</Button>
                        <Button size="small" color="error" disabled={busy}
                            onClick={() => window.confirm("¿Dar de baja la pieza? Sale del inventario.") && onAct("review", { action: "discard" })}>Dar de baja</Button>
                    </>}
                    <Tooltip title="Historial"><IconButton size="small" onClick={onDetail}><HistoryRounded fontSize="small" /></IconButton></Tooltip>
                </Stack>
            </TableCell>
        </TableRow>
    );
};

/** §10.2: el operador cambia el orden de las paradas antes de la salida; el motivo queda en el historial de cada una. */
const ReorderDialog: React.FC<{ routeId: number | null; stops: TowerOrder[]; onClose: () => void; onDone: () => void }> = ({ routeId, stops, onClose, onDone }) => {
    const [order, setOrder] = useState<TowerOrder[]>([]);
    const [why, setWhy] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (routeId) {
            setOrder([...stops].sort((a, b) => (a.route?.stop ?? 0) - (b.route?.stop ?? 0)));
            setWhy("");
        }
        // Solo al abrir: mientras está abierto, el sondeo de la torre no le cambia el orden que el operador está armando
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [routeId]);

    const move = (i: number, d: -1 | 1) => setOrder((list) => {
        const next = [...list];
        [next[i], next[i + d]] = [next[i + d], next[i]];
        return next;
    });

    const save = async () => {
        setSaving(true);
        try {
            const r = await api<{ message: string }>(`/logistics/routes/${routeId}/reorder`, "POST", { stops: order.map((s) => s.id), reason: why || null });
            toast.success(r.message);
            onDone();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };

    return (
        <Dialog open={!!routeId} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Orden de las paradas</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    El rider no puede cambiarlo. Si lo cambias, queda en el historial; no se acepta un orden que deje una entrega fuera del límite.
                </Typography>
                {order.map((s, i) => (
                    <Stack key={s.id} direction="row" spacing={1} sx={{ alignItems: "center", py: 0.5 }}>
                        <Typography variant="body2" sx={{ flex: 1 }}>{i + 1}. {s.order?.name ?? `#${s.order_id}`} · {clientName(s)}</Typography>
                        <Button size="small" disabled={i === 0} onClick={() => move(i, -1)}>Subir</Button>
                        <Button size="small" disabled={i === order.length - 1} onClick={() => move(i, 1)}>Bajar</Button>
                    </Stack>
                ))}
                <TextField label="Motivo" value={why} onChange={(e) => setWhy(e.target.value)} fullWidth size="small" sx={{ mt: 1.5 }} />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button variant="contained" disabled={saving || !why.trim()} onClick={save}>Guardar orden</Button>
            </DialogActions>
        </Dialog>
    );
};

const cashLine = (c: { usd: number; ves: number }) =>
    [`USD ${c.usd.toFixed(2)}`, c.ves ? `Bs ${c.ves.toLocaleString("es-VE", { minimumFractionDigits: 2 })}` : null].filter(Boolean).join(" y ");

/** El efectivo del cambio de turno: confirmar con un toque o escribir lo que hay (informe del 27/10, sección 06 punto 4). */
const CashCheck: React.FC<{
    title: string; ok: boolean; setOk: (v: boolean) => void; usd: string; setUsd: (v: string) => void; ves: string; setVes: (v: string) => void;
}> = ({ title, ok, setOk, usd, setUsd, ves, setVes }) => (
    <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ mb: 1 }}>{title}</Typography>
        <Stack direction="row" spacing={1}>
            <Button size="small" variant={ok ? "contained" : "outlined"} color="success" onClick={() => setOk(true)}>Está completo</Button>
            <Button size="small" variant={!ok ? "contained" : "outlined"} color="warning" onClick={() => setOk(false)}>No cuadra</Button>
        </Stack>
        {!ok && (
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <TextField label="Dólares que hay" type="number" size="small" value={usd} onChange={(e) => setUsd(e.target.value)} />
                <TextField label="Bolívares que hay" type="number" size="small" value={ves} onChange={(e) => setVes(e.target.value)} />
            </Stack>
        )}
    </Box>
);
