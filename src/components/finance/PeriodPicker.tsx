// src/components/finance/PeriodPicker.tsx
// El período de un reporte (Módulo 4 de Fran, §56, §57): hoy, semana actual, mes actual, mes pasado o un rango propio.
import React from "react";
import { Chip, Stack, TextField } from "@mui/material";
import { PRESETS } from "./finance";

export const PeriodPicker: React.FC<{ value: [string, string]; onChange: (v: [string, string]) => void; children?: React.ReactNode }> = ({ value, onChange, children }) => {
    const [from, to] = value;
    return (
        <Stack direction={{ xs: "column", md: "row" }} gap={1.5} alignItems={{ md: "center" }} flexWrap="wrap">
            <Stack direction="row" gap={1} flexWrap="wrap">
                {PRESETS.map((p) => {
                    const [a, b] = p.range();
                    return <Chip key={p.key} label={p.label} onClick={() => onChange([a, b])} variant={a === from && b === to ? "filled" : "outlined"} />;
                })}
            </Stack>
            <Stack direction="row" gap={1.5}>
                <TextField type="date" size="small" label="Desde" value={from} onChange={(e) => onChange([e.target.value, to])} InputLabelProps={{ shrink: true }} />
                <TextField type="date" size="small" label="Hasta" value={to} onChange={(e) => onChange([from, e.target.value])} InputLabelProps={{ shrink: true }} />
            </Stack>
            {children}
        </Stack>
    );
};
