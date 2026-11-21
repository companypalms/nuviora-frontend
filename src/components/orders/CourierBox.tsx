// src/components/orders/CourierBox.tsx
// .112: en una orden por encomienda, lo primero que ve quien la abre (sobre todo la agencia): que es un envío, a qué oficina
// se lleva el paquete y los datos de la guía. Antes estaban al final, tapados por la barra de comentarios, y arriba salía la
// casa del cliente como "Dirección de Envío": la agencia volvía a preguntar.
// .173: el número de guía de MRW o Zoom: lo escribe la vendedora cuando el motorizado deja el paquete en la oficina (también
// con el pedido Entregado); los demás lo ven.
import React, { useState } from "react";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ContentCopyRounded from "@mui/icons-material/ContentCopyRounded";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import { toast } from "react-toastify";
import { COURIER_EDITORS, COURIER_TITLE, CourierInfo, courierGuide, courierGuideText } from "../../lib/courier";
import { request } from "../../common/request";

const buttonSx = { textTransform: "none", fontWeight: 700, borderRadius: 2, minHeight: { xs: 44, sm: 36 } } as const;

type Props = { order: CourierInfo; user?: { role?: { description?: string } | null } | null; onSaved?: (order: unknown) => void };

const when = (at: string) => new Date(at.replace(" ", "T")).toLocaleString("es-VE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** El número de guía: la vendedora lo escribe y lo guarda; los demás lo ven. Vuelve a empezar al abrir otra orden o al guardarlo. */
const GuideField: React.FC<Props> = ({ order, user, onSaved }) => {
    const canEdit = COURIER_EDITORS.includes(user?.role?.description ?? "");
    const [guide, setGuide] = useState(order.courier_guide ?? "");
    const [saving, setSaving] = useState(false);
    const typed = guide.trim().replace(/\s+/g, " ").toUpperCase();

    const save = async () => {
        setSaving(true);
        try {
            const { status, response } = await request(`/orders/${order.id}/courier-guide`, "PUT", { courier_guide: typed || null });
            const data = await response.json().catch(() => null);
            if (status === 200) {
                toast.success(data?.message ?? "Número de guía guardado.");
                onSaved?.(data.order);
            } else {
                toast.error(data?.errors?.courier_guide?.[0] ?? data?.message ?? "No se pudo guardar el número de guía.");
            }
        } catch {
            toast.error("No se logró conectar con el servidor.");
        } finally { setSaving(false); }
    };

    return (
        <Box sx={{ mt: 2, pt: 1.5, borderTop: 1, borderColor: "divider" }}>
            <Typography variant="caption" color="text.secondary" display="block">
                Número de guía{order.courier_company ? ` de ${order.courier_company}` : ""}
            </Typography>
            {canEdit ? (
                <Stack direction={{ xs: "column", sm: "row" }} gap={1} sx={{ mt: 0.5 }}>
                    <TextField size="small" value={guide} onChange={(e) => setGuide(e.target.value)} placeholder="Ej.: 123456789"
                        inputProps={{ maxLength: 40, "aria-label": "Número de guía" }} sx={{ flex: 1, maxWidth: { sm: 280 } }}
                        onKeyDown={(e) => { if (e.key === "Enter" && !saving && typed !== (order.courier_guide ?? "")) save(); }} />
                    <Button onClick={save} disabled={saving || typed === (order.courier_guide ?? "")} variant="outlined" color="inherit" sx={buttonSx}>
                        {order.courier_guide && !typed ? "Borrar la guía" : "Guardar la guía"}
                    </Button>
                </Stack>
            ) : (
                <Typography variant="body1" fontWeight="bold" sx={{ mt: 0.25 }} color={order.courier_guide ? "text.primary" : "text.secondary"}>
                    {order.courier_guide ?? "Todavía no la tiene"}
                </Typography>
            )}
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                {order.courier_guide && order.courier_guide_at
                    ? `Guardada el ${when(order.courier_guide_at)}`
                    : "Se escribe cuando el motorizado deja el paquete en la oficina."}
            </Typography>
        </Box>
    );
};

export const CourierBox: React.FC<Props> = ({ order, user, onSaved }) => {
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
            <GuideField key={`${order.id}|${order.courier_guide ?? ""}`} order={order} user={user} onSaved={onSaved} />
        </Box>
    );
};
