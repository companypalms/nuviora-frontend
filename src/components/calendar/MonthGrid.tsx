// src/components/calendar/MonthGrid.tsx
// La vista de mes del calendario: de lunes a domingo (el domingo en gris: no se trabaja). En cada día, lo que toca con el
// color de su tipo (pago, tarea, revisión); lo atrasado en rojo y lo hecho tachado. Tocar un día lo abre al lado.
import React, { FC } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { CalendarItem, TYPE_META, WEEKDAYS_SHORT, isClosed, longDate, monthWeeks } from "./calendar";

type Props = {
    month: string;
    days: Record<string, CalendarItem[]>;
    today: string;
    selected: string;
    onSelect: (ymd: string) => void;
};

/** Cuántas cosas se ven escritas en cada día; el resto, "+N más". */
const VISIBLE = 3;

export const MonthGrid: FC<Props> = ({ month, days, today, selected, onSelect }) => {
    const weeks = monthWeeks(month);
    const inMonth = (ymd: string) => ymd.slice(0, 7) === month.slice(0, 7);

    return (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 0.5 }}>
            {WEEKDAYS_SHORT.map((d, i) => (
                <Typography key={d} variant="caption" fontWeight={800} color={i === 6 ? "text.disabled" : "text.secondary"} sx={{ textAlign: "center", pb: 0.5 }}>
                    {d}
                </Typography>
            ))}
            {weeks.flat().map((ymd, i) => {
                const items = days[ymd] ?? [];
                const sunday = i % 7 === 6;
                const isToday = ymd === today;
                const isSelected = ymd === selected;
                const overdue = items.filter((x) => x.status === "overdue").length;
                return (
                    <ButtonBase
                        key={ymd}
                        onClick={() => onSelect(ymd)}
                        aria-label={`${longDate(ymd)}: ${items.length === 0 ? "nada" : `${items.length} ${items.length === 1 ? "cosa" : "cosas"}`}`}
                        aria-pressed={isSelected}
                        sx={(t) => ({
                            display: "flex", flexDirection: "column", alignItems: "stretch", justifyContent: "flex-start",
                            minHeight: 104, p: 0.75, borderRadius: 2, textAlign: "left",
                            border: `1px solid ${isSelected ? t.palette.primary.main : t.palette.divider}`,
                            boxShadow: isSelected ? `0 0 0 1px ${t.palette.primary.main}` : "none",
                            bgcolor: sunday ? alpha(t.palette.text.primary, 0.04) : "transparent",
                            opacity: inMonth(ymd) ? 1 : 0.45,
                            "&:hover": { bgcolor: alpha(t.palette.primary.main, 0.06) },
                        })}
                    >
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                            <Typography
                                variant="body2"
                                fontWeight={800}
                                sx={(t) => ({
                                    width: 26, height: 26, lineHeight: "26px", textAlign: "center", borderRadius: "50%",
                                    bgcolor: isToday ? t.palette.primary.main : "transparent",
                                    color: isToday ? t.palette.primary.contrastText : sunday ? t.palette.text.disabled : t.palette.text.primary,
                                })}
                            >
                                {Number(ymd.slice(8, 10))}
                            </Typography>
                            {overdue > 0 && <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "error.main" }} title={`${overdue} atrasada(s)`} />}
                        </Box>
                        {items.slice(0, VISIBLE).map((x) => (
                            <Typography
                                key={`${x.item_key}-${x.due_date}`}
                                variant="caption"
                                noWrap
                                sx={(t) => ({
                                    display: "block", px: 0.5, mb: 0.25, borderRadius: 1, fontWeight: 600, lineHeight: 1.5,
                                    color: x.status === "overdue" ? t.palette.error.main : t.palette[TYPE_META[x.type].color].main,
                                    bgcolor: alpha(x.status === "overdue" ? t.palette.error.main : t.palette[TYPE_META[x.type].color].main, 0.1),
                                    textDecoration: isClosed(x) ? "line-through" : "none",
                                    opacity: isClosed(x) ? 0.6 : 1,
                                })}
                            >
                                {x.time ? `${x.time} ` : ""}{x.title}
                            </Typography>
                        ))}
                        {items.length > VISIBLE && (
                            <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>+{items.length - VISIBLE} más</Typography>
                        )}
                    </ButtonBase>
                );
            })}
        </Box>
    );
};
