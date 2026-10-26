// src/components/ui/nav/MenuSection.tsx
// Una sección del menú lateral (Ventas, Inventario, Dinero…), que se abre y se cierra con su título.
import { FC, ReactNode, useId } from "react";
import { Box, ButtonBase, Collapse, Typography } from "@mui/material";
import { ExpandMoreRounded } from "@mui/icons-material";

interface Props {
    title: string;
    count: number;
    open: boolean;
    /** Sin onToggle la sección no se pliega (la principal, o cuando hay pocas opciones). */
    onToggle?: () => void;
    /** Hay una opción de esta sección abierta en pantalla: se marca aunque esté plegada. */
    current?: boolean;
    children: ReactNode;
}

export const MenuSection: FC<Props> = ({ title, count, open, onToggle, current, children }) => {
    const listId = useId();
    return (
        <Box component="nav" aria-label={title} sx={{ width: "100%" }}>
            {onToggle ? (
                <ButtonBase
                    onClick={onToggle}
                    aria-expanded={open}
                    aria-controls={listId}
                    sx={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 0.75,
                        px: 1.25,
                        py: 0.75,
                        borderRadius: 2,
                        color: "text.secondary",
                        "&:hover": { bgcolor: "action.hover", color: "text.primary" },
                        "&.Mui-focusVisible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: -2 },
                    }}
                >
                    <Typography variant="caption" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: 0.6, flex: 1, textAlign: "left" }}>
                        {title}
                    </Typography>
                    {current && !open && (
                        <Box component="span" aria-label="Aquí estás" sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "primary.main" }} />
                    )}
                    <Typography variant="caption" color="text.disabled">{count}</Typography>
                    <ExpandMoreRounded fontSize="small" sx={{ transition: "transform 0.2s", transform: open ? "rotate(0deg)" : "rotate(-90deg)" }} />
                </ButtonBase>
            ) : (
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", px: 1.25, py: 0.75, textTransform: "uppercase", letterSpacing: 0.6 }}>
                    {title}
                </Typography>
            )}
            <Collapse in={open} id={listId} unmountOnExit>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, pb: 0.5 }}>{children}</Box>
            </Collapse>
        </Box>
    );
};
