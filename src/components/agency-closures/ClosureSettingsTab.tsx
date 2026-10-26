// src/components/agency-closures/ClosureSettingsTab.tsx
// Configuración del cierre de cada agencia (Módulo 3): el día y la hora del aviso (§21), la tolerancia de las diferencias
// (§30, solo la ve el Admin) y qué columna de su archivo es cada dato (§24). El mapeo se arma solo con el primer archivo;
// aquí se corrige si hace falta.
import React, { useCallback, useEffect, useState } from "react";
import { Button, Chip, FormControlLabel, InputAdornment, MenuItem, Stack, Switch, TextField, Typography } from "@mui/material";
import { toast } from "react-toastify";
import { Panel, PanelHeader } from "../ui/surface/Panel";
import { ClosureSetting, FIELD_LABEL, api } from "./closures";

type SettingsResponse = { agencies: { id: number; name: string; settings: ClosureSetting }[]; days: Record<string, string> };

const SOURCE_LABEL: Record<string, string> = { titulos: "reconocido por los títulos", ia: "detectado por la IA", manual: "puesto a mano", guardado: "guardado" };

const AgencySettings: React.FC<{ agency: { id: number; name: string }; initial: ClosureSetting; days: Record<string, string> }> = ({ agency, initial, days }) => {
    const [form, setForm] = useState({
        closing_day: String(initial.closing_day), closing_time: initial.closing_time, reminder_active: initial.reminder_active,
        tolerance_amount: String(initial.tolerance_amount), tolerance_percent: initial.tolerance_percent === null ? "" : String(initial.tolerance_percent),
        review_distance_km: String(initial.review_distance_km ?? 25),
    });
    const [mapping, setMapping] = useState<{ header_row: string; columns: Record<string, string> } | null>(
        initial.mapping ? { header_row: String(initial.mapping.header_row), columns: { ...initial.mapping.columns } } : null,
    );
    const [mappingTouched, setMappingTouched] = useState(false);
    const [saving, setSaving] = useState(false);
    const source = initial.mapping?.source;

    const save = async () => {
        setSaving(true);
        try {
            await api(`/delivery/closures/settings/${agency.id}`, "PUT", {
                closing_day: Number(form.closing_day), closing_time: form.closing_time, reminder_active: form.reminder_active,
                tolerance_amount: Number(form.tolerance_amount.replace(",", ".")) || 0,
                tolerance_percent: form.tolerance_percent.trim() === "" ? null : Number(form.tolerance_percent.replace(",", ".")),
                review_distance_km: Number(form.review_distance_km.replace(",", ".")) || 25,
                ...(mappingTouched ? { mapping: mapping ? { header_row: Number(mapping.header_row) || 0, columns: mapping.columns } : null } : {}),
            });
            toast.success(`Configuración de ${agency.name} guardada.`);
            setMappingTouched(false);
        } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
    };
    const setColumn = (field: string, value: string) => {
        setMappingTouched(true);
        setMapping((m) => ({ header_row: m?.header_row ?? "1", columns: { ...(m?.columns ?? {}), [field]: value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2) } }));
    };

    return (
        <Panel>
            <PanelHeader title={agency.name} action={<Button variant="contained" size="small" onClick={save} disabled={saving}>Guardar</Button>} />
            <Stack spacing={2.5}>
                <div>
                    <Typography variant="subtitle2" gutterBottom>Aviso para subir el cierre</Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} alignItems={{ sm: "center" }}>
                        <TextField select size="small" label="Día" value={form.closing_day} onChange={(e) => setForm({ ...form, closing_day: e.target.value })} sx={{ minWidth: 150 }}>
                            {Object.entries(days).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                        </TextField>
                        <TextField size="small" type="time" label="Hora" value={form.closing_time} onChange={(e) => setForm({ ...form, closing_time: e.target.value })} InputLabelProps={{ shrink: true }} sx={{ width: 170 }} />
                        <FormControlLabel control={<Switch checked={form.reminder_active} onChange={(e) => setForm({ ...form, reminder_active: e.target.checked })} />} label="Activo" />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">Desde ese día, la agencia ve el aviso hasta que sube el archivo de la semana anterior.</Typography>
                </div>
                <div>
                    <Typography variant="subtitle2" gutterBottom>Tolerancia</Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
                        <TextField size="small" label="Diferencia permitida" value={form.tolerance_amount} onChange={(e) => setForm({ ...form, tolerance_amount: e.target.value })}
                            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} inputProps={{ inputMode: "decimal" }} sx={{ width: 200 }} />
                        <TextField size="small" label="Porcentaje (opcional)" value={form.tolerance_percent} onChange={(e) => setForm({ ...form, tolerance_percent: e.target.value })}
                            InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }} inputProps={{ inputMode: "decimal" }} sx={{ width: 200 }} />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                        Si lo que cobra la agencia difiere del cálculo en esto o menos, la carrera cuenta como correcta y no te la muestra. Con los dos, vale el mayor.
                    </Typography>
                </div>
                <div>
                    <Typography variant="subtitle2" gutterBottom>Carreras largas</Typography>
                    <TextField size="small" label="Revisar las de más de" value={form.review_distance_km} onChange={(e) => setForm({ ...form, review_distance_km: e.target.value })}
                        InputProps={{ endAdornment: <InputAdornment position="end">km</InputAdornment> }} inputProps={{ inputMode: "decimal" }} sx={{ width: 200 }} />
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        Una carrera más larga casi siempre es una ubicación equivocada. Queda "Distancia por revisar" en Tarifas de delivery › Carreras, y no cuenta en el cierre hasta aprobarla o corregir la ubicación.
                    </Typography>
                </div>
                <div>
                    <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
                        <Typography variant="subtitle2">Columnas de su archivo (Excel o CSV)</Typography>
                        {source && !mappingTouched && <Chip size="small" label={SOURCE_LABEL[source] ?? source} />}
                    </Stack>
                    {!mapping ? (
                        <Stack direction="row" alignItems="center" gap={1}>
                            <Typography variant="body2" color="text.secondary">Se detecta solo con el primer archivo que suba.</Typography>
                            <Button size="small" onClick={() => { setMapping({ header_row: "1", columns: {} }); setMappingTouched(true); }}>Ponerlo a mano</Button>
                        </Stack>
                    ) : (
                        <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
                            <TextField size="small" label="Fila de títulos" value={mapping.header_row} onChange={(e) => { setMappingTouched(true); setMapping({ ...mapping, header_row: e.target.value.replace(/\D/g, "") }); }} sx={{ width: 120 }} />
                            {Object.entries(FIELD_LABEL).map(([field, label]) => (
                                <TextField key={field} size="small" label={label} placeholder="—" value={mapping.columns[field] ?? ""} onChange={(e) => setColumn(field, e.target.value)}
                                    sx={{ width: 140 }} inputProps={{ style: { textTransform: "uppercase" } }} />
                            ))}
                            <Button size="small" color="inherit" onClick={() => { setMapping(null); setMappingTouched(true); }}>Quitar</Button>
                        </Stack>
                    )}
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                        La letra de cada columna. Hace falta el monto y, para emparejar, el número de orden, el teléfono o el cliente. Los PDF los lee la IA sin mapeo.
                    </Typography>
                </div>
            </Stack>
        </Panel>
    );
};

export const ClosureSettingsTab: React.FC = () => {
    const [data, setData] = useState<SettingsResponse | null>(null);
    const load = useCallback(() => { api<SettingsResponse>("/delivery/closures/settings").then(setData).catch((e) => toast.error(e.message)); }, []);
    useEffect(() => { load(); }, [load]);
    if (!data) return <Typography sx={{ p: 2 }}>Cargando…</Typography>;

    return (
        <Stack spacing={2}>
            {data.agencies.map((a) => <AgencySettings key={a.id} agency={a} initial={a.settings} days={data.days} />)}
        </Stack>
    );
};
