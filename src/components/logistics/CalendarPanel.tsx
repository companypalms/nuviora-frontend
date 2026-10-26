// src/components/logistics/CalendarPanel.tsx
// El calendario de operadores del centro (logística propia, §4.1): quién está programado cada día (patrón 12/4 u otro,
// en días corridos; los días que el centro cierra no se programan), los cambios por fecha y, en los días que ya pasaron,
// quién abrió y cerró el turno de verdad. Los patrones y los cambios los carga administración.
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert, Box, Button, Chip, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import { api, errorMessage, hour } from "./logistics";

type Day = {
    date: string; user_id: number | null; name: string | null; start: string | null; end: string | null;
    source: "patron" | "cambio" | "cerrado" | "sin_programar"; reason: string | null; conflict: boolean;
    actual: { opened_by: string | null; started_at: string; ended_at: string | null; close_type: string | null }[];
};
type Pattern = { id: number; user: { id: number; names: string } | null; starts_on: string; days_on: number; days_off: number; start_time: string | null; end_time: string | null; is_active: boolean };
type Override = { id: number; date: string; user: { id: number; names: string } | null; reason: string; note: string | null };
type Setup = { patterns: Pattern[]; overrides: Override[]; reasons: Record<string, string>; operators: { id: number; names: string; coverage: string }[] };

const weekday = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("es-VE", { weekday: "short", day: "2-digit", month: "2-digit" });
const today = new Date().toISOString().slice(0, 10);

