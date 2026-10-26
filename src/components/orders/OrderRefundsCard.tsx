import { FC, useCallback, useEffect, useState } from "react";
import { Box, Button, Chip, IconButton, Paper, Stack, Tooltip, Typography } from "@mui/material";
import ReceiptLongRounded from "@mui/icons-material/ReceiptLongRounded";
import { toast } from "react-toastify";
import { request } from "../../common/request";
import { fmtMoney } from "../../lib/money";
import { RefundDialog } from "./RefundDialog";
import { REFUND_METHODS } from "../../common/refunds";

type Refund = {
    id: number;
    amount_usd: number;
    method: string | null;
    refunded_at: string;
    notes: string | null;
    has_receipt: boolean;
    user_name: string | null;
};

type Props = {
    order: { id: number; name: string; status?: { description?: string } };
    canRegister: boolean;
    onChange: () => void;
};

/** Reembolsos de la orden (devoluciones, tarea 3b). */
export const OrderRefundsCard: FC<Props> = ({ order, canRegister, onChange }) => {
    const [refunds, setRefunds] = useState<Refund[]>([]);
    const [refunded, setRefunded] = useState(0);
    const [refundable, setRefundable] = useState(0);
    const [methods, setMethods] = useState<string[]>(REFUND_METHODS);
    const [open, setOpen] = useState(false);

    const load = useCallback(async () => {
        const { ok, response } = await request(`/orders/${order.id}/refunds`, 'GET');
        if (!ok) return;
        const json = await response.json();
        setRefunds(json.data.refunds ?? []);
        setRefunded(Number(json.data.refunded_usd ?? 0));
        setRefundable(Number(json.data.refundable_usd ?? 0));
        if (json.data.methods?.length) setMethods(json.data.methods);
    }, [order.id]);

    useEffect(() => { load(); }, [load]);

    const download = async (r: Refund) => {
        const { ok, response } = await request(`/orders/${order.id}/refunds/${r.id}/receipt`, 'GET');
        if (!ok) {
            toast.error('No se pudo abrir el comprobante');
            return;
        }
        const url = URL.createObjectURL(await response.blob());
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    };

    const delivered = order.status?.description === 'Entregado';
    if (refunds.length === 0 && !(canRegister && delivered)) return null;

    return (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: 'background.paper', mb: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} spacing={1}>
                <Box>
                    <Typography variant="h6" fontWeight="bold">Devoluciones</Typography>
                    <Typography variant="caption" color="text.secondary">Reembolsos al cliente. El producto se queda con él.</Typography>
                </Box>
                {refunded > 0 && <Chip color="warning" label={`Reembolsado ${fmtMoney(refunded, 'USD')}`} sx={{ fontWeight: 'bold' }} />}
            </Stack>

            {refunds.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Sin reembolsos.</Typography>
            ) : (
                <Stack spacing={1}>
                    {refunds.map((r) => (
                        <Stack key={r.id} direction="row" spacing={1} alignItems="center" sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="body2" fontWeight="bold">
                                    {fmtMoney(r.amount_usd, 'USD')}{r.method ? ` · ${r.method}` : ''}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    {r.refunded_at}{r.user_name ? ` · registró ${r.user_name}` : ''}
                                </Typography>
                                {r.notes && <Typography variant="caption" display="block">{r.notes}</Typography>}
                            </Box>
                            {r.has_receipt && (
                                <Tooltip title="Ver comprobante">
                                    <IconButton size="small" onClick={() => download(r)}><ReceiptLongRounded fontSize="small" /></IconButton>
                                </Tooltip>
                            )}
                        </Stack>
                    ))}
                </Stack>
            )}

            {canRegister && delivered && refundable > 0 && (
                <Button variant="outlined" color="warning" size="small" sx={{ mt: 2 }} onClick={() => setOpen(true)}>
                    Registrar devolución
                </Button>
            )}

            <RefundDialog
                open={open}
                onClose={() => setOpen(false)}
                orderId={order.id}
                orderName={order.name}
                refundable={refundable}
                methods={methods}
                onSaved={() => { load(); onChange(); }}
            />
        </Paper>
    );
};
