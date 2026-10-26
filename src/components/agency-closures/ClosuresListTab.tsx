// src/components/agency-closures/ClosuresListTab.tsx
// Los cierres semanales de las agencias (Módulo 3, §31, §36): una fila por agencia y semana con lo que el sistema
// calculó, lo que cobra la agencia y lo que falta revisar. Al entrar, se ve solo lo que no cuadra (§32).
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { AddRounded, ChevronRightRounded } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Panel } from "../ui/surface/Panel";
import { Closure, STATUS_COLOR, api, money, signedMoney } from "./closures";

type ListResponse = { closures: Closure[]; agencies: { id: number; name: string }[]; statuses: Record<string, string> };

const NewClosureDialog: React.FC<{ agencies: { id: number; name: string }[]; onClose: () => void; onCreated: (id: number) => void }> = ({ agencies, onClose, onCreated }) => {
    const [form, setForm] = useState({ agency_id: "", week: "" });
    const [saving, setSaving] = useState(false);
    const save = async () => {
        setSaving(true);
        try {
            const r = await api<{ id: number; created: boolean }>("/delivery/closures", "POST", { agency_id: Number(form.agency_id), week: form.week });
            toast.success(r.created ? "Cierre abierto." : "Ese cierre ya existía.");
            onCreated(r.id);
        } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
    };
    return (
        <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>Abrir un cierre</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Cada lunes se abre solo el cierre de la semana anterior de cada agencia con carreras. Úsalo para una semana que no se abrió.
                </Typography>
                <Stack spacing={2}>
                    <TextField select label="Agencia" value={form.agency_id} onChange={(e) => setForm({ ...form, agency_id: e.target.value })}>
                        {agencies.map((a) => <MenuItem key={a.id} value={String(a.id)}>{a.name}</MenuItem>)}
                    </TextField>
                    <TextField type="date" label="Un día de la semana" value={form.week} onChange={(e) => setForm({ ...form, week: e.target.value })}
                        InputLabelProps={{ shrink: true }} helperText="La semana va de lunes a domingo." />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button variant="contained" onClick={save} disabled={saving || !form.agency_id || !form.week}>Abrir</Button>
            </DialogActions>
        </Dialog>
    );
};

/** §31: "✅ 93 coinciden ⚠ 7 discrepancias ❓ 2 sin matching", en palabras. */
const Counts: React.FC<{ c: Closure }> = ({ c }) => {
    const s = c.summary;
    if (!s || s.rows === undefined) return <Typography variant="caption" color="text.secondary">—</Typography>;
    return (
        <Stack direction="row" gap={0.5} flexWrap="wrap">
            <Chip size="small" color="success" variant="outlined" label={`${s.ok} coinciden`} />
            {!!s.discrepancies && <Chip size="small" color="warning" variant="outlined" label={`${s.discrepancies} con diferencia`} />}
            {!!s.unmatched && <Chip size="small" color="error" variant="outlined" label={`${s.unmatched} sin emparejar`} />}
        </Stack>
    );
};

export const ClosuresListTab: React.FC = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<ListResponse | null>(null);
    const [filters, setFilters] = useState({ agency_id: "", status: "" });
    const [creating, setCreating] = useState(false);

    const load = useCallback(() => {
        const q = new URLSearchParams();
        if (filters.agency_id) q.set("agency_id", filters.agency_id);
        if (filters.status) q.set("status", filters.status);
        api<ListResponse>(`/delivery/closures?${q}`).then(setData).catch((e) => toast.error(e.message));
    }, [filters]);
    useEffect(() => { load(); }, [load]);

    if (!data) return <Typography sx={{ p: 2 }}>Cargando…</Typography>;
    const toReview = data.closures.filter((c) => c.status === "pendiente_revision").length;
    const toPay = data.closures.filter((c) => c.status === "listo_pago").length;

    return (
        <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
                Cada semana (lunes a domingo) la agencia sube su archivo de cierre. El sistema empareja cada carrera, compara lo que cobra con lo que calculó
                y solo te muestra lo que no cuadra. Cuando resuelves todo, queda el monto final aprobado y el cierre pasa a "Listo para pago".
            </Typography>
            {(toReview > 0 || toPay > 0) && (
                <Alert severity="info">
                    {[toReview && `${toReview} ${toReview === 1 ? "cierre por revisar" : "cierres por revisar"}`, toPay && `${toPay} ${toPay === 1 ? "listo" : "listos"} para pago`].filter(Boolean).join(" · ")}
                </Alert>
            )}
            <Stack direction={{ xs: "column", sm: "row" }} gap={1} alignItems={{ sm: "center" }}>
                <TextField select size="small" label="Agencia" value={filters.agency_id} onChange={(e) => setFilters({ ...filters, agency_id: e.target.value })} sx={{ minWidth: 170 }}>
                    <MenuItem value="">Todas</MenuItem>
                    {data.agencies.map((a) => <MenuItem key={a.id} value={String(a.id)}>{a.name}</MenuItem>)}
                </TextField>
                <TextField select size="small" label="Estado" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} sx={{ minWidth: 190 }}>
                    <MenuItem value="">Todos</MenuItem>
                    {Object.entries(data.statuses).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                </TextField>
                <Box sx={{ flex: 1 }} />
                <Button startIcon={<AddRounded />} onClick={() => setCreating(true)}>Abrir un cierre</Button>
            </Stack>

            <Panel sx={{ p: 0, overflow: "hidden" }}>
                {data.closures.length === 0 ? (
                    <Typography sx={{ p: 2 }} color="text.secondary">
                        Todavía no hay cierres. El primero se abre el lunes, con la semana anterior de cada agencia que tuvo carreras.
                    </Typography>
                ) : (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Agencia / semana</TableCell><TableCell>Estado</TableCell>
                                    <TableCell align="right">Cálculo interno</TableCell><TableCell align="right">Reportado</TableCell>
                                    <TableCell align="right">Diferencia</TableCell><TableCell align="right">Monto final</TableCell>
                                    <TableCell>Carreras</TableCell><TableCell />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.closures.map((c) => (
                                    <TableRow key={c.id} hover sx={{ cursor: "pointer" }} onClick={() => navigate(`/admin/cierres-agencias/${c.id}`)}>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600}>{c.agency}</Typography>
                                            <Typography variant="caption" color="text.secondary">Semana {c.week}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip size="small" color={STATUS_COLOR[c.status]} label={c.status_label} />
                                            {c.processing_error && <Typography variant="caption" color="error" sx={{ display: "block", maxWidth: 220 }}>No se pudo procesar el archivo</Typography>}
                                            {c.reminder_due && <Typography variant="caption" color="warning.main" sx={{ display: "block" }}>Aviso activo para la agencia</Typography>}
                                        </TableCell>
                                        <TableCell align="right">{money(c.expected_total)}</TableCell>
                                        <TableCell align="right">{money(c.reported_total)}</TableCell>
                                        <TableCell align="right" sx={{ color: (c.difference ?? 0) > 0 ? "warning.main" : undefined, whiteSpace: "nowrap" }}>{signedMoney(c.difference)}</TableCell>
                                        <TableCell align="right"><Typography variant="body2" fontWeight={600}>{money(c.final_approved_total)}</Typography></TableCell>
                                        <TableCell sx={{ minWidth: 180 }}><Counts c={c} /></TableCell>
                                        <TableCell align="right"><ChevronRightRounded color="action" /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Panel>
            {creating && <NewClosureDialog agencies={data.agencies} onClose={() => setCreating(false)} onCreated={(id) => navigate(`/admin/cierres-agencias/${id}`)} />}
        </Stack>
    );
};
