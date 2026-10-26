// src/components/replenishment/PlanPanel.tsx
// Reabastecimiento › Plan (Módulo 5 de Fran, entrega 3). El Admin elige la cobertura y pulsa "Generar plan" (§4). Se
// muestra en el orden operativo (§55): COMPRAR, TRANSFERIR y EXCESOS/ALERTAS, más el capital (§84–§87) y el balance
// final (§121). Ninguna cifra es una caja negra: cada compra trae su "por qué" (§88) y el detalle por línea (§79).
// Cada plan queda guardado (§96). Entrega 4: "Aprobar plan" (§89–§92) y, ya aprobado, "Descargar PDF de ruta" para el
// chofer (§112); cada compra y traslado muestra lo aprobado junto a lo recomendado (§89).
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert, Box, Button, Chip, Collapse, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    TextField, ToggleButton, ToggleButtonGroup, Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import { Panel, PanelHeader } from "../ui/surface/Panel";
import { api, errorMessage, money, num } from "../finance/finance";
import { request } from "../../common/request";
import { ReplConfig } from "./replenishment";
import { ApprovePlanDialog } from "./ApprovePlanDialog";

type Purchase = {
    product_id: number; variant_id: number | null; product: string; variant: string | null; ideal: number; recommended: number; reason: string | null;
    unit_cost_usd: number | null; cost_usd: number | null; supplier: string | null; receiving_warehouse: string | null; lead_time_days: number | null;
    score: number; priority: string; buy_today: boolean; explanation: string[];
    id: number; supplier_id: number | null; receiving_warehouse_id: number | null; approved_qty: number | null; inventory_purchase_id: number | null;
};
type Transfer = {
    from_warehouse_id: number; from: string; to_warehouse_id: number; to: string; product: string; variant: string | null; quantity: number; depends_on_purchase: boolean; reason: string;
    id: number; approved_qty: number | null; approved_from_warehouse_id: number | null; approved_to_warehouse_id: number | null; inventory_transfer_id: number | null;
};
type AlertRow = { level: "red" | "orange" | "blue" | "black" | "gray"; title: string; text: string };
type Line = {
    warehouse: string; product: string; variant: string | null; physical: number; reserved: number; available: number; in_transit: number; incoming: number;
    forecast_daily: number; base_daily: number; trend: string; trend_pct: number | null; coverage_days: number | null; target_days: number; coverage_after: number | null;
    light: string; score: number; priority: string; confidence: string; cpa: { health: string; meta_cpa: number | null; target: number | null; break_even: number | null };
    need_units: number; reasons: string[];
};
type Plan = {
    id: number; generated_at: string; generated_by: string | null; version: string; coverage_days: number; safety_days: number; operative_days: number;
    purchases: Purchase[]; transfers: Transfer[]; alerts: AlertRow[]; lines: Line[]; pending_settings: string[];
    approved_at: string | null; approved_by: string | null;
    capital: { required_usd: number; cash_usd: number | null; additional_usd: number | null; units_without_cost: number };
    balance: { warehouse: string; stock_now: number; stock_after: number; coverage_now: number | null; coverage_after: number | null }[];
};
type Summary = { id: number; generated_at: string; generated_by: string | null; coverage_days: number; capital_required_usd: number };

const LIGHT: Record<string, string> = { red: "🔴", orange: "🟠", green: "🟢", blue: "🔵", black: "⚫", gray: "⚪" };
const CONF: Record<string, string> = { high: "Alta", medium: "Media", low: "Baja" };
const days = (v: number | null) => (v === null ? "—" : `${String(v).replace(".", ",")} d`);

/** §112: baja el PDF de ruta del chofer */
const downloadRoutePdf = async (planId: number) => {
    try {
        const { status, response } = await request(`/finance/replenishment/plans/${planId}/route-pdf`, "GET");
        if (status !== 200) {
            const json = await response.json().catch(() => ({}));
            toast.error(json?.message || "No se pudo bajar el PDF");
            return;
        }
        const href = URL.createObjectURL(await response.blob());
        const a = document.createElement("a");
        a.href = href;
        a.download = `ruta-plan-${planId}.pdf`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(href), 60_000);
    } catch {
        toast.error("Error de conexión");
    }
};

