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
    api, CenterBoard, clientName, clock, errorMessage, hour, mapsLink, minutes, OrdersResponse, SLA_COLOR, STATUS_COLOR, TowerOrder,
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
    const seenAlerts = useRef<Set<number> | null>(null);

    const load = useCallback(async () => {
        try {
            const [b, o] = await Promise.all([
                api<{ center: CenterBoard }>(`/logistics/centers/${centerId}/board`),
                api<OrdersResponse>(`/logistics/centers/${centerId}/orders`),
            ]);
            setBoard(b.center); setData(o); setFetchedAt(Date.now());
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

    const startShift = async () => {
        try {
            const r = await api<{ message: string }>(`/logistics/centers/${centerId}/shift/start`, "POST");
            toast.success(r.message);
            load();
        } catch (e) { toast.error(errorMessage(e)); }
    };

    const askClose = async () => {
        try {
            const r = await api<{ pending: { texto: string; total: number }[] }>(`/logistics/centers/${centerId}/shift/pending`);
            setReason(""); setClosing({ items: r.pending });
        } catch (e) { toast.error(errorMessage(e)); }
    };

    const closeShift = async () => {
        try {
            const r = await api<{ message: string }>(`/logistics/centers/${centerId}/shift/close`, "POST", { reason: reason || null });
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

    const done = () => { setAssign(null); setAgency(null); setNovelty(null); setIncident(null); load(); };

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
                        : <Button variant="contained" onClick={startShift}>Iniciar turno</Button>)}
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
                                        onDetail={() => setDetail(o.id)} />
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

            {/* §31.1: cerrar con pendientes pide el motivo y quedan a la vista del siguiente operador */}
            <Dialog open={!!closing} onClose={() => setClosing(null)} fullWidth maxWidth="xs">
                <DialogTitle>Cerrar turno</DialogTitle>
                <DialogContent>
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
    onAssign: () => void; onAgency: () => void; onNovelty: () => void; onIncident: () => void; onDetail: () => void;
}> = ({ o, elapsed, busy, isAdmin, onAct, onAssign, onAgency, onNovelty, onIncident, onDetail }) => {
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
                    {s === "buscando_rider" && <Button size="small" variant="contained" onClick={onAssign}>Asignar a mano</Button>}
                    {/* Con el paquete en la calle (§14), la agencia no lo puede recoger en el centro */}
                    {s === "buscando_rider" && !o.pickup_rider && <Button size="small" color="secondary" onClick={onAgency}>A la agencia</Button>}
                    {s === "rider_confirmado" && !o.pickup_rider && <Button size="small" variant="contained" disabled={busy} onClick={() => onAct("prepare")}>Preparar</Button>}
                    {!o.pickup_rider && ((s === "buscando_rider" && !o.ready) || s === "rider_confirmado" || s === "preparando") &&
                        <Button size="small" variant={s === "preparando" ? "contained" : "text"} disabled={busy} onClick={() => onAct("ready")}>Listo</Button>}
                    {!o.pickup_rider && ["rider_confirmado", "preparando", "listo_despacho"].includes(s) &&
                        <Button size="small" variant={s === "listo_despacho" ? "contained" : "text"} color="success" disabled={busy} onClick={() => onAct("depart")}>Confirmar salida</Button>}
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
