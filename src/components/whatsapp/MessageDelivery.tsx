import { FC } from "react";
import { Box, Tooltip, Typography, alpha } from "@mui/material";
import { ErrorRounded } from "@mui/icons-material";
import { DeliveryInfo, failureColor, isUndelivered, undeliveredText } from "../../common/whatsappDelivery";

/** Las marcas junto a la hora, como en WhatsApp: ✓ enviado, ✓✓ entregado, ✓✓ azul leído y ⚠ no entregado. */
export const DeliveryTicks: FC<{ message: DeliveryInfo; dark?: boolean; readColor?: string }> = ({ message, dark = false, readColor = "#3b82f6" }) => {
    if (isUndelivered(message)) {
        return (
            <Tooltip title={undeliveredText(message)}>
                <ErrorRounded aria-label="No entregado" sx={{ fontSize: 14, ml: 0.5, color: failureColor(dark) }} />
            </Tooltip>
        );
    }
    const mark = message.status === "read" || message.status === "delivered" ? "✓✓" : message.status === "sent" ? "✓" : "⌚";
    return <Box component="span" sx={{ ml: 0.5, color: message.status === "read" ? readColor : "inherit" }}>{mark}</Box>;
};

/** Dentro de la burbuja: que no le llegó al cliente y por qué. */
export const DeliveryFailure: FC<{ message: DeliveryInfo; dark?: boolean }> = ({ message, dark = false }) =>
    isUndelivered(message) ? (
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "flex-start", mt: 0.75, pt: 0.75, borderTop: "1px solid", borderColor: alpha(failureColor(dark), 0.35) }}>
            <ErrorRounded sx={{ fontSize: 16, mt: "1px", flexShrink: 0, color: failureColor(dark) }} />
            <Typography variant="caption" sx={{ color: failureColor(dark), fontWeight: 600, lineHeight: 1.35 }}>
                {undeliveredText(message)}
            </Typography>
        </Box>
    ) : null;
