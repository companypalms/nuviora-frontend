// src/components/finance/MoneyFields.tsx
// Monto, moneda y tasa de un gasto (Módulo 4 de Fran, §31 a §33 y R2): en bolívares la tasa la escribe el Admin en cada
// gasto, como bolívares por dólar; USD y USDT valen 1 a 1. Debajo se ve el equivalente en USD que se va a guardar.
import React from "react";
import { InputAdornment, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { CURRENCY_LABEL, Currency, money, toUsd } from "./finance";

export type MoneyValue = { amount: string; currency: Currency; rate: string };

export const MoneyFields: React.FC<{ value: MoneyValue; onChange: (v: MoneyValue) => void; currencies: Currency[]; label?: string; noun?: string }> = ({
    value, onChange, currencies, label = "Monto", noun = "gasto",
}) => {
    const usd = toUsd(value.amount, value.currency, value.rate);
    return (
        <div>
            <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
                <TextField label={label} value={value.amount} onChange={(e) => onChange({ ...value, amount: e.target.value })} required fullWidth
                    inputProps={{ inputMode: "decimal" }} />
                <TextField select label="Moneda" value={value.currency} onChange={(e) => onChange({ ...value, currency: e.target.value as Currency })} sx={{ minWidth: 170 }}>
                    {currencies.map((c) => <MenuItem key={c} value={c}>{CURRENCY_LABEL[c]}</MenuItem>)}
                </TextField>
                {value.currency === "VES" && (
                    <TextField label="Tasa" value={value.rate} onChange={(e) => onChange({ ...value, rate: e.target.value })} required sx={{ minWidth: 150 }}
                        InputProps={{ endAdornment: <InputAdornment position="end">Bs/$</InputAdornment> }} inputProps={{ inputMode: "decimal" }} />
                )}
            </Stack>
            <Typography variant="caption" color="text.secondary">
                {value.currency === "VES"
                    ? `La tasa de este ${noun}, la que usaste al pagarlo. Equivale a ${usd === null ? "—" : money(usd)}.`
                    : value.currency === "USDT" ? "1 USDT = 1 USD." : "Se guarda en dólares."}
            </Typography>
        </div>
    );
};
