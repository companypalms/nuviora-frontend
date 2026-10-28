// src/components/logistics/AdminConfig.tsx
// Configuración de la logística propia, solo Admin (§23, §33): el centro con su horario y su corte de despacho, los
// operadores, los días especiales, los parámetros con versión (§31) y los riders del centro. Nada se hardcodea (§30):
// todo lo que aquí se guarda lo usa el backend desde ese momento.
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, MenuItem, Paper,
    Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { DeleteRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { api, DAYS, errorMessage } from "./logistics";

type Hours = Record<string, [string, string] | null>;
type Option = { id: number; name: string };
type Operator = { id: number; names: string; email: string; pivot?: { coverage: "principal" | "suplente" } };
type Exception = { id: number; date: string; is_closed: boolean; opens_at: string | null; closes_at: string | null; note: string | null };
export type AdminCenter = {
    id: number; name: string; city_id: number; warehouse_id: number; address: string | null; dispatch_cutoff: string | null;
    opening_hours: Hours | null; is_active: boolean; state_label: string; activation_problems: string[];
    city: Option | null; warehouse: { id: number; name: string; latitude: number | null; longitude: number | null } | null;
    operators: Operator[]; exceptions_upcoming: Exception[];
};
type CentersResponse = {
    centers: AdminCenter[]; operator_candidates: { id: number; names: string; email: string }[];
    warehouses: { id: number; name: string; city_id: number | null; latitude: number | null; longitude: number | null }[];
};

const card = { p: 2, borderRadius: 3, border: "1px solid", borderColor: "divider" } as const;
const DEFAULT_HOURS: Hours = { 1: ["08:00", "19:00"], 2: ["08:00", "19:00"], 3: ["08:00", "19:00"], 4: ["08:00", "19:00"], 5: ["08:00", "19:00"], 6: ["08:00", "19:00"], 7: null };

/** El horario por día (§4: "horario por día, domingos/cierres"). También sirve para las franjas del rider (§23). */
const HoursEditor: React.FC<{ value: Hours; onChange: (h: Hours) => void }> = ({ value, onChange }) => (
    <Stack spacing={1}>
        {DAYS.map((d, i) => {
            const key = String(i + 1);
            const h = value[key] ?? null;
            return (
                <Stack key={key} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <FormControlLabel sx={{ width: 140, m: 0 }} label={d}
                        control={<Checkbox size="small" checked={!!h} onChange={(e) => onChange({ ...value, [key]: e.target.checked ? ["08:00", "19:00"] : null })} />} />
                    {h ? (
                        <>
                            <TextField size="small" type="time" value={h[0]} onChange={(e) => onChange({ ...value, [key]: [e.target.value, h[1]] })} sx={{ width: 150 }} />
                            <Typography variant="body2">a</Typography>
                            <TextField size="small" type="time" value={h[1]} onChange={(e) => onChange({ ...value, [key]: [h[0], e.target.value] })} sx={{ width: 150 }} />
                        </>
                    ) : <Typography variant="body2" color="text.secondary">Cerrado</Typography>}
                </Stack>
            );
        })}
    </Stack>
);

export const AdminConfig: React.FC<{ centerId: number | null; onCentersChanged: (selectId?: number) => void }> = ({ centerId, onCentersChanged }) => {
    const [data, setData] = useState<CentersResponse | null>(null);
    const [cities, setCities] = useState<Option[]>([]);
    const [creating, setCreating] = useState(false);

    const load = useCallback(() => {
        api<CentersResponse>("/logistics/centers").then(setData).catch((e) => toast.error(errorMessage(e)));
    }, []);
    useEffect(() => {
        load();
        api<Option[]>("/cities").then((c) => setCities(c.map((x) => ({ id: x.id, name: x.name })))).catch(() => setCities([]));
    }, [load]);

    if (!data) return <Typography color="text.secondary" sx={{ p: 2 }}>Cargando configuración…</Typography>;
    const center = data.centers.find((c) => c.id === centerId) ?? null;
    const saved = (id?: number) => { load(); onCentersChanged(id); };

    return (
        <Stack spacing={2}>
            {(creating || !center) ? (
                <CenterForm title="Nuevo centro" cities={cities} warehouses={data.warehouses} onCancel={center ? () => setCreating(false) : undefined}
                    onSaved={(id) => { setCreating(false); saved(id); }} />
            ) : (
                <>
                    <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
                        <Button size="small" onClick={() => setCreating(true)}>Crear otro centro</Button>
                    </Stack>
                    <ActivationCard center={center} onSaved={saved} />
                    <CenterForm key={center.id} title="Centro" center={center} cities={cities} warehouses={data.warehouses} onSaved={saved} />
                    <OperatorsCard center={center} candidates={data.operator_candidates} onSaved={saved} />
                    <ExceptionsCard center={center} onSaved={saved} />
                    <SettingsCard center={center} />
                    <RidersAdminCard centers={data.centers} centerId={center.id} />
                </>
            )}
        </Stack>
    );
};

/** Encender o apagar el centro de la ciudad. Encendido, "Asignar a agencia" manda las órdenes de la ciudad al centro. */
const ActivationCard: React.FC<{ center: AdminCenter; onSaved: () => void }> = ({ center, onSaved }) => {
    const [saving, setSaving] = useState(false);
    const toggle = async () => {
        setSaving(true);
        try {
            const r = await api<{ message: string }>(`/logistics/centers/${center.id}/active`, "PUT", { is_active: !center.is_active });
            toast.success(r.message);
            onSaved();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };

    return (
        <Paper elevation={0} sx={card}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}>
                <Box>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{center.name}</Typography>
                        <Chip size="small" color={center.is_active ? "success" : "default"} label={center.is_active ? "Encendido" : "Apagado"} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                        {center.is_active
                            ? `Las órdenes de ${center.city?.name ?? "la ciudad"} que pasan a "Asignar a agencia" van al centro.`
                            : `${center.city?.name ?? "La ciudad"} sigue con sus agencias, como siempre.`}
                    </Typography>
                </Box>
                <Button variant={center.is_active ? "outlined" : "contained"} color={center.is_active ? "inherit" : "primary"} disabled={saving} onClick={toggle}>
                    {center.is_active ? "Apagar" : "Encender"}
                </Button>
            </Stack>
            {!center.is_active && center.activation_problems.length > 0 && (
                <Alert severity="warning" sx={{ mt: 1.5 }}>
                    Para encenderlo falta:
                    {center.activation_problems.map((p, i) => <div key={i}>• {p}</div>)}
                </Alert>
            )}
        </Paper>
    );
};

const CenterForm: React.FC<{
    title: string; center?: AdminCenter; cities: Option[]; warehouses: CentersResponse["warehouses"];
    onSaved: (id?: number) => void; onCancel?: () => void;
}> = ({ title, center, cities, warehouses, onSaved, onCancel }) => {
    const [f, setF] = useState({
        name: center?.name ?? "", city_id: center?.city_id ? String(center.city_id) : "", warehouse_id: center?.warehouse_id ? String(center.warehouse_id) : "",
        address: center?.address ?? "", dispatch_cutoff: center?.dispatch_cutoff ? center.dispatch_cutoff.slice(0, 5) : "",
    });
    const [hours, setHours] = useState<Hours>(center?.opening_hours ?? DEFAULT_HOURS);
    const [saving, setSaving] = useState(false);
    const wh = warehouses.find((w) => String(w.id) === f.warehouse_id) ?? center?.warehouse ?? null;

    const submit = async () => {
        setSaving(true);
        try {
            const body = { ...f, city_id: Number(f.city_id), warehouse_id: Number(f.warehouse_id), address: f.address || null, dispatch_cutoff: f.dispatch_cutoff || null, opening_hours: hours };
            const r = center
                ? await api<{ message: string; center: { id: number } }>(`/logistics/centers/${center.id}`, "PUT", body)
                : await api<{ message: string; center: { id: number } }>("/logistics/centers", "POST", body);
            toast.success(r.message);
            onSaved(r.center.id);
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };

    return (
        <Paper elevation={0} sx={card}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>{title}</Typography>
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
                <TextField size="small" label="Nombre" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
                <TextField size="small" select label="Ciudad" value={f.city_id} onChange={(e) => setF({ ...f, city_id: e.target.value })}>
                    {cities.map((c) => <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>)}
                </TextField>
                <TextField size="small" select label="Almacén del centro" value={f.warehouse_id} onChange={(e) => setF({ ...f, warehouse_id: e.target.value })}
                    helperText={wh && (wh.latitude === null || wh.longitude === null) ? "Sin coordenadas: cárgalas en Tarifas de delivery › Almacenes." : " "}>
                    {warehouses.map((w) => <MenuItem key={w.id} value={String(w.id)}>{w.name}</MenuItem>)}
                </TextField>
                <TextField size="small" type="time" label="Corte de despacho" value={f.dispatch_cutoff} onChange={(e) => setF({ ...f, dispatch_cutoff: e.target.value })}
                    InputLabelProps={{ shrink: true }} helperText="Después de esta hora las órdenes nuevas esperan al día siguiente (§4.2)." />
                <TextField size="small" label="Dirección" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} sx={{ gridColumn: { md: "1 / -1" } }} />
            </Box>
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Horario</Typography>
            <HoursEditor value={hours} onChange={setHours} />
            <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: "flex-end" }}>
                {onCancel && <Button onClick={onCancel}>Cancelar</Button>}
                <Button variant="contained" disabled={saving || !f.name.trim() || !f.city_id || !f.warehouse_id} onClick={submit}>{center ? "Guardar" : "Crear centro (apagado)"}</Button>
            </Stack>
        </Paper>
    );
};

