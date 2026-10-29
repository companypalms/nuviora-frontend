// src/components/owner-panel/GoalsStrip.tsx
// "Tus metas del mes" arriba del Dashboard del Admin (pedido del dueño: verlas cada vez que entra). Son las metas del mes
// que corre, con las mismas barras del Panel del dueño con "Este mes" y sin filtros (OwnerPanel::goalsSummary). Si todavía
// no puso las metas de este mes (cada mes empieza sin metas), un aviso con sus números del mes anterior y el botón para
// ponerlas: es el recordatorio hasta que exista el calendario. Si algo falla, no muestra nada: el Dashboard sigue igual.
import React, { FC, useEffect, useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import FlagRoundedIcon from "@mui/icons-material/FlagRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { useNavigate } from "react-router-dom";
import { Panel } from "../ui/surface/Panel";
import { Explain } from "./Explain";
import { GoalBar, GoalHelp } from "./GoalBar";
import { GoalsSummary, fetchGoalsSummary, formatValue, money } from "./ownerPanel";

/** Nombres cortos para que quepan al lado del número (el nombre entero sale al pasar el cursor). */
const SHORT: Record<string, string> = { revenue: "Ventas", profit: "Ganancia neta", effectiveness: "Efectividad" };

/** Lo que dice el ritmo en una línea: "A este ritmo terminarías el mes cerca de $5.409,00". */
const paceText = (projection: number) => `A este ritmo terminarías el mes cerca de ${money(projection)}`;

export const GoalsStrip: FC = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<GoalsSummary | null>(null);

    useEffect(() => {
        let alive = true;
        fetchGoalsSummary().then((r) => { if (alive) setData(r); }).catch(() => undefined);
        return () => { alive = false; };
    }, []);

    if (!data) return null;

    if (!data.configured || data.cards.length === 0) {
        const ref = data.reference;
        return (
            <Panel sx={(t) => ({ p: { xs: 1.5, sm: 2 }, borderLeft: `4px solid ${t.palette.warning.main}`, bgcolor: alpha(t.palette.warning.main, 0.06) })}>
                <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} gap={1.5}>
                    <FlagRoundedIcon sx={{ color: "warning.main", display: { xs: "none", sm: "block" } }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle1" fontWeight={800}>Todavía no pusiste tus metas de {data.month}</Typography>
                        {ref ? (
                            <Typography variant="body2" color="text.secondary">
                                De referencia, {ref.label.charAt(0).toLowerCase()}{ref.label.slice(1)} {Object.values(ref.business).join(" ")}
                            </Typography>
                        ) : (
                            <Typography variant="body2" color="text.secondary">Pon tus metas y aquí verás cada día cuánto llevas.</Typography>
                        )}
                    </Box>
                    <Button variant="contained" color="warning" onClick={() => navigate("/panel-dueno?metas=1")} sx={{ textTransform: "none", whiteSpace: "nowrap", alignSelf: { xs: "flex-start", sm: "center" } }}>
                        Poner metas de {data.month}
                    </Button>
                </Stack>
            </Panel>
        );
    }

    return (
        <Panel sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.5 }}>
                <FlagRoundedIcon sx={{ fontSize: 20, color: "primary.main" }} />
                <Typography variant="subtitle1" component="h2" fontWeight={800}>Tus metas de {data.month}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", sm: "block" } }}>· hasta las {data.updated_at}</Typography>
                <Box sx={{ flexGrow: 1 }} />
                <Button size="small" endIcon={<ArrowForwardRoundedIcon />} onClick={() => navigate("/panel-dueno")} sx={{ textTransform: "none", whiteSpace: "nowrap" }}>
                    Panel del dueño
                </Button>
            </Stack>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: `repeat(${Math.min(data.cards.length, 3)}, minmax(0, 1fr))` }, gap: { xs: 1.5, sm: 3 } }}>
                {data.cards.map((c) => c.goal && (
                    <Explain key={c.key} title={c.label} help={c.help} detail={c.detail} extra={<Typography variant="caption" color="text.secondary" component="div"><GoalHelp goal={c.goal} /></Typography>}>
                        <Box tabIndex={0} sx={{ cursor: "help", outline: "none", minWidth: 0 }}>
                            <Stack direction="row" alignItems="baseline" justifyContent="space-between" gap={1}>
                                <Typography variant="body2" color="text.secondary" fontWeight={700} noWrap>{SHORT[c.key] ?? c.label}</Typography>
                                <Typography sx={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2, whiteSpace: "nowrap" }}>{formatValue(c.value, c.format)}</Typography>
                            </Stack>
                            <GoalBar goal={c.goal} value={c.value} />
                            {c.goal.pace && c.goal.status !== "met" && (
                                <Typography variant="caption" color="text.secondary" component="div" sx={{ lineHeight: 1.3 }}>{paceText(c.goal.pace.projection)}</Typography>
                            )}
                        </Box>
                    </Explain>
                ))}
            </Box>
        </Panel>
    );
};
