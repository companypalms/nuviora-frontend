// src/components/calendar/MonthGrid.tsx
// El mes completo (.107: en la ventana "Mes" de Tu día, con el estilo nuevo): de lunes a domingo, el domingo en gris (no se
// trabaja). Cada día dice cuántas cosas tiene y cuántas se hicieron, ✓ si se terminó todo, un punto rojo si quedó algo
// atrasado, y en la computadora las primeras notas y pagos escritos. Tocar un día lo abre en Tu día.
import React, { FC } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import CheckRounded from "@mui/icons-material/CheckRounded";
import { useTokens } from "../ui/design";
import { CalendarItem, WEEKDAYS_SHORT, isClosed, isOwn, longDate, monthWeeks } from "./calendar";

type Props = {
    month: string;
    days: Record<string, CalendarItem[]>;
    today: string;
    selected: string;
    onSelect: (ymd: string) => void;
};

/** Cuántas notas y pagos se ven escritos en cada día (en la computadora); el resto, "+N". */
const VISIBLE = 2;

export const MonthGrid: FC<Props> = ({ month, days, today, selected, onSelect }) => {
    const t = useTokens();
    const weeks = monthWeeks(month);
    const inMonth = (ymd: string) => ymd.slice(0, 7) === month.slice(0, 7);

    return (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: { xs: 0.25, sm: 0.5 } }}>
            {WEEKDAYS_SHORT.map((d, i) => (
                <Typography key={d} sx={{ fontSize: 12, fontWeight: 600, color: i === 6 ? t.faint : t.muted, textAlign: "center", pb: 0.5 }}>{d}</Typography>
            ))}
            {weeks.flat().map((ymd, i) => {
                const all = days[ymd] ?? [];
                const closed = all.filter(isClosed).length;
                const own = all.filter(isOwn);
                const overdue = all.filter((x) => x.status === "overdue").length;
                const sunday = i % 7 === 6;
                const isToday = ymd === today;
                const on = ymd === selected;
                const complete = all.length > 0 && closed === all.length && ymd <= today;
                return (
                    <ButtonBase key={ymd} onClick={() => onSelect(ymd)} aria-pressed={on}
                        aria-label={`${longDate(ymd)}: ${all.length === 0 ? "nada" : `${closed} de ${all.length} hechas`}${overdue ? `, ${overdue} atrasadas` : ""}`}
                        sx={{ display: "flex", flexDirection: "column", alignItems: "stretch", justifyContent: "flex-start", minHeight: { xs: 56, sm: 92 }, p: { xs: 0.5, sm: 0.75 },
                            borderRadius: "8px", textAlign: "left", border: `1px solid ${on ? t.ink : t.line}`, bgcolor: sunday ? t.soft : t.card,
                            opacity: inMonth(ymd) ? 1 : 0.45, "&:hover": { borderColor: t.ink }, "&.Mui-focusVisible": { outline: `2px solid ${t.ink}`, outlineOffset: 1 } }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <Typography sx={{ width: 24, height: 24, lineHeight: "24px", textAlign: "center", borderRadius: "50%", fontSize: 13, fontWeight: 600,
                                bgcolor: isToday ? t.ink : "transparent", color: isToday ? t.onInk : sunday ? t.faint : t.ink }}>
                                {Number(ymd.slice(8, 10))}
                            </Typography>
                            {overdue > 0 ? <Box aria-hidden sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: t.red }} />
                                : complete ? <CheckRounded aria-hidden sx={{ fontSize: 16, color: t.green }} /> : null}
                        </Box>
                        {all.length > 0 && (
                            <Typography sx={{ fontSize: 11, color: complete ? t.green : t.muted, mt: 0.25, px: 0.25, whiteSpace: "nowrap" }}>
                                {ymd <= today ? `${closed}/${all.length}` : all.length}
                            </Typography>
                        )}
                        <Box sx={{ display: { xs: "none", sm: "block" } }}>
                            {own.slice(0, VISIBLE).map((x) => (
                                <Typography key={`${x.item_key}-${x.due_date}`} noWrap sx={{ fontSize: 11, lineHeight: 1.5, px: 0.25, color: x.status === "overdue" ? t.red : t.muted,
                                    textDecoration: isClosed(x) ? "line-through" : "none" }}>
                                    {x.time ? `${x.time} ` : ""}{x.title}
                                </Typography>
                            ))}
                            {own.length > VISIBLE && <Typography sx={{ fontSize: 11, color: t.faint, px: 0.25 }}>+{own.length - VISIBLE}</Typography>}
                        </Box>
                    </ButtonBase>
                );
            })}
        </Box>
    );
};
