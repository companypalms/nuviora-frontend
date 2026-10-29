import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { FC, useState } from "react";
import { ButtonCustom } from "../custom";
import { request } from "../../common/request";
import { IResponse } from "../../interfaces/response-type";
import { toast } from "react-toastify";
import { useOrdersStore } from "../../store/orders/OrdersStore";
import { CancelReasonField } from "./CancelReasonField";
import { isValidCancelReason, MIN_CANCEL_REASON } from "./cancelReason";

interface CancelOrderDialogProps {
    open: boolean;
    onClose: () => void;
    orderId?: number;
    /** La orden ya cancelada (dueño, 2026-10-29: se cancela directo, sin aprobación). */
    onCancelled?: (order: any) => void;
}

export const CancelOrderDialog: FC<CancelOrderDialogProps> = ({
    open,
    onClose,
    orderId,
    onCancelled,
}) => {
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);
    const { updateOrderInColumns } = useOrdersStore();

    const handleCancelOrder = async () => {
        if (!isValidCancelReason(reason) || !orderId) {
            toast.error(`Escribe el motivo de la cancelación (mínimo ${MIN_CANCEL_REASON} caracteres) ❌`);
            return;
        }

        setLoading(true);

        const body = new URLSearchParams();
        body.append("reason", reason.trim());

        try {
            const { status, response }: IResponse = await request(
                `/orders/${orderId}/cancel`,
                "POST",
                body
            );

            if (status >= 200 && status < 300) {
                const data = await response.json();

                // Actualizamos estado global de la orden
                if (data.order) updateOrderInColumns(data.order);

                if (onCancelled) onCancelled(data.order);

                toast.success("Orden cancelada ✅");
                setReason("");
                onClose();
            } else {
                toast.error((await response.json().catch(() => ({})))?.message || "No se pudo cancelar la orden ❌");
            }
        } catch (e) {
            console.error("Error al cancelar orden", e);
            toast.error("Error en el servidor al cancelar 🚨");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: "flex", justifyContent: "space-between" }}>
                Cancelar orden
                <IconButton onClick={onClose}>
                    <CloseRoundedIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent>
                <CancelReasonField value={reason} onChange={setReason} disabled={loading} />
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <ButtonCustom variant="outlined" onClick={onClose} disabled={loading}>
                    Cerrar
                </ButtonCustom>
                <ButtonCustom
                    variant="contained"
                    color="error"
                    onClick={handleCancelOrder}
                    disabled={loading || !isValidCancelReason(reason)}
                >
                    {loading ? "Cancelando..." : "Confirmar cancelación"}
                </ButtonCustom>
            </DialogActions>
        </Dialog>
    );
};
