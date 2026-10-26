// src/components/replenishment/ConfigPanels.tsx
// Reabastecimiento › Configuración y Productos (Módulo 5 de Fran, entrega 2; §5, §6, §12, §13, §24, §28, §68, §81, §82,
// §102, §128). Los valores que el documento no fija (R8) se marcan "Pendiente de Fran" hasta que él los confirme.
import React, { useEffect, useState } from "react";
import {
    Alert, Box, Button, Chip, InputAdornment, MenuItem, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import { Panel, PanelHeader } from "../ui/surface/Panel";
import { api, errorMessage, num } from "../finance/finance";
import { ProductRow, ReplConfig, ReplSettings, WEIGHT_LABELS, sum } from "./replenishment";

type Form = Record<string, string | Record<string, string>>;

const toForm = (s: ReplSettings): Form => Object.fromEntries(Object.entries(s).map(([k, v]) => [k,
    typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([kk, vv]) => [kk, String(vv)])) : String(v)]));

const NumberField: React.FC<{ label: string; value: string; onChange: (v: string) => void; unit?: string; helper?: React.ReactNode; width?: number }> = (
    { label, value, onChange, unit, helper, width = 190 }) => (
    <TextField size="small" label={label} value={value} onChange={(e) => onChange(e.target.value)} sx={{ width }} helperText={helper}
        inputProps={{ inputMode: "decimal" }} InputProps={unit ? { endAdornment: <InputAdornment position="end">{unit}</InputAdornment> } : undefined} />
);

