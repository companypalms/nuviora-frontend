import { FC, useEffect, useMemo, useState } from "react";
import {
    Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem,
    Stack, Switch, TextField, Tooltip, Typography
} from "@mui/material";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import { toast } from "react-toastify";
import { AgencyRouting, RoutingAgency, RoutingCity } from "../../interfaces/agencyRouting.types";
import { routingApi } from "./agencyApi";

type Row = { agency_id: number; weight: string; is_active: boolean };

type Props = {
    open: boolean;
    city: RoutingCity | null;
    agencies: RoutingAgency[];
    onClose: () => void;
    onSaved: (data: AgencyRouting) => void;
};

/**
 * Qué agencias entregan en una ciudad y con qué % (Fran §11-14). Todas las activas sin % = reparto
 * parejo; con %, deben sumar 100. Una agencia inactiva no recibe órdenes nuevas en esta ciudad.
 */
export const CityAgenciesDialog: FC<Props> = ({ open, city, agencies, onClose, onSaved }) => {
    const [rows, setRows] = useState<Row[]>([]);
    const [adding, setAdding] = useState<number | ''>('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open && city) {
            setRows(city.agencies.map((a) => ({ agency_id: a.id, weight: a.weight === null ? '' : String(a.weight), is_active: a.is_active })));
            setAdding('');
        }
    }, [open, city]);

    const names = useMemo(() => Object.fromEntries(agencies.map((a) => [a.id, a.names])), [agencies]);
    const active = rows.filter((r) => r.is_active);
    const withWeight = active.filter((r) => r.weight.trim() !== '');
    const sum = withWeight.reduce((s, r) => s + Number(r.weight || 0), 0);
    const hint = active.length === 0
        ? 'Sin agencias activas: la ciudad no recibe órdenes por reparto.'
        : withWeight.length === 0
            ? `Sin %: reparto parejo, ${Math.round(100 / active.length)} % cada una.`
            : withWeight.length !== active.length
                ? 'Pon el % de todas las activas, o de ninguna.'
                : Math.abs(sum - 100) > 0.01
                    ? `Los % suman ${sum}; deben sumar 100.`
                    : 'Suman 100 %.';
    const valid = withWeight.length === 0 || (withWeight.length === active.length && Math.abs(sum - 100) <= 0.01);

    const update = (i: number, patch: Partial<Row>) => setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));

    const save = async () => {
        if (!city) return;
        setSaving(true);
        const res = await routingApi(`/cities/${city.id}`, 'PUT', {
            agencies: rows.map((r) => ({ agency_id: r.agency_id, weight: r.weight.trim() === '' ? null : Number(r.weight), is_active: r.is_active })),
        });
        setSaving(false);
        if (res.ok) {
            toast.success(res.message || 'Guardado');
            onSaved(res.data);
            onClose();
        } else {
            toast.error(res.message);
        }
    };

    const available = agencies.filter((a) => !rows.some((r) => r.agency_id === a.id));

    return (
        <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
            <DialogTitle>Agencias de {city?.name}</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Cada orden de la ciudad se reparte entre las agencias activas que tienen stock y cupo, intercalando según su %.
                </Typography>
                <Stack spacing={1.5}>
                    {rows.map((r, i) => (
                        <Stack key={r.agency_id} direction="row" spacing={1} alignItems="center">
                            <Typography sx={{ flex: 1, minWidth: 0, opacity: r.is_active ? 1 : 0.5 }} noWrap fontWeight={600}>
                                {names[r.agency_id] ?? `Agencia ${r.agency_id}`}
                            </Typography>
                            <TextField
                                size="small"
                                label="%"
                                type="number"
                                value={r.weight}
                                onChange={(e) => update(i, { weight: e.target.value })}
                                disabled={!r.is_active}
                                sx={{ width: 90 }}
                                inputProps={{ min: 0, max: 100, step: 1 }}
                            />
                            <Tooltip title={r.is_active ? 'Activa' : 'Inactiva: no recibe órdenes nuevas'}>
                                <Switch checked={r.is_active} onChange={(e) => update(i, { is_active: e.target.checked })} />
                            </Tooltip>
                            <IconButton size="small" onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}>
                                <DeleteOutlineRounded fontSize="small" />
                            </IconButton>
                        </Stack>
                    ))}
                    {rows.length === 0 && <Typography variant="body2" color="text.secondary">Todavía no tiene agencias.</Typography>}

                    <Stack direction="row" spacing={1} alignItems="center">
                        <TextField select size="small" label="Agregar agencia" value={adding} onChange={(e) => setAdding(Number(e.target.value))} sx={{ flex: 1 }}>
                            {available.map((a) => <MenuItem key={a.id} value={a.id}>{a.names}</MenuItem>)}
                            {available.length === 0 && <MenuItem disabled value="">No quedan agencias</MenuItem>}
                        </TextField>
                        <Button
                            variant="outlined"
                            disabled={adding === ''}
                            onClick={() => { setRows((prev) => [...prev, { agency_id: Number(adding), weight: '', is_active: true }]); setAdding(''); }}
                        >
                            Agregar
                        </Button>
                    </Stack>
                </Stack>
                <Box sx={{ mt: 2 }}>
                    <Alert severity={valid ? 'info' : 'warning'} sx={{ borderRadius: 2 }}>{hint}</Alert>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>Cancelar</Button>
                <Button variant="contained" onClick={save} disabled={saving || !valid}>{saving ? 'Guardando...' : 'Guardar'}</Button>
            </DialogActions>
        </Dialog>
    );
};
