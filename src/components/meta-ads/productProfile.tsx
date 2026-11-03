// src/components/meta-ads/productProfile.tsx
// .64: la ficha del producto en el encargo del editor. Lo básico del producto (qué es, para qué sirve, lo que NO es; y
// al abrirlo, cómo funciona y la información clave) y el buyer persona de su encargo. .90 (dueño: "cada editor debe poder
// saber de qué trata cada buyer persona, de qué trata cada ángulo, cuál es el mecanismo de acción del producto"): al
// abrirla, también todos los buyer personas, todos los ángulos y las fotos del producto. Sin precios ni aprendizajes.
import React, { useState } from "react";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { OpenInNewRounded } from "@mui/icons-material";
import type { StoredFile } from "./fileUpload";
import { useTokens } from "../ui/design";
import { TextAction } from "../ui/designParts";

export type ProductInfo = Partial<Record<"what_it_is" | "benefits" | "mechanism" | "not_this" | "key_info" | "photos_url", string>>;
export type PersonaInfo = Partial<Record<"name" | "who" | "pain" | "wants" | "objections", string>>;
/** .90: un ángulo como lo ve el editor: de qué trata y a quién le habla. */
export type AngleInfo = { code: string; name: string | null; persona: string | null; about: string | null };

const PERSONA_LABELS: [keyof PersonaInfo, string][] = [["who", "Quién es"], ["pain", "Qué le duele"], ["wants", "Qué quiere"], ["objections", "Qué lo frena"]];

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

const InkLine: React.FC<{ label: string; text?: string | null }> = ({ label, text }) => (text
    ? <Typography sx={{ fontSize: 14, lineHeight: 1.5, overflowWrap: "anywhere", whiteSpace: "pre-line" }}><b style={{ fontWeight: 600 }}>{label}:</b> {text}</Typography> : null);

/** El buyer persona del encargo: a quién le habla el video. .91: con el diseño nuevo (tinta y grises). */
export const PersonaBox: React.FC<{ persona?: PersonaInfo | null }> = ({ persona }) => {
    const t = useTokens();
    return persona?.name ? (
        <Box sx={{ mt: 1.5, p: "10px 12px", borderRadius: "8px", bgcolor: t.soft }}>
            <Typography sx={{ fontSize: 13, color: t.muted }}>A quién le hablas</Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 600, mb: 0.25 }}>{persona.name}</Typography>
            {PERSONA_LABELS.map(([k, label]) => <InkLine key={k} label={label} text={persona[k]} />)}
        </Box>
    ) : null;
};

/**
 * Lo del producto: qué es, para qué sirve y lo que NO es siempre a la vista; al abrirlo, cómo funciona, la información
 * clave y (.90) todos sus buyer personas y ángulos, con los de este encargo marcados, y las fotos del producto.
 * .91: con el diseño nuevo; "lo que NO es" es la única señal (rojo, con palabra).
 */
export const ProductBox: React.FC<{
    product: string; info?: ProductInfo | null; personas?: PersonaInfo[]; angles?: AngleInfo[]; photos?: StoredFile[]; persona?: string | null; angle?: string | null;
}> = ({ product, info, personas = [], angles = [], photos = [], persona, angle }) => {
    const t = useTokens();
    const [open, setOpen] = useState(false);
    if (!info) return null;
    const more = !!(info.mechanism || info.key_info || personas.length || angles.length || photos.length);
    const sub = (text: string) => <Typography component="h4" sx={{ fontSize: 13, color: t.muted, mt: 1.5, mb: 0.5 }}>{text}</Typography>;
    const mine = { borderLeft: `3px solid ${t.ink}`, pl: 1.25 } as const;
    return (
        <Box sx={{ mt: 1.5, p: "12px 14px", borderRadius: "10px", border: `1px solid ${t.line}` }}>
            <Typography sx={{ fontSize: 13, color: t.muted }}>El producto</Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 600, mb: 0.25 }}>{product}</Typography>
            <InkLine label="Qué es" text={info.what_it_is} />
            <InkLine label="Para qué sirve" text={info.benefits} />
            {info.not_this && (
                <Typography sx={{ fontSize: 14, lineHeight: 1.5, mt: 0.75, color: t.red, overflowWrap: "anywhere", whiteSpace: "pre-line" }}>
                    <b style={{ fontWeight: 600 }}>Nunca digas:</b> {info.not_this}
                </Typography>
            )}
            {open && <>
                {sub("Cómo funciona y lo que hay que saber")}
                <InkLine label="Cómo funciona" text={info.mechanism} />
                <InkLine label="Información clave" text={info.key_info} />
                {personas.length > 0 && <>
                    {sub(`Los buyer personas (${personas.length})`)}
                    <Stack spacing={1}>
                        {personas.map((p) => (
                            <Box key={p.name} sx={p.name === persona ? mine : { pl: 1.25 }}>
                                <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{p.name}{p.name === persona ? " · el de este encargo" : ""}</Typography>
                                {PERSONA_LABELS.map(([k, label]) => <InkLine key={k} label={label} text={p[k]} />)}
                            </Box>
                        ))}
                    </Stack>
                </>}
                {angles.length > 0 && <>
                    {sub(`Los ángulos (${angles.length})`)}
                    <Stack spacing={1}>
                        {angles.map((a) => (
                            <Box key={a.code} sx={a.code === angle ? mine : { pl: 1.25 }}>
                                <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{a.code}{a.name ? ` · ${a.name}` : ""}{a.code === angle ? " · el de este encargo" : ""}</Typography>
                                <InkLine label="A quién le habla" text={a.persona} />
                                <InkLine label="De qué trata" text={a.about} />
                            </Box>
                        ))}
                    </Stack>
                </>}
                {photos.length > 0 && <>
                    {sub(`Fotos del producto (${photos.length}) · toca una para bajarla`)}
                    <Stack direction="row" gap={1} flexWrap="wrap">
                        {photos.map((f) => f.url && (
                            <Box key={f.id} component="a" href={f.download_url ?? f.url} aria-label={`Bajar ${f.name}`} sx={{ borderRadius: "8px", "&:focus-visible": { outline: `2px solid ${t.ink}` } }}>
                                <Box component="img" src={f.url} alt={f.name} loading="lazy" sx={{ width: 88, height: 88, objectFit: "cover", borderRadius: "8px", display: "block" }} />
                            </Box>
                        ))}
                    </Stack>
                </>}
            </>}
            {(more || info.photos_url) && (
                <Stack direction="row" columnGap={2} rowGap={0.5} flexWrap="wrap" sx={{ mt: 1, fontSize: 14 }}>
                    {more && <TextAction onClick={() => setOpen((o) => !o)} aria-expanded={open}>{open ? "Ver menos" : "Ver la ficha completa"}</TextAction>}
                    {info.photos_url && (
                        <Box component="a" href={info.photos_url} target="_blank" rel="noopener noreferrer" sx={{ color: t.ink, display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                            Fotos en Drive <OpenInNewRounded sx={{ fontSize: 14 }} />
                        </Box>
                    )}
                </Stack>
            )}
        </Box>
    );
};
