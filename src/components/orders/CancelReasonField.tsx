// El motivo de cancelación: uno de la lista y el escrito, con la explicación de por qué importa (dueño, 2026-10-29).
import { FC } from "react";
import { Alert, Chip, Stack, Typography } from "@mui/material";
import { TextFieldCustom } from "../custom";
import { CANCEL_CATEGORIES, MIN_CANCEL_REASON } from "./cancelReason";

export const CancelReasonField: FC<{
    value: string;
    onChange: (value: string) => void;
    category: string;
    onCategory: (key: string) => void;
    disabled?: boolean;
}> = ({ value, onChange, category, onCategory, disabled }) => {
    const missing = MIN_CANCEL_REASON - value.trim().length;

    return (
        <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
                Elige el motivo y escríbelo <strong>lo más específico posible</strong>. Por ejemplo: «El cliente dice que lo
                consiguió más barato en otra tienda», no solo «No quiere». Todos los motivos se guardan y los analizamos para
                mejorar nuestra operación y vender más.
            </Alert>
            <Stack spacing={1}>
                <Typography variant="body2" fontWeight={700}>Motivo</Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                    {CANCEL_CATEGORIES.map((c) => (
                        <Chip
                            key={c.key}
                            label={c.label}
                            color={category === c.key ? "error" : "default"}
                            variant={category === c.key ? "filled" : "outlined"}
                            onClick={disabled ? undefined : () => onCategory(c.key)}
                        />
                    ))}
                </Stack>
                {!category && <Typography variant="caption" color="text.secondary">Elige uno.</Typography>}
            </Stack>
            <TextFieldCustom
                label="Explica el motivo"
                placeholder="¿Por qué se cancela esta orden?"
                multiline
                minRows={3}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                inputProps={{ maxLength: 1000 }}
                helperText={missing > 0 ? `Mínimo ${MIN_CANCEL_REASON} caracteres (faltan ${missing}).` : " "}
            />
        </Stack>
    );
};
