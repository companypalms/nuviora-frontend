// src/components/finance/SuppliersTab.tsx
// Finanzas › Proveedores (Módulo 4 de Fran, §10, §16, §17, §44): cuánto se le debe a cada proveedor, lo vencido y lo que
// vence pronto; las deudas con sus pagos; y las compras de cada proveedor. Las compras nacen en el ingreso de inventario
// (R6). Un pago no se borra: se anula con motivo (§83), y todo queda en el historial (§82).
import React, { useCallback, useEffect, useState } from "react";
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, Menu, MenuItem, Stack, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import MoreVertRounded from "@mui/icons-material/MoreVertRounded";
import { toast } from "react-toastify";
import { Panel, PanelHeader } from "../ui/surface/Panel";
import { AuditHistoryDialog } from "./AuditHistoryDialog";
import { PayablesTable } from "./PayablesTable";
import { PayDialog } from "./PayDialog";
import { PurchaseCorrectDialog } from "./PurchaseCorrectDialog";
import { SupplierDialog } from "./SupplierDialog";
import {
    FinanceOptions, Payable, PayablePayment, PayableStatus, Purchase, SupplierDetail, SupplierRow, SuppliersResponse, api, day, download, errorMessage,
    inCurrency, money, original,
} from "./finance";

const Stat: React.FC<{ label: string; value: number; hint: string; alert?: boolean }> = ({ label, value, hint, alert }) => (
    <Box sx={{ minWidth: 150, flex: "1 1 150px" }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="h6" color={alert && value > 0 ? "error" : undefined}>{money(value)}</Typography>
        <Typography variant="caption" color="text.secondary">{hint}</Typography>
    </Box>
);

const FILTERS: { key: PayableStatus | "all"; label: string }[] = [
    { key: "open", label: "Pendientes" }, { key: "overdue", label: "Vencidas" }, { key: "paid", label: "Pagadas" }, { key: "all", label: "Todas" },
];

/** Anular un pago (§83): no se borra; la deuda vuelve a tener ese saldo. */
const VoidPaymentDialog: React.FC<{ target: { payment: PayablePayment; payable: Payable } | null; onClose: () => void; onDone: () => void }> = ({ target, onClose, onDone }) => {
    const [reason, setReason] = useState("");
    const [saving, setSaving] = useState(false);
    const submit = async () => {
        if (!target) return;
        setSaving(true);
        try {
            const res = await api<{ message: string }>(`/finance/payable-payments/${target.payment.id}/void`, "POST", { reason });
            toast.success(res.message);
            setReason("");
            onDone();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };
    return (
        <Dialog open={target !== null} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Anular pago</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ mb: 2 }}>
                    El pago de {target ? original(target.payment.amount, target.payment.currency, target.payment.rate) : ""} del {day(target?.payment.paid_at)} deja de
                    contar y la deuda vuelve a subir {target ? inCurrency(target.payment.applied_amount, target.payable.currency) : ""}. No se borra: queda a la vista con el motivo.
                </DialogContentText>
                <TextField label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} fullWidth required autoFocus inputProps={{ maxLength: 500 }} />
            </DialogContent>
            <DialogActions>
                <Button color="inherit" onClick={onClose}>Cancelar</Button>
                <Button color="error" variant="contained" onClick={submit} disabled={saving || reason.trim() === ""}>Anular</Button>
            </DialogActions>
        </Dialog>
    );
};

