import { FC, useEffect, useState } from "react";
import {
    Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, Switch, TextField, Typography
} from "@mui/material";
import { toast } from "react-toastify";
import { AgencyRouting, WeekSchedule, WorkingFields, WorkingHoursFields } from "../../interfaces/agencyRouting.types";
import { routingApi } from "./agencyApi";

type Props = {
    open: boolean;
    /** Ciudad (solo encendida o apagada) o agencia (con su horario); null cierra el diálogo. */
    target: ({ kind: 'city'; id: number; name: string } & WorkingFields) | ({ kind: 'agency'; id: number; name: string } & WorkingHoursFields) | null;
    onClose: () => void;
    onSaved: (data: AgencyRouting) => void;
};

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

type Day = { works: boolean; from: string; until: string };

/** El horario de la agencia, día por día: el que tiene por día o, si no, el mismo "desde/hasta" los 7 días. */
const daysFrom = (t: WorkingHoursFields): Day[] => DAYS.map((_, i) => {
    if (t.schedule) {
        const h = t.schedule[String(i + 1)];
        return { works: !!h, from: h?.[0] ?? '', until: h?.[1] ?? '' };
    }
    return { works: true, from: t.works_from ?? '', until: t.works_until ?? '' };
});

/**
 * Encender o apagar una ciudad o agencia, y el horario de la agencia día por día (Fran, 2026-10-17: "los horarios
 * deberían ser por agencia"; dueño, 2026-11-01: "Caracas de 9 a 7 de lunes a viernes, los sábados hasta las 5").
 * Mientras no trabaja, las órdenes nuevas de la ciudad no pasan a vendedora, y los mensajes automáticos de WhatsApp de
 * sus pedidos esperan a que trabaje.
 */
export const WorkingHoursDialog: FC<Props> = ({ open, target, onClose, onSaved }) => {
    const [working, setWorking] = useState(true);
    const [days, setDays] = useState<Day[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open && target) {
            setWorking(target.is_working);
            setDays(target.kind === 'agency' ? daysFrom(target) : []);
        }
    }, [open, target]);

    const isCity = target?.kind === 'city';
    const setDay = (i: number, patch: Partial<Day>) => setDays((prev) => prev.map((d, j) => (j === i ? { ...d, ...patch } : d)));
    const copyMonday = () => setDays((prev) => prev.map((d) => (d.works ? { ...d, from: prev[0].from, until: prev[0].until } : d)));

    const save = async () => {
        if (!target) return;
        const schedule: WeekSchedule = Object.fromEntries(days.map((d, i) => [String(i + 1), d.works ? [d.from || null, d.until || null] : null]));
        setSaving(true);
        const res = isCity
            ? await routingApi(`/cities/${target.id}/working`, 'PUT', { is_working: working })
            : await routingApi(`/agencies/${target.id}/hours`, 'PUT', { is_working: working, schedule });
        setSaving(false);
        if (res.ok) {
            toast.success(res.message);
            onSaved(res.data);
            onClose();
        } else {
            toast.error(res.message);
        }
    };

    return (
        <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth={isCity ? 'xs' : 'sm'}>
            <DialogTitle>{target?.name}: trabaja</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <FormControlLabel
                        control={<Switch checked={working} onChange={(e) => setWorking(e.target.checked)} color="success" />}
                        label={working ? 'Encendida' : 'Apagada'}
                    />
                    {!working && (
                        <Alert severity="warning">
                            {isCity
                                ? 'Apagada, las órdenes nuevas de esta ciudad no pasan a vendedora: esperan sin vendedora y se reparten solas cuando la enciendas.'
                                : 'Apagada, no recibe órdenes en el reparto de sus ciudades. Si es la única agencia de una ciudad, las órdenes nuevas de esa ciudad no pasan a vendedora hasta que la enciendas.'}
                        </Alert>
                    )}
                    {isCity ? (
                        <Typography variant="caption" color="text.secondary">
                            El horario es de cada agencia: se pone en la tabla de Agencias, con su botón de encendido. Si la agencia de la ciudad está fuera de horario, la ciudad tampoco pasa órdenes a vendedora.
                        </Typography>
                    ) : (
                        <>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap spacing={1}>
                                <Typography variant="subtitle2">Horario de cada día</Typography>
                                <Button size="small" onClick={copyMonday}>Copiar el lunes a los días que trabaja</Button>
                            </Stack>
                            <Stack spacing={1}>
                                {days.map((d, i) => (
                                    <Box key={DAYS[i]} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '150px 1fr 1fr' }, gap: 1, alignItems: 'center' }}>
                                        <FormControlLabel
                                            sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' }, m: 0 }}
                                            control={<Switch size="small" checked={d.works} onChange={(e) => setDay(i, { works: e.target.checked })} />}
                                            label={<Typography variant="body2" fontWeight={600} color={d.works ? 'text.primary' : 'text.disabled'}>{DAYS[i]}</Typography>}
                                        />
                                        {d.works ? (
                                            <>
                                                <TextField type="time" size="small" label="Desde" value={d.from} onChange={(e) => setDay(i, { from: e.target.value })} InputLabelProps={{ shrink: true }} />
                                                <TextField type="time" size="small" label="Hasta" value={d.until} onChange={(e) => setDay(i, { until: e.target.value })} InputLabelProps={{ shrink: true }} />
                                            </>
                                        ) : (
                                            <Typography variant="body2" color="text.disabled" sx={{ gridColumn: { xs: '1 / -1', sm: 'span 2' } }}>No trabaja</Typography>
                                        )}
                                    </Box>
                                ))}
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                                Horas vacías = todo el día. Fuera del horario es como si estuviera apagada: sus órdenes nuevas no pasan a vendedora y los mensajes automáticos de WhatsApp de sus pedidos esperan; al llegar la hora, se reparten y salen solos.
                                Las órdenes que ya tienen vendedora no cambian.
                            </Typography>
                        </>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>Cancelar</Button>
                <Button variant="contained" onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
            </DialogActions>
        </Dialog>
    );
};
