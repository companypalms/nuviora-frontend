// src/components/agency-closures/ClosureReminder.tsx
// El aviso del cierre semanal para la agencia (Módulo 3, §22): desde el día configurado (por defecto, el miércoles por la
// mañana) y hasta que sube el archivo de la semana anterior. El texto es el del documento.
import React, { useEffect, useState } from "react";
import { Alert, AlertTitle, Button, SxProps, Theme } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { MyClosuresResponse, api } from "./closures";

export const ClosureReminder: React.FC<{ reminder?: MyClosuresResponse["reminder"]; showLink?: boolean; sx?: SxProps<Theme> }> = ({ reminder: given, showLink = true, sx }) => {
    const [reminder, setReminder] = useState<MyClosuresResponse["reminder"]>(given ?? null);
    useEffect(() => {
        if (given !== undefined) { setReminder(given); return; }
        api<MyClosuresResponse>("/my-closures").then((r) => setReminder(r.reminder)).catch(() => undefined);
    }, [given]);
    if (!reminder) return null;

    return (
        <Alert severity="warning" sx={sx}
            action={showLink ? <Button color="inherit" size="small" component={RouterLink} to="/cierres" sx={{ whiteSpace: "nowrap" }}>Subir archivo</Button> : undefined}>
            <AlertTitle>{reminder.title}</AlertTitle>
            {reminder.text}
            {reminder.weeks.length > 1 && ` (semanas ${reminder.weeks.join(", ")})`}
        </Alert>
    );
};
