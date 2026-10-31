// src/components/finance/SettingsTab.tsx
// Finanzas › Configuración (Módulo 4 de Fran): la ventana madura (§60), las comisiones (§22, R10, R11), el desgaste del
// vehículo en los viajes de traslado (§15, R8), el margen objetivo de cada producto (§66, R13: 20 % sobre ventas para
// empezar) y cómo cobra cada repartidor propio (R11). Cada cambio queda en la auditoría (§82).
import React, { useCallback, useEffect, useState } from "react";
import { Button, InputAdornment, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { toast } from "react-toastify";
import { Panel, PanelHeader } from "../ui/surface/Panel";
import { DeliverersCostPanel } from "./DeliverersCostPanel";
import { FinanceSettings, api, errorMessage, money, num } from "./finance";

type Product = FinanceSettings["products"][number];

const MarginRow: React.FC<{ p: Product; types: FinanceSettings["target_types"] }> = ({ p, types }) => {
    const [type, setType] = useState(p.target_type);
    const [value, setValue] = useState(String(p.target_pct));
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState({ type: p.target_type, pct: p.target_pct });
    const dirty = type !== saved.type || num(value) !== saved.pct;
    const save = async () => {
        setSaving(true);
        try { toast.success((await api<{ message: string }>(`/finance/product-margins/${p.id}`, "PUT", { target_type: type, target_pct: num(value) })).message); setSaved({ type, pct: num(value) }); }
        catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };
    return (
        <TableRow>
            <TableCell>{p.name}</TableCell>
            <TableCell align="right">{p.cost_usd === null ? <Typography variant="caption" color="warning.main">sin compras todavía</Typography> : money(p.cost_usd)}</TableCell>
            <TableCell>
                <TextField select size="small" value={type} onChange={(e) => setType(e.target.value as Product["target_type"])} sx={{ minWidth: 160 }}>
                    {Object.entries(types).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                </TextField>
            </TableCell>
            <TableCell>
                <TextField size="small" value={value} onChange={(e) => setValue(e.target.value)} sx={{ width: 110 }} inputProps={{ inputMode: "decimal" }}
                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }} />
            </TableCell>
            <TableCell><Button size="small" variant="contained" disabled={!dirty || saving || !(num(value) >= 0)} onClick={save}>Guardar</Button></TableCell>
        </TableRow>
    );
};

export const SettingsTab: React.FC = () => {
    const [data, setData] = useState<FinanceSettings | null>(null);
    const [form, setForm] = useState({ lag: "", window: "", longWindow: "", fixedMin: "", cityMin: "", order: "", upsell: "", deliverer: "", wearMode: "percent", wearValue: "", reason: "" });
    const [saving, setSaving] = useState(false);
    const load = useCallback(() => {
        api<FinanceSettings>("/finance/settings").then((d) => {
            setData(d);
            setForm({ lag: String(d.maturity_lag_days), window: String(d.analysis_window_days), longWindow: String(d.analysis_long_window_days),
                fixedMin: String(d.fixed_cost_min_pct), cityMin: String(d.cpa_city_min_purchases), order: String(d.commissions.order),
                upsell: String(d.commissions.upsell_unit), deliverer: String(d.commissions.deliverer), wearMode: d.vehicle_wear.mode,
                wearValue: String(d.vehicle_wear.value), reason: "" });
        }).catch((e) => toast.error(errorMessage(e)));
    }, []);
    useEffect(() => { load(); }, [load]);

    const save = async () => {
        setSaving(true);
        try {
            const res = await api<{ message: string }>("/finance/settings", "PUT", {
                maturity_lag_days: Number(form.lag), analysis_window_days: Number(form.window), analysis_long_window_days: Number(form.longWindow),
                fixed_cost_min_pct: num(form.fixedMin), cpa_city_min_purchases: Number(form.cityMin), commission_order: num(form.order),
                commission_upsell_unit: num(form.upsell), commission_deliverer: num(form.deliverer),
                vehicle_wear_mode: form.wearMode, vehicle_wear_value: num(form.wearValue), reason: form.reason || null,
            });
            toast.success(res.message);
            load();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };
    const field = (key: keyof typeof form, label: string, unit: string, helper?: string) => (
        <TextField size="small" label={label} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} helperText={helper}
            InputProps={unit === "$" ? { startAdornment: <InputAdornment position="start">$</InputAdornment> } : { endAdornment: <InputAdornment position="end">{unit}</InputAdornment> }}
            inputProps={{ inputMode: "decimal" }} sx={{ width: 220 }} />
    );

    if (!data) return <Typography color="text.secondary" sx={{ p: 1 }}>Cargando…</Typography>;
    return (
        <Stack spacing={2}>
            <Panel>
                <PanelHeader title="Ventana del CPA y comisiones" action={<Button variant="contained" onClick={save} disabled={saving}>Guardar</Button>} />
                <Stack spacing={2}>
                    <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
                        {field("lag", "Ignorar los últimos", "días", "Todavía se están entregando")}
                        {field("window", "Analizar los anteriores", "días", "La cohorte corta del CPA")}
                        {field("longWindow", "Y también los anteriores", "días", "La larga; vale la más prudente")}
                    </Stack>
                    <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
                        {field("fixedMin", "Gastos fijos, como mínimo", "%", "De cada venta; si lo real es más, vale lo real")}
                        {field("cityMin", "Compras mínimas por ciudad", "compras", "Con menos, la ciudad usa sus días largos o su producto")}
                    </Stack>
                    <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
                        {field("order", "Comisión por pedido entregado", "$")}
                        {field("upsell", "Comisión por unidad de upsell", "$")}
                        {field("deliverer", "Repartidor propio, por entrega", "$", "El general (R11; cada uno, abajo)")}
                    </Stack>
                    <TextField size="small" label="Motivo del cambio (opcional)" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} sx={{ maxWidth: 460 }} />
                    <Typography variant="caption" color="text.secondary">Las comisiones nuevas valen para las órdenes que se entreguen desde ahora; las ya pagadas no cambian.</Typography>
                </Stack>
            </Panel>
            <Panel>
                <PanelHeader title="Desgaste del vehículo" subtitle="Se suma a cada viaje de traslado, junto con la mano de obra, el combustible y otros."
                    action={<Button variant="contained" onClick={save} disabled={saving}>Guardar</Button>} />
                <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
                    <TextField select size="small" label="Regla" value={form.wearMode} onChange={(e) => setForm({ ...form, wearMode: e.target.value })} sx={{ minWidth: 300 }}>
                        {Object.entries(data.wear_modes).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                    </TextField>
                    {field("wearValue", form.wearMode === "fixed" ? "Monto por viaje" : "Porcentaje", form.wearMode === "fixed" ? "$" : "%")}
                </Stack>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    Vale para los viajes que se registren desde ahora. Cada viaje guarda la regla con la que se registró.
                </Typography>
            </Panel>
            <Panel>
                <PanelHeader title="Utilidad objetivo por producto" subtitle="El CPA objetivo deja esta utilidad después de los gastos fijos. Un producto caro rinde con menos %; uno barato necesita más." />
                <TableContainer>
                    <Table size="small">
                        <TableHead><TableRow><TableCell>Producto</TableCell><TableCell align="right">Última compra</TableCell><TableCell>Tipo</TableCell><TableCell>Margen</TableCell><TableCell /></TableRow></TableHead>
                        <TableBody>{data.products.map((p) => <MarginRow key={p.id} p={p} types={data.target_types} />)}</TableBody>
                    </Table>
                </TableContainer>
            </Panel>
            <DeliverersCostPanel />
        </Stack>
    );
};
