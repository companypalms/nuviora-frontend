// src/components/meta-ads/productProfile.tsx
// .64: la ficha del producto en el encargo del editor. Lo básico del producto (qué es, para qué sirve, lo que NO es; y
// al abrirlo, cómo funciona y la información clave) y el buyer persona de su encargo. .90 (dueño: "cada editor debe poder
// saber de qué trata cada buyer persona, de qué trata cada ángulo, cuál es el mecanismo de acción del producto"): al
// abrirla, también todos los buyer personas, todos los ángulos y las fotos del producto. Sin precios ni aprendizajes.
import React, { useState } from "react";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { OpenInNewRounded } from "@mui/icons-material";
import type { StoredFile } from "./fileUpload";

export type ProductInfo = Partial<Record<"what_it_is" | "benefits" | "mechanism" | "not_this" | "key_info" | "photos_url", string>>;
export type PersonaInfo = Partial<Record<"name" | "who" | "pain" | "wants" | "objections", string>>;
/** .90: un ángulo como lo ve el editor: de qué trata y a quién le habla. */
export type AngleInfo = { code: string; name: string | null; persona: string | null; about: string | null };

const PERSONA_LABELS: [keyof PersonaInfo, string][] = [["who", "Quién es"], ["pain", "Qué le duele"], ["wants", "Qué quiere"], ["objections", "Qué lo frena"]];

const Line: React.FC<{ label: string; text?: string }> = ({ label, text }) => (text
    ? <Typography variant="body2" sx={{ overflowWrap: "anywhere", whiteSpace: "pre-line" }}><b>{label}:</b> {text}</Typography> : null);

/** .65: en qué va el testeo de un producto (o cómo terminó), como lo arma TestingPhase::summary. */
export type TestingSummary = {
    phase: "testing" | "iterate"; phase_label: string; round: number; text: string; can_next: boolean; level: "info" | "warning" | "success";
    slots: { angle: string; name: string | null; persona: string | null; code: string | null; label: string }[];
};

/** El testeo de un producto: la frase, cada batch de la ronda con lo que lleva y "Probar los siguientes" si ningún ángulo ganó. */
export const TestingBox: React.FC<{ testing?: TestingSummary | null; onNext?: () => void; busy?: boolean }> = ({ testing, onNext, busy }) => (testing ? (
    <Alert severity={testing.level} sx={{ mt: 1, "& .MuiAlert-message": { width: "100%" } }}
        action={testing.can_next && onNext ? <Button size="small" color="inherit" disabled={busy} onClick={onNext} sx={{ textTransform: "none" }}>Probar los siguientes</Button> : undefined}>
        <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>{testing.text}</Typography>
        {testing.phase === "testing" && testing.slots.length > 0 && (
            <Box component="ol" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
                {testing.slots.map((s, i) => (
                    <Typography key={i} component="li" variant="caption" sx={{ overflowWrap: "anywhere" }}>
                        <b>{s.angle}</b>{s.name ? ` · ${s.name}` : ""}: {s.label}
                    </Typography>
                ))}
            </Box>
        )}
    </Alert>
) : null);

/** El buyer persona del encargo: a quién le habla el video. */
export const PersonaBox: React.FC<{ persona?: PersonaInfo | null }> = ({ persona }) => (persona?.name ? (
    <Box sx={{ mt: 1, p: 1.25, borderRadius: 2, borderLeft: "4px solid", borderColor: "primary.main", bgcolor: "action.hover" }}>
        <Typography variant="caption" fontWeight={700} color="primary.main" component="div">A quién le hablas: {persona.name}</Typography>
        {PERSONA_LABELS.map(([k, label]) => <Line key={k} label={label} text={persona[k]} />)}
    </Box>
) : null);

const Sub: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Typography variant="caption" fontWeight={700} color="text.secondary" component="div" sx={{ mt: 1.25 }}>{children}</Typography>
);

/**
 * Lo del producto: qué es, para qué sirve y lo que NO es siempre a la vista; al abrirlo, cómo funciona, la información
 * clave y (.90) todos sus buyer personas y ángulos, con los de este encargo marcados, y las fotos del producto.
 */
export const ProductBox: React.FC<{
    product: string; info?: ProductInfo | null; personas?: PersonaInfo[]; angles?: AngleInfo[]; photos?: StoredFile[]; persona?: string | null; angle?: string | null;
}> = ({ product, info, personas = [], angles = [], photos = [], persona, angle }) => {
    const [open, setOpen] = useState(false);
    if (!info) return null;
    const more = !!(info.mechanism || info.key_info || personas.length || angles.length || photos.length);
    const mark = { borderLeft: "3px solid", borderColor: "primary.main", pl: 1 } as const;
    return (
        <Box sx={{ mt: 1, p: 1.25, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" component="div">Sobre el producto: {product}</Typography>
            <Line label="Qué es" text={info.what_it_is} />
            <Line label="Para qué sirve" text={info.benefits} />
            {open && <Line label="Cómo funciona" text={info.mechanism} />}
            {open && <Line label="Información clave" text={info.key_info} />}
            {open && personas.length > 0 && (
                <>
                    <Sub>Los buyer personas</Sub>
                    <Stack spacing={0.75}>
                        {personas.map((p) => (
                            <Box key={p.name} sx={p.name === persona ? mark : { pl: 1 }}>
                                <Typography variant="body2" fontWeight={700}>{p.name}{p.name === persona ? " · el de este encargo" : ""}</Typography>
                                {PERSONA_LABELS.map(([k, label]) => <Line key={k} label={label} text={p[k]} />)}
                            </Box>
                        ))}
                    </Stack>
                </>
            )}
            {open && angles.length > 0 && (
                <>
                    <Sub>Los ángulos</Sub>
                    <Stack spacing={0.75}>
                        {angles.map((a) => (
                            <Box key={a.code} sx={a.code === angle ? mark : { pl: 1 }}>
                                <Typography variant="body2" fontWeight={700}>{a.code}{a.name ? ` · ${a.name}` : ""}{a.code === angle ? " · el de este encargo" : ""}</Typography>
                                <Line label="A quién le habla" text={a.persona ?? undefined} />
                                <Line label="De qué trata" text={a.about ?? undefined} />
                            </Box>
                        ))}
                    </Stack>
                </>
            )}
            {open && photos.length > 0 && (
                <>
                    <Sub>Fotos del producto</Sub>
                    <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
                        {photos.map((f) => f.url && (
                            <Box key={f.id} component="a" href={f.download_url ?? f.url} title={`Bajar ${f.name}`}>
                                <Box component="img" src={f.url} alt={f.name} loading="lazy" sx={{ width: 96, height: 96, objectFit: "cover", borderRadius: 1.5, display: "block" }} />
                            </Box>
                        ))}
                    </Stack>
                </>
            )}
            {info.not_this && (
                <Alert severity="error" variant="outlined" sx={{ mt: 0.75, py: 0, "& .MuiAlert-message": { overflowWrap: "anywhere", whiteSpace: "pre-line" } }}>
                    <b>Lo que NO es (nunca lo digas):</b> {info.not_this}
                </Alert>
            )}
            {(more || info.photos_url) && (
                <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
                    {more && <Button size="small" onClick={() => setOpen((o) => !o)} sx={{ textTransform: "none" }}>{open ? "Ver menos" : "Ver la ficha completa"}</Button>}
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