export const PlanPanel: React.FC<{ config: ReplConfig }> = ({ config }) => {
    const [coverage, setCoverage] = useState(String(config.settings.coverage_days));
    const [approving, setApproving] = useState(false);
    const [plan, setPlan] = useState<Plan | null>(null);
    const [history, setHistory] = useState<Summary[]>([]);
    const [busy, setBusy] = useState(false);
    const [groupBy, setGroupBy] = useState<"product" | "supplier">("product");
    const [open, setOpen] = useState<string | null>(null);
    const [showLines, setShowLines] = useState(false);

    const loadHistory = useCallback(() => {
        api<{ plans: Summary[] }>("/finance/replenishment/plans").then((r) => {
            setHistory(r.plans);
            if (!plan && r.plans[0]) api<{ plan: Plan }>(`/finance/replenishment/plans/${r.plans[0].id}`).then((p) => setPlan(p.plan)).catch(() => undefined);
        }).catch((e) => toast.error(errorMessage(e)));
    }, [plan]);
    useEffect(() => { loadHistory(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const generate = async () => {
        setBusy(true);
        try {
            const r = await api<{ message: string; plan: Plan }>("/finance/replenishment/plans", "POST", { coverage_days: num(coverage) });
            setPlan(r.plan);
            toast.success(r.message);
            loadHistory();
        } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
    };
    const openPlan = async (id: number) => {
        try { setPlan((await api<{ plan: Plan }>(`/finance/replenishment/plans/${id}`)).plan); } catch (e) { toast.error(errorMessage(e)); }
    };

    const groups = plan ? plan.purchases.reduce<Record<string, Purchase[]>>((acc, p) => {
        const k = groupBy === "supplier" ? (p.supplier ?? "Sin proveedor configurado") : p.product;
        (acc[k] ??= []).push(p);
        return acc;
    }, {}) : {};
    const whName = (id: number | null) => config.warehouses.find((w) => w.id === id)?.name ?? "?";
    /** §89: lo aprobado junto a lo recomendado */
    const approvedText = (t: Transfer) => {
        if (t.approved_qty === null) return "";
        if (t.approved_qty === 0) return " · no aprobado";
        const moved = t.approved_from_warehouse_id !== t.from_warehouse_id || t.approved_to_warehouse_id !== t.to_warehouse_id;
        if (t.approved_qty === t.quantity && !moved) return " · aprobado";
        return ` · aprobado ${t.approved_qty}${moved ? ` (${whName(t.approved_from_warehouse_id)} → ${whName(t.approved_to_warehouse_id)})` : ""}`;
    };
    const transferGroups = plan ? plan.transfers.reduce<Record<string, Transfer[]>>((acc, t) => {
        (acc[`${t.from} → ${t.to}`] ??= []).push(t);
        return acc;
    }, {}) : {};

    return (
        <Stack spacing={2}>
            <Panel>
                <PanelHeader title="Generar plan de inventario" subtitle="Elige cuántos días de cobertura quieres y el sistema calcula qué comprar, qué trasladar y qué vigilar." />
                <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} alignItems={{ sm: "center" }} sx={{ p: 2, pt: 0 }}>
                    <TextField size="small" label="Cobertura objetivo (días)" value={coverage} onChange={(e) => setCoverage(e.target.value)} sx={{ width: 200 }}
                        inputProps={{ inputMode: "decimal" }} />
                    <Button variant="contained" size="large" disabled={busy || !(num(coverage) >= 1)} onClick={generate}>{busy ? "Calculando…" : "Generar plan"}</Button>
                    {history.length > 0 && (
                        <TextField select size="small" label="Planes anteriores" value={plan?.id ?? ""} onChange={(e) => openPlan(Number(e.target.value))} sx={{ minWidth: 260, ml: { sm: "auto" } }}>
                            {history.map((h) => <MenuItem key={h.id} value={h.id}>#{h.id} · {h.generated_at} · {h.coverage_days} días · {money(h.capital_required_usd)}</MenuItem>)}
                        </TextField>
                    )}
                </Stack>
            </Panel>

            {!plan ? <Typography color="text.secondary">Todavía no hay planes. Pulsa "Generar plan".</Typography> : (
                <>
                    <Stack direction={{ xs: "column", sm: "row" }} gap={1} alignItems={{ sm: "center" }}>
                        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                            Plan #{plan.id} del {plan.generated_at}{plan.generated_by ? ` (${plan.generated_by})` : " (automático)"} · cobertura operativa {plan.coverage_days} + {plan.safety_days} = <b>{plan.operative_days} días</b> · versión {plan.version}
                        </Typography>
                        {plan.approved_at ? (
                            <>
                                <Chip color="success" label={`Aprobado el ${plan.approved_at}${plan.approved_by ? ` por ${plan.approved_by}` : ""}`} />
                                <Button variant="contained" onClick={() => downloadRoutePdf(plan.id)}>Descargar PDF de ruta</Button>
                            </>
                        ) : (
                            <Button variant="contained" color="success" disabled={plan.purchases.length + plan.transfers.length === 0} onClick={() => setApproving(true)}>
                                Aprobar plan
                            </Button>
                        )}
                    </Stack>
                    {plan.approved_at && (
                        <Alert severity="success">
                            Las compras aprobadas están "por recibir" y los traslados "pendientes de salir" en Inventario › En camino. El PDF de ruta lleva exactamente lo aprobado, sin costos.
                        </Alert>
                    )}
                    {plan.pending_settings.length > 0 && (
                        <Alert severity="warning">Este plan usa valores propuestos que Fran todavía no confirmó (semáforo, stock muerto, Pausado o tendencia). Se cambian en Configuración.</Alert>
                    )}

                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                        <Typography variant="overline">Capital</Typography>
                        <Stack direction={{ xs: "column", sm: "row" }} gap={3}>
                            <Box><Typography variant="caption" color="text.secondary">Capital requerido para el plan</Typography><Typography variant="h6">{money(plan.capital.required_usd)}</Typography></Box>
                            <Box><Typography variant="caption" color="text.secondary">Caja disponible para inventario</Typography><Typography variant="h6">{plan.capital.cash_usd === null ? "—" : money(plan.capital.cash_usd)}</Typography></Box>
                            <Box><Typography variant="caption" color="text.secondary">Capital adicional requerido</Typography>
                                <Typography variant="h6" color={plan.capital.additional_usd ? "warning.main" : undefined}>{plan.capital.additional_usd === null ? "—" : money(plan.capital.additional_usd)}</Typography></Box>
                        </Stack>
                        {plan.capital.units_without_cost > 0 && <Typography variant="caption" color="warning.main">{plan.capital.units_without_cost} unidades sin costo conocido no suman al capital.</Typography>}
                    </Paper>

                    <Panel>
                        <PanelHeader title="1. Comprar" subtitle="La cifra para hablar con el proveedor. No se le pide nada automáticamente."
                            action={<ToggleButtonGroup size="small" exclusive value={groupBy} onChange={(_, v) => v && setGroupBy(v)}>
                                <ToggleButton value="product">Por producto</ToggleButton><ToggleButton value="supplier">Por proveedor</ToggleButton>
                            </ToggleButtonGroup>} />
                        {plan.purchases.length === 0 ? <Alert severity="success" sx={{ m: 2 }}>No hace falta comprar nada para esta cobertura.</Alert> : (
                            <TableContainer sx={{ p: 1 }}>
                                <Table size="small">
                                    <TableHead><TableRow>
                                        <TableCell>Producto</TableCell><TableCell>Variante</TableCell><TableCell align="right">Comprar</TableCell><TableCell align="right">Costo</TableCell>
                                        <TableCell>Proveedor · llega a</TableCell><TableCell>Urgencia</TableCell><TableCell />
                                    </TableRow></TableHead>
                                    <TableBody>
                                        {Object.entries(groups).map(([g, rows]) => (
                                            <React.Fragment key={g}>
                                                {groupBy === "supplier" && <TableRow><TableCell colSpan={7} sx={{ fontWeight: 700, bgcolor: "action.hover" }}>{g} · total {rows.reduce((a, r) => a + r.recommended, 0)} unidades</TableCell></TableRow>}
                                                {rows.map((p) => {
                                                    const key = `${p.product_id}-${p.variant_id}`;
                                                    return (
                                                        <React.Fragment key={key}>
                                                            <TableRow>
                                                                <TableCell>{p.product}</TableCell>
                                                                <TableCell>{p.variant ?? "—"}</TableCell>
                                                                <TableCell align="right">
                                                                    <b>{p.recommended}</b>
                                                                    {p.ideal !== p.recommended && <Typography variant="caption" color="text.secondary" display="block">ideal {p.ideal}</Typography>}
                                                                    {p.approved_qty !== null && (
                                                                        <Typography variant="caption" display="block" color={p.approved_qty === p.recommended ? "success.main" : "warning.main"}>
                                                                            {p.approved_qty === 0 ? "no aprobada" : `aprobadas ${p.approved_qty}`}
                                                                        </Typography>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell align="right">{p.cost_usd === null ? "—" : money(p.cost_usd)}</TableCell>
                                                                <TableCell>{p.supplier ?? "Sin proveedor"}{p.receiving_warehouse ? ` · ${p.receiving_warehouse}` : ""}{p.lead_time_days !== null ? ` · ${p.lead_time_days} d` : ""}</TableCell>
                                                                <TableCell>
                                                                    <Chip size="small" label={`${p.priority} · ${p.score}`} color={p.score >= 90 ? "error" : p.score >= 70 ? "warning" : "default"} />
                                                                    {p.buy_today && <Chip size="small" color="error" variant="outlined" label="Comprar hoy" sx={{ ml: 0.5 }} />}
                                                                </TableCell>
                                                                <TableCell><Button size="small" onClick={() => setOpen(open === key ? null : key)}>¿Por qué?</Button></TableCell>
                                                            </TableRow>
                                                            <TableRow><TableCell colSpan={7} sx={{ py: 0, border: open === key ? undefined : 0 }}>
                                                                <Collapse in={open === key}>
                                                                    <Box sx={{ py: 1 }}>
                                                                        {p.explanation.map((x, i) => <Typography key={i} variant="body2">{x}</Typography>)}
                                                                        {p.reason && <Typography variant="body2" color="warning.main" sx={{ mt: 0.5 }}>Compra ideal {p.ideal}, recomendada {p.recommended}. Motivo: {p.reason}</Typography>}
                                                                    </Box>
                                                                </Collapse>
                                                            </TableCell></TableRow>
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </React.Fragment>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Panel>

                    <Panel>
                        <PanelHeader title="2. Transferir" subtitle="Qué sacar de cada almacén y hacia dónde llevarlo, por talla." />
                        {plan.transfers.length === 0 ? <Alert severity="success" sx={{ m: 2 }}>No hace falta trasladar nada.</Alert> : (
                            <Stack spacing={1.5} sx={{ p: 2 }}>
                                {Object.entries(transferGroups).map(([g, rows]) => (
                                    <Box key={g} sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 1.5 }}>
                                        <Typography variant="subtitle2">{g}</Typography>
                                        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.5 }}>
                                            {rows.map((t, i) => (
                                                <Chip key={i} size="small" color={t.depends_on_purchase ? "warning" : "default"} variant={t.depends_on_purchase ? "outlined" : "filled"}
                                                    sx={t.approved_qty === 0 ? { textDecoration: "line-through" } : undefined}
                                                    label={`${t.product}${t.variant ? ` ${t.variant}` : ""}: ${t.quantity}${t.depends_on_purchase ? " · después de la recepción del proveedor" : ""}${approvedText(t)}`} />
                                            ))}
                                        </Box>
                                    </Box>
                                ))}
                            </Stack>
                        )}
                    </Panel>

                    <Panel>
                        <PanelHeader title="3. Excesos y alertas" subtitle="Quiebres, excesos, baja rotación, problemas de CPA y productos a liquidar." />
                        {plan.alerts.length === 0 ? <Alert severity="success" sx={{ m: 2 }}>Sin alertas.</Alert> : (
                            <Stack spacing={0.75} sx={{ p: 2 }}>
                                {plan.alerts.map((a, i) => (
                                    <Typography key={i} variant="body2">{LIGHT[a.level]} <b>{a.title}</b> — {a.text}</Typography>
                                ))}
                            </Stack>
                        )}
                    </Panel>

                    <Panel>
                        <PanelHeader title="Balance final" subtitle="Cuántos días de cobertura tendrá cada almacén después de ejecutar el plan." />
                        <TableContainer sx={{ p: 1 }}>
                            <Table size="small">
                                <TableHead><TableRow><TableCell>Almacén</TableCell><TableCell align="right">Stock hoy</TableCell><TableCell align="right">Cobertura hoy</TableCell>
                                    <TableCell align="right">Stock después</TableCell><TableCell align="right">Cobertura después</TableCell></TableRow></TableHead>
                                <TableBody>
                                    {plan.balance.map((b) => (
                                        <TableRow key={b.warehouse}><TableCell>{b.warehouse}</TableCell><TableCell align="right">{b.stock_now}</TableCell><TableCell align="right">{days(b.coverage_now)}</TableCell>
                                            <TableCell align="right">{b.stock_after}</TableCell><TableCell align="right"><b>{days(b.coverage_after)}</b></TableCell></TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Panel>

                    <Panel>
                        <PanelHeader title="Detalle por producto, talla y almacén" subtitle="Todos los datos con los que se calculó cada cifra."
                            action={<Button size="small" onClick={() => setShowLines(!showLines)}>{showLines ? "Ocultar" : "Ver"}</Button>} />
                        <Collapse in={showLines}>
                            <TableContainer sx={{ p: 1, maxHeight: 600 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead><TableRow>
                                        <TableCell /><TableCell>Producto</TableCell><TableCell>Almacén</TableCell><TableCell align="right">Físico</TableCell><TableCell align="right">Reservado</TableCell>
                                        <TableCell align="right">Disponible</TableCell><TableCell align="right">En camino</TableCell><TableCell align="right">Demanda/día</TableCell><TableCell>Tendencia</TableCell>
                                        <TableCell align="right">Cobertura</TableCell><TableCell align="right">Objetivo</TableCell><TableCell>CPA</TableCell><TableCell align="right">Prioridad</TableCell><TableCell>Confianza</TableCell>
                                    </TableRow></TableHead>
                                    <TableBody>
                                        {plan.lines.map((l, i) => (
                                            <TableRow key={i}>
                                                <TableCell>{LIGHT[l.light]}</TableCell>
                                                <TableCell>{l.product}{l.variant ? ` ${l.variant}` : ""}{l.reasons.length > 0 && <Typography variant="caption" color="text.secondary" display="block">{l.reasons.join(" · ")}</Typography>}</TableCell>
                                                <TableCell>{l.warehouse}</TableCell>
                                                <TableCell align="right">{l.physical}</TableCell><TableCell align="right">{l.reserved}</TableCell><TableCell align="right">{l.available}</TableCell>
                                                <TableCell align="right">{l.in_transit + l.incoming}</TableCell>
                                                <TableCell align="right">{String(l.forecast_daily).replace(".", ",")}</TableCell>
                                                <TableCell>{l.trend}{l.trend_pct !== null ? ` (${l.trend_pct > 0 ? "+" : ""}${String(l.trend_pct).replace(".", ",")} %)` : ""}</TableCell>
                                                <TableCell align="right">{days(l.coverage_days)}</TableCell><TableCell align="right">{days(l.target_days)}</TableCell>
                                                <TableCell>{l.cpa.meta_cpa === null ? "—" : `${money(l.cpa.meta_cpa)} (T ${l.cpa.target === null ? "—" : money(l.cpa.target)} · BE ${l.cpa.break_even === null ? "—" : money(l.cpa.break_even)})`}</TableCell>
                                                <TableCell align="right">{l.score}</TableCell><TableCell>{CONF[l.confidence] ?? l.confidence}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Collapse>
                    </Panel>
                    <ApprovePlanDialog open={approving} planId={plan.id} purchases={plan.purchases} transfers={plan.transfers} config={config}
                        onClose={() => setApproving(false)} onApproved={() => { setApproving(false); openPlan(plan.id); }} />
                </>
            )}
        </Stack>
    );
};
