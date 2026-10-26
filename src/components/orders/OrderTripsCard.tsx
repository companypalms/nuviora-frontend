import { FC, useCallback, useEffect, useState } from "react";
import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import { toast } from "react-toastify";
import { request } from "../../common/request";
import { fmtMoney } from "../../lib/money";
import { AgencyTrip, tripResultColor } from "../../common/agencyTrips";

type Props = {
    orderId: number;
    /** Solo el administrador anula carreras. */
    canVoid: boolean;
};

/**
 * Carreras de la agencia en esta orden (tarea 5): cada intento de entrega se paga, también los que
 * terminan en novedad y las re-entregas. Una anulada queda a la vista pero ya no se paga.
 */
export const OrderTripsCard: FC<Props> = ({ orderId, canVoid }) => {
    const [trips, setTrips] = useState<AgencyTrip[]>([]);
    const [total, setTotal] = useState(0);
    const [loaded, setLoaded] = useState(false);

    const load = useCallback(async () => {
        const { ok, response } = await request(`/orders/${orderId}/trips`, 'GET');
        if (ok) {
            const json = await response.json();
            setTrips(json.data.trips ?? []);
            setTotal(Number(json.data.total_usd ?? 0));
        }
        setLoaded(true);
    }, [orderId]);

    useEffect(() => { load(); }, [load]);

    const voidTrip = async (t: AgencyTrip) => {
        const reason = window.prompt(`¿Por qué se anula la carrera del ${t.trip_date}? Ya no se le pagará a la agencia.`);
        if (reason === null) return;
        if (reason.trim().length < 3) {
            toast.error('Escribe el motivo');
            return;
        }
        const { ok, response } = await request(`/agency-trips/${t.id}/void`, 'POST', { reason: reason.trim() });
        const json = await response.json().catch(() => ({}));
        if (ok && json.status) {
            toast.success('Carrera anulada');
            load();
        } else {
            toast.error(json.message || 'No se pudo anular');
        }
    };

    if (!loaded || trips.length === 0) return null;
    const paid = trips.filter((t) => !t.voided_at).length;

    return (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: 'background.paper', mb: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} spacing={1}>
                <Box>
                    <Typography variant="h6" fontWeight="bold">Carreras de la agencia</Typography>
                    <Typography variant="caption" color="text.secondary">Se paga cada intento de entrega.</Typography>
                </Box>
                <Chip color="primary" variant="outlined" label={`${paid} · ${fmtMoney(total, 'USD')}`} sx={{ fontWeight: 'bold' }} />
            </Stack>
            <Stack spacing={1}>
                {trips.map((t) => (
                    <Stack key={t.id} direction="row" spacing={1} alignItems="center"
                        sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover', opacity: t.voided_at ? 0.6 : 1 }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontWeight="bold" sx={{ textDecoration: t.voided_at ? 'line-through' : 'none' }}>
                                {t.type_label} · {fmtMoney(t.price_usd, 'USD')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                                {t.trip_date} · {t.agency_name}{t.deliverer_name ? ` · ${t.deliverer_name}` : ''}
                            </Typography>
                            {t.voided_at && (
                                <Typography variant="caption" color="error.main" display="block">
                                    Anulada{t.voided_by ? ` por ${t.voided_by}` : ''}: {t.void_reason}
                                </Typography>
                            )}
                        </Box>
                        {!t.voided_at && <Chip size="small" color={tripResultColor(t.result)} label={t.result_label} />}
                        {canVoid && !t.voided_at && (
                            <Button size="small" color="error" onClick={() => voidTrip(t)}>Anular</Button>
                        )}
                    </Stack>
                ))}
            </Stack>
        </Paper>
    );
};
