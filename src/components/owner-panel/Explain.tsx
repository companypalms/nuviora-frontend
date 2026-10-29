// src/components/owner-panel/Explain.tsx
// La explicación de un número del panel del dueño al pasar el cursor (en el celular, al tocarlo). El texto viene del
// backend, del mismo lugar donde se calcula el número (Metrics\Rules), para que nunca digan cosas distintas.
import React, { FC, ReactElement, ReactNode } from "react";
import { Box, Tooltip, Typography } from "@mui/material";

export const Explain: FC<{
    title: string;
    help: string;
    detail?: string | null;
    extra?: ReactNode;
    children: ReactElement;
}> = ({ title, help, detail, extra, children }) => (
    <Tooltip
        arrow
        placement="top"
        enterDelay={150}
        enterTouchDelay={0}
        leaveTouchDelay={8000}
        slotProps={{
            tooltip: {
                sx: {
                    maxWidth: 340, p: 1.5, bgcolor: "background.paper", color: "text.primary", boxShadow: 8,
                    border: "1px solid", borderColor: "divider", borderRadius: 2,
                },
            },
            arrow: { sx: { color: "background.paper", "&::before": { border: "1px solid", borderColor: "divider" } } },
        }}
        title={
            <Box>
                <Typography variant="subtitle2" fontWeight={800} gutterBottom>{title}</Typography>
                <Typography variant="body2">{help}</Typography>
                {detail && (
                    <Typography variant="body2" sx={{ mt: 1, fontWeight: 700, color: "primary.main" }}>= {detail}</Typography>
                )}
                {extra && <Box sx={{ mt: 1 }}>{extra}</Box>}
            </Box>
        }
    >
        {children}
    </Tooltip>
);