export const SettingsPanel: React.FC<{ data: ReplConfig; onSaved: () => void }> = ({ data, onSaved }) => {
    const [form, setForm] = useState<Form>(toForm(data.settings));
    const [reason, setReason] = useState("");
    const [saving, setSaving] = useState(false);
    useEffect(() => { setForm(toForm(data.settings)); }, [data.settings]);

    const v = (k: string) => form[k] as string;
    const g = (k: string) => form[k] as Record<string, string>;
    const set = (k: string, val: string) => setForm((f) => ({ ...f, [k]: val }));
    const setG = (k: string, kk: string, val: string) => setForm((f) => ({ ...f, [k]: { ...(f[k] as Record<string, string>), [kk]: val } }));
    const pending = (k: string) => data.pending.includes(k);
    const operative = num(v("coverage_days")) + num(v("safety_days"));

    const save = async (confirmProposed = false) => {
        setSaving(true);
        try {
            const body: Record<string, unknown> = { reason: reason.trim() || null, confirm_proposed: confirmProposed };
            Object.entries(form).forEach(([k, val]) => {
                body[k] = typeof val === "object" ? Object.fromEntries(Object.entries(val).map(([kk, vv]) => [kk, num(vv)])) : num(val);
            });
            toast.success((await api<{ message: string }>("/finance/replenishment/settings", "PUT", body)).message);
            setReason("");
            onSaved();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };

    const weightGroup = (k: string, title: string, note: string) => (
        <Box>
            <Typography variant="subtitle2">{title}</Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>{note}</Typography>
            <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="center">
                {Object.keys(g(k)).map((kk) => <NumberField key={kk} label={WEIGHT_LABELS[kk] ?? kk} value={g(k)[kk]} onChange={(val) => setG(k, kk, val)} unit="%" width={210} />)}
                {k !== "score_ranges" && (
                    <Chip size="small" color={sum(Object.fromEntries(Object.entries(g(k)).map(([a, b]) => [a, num(b)]))) === 100 ? "success" : "error"}
                        label={`Suman ${sum(Object.fromEntries(Object.entries(g(k)).map(([a, b]) => [a, num(b)])))} %`} />
                )}
            </Stack>
        </Box>
    );

    const pendingChip = (k: string) => pending(k)
        ? <Chip size="small" color="warning" variant="outlined" label="Pendiente de Fran" sx={{ ml: 1 }} /> : null;

    return (
        <Panel>
            <PanelHeader title="Valores del plan" subtitle="Lo que usa el plan de inventario para calcular. Cada cambio queda en la auditoría." />
            <Stack spacing={3} sx={{ p: 2 }}>
                <Box>
                    <Typography variant="subtitle2">Cobertura (§5, §6)</Typography>
                    <Stack direction="row" gap={1.5} flexWrap="wrap" sx={{ mt: 1 }}>
                        <NumberField label="Cobertura objetivo" value={v("coverage_days")} onChange={(val) => set("coverage_days", val)} unit="días" />
                        <NumberField label="Días de seguridad" value={v("safety_days")} onChange={(val) => set("safety_days", val)} unit="días" />
                    </Stack>
                    <Alert severity="info" sx={{ mt: 1 }}>
                        Cobertura operativa: <b>{v("coverage_days")} + {v("safety_days")} = {Number.isFinite(operative) ? operative : "—"} días</b>. Cada producto puede tener la suya en la pestaña Productos.
                    </Alert>
                </Box>
                <Box>
                    <Typography variant="subtitle2">Demanda (§24, §28)</Typography>
                    <Stack direction="row" gap={1.5} flexWrap="wrap" sx={{ mt: 1, mb: 2 }}>
                        <NumberField label="Pedidos Sin Stock que cuentan" value={v("sin_stock_pct")} onChange={(val) => set("sin_stock_pct", val)} unit="%"
                            helper="100 % = cada pedido Sin Stock cuenta como demanda" width={260} />
                    </Stack>
                    {weightGroup("window_weights", "Peso de cada ventana", "Los días recientes pesan más. Si un producto tiene poco histórico, se reparten entre las ventanas que tiene.")}
                </Box>
                <Box>
                    <Typography variant="subtitle2">Traslados (§68)</Typography>
                    <Stack direction="row" gap={1.5} sx={{ mt: 1 }}>
                        <NumberField label="Mínimo de un traslado" value={v("transfer_min_units")} onChange={(val) => set("transfer_min_units", val)} unit="unidades"
                            helper="Si la ruta ya pasa por ahí, puede mandar menos" width={240} />
                    </Stack>
                </Box>
                {weightGroup("score_weights", "Prioridad de reposición (§81)", "Ordena las urgencias de 0 a 100. No decide cuánto comprar.")}
                {weightGroup("score_ranges", "Rangos de la prioridad (§82)", "Desde qué puntaje es crítico, alta prioridad o para monitorizar.")}
                {weightGroup("reliability_weights", "Confiabilidad del forecast (§102)", "Cómo se arma el indicador de confiabilidad de la pestaña Precisión.")}
                <Box>
                    <Typography variant="subtitle2">Plan automático (§66, §107)</Typography>
                    <Stack direction="row" alignItems="center" gap={1}>
                        <Switch checked={v("auto_plan_before_route") === "1"} onChange={(e) => set("auto_plan_before_route", e.target.checked ? "1" : "0")} />
                        <Typography variant="body2">Generar el plan solo la noche antes de cada día de ruta</Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" display="block">
                        Solo funciona con rutas que tengan días habituales (hoy no tienen: salen cuando lo dices). El plan se genera, pero aprobarlo sigue siendo tuyo.
                    </Typography>
                </Box>
                <Box>
                    <Typography variant="subtitle2">Valores que el documento no fija</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        Los que se le propusieron a Fran (punto 8) y él aprobó. Se pueden cambiar cuando quieras.
                    </Typography>
                    <Stack spacing={1.5}>
                        <Stack direction="row" alignItems="center"><NumberField label="Producto Pausado: su demanda" value={v("paused_demand_pct")} onChange={(val) => set("paused_demand_pct", val)} unit="%" width={260} />{pendingChip("paused_demand_pct")}</Stack>
                        <Stack direction="row" alignItems="center"><NumberField label="Exceso: más de … veces lo pedido" value={v("excess_multiplier")} onChange={(val) => set("excess_multiplier", val)} unit="×" width={260} />{pendingChip("excess_multiplier")}</Stack>
                        <Stack direction="row" alignItems="center"><NumberField label="Stock muerto: días sin ventas" value={v("dead_stock_days")} onChange={(val) => set("dead_stock_days", val)} unit="días" width={260} />{pendingChip("dead_stock_days")}</Stack>
                        <Stack direction="row" alignItems="center"><NumberField label="Tendencia estable: hasta ±" value={v("trend_stable_pct")} onChange={(val) => set("trend_stable_pct", val)} unit="%" width={260} />{pendingChip("trend_stable_pct")}</Stack>
                    </Stack>
                </Box>
                <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} alignItems={{ sm: "center" }}>
                    <TextField size="small" label="Motivo del cambio (opcional)" value={reason} onChange={(e) => setReason(e.target.value)} sx={{ flex: 1 }} inputProps={{ maxLength: 500 }} />
                    <Button variant="contained" disabled={saving} onClick={() => save(false)}>Guardar</Button>
                    {data.pending.length > 0 && <Button disabled={saving} onClick={() => save(true)}>Guardar y confirmar los propuestos</Button>}
                </Stack>
            </Stack>
        </Panel>
    );
};

