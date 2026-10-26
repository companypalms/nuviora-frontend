// src/components/finance/PnlStatement.tsx
// Rentabilidad por niveles (Módulo 4 de Fran, §47), en el orden del documento: ingresos, los costos variables, el
// margen de contribución, los gastos generales y el beneficio operativo. Y los upsells por separado (§7).
import React from "react";
import { Box, Divider, Stack, Typography } from "@mui/material";
import { CompanyLevels, money, pct } from "./finance";

const Line: React.FC<{ label: string; value: number; minus?: boolean; strong?: boolean; note?: string }> = ({ label, value, minus, strong, note }) => (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ py: 0.5 }}>
        <Box sx={{ minWidth: 0 }}>
            <Typography variant={strong ? "subtitle2" : "body2"} sx={{ fontWeight: strong ? 700 : 400 }}>{minus ? "− " : ""}{label}</Typography>
            {note && <Typography variant="caption" color="text.secondary">{note}</Typography>}
        </Box>
        <Typography variant={strong ? "subtitle2" : "body2"} sx={{ fontWeight: strong ? 700 : 400, whiteSpace: "nowrap", color: strong && value < 0 ? "error.main" : undefined }}>
            {money(value)}
        </Typography>
    </Stack>
);

export const PnlStatement: React.FC<{ c: CompanyLevels }> = ({ c }) => (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "3fr 2fr" }, gap: 3 }}>
        <div>
            <Line label="Ingresos" value={c.revenue} strong note={c.revenue_refunded > 0 ? `${money(c.revenue_main + c.revenue_upsell)} entregado, ${money(c.revenue_refunded)} devuelto` : undefined} />
            <Line label="COGS (costo del producto)" value={c.cogs} minus />
            <Line label="Logística atribuible" value={c.logistics} minus note="El transporte de inventario de lo que se vendió (viajes de traslado)" />
            <Line label="Delivery" value={c.delivery} minus note={c.delivery_legacy > 0 ? `${money(c.delivery_legacy)} de antes del registro de carreras` : undefined} />
            <Line label="Comisiones vendedoras" value={c.commission_sellers} minus />
            <Line label="Comisión líderes" value={c.commission_leaders} minus />
            <Line label="Publicidad" value={c.advertising} minus note={c.advertising_unclassified > 0 ? `${money(c.advertising_unclassified)} de campañas sin clasificar` : undefined} />
            <Line label="Otros costes variables atribuibles" value={c.other_variable} minus
                note={c.shrinkage > 0 ? `Gastos de un producto o una ciudad, y ${money(c.shrinkage)} de merma (piezas dadas de baja)` : "Gastos de un producto o una ciudad, y la merma"} />
            <Divider sx={{ my: 0.5 }} />
            <Line label={`Margen de contribución (${pct(c.margin_pct)})`} value={c.contribution} strong />
            <Line label="Gastos fijos / generales" value={c.fixed} minus note="ChatGPT, editor, Shopify…: no se reparten entre productos" />
            <Divider sx={{ my: 0.5 }} />
            <Line label={`Beneficio operativo (${pct(c.operating_pct)})`} value={c.operating_profit} strong />
        </div>
        <Box sx={{ p: 1.5, borderRadius: 2, border: 1, borderColor: "divider", alignSelf: "start" }}>
            <Typography variant="subtitle2" gutterBottom>Rentabilidad de los upsells</Typography>
            <Line label="Ingreso de upsells" value={c.upsell.revenue} />
            <Line label="COGS de upsells" value={c.upsell.cogs} minus />
            <Line label="Comisión de upsells" value={c.upsell.commission} minus />
            <Divider sx={{ my: 0.5 }} />
            <Line label="Beneficio de upsells" value={c.upsell.profit} strong />
            <Typography variant="caption" color="text.secondary">Sin publicidad propia: el cliente llegó por el producto principal (§7).</Typography>
        </Box>
    </Box>
);
