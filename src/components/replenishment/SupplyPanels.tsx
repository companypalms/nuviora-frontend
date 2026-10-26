// src/components/replenishment/SupplyPanels.tsx
// Reabastecimiento › Proveedores, Rutas y Auditoría (Módulo 5 de Fran, entrega 2; §17–20, §60–65, §95; R5, R6).
// Fran carga aquí qué proveedor le vende cada producto (R5). Las rutas tienen días opcionales: hoy el chofer sale cuando
// Fran le dice (R6).
import React, { useEffect, useState } from "react";
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Stack, Switch, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from "@mui/material";
import { ArrowDownwardRounded, ArrowUpwardRounded, CloseRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { Panel, PanelHeader } from "../ui/surface/Panel";
import { api, errorMessage, money, num } from "../finance/finance";
import { ACTION_LABELS, AuditRow, ReplConfig, RouteRow, SupplierProductRow } from "./replenishment";

// ---- Proveedores por producto (§17–20) ----

type SpForm = { supplier_id: string; product_id: string; city_id: string; cost: string; lead: string; warehouse_id: string; is_active: boolean; is_preferred: boolean; notes: string };
const emptySp = (): SpForm => ({ supplier_id: "", product_id: "", city_id: "", cost: "", lead: "1", warehouse_id: "", is_active: true, is_preferred: false, notes: "" });

export const SupplierProductsPanel: React.FC<{ data: ReplConfig; onSaved: () => void }> = ({ data, onSaved }) => {
    const [editing, setEditing] = useState<SupplierProductRow | "new" | null>(null);
    const [form, setForm] = useState<SpForm>(emptySp());
    const [saving, setSaving] = useState(false);
    const set = (patch: Partial<SpForm>) => setForm((f) => ({ ...f, ...patch }));

    useEffect(() => {
        if (editing === "new") setForm(emptySp());
        else if (editing) setForm({
            supplier_id: String(editing.supplier_id), product_id: String(editing.product_id), city_id: editing.city_id ? String(editing.city_id) : "",
            cost: editing.expected_unit_cost_usd === null ? "" : String(editing.expected_unit_cost_usd), lead: String(editing.lead_time_days),
            warehouse_id: editing.receiving_warehouse_id ? String(editing.receiving_warehouse_id) : "", is_active: editing.is_active,
            is_preferred: editing.is_preferred, notes: editing.notes ?? "",
        });
    }, [editing]);

    const save = async () => {
        setSaving(true);
        try {
            const body = {
                supplier_id: Number(form.supplier_id), product_id: Number(form.product_id), city_id: form.city_id ? Number(form.city_id) : null,
                expected_unit_cost_usd: form.cost.trim() ? num(form.cost) : null, lead_time_days: num(form.lead),
                receiving_warehouse_id: form.warehouse_id ? Number(form.warehouse_id) : null, is_active: form.is_active, is_preferred: form.is_preferred,
                notes: form.notes.trim() || null,
            };
            const res = editing === "new"
                ? await api<{ message: string }>("/finance/replenishment/supplier-products", "POST", body)
                : await api<{ message: string }>(`/finance/replenishment/supplier-products/${(editing as SupplierProductRow).id}`, "PUT", body);
            toast.success(res.message);
            setEditing(null);
            onSaved();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };

    const ready = form.supplier_id && form.product_id && form.lead.trim() !== "" && num(form.lead) >= 0;

    return (
        <Panel>
            <PanelHeader title="Proveedores por producto" subtitle="Quién te vende cada producto, desde dónde, a qué precio, en cuántos días y a qué almacén llega. El sistema no le pide nada al proveedor (§18)."
                action={<Button variant="contained" size="small" onClick={() => setEditing("new")}>Agregar</Button>} />
            {data.suppliers.length === 0 && <Typography color="text.secondary" sx={{ px: 2 }}>Primero crea el proveedor en Finanzas › Proveedores.</Typography>}
            <TableContainer sx={{ p: 1 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Producto</TableCell>
                            <TableCell>Proveedor</TableCell>
                            <TableCell>Ciudad</TableCell>
                            <TableCell align="right">Precio esperado</TableCell>
                            <TableCell align="right">Tarda</TableCell>
                            <TableCell>Llega a</TableCell>
                            <TableCell />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.supplier_products.length === 0 && (
                            <TableRow><TableCell colSpan={7}><Typography color="text.secondary">Todavía no hay proveedores cargados.</Typography></TableCell></TableRow>
                        )}
                        {data.supplier_products.map((r) => (
                            <TableRow key={r.id} sx={{ opacity: r.is_active ? 1 : 0.5 }}>
                                <TableCell>{r.product}</TableCell>
                                <TableCell>
                                    {r.supplier}
                                    {r.is_preferred && <Chip size="small" color="primary" label="Preferido" sx={{ ml: 1 }} />}
                                    {!r.is_active && <Chip size="small" label="Inactivo" sx={{ ml: 1 }} />}
                                </TableCell>
                                <TableCell>{r.city ?? "—"}</TableCell>
                                <TableCell align="right">{r.expected_unit_cost_usd === null ? "—" : money(r.expected_unit_cost_usd)}</TableCell>
                                <TableCell align="right">{r.lead_time_days} {r.lead_time_days === 1 ? "día" : "días"}</TableCell>
                                <TableCell>{r.receiving_warehouse ?? "—"}</TableCell>
                                <TableCell><Button size="small" onClick={() => setEditing(r)}>Editar</Button></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={editing !== null} onClose={() => setEditing(null)} maxWidth="sm" fullWidth>
                <DialogTitle>{editing === "new" ? "Agregar proveedor a un producto" : "Editar"}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField select size="small" label="Producto" value={form.product_id} onChange={(e) => set({ product_id: e.target.value })} required>
                            {data.products.map((p) => <MenuItem key={p.id} value={String(p.id)}>{p.name}</MenuItem>)}
                        </TextField>
                        <TextField select size="small" label="Proveedor" value={form.supplier_id} onChange={(e) => set({ supplier_id: e.target.value })} required>
                            {data.suppliers.filter((s) => s.is_active || String(s.id) === form.supplier_id).map((s) => <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>)}
                        </TextField>
                        <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
                            <TextField select size="small" label="Ciudad del proveedor" value={form.city_id} onChange={(e) => set({ city_id: e.target.value })} sx={{ flex: 1 }}>
                                <MenuItem value="">—</MenuItem>
                                {data.cities.map((c) => <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>)}
                            </TextField>
                            <TextField size="small" label="Tarda en despachar (días)" value={form.lead} onChange={(e) => set({ lead: e.target.value })} required sx={{ flex: 1 }}
                                helperText="0 si es el mismo día" inputProps={{ inputMode: "decimal" }} />
                        </Stack>
                        <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
                            <TextField size="small" label="Precio esperado por unidad (USD)" value={form.cost} onChange={(e) => set({ cost: e.target.value })} sx={{ flex: 1 }}
                                inputProps={{ inputMode: "decimal" }} />
                            <TextField select size="small" label="Almacén donde suele llegar" value={form.warehouse_id} onChange={(e) => set({ warehouse_id: e.target.value })} sx={{ flex: 1 }}>
                                <MenuItem value="">—</MenuItem>
                                {data.warehouses.map((w) => <MenuItem key={w.id} value={String(w.id)}>{w.name}</MenuItem>)}
                            </TextField>
                        </Stack>
                        <Stack direction="row" gap={3}>
                            <Stack direction="row" alignItems="center"><Switch checked={form.is_active} onChange={(e) => set({ is_active: e.target.checked })} /><Typography variant="body2">Activo</Typography></Stack>
                            <Stack direction="row" alignItems="center"><Switch checked={form.is_preferred} onChange={(e) => set({ is_preferred: e.target.checked })} /><Typography variant="body2">Preferido</Typography></Stack>
                        </Stack>
                        <TextField size="small" label="Notas (opcional)" value={form.notes} onChange={(e) => set({ notes: e.target.value })} inputProps={{ maxLength: 500 }} />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button color="inherit" onClick={() => setEditing(null)}>Cancelar</Button>
                    <Button variant="contained" disabled={!ready || saving} onClick={save}>Guardar</Button>
                </DialogActions>
            </Dialog>
        </Panel>
    );
};

// ---- Rutas (§60–65) ----

type RouteForm = { name: string; start_city_id: string; lead: string; cost: string; days: number[]; is_active: boolean; notes: string; stops: number[] };

export const RoutesPanel: React.FC<{ data: ReplConfig; onSaved: () => void }> = ({ data, onSaved }) => {
    const [editing, setEditing] = useState<RouteRow | "new" | null>(null);
    const [form, setForm] = useState<RouteForm>({ name: "", start_city_id: "", lead: "1", cost: "", days: [], is_active: true, notes: "", stops: [] });
    const [adding, setAdding] = useState("");
    const [saving, setSaving] = useState(false);
    const set = (patch: Partial<RouteForm>) => setForm((f) => ({ ...f, ...patch }));
    const whName = (id: number) => data.warehouses.find((w) => w.id === id)?.name ?? `#${id}`;

    useEffect(() => {
        if (editing === "new") setForm({ name: "", start_city_id: "", lead: "1", cost: "", days: [], is_active: true, notes: "", stops: [] });
        else if (editing) setForm({
            name: editing.name, start_city_id: editing.start_city_id ? String(editing.start_city_id) : "", lead: String(editing.lead_time_days),
            cost: editing.cost_usd === null ? "" : String(editing.cost_usd), days: editing.usual_days, is_active: editing.is_active, notes: editing.notes ?? "",
            stops: editing.stops.map((s) => s.warehouse_id),
        });
        setAdding("");
    }, [editing]);

    const move = (i: number, d: -1 | 1) => setForm((f) => {
        const s = [...f.stops];
        [s[i], s[i + d]] = [s[i + d], s[i]];
        return { ...f, stops: s };
    });

    const save = async () => {
        setSaving(true);
        try {
            const body = { name: form.name.trim(), start_city_id: form.start_city_id ? Number(form.start_city_id) : null, lead_time_days: num(form.lead),
                cost_usd: form.cost.trim() ? num(form.cost) : null, usual_days: form.days, is_active: form.is_active, notes: form.notes.trim() || null, stops: form.stops };
            const res = editing === "new"
                ? await api<{ message: string }>("/finance/replenishment/routes", "POST", body)
                : await api<{ message: string }>(`/finance/replenishment/routes/${(editing as RouteRow).id}`, "PUT", body);
            toast.success(res.message);
            setEditing(null);
            onSaved();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };

    return (
        <Panel>
            <PanelHeader title="Rutas" subtitle="Los almacenes que el chofer atiende juntos, en el orden sugerido. Entre ellos se puede trasladar en cualquier dirección (§62)."
                action={<Button variant="contained" size="small" onClick={() => setEditing("new")}>Nueva ruta</Button>} />
            <Stack spacing={1.5} sx={{ p: 2 }}>
                {data.routes.map((r) => (
                    <Box key={r.id} sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 1.5, opacity: r.is_active ? 1 : 0.5 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle2">{r.name}{!r.is_active && " (inactiva)"}</Typography>
                            <Button size="small" onClick={() => setEditing(r)}>Editar</Button>
                        </Stack>
                        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", alignItems: "center", my: 0.5 }}>
                            {r.stops.map((s, i) => (
                                <React.Fragment key={s.warehouse_id}>
                                    {i > 0 && <Typography color="text.secondary">→</Typography>}
                                    <Chip size="small" label={s.warehouse} />
                                </React.Fragment>
                            ))}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                            Tarda {r.lead_time_days} {r.lead_time_days === 1 ? "día" : "días"}
                            {" · "}{r.usual_days.length ? `sale los ${r.usual_days.map((d) => data.days[d]?.toLowerCase()).join(" y ")}` : "sin días fijos: sale cuando lo dices"}
                            {r.cost_usd !== null && ` · cuesta unos ${money(r.cost_usd)}`}
                        </Typography>
                        {r.notes && <Typography variant="caption" color="text.secondary" display="block">{r.notes}</Typography>}
                    </Box>
                ))}
            </Stack>

            <Dialog open={editing !== null} onClose={() => setEditing(null)} maxWidth="sm" fullWidth>
                <DialogTitle>{editing === "new" ? "Nueva ruta" : "Editar ruta"}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField size="small" label="Nombre" value={form.name} onChange={(e) => set({ name: e.target.value })} required inputProps={{ maxLength: 100 }} />
                        <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
                            <TextField select size="small" label="Ciudad donde empieza" value={form.start_city_id} onChange={(e) => set({ start_city_id: e.target.value })} sx={{ flex: 1 }}>
                                <MenuItem value="">—</MenuItem>
                                {data.cities.map((c) => <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>)}
                            </TextField>
                            <TextField size="small" label="Tarda (días)" value={form.lead} onChange={(e) => set({ lead: e.target.value })} sx={{ width: 130 }} inputProps={{ inputMode: "decimal" }} />
                            <TextField size="small" label="Costo aprox. (USD)" value={form.cost} onChange={(e) => set({ cost: e.target.value })} sx={{ width: 160 }} inputProps={{ inputMode: "decimal" }} />
                        </Stack>
                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>Días habituales (opcional: sin días, sale cuando lo dices)</Typography>
                            <ToggleButtonGroup size="small" value={form.days} onChange={(_, v: number[]) => set({ days: v })}>
                                {Object.entries(data.days).map(([k, label]) => <ToggleButton key={k} value={Number(k)}>{label.slice(0, 3)}</ToggleButton>)}
                            </ToggleButtonGroup>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>Paradas, en orden</Typography>
                            <Stack spacing={0.5}>
                                {form.stops.map((id, i) => (
                                    <Stack key={id} direction="row" alignItems="center" gap={1}>
                                        <Typography sx={{ width: 22 }} color="text.secondary">{i + 1}.</Typography>
                                        <Typography sx={{ flex: 1 }}>{whName(id)}</Typography>
                                        <IconButton size="small" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUpwardRounded fontSize="small" /></IconButton>
                                        <IconButton size="small" disabled={i === form.stops.length - 1} onClick={() => move(i, 1)}><ArrowDownwardRounded fontSize="small" /></IconButton>
                                        <IconButton size="small" onClick={() => set({ stops: form.stops.filter((s) => s !== id) })}><CloseRounded fontSize="small" /></IconButton>
                                    </Stack>
                                ))}
                            </Stack>
                            <TextField select size="small" label="Agregar almacén" value={adding} sx={{ mt: 1, minWidth: 260 }}
                                onChange={(e) => { set({ stops: [...form.stops, Number(e.target.value)] }); setAdding(""); }}>
                                {data.warehouses.filter((w) => !form.stops.includes(w.id)).map((w) => <MenuItem key={w.id} value={String(w.id)}>{w.name}</MenuItem>)}
                            </TextField>
                        </Box>
                        <Stack direction="row" alignItems="center"><Switch checked={form.is_active} onChange={(e) => set({ is_active: e.target.checked })} /><Typography variant="body2">Activa</Typography></Stack>
                        <TextField size="small" label="Notas (opcional)" value={form.notes} onChange={(e) => set({ notes: e.target.value })} multiline inputProps={{ maxLength: 500 }} />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button color="inherit" onClick={() => setEditing(null)}>Cancelar</Button>
                    <Button variant="contained" disabled={saving || !form.name.trim() || form.stops.length < 2} onClick={save}>Guardar</Button>
                </DialogActions>
            </Dialog>
        </Panel>
    );
};

// ---- Auditoría (§95) ----

const brief = (o: Record<string, unknown> | null) => (o ? Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`).join(" · ").slice(0, 220) : "—");

export const AuditPanel: React.FC = () => {
    const [rows, setRows] = useState<AuditRow[] | null>(null);
    useEffect(() => { api<{ rows: AuditRow[] }>("/finance/replenishment/audit").then((r) => setRows(r.rows)).catch((e) => toast.error(errorMessage(e))); }, []);
    return (
        <Panel>
            <PanelHeader title="Auditoría" subtitle="Quién cambió qué en el inventario y en su configuración: traslados, compras, ajustes, productos, proveedores y rutas (§95)." />
            {rows === null ? <Typography color="text.secondary" sx={{ p: 2 }}>Cargando…</Typography> : (
                <TableContainer sx={{ p: 1 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Cuándo</TableCell>
                                <TableCell>Quién</TableCell>
                                <TableCell>Qué</TableCell>
                                <TableCell>Antes</TableCell>
                                <TableCell>Después</TableCell>
                                <TableCell>Motivo</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.length === 0 && <TableRow><TableCell colSpan={6}><Typography color="text.secondary">Todavía no hay cambios.</Typography></TableCell></TableRow>}
                            {rows.map((r) => (
                                <TableRow key={r.id}>
                                    <TableCell sx={{ whiteSpace: "nowrap" }}>{r.at}</TableCell>
                                    <TableCell>{r.user ?? "Sistema"}</TableCell>
                                    <TableCell>{ACTION_LABELS[r.action] ?? r.action}{r.entity_id ? ` #${r.entity_id}` : ""}</TableCell>
                                    <TableCell sx={{ maxWidth: 260 }}><Typography variant="caption">{brief(r.before)}</Typography></TableCell>
                                    <TableCell sx={{ maxWidth: 260 }}><Typography variant="caption">{brief(r.after)}</Typography></TableCell>
                                    <TableCell>{r.reason ?? ""}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Panel>
    );
};