export const CalendarPanel: React.FC<{ centerId: number; isAdmin: boolean }> = ({ centerId, isAdmin }) => {
    const [days, setDays] = useState<Day[] | null>(null);
    const [setup, setSetup] = useState<Setup | null>(null);
    const [pattern, setPattern] = useState({ user_id: "", starts_on: today, days_on: "12", days_off: "4" });
    const [change, setChange] = useState({ date: today, user_id: "", reason: "sustitucion", note: "" });

    const load = useCallback(() => {
        api<{ days: Day[] }>(`/logistics/centers/${centerId}/calendar`).then((r) => setDays(r.days)).catch((e) => toast.error(errorMessage(e)));
        if (isAdmin) api<Setup>(`/logistics/centers/${centerId}/calendar-setup`).then(setSetup).catch((e) => toast.error(errorMessage(e)));
    }, [centerId, isAdmin]);
    useEffect(() => { load(); }, [load]);

    const run = async (path: string, method: "POST" | "PUT" | "DELETE", body?: object) => {
        try {
            const r = await api<{ message: string }>(path, method, body);
            toast.success(r.message);
            load();
        } catch (e) { toast.error(errorMessage(e)); }
    };

    return (
        <Stack spacing={2}>
            <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
                <Box sx={{ px: 2, pt: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Quién abre cada día</Typography>
                    <Typography variant="caption" color="text.secondary">La semana pasada y las próximas cuatro. En los días que ya pasaron, quién abrió y cerró de verdad.</Typography>
                </Box>
                {!days ? <Typography color="text.secondary" sx={{ p: 2 }}>Cargando…</Typography> : (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow><TableCell>Día</TableCell><TableCell>Programado</TableCell><TableCell>Horario</TableCell><TableCell>Turno real</TableCell></TableRow>
                            </TableHead>
                            <TableBody>
                                {days.map((d) => (
                                    <TableRow key={d.date} selected={d.date === today}>
                                        <TableCell sx={{ textTransform: "capitalize" }}>{weekday(d.date)}</TableCell>
                                        <TableCell>
                                            {d.source === "cerrado" ? <Typography variant="body2" color="text.secondary">Cerrado</Typography>
                                                : d.name ? <Typography variant="body2">{d.name}</Typography>
                                                : <Chip size="small" color="warning" label="Nadie programado" />}
                                            {d.source === "cambio" && <Chip size="small" variant="outlined" sx={{ ml: 1 }} label={d.reason ?? "Cambio"} />}
                                            {d.conflict && <Chip size="small" color="error" sx={{ ml: 1 }} label="Dos patrones ese día" />}
                                        </TableCell>
                                        <TableCell>{d.start && d.end ? `${d.start} a ${d.end}` : "—"}</TableCell>
                                        <TableCell>
                                            {d.actual.length === 0 ? "—" : d.actual.map((a, i) => (
                                                <Typography key={i} variant="body2">
                                                    {a.opened_by ?? "?"} abrió a las {hour(a.started_at)}{a.ended_at ? `, cerró a las ${hour(a.ended_at)}` : " (abierto)"}
                                                </Typography>
                                            ))}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            {isAdmin && setup && (
                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Patrones</Typography>
                        <Typography variant="caption" color="text.secondary">Días corridos desde la fecha de inicio (no se reinician los lunes). Por ejemplo, 12 trabajados y 4 libres.</Typography>
                        <Stack spacing={1} sx={{ my: 1.5 }}>
                            {setup.patterns.length === 0 && <Alert severity="info">Todavía no hay patrones.</Alert>}
                            {setup.patterns.map((p) => (
                                <Stack key={p.id} direction="row" spacing={1} sx={{ alignItems: "center", opacity: p.is_active ? 1 : 0.5 }}>
                                    <Typography variant="body2" sx={{ flex: 1 }}>
                                        <b>{p.user?.names}</b>: {p.days_on} trabajados / {p.days_off} libres desde {p.starts_on.slice(0, 10)}
                                        {p.start_time ? ` · ${p.start_time.slice(0, 5)}–${p.end_time?.slice(0, 5)}` : ""}{p.is_active ? "" : " (apagado)"}
                                    </Typography>
                                    {p.is_active && <Button size="small" color="error" onClick={() => run(`/logistics/centers/${centerId}/patterns/${p.id}/disable`, "PUT")}>Apagar</Button>}
                                </Stack>
                            ))}
                        </Stack>
                        <Stack spacing={1.5}>
                            <TextField select size="small" label="Operador" value={pattern.user_id} onChange={(e) => setPattern({ ...pattern, user_id: e.target.value })}>
                                {setup.operators.map((o) => <MenuItem key={o.id} value={String(o.id)}>{o.names} ({o.coverage})</MenuItem>)}
                            </TextField>
                            <Stack direction="row" spacing={1}>
                                <TextField type="date" size="small" label="Desde" value={pattern.starts_on} onChange={(e) => setPattern({ ...pattern, starts_on: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
                                <TextField size="small" label="Trabaja" value={pattern.days_on} onChange={(e) => setPattern({ ...pattern, days_on: e.target.value })} sx={{ width: 100 }} />
                                <TextField size="small" label="Libra" value={pattern.days_off} onChange={(e) => setPattern({ ...pattern, days_off: e.target.value })} sx={{ width: 100 }} />
                            </Stack>
                            <Button variant="contained" disabled={!pattern.user_id}
                                onClick={() => run(`/logistics/centers/${centerId}/patterns`, "POST", { user_id: Number(pattern.user_id), starts_on: pattern.starts_on, days_on: Number(pattern.days_on), days_off: Number(pattern.days_off) })}>
                                Agregar patrón
                            </Button>
                        </Stack>
                    </Paper>

                    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Cambios de un día</Typography>
                        <Typography variant="caption" color="text.secondary">Sustituciones, vacaciones, ausencias y cambios de último minuto. Mandan sobre el patrón ese día.</Typography>
                        <Stack spacing={1} sx={{ my: 1.5 }}>
                            {setup.overrides.map((o) => (
                                <Stack key={o.id} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                                    <Typography variant="body2" sx={{ flex: 1 }}>
                                        <b>{o.date.slice(0, 10)}</b>: {o.user?.names ?? "nadie"} · {setup.reasons[o.reason] ?? o.reason}{o.note ? ` · ${o.note}` : ""}
                                    </Typography>
                                    <Button size="small" color="error" onClick={() => run(`/logistics/centers/${centerId}/overrides/${o.id}`, "DELETE")}>Borrar</Button>
                                </Stack>
                            ))}
                        </Stack>
                        <Stack spacing={1.5}>
                            <Stack direction="row" spacing={1}>
                                <TextField type="date" size="small" label="Día" value={change.date} onChange={(e) => setChange({ ...change, date: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
                                <TextField select size="small" label="Motivo" value={change.reason} onChange={(e) => setChange({ ...change, reason: e.target.value })} fullWidth>
                                    {Object.entries(setup.reasons).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                                </TextField>
                            </Stack>
                            <TextField select size="small" label="Quién trabaja ese día" value={change.user_id} onChange={(e) => setChange({ ...change, user_id: e.target.value })}>
                                <MenuItem value="">Nadie</MenuItem>
                                {setup.operators.map((o) => <MenuItem key={o.id} value={String(o.id)}>{o.names}</MenuItem>)}
                            </TextField>
                            <TextField size="small" label="Nota (opcional)" value={change.note} onChange={(e) => setChange({ ...change, note: e.target.value })} />
                            <Button variant="contained"
                                onClick={() => run(`/logistics/centers/${centerId}/overrides`, "POST", { date: change.date, user_id: change.user_id ? Number(change.user_id) : null, reason: change.reason, note: change.note || null })}>
                                Guardar el cambio
                            </Button>
                        </Stack>
                    </Paper>
                </Box>
            )}
        </Stack>
    );
};
