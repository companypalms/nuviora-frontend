// src/components/owner-panel/MetricCard.tsx
// Una tarjeta del panel del dueño: el número grande, si subió o bajó contra el período anterior y, al pasar el cursor,
// cómo se calcula. Los números que todavía pueden cambiar (pedidos que se siguen entregando) se comparan en gris; en
// los costos, bajar es lo bueno; lo de "ahora mismo" y las estimaciones no se comparan.
import React, { FC } from "react";
import { Box, LinearProgress, Stack, Typography } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import { Panel } from "../ui/surface/Panel";
import { Explain } from "./Explain";
import { MetricCardData, formatValue } from "./ownerPanel";

const changeText = (c: MetricCardData) => {
    if (c.change === null) return null;
    const sign = c.change > 0 ? "+" : c.change < 0 ? "−" : "";
    const abs = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 1 }).format(Math.abs(c.change));
    return c.change_unit === "points" ? `${sign}${abs} pts` : `${sign}${abs} %`;
};

export const MetricCard: FC<{ card: MetricCardData; compareLabel: string }> = ({ card, compareLabel }) => {
    const up = (card.change ?? 0) > 0;
    const down = (card.change ?? 0) < 0;
    const good = card.better === "lower" ? down : up;
    // "none": una cantidad que no es ni buena ni mala (turnos, pedidos recibidos): sube o baja en gris
    const color = card.neutral || card.better === "none" || (!up && !down) ? "text.secondary" : good ? "success.main" : "error.main";
    const text = changeText(card);
    const before = formatValue(card.previous, card.format);
    const negative = card.format === "money" && (card.value ?? 0) < 0;

    return (
        <Explain
            title={card.label}
            help={card.help}
            detail={card.detail}
            extra={
                <Typography variant="caption" color="text.secondary" component="div">
                    {card.extra && <Box component="span" display="block" sx={{ mb: 0.5 }}>{card.extra}</Box>}
                    {card.compare && (
                        <>
                            {compareLabel}: <b>{before}</b>
                            {card.change_unit === "points" && card.change !== null && (
                                <Box component="span" display="block" sx={{ mt: 0.5 }}>La diferencia va en puntos: de 50 % a 55 % son +5 puntos.</Box>
                            )}
                            {card.better === "lower" && card.change !== null && !card.neutral && (
                                <Box component="span" display="block" sx={{ mt: 0.5 }}>Es un costo: si baja, sale en verde.</Box>
                            )}
                            {card.neutral && (
                                <Box component="span" display="block" sx={{ mt: 0.5 }}>
                                    Este período todavía se está entregando, por eso la comparación sale en gris: el número va a seguir cambiando.
                                </Box>
                            )}
                        </>
                    )}
                </Typography>
            }
        >
            <Box sx={{ height: "100%", cursor: "help", outline: "none" }} tabIndex={0}>
                <Panel sx={{ height: "100%", p: { xs: 1.5, sm: 2 }, display: "flex", flexDirection: "column", gap: 0.5 }}>
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={0.5}>
                        <Typography variant="body2" color="text.secondary" fontWeight={700} sx={{ lineHeight: 1.3 }}>{card.label}</Typography>
                        <InfoOutlinedIcon sx={{ fontSize: 16, color: "text.disabled", flexShrink: 0, mt: 0.25 }} />
                    </Stack>
                    <Typography sx={{ fontSize: { xs: 21, sm: 30 }, fontWeight: 800, lineHeight: 1.15, overflowWrap: "anywhere", color: negative ? "error.main" : undefined }}>
                        {formatValue(card.value, card.format)}
                    </Typography>
                    {/* Sin rojo ni verde hasta que el dueño ponga su meta (paso de Metas y alertas) */}
                    {card.format === "percent" && card.value !== null && (
                        <LinearProgress variant="determinate" value={Math.min(100, Math.max(0, card.value))} sx={{ height: 6, borderRadius: 3, my: 0.5 }} />
                    )}
                    <Box sx={{ mt: "auto" }}>
                        {!card.compare ? (
                            <Typography variant="caption" color="text.secondary">{card.note}</Typography>
                        ) : text ? (
                            <Stack direction="row" alignItems="center" flexWrap="wrap" columnGap={0.5} sx={{ color }}>
                                <Stack direction="row" alignItems="center" gap={0.25}>
                                    {!card.neutral && card.better !== "none" && up && <ArrowUpwardRoundedIcon sx={{ fontSize: 16 }} />}
                                    {!card.neutral && card.better !== "none" && down && <ArrowDownwardRoundedIcon sx={{ fontSize: 16 }} />}
                                    <Typography variant="caption" fontWeight={700} sx={{ color }}>{text}</Typography>
                                </Stack>
                                <Typography variant="caption" color="text.secondary">antes {before}</Typography>
                            </Stack>
                        ) : (
                            <Typography variant="caption" color="text.secondary">Antes: {before}</Typography>
                        )}
                    </Box>
                </Panel>
            </Box>
        </Explain>
    );
};
