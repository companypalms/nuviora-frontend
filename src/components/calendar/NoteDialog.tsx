// src/components/calendar/NoteDialog.tsx
// "Anotar" en el calendario (o editar una nota): qué hay que hacer, la fecha, la hora si quiere, si es una tarea o un pago,
// y si se repite (cada semana, cada mes, o el 15 y el último) y hasta cuándo. Lo revisa el backend (NoteRules) y, si algo
// está mal, se marca la casilla con el motivo. .107: también su prioridad y cuánto toma (vienen en normal y 15 minutos),
// con el estilo nuevo y a pantalla completa en el celular.
import React, { FC, useState } from "react";
import {
    Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography, useMediaQuery,
} from "@mui/material";
import { Theme } from "@mui/material/styles";
import { toast } from "react-toastify";
import { geist, inkSx, useTokens } from "../ui/design";
import { NOTE_PLAN, NoteFields, NoteKind, Priority, Repeat, archiveNote, repeatChoices, saveNote } from "./calendar";
import { PlanPicker } from "./PlanMenu";

export type NoteOpen = { id: number | null; fields: NoteFields; plan?: { priority: Priority; minutes: number } };

type Props = {
    /** null: cerrada. id null: nota nueva en esa fecha. */
    open: NoteOpen | null;
    onClose: () => void;
    onSaved: () => void;
    /** .108 "Tu hora": de qué zona es la hora que se anota ("Portugal"). */
    zoneLabel?: string;
};

export const NoteDialog: FC<Props> = (props) => (props.open ? <NoteForm key={`${props.open.id}-${props.open.fields.date}`} {...props} open={props.open} /> : null);

const NoteForm: FC<Props & { open: NoteOpen }> = ({ open, onClose, onSaved, zoneLabel = "Venezuela" }) => {
    const t = useTokens();
    const phone = useMediaQuery((th: Theme) => th.breakpoints.down("sm"));
    const [f, setF] = useState<NoteFields>(open.fields);
    const [plan, setPlan] = useState(open.plan ?? NOTE_PLAN);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const set = <K extends keyof NoteFields>(key: K, value: NoteFields[K]) => {
        setF((x) => ({ ...x, [key]: value }));
        setErrors((e) => ({ ...e, [key]: "" }));
    };

    const save = async () => {
        setSaving(true);
        try {
            const r = await saveNote(open.id, { ...f, repeat_until: f.repeat === "none" ? null : f.repeat_until, ...plan });
            toast.success(r.message);
            onSaved();
        } catch (e) {
            const err = e as Error & { errors?: Record<string, string[]> };
            if (err.errors) setErrors(Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v[0]])));
            toast.error(err.message);
        } finally { setSaving(false); }
    };

    const remove = async () => {
        if (open.id === null) return;
        setSaving(true);
        try {
            toast.success((await archiveNote(open.id)).message);
            onSaved();
        } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
    };

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="sm" fullScreen={phone} PaperProps={{ sx: { ...geist, borderRadius: phone ? 0 : "12px" } }}>
            <DialogTitle sx={{ fontSize: 18, fontWeight: 600 }}>{open.id ? "Editar nota" : "Anotar"}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        label="¿Qué hay que hacer?"
                        value={f.title}
                        onChange={(e) => set("title", e.target.value)}
                        error={!!errors.title}
                        helperText={errors.title || " "}
                        autoFocus
                        fullWidth
                        inputProps={{ maxLength: 150 }}
                    />
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField
                            label="Fecha" type="date" value={f.date} onChange={(e) => set("date", e.target.value)}
                            error={!!errors.date} helperText={errors.date || " "} InputLabelProps={{ shrink: true }} fullWidth
                        />
                        <TextField
                            label="Hora (si quieres)" type="time" value={f.time ?? ""} onChange={(e) => set("time", e.target.value || null)}
                            error={!!errors.time} helperText={errors.time || `Hora de ${zoneLabel}`} InputLabelProps={{ shrink: true }} fullWidth
                        />
                    </Stack>
                    <PlanPicker priority={plan.priority} minutes={plan.minutes} onChange={(p) => setPlan((x) => ({ ...x, ...p }))} />
                    {(errors.priority || errors.minutes) && <Typography sx={{ fontSize: 13, color: t.red }}>{errors.priority || errors.minutes}</Typography>}
                    <Box>
                        <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.5 }}>¿Es una tarea o un pago?</Typography>
                        <ToggleButtonGroup exclusive size="small" value={f.kind} onChange={(_, v: NoteKind | null) => v && set("kind", v)}>
                            <ToggleButton value="task">Tarea</ToggleButton>
                            <ToggleButton value="payment">Pago</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField
                            select label="¿Se repite?" value={f.repeat} onChange={(e) => set("repeat", e.target.value as Repeat)}
                            error={!!errors.repeat} helperText={errors.repeat || " "} fullWidth
                        >
                            {repeatChoices(f.date).map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
                        </TextField>
                        {f.repeat !== "none" && (
                            <TextField
                                label="Hasta (si termina)" type="date" value={f.repeat_until ?? ""} onChange={(e) => set("repeat_until", e.target.value || null)}
                                error={!!errors.repeat_until} helperText={errors.repeat_until || "Vacío: se repite siempre"} InputLabelProps={{ shrink: true }} fullWidth
                            />
                        )}
                    </Stack>
                    {f.repeat !== "none" && (
                        <Typography variant="caption" color="text.secondary">
                            Si un día cae domingo: {f.kind === "payment" ? "el pago se adelanta al sábado" : "la tarea pasa al lunes"}.
                        </Typography>
                    )}
                    <TextField
                        label="Detalles (si quieres)" value={f.details ?? ""} onChange={(e) => set("details", e.target.value || null)}
                        error={!!errors.details} helperText={errors.details || " "} multiline minRows={2} fullWidth
                    />
                    {confirmDelete && (
                        <Alert severity="warning" action={
                            <Stack direction="row" gap={1}>
                                <Button size="small" onClick={() => setConfirmDelete(false)}>No</Button>
                                <Button size="small" color="error" variant="contained" onClick={remove} disabled={saving}>Sí, borrar</Button>
                            </Stack>
                        }>
                            {f.repeat === "none" ? "¿Borrar esta nota?" : "¿Borrar esta nota en todas sus fechas?"} Lo que ya tildaste queda guardado.
                        </Alert>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                {open.id !== null && !confirmDelete && (
                    <Button color="error" onClick={() => setConfirmDelete(true)} sx={{ mr: "auto" }}>Borrar</Button>
                )}
                <Button onClick={onClose} sx={{ color: t.ink }}>Cancelar</Button>
                <Button variant="contained" disableElevation onClick={save} disabled={saving || f.title.trim() === "" || !f.date} sx={{ ...inkSx(t), minHeight: { xs: 48, sm: 40 } }}>Guardar</Button>
            </DialogActions>
        </Dialog>
    );
};
