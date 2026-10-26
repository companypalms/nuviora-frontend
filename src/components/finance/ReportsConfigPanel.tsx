// src/components/finance/ReportsConfigPanel.tsx
// Los reportes automáticos (Módulo 4 de Fran, §53 a §55: "configurable por administración"): el diario D-N, el semanal
// (de lunes a domingo, el día que se elija) y el mensual (el mes anterior, el día que se elija), con su hora. Y el envío
// por WhatsApp (R18), que necesita una plantilla aprobada por Meta con el PDF en el encabezado.
import React, { useState } from "react";
import {
    Alert, Button, Checkbox, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import { Panel, PanelHeader } from "../ui/surface/Panel";
import { ReportType, ReportsConfig, ReportsResponse, api, day, errorMessage } from "./finance";

const WEEKDAYS = ["", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const AUTO: { key: Exclude<ReportType, "custom">; label: string }[] = [
    { key: "daily", label: "Diario" }, { key: "weekly", label: "Semanal" }, { key: "monthly", label: "Mensual" },
];

/** El texto que se propone para la plantilla de Meta (R18). Lo crea y lo manda a aprobar el usuario. */
const TEMPLATE_TEXT = "Hola, aquí está el reporte financiero {{1}} de Nuviora.\nIngresos: {{2}}\nBeneficio operativo: {{3}}\nCaja disponible: {{4}}\nEl detalle completo va en el PDF.";

export const ReportsConfigPanel: React.FC<{ config: ReportsConfig; next: ReportsResponse["next"]; onSaved: () => void }> = ({ config, next, onSaved }) => {
    const [c, setC] = useState<ReportsConfig>(config);
    const [numbers, setNumbers] = useState(config.whatsapp.to.join(", "));
    const [saving, setSaving] = useState(false);
    const set = <K extends keyof ReportsConfig>(key: K, patch: Partial<ReportsConfig[K]>) => setC((x) => ({ ...x, [key]: { ...x[key], ...patch } }));

    const save = async () => {
        setSaving(true);
        try {
            const to = numbers.split(/[,;\n]+/).map((n) => n.trim()).filter(Boolean);
            toast.success((await api<{ message: string }>("/finance/reports-config", "PUT", { ...c, whatsapp: { ...c.whatsapp, to, template: c.whatsapp.template?.trim() || null } })).message);
            onSaved();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };

    const nextText = (k: Exclude<ReportType, "custom">) => {
        const n = next[k];
        if (!n) return "desactivado";
        return n.from === n.to ? `el último que tocaba es el del ${day(n.from)}` : `el último que tocaba es del ${day(n.from)} al ${day(n.to)}`;
    };

    return (
        <Panel>
            <PanelHeader title="Reportes automáticos" subtitle="Se generan solos cuando les toca y quedan en la lista. Cada noche se recalculan los recientes: si una entrega tardía cambió las cifras, sale otra versión."
                action={<Button size="small" variant="contained" onClick={save} disabled={saving}>Guardar</Button>} />
            <Stack spacing={2}>
                <Stack direction={{ xs: "column", md: "row" }} gap={1.5} alignItems={{ md: "center" }}>
                    <FormControlLabel sx={{ minWidth: 130 }} control={<Switch checked={c.daily.enabled} onChange={(e) => set("daily", { enabled: e.target.checked })} />} label="Diario" />
                    <TextField size="small" type="number" label="Días atrás (D-N)" value={c.daily.lag_days} onChange={(e) => set("daily", { lag_days: Number(e.target.value) })}
                        inputProps={{ min: 0, max: 30 }} sx={{ width: 150 }} helperText="3 = hoy 12 → el día 9" />
                    <TextField size="small" type="time" label="Hora" value={c.daily.time} onChange={(e) => set("daily", { time: e.target.value })} InputLabelProps={{ shrink: true }} sx={{ width: 130 }} />
                    <Typography variant="caption" color="text.secondary">{nextText("daily")}</Typography>
                </Stack>
                <Stack direction={{ xs: "column", md: "row" }} gap={1.5} alignItems={{ md: "center" }}>
                    <FormControlLabel sx={{ minWidth: 130 }} control={<Switch checked={c.weekly.enabled} onChange={(e) => set("weekly", { enabled: e.target.checked })} />} label="Semanal" />
                    <TextField select size="small" label="Sale el" value={c.weekly.weekday} onChange={(e) => set("weekly", { weekday: Number(e.target.value) })} sx={{ width: 150 }}
                        helperText="la semana de lunes a domingo anterior">
                        {WEEKDAYS.slice(1).map((w, i) => <MenuItem key={w} value={i + 1}>{w}</MenuItem>)}
                    </TextField>
                    <TextField size="small" type="time" label="Hora" value={c.weekly.time} onChange={(e) => set("weekly", { time: e.target.value })} InputLabelProps={{ shrink: true }} sx={{ width: 130 }} />
                    <Typography variant="caption" color="text.secondary">{nextText("weekly")}</Typography>
                </Stack>
                <Stack direction={{ xs: "column", md: "row" }} gap={1.5} alignItems={{ md: "center" }}>
                    <FormControlLabel sx={{ minWidth: 130 }} control={<Switch checked={c.monthly.enabled} onChange={(e) => set("monthly", { enabled: e.target.checked })} />} label="Mensual" />
                    <TextField size="small" type="number" label="Sale el día" value={c.monthly.day} onChange={(e) => set("monthly", { day: Number(e.target.value) })}
                        inputProps={{ min: 1, max: 28 }} sx={{ width: 150 }} helperText="del mes siguiente" />
                    <TextField size="small" type="time" label="Hora" value={c.monthly.time} onChange={(e) => set("monthly", { time: e.target.value })} InputLabelProps={{ shrink: true }} sx={{ width: 130 }} />
                    <Typography variant="caption" color="text.secondary">{nextText("monthly")}</Typography>
                </Stack>

                <Typography variant="subtitle2" sx={{ pt: 1 }}>Envío por WhatsApp</Typography>
                <Alert severity="info" variant="outlined">
                    <Typography variant="body2">
                        WhatsApp solo deja escribir fuera de una conversación con una <b>plantilla aprobada por Meta</b>. Hay que crearla en Meta Business (categoría
                        Utilidad, encabezado <b>Documento</b>) y escribir aquí su nombre. Texto propuesto para el cuerpo; las variables se llenan solas, en este orden:
                    </Typography>
                    <Typography component="pre" variant="body2" sx={{ m: 0, mt: 1, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{TEMPLATE_TEXT}</Typography>
                </Alert>
                <Stack direction={{ xs: "column", md: "row" }} gap={1.5} alignItems={{ md: "flex-start" }}>
                    <FormControlLabel sx={{ minWidth: 130 }} control={<Switch checked={c.whatsapp.enabled} onChange={(e) => set("whatsapp", { enabled: e.target.checked })} />} label="Enviar" />
                    <TextField size="small" label="Plantilla (nombre en Meta)" value={c.whatsapp.template ?? ""} onChange={(e) => set("whatsapp", { template: e.target.value })} sx={{ minWidth: 220 }} />
                    <TextField size="small" label="Idioma" value={c.whatsapp.language} onChange={(e) => set("whatsapp", { language: e.target.value })} sx={{ width: 100 }} />
                    <TextField size="small" label="Números" value={numbers} onChange={(e) => setNumbers(e.target.value)} fullWidth
                        helperText="Con el código del país, separados por coma: 584141234567" />
                </Stack>
                <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
                    <Typography variant="body2" color="text.secondary">Se mandan solos:</Typography>
                    {AUTO.map((t) => (
                        <FormControlLabel key={t.key} label={t.label} control={<Checkbox size="small" checked={c.whatsapp.types.includes(t.key)}
                            onChange={(e) => set("whatsapp", { types: e.target.checked ? [...c.whatsapp.types, t.key] : c.whatsapp.types.filter((x) => x !== t.key) })} />} />
                    ))}
                </Stack>
            </Stack>
        </Panel>
    );
};
