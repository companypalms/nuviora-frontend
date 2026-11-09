// src/components/calendar/MissionNow.tsx
// .107 "Tu día": la misión de ahora, en grande. Una sola cosa: dónde se hace, qué es, cuánto toma y por qué va primero,
// sus botones de siempre ("Ir a conciliación"…) y el botón principal. Al terminarla entra la siguiente sola. "Descartar hoy"
// también la resuelve (nunca quedarse trabado).
// .108 (dueño: "un sistema de tiempo de cuánto me debe tomar cada tarea y con notificaciones de que se agotó el tiempo"):
// "Empezar · 5 min" pone a correr su reloj (4:59, 4:58…) con Hecho, Pausar, +5 min y Más tarde. Al acabarse sigue en rojo
// con lo de más ("+3:20 de más") y pregunta si terminaste. "Sueles tardar" sale desde la 3.ª vez, con un toque para usarlo.
import React, { FC, useState } from "react";
import { Box, Button, Collapse, LinearProgress, Stack, Typography } from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import CheckRounded from "@mui/icons-material/CheckRounded";
import PauseRounded from "@mui/icons-material/PauseRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import { appear, cardSx, inkSx, lineSx, useTokens } from "../ui/design";
import { Dot, TextAction } from "../ui/designParts";
import { CalendarItem, ItemTimer, StageKey, TimerAction, minutesText, payTarget, stageColor, whereOf } from "./calendar";
import { PlanChip } from "./PlanMenu";
import { DoneButton, ItemDetails, RowHandlers } from "./TaskRow";
import { clockOf, clockText, useTick } from "./timer";

type Props = Pick<RowHandlers, "onDone" | "onDismiss" | "onPay" | "onPlan"> & {
    item: CalendarItem;
    reason: string;
    stage: { key: StageKey; label: string };
    n: number;
    total: number;
    busy?: boolean;
    /** La eligió el dueño con "Hacerla ahora" (no es la primera del orden): se puede volver al orden. */
    picked?: boolean;
    onBackToOrder?: () => void;
    /** .108: su reloj (si ya empezó), la diferencia con la hora del servidor y cuánto suele tardar. */
    timer?: ItemTimer;
    offset?: number;
    usual?: number;
    onTimer: (action: TimerAction, item: CalendarItem) => void;
    /** .108 "Tu hora": de qué zona son las horas ("Portugal"). */
    zoneLabel?: string;
};

/** Lo que se le dice al lector de pantalla: solo a los 5 minutos y al acabarse (no cada segundo). */
const milestone = (left: number) => (left <= 0 ? "Se acabó el tiempo." : left <= 300 ? "Quedan 5 minutos." : "");

