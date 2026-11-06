// src/components/orders/CourierBox.tsx
// .112: en una orden por encomienda, lo primero que ve quien la abre (sobre todo la agencia): que es un envío, a qué oficina
// se lleva el paquete y los datos de la guía. Antes estaban al final, tapados por la barra de comentarios, y arriba salía la
// casa del cliente como "Dirección de Envío": la agencia volvía a preguntar.
import React from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ContentCopyRounded from "@mui/icons-material/ContentCopyRounded";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import { toast } from "react-toastify";
import { COURIER_TITLE, CourierInfo, courierGuide, courierGuideText } from "../../lib/courier";

const buttonSx = { textTransform: "none", fontWeight: 700, borderRadius: 2, minHeight: { xs: 44, sm: 36 } } as const;

export const CourierBox: React.FC<{ order: CourierInfo }> = ({ order }) => {
    if (!order.courier_shipment) return null;
    const guide = courierGuide(order);
    const copy = () => {
        navigator.clipboard.writeText(courierGuideText(order));
        toast.info("📋 Datos para la guía copiados");
    };

    return (
        <Box sx={{ p: 2, borderRadius: 3, border: 2, borderColor: "warning.main", bgcolor: (t) => alpha(t.palette.warning.main, 0.08) }}>
            <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.5 }}>
                <LocalShippingIcon sx={{ color: "warning.main" }} />
                <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.25 }}>{COURIER_TITLE}</Typography>
            </Stack>

            <Typography variant="caption" color="text.secondary" display="block">Llevar el paquete a la oficina</Typography>
            {order.location ? (
                <Button href={order.location} target="_blank" rel="noopener noreferrer" variant="outlined" color="inherit"
                    endIcon={<OpenInNewRounded />} sx={{ ...buttonSx, mt: 0.5, mb: 1.5 }}>
                    Abrir la oficina en Google Maps
                </Button>
            ) : (
                <Typography variant="body2" color="error" fontWeight="bold" sx={{ mb: 1.5 }}>Falta el link de la oficina</Typography>
            )}

            <Typography variant="caption" color="text.secondary" display="block">Datos para la guía (quien recibe)</Typography>
            <Box component="dl" sx={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 2, rowGap: 0.5, m: 0, mt: 0.5 }}>
                {guide.map(([label, value]) => (
                    <React.Fragment key={label}>
                        <Typography component="dt" variant="body2" color="text.secondary" sx={{ alignSelf: "center" }}>{label}</Typography>
                        <Typography component="dd" variant="body1" fontWeight="bold" color={value ? "text.primary" : "error"} sx={{ m: 0, wordBreak: "break-word" }}>
                            {value ?? "Falta"}
                        </Typography>
                    </React.Fragment>
                ))}
            </Box>
            <Button onClick={copy} startIcon={<ContentCopyRounded />} variant="contained" disableElevation
                sx={{ ...buttonSx, mt: 1.5, bgcolor: "text.primary", color: "background.paper", "&:hover": { bgcolor: "text.secondary" } }}>
                Copiar datos para la guía
            </Button>
        </Box>
    );
};