export const SuppliersTab: React.FC<{ options: FinanceOptions }> = ({ options }) => {
    const [data, setData] = useState<SuppliersResponse | null>(null);
    const [filter, setFilter] = useState<PayableStatus | "all">("open");
    const [payables, setPayables] = useState<Payable[] | null>(null);
    const [detail, setDetail] = useState<SupplierDetail | null>(null);
    const [editing, setEditing] = useState<SupplierRow | null | "new">(null);
    const [paying, setPaying] = useState<Payable | null>(null);
    const [voiding, setVoiding] = useState<{ payment: PayablePayment; payable: Payable } | null>(null);
    const [history, setHistory] = useState<{ type: "supplier" | "account_payable" | "inventory_purchase"; id: number; title: string } | null>(null);
    const [menu, setMenu] = useState<{ anchor: HTMLElement; supplier: SupplierRow } | null>(null);
    const [correcting, setCorrecting] = useState<Purchase | null>(null);

    const load = useCallback(() => {
        api<SuppliersResponse>("/finance/suppliers").then(setData).catch((e) => toast.error(errorMessage(e)));
        api<{ payables: Payable[] }>(`/finance/payables?status=${filter}`).then((r) => setPayables(r.payables)).catch((e) => toast.error(errorMessage(e)));
    }, [filter]);
    useEffect(() => { load(); }, [load]);

    const openDetail = (id: number) => api<SupplierDetail>(`/finance/suppliers/${id}`).then(setDetail).catch((e) => toast.error(errorMessage(e)));
    // Después de pagar o anular: se recarga todo, y el detalle si está abierto
    const refresh = () => { load(); if (detail) openDetail(detail.supplier.id); };
    const act = (fn: (s: SupplierRow) => void) => () => { if (menu) fn(menu.supplier); setMenu(null); };
    const t = data?.totals;
    const tableProps = {
        onPay: setPaying,
        onVoid: (payment: PayablePayment, payable: Payable) => setVoiding({ payment, payable }),
        onHistory: (p: Payable) => setHistory({ type: "account_payable", id: p.id, title: `${p.payee} · ${p.description}` }),
    };

    return (
        <Stack spacing={2}>
            {t && (
                <Panel>
                    <PanelHeader title="Lo que se debe a proveedores" subtitle="Las compras a crédito y lo que falta por pagar. Las compras al contado nacen pagadas." />
                    <Stack direction="row" gap={2} flexWrap="wrap">
                        <Stat label="Deuda total" value={t.debt_usd} hint={`${t.open_debts} deuda(s) pendiente(s)`} />
                        <Stat label="Vencido" value={t.overdue_usd} hint="ya pasó su fecha" alert />
                        <Stat label="Vence en 7 días" value={t.due_soon_usd} hint="todavía a tiempo" />
                    </Stack>
                </Panel>
            )}

            <Panel>
                <PanelHeader title="Deudas" subtitle="Cada pago baja el saldo y no cambia el costo del inventario. Abre una deuda para ver sus pagos."
                    action={
                        <Stack direction="row" gap={1} flexWrap="wrap">
                            {FILTERS.map((f) => <Chip key={f.key} label={f.label} onClick={() => setFilter(f.key)} variant={filter === f.key ? "filled" : "outlined"} />)}
                        </Stack>
                    } />
                {!payables ? <Typography color="text.secondary">Cargando…</Typography> : payables.length === 0 ? (
                    <Typography color="text.secondary">
                        {filter === "open" ? "No se le debe nada a ningún proveedor." : "No hay deudas en esta vista."} Las compras se registran en Inventario, al hacer una entrada.
                    </Typography>
                ) : <PayablesTable payables={payables} {...tableProps} />}
            </Panel>

            <Panel>
                <PanelHeader title="Proveedores" subtitle="Un proveedor inactivo no aparece para compras nuevas."
                    action={<Button variant="contained" onClick={() => setEditing("new")}>+ Proveedor</Button>} />
                {!data ? <Typography color="text.secondary">Cargando…</Typography> : data.suppliers.length === 0 ? (
                    <Typography color="text.secondary">Todavía no hay proveedores.</Typography>
                ) : (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Proveedor</TableCell><TableCell align="right">Comprado</TableCell><TableCell align="right">Se le debe</TableCell>
                                    <TableCell align="right">Vencido</TableCell><TableCell>Próximo vencimiento</TableCell><TableCell />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.suppliers.map((s) => (
                                    <TableRow key={s.id} hover sx={{ opacity: s.is_active ? 1 : 0.6, cursor: "pointer" }} onClick={() => openDetail(s.id)}>
                                        <TableCell sx={{ minWidth: 160 }}>
                                            <Typography variant="body2">{s.name} {!s.is_active && <Chip size="small" label="Inactivo" sx={{ ml: 0.5 }} />}</Typography>
                                            {(s.contact_name || s.phone) && (
                                                <Typography variant="caption" color="text.secondary">{[s.contact_name, s.phone].filter(Boolean).join(" · ")}</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                                            {money(s.purchased_usd)}
                                            <Typography variant="caption" color="text.secondary" display="block">{s.purchases} compra(s)</Typography>
                                        </TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: "nowrap", fontWeight: 600 }}>{money(s.debt_usd)}</TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: "nowrap", color: s.overdue_usd > 0 ? "error.main" : undefined }}>{money(s.overdue_usd)}</TableCell>
                                        <TableCell sx={{ whiteSpace: "nowrap" }}>{day(s.next_due)}</TableCell>
                                        <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                                            <Tooltip title="Acciones">
                                                <IconButton size="small" aria-label={`Acciones de ${s.name}`} onClick={(ev) => setMenu({ anchor: ev.currentTarget, supplier: s })}>
                                                    <MoreVertRounded fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Panel>

            <Menu anchorEl={menu?.anchor} open={menu !== null} onClose={() => setMenu(null)}>
                <MenuItem onClick={act((s) => openDetail(s.id))}>Ver deudas y compras</MenuItem>
                <MenuItem onClick={act(setEditing)}>Editar o desactivar</MenuItem>
                <MenuItem onClick={act((s) => setHistory({ type: "supplier", id: s.id, title: s.name }))}>Historial</MenuItem>
            </Menu>

            <Dialog open={detail !== null} onClose={() => setDetail(null)} fullWidth maxWidth="lg">
                <DialogTitle>{detail?.supplier.name}{detail && !detail.supplier.is_active ? " (inactivo)" : ""}</DialogTitle>
                <DialogContent>
                    {detail && (
                        <Stack spacing={3}>
                            <div>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>Deudas</Typography>
                                {detail.payables.length === 0 ? <Typography color="text.secondary">Sin deudas.</Typography>
                                    : <PayablesTable payables={detail.payables} showPayee={false} {...tableProps} />}
                            </div>
                            <div>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>Compras (lotes)</Typography>
                                {detail.purchases.length === 0 ? <Typography color="text.secondary">Sin compras registradas.</Typography> : (
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Fecha</TableCell><TableCell>Producto</TableCell><TableCell>Almacén</TableCell>
                                                    <TableCell align="right">Unidades</TableCell><TableCell align="right">Costo total</TableCell>
                                                    <TableCell align="right">Costo unitario</TableCell><TableCell>Pago</TableCell><TableCell />
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {detail.purchases.map((p) => (
                                                    <TableRow key={p.id}>
                                                        <TableCell sx={{ whiteSpace: "nowrap" }}>{day(p.purchased_at.slice(0, 10))}</TableCell>
                                                        <TableCell>{p.product}</TableCell>
                                                        <TableCell>{p.warehouse}</TableCell>
                                                        <TableCell align="right">{p.quantity}</TableCell>
                                                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{original(p.total_amount, p.currency, p.rate)}</TableCell>
                                                        <TableCell align="right" sx={{ whiteSpace: "nowrap", fontWeight: 600 }}>{money(p.unit_cost_usd)}</TableCell>
                                                        <TableCell>{p.payment_type_label}</TableCell>
                                                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                                                            {p.has_receipt && <Button size="small" onClick={() => download(`/finance/purchases/${p.id}/receipt`, `compra-${p.id}`)}>Comprobante</Button>}
                                                            <Button size="small" onClick={() => setCorrecting(p)}>Corregir costo</Button>
                                                            <Button size="small" color="inherit" onClick={() => setHistory({ type: "inventory_purchase", id: p.id, title: `Compra de ${p.product}` })}>Historial</Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                )}
                            </div>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions><Button onClick={() => setDetail(null)}>Cerrar</Button></DialogActions>
            </Dialog>

            <SupplierDialog open={editing !== null} supplier={editing === "new" ? null : editing} onClose={() => setEditing(null)}
                onSaved={() => { setEditing(null); load(); }} />
            <PayDialog payable={paying} options={options} onClose={() => setPaying(null)} onDone={() => { setPaying(null); refresh(); }} />
            <VoidPaymentDialog target={voiding} onClose={() => setVoiding(null)} onDone={() => { setVoiding(null); refresh(); }} />
            <PurchaseCorrectDialog purchase={correcting} options={options} onClose={() => setCorrecting(null)} onSaved={() => { setCorrecting(null); refresh(); }} />
            <AuditHistoryDialog subject={history} onClose={() => setHistory(null)} />
        </Stack>
    );
};
