// src/components/orders/CourierGuidePhoto.tsx
// .173 (dueño, 2026-11-21): la guía de una encomienda es una foto. La toma la agencia que lleva el paquete a la oficina de MRW
// o Zoom (en la logística propia, la operadora; la vendedora también puede). Sin ella el pedido no pasa a Entregado. En el
// teléfono, el botón abre la cámara directo.
import React, { useRef, useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import PhotoCameraRounded from "@mui/icons-material/PhotoCameraRounded";
import { toast } from "react-toastify";
import { request } from "../../common/request";

/** Lo que responde el servidor al guardarla (se mezcla con la orden abierta). */
export interface GuideSaved { id: number; courier_guide_at: string; courier_guide_photo_url: string | null }

type Props = {
    orderId: number;
    photoUrl?: string | null;
    at?: string | null;
    canUpload: boolean;
    onSaved?: (saved: GuideSaved) => void;
    /** La fila de la Torre de control: solo los botones */
    compact?: boolean;
};

const when = (at: string) => new Date(at.replace(" ", "T")).toLocaleString("es-VE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const buttonSx = { textTransform: "none", fontWeight: 700, borderRadius: 2, minHeight: { xs: 44, sm: 36 } } as const;

export const CourierGuidePhoto: React.FC<Props> = ({ orderId, photoUrl, at, canUpload, onSaved, compact }) => {
    const input = useRef<HTMLInputElement>(null);
    const [saving, setSaving] = useState(false);

    const upload = async (file: File) => {
        setSaving(true);
        try {
            const body = new FormData();
            body.append("photo", file);
            const { status, response } = await request(`/orders/${orderId}/courier-guide`, "POST", body);
            const data = await response.json().catch(() => null);
            if (status === 200) {
                toast.success(data?.message ?? "Foto de la guía guardada.");
                onSaved?.(data.order);
            } else {
                toast.error(data?.errors?.photo?.[0] ?? data?.message ?? "No se pudo subir la foto de la guía.");
            }
        } catch {
            toast.error("No se logró conectar con el servidor.");
        } finally {
            setSaving(false);
            if (input.current) input.current.value = "";
        }
    };
    const pick = () => input.current?.click();
    const picker = (
        <input ref={input} type="file" accept="image/*" capture="environment" hidden aria-label="Foto de la guía"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
    );

    if (compact) {
        return (
            <>
                {picker}
                {photoUrl && <Button size="small" color="success" href={photoUrl} target="_blank" rel="noopener noreferrer">✓ Ver la guía</Button>}
                {canUpload && (
                    <Button size="small" variant={photoUrl ? "text" : "contained"} disabled={saving} onClick={pick} startIcon={<PhotoCameraRounded fontSize="small" />}>
                        {saving ? "Subiendo…" : photoUrl ? "Cambiar" : "Foto de la guía"}
                    </Button>
                )}
            </>
        );
    }

    return (
        <Box sx={{ mt: 2, pt: 1.5, borderTop: 1, borderColor: "divider" }}>
            {picker}
            <Typography variant="caption" color="text.secondary" display="block">Foto de la guía</Typography>
            {photoUrl ? (
                <Stack direction="row" gap={1.5} alignItems="center" sx={{ mt: 0.5 }}>
                    <Box component="a" href={photoUrl} target="_blank" rel="noopener noreferrer" aria-label="Ver la foto de la guía en grande"
                        sx={{ width: 72, height: 96, borderRadius: 2, overflow: "hidden", border: 1, borderColor: "divider", flexShrink: 0, display: "block" }}>
                        <Box component="img" src={photoUrl} alt="Foto de la guía" sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </Box>
                    <Box>
                        <Typography variant="body1" fontWeight={800}>✓ Guía lista</Typography>
                        {at && <Typography variant="caption" color="text.secondary" display="block">Subida el {when(at)}</Typography>}
                        {canUpload && (
                            <Button size="small" color="inherit" disabled={saving} onClick={pick} sx={{ ...buttonSx, mt: 0.5, px: 1, ml: -1 }}>
                                {saving ? "Subiendo…" : "Cambiar la foto"}
                            </Button>
                        )}
                    </Box>
                </Stack>
            ) : (
                <>
                    {canUpload ? (
                        <Button onClick={pick} disabled={saving} startIcon={<PhotoCameraRounded />} variant="contained" disableElevation
                            sx={{ ...buttonSx, mt: 0.5, bgcolor: "text.primary", color: "background.paper", "&:hover": { bgcolor: "text.secondary" } }}>
                            {saving ? "Subiendo…" : "Subir la foto de la guía"}
                        </Button>
                    ) : (
                        <Typography variant="body1" fontWeight="bold" color="text.secondary" sx={{ mt: 0.25 }}>Todavía no la tiene</Typography>
                    )}
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
                        La toma la agencia al dejar el paquete en la oficina. Sin esta foto no se puede marcar Entregado.
                    </Typography>
                </>
            )}
        </Box>
    );
};
