import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from "@mui/material";

interface ResolveNovedadDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (resolution: string) => void;
}

export const ResolveNovedadDialog: React.FC<ResolveNovedadDialogProps> = ({
    open,
    onClose,
    onConfirm
}) => {
    const [resolution, setResolution] = useState("");

    const handleConfirm = () => {
        if (!resolution) return;
        onConfirm(resolution);
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Resolver Novedad</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                <TextField
                    label="Cómo se resolvió la novedad?"
                    multiline
                    rows={3}
                    fullWidth
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    required
                    helperText="Este campo es obligatorio para marcar como solucionada."
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleConfirm}
                    disabled={!resolution}
                >
                    Guardar Solución
                </Button>
            </DialogActions>
        </Dialog>
    );
};
