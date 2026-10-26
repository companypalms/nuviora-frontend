import {
    Box,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import React, { FC, useState } from "react";
import { ButtonCustom, TextFieldCustom } from "../custom";
import { request } from "../../common/request";
import { IResponse } from "../../interfaces/response-type";
import { toast } from "react-toastify";
import { useOrdersStore } from "../../store/orders/OrdersStore";

interface CancelOrderDialogProps {
    open: boolean;
    onClose: () => void;
    orderId?: number;
    onCancelled?: (cancellation: any) => void;
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
        if (!reason.trim() || !orderId) {
            toast.error("Debes ingresar un motivo de cancelación ❌");
            return;
        }

        setLoading(true);

        const body = new URLSearchParams();
        body.append("reason", reason);

        try {
            const { status, response }: IResponse = await request(
                `/orders/${orderId}/cancel`,
                "POST",
                body
            );

            if (status >= 200 && status < 300) {
                const data = await response.json();

                // Actualizamos estado global de la orden
                updateOrderInColumns({
                    ...data.order,
                    status: { description: "Pendiente Cancelación" },
                });

                if (onCancelled) onCancelled(data.cancellation);

                toast.success("Cancelación solicitada correctamente ✅");
                setReason("");
                onClose();
            } else {
                toast.error((await response.json().catch(() => ({})))?.message || "No se pudo solicitar la cancelación ❌");
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
                <TextFieldCustom
                    label="Motivo de cancelación"
                    placeholder="Escribe aquí el motivo..."
                    multiline
                    minRows={3}
                    fullWidth
                    value={reason}
                    onChange={(e: any) => setReason(e.target.value)}
                    disabled={loading}
                />
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <ButtonCustom variant="outlined" onClick={onClose} disabled={loading}>
                    Cerrar
                </ButtonCustom>
                <ButtonCustom
                    variant="contained"
                    color="error"
                    onClick={handleCancelOrder}
                    disabled={loading}
                >
                    {loading ? "Enviando..." : "Confirmar cancelación"}
                </ButtonCustom>
            </DialogActions>
        </Dialog>
    );
};
