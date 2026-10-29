// src/components/owner-panel/parts.tsx
// Piezas que comparten las secciones del panel del dueño: qué período se está mirando (una sola vez, arriba), los títulos
// de los recuadros y la cajita de los gráficos al pasar el cursor.
import React, { FC, ReactNode } from "react";
import { Alert, Box, Chip, Stack, Typography, useTheme } from "@mui/material";
import { Explain } from "./Explain";
import { PeriodInfo, SectionBase, count, day } from "./ownerPanel";

/** "13/10/2026 al 19/10/2026". */
const rangeText = (from: string, to: string) => (from === to ? day(from) : `${day(from)} al ${day(to)}`);
// Un período que llega hasta ahora termina a esta hora, no a las 23:59
const cut = (x: PeriodInfo) => (x.until !== "23:59" ? `, hasta las ${x.until}` : "");

/** Qué período se mira y con cuál se compara, el aviso de los pedidos que se siguen entregando y los que se ponen al día. */
export const PeriodSummary: FC<{ data: SectionBase }> = ({ data }) => {
    const p = data.period;
    const prev = data.previous;
    const current = p.preset === "custom" ? `${p.label}${cut(p)}` : `${p.label} (${rangeText(p.from, p.to)}${cut(p)})`;
    const compare = `${prev.label.charAt(0).toLowerCase()}${prev.label.slice(1)} (${rangeText(prev.from, prev.to)}${cut(prev)})`;

    return (
        <Stack spacing={1}>
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                <Typography variant="body2" color="text.secondary">
                    Mirando <b>{current}</b>, comparado con {compare}.
                </Typography>
                {data.pending > 0 && (
                    <Explain title="Poniendo al día" help="Un pedido nuevo o recién cambiado tarda hasta un minuto en sumar aquí. Los números se completan solos.">
                        <Chip size="small" color="info" variant="outlined" label={`Actualizando ${count(data.pending)} pedido${data.pending === 1 ? "" : "s"}…`} />
                    </Explain>
                )}
            </Stack>
            {data.maturing && (
                <Alert severity="info" variant="outlined" sx={{ py: 0.25 }}>
                    Los pedidos de los últimos {data.maturity_days} días todavía se están entregando: <b>entregados, monto, efectividad y
                    ganancia</b> de este período van a seguir cambiando. Por eso se comparan en gris, sin rojo ni verde.
                </Alert>
            )}
        </Stack>
    );
};

/** El título de una sección ("Ventas y pedidos", "Dinero"). */
export const SectionTitle: FC<{ title: string }> = ({ title }) => (
    <Typography variant="h6" fontWeight={800}>{title}</Typography>
);

/** Título de un recuadro que, a diferencia de PanelHeader, baja de línea en el celular en vez de cortarse. */
export const BoxTitle: FC<{ title: string; subtitle: string; help?: string }> = ({ title, subtitle, help }) => {
    const content = (
        <Box sx={{ mb: 1.5, cursor: help ? "help" : undefined, display: "inline-block" }}>
            <Typography variant="subtitle1" component="h2" fontWeight={700}>{title}</Typography>
            <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
        </Box>
    );
    return help ? <Explain title={title} help={help}>{content}</Explain> : content;
};

/** La cajita que aparece sobre un gráfico al pasar el cursor. */
export const ChartTip: FC<{ children: ReactNode }> = ({ children }) => {
    const t = useTheme();
    return (
        <Box sx={{ p: 1.25, bgcolor: t.palette.background.paper, border: "1px solid", borderColor: "divider", borderRadius: 2, boxShadow: 6, minWidth: 190, maxWidth: 300 }}>
            {children}
        </Box>
    );
};

export const Empty: FC<{ text: string }> = ({ text }) => (
    <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>{text}</Typography>
);
