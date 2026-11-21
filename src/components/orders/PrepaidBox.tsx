// src/components/orders/PrepaidBox.tsx
// .168 (dueño, 2026-11-21): el pedido que pagó por adelantado en el formulario de la tienda (pago móvil con la foto del
// comprobante). Arriba de todo, para que nadie le cobre otra vez al entregar, y cómo va su pago: lo que hizo el sistema
// (validarlo y avisarle por WhatsApp) y lo que le toca a la vendedora.
import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";

export interface PrepaidInfo {
    at: string;
    state: "validating" | "validated" | "confirmed" | "seller" | "review" | string;
    confirm_sent_at?: string | null;
}

const STATE_TEXT: Record<string, { text: string; warn?: boolean }> = {
    validating: { text: "Revisando el comprobante." },
    validated: { text: "Pago validado. En unos minutos le llega al cliente el WhatsApp de \"ya confirmamos tu pago\"." },
    confirmed: { text: "Pago validado y confirmado al cliente por WhatsApp." },
    seller: { text: "Escríbele al cliente que ya confirmamos su pago: no se le pudo avisar solo (revisa el historial del pedido).", warn: true },
    review: { text: "El comprobante tiene un problema: revísalo antes de confirmarle el pago al cliente.", warn: true },
};

export const PrepaidBox: React.FC<{ prepaid: PrepaidInfo }> = ({ prepaid }) => {
    const s = STATE_TEXT[prepaid.state] ?? STATE_TEXT.validating;
    return (
        <Box role="status" sx={{ p: 2, borderRadius: 3, border: 2, borderColor: "success.main", bgcolor: (t) => alpha(t.palette.success.main, 0.08) }}>
            <Stack direction="row" alignItems="center" gap={1}>
                <CheckCircleRounded sx={{ color: "success.main" }} />
                <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.25 }}>YA PAGÓ POR ADELANTADO (pago móvil): NO COBRAR</Typography>
            </Stack>
            <Typography variant="body2" sx={{ mt: 1, fontWeight: s.warn ? 700 : 400, color: s.warn ? "warning.dark" : "text.primary" }}>{s.text}</Typography>
        </Box>
    );
};
