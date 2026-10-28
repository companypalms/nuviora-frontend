// src/components/logistics/RidersPanel.tsx
// Los riders del centro para el operador (logística propia, §21.2): su GPS, el ETA al centro, si la app está lista para
// la alarma, lo que llevan ahora, el efectivo y los retornos bajo su custodia (§17, §16) y sus rutas del día. La
// confiabilidad llega con las métricas. Se refresca cada 30 segundos: el ETA se le pide a Google solo si tiene más de un
// minuto (§7.2).
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Link, Paper, Stack, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import { ago, api, CenterRider, cashText, clock, errorMessage, mapsLink } from "./logistics";

/** Por qué no le sonaría la alarma (§6.1: "app con notificaciones habilitadas… permisos de ubicación"). */
const alarmProblem = (r: CenterRider) =>
    !r.has_push ? "No abrió la app en su teléfono" :
    r.notifications_enabled === false ? "Notificaciones apagadas" :
    r.location_permission !== "siempre" ? "Ubicación no permitida siempre" : null;

export const RidersPanel: React.FC<{ centerId: number }> = ({ centerId }) => {
    const [riders, setRiders] = useState<CenterRider[] | null>(null);
    const [warning, setWarning] = useState<string | null>(null);
    const [limit, setLimit] = useState<number | null>(null);
    const [cashFor, setCashFor] = useState<CenterRider | null>(null);

    const load = useCallback(() => {
        api<{ riders: CenterRider[]; warning: string | null; cash_limit_usd: number }>(`/logistics/centers/${centerId}/riders`)
            .then((r) => { setRiders(r.riders); setWarning(r.warning); setLimit(r.cash_limit_usd); })
            .catch((e) => toast.error(errorMessage(e)));
    }, [centerId]);

    useEffect(() => {
        load();
        const poll = setInterval(load, 30000);
        return () => clearInterval(poll);
    }, [load]);

    if (!riders) return <Typography color="text.secondary" sx={{ p: 2 }}>Cargando riders…</Typography>;

    return (
        <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
            {warning && <Alert severity="warning" sx={{ m: 2, mb: 0 }}>{warning}</Alert>}
            {riders.length === 0 ? <Typography color="text.secondary" sx={{ p: 2 }}>El centro todavía no tiene riders. Los da de alta el Admin en Configuración.</Typography> : (
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Rider</TableCell><TableCell>GPS</TableCell><TableCell>Llega al centro</TableCell><TableCell>Alarma</TableCell>
                                <TableCell>Ahora</TableCell><TableCell>Efectivo{limit ? ` (tope $${limit})` : ""}</TableCell><TableCell align="right">Rutas hoy</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {riders.map((r) => {
                                const problem = alarmProblem(r);
                                const off = !r.is_active || !!r.suspended_at;
                                const holds = r.cash.usd !== 0 || r.cash.ves !== 0;
                                return (
                                    <TableRow key={r.id} sx={off ? { opacity: 0.55 } : undefined}>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.user?.names ?? `#${r.user_id}`}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {r.suspended_at ? `Suspendido${r.suspended_reason ? `: ${r.suspended_reason}` : ""}` : !r.is_active ? "Inactivo" : r.user?.phone ?? ""}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip size="small" variant="outlined" color={r.gps_ok ? "success" : "warning"} label={ago(r.last_location_at)} />
                                            {r.mock_location_at && <Chip size="small" color="error" label="GPS falso: fuera de las rondas" sx={{ ml: 0.5 }} />}
                                            {r.last_lat !== null && r.last_lng !== null && (
                                                <Link href={mapsLink(r.last_lat, r.last_lng)} target="_blank" rel="noopener" variant="caption" sx={{ display: "block", mt: 0.5 }}>Ver en el mapa</Link>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {r.eta_center_seconds !== null ? `${clock(r.eta_center_seconds)} min` : "—"}
                                            {r.eta_center_meters !== null && <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{(r.eta_center_meters / 1000).toFixed(1)} km</Typography>}
                                        </TableCell>
                                        <TableCell>
                                            {r.alarm_ready ? <Chip size="small" color="success" label="Lista" /> : <Chip size="small" color="warning" label={problem ?? "Revisar"} />}
                                            {r.push_error && <Typography variant="caption" color="error" sx={{ display: "block" }}>{r.push_error}</Typography>}
                                        </TableCell>
                                        <TableCell>
                                            {r.current.length === 0 && r.returns_pending === 0 ? <Typography variant="body2" color="text.secondary">Libre</Typography> : (
                                                <Stack spacing={0.5}>
                                                    {r.current.map((c) => <Typography key={c.logistics_order_id} variant="body2">{c.order} · {c.status_label}</Typography>)}
                                                    {r.returns_pending > 0 && <Typography variant="body2" color="warning.main">{r.returns_pending} retorno(s) por devolver</Typography>}
                                                </Stack>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                                                <Chip size="small" variant={r.cash_over_limit ? "filled" : "outlined"} color={r.cash_over_limit ? "error" : holds ? "primary" : "default"}
                                                    label={`$${r.cash.total_usd.toFixed(2)}`} />
                                                {holds && <Button size="small" variant={r.cash_over_limit ? "contained" : "text"} color={r.cash_over_limit ? "error" : "primary"}
                                                    onClick={() => setCashFor(r)}>Recibir</Button>}
                                            </Stack>
                                            {holds && <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{cashText(r.cash)}</Typography>}
                                        </TableCell>
                                        <TableCell align="right">{r.routes_today}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
            <CashDialog centerId={centerId} rider={cashFor} onClose={() => setCashFor(null)} onDone={() => { setCashFor(null); load(); }} />
        </Paper>
    );
};

/** §17 puntos 4 y 5: el operador cuenta lo que entrega el rider. Si no cuadra con lo esperado, queda la incidencia de caja. */
const CashDialog: React.FC<{ centerId: number; rider: CenterRider | null; onClose: () => void; onDone: () => void }> = ({ centerId, rider, onClose, onDone }) => {
    const [usd, setUsd] = useState("");
    const [ves, setVes] = useState("");
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        setUsd(rider ? String(rider.cash.usd) : "");
        setVes(rider ? String(rider.cash.ves) : "");
        setNote("");
    }, [rider]);

    const num = (s: string) => Number(s.replace(",", ".")) || 0;
    const differs = rider !== null && (Math.abs(num(usd) - rider.cash.usd) >= 0.01 || Math.abs(num(ves) - rider.cash.ves) >= 0.01);

    const save = async () => {
        if (!rider) return;
        setBusy(true);
        try {
            const r = await api<{ message: string }>(`/logistics/centers/${centerId}/riders/${rider.user_id}/cash`, "POST", { usd: num(usd), ves: num(ves), note: note || null });
            if (differs) toast.warning(r.message); else toast.success(r.message);
            onDone();
        } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
    };

    return (
        <Dialog open={!!rider} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Recibir efectivo de {rider?.user?.names ?? "el rider"}</DialogTitle>
            <DialogContent>
                {rider && <Typography variant="body2" sx={{ mb: 2 }}>Debe entregar: <b>{cashText(rider.cash)}</b> (USD {rider.cash.total_usd.toFixed(2)} en total).</Typography>}
                <Stack spacing={1.5}>
                    <TextField label="Dólares recibidos" value={usd} onChange={(e) => setUsd(e.target.value)} size="small" inputMode="decimal" fullWidth />
                    <TextField label="Bolívares recibidos" value={ves} onChange={(e) => setVes(e.target.value)} size="small" inputMode="decimal" fullWidth />
                    <TextField label="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} size="small" fullWidth />
                </Stack>
                {differs && <Alert severity="warning" sx={{ mt: 2 }}>No cuadra con lo esperado: queda una incidencia de caja y la diferencia sigue en su saldo.</Alert>}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button variant="contained" onClick={save} disabled={busy || (num(usd) <= 0 && num(ves) <= 0)}>Registrar entrega</Button>
            </DialogActions>
        </Dialog>
    );
};
