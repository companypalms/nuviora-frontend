// El cuadro del motivo de cancelación, con la explicación de por qué importa (dueño, 2026-10-29).
import { FC } from "react";
import { Alert, Stack } from "@mui/material";
import { TextFieldCustom } from "../custom";
import { MIN_CANCEL_REASON } from "./cancelReason";

export const CancelReasonField: FC<{ value: string; onChange: (value: string) => void; disabled?: boolean }> = ({ value, onChange, disabled }) => {
    const missing = MIN_CANCEL_REASON - value.trim().length;

    return (
        <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
                Escribe el motivo <strong>lo más específico posible</strong>. Por ejemplo: «El cliente dice que lo consiguió
                más barato en otra tienda», no solo «No quiere». Todos los motivos se guardan y los analizamos para mejorar
                nuestra operación y vender más.
            </Alert>
            <TextFieldCustom
                label="Motivo de la cancelación"
                placeholder="¿Por qué se cancela esta orden?"
                multiline
                minRows={3}
                autoFocus
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                inputProps={{ maxLength: 1000 }}
                helperText={missing > 0 ? `Mínimo ${MIN_CANCEL_REASON} caracteres (faltan ${missing}).` : " "}
            />
        </Stack>
    );
};
