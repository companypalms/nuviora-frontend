// src/components/finance/TransferTripsPanel.tsx
// Viajes de traslado en Inventario › Operaciones (Módulo 4 de Fran, §13, §14, R8): se registran al hacer los traslados.
// Un viaje junta los traslados que se hicieron juntos (varios destinos) y se paga una vez; su costo se reparte entre las
// unidades movidas y se suma al costo de esas unidades cuando se venden. Muestra lo gastado en transporte del mes (§13).
// Solo el Admin. Nada se borra: un viaje se corrige con motivo o se anula (§83).
import React, { useCallback, useEffect, useState } from "react";
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, Menu, MenuItem, Stack, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import MoreVertRounded from "@mui/icons-material/MoreVertRounded";
import { toast } from "react-toastify";
import { Panel, PanelHeader } from "../ui/surface/Panel";
import { AuditHistoryDialog } from "./AuditHistoryDialog";
import { TripDialog } from "./TripDialog";
import { FinanceOptions, Trip, TripsResponse, api, day, download, errorMessage, inCurrency, money, monthRange, usd4 } from "./finance";

const VoidTripDialog: React.FC<{ trip: Trip | null; onClose: () => void; onDone: () => void }> = ({ trip, onClose, onDone }) => {
    const [reason, setReason] = useState("");
    const [saving, setSaving] = useState(false);
    const submit = async () => {
        if (!trip) return;
        setSaving(true);
        try {
            toast.success((await api<{ message: string }>(`/finance/trips/${trip.id}/void`, "POST", { reason })).message);
            setReason("");
            onDone();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };
    return (
        <Dialog open={trip !== null} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Anular viaje</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ mb: 2 }}>
                    El viaje del {day(trip?.trip_date)} ({money(trip?.total_usd)}) deja de contar: sus traslados quedan libres para otro viaje y su costo sale
                    de la logística y de los gastos. No se borra: queda a la vista con el motivo.
                </DialogContentText>
                <TextField label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} fullWidth required autoFocus inputProps={{ maxLength: 500 }} />
            </DialogContent>
            <DialogActions>
                <Button color="inherit" onClick={onClose}>Cancelar</Button>
                <Button color="error" variant="contained" onClick={submit} disabled={saving || reason.trim() === ""}>Anular</Button>
            </DialogActions>
        </Dialog>
    );
};

