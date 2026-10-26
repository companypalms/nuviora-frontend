// src/components/finance/StatusNotes.tsx
// El estado del reporte (Módulo 4 de Fran, §20): PROVISIONAL o CONSOLIDADO, con el porqué, y los avisos que explican
// de dónde salen las cifras (costo provisional, productos sin costo, delivery de antes del Módulo 3…).
import React from "react";
import { Alert, Chip, Stack, Typography } from "@mui/material";
import { PnlReport } from "./finance";

export const StatusChip: React.FC<{ status: PnlReport["status"] }> = ({ status }) => (
    <Chip size="small" color={status.label === "PROVISIONAL" ? "warning" : "success"} label={status.label} variant="outlined" sx={{ fontWeight: 700 }} />
);

export const StatusNotes: React.FC<{ report: PnlReport }> = ({ report }) => (
    <Stack spacing={1}>
        {report.status.reasons.length > 0 && (
            <Alert severity="warning" variant="outlined">
                <Typography variant="body2" fontWeight={600}>Provisional: puede cambiar.</Typography>
                {report.status.reasons.map((r) => <Typography key={r} variant="body2">· {r}</Typography>)}
            </Alert>
        )}
        {report.warnings.length > 0 && (
            <Alert severity="info" variant="outlined">
                {report.warnings.map((w) => <Typography key={w} variant="body2">· {w}</Typography>)}
            </Alert>
        )}
    </Stack>
);
