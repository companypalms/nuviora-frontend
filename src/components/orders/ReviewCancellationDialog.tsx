import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import React, { FC, useState } from "react";
import { ButtonCustom } from "../custom";

export const ReviewCancellationDialog: FC<{
    open: boolean;
    onClose: () => void;
    title: string; // "Aprobar cancelación" o "Rechazar cancelación"
    confirmText: string; // "Aprobar" / "Rechazar"
    onConfirm: (note: string) => void;
    loading?: boolean;
}> = ({ open, onClose, title, confirmText, onConfirm, loading }) => {
    const [note, setNote] = useState("");
    const handleConfirm = () => onConfirm(note);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: "flex", justifyContent: "space-between" }}>
                {title}
                <IconButton onClick={onClose}><CloseRoundedIcon /></IconButton>
            </DialogTitle>
            <DialogContent>
                <TextField
                    label="Nota (opcional)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    fullWidth
                    multiline
                    minRows={3}
                    placeholder="Agrega un comentario para el solicitante…"
                />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <ButtonCustom variant="outlined" onClick={onClose} disabled={loading}>Cancelar</ButtonCustom>
                <ButtonCustom variant="contained" color={confirmText === "Rechazar" ? "error" : "primary"} onClick={handleConfirm} disabled={loading}>
                    {confirmText}
                </ButtonCustom>
            </DialogActions>
        </Dialog>
    );
};