import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Divider } from "@mui/material";
import { fmtMoney } from "../../lib/money";
import { CASH_METHODS, paymentKind } from "../../lib/changeRules";

interface MarkDeliveredDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (data: any) => void;
    order: any;
    binanceRate: number;
}

export const MarkDeliveredDialog: React.FC<MarkDeliveredDialogProps> = ({
    open,
    onClose,
    onConfirm,
    order,
    binanceRate
}) => {
    if (!order) return null;

    // Sumamos el efectivo REAL registrado en los pagos
    const cashReceived = order.payments?.filter((p: any) => CASH_METHODS.includes(p.method))
        .reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0;

    const totalPaid = order.payments?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0;
    const totalUSD = Number(order.current_total_price || 0);

    // El vuelto se calcula sobre el total pagado vs el total de la orden
    const changeAmount = Math.max(0, totalPaid - totalUSD);
    const hasChange = changeAmount > 0.01;

    // Tomamos los valores que YA están registrados en la orden. Si el cliente pagó todo digital, la agencia no
    // da vuelto: lo devuelve la empresa (Fran, 2026-10-03)
    const allDigital = paymentKind(order.payments) === "digital";
    const changeCoveredBy = allDigital ? "company" : (order.change_covered_by || "agency");
    const changeAmountCompany = order.change_amount_company || 0;
    const changeAmountAgency = order.change_amount_agency || 0;

    const handleConfirm = () => {
        // Enviamos exactamente lo que ya está en la orden para que el backend valide correctamente
        onConfirm({
            cash_received: cashReceived,
            change_covered_by: changeCoveredBy,
            change_amount_company: changeAmountCompany,
            change_amount_agency: changeAmountAgency,
        });
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>Resumen de Entrega</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>

                <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 3, border: '1px dashed', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">Total Orden:</Typography>
                        <Typography variant="body2" fontWeight="bold">{fmtMoney(totalUSD, 'USD')}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">Total Pagado:</Typography>
                        <Typography variant="body2" fontWeight="bold" color="success.main">
                            {fmtMoney(totalPaid, 'USD')}
                        </Typography>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Efectivo Recibido:</Typography>
                        <Typography variant="body2" fontWeight="bold" color="primary">{fmtMoney(cashReceived, 'USD')}</Typography>
                    </Box>
                </Box>

                {hasChange ? (
                    <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 2, color: 'warning.contrastText' }}>
                        <Typography variant="subtitle2" align="center" fontWeight="bold">
                            VUELTO REGISTRADO: {fmtMoney(changeAmount, 'USD')}
                        </Typography>
                        <Typography variant="body2" align="center">
                            Será cubierto por: <b>{changeCoveredBy === 'company' ? 'La Empresa (Nuviora)' : (changeCoveredBy === 'agency' ? 'La Agencia' : 'Parcial')}</b>
                        </Typography>
                    </Box>
                ) : (
                    <Typography variant="body2" align="center" color="success.main" fontWeight="bold">
                        ✅ Pago exacto. Sin vuelto pendiente.
                    </Typography>
                )}

                <Typography variant="body2" align="center" sx={{ mt: 1, opacity: 0.8 }}>
                    ¿Deseas completar la entrega con esta información?
                </Typography>

            </DialogContent>
            <DialogActions sx={{ p: 2, pt: 0, justifyContent: 'center', gap: 2 }}>
                <Button onClick={onClose} color="inherit">Cancelar</Button>
                <Button
                    variant="contained"
                    color="success"
                    onClick={handleConfirm}
                    sx={{ px: 4, fontWeight: 'bold' }}
                >
                    Sí, Confirmar Entrega
                </Button>
            </DialogActions>
        </Dialog>
    );
};
