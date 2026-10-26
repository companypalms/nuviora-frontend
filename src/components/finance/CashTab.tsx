// src/components/finance/CashTab.tsx
// Finanzas › Caja (Módulo 4 de Fran, entrega 3; §34 a §36, §42, §75, §76, R14): cuánto dinero hay y dónde está.
// - Cada cuenta con su saldo: el saldo empresarial inicial (§36) más sus movimientos. Los saldos en Bs se ven en USD con la
//   tasa de Binance, como aproximados.
// - Los pagos digitales entran desde la conciliación del Módulo 1 el día que se pagaron, aunque la orden no esté entregada
//   (anticipo, §76), con su estado (§75); el efectivo entra al entregar a "Efectivo pendiente" de su agencia (§42).
// - Cada movimiento dice de dónde salió y llega hasta la orden. Nada se borra (§83): lo anulado se puede ver.
// Solo el Admin (§81).
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Link, MenuItem, Stack, Switch, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import { Panel, PanelHeader } from "../ui/surface/Panel";
import { AuditHistoryDialog } from "./AuditHistoryDialog";
import { CashAccountDialog } from "./CashAccountDialog";
import { CashMovementDialog } from "./CashMovementDialog";
import { CashDashboardPanel } from "./CashDashboardPanel";
import { PayablesPanel, ReceivablesPanel } from "./CashDebtsPanels";
import { RefundsWithoutAccount } from "./RefundsWithoutAccount";
import { OpeningBalancesDialog } from "./OpeningBalancesDialog";
import { OrderEconomicsDialog } from "./OrderEconomicsDialog";
import { PeriodPicker } from "./PeriodPicker";
import {
    CashAccount, CashResponse, CashTransaction, CashTransactionsResponse, FinanceOptions, api, cashAmount, day, download, errorMessage, money, monthRange,
} from "./finance";