/** §4: el operador principal y el suplente. Solo usuarios con el rol "Operador logístico" (se crean en Usuarios). */
const OperatorsCard: React.FC<{ center: AdminCenter; candidates: CentersResponse["operator_candidates"]; onSaved: () => void }> = ({ center, candidates, onSaved }) => {
    const [rows, setRows] = useState(center.operators.map((o) => ({ user_id: o.id, coverage: o.pivot?.coverage ?? "principal" })));
    const [adding, setAdding] = useState("");
    useEffect(() => { setRows(center.operators.map((o) => ({ user_id: o.id, coverage: o.pivot?.coverage ?? "principal" }))); }, [center]);
    const name = (id: number) => candidates.find((c) => c.id === id)?.names ?? `#${id}`;

    const save = async () => {
        try {
            const r = await api<{ message: string }>(`/logistics/centers/${center.id}/operators`, "PUT", { operators: rows });
            toast.success(r.message);
            onSaved();
        } catch (e) { toast.error(errorMessage(e)); }
    };

    return (
        <Paper elevation={0} sx={card}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Operadores</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Cualquiera de ellos puede abrir el turno. Los usuarios se crean en Usuarios con el rol "Operador logístico".</Typography>
            <Stack spacing={1}>
                {rows.map((r, i) => (
                    <Stack key={r.user_id} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <Typography sx={{ flex: 1 }}>{name(r.user_id)}</Typography>
                        <TextField size="small" select value={r.coverage} sx={{ width: 140 }}
                            onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, coverage: e.target.value as "principal" | "suplente" } : x)))}>
                            <MenuItem value="principal">Principal</MenuItem>
                            <MenuItem value="suplente">Suplente</MenuItem>
                        </TextField>
                        <IconButton size="small" onClick={() => setRows(rows.filter((_, j) => j !== i))}><DeleteRounded fontSize="small" /></IconButton>
                    </Stack>
                ))}
                <Stack direction="row" spacing={1}>
                    <TextField size="small" select label="Agregar operador" value={adding} sx={{ flex: 1 }}
                        onChange={(e) => { setRows([...rows, { user_id: Number(e.target.value), coverage: "principal" }]); setAdding(""); }}>
                        {candidates.filter((c) => !rows.some((r) => r.user_id === c.id)).map((c) => <MenuItem key={c.id} value={String(c.id)}>{c.names} · {c.email}</MenuItem>)}
                    </TextField>
                    <Button variant="contained" onClick={save}>Guardar</Button>
                </Stack>
                {candidates.length === 0 && <Typography variant="caption" color="text.secondary">Todavía no hay usuarios con el rol "Operador logístico".</Typography>}
            </Stack>
        </Paper>
    );
};

