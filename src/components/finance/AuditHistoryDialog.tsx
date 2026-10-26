// src/components/finance/AuditHistoryDialog.tsx
// El historial de un gasto o de un gasto recurrente (Módulo 4 de Fran, §82): quién, cuándo, qué había antes, qué quedó y
// el motivo. Nada se borra (§83), así que aquí se ve todo lo que pasó.
import React, { useEffect, useState } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, Typography } from "@mui/material";
import { toast } from "react-toastify";
import { AuditEntry, api, errorMessage } from "./finance";

const ACTION: Record<string, string> = {
    expense_created: "Registrado", expense_updated: "Corregido", expense_voided: "Anulado",
    recurring_expense_created: "Creado", recurring_expense_updated: "Datos cambiados",
    recurring_expense_version: "Monto nuevo", recurring_expense_version_corrected: "Monto corregido",
    supplier_created: "Creado", supplier_updated: "Datos cambiados", inventory_purchase_created: "Compra registrada",
    inventory_purchase_receipt: "Comprobante subido", payable_payment_created: "Pago registrado", payable_payment_voided: "Pago anulado",
    inventory_trip_created: "Viaje registrado", inventory_trip_updated: "Viaje corregido", inventory_trip_voided: "Viaje anulado",
    inventory_lot_cost: "Costo del lote", inventory_purchase_corrected: "Compra corregida",
    cash_account_created: "Cuenta creada", cash_account_updated: "Cuenta cambiada", cash_opening_balance: "Saldo inicial",
    cash_account_link: "Método enlazado",
};

const FIELD: Record<string, string> = {
    concept: "Concepto", name: "Nombre", category: "Categoría", amount: "Monto", currency: "Moneda", rate: "Tasa", amount_usd: "En USD",
    expense_date: "Fecha", description: "Descripción", product: "Producto", city: "Ciudad", warehouse: "Almacén", agency: "Agencia",
    supplier: "Proveedor", has_receipt: "Comprobante", voided: "Anulado", frequency: "Frecuencia", schedule: "Día de pago",
    is_active: "Activo", valid_from: "Desde",
    contact_name: "Contacto", phone: "Teléfono", notes: "Notas", quantity: "Unidades", total_amount: "Costo total", total_usd: "Total en USD",
    unit_cost_usd: "Costo unitario", payment_type: "Pago", due_date: "Vence", terms: "Condiciones", applied_amount: "Descuenta de la deuda",
    paid_at: "Fecha del pago", account: "Cuenta", balance: "Pendiente",
    trip_date: "Fecha del viaje", labor: "Mano de obra", fuel: "Combustible", other: "Otros", wear: "Desgaste", total: "Total", units: "Unidades",
    movements: "Traslados (n.º)", cost_source: "Origen del costo",
    kind: "Tipo", opening_balance: "Saldo inicial", opening_date: "Saldo al", company_account: "Método (conciliación)",
    financial_account_id: "Cuenta de la caja (n.º)",
};
const HIDDEN = new Set(["id", "created_by", "version"]);

// Los valores que el backend guarda como código
const VALUE: Record<string, Record<string, string>> = {
    payment_type: { cash: "Al contado", credit: "A crédito" },
    kind: { bank: "Banco", wallet: "Billetera digital", cash: "Efectivo", agency_cash: "Efectivo pendiente de agencia", other: "Otra" },
};

const show = (v: unknown, field = "") => (v === null || v === undefined || v === "" ? "—" : v === true ? "sí" : v === false ? "no"
    : VALUE[field]?.[String(v)] ?? String(v));

const Changes: React.FC<{ entry: AuditEntry }> = ({ entry }) => {
    const before = entry.before ?? {};
    const after = entry.after ?? {};
    const keys = Object.keys({ ...before, ...after }).filter((k) => !HIDDEN.has(k) && (entry.before === null || show(before[k], k) !== show(after[k], k)));
    if (!keys.length) return null;
    return (
        <Box component="dl" sx={{ m: 0, display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 1.5, rowGap: 0.25 }}>
            {keys.map((k) => (
                <React.Fragment key={k}>
                    <Typography component="dt" variant="body2" color="text.secondary">{FIELD[k] ?? k}</Typography>
                    <Typography component="dd" variant="body2" sx={{ m: 0 }}>
                        {entry.before === null ? show(after[k], k) : <>{show(before[k], k)} → <b>{show(after[k], k)}</b></>}
                    </Typography>
                </React.Fragment>
            ))}
        </Box>
    );
};

export type AuditSubject = "expense" | "recurring_expense" | "supplier" | "account_payable" | "inventory_purchase" | "inventory_trip" | "inventory_lot" | "financial_account";

export const AuditHistoryDialog: React.FC<{ subject: { type: AuditSubject; id: number; title: string } | null; onClose: () => void }> = ({ subject, onClose }) => {
    const [entries, setEntries] = useState<AuditEntry[] | null>(null);

    const type = subject?.type;
    const id = subject?.id;
    useEffect(() => {
        if (!type || !id) return;
        let alive = true;
        api<{ entries: AuditEntry[] }>(`/finance/audit?subject_type=${type}&subject_id=${id}`)
            .then((r) => { if (alive) setEntries(r.entries); })
            .catch((e) => toast.error(errorMessage(e)));
        return () => { alive = false; setEntries(null); };
    }, [type, id]);

    return (
        <Dialog open={subject !== null} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Historial: {subject?.title}</DialogTitle>
            <DialogContent>
                {entries === null ? <Typography color="text.secondary">Cargando…</Typography>
                    : entries.length === 0 ? <Typography color="text.secondary">Sin cambios registrados.</Typography>
                    : (
                        <Stack divider={<Divider flexItem />} spacing={1.5}>
                            {entries.map((e) => (
                                <div key={e.id}>
                                    <Typography variant="subtitle2">
                                        {e.action === "recurring_expense_version" && e.after?.is_active === false ? "Desactivado" : ACTION[e.action] ?? e.action}
                                        <Typography component="span" variant="body2" color="text.secondary"> · {e.at}{e.user ? ` · ${e.user}` : ""}</Typography>
                                    </Typography>
                                    {e.reason && <Typography variant="body2" sx={{ fontStyle: "normal", mb: 0.5 }}>Motivo: {e.reason}</Typography>}
                                    <Changes entry={e} />
                                </div>
                            ))}
                        </Stack>
                    )}
            </DialogContent>
            <DialogActions><Button onClick={onClose}>Cerrar</Button></DialogActions>
        </Dialog>
    );
};
