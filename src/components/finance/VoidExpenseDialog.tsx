// src/components/finance/VoidExpenseDialog.tsx
// Anular un gasto (Módulo 4 de Fran, §83): no se borra; deja de contar y queda a la vista con el motivo.
import React, { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from "@mui/material";
import { toast } from "react-toastify";
import { Expense, api, errorMessage, money } from "./finance";

export const VoidExpenseDialog: React.FC<{ expense: Expense | null; onClose: () => void; onDone: () => void }> = ({ expense, onClose, onDone }) => {
    const [reason, setReason] = useState("");
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        if (!expense) return;
        setSaving(true);
        try {
            const res = await api<{ message: string }>(`/finance/expenses/${expense.id}/void`, "POST", { reason });
            toast.success(res.message);
            setReason("");
            onDone();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };

    return (
        <Dialog open={expense !== null} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Anular gasto</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ mb: 2 }}>
                    {expense?.concept} ({money(expense?.amount_usd)}) deja de contar en los reportes, pero no se borra: queda en la lista de anulados con el motivo.
                </DialogContentText>
                <TextField label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} fullWidth required autoFocus inputProps={{ maxLength: 500 }} />
            </DialogContent>
            <DialogActions>
                <Button color="inherit" onClick={onClose}>Cancelar</Button>
                <Button color="error" variant="contained" onClick={submit} disabled={saving || reason.trim() === ""}>Anular</Button>
            </DialogActions>
        </Dialog>
    );
};
