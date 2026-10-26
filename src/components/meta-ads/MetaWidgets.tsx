// src/components/meta-ads/MetaWidgets.tsx
// Piezas de las tablas de Meta Ads (documento de Fran del 2026-10-08, Módulo 2): el valor de una métrica con su
// variación contra el período anterior (§28) y su señal (§37 frecuencia, §38 CPA), y las señales de las reglas (§39,
// §40). Solo avisan: nada de esto cambia algo en Meta (§36).
import React from "react";
import { Box, Chip, Stack, Tooltip, Typography } from "@mui/material";
import { COLUMNS, Node, RuleSignal, SIGNAL_COLORS, SIGNAL_DOT, fmt, fmtKind, metricOf } from "./metaAds";

export const ChangeBadge: React.FC<{ change: number | null | undefined; lower?: boolean }> = ({ change, lower }) => {
    if (change === null || change === undefined) return null;
    const good = lower ? change < 0 : change > 0;
    const color = change === 0 ? "text.secondary" : good ? "success.main" : "error.main";
    return (
        <Typography component="span" variant="caption" sx={{ color, display: "block", lineHeight: 1.1 }}>
            {change > 0 ? "+" : ""}{fmt.num(change)} %
        </Typography>
    );
};

/** Una celda: el valor, su señal (color) y la variación (§28). */
export const MetricCell: React.FC<{ node: Node; col: (typeof COLUMNS)[number] }> = ({ node, col }) => {
    const value = metricOf(node, col.key);
    const signal = col.key === "cpa" ? node.signals?.cpa ?? null : col.key === "frequency" ? node.signals?.frequency ?? null : null;
    const approx = col.key === "frequency" && value !== null && !node.frequency_exact;
    const text = fmtKind(col.kind, value);
    return (
        <Box>
            <Tooltip title={signal ? signal.label : approx ? "Aproximada: el alcance de varias campañas o días se suma" : ""}>
                <Typography component="span" variant="body2" sx={{ fontWeight: signal ? 700 : 400, color: signal ? SIGNAL_COLORS[signal.color] : undefined, whiteSpace: "nowrap" }}>
                    {signal ? `${SIGNAL_DOT[signal.color]} ` : ""}{approx ? "≈ " : ""}{text}
                </Typography>
            </Tooltip>
            {node.compare && <ChangeBadge change={node.compare.change[col.key]} lower={col.lower} />}
        </Box>
    );
};

const SEVERITY: Record<RuleSignal["severity"], "info" | "warning" | "error"> = { info: "info", alert: "warning", critical: "error" };

export const RuleChips: React.FC<{ rules?: RuleSignal[] }> = ({ rules = [] }) => (
    rules.length === 0 ? null : (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
            {rules.map((r, i) => <Chip key={i} size="small" color={SEVERITY[r.severity]} variant={r.severity === "critical" ? "filled" : "outlined"} label={r.label} />)}
        </Stack>
    )
);

