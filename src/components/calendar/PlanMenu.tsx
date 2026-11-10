// src/components/calendar/PlanMenu.tsx
// .107 "Tu día": el botón "5 min" de cada cosa y su ventanita para cambiar, con un toque, la prioridad (alta, normal, baja)
// y cuántos minutos toma. Se guarda para todos los días: en los recordatorios fijos, para todos sus días; en una nota, para
// todas sus fechas. El orden del día cambia solo (DayPlan, en el backend).
import React, { FC, useState } from "react";
import { Box, ButtonBase, Popover, Stack, SxProps, Theme, Typography } from "@mui/material";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import { geist, useTokens } from "../ui/design";
import { CalendarItem, MINUTE_CHOICES, PRIORITIES, Priority, minutesText } from "./calendar";

export type PlanPatch = { priority?: Priority; minutes?: number };

/** Los botones de elegir uno (prioridad o minutos): el elegido en tinta. */
export const ChoiceButton: FC<{ on: boolean; onClick: () => void; children: React.ReactNode; label?: string; sx?: SxProps<Theme> }> = ({ on, onClick, children, label, sx }) => {
    const t = useTokens();
    return (
        <ButtonBase onClick={onClick} aria-pressed={on} aria-label={label}
            sx={[{ minHeight: 40, minWidth: 48, px: 1.5, borderRadius: "8px", fontSize: 14, fontWeight: on ? 600 : 500,
                border: `1px solid ${on ? t.ink : t.line}`, bgcolor: on ? t.ink : "transparent", color: on ? t.onInk : t.ink,
                transition: "background-color 150ms, border-color 150ms", "&:hover": { borderColor: t.ink },
                "&.Mui-focusVisible": { outline: `2px solid ${t.ink}`, outlineOffset: 2 } }, ...(Array.isArray(sx) ? sx : [sx])]}>
            {children}
        </ButtonBase>
    );
};

/** Elegir la prioridad y los minutos (la ventanita de "5 min" y también la de "Anotar" y "Recordatorios fijos"). */
export const PlanPicker: FC<{ priority: Priority; minutes: number; onChange: (patch: PlanPatch) => void }> = ({ priority, minutes, onChange }) => {
    const t = useTokens();
    const custom = !MINUTE_CHOICES.includes(minutes);
    return (
        <Box>
            <Typography sx={{ fontSize: 13, color: t.muted, mb: 0.75 }}>Prioridad</Typography>
            <Stack direction="row" spacing={0.75} role="group" aria-label="Prioridad">
                {PRIORITIES.map((p) => (
                    <ChoiceButton key={p.key} on={priority === p.key} onClick={() => onChange({ priority: p.key })} label={`Prioridad ${p.label.toLowerCase()}: ${p.hint}`}>
                        {p.label}
                    </ChoiceButton>
                ))}
            </Stack>
            <Typography sx={{ fontSize: 13, color: t.muted, mt: 1.75, mb: 0.75 }}>¿Cuánto te toma?</Typography>
            <Box role="group" aria-label="Minutos" sx={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 0.75 }}>
                {MINUTE_CHOICES.map((m) => (
                    <ChoiceButton key={m} on={minutes === m} onClick={() => onChange({ minutes: m })} label={`${minutesText(m)}`}>{minutesText(m)}</ChoiceButton>
                ))}
            </Box>
            {custom && <Typography sx={{ fontSize: 12, color: t.faint, mt: 0.75 }}>Ahora: {minutesText(minutes)}.</Typography>}
        </Box>
    );
};

/** El botón "5 min" de una cosa: abre la ventanita y guarda al tocar (lo guarda quien lo usa, con onSave). */
export const PlanChip: FC<{ item: CalendarItem; onSave: (item: CalendarItem, patch: PlanPatch) => void; disabled?: boolean }> = ({ item, onSave, disabled }) => {
    const t = useTokens();
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const save = (patch: PlanPatch) => {
        setAnchor(null);
        onSave(item, patch);
    };
    return (
        <>
            <ButtonBase onClick={(e) => setAnchor(e.currentTarget)} disabled={disabled}
                aria-label={`${minutesText(item.minutes)}, prioridad ${item.priority}. Cambiar el tiempo o la prioridad de ${item.title}`}
                sx={{ flex: "none", minHeight: 32, px: 1, borderRadius: "8px", gap: 0.5, fontSize: 13, color: t.muted, border: `1px solid ${t.line}`,
                    whiteSpace: "nowrap", "&:hover": { borderColor: t.faint, color: t.ink }, "&.Mui-focusVisible": { outline: `2px solid ${t.ink}`, outlineOffset: 2 } }}>
                <ScheduleRoundedIcon sx={{ fontSize: 15 }} />{minutesText(item.minutes)}
            </ButtonBase>
            <Popover open={Boolean(anchor)} anchorEl={anchor} onClose={() => setAnchor(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{ paper: { sx: { ...geist, p: 2, width: 300, maxWidth: "calc(100vw - 32px)", borderRadius: "12px", border: `1px solid ${t.line}`, boxShadow: "0 8px 24px rgba(0,0,0,.12)" } } }}>
                <Typography sx={{ fontSize: 15, fontWeight: 600, mb: 1.5, overflowWrap: "anywhere" }}>{item.title}</Typography>
                <PlanPicker priority={item.priority} minutes={item.minutes} onChange={save} />
                <Typography sx={{ fontSize: 12, color: t.faint, mt: 1.5 }}>
                    {item.note_id ? "Se guarda para esta nota, en todas sus fechas." : item.item_key.startsWith("expense:") ? "Se guarda para este gasto, en todos sus vencimientos." : "Se guarda para todos los días."}
                </Typography>
            </Popover>
        </>
    );
};
