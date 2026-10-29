// src/components/calendar/DayList.tsx
// Lo de un día del calendario: su fecha, el botón "Anotar" y la lista para tildar. Primero lo propio del día (notas,
// pagos, revisiones de la semana o del mes) y abajo la rutina de todos los días. Es el panel de al lado del mes y, en el
// celular, cada día de la semana.
import React, { FC } from "react";
import { Button, Chip, IconButton, Stack, Typography } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { CalendarItem, cap, isRoutine, longDate, weekdayOf } from "./calendar";
import { CalendarItemRow } from "./CalendarItemRow";

type Props = {
    date: string;
    today: string;
    items: CalendarItem[];
    busy: string | null;
    compact?: boolean;
    onAdd: (date: string) => void;
    onToggle: (item: CalendarItem) => void;
    onDismiss: (item: CalendarItem) => void;
    onUndo: (item: CalendarItem) => void;
    onEdit: (item: CalendarItem) => void;
    onPay: (item: CalendarItem, recurringId: number) => void;
};

export const DayList: FC<Props> = ({ date, today, items, busy, compact, onAdd, ...actions }) => {
    const sunday = weekdayOf(date) === 7;
    const own = items.filter((i) => !isRoutine(i));
    const routine = items.filter(isRoutine);
    const routineDone = routine.filter((i) => i.status === "done" || i.status === "dismissed").length;
    const row = (item: CalendarItem) => (
        <CalendarItemRow key={`${item.item_key}-${item.due_date}`} item={item} busy={busy === `${item.item_key}-${item.due_date}`} {...actions} />
    );

    return (
        <Stack spacing={1}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                <Stack direction="row" alignItems="center" gap={1} sx={{ minWidth: 0 }}>
                    <Typography variant={compact ? "subtitle2" : "subtitle1"} fontWeight={800}>{cap(longDate(date))}</Typography>
                    {date === today && <Chip size="small" color="primary" label="Hoy" sx={{ height: 20 }} />}
                </Stack>
                {compact
                    ? <IconButton size="small" color="primary" aria-label={`Anotar el ${longDate(date)}`} onClick={() => onAdd(date)}><AddRoundedIcon fontSize="small" /></IconButton>
                    : <Button size="small" startIcon={<AddRoundedIcon />} onClick={() => onAdd(date)} sx={{ flexShrink: 0 }}>Anotar</Button>}
            </Stack>
            {sunday && items.length === 0 && <Typography variant="caption" color="text.disabled">Domingo: no se trabaja.</Typography>}
            {!sunday && items.length === 0 && (
                <Typography variant="body2" color="text.secondary">{compact ? "Nada." : "Nada anotado para este día."}</Typography>
            )}
            {own.map(row)}
            {routine.length > 0 && (
                <>
                    <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ pt: own.length ? 1 : 0 }}>
                        <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                            Rutina de todos los días
                        </Typography>
                        <Typography variant="caption" color={routineDone === routine.length ? "success.main" : "text.secondary"}>
                            {routineDone} de {routine.length} hechas
                        </Typography>
                    </Stack>
                    {routine.map(row)}
                </>
            )}
        </Stack>
    );
};
