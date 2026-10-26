import { FC, useEffect, useState } from "react";
import {
    Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, Switch, TextField, Typography
} from "@mui/material";
import { toast } from "react-toastify";
import { AgencyRouting, WorkingFields, WorkingHoursFields } from "../../interfaces/agencyRouting.types";
import { routingApi } from "./agencyApi";

type Props = {
    open: boolean;
    /** Ciudad (solo encendida o apagada) o agencia (con su horario); null cierra el diálogo. */
    target: ({ kind: 'city'; id: number; name: string } & WorkingFields) | ({ kind: 'agency'; id: number; name: string } & WorkingHoursFields) | null;
    onClose: () => void;
    onSaved: (data: AgencyRouting) => void;
};

/**
 * Encender o apagar una ciudad o agencia, y el horario de la agencia (Fran, 2026-10-17: "Valencia no puede trabajar";
 * "los horarios deberían ser por agencia, porque cada agencia puede tener un horario distinto"). Mientras no trabaja,
 * las órdenes nuevas de la ciudad no pasan a vendedora.
 */
export const WorkingHoursDialog: FC<Props> = ({ open, target, onClose, onSaved }) => {
    const [working, setWorking] = useState(true);
    const [from, setFrom] = useState('');
    const [until, setUntil] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open && target) {
            setWorking(target.is_working);
            setFrom(target.kind === 'agency' ? target.works_from ?? '' : '');
            setUntil(target.kind === 'agency' ? target.works_until ?? '' : '');
        }
    }, [open, target]);

    const isCity = target?.kind === 'city';

    const save = async () => {
        if (!target) return;
        setSaving(true);
        const res = isCity
            ? await routingApi(`/cities/${target.id}/working`, 'PUT', { is_working: working })
            : await routingApi(`/agencies/${target.id}/hours`, 'PUT', { is_working: working, works_from: from || null, works_until: until || null });
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
        <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
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
                            <Typography variant="subtitle2">Horario (todos los días)</Typography>
                            <Stack direction="row" spacing={2}>
                                <TextField
                                    type="time"
                                    label="Desde"
                                    value={from}
                                    onChange={(e) => setFrom(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                    fullWidth
                                />
                                <TextField
                                    type="time"
                                    label="Hasta"
                                    value={until}
                                    onChange={(e) => setUntil(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                    fullWidth
                                />
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                                Vacío = todo el día. Fuera del horario es como si estuviera apagada; al llegar la hora, las órdenes que esperaban se reparten solas.
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
