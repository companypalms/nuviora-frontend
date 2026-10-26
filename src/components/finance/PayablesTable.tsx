// src/components/finance/PayablesTable.tsx
// Las deudas con proveedores (Módulo 4 de Fran, §44): beneficiario, monto, vencimiento, pagado, pendiente y vencido. Cada
// deuda se abre para ver sus pagos (§17); un pago no se borra: se anula con motivo y la deuda vuelve a subir (§83).
import React, { useState } from "react";
import {
    Box, Button, Chip, Collapse, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography,
} from "@mui/material";
import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRounded from "@mui/icons-material/KeyboardArrowUpRounded";
import { PAYABLE_STATUS, Payable, PayablePayment, day, download, inCurrency, money, original } from "./finance";

type Props = {
    payables: Payable[]; showPayee?: boolean;
    onPay: (p: Payable) => void; onVoid: (payment: PayablePayment, payable: Payable) => void; onHistory: (p: Payable) => void;
};

const PaymentsRow: React.FC<{ payable: Payable; onVoid: Props["onVoid"] }> = ({ payable, onVoid }) => {
    const payments = payable.payments ?? [];
    if (!payments.length) return <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>Todavía no tiene pagos.</Typography>;
    return (
        <Table size="small">
            <TableHead>
                <TableRow>
                    <TableCell>Fecha</TableCell><TableCell align="right">Pago</TableCell><TableCell align="right">Descuenta</TableCell>
                    <TableCell>Cuenta</TableCell><TableCell>Notas</TableCell><TableCell />
                </TableRow>
            </TableHead>
            <TableBody>
                {payments.map((p) => (
                    <TableRow key={p.id} sx={{ opacity: p.voided_at ? 0.55 : 1 }}>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{day(p.paid_at)}</TableCell>
                        <TableCell align="right" sx={{ whiteSpace: "nowrap", textDecoration: p.voided_at ? "line-through" : "none" }}>{original(p.amount, p.currency, p.rate)}</TableCell>
                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{inCurrency(p.applied_amount, payable.currency)}</TableCell>
                        <TableCell>{p.account ?? <Typography variant="caption" color="text.secondary">Sin indicar</Typography>}</TableCell>
                        <TableCell sx={{ minWidth: 140 }}>
                            {p.voided_at ? <Typography variant="caption" color="error">Anulado: {p.void_reason}</Typography> : p.notes}
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                            {p.has_receipt && <Button size="small" onClick={() => download(`/finance/payable-payments/${p.id}/receipt`, `pago-${p.id}`)}>Comprobante</Button>}
                            {!p.voided_at && <Button size="small" color="error" onClick={() => onVoid(p, payable)}>Anular</Button>}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};

export const PayablesTable: React.FC<Props> = ({ payables, showPayee = true, onPay, onVoid, onHistory }) => {
    const [open, setOpen] = useState<number | null>(null);
    const cols = showPayee ? 9 : 8;

    return (
        <TableContainer>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell padding="checkbox" />
                        {showPayee && <TableCell>Proveedor</TableCell>}
                        <TableCell>Deuda</TableCell><TableCell>Vence</TableCell>
                        <TableCell align="right">Monto</TableCell><TableCell align="right">Pagado</TableCell><TableCell align="right">Pendiente</TableCell>
                        <TableCell>Estado</TableCell><TableCell />
                    </TableRow>
                </TableHead>
                <TableBody>
                    {payables.map((p) => (
                        <React.Fragment key={p.id}>
                            <TableRow hover>
                                <TableCell padding="checkbox">
                                    <Tooltip title={open === p.id ? "Ocultar pagos" : "Ver pagos"}>
                                        <IconButton size="small" aria-label={`Pagos de ${p.description}`} onClick={() => setOpen(open === p.id ? null : p.id)}>
                                            {open === p.id ? <KeyboardArrowUpRounded fontSize="small" /> : <KeyboardArrowDownRounded fontSize="small" />}
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                                {showPayee && <TableCell>{p.payee}</TableCell>}
                                <TableCell sx={{ minWidth: 170 }}>
                                    <Typography variant="body2">{p.description}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Del {day(p.issued_at)}{p.terms ? ` · ${p.terms}` : ""}
                                    </Typography>
                                </TableCell>
                                <TableCell sx={{ whiteSpace: "nowrap" }}>{day(p.due_date)}</TableCell>
                                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{inCurrency(p.amount, p.currency)}</TableCell>
                                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{inCurrency(p.paid_amount, p.currency)}</TableCell>
                                <TableCell align="right" sx={{ whiteSpace: "nowrap", fontWeight: 600 }}>
                                    {inCurrency(p.balance, p.currency)}
                                    {p.currency === "VES" && p.balance > 0 && (
                                        <Typography variant="caption" color="text.secondary" display="block">≈ {money(p.balance_usd)}</Typography>
                                    )}
                                </TableCell>
                                <TableCell><Chip size="small" color={PAYABLE_STATUS[p.status].color} label={PAYABLE_STATUS[p.status].label} /></TableCell>
                                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                                    {p.status !== "paid" && <Button size="small" variant="outlined" onClick={() => onPay(p)}>Registrar pago</Button>}
                                    <Button size="small" color="inherit" onClick={() => onHistory(p)}>Historial</Button>
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell colSpan={cols} sx={{ py: 0, borderBottom: open === p.id ? undefined : "none" }}>
                                    <Collapse in={open === p.id} unmountOnExit>
                                        <Box sx={{ py: 1, pl: { sm: 6 } }}><PaymentsRow payable={p} onVoid={onVoid} /></Box>
                                    </Collapse>
                                </TableCell>
                            </TableRow>
                        </React.Fragment>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};
