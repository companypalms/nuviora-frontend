// src/components/assistant/ActionsHistoryDialog.tsx
// "Lo que hizo el asistente" (Etapa 4, paso 5): todas las tarjetas de cambios, de la más nueva a la más vieja, con cómo
// terminaron (hecho, cancelado, vencido, no se pudo). Es permanente: "Limpiar chat" no lo borra.
import React, { FC, useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import { ActionCardView } from "./ActionCardView";
import { ActionCard, fetchActions } from "./assistant";

export const ActionsHistoryDialog: FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
    const [actions, setActions] = useState<ActionCard[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fullScreen = useMediaQuery(useTheme().breakpoints.down("sm"));

    useEffect(() => {
        if (!open) return;
        let alive = true;
        setActions(null);
        setError(null);
        fetchActions().then((r) => { if (alive) setActions(r.actions); }).catch((e) => { if (alive) setError(e.message); });
        return () => { alive = false; };
    }, [open]);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreen}>
            <DialogTitle>Lo que hizo el asistente</DialogTitle>
            <DialogContent dividers>
                {!actions && !error && <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress size={24} /></Box>}
                {error && <Alert severity="error">{error}</Alert>}
                {actions && actions.length === 0 && (
                    <Typography color="text.secondary">Todavía no te propuso ningún cambio. Cuando le pidas uno (anotar un gasto, cambiar la tasa…), queda aquí.</Typography>
                )}
                <Stack spacing={1.5}>
                    {actions?.map((a) => <ActionCardView key={a.id} card={a} readOnly />)}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cerrar</Button>
            </DialogActions>
        </Dialog>
    );
};
