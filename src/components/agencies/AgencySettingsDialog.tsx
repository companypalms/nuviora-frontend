import { FC, useEffect, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from "@mui/material";
import { toast } from "react-toastify";
import { AgencyRouting, RoutingAgency } from "../../interfaces/agencyRouting.types";
import { routingApi } from "./agencyApi";

type Props = {
    open: boolean;
    agency: RoutingAgency | null;
    onClose: () => void;
    onSaved: (data: AgencyRouting) => void;
};

/** Tarifa por carrera y máximo de órdenes activas de una agencia (Fran §5 y §15). */
export const AgencySettingsDialog: FC<Props> = ({ open, agency, onClose, onSaved }) => {
    const [cost, setCost] = useState('');
    const [max, setMax] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open && agency) {
            setCost(String(agency.delivery_cost ?? 0));
            setMax(agency.max_active_orders === null ? '' : String(agency.max_active_orders));
        }
    }, [open, agency]);

    const save = async () => {
        if (!agency) return;
        setSaving(true);
        const res = await routingApi(`/agencies/${agency.id}`, 'PUT', {
            delivery_cost: Number(cost || 0),
            max_active_orders: max.trim() === '' ? null : Number(max),
        });
        setSaving(false);
        if (res.ok) {
            toast.success('Agencia actualizada');
            onSaved(res.data);
            onClose();
        } else {
            toast.error(res.message);
        }
    };

    return (
        <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
            <DialogTitle>{agency?.names}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        label="Tarifa por carrera (USD)"
                        type="number"
                        value={cost}
                        onChange={(e) => setCost(e.target.value)}
                        inputProps={{ min: 0, step: 0.01 }}
                        helperText="Se paga en cada intento de entrega, también en los fallidos."
                        fullWidth
                    />
                    <TextField
                        label="Máximo de órdenes activas"
                        type="number"
                        value={max}
                        onChange={(e) => setMax(e.target.value)}
                        inputProps={{ min: 1, step: 1 }}
                        helperText="Vacío = sin tope. Al llegar al máximo, las órdenes van primero a las otras agencias de la ciudad; si todas están en su máximo, se reparten en partes iguales. Vale para todas sus ciudades."
                        fullWidth
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>Cancelar</Button>
                <Button variant="contained" onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
            </DialogActions>
        </Dialog>
    );
};
