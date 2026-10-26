// src/components/finance/ProfitabilityTab.tsx
// Finanzas › Rentabilidad (Módulo 4 de Fran, §47 a §52): el estado por niveles de la empresa y la misma cuenta por
// producto, ciudad o producto + ciudad, "uno de los análisis principales" (§52). Cada fila abre sus pedidos (§49).
import React, { useEffect, useState } from "react";
import { Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { toast } from "react-toastify";
import { Panel, PanelHeader } from "../ui/surface/Panel";
import { GroupOrdersDialog } from "./GroupOrdersDialog";
import { PeriodPicker } from "./PeriodPicker";
import { PnlStatement } from "./PnlStatement";
import { StatusChip, StatusNotes } from "./StatusNotes";
import { GroupBy, GroupRow, PRESETS, PnlReport, api, day, errorMessage, money, pct } from "./finance";

const BY_LABEL: Record<GroupBy, string> = { product_city: "Producto + ciudad", product: "Producto", city: "Ciudad" };

export const ProfitabilityTab: React.FC = () => {
    const [range, setRange] = useState<[string, string]>(PRESETS[2].range());
    const [by, setBy] = useState<GroupBy>("product_city");
    const [data, setData] = useState<PnlReport | null>(null);
    const [group, setGroup] = useState<GroupRow | null>(null);

    useEffect(() => {
        let alive = true;
        setData(null);
        api<PnlReport>(`/finance/profitability?from=${range[0]}&to=${range[1]}&by=${by}`)
            .then((r) => { if (alive) setData(r); }).catch((e) => toast.error(errorMessage(e)));
        return () => { alive = false; };
    }, [range, by]);

    return (
        <Stack spacing={2}>
            <Panel><PeriodPicker value={range} onChange={setRange} /></Panel>
            {!data ? <Typography color="text.secondary" sx={{ p: 1 }}>Calculando…</Typography> : (
                <>
                    <Panel>
                        <PanelHeader title={<Stack direction="row" gap={1} alignItems="center">Rentabilidad por niveles <StatusChip status={data.status} /></Stack>}
                            subtitle={`Del ${day(data.from)} al ${day(data.to)}. El ingreso cuenta el día de la entrega; el delivery fallido, el día de la carrera.`} />
                        <PnlStatement c={data.company} />
                    </Panel>
                    <Panel>
                        <PanelHeader title="Por producto y ciudad" subtitle="Toca una fila para ver sus pedidos."
                            action={
                                <ToggleButtonGroup size="small" exclusive value={by} onChange={(_, v) => v && setBy(v)}>
                                    {(Object.keys(BY_LABEL) as GroupBy[]).map((k) => <ToggleButton key={k} value={k}>{BY_LABEL[k]}</ToggleButton>)}
                                </ToggleButtonGroup>
                            } />
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>{BY_LABEL[by]}</TableCell><TableCell align="right">Entregadas</TableCell><TableCell align="right">Ingresos</TableCell>
                                        <TableCell align="right">COGS</TableCell><TableCell align="right">Publicidad</TableCell><TableCell align="right">Delivery</TableCell>
                                        <TableCell align="right">Comisiones</TableCell><TableCell align="right">Margen</TableCell><TableCell align="right">Beneficio</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(data.groups ?? []).map((g) => (
                                        <TableRow key={`${g.product_id}-${g.city_id}`} hover onClick={() => setGroup(g)} sx={{ cursor: "pointer", opacity: g.unassigned ? 0.75 : 1 }}>
                                            <TableCell sx={{ minWidth: 180 }}>{g.name}</TableCell>
                                            <TableCell align="right">{g.orders_delivered}</TableCell>
                                            <TableCell align="right">{money(g.revenue)}</TableCell>
                                            <TableCell align="right">{money(g.cogs)}</TableCell>
                                            <TableCell align="right">{money(g.advertising)}</TableCell>
                                            <TableCell align="right">{money(g.delivery)}</TableCell>
                                            <TableCell align="right">{money(g.commission_sellers + g.commission_leaders)}</TableCell>
                                            <TableCell align="right">{pct(g.margin_pct)}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600, color: g.contribution < 0 ? "error.main" : undefined }}>{money(g.contribution)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <Typography variant="caption" color="text.secondary">
                            Beneficio = margen de contribución: ingresos menos COGS, delivery, comisiones, publicidad y gastos asignados. Los gastos generales no se reparten entre productos (§29).
                        </Typography>
                    </Panel>
                    <StatusNotes report={data} />
                    <GroupOrdersDialog group={group} by={by} range={range} onClose={() => setGroup(null)} />
                </>
            )}
        </Stack>
    );
};
