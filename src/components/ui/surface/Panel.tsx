// src/components/ui/surface/Panel.tsx
// La tarjeta base del rediseño: fondo del tema, esquinas de 12 px y el borde con brillo (glow.ts). PanelHeader es su
// encabezado: título, un ícono, un número y las acciones a la derecha.
import React, { FC, ReactNode } from "react";
import { Box, Paper, PaperProps, Stack, Typography } from "@mui/material";
import { glowBorder } from "./glow";

export const Panel: FC<PaperProps> = ({ sx, children, ...rest }) => (
    <Paper
        elevation={0}
        sx={[
            (theme) => ({ borderRadius: 3, p: 2, ...glowBorder(theme) }),
            ...(Array.isArray(sx) ? sx : [sx]),
        ]}
        {...rest}
    >
        {children}
    </Paper>
);

export const PanelHeader: FC<{ title: ReactNode; subtitle?: ReactNode; icon?: ReactNode; action?: ReactNode }> = ({ title, subtitle, icon, action }) => (
    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} sx={{ mb: 1.5, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" gap={1} sx={{ minWidth: 0 }}>
            {icon && <Box sx={{ display: "flex", color: "text.secondary" }}>{icon}</Box>}
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" component="h2" noWrap>{title}</Typography>
                {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
            </Box>
        </Stack>
        {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
    </Stack>
);
