// src/components/calendar/RemindersDialog.tsx
// "Recordatorios fijos": los que pone el calendario solo (la rutina de todos los días, la revisión de la semana y del mes,
// las metas). Se pueden apagar, y la revisión de la semana se puede mover a otro día (por si los cierres de las agencias
// llegan otro día). Cada uno dice cuándo toca, por qué importa y si se tilda solo.
import React, { FC, useEffect, useState } from "react";
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, MenuItem, Stack, Switch, TextField, Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import { CalendarSettings, TYPE_META, fetchCalendarSettings, saveCalendarSettings } from "./calendar";

type Props = { open: boolean; onClose: () => void; onSaved: () => void };

export const RemindersDialog: FC<Props> = ({ open, onClose, onSaved }) => {
    const [data, setData] = useState<CalendarSettings | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        let alive = true;
        fetchCalendarSettings().then((r) => { if (alive) setData(r); }).catch((e) => toast.error(e.message));
        return () => { alive = false; };
    }, [open]);

    const change = (key: string, patch: { on?: boolean; weekday?: number }) =>
        setData((d) => d && { ...d, rules: d.rules.map((r) => (r.key === key ? { ...r, ...patch } : r)) });

    const save = async () => {
        if (!data) return;
        setSaving(true);
        try {
            const rules = Object.fromEntries(data.rules.map((r) => [r.key, r.weekday ? { on: r.on, weekday: r.weekday } : { on: r.on }]));
            toast.success((await saveCalendarSettings(rules)).message);
            onSaved();
        } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Recordatorios fijos</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Los pone el calendario solo. Apaga los que no quieras ver. Los que dicen «se tilda solo» se marcan como hechos
                    cuando el sistema ve que ya está hecho.
                </Typography>
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
                <Button onClick={onClose}>Cancelar</Button>
                <Button variant="contained" onClick={save} disabled={saving || !data}>Guardar</Button>
            </DialogActions>
        </Dialog>
    );
};