export const MissionNow: FC<Props> = ({ item, reason, stage, n, total, busy, picked, onBackToOrder, onDone, onDismiss, onPay, onPlan, timer, offset = 0, usual, onTimer, zoneLabel = "Venezuela" }) => {
    const t = useTokens();
    const [why, setWhy] = useState(false);
    const links = item.actions.filter((a) => a.link || a.angle);
    const running = !!timer?.started_at;
    const now = useTick(running);
    const clock = timer ? clockOf(timer, now + offset) : null;
    const started = !!clock && (running || clock.elapsed > 0);
    const ink = { ...inkSx(t), minHeight: { xs: 48, sm: 40 } };
    const line = { ...lineSx(t), minHeight: { xs: 48, sm: 40 } };
    const pay = payTarget(item);
    const total_ = timer ? timer.minutes + timer.extra_minutes : item.minutes;

    return (
        <Box component="section" aria-label="Misión de ahora" sx={{ ...cardSx(t), p: { xs: "14px 14px", sm: "16px 18px" }, mt: 2, borderColor: clock?.over ? t.red : t.ink, ...appear }}>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                    <Dot color={stageColor(stage.key, t)} size={9} />
                    <Typography sx={{ fontSize: 13, color: t.muted, overflowWrap: "anywhere" }}>Ahora · misión {n} de {total} · {stage.label}</Typography>
                </Stack>
                {!started && <PlanChip item={item} onSave={onPlan} disabled={busy} />}
            </Stack>
            <Typography sx={{ fontSize: 14, fontWeight: 500, color: t.muted, mt: 1.25 }}>{whereOf(item)}{item.time ? ` · a las ${item.time} (hora de ${zoneLabel})` : ""}</Typography>
            <Typography component="h2" sx={{ fontSize: 20, fontWeight: 600, lineHeight: 1.3, mt: 0.25, overflowWrap: "anywhere" }}>{item.title}</Typography>

            {/* .108: el reloj */}
            {clock && started && (
                <Box sx={{ mt: 1.5, position: "relative" }}>
                    <Stack direction="row" alignItems="baseline" columnGap={1.25} flexWrap="wrap">
                        <Typography aria-hidden sx={{ fontSize: 40, fontWeight: 600, lineHeight: 1.1, letterSpacing: "-0.02em", fontFeatureSettings: '"tnum"', color: clock.over ? t.red : t.ink }}>
                            {clock.over ? `+${clockText(-clock.left)}` : clockText(clock.left)}
                        </Typography>
                        <Typography sx={{ fontSize: 14, color: clock.over ? t.red : t.muted }}>
                            {clock.over ? "de más. Se acabó el tiempo: ¿terminaste?" : running ? `de ${minutesText(total_)}` : `en pausa · de ${minutesText(total_)}`}
                        </Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={Math.min(100, (clock.elapsed / Math.max(1, clock.limit)) * 100)}
                        aria-label={`Corrió ${clockText(clock.elapsed)} de ${minutesText(total_)}`}
                        sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: t.soft,
                            "& .MuiLinearProgress-bar": { bgcolor: clock.over ? t.red : clock.left <= 60 ? t.amber : t.ink, borderRadius: 3, transition: "transform 200ms" } }} />
                    <Box role="status" aria-live="polite" sx={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)" }}>{milestone(clock.left)}</Box>
                </Box>
            )}

            {started
                ? links.length > 0 && <ItemDetails item={{ ...item, details: null, lines: [], help: null, repeat_label: "", actions: links }} busy={busy} onDone={onDone} onPay={onPay} />
                : <ItemDetails item={{ ...item, help: null, actions: links }} busy={busy} onDone={onDone} onPay={onPay} />}

            <Typography component="div" sx={{ fontSize: 13, color: item.status === "overdue" ? t.red : t.muted, mt: 1.25, overflowWrap: "anywhere" }}>
                {picked ? "La elegiste para hacerla ahora." : reason}
                {usual && usual !== item.minutes ? (
                    <> · Sueles tardar {minutesText(usual)} (<TextAction onClick={() => onPlan(item, { minutes: usual })} sx={{ color: t.muted }}>usar {minutesText(usual)}</TextAction>)</>
                ) : null}
                {item.help && <> · <TextAction onClick={() => setWhy((o) => !o)} aria-expanded={why} sx={{ color: t.muted }}>{why ? "Ocultar" : "¿Por qué importa?"}</TextAction></>}
                {picked && onBackToOrder && <> · <TextAction onClick={onBackToOrder} sx={{ color: t.muted }}>Volver al orden</TextAction></>}
            </Typography>
            <Collapse in={why} unmountOnExit>
                <Typography sx={{ fontSize: 13, color: t.muted, mt: 0.75, overflowWrap: "anywhere" }}>{item.help}</Typography>
            </Collapse>

            {/* En el celular: el principal a lo ancho y los otros dos lado a lado, al alcance del pulgar */}
            <Box sx={{ mt: 2, display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, max-content)" },
                "& > :first-of-type": { gridColumn: { xs: "1 / -1", sm: "auto" } }, "& .MuiButton-root": { width: { xs: "100%", sm: "auto" } } }}>
                {!started ? (
                    <>
                        <Button variant="contained" disableElevation disabled={busy} startIcon={<PlayArrowRounded />} sx={ink} onClick={() => onTimer("start", item)}>
                            Empezar · {minutesText(item.minutes)}
                        </Button>
                        <Button variant="outlined" disabled={busy} startIcon={<CheckRounded />} sx={line} onClick={() => (pay !== null ? onPay(item, pay) : onDone(item))}>
                            {pay !== null ? "Registrar pago" : "Ya está hecha"}
                        </Button>
                    </>
                ) : (
                    <>
                        <DoneButton item={item} busy={busy} onDone={onDone} onPay={onPay} />
                        {running
                            ? <Button variant="outlined" disabled={busy} startIcon={<PauseRounded />} sx={line} onClick={() => onTimer("pause", item)}>Pausar</Button>
                            : <Button variant="outlined" disabled={busy} startIcon={<PlayArrowRounded />} sx={line} onClick={() => onTimer("start", item)}>Seguir</Button>}
                        <Button variant="outlined" disabled={busy || (timer?.extra_minutes ?? 0) >= 120} startIcon={<AddRounded />} sx={line} onClick={() => onTimer("extend", item)}>5 min</Button>
                    </>
                )}
            </Box>
            <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" sx={{ mt: 1.25 }}>
                <TextAction onClick={() => onTimer("later", item)} disabled={busy} sx={{ fontSize: 14, color: t.muted }}>Más tarde</TextAction>
                <TextAction onClick={() => onDismiss(item)} disabled={busy} sx={{ fontSize: 14, color: t.muted }}>Descartar hoy</TextAction>
            </Stack>
        </Box>
    );
};
