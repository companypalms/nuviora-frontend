// src/components/finance/DeliverersCostPanel.tsx
// Finanzas › Configuración › Repartidores propios (Módulo 4 de Fran, R11): "puede ser por tarifario o yo lo dejo fijo en
// un solo monto", "desde un almacén que yo también colocaría". El tarifario se carga a nombre del repartidor en Tarifas
// de delivery, igual que el de una agencia. Hoy no trabajan: es la infraestructura para cuando vuelvan.
import React, { useCallback, useEffect, useState } from "react";
import { Button, InputAdornment, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { toast } from "react-toastify";
import { Panel, PanelHeader } from "../ui/surface/Panel";
import { api, errorMessage, money } from "./finance";

type Mode = "fixed" | "tariff";
type Deliverer = { id: number; name: string; mode: Mode; fixed_amount: number | null; warehouse_id: number | null; tariff_cities: string[] };
type Response = {
    general_amount: number; modes: Record<Mode, string>; warehouses: { id: number; name: string; has_coordinates: boolean }[]; deliverers: Deliverer[];
};

const Row: React.FC<{ d: Deliverer; data: Response }> = ({ d, data }) => {
    const [mode, setMode] = useState<Mode>(d.mode);
    const [amount, setAmount] = useState(d.fixed_amount?.toString() ?? "");
    const [warehouse, setWarehouse] = useState(d.warehouse_id ? String(d.warehouse_id) : "");
    const [saving, setSaving] = useState(false);
    const save = async () => {
        setSaving(true);
        try {
            toast.success((await api<{ message: string }>(`/finance/deliverers/${d.id}`, "PUT", {
                mode, fixed_amount: amount.trim() === "" ? null : Number(amount.replace(",", ".")), warehouse_id: warehouse ? Number(warehouse) : null,
            })).message);
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };

    return (
        <TableRow>
            <TableCell>{d.name}</TableCell>
            <TableCell>
                <TextField select size="small" value={mode} onChange={(e) => setMode(e.target.value as Mode)} sx={{ minWidth: 200 }}>
                    {Object.entries(data.modes).map(([k, label]) => <MenuItem key={k} value={k}>{label}</MenuItem>)}
                </TextField>
            </TableCell>
            <TableCell>
                <TextField size="small" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={money(data.general_amount)} sx={{ width: 120 }}
                    InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} inputProps={{ inputMode: "decimal" }}
                    helperText={mode === "tariff" ? "si no se puede usar el tarifario" : "vacío = el general"} />
            </TableCell>
            <TableCell>
                {mode === "tariff" ? (
                    <TextField select size="small" value={warehouse} onChange={(e) => setWarehouse(e.target.value)} sx={{ minWidth: 200 }} label="Sale de"
                        helperText={d.tariff_cities.length ? `Tarifario en ${d.tariff_cities.join(", ")}` : "Sin tarifario: cárgalo en Tarifas de delivery"}>
                        {data.warehouses.map((w) => <MenuItem key={w.id} value={String(w.id)} disabled={!w.has_coordinates}>{w.name}{w.has_coordinates ? "" : " (sin coordenadas)"}</MenuItem>)}
                    </TextField>
                ) : <Typography variant="caption" color="text.secondary">—</Typography>}
            </TableCell>
            <TableCell align="right"><Button size="small" onClick={save} disabled={saving || (mode === "tariff" && !warehouse)}>Guardar</Button></TableCell>
        </TableRow>
    );
};

export const DeliverersCostPanel: React.FC = () => {
    const [data, setData] = useState<Response | null>(null);
    const load = useCallback(() => { api<Response>("/finance/deliverers").then(setData).catch((e) => toast.error(errorMessage(e))); }, []);
    useEffect(() => { load(); }, [load]);

    return (
        <Panel>
            <PanelHeader title="Repartidores propios"
                subtitle="Cuánto cobra cada uno por entrega: un monto fijo, o su tarifario por distancia desde un almacén (se carga a su nombre en Tarifas de delivery, como el de una agencia)." />
            {!data ? <Typography color="text.secondary">Cargando…</Typography> : data.deliverers.length === 0 ? (
                <Typography color="text.secondary">No hay usuarios con el rol Repartidor. Sin configurar, cada uno cobra el monto general ({money(data.general_amount)}).</Typography>
            ) : (
                <TableContainer>
                    <Table size="small">
                        <TableHead><TableRow><TableCell>Repartidor</TableCell><TableCell>Cómo cobra</TableCell><TableCell>Monto fijo</TableCell><TableCell>Almacén</TableCell><TableCell /></TableRow></TableHead>
                        <TableBody>{data.deliverers.map((d) => <Row key={d.id} d={d} data={data} />)}</TableBody>
                    </Table>
                </TableContainer>
            )}
        </Panel>
    );
};
