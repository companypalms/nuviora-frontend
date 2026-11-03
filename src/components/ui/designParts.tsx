// src/components/ui/designParts.tsx
// Las piezas visuales del sistema de diseño nuevo (los colores y estilos, en design.ts): el punto de color (siempre con
// palabra al lado), el enlace que es un botón, la sección con su título, el marcador de 3 números y los pasos numerados.
import React from "react";
import { Box, ButtonBase, Stack, Tooltip, Typography } from "@mui/material";
import { useTokens } from "./design";

export const Dot: React.FC<{ color: string; size?: number }> = ({ color, size = 10 }) => (
    <Box component="span" aria-hidden sx={{ width: size, height: size, borderRadius: "50%", bgcolor: color, display: "inline-block", flex: "none" }} />
);

/** Un enlace de texto que es un botón ("¿Por qué?", "Volver a analizar"). */
export const TextAction: React.FC<React.ComponentProps<typeof ButtonBase>> = ({ sx, ...props }) => {
    const t = useTokens();
    return <ButtonBase {...props} sx={{ font: "inherit", color: t.ink, textDecoration: "underline", textUnderlineOffset: 3, borderRadius: 1, verticalAlign: "baseline",
        "&.Mui-disabled": { color: t.faint, textDecoration: "none" }, "&.Mui-focusVisible": { outline: `2px solid ${t.ink}`, outlineOffset: 2 }, ...sx }} />;
};

export const Section: React.FC<{ icon?: React.ReactNode; dot?: string; name: string; hint?: string; children: React.ReactNode; mt?: number; id?: string }> = ({ icon, dot, name, hint, children, mt = 3, id }) => {
    const t = useTokens();
    return (
        <Box component="section" id={id} sx={{ mt }}>
            <Stack direction="row" columnGap={1} rowGap={0} alignItems="center" flexWrap="wrap" sx={{ mb: 0.75 }}>
                {dot ? <Dot color={dot} /> : icon ? <Box sx={{ display: "flex", color: t.muted, "& svg": { fontSize: 18 } }}>{icon}</Box> : null}
                <Typography component="h2" sx={{ fontSize: 15, fontWeight: 600, whiteSpace: "nowrap" }}>{name}</Typography>
                {hint && <Typography sx={{ fontSize: 13, color: t.muted }}>{hint}</Typography>}
            </Stack>
            {children}
        </Box>
    );
};

/** El marcador: hasta 3 números, todos de verdad; cada uno explica qué es al pasar el mouse (o con el foco). */
export const Scoreboard: React.FC<{ tiles: { label: React.ReactNode; value: React.ReactNode; help: string; color?: string }[] }> = ({ tiles }) => {
    const t = useTokens();
    return (
        <Box sx={{ display: "grid", gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))`, gap: 1, mt: 2 }}>
            {tiles.map((x, i) => (
                <Tooltip key={i} title={x.help}>
                    <Box tabIndex={0} sx={{ bgcolor: t.soft, borderRadius: "8px", p: "10px 12px", minWidth: 0, "&:focus-visible": { outline: `2px solid ${t.ink}` } }}>
                        <Typography sx={{ fontSize: 12, color: t.muted }}>{x.label}</Typography>
                        <Typography component="div" sx={{ fontSize: { xs: 15, sm: 18 }, fontWeight: 600, mt: 0.25, lineHeight: 1.3, color: x.color ?? t.ink }}>{x.value}</Typography>
                    </Box>
                </Tooltip>
            ))}
        </Box>
    );
};

/** Pasos numerados, en el orden en que se hacen. */
export const NumberedSteps: React.FC<{ steps: React.ReactNode[]; size?: number; label?: string }> = ({ steps, size = 15, label = "Pasos" }) => {
    const t = useTokens();
    return (
        <Box component="ol" aria-label={label} sx={{ listStyle: "none", p: 0, m: 0, mt: 1.25 }}>
            {steps.map((s, i) => (
                <Box component="li" key={i} sx={{ display: "flex", gap: 1.25, alignItems: "flex-start", py: 0.5 }}>
                    <Box aria-hidden sx={{ flex: "none", width: 22, height: 22, borderRadius: "50%", bgcolor: t.soft, color: t.muted, fontSize: 12, fontWeight: 600,
                        display: "flex", alignItems: "center", justifyContent: "center", mt: "1px" }}>{i + 1}</Box>
                    <Typography component="div" sx={{ fontSize: size, lineHeight: 1.45, overflowWrap: "anywhere" }}>{s}</Typography>
                </Box>
            ))}
        </Box>
    );
};
