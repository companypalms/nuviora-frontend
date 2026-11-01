// src/components/calendar/DayList.tsx
// Lo de un día del calendario: su fecha, el botón "Anotar" y la lista para tildar. Primero lo propio del día (notas,
// pagos, revisiones de la semana o del mes), después Meta Ads y los editores (.67) y abajo la rutina de todos los días. Es
// el panel de al lado del mes y, en el celular, cada día de la semana.
import React, { FC } from "react";
import { Button, Chip, IconButton, Stack, Typography } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { CalendarItem, cap, isMeta, isOwn, isRoutine, longDate, weekdayOf } from "./calendar";
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
    const own = items.filter(isOwn);
    const meta = items.filter(isMeta);
    const routine = items.filter(isRoutine);
    const row = (item: CalendarItem) => (
        <CalendarItemRow key={`${item.item_key}-${item.due_date}`} item={item} busy={busy === `${item.item_key}-${item.due_date}`} {...actions} />
    );
    // Un bloque con su título y cuántas van hechas: Meta Ads y los editores, y la rutina de todos los días
    const block = (title: string, list: CalendarItem[], first: boolean) => {
        if (list.length === 0) return null;
        const done = list.filter((i) => i.status === "done" || i.status === "dismissed").length;
        return (
            <>
                <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ pt: first ? 0 : 1 }}>
                    <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                        {title}
                    </Typography>
                    <Typography variant="caption" color={done === list.length ? "success.main" : "text.secondary"}>
                        {done} de {list.length} hechas
                    </Typography>
                </Stack>
                {list.map(row)}
            </>
        );
    };

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
            {block("Meta Ads y editores", meta, own.length === 0)}
            {block("Rutina de todos los días", routine, own.length + meta.length === 0)}
        </Stack>
    );
};
