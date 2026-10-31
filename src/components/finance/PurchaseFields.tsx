// src/components/finance/PurchaseFields.tsx
// "Costo de la compra" en el ingreso de inventario (Módulo 4 de Fran, §9, §10, §16, R6): el Admin dice a qué proveedor le
// compró, cuánto le costó en total (con su moneda y tasa, §32 y R2) y si fue al contado o a crédito, con el vencimiento
// y las condiciones. Se ve el costo unitario que va a tener el lote: costo total / cantidad (§9). El comprobante es
// opcional y se sube después del ingreso. Solo el Admin (§81); la Agencia ingresa como siempre.
// Módulo 5 (§16, R3): con `pending`, es una compra por recibir: solo proveedor y costo esperado (la forma de pago se decide
// al recibirla). Con `lockSupplier`, el proveedor no se cambia (al recibir una compra que ya tiene proveedor).
import React, { useEffect, useState } from "react";
import {
    Alert, Box, Button, FormControlLabel, MenuItem, Stack, Switch, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import { MoneyFields } from "./MoneyFields";
import { FinanceOptions, accountsFor, api, errorMessage, money, toUsd, todayCaracas } from "./finance";
import { PurchaseValue } from "./purchase";

export const PurchaseFields: React.FC<{
    value: PurchaseValue; onChange: (v: PurchaseValue) => void; quantity: number; pending?: boolean; lockSupplier?: boolean; hideToggle?: boolean;
}> = ({ value, onChange, quantity, pending = false, lockSupplier = false, hideToggle = false }) => {
    const [options, setOptions] = useState<FinanceOptions | null>(null);
    const [newSupplier, setNewSupplier] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Cada vez que se abre: así aparece un proveedor recién creado en Finanzas › Proveedores
    useEffect(() => { api<FinanceOptions>("/finance/options").then(setOptions).catch((e) => toast.error(errorMessage(e))); }, []);

    const set = (patch: Partial<PurchaseValue>) => onChange({ ...value, ...patch });
    const usd = toUsd(value.money.amount, value.money.currency, value.money.rate);
    const unit = usd !== null && quantity > 0 ? usd / quantity : null;
    const suppliers = (options?.suppliers ?? []).filter((s) => s.is_active || String(s.id) === value.supplierId);

    const createSupplier = async () => {
        if (!newSupplier?.trim()) return;
        setSaving(true);
        try {
            const res = await api<{ message: string; supplier: { id: number; name: string; is_active: boolean } }>("/finance/suppliers", "POST", { name: newSupplier.trim() });
            toast.success(res.message);
            setOptions((o) => (o ? { ...o, suppliers: [...o.suppliers, res.supplier].sort((a, b) => a.name.localeCompare(b.name, "es")) } : o));
            set({ supplierId: String(res.supplier.id) });
            setNewSupplier(null);
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };

    return (
        <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 2 }}>
            {hideToggle ? <Typography variant="subtitle2">{pending ? "Compra al proveedor" : "Costo real de la compra"}</Typography> : (
                <FormControlLabel control={<Switch checked={value.enabled} onChange={(e) => set({ enabled: e.target.checked })} />}
                    label={<Typography variant="subtitle2">Es una compra a un proveedor</Typography>} />
            )}
            {!value.enabled ? (
                <Alert severity="info" sx={{ mt: 1 }}>
                    Sin compra (por ejemplo, una devolución): las unidades entran con el costo de la última compra registrada del producto y el lote queda "por completar".
                </Alert>
            ) : !options ? <Typography color="text.secondary" sx={{ mt: 1 }}>Cargando…</Typography> : (
                <Stack spacing={2} sx={{ mt: 1 }}>
                    {newSupplier === null ? (
                        <Stack direction="row" gap={1} alignItems="center">
                            <TextField select label="Proveedor" value={value.supplierId} onChange={(e) => set({ supplierId: e.target.value })} required fullWidth size="small"
                                disabled={lockSupplier}>
                                {suppliers.length === 0 && <MenuItem value="" disabled>No hay proveedores: crea uno</MenuItem>}
                                {suppliers.map((s) => <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>)}
                            </TextField>
                            {!lockSupplier && <Button size="small" onClick={() => setNewSupplier("")} sx={{ whiteSpace: "nowrap" }}>+ Nuevo</Button>}
                        </Stack>
                    ) : (
                        <Stack direction="row" gap={1} alignItems="center">
                            <TextField label="Nombre del proveedor nuevo" value={newSupplier} onChange={(e) => setNewSupplier(e.target.value)} size="small" fullWidth autoFocus
                                inputProps={{ maxLength: 255 }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); createSupplier(); } }} />
                            <Button size="small" variant="contained" onClick={createSupplier} disabled={saving || !newSupplier.trim()}>Crear</Button>
                            <Button size="small" color="inherit" onClick={() => setNewSupplier(null)}>Cancelar</Button>
                        </Stack>
                    )}

                    <MoneyFields value={value.money} onChange={(m) => set({ money: m })} currencies={options.currencies}
                        label={pending ? "Costo total esperado" : "Costo total de la compra"} noun="compra" />
                    <Typography variant="body2">
                        Costo unitario: <b>{unit === null ? "—" : money(Math.round(unit * 10000) / 10000)}</b>
                        <Typography component="span" variant="body2" color="text.secondary">
                            {usd !== null && quantity > 0 ? ` (${money(usd)} / ${quantity} u)` : " = costo total / cantidad"}
                        </Typography>
                    </Typography>

                    {pending && (
                        <Typography variant="caption" color="text.secondary">
                            No suma stock ni crea deuda todavía: al recibirla pones la cantidad y el costo reales, y cómo se paga.
                        </Typography>
                    )}
                    {!pending && <>
                    <div>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>¿Cómo se paga?</Typography>
                        <ToggleButtonGroup size="small" exclusive value={value.paymentType} onChange={(_, v) => v && set({ paymentType: v })}>
                            <ToggleButton value="cash">Al contado</ToggleButton>
                            <ToggleButton value="credit">A crédito</ToggleButton>
                        </ToggleButtonGroup>
                    </div>
                    {value.paymentType === "credit" && (
                        <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
                            <TextField type="date" label="Vence el" value={value.dueDate} onChange={(e) => set({ dueDate: e.target.value })} required size="small"
                                InputLabelProps={{ shrink: true }} inputProps={{ min: todayCaracas() }} sx={{ minWidth: 180 }} />
                            <TextField label="Condiciones (opcional)" value={value.terms} onChange={(e) => set({ terms: e.target.value })} size="small" fullWidth
                                placeholder="30 días, pago en dos partes…" inputProps={{ maxLength: 500 }} />
                        </Stack>
                    )}
                    {value.paymentType === "cash" && (
                        <TextField select label="Cuenta de donde salió el pago" value={value.accountId} onChange={(e) => set({ accountId: e.target.value })} size="small" required
                            helperText="Al contado, la compra queda pagada al registrarla y sale de la caja en esa cuenta." InputLabelProps={{ shrink: true }}>
                            {accountsFor(options.financial_accounts, value.money.currency).map((a) => <MenuItem key={a.id} value={String(a.id)}>{a.name} ({a.currency})</MenuItem>)}
                        </TextField>
                    )}
                    {value.paymentType === "credit" && (
                        <Typography variant="caption" color="text.secondary">
                            A crédito, la deuda queda en Finanzas › Proveedores, donde se registran los pagos.
                        </Typography>
                    )}

                    <div>
                        <Button component="label" variant="outlined" size="small">
                            {value.receipt ? "Cambiar comprobante" : "Adjuntar comprobante (opcional)"}
                            <input hidden type="file" accept="image/*,.pdf" onChange={(e) => set({ receipt: e.target.files?.[0] ?? null })} />
                        </Button>
                        {value.receipt && <Typography variant="caption" sx={{ ml: 1 }}>{value.receipt.name}</Typography>}
                    </div>
                    </>}
                </Stack>
            )}
        </Box>
    );
};
