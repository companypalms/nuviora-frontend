import React, { FC, useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Typography,
    CircularProgress,
    Box
} from "@mui/material";
import { ButtonCustom } from "../custom";

interface ReviewDeliveryDialogProps {
    open: boolean;
    onClose: () => void;
    title: string;
    confirmText: string;
    onConfirm: (note: string) => Promise<void>;
    loading: boolean;
}

export const ReviewDeliveryDialog: FC<ReviewDeliveryDialogProps> = ({
    open,
    onClose,
    title,
    confirmText,
    onConfirm,
    loading
}) => {
    const [note, setNote] = useState("");

    const handleConfirm = async () => {
        await onConfirm(note);
        setNote(""); // reset
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        Añade una nota opcional para el registro de esta acción.
                    </Typography>
                    <TextField
                        label="Nota / Observación"
                        multiline
                        rows={3}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        fullWidth
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading} color="inherit">
                    Cancelar
                </Button>
                <ButtonCustom onClick={handleConfirm} disabled={loading} color="primary" variant="contained">
                    {loading ? <CircularProgress size={20} color="inherit" /> : confirmText}
                </ButtonCustom>
            </DialogActions>
        </Dialog>
    );
};