/** §4: domingos, feriados y cierres. Un día especial manda sobre el horario de la semana. */
const ExceptionsCard: React.FC<{ center: AdminCenter; onSaved: () => void }> = ({ center, onSaved }) => {
    const [f, setF] = useState({ date: "", is_closed: true, opens_at: "08:00", closes_at: "19:00", note: "" });

    const add = async () => {
        try {
            const r = await api<{ message: string }>(`/logistics/centers/${center.id}/exceptions`, "POST",
                { ...f, opens_at: f.is_closed ? null : f.opens_at, closes_at: f.is_closed ? null : f.closes_at, note: f.note || null });
            toast.success(r.message);
            setF({ ...f, date: "", note: "" });
            onSaved();
        } catch (e) { toast.error(errorMessage(e)); }
    };
    const remove = async (id: number) => {
        try {
            await api(`/logistics/centers/${center.id}/exceptions/${id}`, "DELETE");
            onSaved();
        } catch (e) { toast.error(errorMessage(e)); }
    };

    return (
        <Paper elevation={0} sx={card}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>Días especiales</Typography>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ alignItems: { md: "center" }, mb: 1.5 }}>
                <TextField size="small" type="date" label="Día" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} InputLabelProps={{ shrink: true }} />
                <FormControlLabel control={<Switch checked={f.is_closed} onChange={(e) => setF({ ...f, is_closed: e.target.checked })} />} label="Cerrado" />
                {!f.is_closed && (
                    <>
                        <TextField size="small" type="time" label="Abre" value={f.opens_at} onChange={(e) => setF({ ...f, opens_at: e.target.value })} InputLabelProps={{ shrink: true }} />
                        <TextField size="small" type="time" label="Cierra" value={f.closes_at} onChange={(e) => setF({ ...f, closes_at: e.target.value })} InputLabelProps={{ shrink: true }} />
                    </>
                )}
                <TextField size="small" label="Nota" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} sx={{ flex: 1 }} />
                <Button variant="contained" disabled={!f.date} onClick={add}>Agregar</Button>
            </Stack>
            {center.exceptions_upcoming.length === 0 ? <Typography variant="body2" color="text.secondary">No hay días especiales próximos.</Typography> : (
                <Table size="small">
                    <TableBody>
                        {center.exceptions_upcoming.map((x) => (
                            <TableRow key={x.id}>
                                <TableCell>{x.date.slice(0, 10).split("-").reverse().join("/")}</TableCell>
                                <TableCell>{x.is_closed ? "Cerrado" : `${x.opens_at?.slice(0, 5)} a ${x.closes_at?.slice(0, 5)}`}</TableCell>
                                <TableCell>{x.note ?? ""}</TableCell>
                                <TableCell align="right"><IconButton size="small" onClick={() => remove(x.id)}><DeleteRounded fontSize="small" /></IconButton></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </Paper>
    );
};

/** §31: los parámetros. Cada cambio es una versión nueva que vale desde ese momento; la anterior queda (§33). */
const SETTINGS: { key: string; label: string; help?: string; kind?: "time" | "bool" | "fixed" }[] = [
    { key: "sla_target_minutes", label: "SLA objetivo (min)" },
    { key: "sla_limit_minutes", label: "SLA límite de la flota propia (min)" },
    { key: "round1_seconds", label: "Ronda 1: duración (s)" },
    { key: "round1_candidates", label: "Ronda 1: mínimo de riders", help: "Suena a todos los que llegan dentro del SLA objetivo; si son menos, a este número de los más rápidos" },
    { key: "round2_seconds", label: "Ronda 2: duración (s)" },
    { key: "round2_new_candidates", label: "Ronda 2: riders nuevos" },
    { key: "manual_calls_at_seconds", label: "Alerta roja y llamadas a los (s)" },
    { key: "hard_cap_seconds", label: "Pasa sola a la agencia a los (s)" },
    { key: "max_stops_normal", label: "Paradas por ruta (normal)" },
    { key: "max_stops_exceptional", label: "Paradas por ruta (excepcional)" },
    { key: "cash_limit_usd", label: "Límite de efectivo del rider (USD)" },
    { key: "service_minutes_per_stop", label: "Minutos de servicio por parada" },
    { key: "picking_minutes", label: "Tiempo de picking (min)", help: "Fran, 27/10: menos de 3, máximo 5" },
    { key: "gps_max_age_seconds", label: "GPS reciente: máximo (s)" },
    { key: "morning_check_at", label: "Chequeo de la mañana", kind: "time" },
    { key: "morning_check_max_eta_minutes", label: "Chequeo: ETA máximo (min)", help: "Vacío: el objetivo menos el picking (Fran, 27/10)" },
    { key: "road_report_minutes", label: "Incidencias en la vía: duran (min)", help: "Si nadie confirma que siguen, se quitan solas (§15)" },
    { key: "onsite_radius_meters", label: "Entrega en el sitio: radio (m)", help: "Más lejos del cliente queda marcada para administración" },
    { key: "pay_failed_leg", label: "Se paga la ida si el cliente no recibe", kind: "bool" },
    { key: "return_deadline", label: "Plazo de retorno", kind: "fixed" },
];

type SettingsValue = string | number | boolean | null;

const SettingsCard: React.FC<{ center: AdminCenter }> = ({ center }) => {
    const [values, setValues] = useState<Record<string, SettingsValue> | null>(null);
    const [source, setSource] = useState<string>("");
    const [saving, setSaving] = useState(false);

    const load = useCallback(() => {
        api<{ values: Record<string, SettingsValue>; source: string }>(`/logistics/settings?center_id=${center.id}`)
            .then((r) => { setValues(r.values); setSource(r.source); }).catch((e) => toast.error(errorMessage(e)));
    }, [center.id]);
    useEffect(() => { load(); }, [load]);

    const save = async () => {
        if (!values) return;
        setSaving(true);
        try {
            const body: Record<string, SettingsValue> = {};
            for (const s of SETTINGS) {
                if (s.kind === "fixed") continue;
                const v = values[s.key];
                body[s.key] = s.kind === "bool" || s.kind === "time" ? v : v === "" || v === null ? null : Number(v);
            }
            const r = await api<{ message: string }>("/logistics/settings", "PUT", { center_id: center.id, values: body });
            toast.success(r.message);
            load();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };

    if (!values) return null;

    return (
        <Paper elevation={0} sx={card}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Parámetros</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {source === "centro" ? "Valores propios de este centro." : "Valores generales: al guardar, este centro tiene los suyos."} Cada cambio vale desde que se guarda y el anterior queda en el historial.
            </Typography>
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(3, 1fr)" } }}>
                {SETTINGS.map((s) => s.kind === "bool" ? (
                    <FormControlLabel key={s.key} label={s.label}
                        control={<Switch checked={!!values[s.key]} onChange={(e) => setValues({ ...values, [s.key]: e.target.checked })} />} />
                ) : s.kind === "fixed" ? (
                    <TextField key={s.key} size="small" label={s.label} value={values[s.key] === "fin_de_turno" ? "Antes del cierre del turno" : String(values[s.key] ?? "")} disabled />
                ) : (
                    <TextField key={s.key} size="small" label={s.label} type={s.kind === "time" ? "time" : "number"} value={values[s.key] ?? ""}
                        helperText={s.help} InputLabelProps={{ shrink: true }} onChange={(e) => setValues({ ...values, [s.key]: e.target.value })} />
                ))}
            </Box>
            <Stack direction="row" sx={{ mt: 2, justifyContent: "flex-end" }}>
                <Button variant="contained" disabled={saving} onClick={save}>Guardar parámetros</Button>
            </Stack>
        </Paper>
    );
};

type RiderUser = {
    id: number; names: string; surnames: string | null; phone: string | null; email: string;
    profile: { center_id: number; is_active: boolean; suspended_at: string | null; suspended_reason: string | null; schedule: Hours | null; notes: string | null; mock_location_at?: string | null;
        alarm_ready: boolean; has_push: boolean; center: Option | null } | null;
};

/** §23 Riders: centro, activo/suspendido, franjas, observaciones y una alarma de prueba. Los usuarios Repartidor se crean en Usuarios. */
const RidersAdminCard: React.FC<{ centers: AdminCenter[]; centerId: number }> = ({ centers, centerId }) => {
    const [riders, setRiders] = useState<RiderUser[] | null>(null);
    const [editing, setEditing] = useState<RiderUser | null>(null);
    const load = useCallback(() => { api<{ riders: RiderUser[] }>("/logistics/riders").then((r) => setRiders(r.riders)).catch((e) => toast.error(errorMessage(e))); }, []);
    useEffect(() => { load(); }, [load]);

    const testPush = async (u: RiderUser) => {
        try {
            const r = await api<{ message: string }>(`/logistics/riders/${u.id}/test-push`, "POST");
            toast.success(r.message);
        } catch (e) { toast.error(errorMessage(e)); }
    };

    if (!riders) return null;
    const mine = riders.filter((r) => r.profile?.center_id === centerId);
    const others = riders.filter((r) => r.profile?.center_id !== centerId);

    return (
        <Paper elevation={0} sx={card}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Riders del centro</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Los usuarios se crean en Usuarios con el rol Repartidor; aquí se les asigna el centro. Entran a la app con ese mismo correo y contraseña.
            </Typography>
            <Table size="small">
                <TableHead><TableRow><TableCell>Rider</TableCell><TableCell>Estado</TableCell><TableCell>App</TableCell><TableCell align="right" /></TableRow></TableHead>
                <TableBody>
                    {mine.map((u) => (
                        <TableRow key={u.id}>
                            <TableCell>{u.names} {u.surnames ?? ""}<Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{u.phone ?? u.email}</Typography></TableCell>
                            <TableCell>
                                {u.profile?.suspended_at ? <Chip size="small" color="error" label="Suspendido" /> : u.profile?.is_active ? <Chip size="small" color="success" label="Activo" /> : <Chip size="small" label="Inactivo" />}
                                {u.profile?.mock_location_at && <Chip size="small" color="error" variant="outlined" label="GPS falso: revisar" sx={{ ml: 0.5 }} />}
                            </TableCell>
                            <TableCell>{u.profile?.alarm_ready ? <Chip size="small" color="success" label="Alarma lista" /> : <Chip size="small" variant="outlined" label={u.profile?.has_push ? "Revisar permisos" : "Sin app"} />}</TableCell>
                            <TableCell align="right">
                                <Button size="small" disabled={!u.profile?.has_push} onClick={() => testPush(u)}>Alarma de prueba</Button>
                                <Button size="small" onClick={() => setEditing(u)}>Editar</Button>
                            </TableCell>
                        </TableRow>
                    ))}
                    {mine.length === 0 && <TableRow><TableCell colSpan={4}><Typography variant="body2" color="text.secondary">Todavía no hay riders en este centro.</Typography></TableCell></TableRow>}
                </TableBody>
            </Table>
            {others.length > 0 && (
                <TextField size="small" select label="Agregar un repartidor al centro" value="" sx={{ mt: 2, minWidth: 320 }}
                    onChange={(e) => setEditing(others.find((u) => String(u.id) === e.target.value) ?? null)}>
                    {others.map((u) => <MenuItem key={u.id} value={String(u.id)}>{u.names} {u.surnames ?? ""}{u.profile?.center ? ` (hoy en ${u.profile.center.name})` : ""}</MenuItem>)}
                </TextField>
            )}
            <RiderDialog user={editing} centers={centers} centerId={centerId} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
        </Paper>
    );
};

const RiderDialog: React.FC<{ user: RiderUser | null; centers: AdminCenter[]; centerId: number; onClose: () => void; onSaved: () => void }> = ({ user, centers, centerId, onClose, onSaved }) => {
    const [f, setF] = useState({ center_id: String(centerId), is_active: true, suspended: false, suspended_reason: "", notes: "", useSchedule: false, clearMock: false });
    const [schedule, setSchedule] = useState<Hours>(DEFAULT_HOURS);

    useEffect(() => {
        if (!user) return;
        const p = user.profile;
        setF({ center_id: String(p?.center_id ?? centerId), is_active: p?.is_active ?? true, suspended: !!p?.suspended_at, suspended_reason: p?.suspended_reason ?? "",
            notes: p?.notes ?? "", useSchedule: !!p?.schedule, clearMock: false });
        setSchedule(p?.schedule ?? centers.find((c) => c.id === centerId)?.opening_hours ?? DEFAULT_HOURS);
    }, [user, centerId, centers]);

    const save = async () => {
        if (!user) return;
        try {
            const r = await api<{ message: string }>(`/logistics/riders/${user.id}`, "PUT", {
                center_id: Number(f.center_id), is_active: f.is_active, suspended: f.suspended, suspended_reason: f.suspended ? f.suspended_reason : null,
                notes: f.notes || null, schedule: f.useSchedule ? schedule : null, clear_mock_location: f.clearMock,
            });
            toast.success(r.message);
            onSaved();
        } catch (e) { toast.error(errorMessage(e)); }
    };

    return (
        <Dialog open={!!user} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{user?.names} {user?.surnames ?? ""}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField size="small" select label="Centro" value={f.center_id} onChange={(e) => setF({ ...f, center_id: e.target.value })}>
                        {centers.map((c) => <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>)}
                    </TextField>
                    <FormControlLabel control={<Switch checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} />} label="Activo (recibe rondas)" />
                    <FormControlLabel control={<Switch checked={f.suspended} onChange={(e) => setF({ ...f, suspended: e.target.checked })} />} label="Suspendido" />
                    {f.suspended && <TextField size="small" label="Motivo de la suspensión" value={f.suspended_reason} onChange={(e) => setF({ ...f, suspended_reason: e.target.value })} />}
                    {/* GPS falso (informe del 27/10, sección 06): queda fuera de las rondas hasta que administración lo revise */}
                    {user?.profile?.mock_location_at && <FormControlLabel control={<Switch checked={f.clearMock} onChange={(e) => setF({ ...f, clearMock: e.target.checked })} />}
                        label={`Su teléfono simuló la ubicación (GPS falso). Quitar la marca: lo revisé`} />}
                    <FormControlLabel control={<Switch checked={f.useSchedule} onChange={(e) => setF({ ...f, useSchedule: e.target.checked })} />}
                        label="Franjas propias (si no, las del centro)" />
                    {f.useSchedule && <HoursEditor value={schedule} onChange={setSchedule} />}
                    <TextField size="small" label="Observaciones" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} multiline minRows={2} />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button variant="contained" disabled={f.suspended && !f.suspended_reason.trim()} onClick={save}>Guardar</Button>
            </DialogActions>
        </Dialog>
    );
};
