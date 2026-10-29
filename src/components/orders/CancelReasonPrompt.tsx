// Pide el motivo cuando una orden se pasa a "Cancelado" desde cualquier pantalla (Kanban, ficha, vista simple):
// sendOrderStatus (common/orderStatus.ts) llama a askCancelReason antes de enviar el cambio. Se monta una sola vez, en App.
import { FC, useEffect, useState } from "react";
import { Dialog, DialogActions, DialogContent, DialogTitle, IconButton } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { ButtonCustom } from "../custom";
import { CancelReasonField } from "./CancelReasonField";
import { isValidCancelReason, useCancelReasonPrompt } from "./cancelReason";

export const CancelReasonPrompt: FC = () => {
    const { open, resolve } = useCancelReasonPrompt();
    const [reason, setReason] = useState("");

    useEffect(() => {
        if (open) setReason("");
    }, [open]);

    const finish = (value: string | null) => {
        useCancelReasonPrompt.setState({ open: false, resolve: null });
        resolve?.(value);
    };

    return (
        <Dialog open={open} onClose={() => finish(null)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                Cancelar orden
                <IconButton onClick={() => finish(null)}>
                    <CloseRoundedIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent>
                <CancelReasonField value={reason} onChange={setReason} />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <ButtonCustom variant="outlined" onClick={() => finish(null)}>
                    Volver
                </ButtonCustom>
                <ButtonCustom variant="contained" color="error" disabled={!isValidCancelReason(reason)} onClick={() => finish(reason.trim())}>
                    Confirmar cancelación
                </ButtonCustom>
            </DialogActions>
        </Dialog>
    );
};
