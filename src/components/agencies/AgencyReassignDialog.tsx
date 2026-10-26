import { FC, useEffect, useState } from "react";
import {
    Alert, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
    FormControlLabel, Stack, Typography
} from "@mui/material";
import { toast } from "react-toastify";
import { AgencyRouting, RoutingAgency } from "../../interfaces/agencyRouting.types";
import { routingApi } from "./agencyApi";

type Preview = {
    statuses: { id: number; description: string; count: number }[];
    targets: { id: number; names: string }[];
};

type Props = {
    open: boolean;
    agency: RoutingAgency | null;
    /** Solo el administrador puede pasarlas aunque las otras estén en su máximo. */
    canForce: boolean;
    onClose: () => void;
    onSaved: (data: AgencyRouting) => void;
};

/**
 * Tarea 8 para agencias: pasar las órdenes de una agencia a las demás de su ciudad, con el mismo
 * reparto. Solo las que todavía no salieron a la calle; su stock se mueve de almacén solo.
 */
export const AgencyReassignDialog: FC<Props> = ({ open, agency, canForce, onClose, onSaved }) => {
    const [preview, setPreview] = useState<Preview | null>(null);
    const [statusIds, setStatusIds] = useState<number[]>([]);
    const [targetIds, setTargetIds] = useState<number[]>([]);
    const [force, setForce] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open || !agency) return;
        setPreview(null);
        setForce(false);
        routingApi<Preview>(`/agencies/${agency.id}/reassign`).then((res) => {
            if (!res.ok) {
                toast.error(res.message);
                return;
            }
            setPreview(res.data);
            setStatusIds(res.data.statuses.filter((s) => s.count > 0).map((s) => s.id));
            setTargetIds(res.data.targets.map((t) => t.id));
        });
    }, [open, agency]);

    const toggle = (list: number[], id: number) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
    const total = preview?.statuses.filter((s) => statusIds.includes(s.id)).reduce((n, s) => n + s.count, 0) ?? 0;

    const run = async () => {
        if (!agency) return;
        setSaving(true);
        const res = await routingApi<{ routing: AgencyRouting }>(`/agencies/${agency.id}/reassign`, 'POST', {
            status_ids: statusIds, to_agency_ids: targetIds, force,
        });
        setSaving(false);
        if (res.ok) {
            toast.success(res.message);
            onSaved(res.data.routing);
            onClose();
        } else {
            toast.error(res.message);
        }
    };

    return (
        <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
            <DialogTitle>Pasar órdenes de {agency?.names}</DialogTitle>
            <DialogContent>
                {!preview ? (
                    <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={28} /></Stack>
                ) : (
                    <Stack spacing={2}>
                        <div>
                            <Typography variant="subtitle2" fontWeight="bold">Qué órdenes</Typography>
                            {preview.statuses.map((s) => (
                                <FormControlLabel
                                    key={s.id}
                                    sx={{ display: 'flex' }}
                                    control={<Checkbox checked={statusIds.includes(s.id)} onChange={() => setStatusIds((l) => toggle(l, s.id))} disabled={s.count === 0} />}
                                    label={`${s.description} (${s.count})`}
                                />
                            ))}
                            <Typography variant="caption" color="text.secondary">Las que ya están "En ruta" no se pasan: van en la calle.</Typography>
                        </div>
                        <div>
                            <Typography variant="subtitle2" fontWeight="bold">A qué agencias</Typography>
                            {preview.targets.length === 0 && (
                                <Alert severity="warning" sx={{ borderRadius: 2 }}>Sus ciudades no tienen otra agencia activa.</Alert>
                            )}
                            {preview.targets.map((t) => (
                                <FormControlLabel
                                    key={t.id}
                                    sx={{ display: 'flex' }}
                                    control={<Checkbox checked={targetIds.includes(t.id)} onChange={() => setTargetIds((l) => toggle(l, t.id))} />}
                                    label={t.names}
                                />
                            ))}
                            <Typography variant="caption" color="text.secondary">
                                Cada orden va a otra agencia de su ciudad con el mismo reparto (%, cupo y stock). El stock que ya salió de {agency?.names} vuelve a su almacén y sale del nuevo.
                            </Typography>
                        </div>
                        {canForce && (
                            <FormControlLabel
                                control={<Checkbox checked={force} onChange={(e) => setForce(e.target.checked)} />}
                                label="Pasarlas aunque las otras estén en su máximo"
                            />
                        )}
                    </Stack>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>Cancelar</Button>
                <Button variant="contained" color="warning" onClick={run} disabled={saving || !preview || total === 0 || targetIds.length === 0}>
                    {saving ? 'Pasando...' : `Pasar ${total}`}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
