// src/components/ui/ConfirmDialog.tsx
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";
import React from "react";

export const ConfirmDialog = ({
    open, title, message, onClose, onConfirm
}: {
    open: boolean;
    title: string;
    message: string;
    onClose: () => void;
    onConfirm: () => void;
}) => (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>{message}</DialogContent>
        <DialogActions>
            <Button onClick={onClose}>Cancelar</Button>
            <Button color="error" variant="contained" onClick={onConfirm}>Eliminar</Button>
        </DialogActions>
    </Dialog>
);
