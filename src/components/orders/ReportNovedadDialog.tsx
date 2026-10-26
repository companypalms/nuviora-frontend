import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, MenuItem } from "@mui/material";

interface ReportNovedadDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (data: { type: string, description: string }) => void;
}

export const ReportNovedadDialog: React.FC<ReportNovedadDialogProps> = ({
    open,
    onClose,
    onConfirm
}) => {
    const [type, setType] = useState("");
    const [description, setDescription] = useState("");

    const handleConfirm = () => {
        if (!type || !description) return;
        onConfirm({ type, description });
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Reportar Novedad</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                <TextField
                    select
                    label="Tipo de novedad"
                    fullWidth
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    required
                >
                    <MenuItem value="No atendió">No atendió</MenuItem>
                    <MenuItem value="Cambió ubicación">Cambió ubicación</MenuItem>
                    <MenuItem value="Cambió método de pago">Cambió método de pago</MenuItem>
                    <MenuItem value="Otro">Otro</MenuItem>
                </TextField>
                <TextField
                    label="Descripción de la novedad"
                    multiline
                    rows={3}
                    fullWidth
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button
                    variant="contained"
                    color="warning"
                    onClick={handleConfirm}
                    disabled={!type || !description}
                >
                    Reportar
                </Button>
            </DialogActions>
        </Dialog>
    );
};