export const TransferTripsPanel: React.FC = () => {
    const [options, setOptions] = useState<FinanceOptions | null>(null);
    const [[from, to], setRange] = useState<[string, string]>(monthRange());
    const [data, setData] = useState<TripsResponse | null>(null);
    const [editing, setEditing] = useState<Trip | null | "new">(null);
    const [voiding, setVoiding] = useState<Trip | null>(null);
    const [history, setHistory] = useState<Trip | null>(null);
    const [menu, setMenu] = useState<{ anchor: HTMLElement; trip: Trip } | null>(null);

    useEffect(() => { api<FinanceOptions>("/finance/options").then(setOptions).catch((e) => toast.error(errorMessage(e))); }, []);
    const load = useCallback(() => {
        api<TripsResponse>(`/finance/trips?from=${from}&to=${to}`).then(setData).catch((e) => toast.error(errorMessage(e)));
    }, [from, to]);
    useEffect(() => { load(); }, [load]);
    const act = (fn: (t: Trip) => void) => () => { if (menu) fn(menu.trip); setMenu(null); };

    return (
        <Panel>
            <PanelHeader title="Viajes de traslado"
                subtitle="Un viaje junta los traslados que se hicieron juntos y se paga una vez. Su costo se reparte entre las unidades movidas y se suma al costo de esas unidades cuando se venden."
                action={<Button variant="contained" onClick={() => setEditing("new")} disabled={!options}>Registrar viaje</Button>} />
            <Stack direction={{ xs: "column", sm: "row" }} gap={2} alignItems={{ sm: "center" }} flexWrap="wrap" sx={{ mb: 1.5 }}>
                <Stack direction="row" gap={1}>
                    <Chip label="Este mes" onClick={() => setRange(monthRange())} variant={from === monthRange()[0] ? "filled" : "outlined"} />
                    <Chip label="Mes pasado" onClick={() => setRange(monthRange(-1))} variant={from === monthRange(-1)[0] ? "filled" : "outlined"} />
                </Stack>
                {data && (
                    <Box>
                        <Typography variant="body2">
                            Transporte del {day(data.from)} al {day(data.to)}: <b>{money(data.summary.total_usd)}</b> en {data.summary.trips} viaje(s), {data.summary.units} unidades
                        </Typography>
                        <Typography variant="caption" color="text.secondary">Desgaste del vehículo: {data.wear.label} (se cambia en Finanzas › Configuración)</Typography>
                    </Box>
                )}
            </Stack>
            {!data ? <Typography color="text.secondary">Cargando…</Typography> : data.trips.length === 0 ? (
                <Typography color="text.secondary">No hay viajes en estas fechas.</Typography>
            ) : (
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Fecha</TableCell><TableCell>Ruta</TableCell><TableCell align="right">Unidades</TableCell>
                                <TableCell align="right">Costo</TableCell><TableCell align="right">Por unidad</TableCell><TableCell />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.trips.map((t) => (
                                <TableRow key={t.id} sx={{ opacity: t.voided_at ? 0.55 : 1 }}>
                                    <TableCell sx={{ whiteSpace: "nowrap" }}>{day(t.trip_date)}</TableCell>
                                    <TableCell sx={{ minWidth: 180 }}>
                                        <Typography variant="body2" sx={{ textDecoration: t.voided_at ? "line-through" : "none" }}>
                                            {t.description || t.destinations.join(", ") || "—"}
                                        </Typography>
                                        <Typography variant="caption" color={t.voided_at ? "error" : "text.secondary"}>
                                            {t.voided_at ? `Anulado: ${t.void_reason}` : `${t.movements.length} traslado(s) · a ${t.destinations.join(", ")}`}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">{t.units}</TableCell>
                                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                                        <Tooltip title={`Mano de obra ${inCurrency(t.labor, t.currency)} · combustible ${inCurrency(t.fuel, t.currency)} · otros ${inCurrency(t.other, t.currency)} · desgaste ${inCurrency(t.wear, t.currency)}`}>
                                            <span>{money(t.total_usd)}</span>
                                        </Tooltip>
                                        {t.currency === "VES" && <Typography variant="caption" color="text.secondary" display="block">{inCurrency(t.total, t.currency)}</Typography>}
                                    </TableCell>
                                    <TableCell align="right" sx={{ whiteSpace: "nowrap", fontWeight: 600 }}>{usd4(t.unit_cost_usd)}</TableCell>
                                    <TableCell padding="checkbox">
                                        <Tooltip title="Acciones">
                                            <IconButton size="small" aria-label={`Acciones del viaje del ${day(t.trip_date)}`} onClick={(ev) => setMenu({ anchor: ev.currentTarget, trip: t })}>
                                                <MoreVertRounded fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <Menu anchorEl={menu?.anchor} open={menu !== null} onClose={() => setMenu(null)}>
                {menu?.trip.has_receipt && <MenuItem onClick={act((t) => download(`/finance/trips/${t.id}/receipt`, `viaje-${t.id}`))}>Ver comprobante</MenuItem>}
                {!menu?.trip.voided_at && <MenuItem onClick={act(setEditing)}>Corregir</MenuItem>}
                {!menu?.trip.voided_at && <MenuItem onClick={act(setVoiding)} sx={{ color: "error.main" }}>Anular</MenuItem>}
                <MenuItem onClick={act(setHistory)}>Historial</MenuItem>
            </Menu>

            {options && (
                <TripDialog open={editing !== null} trip={editing === "new" ? null : editing} options={options} onClose={() => setEditing(null)}
                    onSaved={() => { setEditing(null); load(); }} />
            )}
            <VoidTripDialog trip={voiding} onClose={() => setVoiding(null)} onDone={() => { setVoiding(null); load(); }} />
            <AuditHistoryDialog subject={history ? { type: "inventory_trip", id: history.id, title: `Viaje del ${day(history.trip_date)}` } : null} onClose={() => setHistory(null)} />
        </Panel>
    );
};
