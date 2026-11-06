// src/components/calendar/RemindersDialog.tsx
// "Recordatorios fijos": los que pone el calendario solo (la rutina de todos los días, la revisión de la semana y del mes,
// las metas). Se pueden apagar, y la revisión de la semana se puede mover a otro día (por si los cierres de las agencias
// llegan otro día). Cada uno dice cuándo toca, por qué importa y si se tilda solo. .107: también su prioridad y cuántos
// minutos toma (lo propuso Claude; el dueño lo cambia), y lo mismo para todos los gastos fijos de Finanzas.
import React, { FC, useEffect, useState } from "react";
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, MenuItem, Stack, Switch, TextField, Typography, useMediaQuery,
} from "@mui/material";
import { Theme } from "@mui/material/styles";
import { toast } from "react-toastify";
import { geist, inkSx, useTokens } from "../ui/design";
import { CalendarSettings, MINUTE_CHOICES, PRIORITIES, Priority, TYPE_META, fetchCalendarSettings, minutesText, saveCalendarSettings, saveItemPlan } from "./calendar";

type Props = { open: boolean; onClose: () => void; onSaved: () => void };

/** La prioridad y los minutos de un recordatorio (o de los gastos fijos), en dos listas cortas. */
const PlanSelects: FC<{ priority: Priority; minutes: number; disabled?: boolean; onChange: (p: { priority?: Priority; minutes?: number }) => void; name: string }> = ({ priority, minutes, disabled, onChange, name }) => (
    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <TextField select size="small" label="Prioridad" value={priority} disabled={disabled} onChange={(e) => onChange({ priority: e.target.value as Priority })}
            sx={{ minWidth: 120 }} slotProps={{ htmlInput: { "aria-label": `Prioridad de ${name}` } }}>
            {PRIORITIES.map((p) => <MenuItem key={p.key} value={p.key}>{p.label}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Toma" value={minutes} disabled={disabled} onChange={(e) => onChange({ minutes: Number(e.target.value) })}
            sx={{ minWidth: 110 }} slotProps={{ htmlInput: { "aria-label": `Minutos de ${name}` } }}>
            {[...new Set([...MINUTE_CHOICES, minutes])].sort((a, b) => a - b).map((m) => <MenuItem key={m} value={m}>{minutesText(m)}</MenuItem>)}
        </TextField>
    </Stack>
);

export const RemindersDialog: FC<Props> = ({ open, onClose, onSaved }) => {
    const t = useTokens();
    const phone = useMediaQuery((th: Theme) => th.breakpoints.down("sm"));
    const [data, setData] = useState<CalendarSettings | null>(null);
    const [first, setFirst] = useState<CalendarSettings | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        let alive = true;
        fetchCalendarSettings().then((r) => { if (alive) { setData(r); setFirst(r); } }).catch((e) => toast.error(e.message));
        return () => { alive = false; };
    }, [open]);

    const change = (key: string, patch: { on?: boolean; weekday?: number; priority?: Priority; minutes?: number }) =>
        setData((d) => d && { ...d, rules: d.rules.map((r) => (r.key === key ? { ...r, ...patch } : r)) });

    const save = async () => {
        if (!data || !first) return;
        setSaving(true);
        try {
            const rules = Object.fromEntries(data.rules.map((r) => [r.key, r.weekday ? { on: r.on, weekday: r.weekday } : { on: r.on }]));
            // .107: la prioridad y los minutos, solo los que cambiaron (para todos los días)
            const before = Object.fromEntries(first.rules.map((r) => [r.key, r]));
            const plans: { item_key: string; priority: Priority; minutes: number }[] = data.rules
                .filter((r) => before[r.key] && (before[r.key].priority !== r.priority || before[r.key].minutes !== r.minutes))
                .map((r) => ({ item_key: `rule:${r.key}`, priority: r.priority, minutes: r.minutes }));
            if (first.expenses.priority !== data.expenses.priority || first.expenses.minutes !== data.expenses.minutes) {
                plans.push({ item_key: "expense:*", ...data.expenses });
            }
            if (plans.length) await saveItemPlan(plans);
            toast.success((await saveCalendarSettings(rules)).message);
            onSaved();
        } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={phone} PaperProps={{ sx: { ...geist, borderRadius: phone ? 0 : "12px" } }}>
            <DialogTitle sx={{ fontSize: 18, fontWeight: 600 }}>Recordatorios fijos</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Los pone el calendario solo. Apaga los que no quieras ver. Los que dicen «se tilda solo» se marcan como hechos
                    cuando el sistema ve que ya está hecho. La prioridad y los minutos ordenan tu día: se guardan para todos los días.
                </Typography>
                {data && (
                    <Box sx={{ bgcolor: t.soft, borderRadius: "10px", p: "12px 14px", mb: 2 }}>
                        <Typography variant="body2" fontWeight={600}>Pagos de gastos fijos (Finanzas)</Typography>
                        <Typography variant="caption" color="text.secondary" component="div">
                            Para todos los gastos fijos que no tienen los suyos. A uno solo se le cambia en Tu día, con su botón de minutos.
                        </Typography>
                        <PlanSelects name="los gastos fijos" priority={data.expenses.priority} minutes={data.expenses.minutes}
                            onChange={(p) => setData((d) => d && { ...d, expenses: { ...d.expenses, ...p } })} />
                    </Box>
                )}
                {!data ? <Typography color="text.secondary">Cargando…</Typography> : (
                    <Stack divider={<Divider flexItem />} spacing={1.5}>
                        {data.rules.map((r) => (
                            <Stack key={r.key} direction="row" gap={1.5} alignItems="flex-start">
                                <Switch
                                    checked={r.on}
                                    onChange={(e) => change(r.key, { on: e.target.checked })}
                                    slotProps={{ input: { "aria-label": `${r.on ? "Apagar" : "Encender"} ${r.title}` } }}
                                />
                                <Box sx={{ minWidth: 0, flex: 1, opacity: r.on ? 1 : 0.55 }}>
                                    <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap">
                                        <Typography variant="body2" fontWeight={700}>{r.title}</Typography>
                                        <Chip size="small" variant="outlined" color={TYPE_META[r.type].color} label={TYPE_META[r.type].label} sx={{ height: 20, fontSize: 11 }} />
                                        {r.auto && <Chip size="small" variant="outlined" label="se tilda solo" sx={{ height: 20, fontSize: 11 }} />}
                                    </Stack>
                                    <Typography variant="caption" color="text.secondary" component="div">{r.schedule}</Typography>
                                    <Typography variant="caption" color="text.secondary" component="div">{r.help}</Typography>
                                    <PlanSelects name={r.title} priority={r.priority} minutes={r.minutes} disabled={!r.on} onChange={(p) => change(r.key, p)} />
                                    {r.weekday !== null && (
                                        <TextField
                                            select size="small" label="Qué día" value={r.weekday} disabled={!r.on}
                                            onChange={(e) => change(r.key, { weekday: Number(e.target.value) })}
                                            sx={{ mt: 1, minWidth: 160 }}
                                        >
                                            {Object.entries(data.weekdays).map(([n, name]) => (
                                                <MenuItem key={n} value={Number(n)} sx={{ textTransform: "capitalize" }}>{name}</MenuItem>
                                            ))}
                                        </TextField>
                                    )}
                                </Box>
                            </Stack>
                        ))}
                    </Stack>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} sx={{ color: t.ink }}>Cancelar</Button>
                <Button variant="contained" disableElevation onClick={save} disabled={saving || !data} sx={{ ...inkSx(t), minHeight: { xs: 48, sm: 40 } }}>Guardar</Button>
            </DialogActions>
        </Dialog>
    );
};
