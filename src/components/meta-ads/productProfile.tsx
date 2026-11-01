// src/components/meta-ads/productProfile.tsx
// .64: la ficha del producto en el encargo del editor. Lo básico del producto (qué es, para qué sirve, lo que NO es; y
// al abrirlo, cómo funciona y la información clave) y SOLO el buyer persona de su encargo: nunca la lista completa.
import React, { useState } from "react";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { OpenInNewRounded } from "@mui/icons-material";

export type ProductInfo = Partial<Record<"what_it_is" | "benefits" | "mechanism" | "not_this" | "key_info" | "photos_url", string>>;
export type PersonaInfo = Partial<Record<"name" | "who" | "pain" | "wants" | "objections", string>>;

const PERSONA_LABELS: [keyof PersonaInfo, string][] = [["who", "Quién es"], ["pain", "Qué le duele"], ["wants", "Qué quiere"], ["objections", "Qué lo frena"]];

const Line: React.FC<{ label: string; text?: string }> = ({ label, text }) => (text
    ? <Typography variant="body2" sx={{ overflowWrap: "anywhere", whiteSpace: "pre-line" }}><b>{label}:</b> {text}</Typography> : null);

/** El buyer persona del encargo: a quién le habla el video. */
export const PersonaBox: React.FC<{ persona?: PersonaInfo | null }> = ({ persona }) => (persona?.name ? (
    <Box sx={{ mt: 1, p: 1.25, borderRadius: 2, borderLeft: "4px solid", borderColor: "primary.main", bgcolor: "action.hover" }}>
        <Typography variant="caption" fontWeight={700} color="primary.main" component="div">A quién le hablas: {persona.name}</Typography>
        {PERSONA_LABELS.map(([k, label]) => <Line key={k} label={label} text={persona[k]} />)}
    </Box>
) : null);

/** Lo del producto: qué es, para qué sirve y lo que NO es siempre a la vista; lo demás al abrirlo. */
export const ProductBox: React.FC<{ product: string; info?: ProductInfo | null }> = ({ product, info }) => {
    const [open, setOpen] = useState(false);
    if (!info) return null;
    const more = !!(info.mechanism || info.key_info);
    return (
        <Box sx={{ mt: 1, p: 1.25, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" component="div">Sobre el producto: {product}</Typography>
            <Line label="Qué es" text={info.what_it_is} />
            <Line label="Para qué sirve" text={info.benefits} />
            {open && <Line label="Cómo funciona" text={info.mechanism} />}
            {open && <Line label="Información clave" text={info.key_info} />}
            {info.not_this && (
                <Alert severity="error" variant="outlined" sx={{ mt: 0.75, py: 0, "& .MuiAlert-message": { overflowWrap: "anywhere", whiteSpace: "pre-line" } }}>
                    <b>Lo que NO es (nunca lo digas):</b> {info.not_this}
                </Alert>
            )}
            {(more || info.photos_url) && (
                <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
                    {more && <Button size="small" onClick={() => setOpen((o) => !o)} sx={{ textTransform: "none" }}>{open ? "Ver menos" : "Cómo funciona y más"}</Button>}
                    {info.photos_url && (
                        <Button size="small" component="a" href={info.photos_url} target="_blank" rel="noopener noreferrer" endIcon={<OpenInNewRounded fontSize="small" />} sx={{ textTransform: "none" }}>
                            Ver las fotos
                        </Button>
                    )}
                </Stack>
            )}
        </Box>
    );
};
