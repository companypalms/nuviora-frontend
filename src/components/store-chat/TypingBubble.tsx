// src/components/store-chat/TypingBubble.tsx
// .160 (dueño, 2026-11-18: "antes de cada respuesta debe haber algo que le diga al cliente que la persona está
// escribiendo"): la burbuja "Tu asesora está escribiendo…" con los tres puntitos, como en WhatsApp. Sin movimiento si el
// usuario pidió menos animaciones.
import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import { Tokens } from "../ui/design";

export const TypingBubble: React.FC<{ t: Tokens }> = ({ t }) => (
    <Box role="status" aria-live="polite" sx={{ width: "fit-content", bgcolor: t.soft, borderRadius: "12px 12px 12px 4px", px: 1.5, py: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
            <Box aria-hidden sx={{ display: "flex", gap: "4px", "@keyframes typingDot": { "0%, 60%, 100%": { opacity: 0.3, transform: "translateY(0)" }, "30%": { opacity: 1, transform: "translateY(-3px)" } } }}>
                {[0, 1, 2].map((i) => (
                    <Box key={i} sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: t.muted, animation: "typingDot 1.2s infinite", animationDelay: `${i * 0.18}s`,
                        "@media (prefers-reduced-motion: reduce)": { animation: "none", opacity: 0.6 } }} />
                ))}
            </Box>
            <Typography sx={{ fontSize: 13, color: t.muted }}>Tu asesora está escribiendo…</Typography>
        </Stack>
    </Box>
);
