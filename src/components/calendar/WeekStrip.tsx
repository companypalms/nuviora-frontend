// src/components/calendar/WeekStrip.tsx
// .107 "Tu día": la semana de lunes a sábado (el domingo no se trabaja). Cada día con un anillo de cuánto se hizo, ✓ si se
// terminó todo, un punto rojo si quedó algo atrasado; hoy con borde, el elegido en tinta. Tocar un día lo abre para verlo o
// planearlo.
import React, { FC } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import CheckRounded from "@mui/icons-material/CheckRounded";
import { useTokens } from "../ui/design";
import { WEEKDAYS, WEEKDAYS_SHORT, weekdayOf } from "./calendar";

export type DayStat = { total: number; closed: number; overdue: number };

const Ring: FC<{ value: number; color: string; track: string }> = ({ value, color, track }) => {
    const r = 15;
    const c = 2 * Math.PI * r;
    return (
        <Box component="svg" viewBox="0 0 36 36" aria-hidden sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
            <circle cx="18" cy="18" r={r} fill="none" stroke={track} strokeWidth="2.5" />
            {value > 0 && <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray={`${c * Math.min(1, value)} ${c}`} style={{ transition: "stroke-dasharray 200ms" }} />}
        </Box>
    );
};

export const WeekStrip: FC<{ days: string[]; stats: Record<string, DayStat>; today: string; selected: string; onSelect: (d: string) => void }> = ({ days, stats, today, selected, onSelect }) => {
    const t = useTokens();
    return (
        <Box role="tablist" aria-label="Días de la semana" sx={{ display: "grid", gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`, gap: { xs: 0.25, sm: 1 }, mt: 2 }}>
            {days.map((d) => {
                const s = stats[d];
                const on = d === selected;
                const isToday = d === today;
                const past = d <= today;
                const all = s && s.total > 0 && s.closed === s.total && past;
                const label = `${WEEKDAYS[weekdayOf(d) - 1]} ${Number(d.slice(8, 10))}${isToday ? " (hoy)" : ""}: ${s ? `${s.closed} de ${s.total} hechas` : "cargando"}${s?.overdue ? `, ${s.overdue} atrasadas` : ""}`;
                return (
                    <ButtonBase key={d} role="tab" aria-selected={on} aria-label={label} onClick={() => onSelect(d)}
                        sx={{ flexDirection: "column", py: 0.75, borderRadius: "10px", minHeight: 64, bgcolor: on ? t.ink : "transparent", color: on ? t.onInk : t.ink,
                            border: `1px solid ${isToday && !on ? t.ink : "transparent"}`, transition: "background-color 150ms",
                            "&:hover": { bgcolor: on ? t.ink : t.soft }, "&.Mui-focusVisible": { outline: `2px solid ${t.ink}`, outlineOffset: 2 } }}>
                        <Typography sx={{ fontSize: 12, color: on ? t.onInk : t.muted, lineHeight: 1 }}>{WEEKDAYS_SHORT[weekdayOf(d) - 1].slice(0, 2)}</Typography>
                        <Box sx={{ position: "relative", width: 32, height: 32, mt: 0.5, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {s && s.total > 0 && <Ring value={s.closed / s.total} color={on ? t.onInk : all ? t.green : t.ink} track={on ? "rgba(255,255,255,.25)" : t.line} />}
                            <Typography sx={{ fontSize: 13, fontWeight: 600, color: "inherit" }}>{Number(d.slice(8, 10))}</Typography>
                            {s && s.overdue > 0 ? <Box aria-hidden sx={{ position: "absolute", top: 0, right: 0, width: 7, height: 7, borderRadius: "50%", bgcolor: t.red }} />
                                : all && <Box aria-hidden sx={{ position: "absolute", top: -3, right: -5, width: 15, height: 15, borderRadius: "50%", bgcolor: t.green, color: "#fff",
                                    display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${on ? t.ink : t.card}` }}><CheckRounded sx={{ fontSize: 11 }} /></Box>}
                        </Box>
                    </ButtonBase>
                );
            })}
        </Box>
    );
};
