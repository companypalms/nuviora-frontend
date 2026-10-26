// src/components/logistics/PayoutsPanel.tsx
// El cierre diario de honorarios de los riders (logística propia, §18.5): el sistema calcula lo de cada rider (sus entregas
// por tarifario y la ida cuando el cliente no recibió, R7), administración manda el fondo y el operador le paga a cada
// uno exactamente lo indicado, con el método. Es aparte del efectivo COD (§17).
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert, Box, Button, Chip, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Paper, Stack, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { ExpandLessRounded, ExpandMoreRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { api, errorMessage, hour } from "./logistics";

type Trip = { concept: string; label: string; order_id: number | null; order: string | null; km: number | null; amount: number | null };
type RiderDay = {
    rider_id: number; name: string | null; trips: Trip[]; total: number; paid: number; pending: number; missing_tariff: boolean; has_tariff: boolean;
    payouts: { id: number; amount: number; method: string; method_label: string; paid_at: string; paid_by: string | null }[];
};
type DayResponse = { date: string; riders: RiderDay[]; fund_needed: number; methods: Record<string, string> };

const usd = (n: number | null) => (n === null ? "—" : `$${n.toFixed(2)}`);
const todayLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const PayoutsPanel: React.FC<{ centerId: number }> = ({ centerId }) => {
    const [date, setDate] = useState(todayLocal());
    const [data, setData] = useState<DayResponse | null>(null);
    const [open, setOpen] = useState<number | null>(null);
    const [paying, setPaying] = useState<RiderDay | null>(null);

    const load = useCallback(() => {
        api<DayResponse>(`/logistics/centers/${centerId}/payouts?date=${date}`).then(setData).catch((e) => toast.error(errorMessage(e)));
    }, [centerId, date]);
    useEffect(() => { load(); }, [load]);

    return (
        <Stack spacing={2}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
                    <Box>
                        <Typography variant="h6">Pagos de los riders</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Cada carrera se paga con el tarifario del rider; la ida, si el cliente no recibió. El regreso al centro no se paga.
                        </Typography>
                    </Box>
                    <TextField type="date" size="small" label="Día" value={date} onChange={(e) => setDate(e.target.value)} inputProps={{ max: todayLocal() }}
                        InputLabelProps={{ shrink: true }} />
                </Stack>
                {data && data.fund_needed > 0 && (
                    <Alert severity="info" sx={{ mt: 1.5 }}>Fondo que hace falta para pagar lo pendiente de ese día: <b>{usd(data.fund_needed)}</b>.</Alert>
                )}
            </Paper>

            <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
                {!data ? <Typography color="text.secondary" sx={{ p: 2 }}>Cargando…</Typography>
                    : data.riders.length === 0 ? <Typography color="text.secondary" sx={{ p: 2 }}>Ningún rider hizo carreras ese día.</Typography> : (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell /><TableCell>Rider</TableCell><TableCell align="right">Carreras</TableCell><TableCell align="right">Total</TableCell>
                                        <TableCell align="right">Pagado</TableCell><TableCell align="right">Pendiente</TableCell><TableCell align="right" />
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {data.riders.map((r) => (
                                        <React.Fragment key={r.rider_id}>
                                            <TableRow hover>
                                                <TableCell padding="checkbox">
                                                    <IconButton size="small" onClick={() => setOpen(open === r.rider_id ? null : r.rider_id)}>
                                                        {open === r.rider_id ? <ExpandLessRounded fontSize="small" /> : <ExpandMoreRounded fontSize="small" />}
                                                    </IconButton>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.name ?? `#${r.rider_id}`}</Typography>
                                                    {!r.has_tariff && <Typography variant="caption" color="error">Sin tarifario cargado</Typography>}
                                                </TableCell>
                                                <TableCell align="right">{r.trips.length}</TableCell>
                                                <TableCell align="right">{usd(r.total)}</TableCell>
                                                <TableCell align="right">{usd(r.paid)}</TableCell>
                                                <TableCell align="right">
                                                    <Chip size="small" color={r.pending > 0 ? "warning" : "success"} variant={r.pending > 0 ? "filled" : "outlined"} label={usd(r.pending)} />
                                                </TableCell>
                                                <TableCell align="right">
                                                    {r.pending > 0 && <Button size="small" variant="contained" disabled={r.missing_tariff} onClick={() => setPaying(r)}>Pagar</Button>}
                                                </TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell colSpan={7} sx={{ py: 0, borderBottom: open === r.rider_id ? undefined : "none" }}>
                                                    <Collapse in={open === r.rider_id} unmountOnExit>
                                                        <Box sx={{ py: 1.5 }}>
                                                            {r.missing_tariff && <Alert severity="error" sx={{ mb: 1 }}>Hay una carrera sin monto: cárgale el tarifario al rider en Tarifas de delivery antes de pagar.</Alert>}
                                                            {r.trips.map((t, i) => (
                                                                <Typography key={i} variant="body2">
                                                                    {t.label} · {t.order ?? `#${t.order_id}`}{t.km !== null ? ` · ${t.km} km` : ""} · <b>{usd(t.amount)}</b>
                                                                </Typography>
                                                            ))}
                                                            {r.payouts.map((p) => (
                                                                <Typography key={p.id} variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                                                                    Pagado {usd(p.amount)} por {p.method_label} a las {hour(p.paid_at)}{p.paid_by ? ` (${p.paid_by})` : ""}
                                                                </Typography>
                                                            ))}
                                                        </Box>
                                                    </Collapse>
                                                </TableCell>
                                            </TableRow>
                                        </React.Fragment>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
            </Paper>
            {data && <PayDialog centerId={centerId} date={date} rider={paying} methods={data.methods} onClose={() => setPaying(null)} onDone={() => { setPaying(null); load(); }} />}
        </Stack>
    );
};

/** §18.5: se paga exactamente lo indicado; el operador elige el método. */
const PayDialog: React.FC<{ centerId: number; date: string; rider: RiderDay | null; methods: Record<string, string>; onClose: () => void; onDone: () => void }> = (
    { centerId, date, rider, methods, onClose, onDone },
) => {
    const [method, setMethod] = useState("");
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    useEffect(() => { setMethod(""); setNote(""); }, [rider]);

    const pay = async () => {
        if (!rider) return;
        setBusy(true);
        try {
            const r = await api<{ message: string }>(`/logistics/centers/${centerId}/riders/${rider.rider_id}/payout`, "POST",
                { date, amount: rider.pending, method, note: note || null });
            toast.success(r.message);
            onDone();
        } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
    };

    return (
        <Dialog open={!!rider} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Pagar a {rider?.name ?? "el rider"}</DialogTitle>
            <DialogContent>
                <Typography sx={{ mb: 2 }}>Monto: <b>{usd(rider?.pending ?? 0)}</b> ({rider?.trips.length ?? 0} carrera(s)). Se paga exactamente esto.</Typography>
                <Stack spacing={1.5}>
                    <TextField select label="Cómo se le pagó" value={method} onChange={(e) => setMethod(e.target.value)} size="small" fullWidth>
                        {Object.entries(methods).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                    </TextField>
                    <TextField label="Referencia o nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} size="small" fullWidth />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button variant="contained" onClick={pay} disabled={busy || !method}>Registrar pago</Button>
            </DialogActions>
        </Dialog>
    );
};
