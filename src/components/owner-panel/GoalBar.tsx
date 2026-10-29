// src/components/owner-panel/GoalBar.tsx
// La meta del dueño dentro de una tarjeta (Metas y alertas, diccionario §6). En dinero: cuánto se lleva (lleno), lo que
// todavía puede sumar lo que está en camino (más clarito) y, en "Este mes", una rayita de dónde deberías ir hoy. En un %:
// la barra del número con una rayita en la meta. El texto completo viene escrito del backend (GoalRules).
import React, { FC } from "react";
import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useGoalColor } from "./goalColor";
import { CardGoal, formatValue, money } from "./ownerPanel";

const clamp = (v: number) => Math.min(100, Math.max(0, v));

/** Lo corto que se ve en la tarjeta; el texto entero sale al pasar el cursor. */
const shortText = (g: CardGoal, value: number | null) => {
    const name = g.better === "lower" ? "Máximo" : "Meta";
    if (g.format === "money") {
        if (g.status === "met") return `✓ Meta cumplida (${money(g.value)})`;
        return `${g.progress !== null && g.progress > 0 ? `${formatValue(g.progress, "percent")} de ` : "Meta "}${money(g.value)} · faltan ${money(g.value - (value ?? 0))}`;
    }
    if (g.status === "met") return `✓ ${name} ${formatValue(g.value, g.format)}`;
    if (g.status === "neutral") return `${name} ${formatValue(g.value, g.format)} · todavía puede mejorar`;
    return `${name} ${formatValue(g.value, g.format)}`;
};

export const GoalBar: FC<{ goal: CardGoal; value: number | null }> = ({ goal, value }) => {
    const color = useGoalColor()(goal.status);
    const bar = goal.format === "money" || goal.format === "percent";
    let solid = 0;
    let light = 0;
    let tick: number | null = null;
    if (goal.format === "money" && goal.value > 0) {
        solid = clamp(((value ?? 0) / goal.value) * 100);
        light = clamp(((goal.pending ?? 0) / goal.value) * 100);
        light = Math.min(light, 100 - solid);
        tick = goal.pace ? clamp((goal.pace.expected / goal.value) * 100) : null;
    } else if (goal.format === "percent") {
        solid = clamp(value ?? 0);
        tick = clamp(goal.value);
    }

    return (
        <Box sx={{ my: 0.5 }}>
            {bar && (
                <Box sx={{ position: "relative", height: 8, borderRadius: 4, bgcolor: "action.hover" }}>
                    <Box sx={{ position: "absolute", inset: 0, borderRadius: 4, overflow: "hidden" }}>
                        <Box sx={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${solid}%`, bgcolor: color }} />
                        {light > 0 && <Box sx={{ position: "absolute", left: `${solid}%`, top: 0, bottom: 0, width: `${light}%`, bgcolor: alpha(color, 0.3) }} />}
                    </Box>
                    {tick !== null && (
                        <Box sx={{ position: "absolute", left: `calc(${tick}% - 1px)`, top: -3, bottom: -3, width: 2, borderRadius: 1, bgcolor: "text.primary" }} />
                    )}
                </Box>
            )}
            <Typography variant="caption" component="div" sx={{ color, fontWeight: 700, mt: bar ? 0.5 : 0, lineHeight: 1.3 }}>
                {shortText(goal, value)}
            </Typography>
        </Box>
    );
};

/** Lo que dice el cursor sobre la meta: el texto entero y qué es cada parte de la barra. */
export const GoalHelp: FC<{ goal: CardGoal }> = ({ goal }) => (
    <Box component="span" display="block" sx={{ mb: 0.75 }}>
        <b>{goal.label}.</b> {goal.text}
        {goal.format === "money" && (
            <Box component="span" display="block" sx={{ mt: 0.5 }}>
                En la barra: lleno, lo que ya llevas; más clarito, lo que todavía puede sumar lo que está en camino
                {goal.pace ? "; la rayita, dónde deberías ir hoy para llegar a fin de mes." : "."}
            </Box>
        )}
        {goal.format === "percent" && <Box component="span" display="block" sx={{ mt: 0.5 }}>La rayita de la barra es tu meta.</Box>}
    </Box>
);
