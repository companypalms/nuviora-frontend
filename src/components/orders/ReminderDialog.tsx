import React, { FC, useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography
} from "@mui/material";
import { ButtonCustom } from "../custom";

interface ReminderDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (date: string) => Promise<void>;
}

export const ReminderDialog: FC<ReminderDialogProps> = ({ open, onClose, onSave }) => {
    const [date, setDate] = useState(new Date().toISOString().slice(0, 16));

    const handleSave = async () => {
        if (!date) return;
        await onSave(date);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Establecer Recordatorio</DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        Selecciona la fecha y hora para llamar al cliente.
                    </Typography>
                    <TextField
                        type="datetime-local"
                        fullWidth
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        InputLabelProps={{
                            shrink: true,
                        }}
                    />
                </Box>
            </DialogContent>
            <DialogActions >
                <ButtonCustom variant={'outlined'} onClick={onClose}>Cancelar</ButtonCustom>
                <ButtonCustom variant={'contained'} onClick={handleSave}>Guardar</ButtonCustom>
            </DialogActions>
        </Dialog>
    );
};
