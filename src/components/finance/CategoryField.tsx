// src/components/finance/CategoryField.tsx
// La categoría de un gasto (§24, §25), con la opción de crear una nueva sin salir del formulario.
import React, { useState } from "react";
import { Button, MenuItem, Stack, TextField } from "@mui/material";
import { toast } from "react-toastify";
import { FinanceOptions, api, errorMessage } from "./finance";

type Props = { value: string; onChange: (id: string) => void; options: FinanceOptions; onCreated: (c: { id: number; name: string; is_active: boolean }) => void };

export const CategoryField: React.FC<Props> = ({ value, onChange, options, onCreated }) => {
    const [creating, setCreating] = useState(false);
    const [name, setName] = useState("");
    const [saving, setSaving] = useState(false);

    const create = async () => {
        setSaving(true);
        try {
            const res = await api<{ message: string; category: { id: number; name: string; is_active: boolean } }>("/finance/expense-categories", "POST", { name });
            onCreated(res.category);
            onChange(String(res.category.id));
            toast.success(res.message);
            setCreating(false);
            setName("");
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };

    if (creating) {
        return (
            <Stack direction="row" gap={1} alignItems="center">
                <TextField label="Nueva categoría" value={name} onChange={(e) => setName(e.target.value)} fullWidth autoFocus inputProps={{ maxLength: 80 }} />
                <Button variant="contained" onClick={create} disabled={saving || name.trim() === ""}>Crear</Button>
                <Button color="inherit" onClick={() => setCreating(false)}>Cancelar</Button>
            </Stack>
        );
    }
    return (
        <Stack direction="row" gap={1} alignItems="center">
            <TextField select label="Categoría" value={value} onChange={(e) => onChange(e.target.value)} required fullWidth>
                {options.categories.filter((c) => c.is_active || String(c.id) === value).map((c) => <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>)}
            </TextField>
            <Button onClick={() => setCreating(true)} sx={{ whiteSpace: "nowrap" }}>Nueva</Button>
        </Stack>
    );
};