const ProductLine: React.FC<{ p: ProductRow; data: ReplConfig; onSaved: () => void }> = ({ p, data, onSaved }) => {
    const [status, setStatus] = useState(p.commercial_status);
    const [coverage, setCoverage] = useState(p.coverage_days === null ? "" : String(p.coverage_days));
    const [safety, setSafety] = useState(p.safety_days === null ? "" : String(p.safety_days));
    const [sinStock, setSinStock] = useState(p.sin_stock_pct === null ? "" : String(p.sin_stock_pct));
    const [cities, setCities] = useState(p.cities);
    const [saving, setSaving] = useState(false);
    const dirty = status !== p.commercial_status || coverage !== (p.coverage_days === null ? "" : String(p.coverage_days))
        || safety !== (p.safety_days === null ? "" : String(p.safety_days)) || sinStock !== (p.sin_stock_pct === null ? "" : String(p.sin_stock_pct));
    const opt = (s: string) => (s.trim() === "" ? null : num(s));

    const save = async () => {
        setSaving(true);
        try {
            toast.success((await api<{ message: string }>(`/finance/replenishment/products/${p.id}`, "PUT",
                { commercial_status: status, coverage_days: opt(coverage), safety_days: opt(safety), sin_stock_pct: opt(sinStock) })).message);
            onSaved();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };
    const toggleCity = async (cityId: number, available: boolean) => {
        try {
            toast.success((await api<{ message: string }>(`/finance/replenishment/products/${p.id}/cities/${cityId}`, "PUT", { is_available: available })).message);
            setCities((c) => ({ ...c, [cityId]: available }));
        } catch (e) { toast.error(errorMessage(e)); }
    };

    return (
        <TableRow>
            <TableCell sx={{ minWidth: 180 }}>
                {p.name}
                <Typography variant="caption" color="text.secondary" display="block">
                    {p.stock} en stock · {p.suppliers === 0 ? "sin proveedor" : `${p.suppliers} proveedor${p.suppliers > 1 ? "es" : ""}`}
                </Typography>
            </TableCell>
            <TableCell>
                <TextField select size="small" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 140 }}>
                    {Object.entries(data.statuses).map(([k, label]) => <MenuItem key={k} value={k}>{label}</MenuItem>)}
                </TextField>
            </TableCell>
            <TableCell><TextField size="small" value={coverage} onChange={(e) => setCoverage(e.target.value)} placeholder={String(data.settings.coverage_days)} sx={{ width: 80 }} /></TableCell>
            <TableCell><TextField size="small" value={safety} onChange={(e) => setSafety(e.target.value)} placeholder={String(data.settings.safety_days)} sx={{ width: 80 }} /></TableCell>
            <TableCell><TextField size="small" value={sinStock} onChange={(e) => setSinStock(e.target.value)} placeholder={String(data.settings.sin_stock_pct)} sx={{ width: 80 }} /></TableCell>
            <TableCell>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {data.cities.map((c) => (
                        <Tooltip key={c.id} title={cities[c.id] ? `Se vende en ${c.name}. Toca para apagarlo ahí.` : `No se vende en ${c.name}: el plan no compra ni manda ahí.`}>
                            <Chip size="small" label={c.name} color={cities[c.id] ? "success" : "default"} variant={cities[c.id] ? "filled" : "outlined"}
                                onClick={() => toggleCity(c.id, !cities[c.id])} sx={{ textDecoration: cities[c.id] ? "none" : "line-through" }} />
                        </Tooltip>
                    ))}
                </Box>
            </TableCell>
            <TableCell><Button size="small" variant="contained" disabled={!dirty || saving} onClick={save}>Guardar</Button></TableCell>
        </TableRow>
    );
};

export const ProductsPanel: React.FC<{ data: ReplConfig; onSaved: () => void }> = ({ data, onSaved }) => {
    const [search, setSearch] = useState("");
    const [onlyStock, setOnlyStock] = useState(true);
    const rows = data.products.filter((p) => (!onlyStock || p.stock > 0) && p.name.toLowerCase().includes(search.toLowerCase()));
    return (
        <Panel>
            <PanelHeader title="Productos" subtitle="Estado de cada producto (§13), su cobertura propia si la tiene (vacío = la general) y en qué ciudades se vende (§12)." />
            <Stack direction="row" gap={2} alignItems="center" sx={{ px: 2 }}>
                <TextField size="small" label="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} />
                <Stack direction="row" alignItems="center"><Switch checked={onlyStock} onChange={(e) => setOnlyStock(e.target.checked)} /><Typography variant="body2">Solo los que tienen stock</Typography></Stack>
            </Stack>
            <TableContainer sx={{ p: 1 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Producto</TableCell>
                            <TableCell>Estado</TableCell>
                            <TableCell>Cobertura</TableCell>
                            <TableCell>Seguridad</TableCell>
                            <TableCell>% Sin Stock</TableCell>
                            <TableCell>Ciudades</TableCell>
                            <TableCell />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((p) => <ProductLine key={p.id} p={p} data={data} onSaved={onSaved} />)}
                    </TableBody>
                </Table>
            </TableContainer>
        </Panel>
    );
};
