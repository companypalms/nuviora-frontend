// src/components/finance/SummaryTab.tsx
// Finanzas › Resumen (Módulo 4 de Fran, §48): tarjetas rápidas de ingresos, egresos, beneficio, margen, publicidad,
// COGS, delivery, comisiones y caja disponible, con RENTABILIDAD separada de LIQUIDEZ. Cada tarjeta se compara con el
// período anterior del mismo largo (§58). La Liquidez (entrega 3) es el tablero de la caja en corto: entradas y salidas del
// mismo período.
import React, { useEffect, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { toast } from "react-toastify";
import { Panel, PanelHeader } from "../ui/surface/Panel";
import { CashDashboardPanel } from "./CashDashboardPanel";
import { PeriodPicker } from "./PeriodPicker";
import { StatusChip, StatusNotes } from "./StatusNotes";
import { CompanyLevels, PRESETS, PnlReport, api, day, errorMessage, money, pct } from "./finance";

type Card = { label: string; get: (c: CompanyLevels) => number | null; format: (v: number | null) => string; good: "up" | "down"; hint?: string };

const CARDS: Card[] = [
    { label: "Ingresos", get: (c) => c.revenue, format: money, good: "up", hint: "lo entregado, menos devoluciones" },
    { label: "Egresos", get: (c) => c.expenses_total, format: money, good: "down", hint: "todos los costos y gastos" },
    { label: "Beneficio operativo", get: (c) => c.operating_profit, format: money, good: "up", hint: "después de los gastos generales" },
    { label: "Margen de contribución", get: (c) => c.margin_pct, format: pct, good: "up", hint: "antes de los gastos generales" },
    { label: "Publicidad", get: (c) => c.advertising, format: money, good: "down", hint: "Meta Ads" },
    { label: "COGS", get: (c) => c.cogs, format: money, good: "down", hint: "costo de lo entregado" },
    { label: "Delivery", get: (c) => c.delivery, format: money, good: "down", hint: "entregas y fallidas" },
    { label: "Comisiones", get: (c) => c.commission_sellers + c.commission_leaders, format: money, good: "down", hint: "vendedoras y líderes" },
];

const Delta: React.FC<{ now: number | null; before: number | null; good: "up" | "down"; isPct: boolean }> = ({ now, before, good, isPct }) => {
    if (now === null || before === null) return null;
    const diff = now - before;
    if (Math.abs(diff) < 0.005) return <Typography variant="caption" color="text.secondary">igual que antes</Typography>;
    const better = good === "up" ? diff > 0 : diff < 0;
    const text = isPct ? `${diff > 0 ? "+" : ""}${diff.toFixed(1)} pts` : `${diff > 0 ? "+" : "−"}${money(Math.abs(diff))}${before !== 0 ? ` (${diff > 0 ? "+" : ""}${((diff / Math.abs(before)) * 100).toFixed(0)} %)` : ""}`;
    return <Typography variant="caption" color={better ? "success.main" : "error.main"}>{text} vs. período anterior</Typography>;
};

export const SummaryTab: React.FC<{ onOpenCash?: () => void }> = ({ onOpenCash }) => {
    const [range, setRange] = useState<[string, string]>(PRESETS[2].range());
    const [data, setData] = useState<{ current: PnlReport; previous: PnlReport } | null>(null);

    useEffect(() => {
        let alive = true;
        setData(null);
        api<{ current: PnlReport; previous: PnlReport }>(`/finance/summary?from=${range[0]}&to=${range[1]}`)
            .then((r) => { if (alive) setData(r); }).catch((e) => toast.error(errorMessage(e)));
        return () => { alive = false; };
    }, [range]);

    const c = data?.current.company;
    const p = data?.previous.company;

    return (
        <Stack spacing={2}>
            <Panel><PeriodPicker value={range} onChange={setRange} /></Panel>
            {!data || !c || !p ? <Typography color="text.secondary" sx={{ p: 1 }}>Calculando…</Typography> : (
                <>
                    <Panel>
                        <PanelHeader title={<Stack direction="row" gap={1} alignItems="center">Rentabilidad <StatusChip status={data.current.status} /></Stack>}
                            subtitle={`Del ${day(data.current.from)} al ${day(data.current.to)} · ${c.orders_delivered} entregadas, ${c.orders_not_delivered} no entregadas con costo. Comparado con el ${day(data.previous.from)} al ${day(data.previous.to)}.`} />
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 2 }}>
                            {CARDS.map((card) => (
                                <Box key={card.label} sx={{ p: 1.5, borderRadius: 2, border: 1, borderColor: "divider", minWidth: 0 }}>
                                    <Typography variant="caption" color="text.secondary">{card.label}</Typography>
                                    <Typography variant="h6" sx={{ color: card.label === "Beneficio operativo" && (card.get(c) ?? 0) < 0 ? "error.main" : undefined }}>
                                        {card.format(card.get(c))}
                                    </Typography>
                                    <Delta now={card.get(c)} before={card.get(p)} good={card.good} isPct={card.format === pct} />
                                    {card.hint && <Typography variant="caption" color="text.secondary" display="block">{card.hint}</Typography>}
                                </Box>
                            ))}
                        </Box>
                    </Panel>
                    <CashDashboardPanel from={range[0]} to={range[1]} compact onOpenCash={onOpenCash} />
                    <StatusNotes report={data.current} />
                </>
            )}
        </Stack>
    );
};
