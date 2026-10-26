import {
    Box, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, TextField, MenuItem, Select, FormControl, InputLabel, Typography
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import React, { FC, useState } from "react";
import { ButtonCustom } from "../custom";
import { toast } from "react-toastify";

interface Props {
    open: boolean;
    onClose: () => void;
    onSubmit: (type: string, description: string) => void;
}

export const NoveltyDialog: FC<Props> = ({ open, onClose, onSubmit }) => {
    const [type, setType] = useState("");
    const [description, setDescription] = useState("");

    const types = [
        "Cambio de ubicacion",
        "Rechazado",
        "Cambio de metodo de pago",
        "Cliente no atendio",
        "Otro"
    ];

    const handleSubmit = () => {
        if (!type) {
            toast.error("Por favor selecciona un tipo de novedad");
            return;
        }
        if (type === "Otro" && !description) {
            toast.error("Por favor describe el motivo");
            return;
        }
        onSubmit(type, description);
        setType("");
        setDescription("");
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                Registrar Novedad
                <IconButton onClick={onClose}><CloseRoundedIcon /></IconButton>
            </DialogTitle>

            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                    Selecciona el tipo de novedad y añade una descripción si es necesario.
                </Typography>

                <FormControl fullWidth>
                    <InputLabel id="novelty-type-label">Tipo de Novedad</InputLabel>
                    <Select
                        labelId="novelty-type-label"
                        value={type}
                        label="Tipo de Novedad"
                        onChange={(e) => setType(e.target.value)}
                    >
                        {types.map((t) => (
                            <MenuItem key={t} value={t}>{t}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {(type === "Otro" || type !== "") && (
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Descripción / Motivo"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={type === "Otro" ? "Escribe el motivo aquí..." : "Opcional: Detalles adicionales..."}
                    />
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <ButtonCustom onClick={onClose} variant="outlined">
                    Cancelar
                </ButtonCustom>
                <ButtonCustom onClick={handleSubmit} variant="contained" color="primary">
                    Guardar Novedad
                </ButtonCustom>
            </DialogActions>
        </Dialog>
    );
};