const Stat: React.FC<{ label: string; value: React.ReactNode; hint: string; warn?: boolean }> = ({ label, value, hint, warn }) => (
    <Box sx={{ minWidth: 150, flex: "1 1 150px" }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="h6" color={warn ? "warning.main" : undefined}>{value}</Typography>
        <Typography variant="caption" color="text.secondary">{hint}</Typography>
    </Box>
);

const STATUS_COLOR: Record<string, "success" | "warning" | "error"> = { confirmed: "success", pending: "warning", not_found: "error" };

/** §83: anular un movimiento a mano, con el motivo. */
const VoidMovementDialog: React.FC<{ target: CashTransaction | null; onClose: () => void; onDone: () => void }> = ({ target, onClose, onDone }) => {
    const [reason, setReason] = useState("");
    const [saving, setSaving] = useState(false);
    if (!target?.movement) return null;
    const save = async () => {
        setSaving(true);
        try {
            toast.success((await api<{ message: string }>(`/finance/cash/movements/${target.movement!.id}/void`, "POST", { reason: reason.trim() })).message);
            setReason("");
            onDone();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };
    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Anular: {target.movement.kind_label}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        Se anulan todas sus partes (lo que salió, lo que entró y la comisión, si la hay). Quedan a la vista como anuladas. Si estaba mal, se registra de nuevo.
                    </Typography>
                    <TextField label="¿Por qué se anula?" value={reason} onChange={(e) => setReason(e.target.value)} required autoFocus inputProps={{ maxLength: 500 }} />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button color="inherit" onClick={onClose}>Cancelar</Button>
                <Button color="error" variant="contained" onClick={save} disabled={saving || reason.trim() === ""}>Anular</Button>
            </DialogActions>
        </Dialog>
    );
};

const AccountsTable: React.FC<{ accounts: CashAccount[]; onEdit: (a: CashAccount) => void; onHistory: (a: CashAccount) => void; onShow: (a: CashAccount) => void }> = ({ accounts, onEdit, onHistory, onShow }) => (
    <TableContainer>
        <Table size="small">
            <TableHead>
                <TableRow>
                    <TableCell>Cuenta</TableCell><TableCell align="right">Saldo inicial</TableCell><TableCell align="right">Saldo</TableCell>
                    <TableCell align="right">En USD</TableCell><TableCell />
                </TableRow>
            </TableHead>
            <TableBody>
                {accounts.map((a) => (
                    <TableRow key={a.id} sx={{ opacity: a.is_active ? 1 : 0.55 }}>
                        <TableCell sx={{ minWidth: 200 }}>
                            <Typography variant="body2" fontWeight={600}>{a.name}</Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                                {a.kind_label}{!a.is_active ? " · inactiva" : ""}
                                {a.methods.length > 0 ? ` · recibe ${a.methods.map((m) => m.name).join(", ")}` : ""}
                            </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                            {a.opening_balance === null ? <Chip size="small" color="warning" variant="outlined" label="sin poner" /> : cashAmount(a.opening_balance, a.currency)}
                            <Typography variant="caption" color="text.secondary" display="block">al {day(a.opening_date)}</Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                            <Typography variant="body2" fontWeight={600}>{cashAmount(a.balance, a.currency)}</Typography>
                            {Math.abs(a.pending) >= 0.005 && <Typography variant="caption" color="warning.main" display="block">{cashAmount(a.pending, a.currency)} por conciliar</Typography>}
                            {a.not_found_count > 0 && <Typography variant="caption" color="error.main" display="block">{a.not_found_count} no encontrado(s): no cuentan</Typography>}
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                            {a.balance_usd === null ? "—" : <>{a.approximate ? "≈ " : ""}{money(a.balance_usd)}</>}
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                            <Button size="small" onClick={() => onShow(a)} disabled={a.movements === 0}>Movimientos</Button>
                            <Button size="small" onClick={() => onEdit(a)}>Editar</Button>
                            <Button size="small" color="inherit" onClick={() => onHistory(a)}>Historial</Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </TableContainer>
);

export const CashTab: React.FC<{ options: FinanceOptions }> = ({ options }) => {
    const [data, setData] = useState<CashResponse | null>(null);
    const [[from, to], setRange] = useState<[string, string]>(monthRange());
    const [accountId, setAccountId] = useState("");
    const [kind, setKind] = useState("");
    const [voided, setVoided] = useState(false);
    const [page, setPage] = useState(1);
    const [txs, setTxs] = useState<CashTransactionsResponse | null>(null);
    const [editing, setEditing] = useState<CashAccount | "new" | null>(null);
    const [opening, setOpening] = useState(false);
    const [history, setHistory] = useState<CashAccount | null>(null);
    const [orderId, setOrderId] = useState<number | null>(null);
    const [moving, setMoving] = useState(false);
    const [voiding, setVoiding] = useState<CashTransaction | null>(null);
    // §46: el tablero tiene su propio período (las entradas y salidas); "version" lo vuelve a pedir cuando la caja cambia
    const [[dashFrom, dashTo], setDashRange] = useState<[string, string]>(monthRange());
    const [version, setVersion] = useState(0);

    const load = useCallback(() => {
        api<CashResponse>("/finance/cash").then(setData).catch((e) => toast.error(errorMessage(e)));
    }, []);
    const loadTxs = useCallback(() => {
        const qs = new URLSearchParams({ from, to, page: String(page), ...(accountId ? { account_id: accountId } : {}), ...(kind ? { kind } : {}), ...(voided ? { voided: "1" } : {}) });
        api<CashTransactionsResponse>(`/finance/cash/transactions?${qs}`).then(setTxs).catch((e) => toast.error(errorMessage(e)));
    }, [from, to, page, accountId, kind, voided]);
    useEffect(() => { load(); }, [load]);
    useEffect(() => { loadTxs(); }, [loadTxs]);

    const refresh = () => { load(); loadTxs(); setVersion((v) => v + 1); };
    const link = async (companyAccountId: number, financialAccountId: string) => {
        try {
            toast.success((await api<{ message: string }>(`/finance/cash/company-accounts/${companyAccountId}`, "PUT",
                { financial_account_id: financialAccountId ? Number(financialAccountId) : null })).message);
            refresh();
        } catch (e) { toast.error(errorMessage(e)); }
    };

    if (!data) return <Typography color="text.secondary" sx={{ p: 1 }}>Cargando…</Typography>;
    const t = data.totals;
    const own = data.accounts.filter((a) => a.kind !== "agency_cash");
    const agencies = data.accounts.filter((a) => a.kind === "agency_cash");
    // Las activas, más la que ya tiene enlazada (aunque esté inactiva)
    const linkable = (c: { financial_account_id: number | null }) => own.filter((a) => a.is_active || a.id === c.financial_account_id);

    return (
        <Stack spacing={2}>
            <Alert severity="info">
                La caja arranca con el saldo del negocio al cierre del <b>{day(data.start_date)}</b>: lo de antes ya está en ese saldo. Los pagos digitales
                entran desde la conciliación el día que se pagaron, aunque la orden no esté entregada (es un anticipo hasta que se entrega). El efectivo
                entra al entregar, a "Efectivo pendiente" de la agencia que lo cobró.
            </Alert>
            {t.without_opening > 0 && (
                <Alert severity="warning" action={<Button color="inherit" size="small" onClick={() => setOpening(true)}>Poner saldos</Button>}>
                    {t.without_opening} cuenta(s) sin saldo inicial: cuentan desde $0 hasta que se ponga.
                </Alert>
            )}
            {t.not_found_count > 0 && (
                <Alert severity="error">
                    {t.not_found_count} pago(s) no aparecieron en el extracto del banco (≈ {money(t.not_found_usd)}): no cuentan en el saldo hasta que se
                    resuelvan en Conciliación (confirmar, vincular o marcar como no recibido).
                </Alert>
            )}
            {data.warnings.unlinked.length > 0 && (
                <Alert severity="warning">Lo que llega por {data.warnings.unlinked.join(", ")} no entra a la caja: falta decir a qué cuenta va (abajo, "Por dónde entra el dinero").</Alert>
            )}
            <RefundsWithoutAccount refunds={data.warnings.refunds_without_account} options={options} onSaved={refresh} />
            {data.warnings.items_without_account > 0 && (
                <Alert severity="warning">{data.warnings.items_without_account} pago(s) de la conciliación no dicen a qué cuenta llegaron (hay varias cuentas activas con ese método): no entran a la caja.</Alert>
            )}

            <Panel><PeriodPicker value={[dashFrom, dashTo]} onChange={setDashRange} /></Panel>
            <CashDashboardPanel from={dashFrom} to={dashTo} refreshKey={version} />

            <Panel>
                <PanelHeader title="Cuentas de la empresa" subtitle="El saldo de cada cuenta: su saldo inicial más sus movimientos."
                    action={<Stack direction="row" gap={1}>
                        <Button size="small" variant="outlined" onClick={() => setOpening(true)}>Saldos iniciales</Button>
                        <Button size="small" variant="outlined" onClick={() => setEditing("new")}>Nueva cuenta</Button>
                        <Button size="small" variant="contained" onClick={() => setMoving(true)}>Nuevo movimiento</Button>
                    </Stack>} />
                <Stack direction="row" gap={2} flexWrap="wrap" sx={{ mb: 1.5 }}>
                    <Stat label="Por conciliar" value={`≈ ${money(t.pending_usd)}`} hint="pagos que todavía no están en un extracto" warn={t.pending_usd > 0} />
                    <Stat label="Tasa Binance" value={data.binance_rate ? `Bs ${new Intl.NumberFormat("es-VE").format(data.binance_rate)}` : "—"} hint="para mostrar los Bs en USD" />
                </Stack>
                <AccountsTable accounts={own} onEdit={setEditing} onHistory={setHistory} onShow={(a) => { setAccountId(String(a.id)); setPage(1); }} />
            </Panel>

            {agencies.length > 0 && (
                <Panel>
                    <PanelHeader title="Efectivo pendiente en agencias" subtitle="Lo que cobraron en efectivo al entregar, menos el vuelto que dieron. Baja cuando lo liquidan." />
                    <AccountsTable accounts={agencies} onEdit={setEditing} onHistory={setHistory} onShow={(a) => { setAccountId(String(a.id)); setPage(1); }} />
                </Panel>
            )}

            <Panel>
                <PanelHeader title="Movimientos" subtitle={txs ? `Entró ${money(txs.inflow_usd)} y salió ${money(Math.abs(txs.outflow_usd))} (en USD, sin lo anulado ni lo no encontrado).` : undefined} />
                <Stack spacing={1.5}>
                    <PeriodPicker value={[from, to]} onChange={(v) => { setRange(v); setPage(1); }}>
                        <TextField select size="small" label="Cuenta" value={accountId} onChange={(e) => { setAccountId(e.target.value); setPage(1); }} sx={{ minWidth: 200 }}>
                            <MenuItem value="">Todas</MenuItem>
                            {data.accounts.map((a) => <MenuItem key={a.id} value={String(a.id)}>{a.name}</MenuItem>)}
                        </TextField>
                        <TextField select size="small" label="Tipo" value={kind} onChange={(e) => { setKind(e.target.value); setPage(1); }} sx={{ minWidth: 180 }}>
                            <MenuItem value="">Todos</MenuItem>
                            {Object.entries(data.transaction_kinds).map(([k, label]) => <MenuItem key={k} value={k}>{label}</MenuItem>)}
                        </TextField>
                        <FormControlLabel control={<Switch checked={voided} onChange={(e) => { setVoided(e.target.checked); setPage(1); }} />} label="Ver anulados" />
                    </PeriodPicker>
                    {!txs ? <Typography color="text.secondary">Cargando…</Typography> : txs.transactions.length === 0 ? (
                        <Typography color="text.secondary">No hay movimientos en este filtro.</Typography>
                    ) : (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Fecha</TableCell><TableCell>Cuenta</TableCell><TableCell>Qué fue</TableCell>
                                        <TableCell align="right">Monto</TableCell><TableCell align="right">En USD</TableCell><TableCell>Estado</TableCell><TableCell />
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {txs.transactions.map((x) => (
                                        <TableRow key={x.id} sx={x.voided_at ? { "& td": { color: "text.disabled" } } : undefined}>
                                            <TableCell sx={{ whiteSpace: "nowrap" }}>{day(x.date)}</TableCell>
                                            <TableCell>{x.account}</TableCell>
                                            <TableCell sx={{ minWidth: 220 }}>
                                                <Typography variant="body2">{x.kind_label}</Typography>
                                                <Typography variant="caption" color="text.secondary" display="block">
                                                    {x.order_id ? <Link component="button" variant="caption" onClick={() => setOrderId(x.order_id)}>{x.description}</Link> : x.description}
                                                </Typography>
                                                {x.voided_at && <Typography variant="caption" color="error.main" display="block">Anulado el {day(x.voided_at.slice(0, 10))}: {x.void_reason}</Typography>}
                                            </TableCell>
                                            <TableCell align="right" sx={{ whiteSpace: "nowrap", textDecoration: x.voided_at ? "line-through" : undefined }}>
                                                {cashAmount(x.amount, x.currency)}
                                                {x.currency === "VES" && <Typography variant="caption" color="text.secondary" display="block">tasa {new Intl.NumberFormat("es-VE", { maximumFractionDigits: 4 }).format(x.rate)}</Typography>}
                                            </TableCell>
                                            <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{money(x.amount_usd)}</TableCell>
                                            <TableCell>
                                                {x.kind === "customer_payment" && !x.voided_at
                                                    ? <Chip size="small" variant="outlined" color={STATUS_COLOR[x.status]} label={x.status_label} />
                                                    : null}
                                            </TableCell>
                                            <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                                                {x.movement?.has_receipt && (
                                                    <Button size="small" onClick={() => download(`/finance/cash/movements/${x.movement!.id}/receipt`, `movimiento-${x.movement!.id}`)}>Comprobante</Button>
                                                )}
                                                {x.movement && !x.movement.voided && <Button size="small" color="error" onClick={() => setVoiding(x)}>Anular</Button>}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                    {txs && txs.last_page > 1 && (
                        <Stack direction="row" gap={1} alignItems="center" justifyContent="flex-end">
                            <Button size="small" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anteriores</Button>
                            <Typography variant="caption" color="text.secondary">Página {txs.page} de {txs.last_page} ({txs.total} movimientos)</Typography>
                            <Button size="small" disabled={page >= txs.last_page} onClick={() => setPage((p) => p + 1)}>Siguientes</Button>
                        </Stack>
                    )}
                </Stack>
            </Panel>

            <PayablesPanel options={options} onChanged={refresh} />
            <ReceivablesPanel options={options} onChanged={refresh} />

            <Panel>
                <PanelHeader title="Por dónde entra el dinero" subtitle="Las cuentas de la conciliación (una por método) y la cuenta de la caja donde cae lo que llega por ellas." />
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow><TableCell>Método (conciliación)</TableCell><TableCell>Extracto</TableCell><TableCell>Entra a</TableCell></TableRow>
                        </TableHead>
                        <TableBody>
                            {data.company_accounts.map((c) => (
                                <TableRow key={c.id} sx={{ opacity: c.is_active ? 1 : 0.55 }}>
                                    <TableCell>
                                        <Typography variant="body2">{c.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">{c.method_label} · {c.currency}{!c.is_active ? " · inactiva" : ""}</Typography>
                                    </TableCell>
                                    <TableCell>{c.statement_source ?? "—"}</TableCell>
                                    <TableCell>
                                        <Tooltip title="Los pagos de este método que ya están en la caja se mueven a la cuenta que elijas.">
                                            <TextField select size="small" value={c.financial_account_id ? String(c.financial_account_id) : ""} sx={{ minWidth: 200 }}
                                                onChange={(e) => link(c.id, e.target.value)}>
                                                <MenuItem value=""><em>Ninguna (no entra a la caja)</em></MenuItem>
                                                {linkable(c).map((a) => <MenuItem key={a.id} value={String(a.id)}>{a.name} ({a.currency}){!a.is_active ? " · inactiva" : ""}</MenuItem>)}
                                            </TextField>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Panel>

            <CashAccountDialog account={editing} kinds={data.kinds} currencies={data.currencies} startDate={data.start_date}
                onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />
            <OpeningBalancesDialog open={opening} accounts={data.accounts} startDate={data.start_date}
                onClose={() => setOpening(false)} onSaved={() => { setOpening(false); refresh(); }} />
            <AuditHistoryDialog subject={history ? { type: "financial_account", id: history.id, title: history.name } : null} onClose={() => setHistory(null)} />
            <CashMovementDialog open={moving} accounts={data.accounts} kinds={data.movement_kinds} onClose={() => setMoving(false)}
                onSaved={() => { setMoving(false); refresh(); }} />
            <VoidMovementDialog target={voiding} onClose={() => setVoiding(null)} onDone={() => { setVoiding(null); refresh(); }} />
            <OrderEconomicsDialog orderId={orderId} onClose={() => setOrderId(null)} />
        </Stack>
    );
};
