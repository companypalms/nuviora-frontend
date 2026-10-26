// src/components/finance/SupplierDialog.tsx
// Crear o editar un proveedor (Módulo 4 de Fran, §10): nombre y activo/inactivo, más contacto, teléfono y notas. Un
// proveedor inactivo no aparece para compras nuevas; sus deudas y compras siguen a la vista.
import React, { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, Switch, TextField } from "@mui/material";
import { toast } from "react-toastify";
import { SupplierRow, api, errorMessage } from "./finance";

type Props = { open: boolean; supplier: SupplierRow | null; onClose: () => void; onSaved: () => void };

export const SupplierDialog: React.FC<Props> = (props) => (props.open ? <SupplierForm key={props.supplier?.id ?? "new"} {...props} /> : null);

const SupplierForm: React.FC<Props> = ({ supplier, onClose, onSaved }) => {
    const [form, setForm] = useState({
        name: supplier?.name ?? "", contact_name: supplier?.contact_name ?? "", phone: supplier?.phone ?? "", notes: supplier?.notes ?? "",
        is_active: supplier?.is_active ?? true,
    });
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        try {
            const body = { ...form, name: form.name.trim() };
            const res = await api<{ message: string }>(supplier ? `/finance/suppliers/${supplier.id}` : "/finance/suppliers", supplier ? "PUT" : "POST", body);
            toast.success(res.message);
            onSaved();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>{supplier ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    <TextField label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus inputProps={{ maxLength: 255 }} />
                    <TextField label="Contacto (opcional)" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} inputProps={{ maxLength: 255 }} />
                    <TextField label="Teléfono (opcional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputProps={{ maxLength: 50 }} />
                    <TextField label="Notas (opcional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} multiline minRows={2} />
                    {supplier && (
                        <FormControlLabel control={<Switch checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />}
                            label={form.is_active ? "Activo" : "Inactivo: no aparece para compras nuevas"} />
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button color="inherit" onClick={onClose}>Cancelar</Button>
                <Button variant="contained" onClick={save} disabled={saving || form.name.trim() === ""}>{supplier ? "Guardar" : "Crear"}</Button>
            </DialogActions>
        </Dialog>
    );
};
