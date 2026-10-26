// src/components/delivery-tariffs/WarehousesTab.tsx
// Almacenes de las agencias, el origen de cada carrera (Módulo 3, §5, §6, §39): ciudad, link de Google Maps y
// coordenadas. Al pegar el link se leen las coordenadas; también se pueden poner a mano.
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Chip, Link, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { PlaceRounded, WarehouseRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { Panel, PanelHeader } from "../ui/surface/Panel";
import { AgencyWarehouse, AgencyWithWarehouses, Option, api, mapsLink } from "./deliveryTariffs";

const WarehouseRow: React.FC<{ w: AgencyWarehouse; cities: Option[]; onSaved: (w: AgencyWarehouse) => void }> = ({ w, cities, onSaved }) => {
    const [form, setForm] = useState({ city_id: w.city_id ?? "", maps_url: w.maps_url ?? "", latitude: w.latitude?.toString() ?? "", longitude: w.longitude?.toString() ?? "" });
    const [saving, setSaving] = useState(false);
    const urlChanged = form.maps_url.trim() !== (w.maps_url ?? "").trim();

    const save = async () => {
        setSaving(true);
        try {
            // Si cambió el link y no se tocaron las coordenadas, el backend las lee del link
            const coordsTouched = form.latitude !== (w.latitude?.toString() ?? "") || form.longitude !== (w.longitude?.toString() ?? "");
            const r = await api<{ message: string; note: string | null; warehouse: AgencyWarehouse }>(`/delivery/warehouses/${w.id}`, "PUT", {
                city_id: form.city_id === "" ? null : Number(form.city_id),
                maps_url: form.maps_url.trim() || null,
                ...(coordsTouched || !urlChanged ? { latitude: form.latitude === "" ? null : Number(form.latitude), longitude: form.longitude === "" ? null : Number(form.longitude) } : {}),
            });
            toast.success(r.message + (r.note ? ` ${r.note}` : ""));
            setForm({ city_id: r.warehouse.city_id ?? "", maps_url: r.warehouse.maps_url ?? "", latitude: r.warehouse.latitude?.toString() ?? "", longitude: r.warehouse.longitude?.toString() ?? "" });
            onSaved(r.warehouse);
        } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
    };

    return (
        <Box sx={{ py: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
            <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }} flexWrap="wrap">
                <WarehouseRounded fontSize="small" color="action" />
                <Typography variant="body2" fontWeight={600}>{w.name}</Typography>
                {!w.is_active && <Chip size="small" label="Inactivo" />}
                {w.latitude !== null && w.longitude !== null
                    ? <Link href={mapsLink(w.latitude, w.longitude)} target="_blank" rel="noreferrer" variant="caption" sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}><PlaceRounded sx={{ fontSize: 14 }} />{w.latitude.toFixed(6)}, {w.longitude.toFixed(6)}</Link>
                    : <Chip size="small" color="warning" label="Sin coordenadas: sus carreras no se pueden calcular" />}
            </Stack>
            <Stack direction={{ xs: "column", md: "row" }} gap={1} alignItems={{ md: "center" }}>
                <TextField select size="small" label="Ciudad" value={form.city_id} onChange={(e) => setForm({ ...form, city_id: e.target.value as unknown as number })} sx={{ minWidth: 170 }}>
                    <MenuItem value="">—</MenuItem>
                    {cities.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                </TextField>
                <TextField size="small" label="Link de Google Maps" value={form.maps_url} onChange={(e) => setForm({ ...form, maps_url: e.target.value })} sx={{ flex: 1, minWidth: 220 }}
                    helperText={urlChanged ? "Al guardar se leen las coordenadas del link" : undefined} />
                <TextField size="small" label="Latitud" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} sx={{ width: { md: 150 } }} inputProps={{ inputMode: "decimal" }} />
                <TextField size="small" label="Longitud" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} sx={{ width: { md: 150 } }} inputProps={{ inputMode: "decimal" }} />
                <Button variant="contained" onClick={save} disabled={saving}>Guardar</Button>
            </Stack>
        </Box>
    );
};

export const WarehousesTab: React.FC = () => {
    const [data, setData] = useState<{ agencies: AgencyWithWarehouses[]; cities: Option[] } | null>(null);
    const load = useCallback(() => { api<{ agencies: AgencyWithWarehouses[]; cities: Option[] }>("/delivery/warehouses").then(setData).catch((e) => toast.error(e.message)); }, []);
    useEffect(() => { load(); }, [load]);

    if (!data) return <Typography sx={{ p: 2 }}>Cargando…</Typography>;
    const missing = data.agencies.flatMap((a) => a.warehouses).filter((w) => w.latitude === null).length;

    return (
        <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
                Cada carrera se calcula desde el almacén de la agencia que tiene la orden. Pega el link de Google Maps del almacén y se leen sus coordenadas.
                Para crear un almacén nuevo de una agencia, usa Inventario → Almacenes.
            </Typography>
            {missing > 0 && <Alert severity="warning">{missing === 1 ? "Un almacén no tiene" : `${missing} almacenes no tienen`} coordenadas: sus carreras quedan en "Almacén sin coordenadas".</Alert>}
            {data.agencies.map((a) => (
                <Panel key={a.id}>
                    <PanelHeader title={a.name} subtitle={a.cities.length ? a.cities.map((c) => c.name).join(", ") : "Sin ciudades asignadas"} />
                    {a.warehouses.length === 0
                        ? <Typography variant="body2" color="text.secondary">Esta agencia no tiene almacén.</Typography>
                        : a.warehouses.map((w) => <WarehouseRow key={w.id} w={w} cities={data.cities} onSaved={() => load()} />)}
                </Panel>
            ))}
        </Stack>
    );
};
