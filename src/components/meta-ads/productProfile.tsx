// src/components/meta-ads/productProfile.tsx
// .64: la ficha del producto en el encargo del editor. Lo básico del producto (qué es, para qué sirve, lo que NO es; y
// al abrirlo, cómo funciona y la información clave) y el buyer persona de su encargo. .90 (dueño: "cada editor debe poder
// saber de qué trata cada buyer persona, de qué trata cada ángulo, cuál es el mecanismo de acción del producto"): al
// abrirla, también todos los buyer personas, todos los ángulos y las fotos del producto. Sin precios ni aprendizajes.
// .180: "Ver el producto" abre su hoja completa (productSheet.tsx), también con los PDF de estrategia del dueño.
import React, { useState } from "react";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { Inventory2Outlined } from "@mui/icons-material";
import type { StoredFile } from "./fileUpload";
import { ProductSheet } from "./productSheet";
import { coverOf, sheetSummary } from "./productSheetShared";
import { lineSx, tapSx, useTokens } from "../ui/design";

export type ProductInfo = Partial<Record<"what_it_is" | "benefits" | "mechanism" | "not_this" | "key_info" | "photos_url", string>>;
export type PersonaInfo = Partial<Record<"name" | "who" | "pain" | "wants" | "objections", string>>;
/** .90: un ángulo como lo ve el editor: de qué trata y a quién le habla. */
export type AngleInfo = { code: string; name: string | null; persona: string | null; about: string | null };

const PERSONA_LABELS: [keyof PersonaInfo, string][] = [["who", "Quién es"], ["pain", "Qué le duele"], ["wants", "Qué quiere"], ["objections", "Qué lo frena"]];

/** .65: en qué va el testeo de un producto (o cómo terminó), como lo arma TestingPhase::summary. */
export type TestingSummary = {
    phase: "queued" | "testing" | "iterate"; phase_label: string; round: number; text: string; can_next: boolean; level: "info" | "warning" | "success";
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
 * Lo del producto en el encargo: qué es, para qué sirve y lo que NO es, siempre a la vista. .180 (dueño: "de manera fácil e
 * intuitiva la ficha de los productos y el pdf e imágenes que yo monto"): "Ver el producto" abre su hoja completa (la
 * ficha, las fotos, los PDF de estrategia, los buyer personas y los ángulos, con los de este encargo marcados).
 * .91: con el diseño nuevo; "lo que NO es" es la única señal (rojo, con palabra).
 */
export const ProductBox: React.FC<{
    product: string; info?: ProductInfo | null; personas?: PersonaInfo[]; angles?: AngleInfo[]; photos?: StoredFile[]; strategy?: StoredFile[];
    persona?: string | null; angle?: string | null;
}> = ({ product, info, personas = [], angles = [], photos = [], strategy = [], persona, angle }) => {
    const t = useTokens();
    const [open, setOpen] = useState(false);
    if (!info && photos.length === 0 && strategy.length === 0) return null;
    const data = { product, info, personas, angles, photos, strategy };
    const cover = coverOf(data);
    return (
        <Box sx={{ mt: 1.5, p: "12px 14px", borderRadius: "10px", border: `1px solid ${t.line}` }}>
            <Stack direction="row" spacing={1.25} alignItems="center">
                {cover && <Box component="img" src={cover} alt="" sx={{ width: 48, height: 48, borderRadius: "8px", objectFit: "cover", flex: "none", border: `1px solid ${t.line}` }} />}
                <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13, color: t.muted }}>El producto</Typography>
                    <Typography sx={{ fontSize: 15, fontWeight: 600, overflowWrap: "anywhere" }}>{product}</Typography>
                </Box>
            </Stack>
            <InkLine label="Qué es" text={info?.what_it_is} />
            <InkLine label="Para qué sirve" text={info?.benefits} />
            {info?.not_this && (
                <Typography sx={{ fontSize: 14, lineHeight: 1.5, mt: 0.75, color: t.red, overflowWrap: "anywhere", whiteSpace: "pre-line" }}>
                    <b style={{ fontWeight: 600 }}>Nunca digas:</b> {info.not_this}
                </Typography>
            )}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 0.5, sm: 1.5 }} alignItems={{ xs: "stretch", sm: "center" }} sx={{ mt: 1.25 }}>
                <Button variant="outlined" onClick={() => setOpen(true)} startIcon={<Inventory2Outlined />} sx={{ ...lineSx(t), ...tapSx, flex: "none" }}>Ver el producto</Button>
                <Typography sx={{ fontSize: 13, color: t.muted }}>{sheetSummary(data)}</Typography>
            </Stack>
            {open && <ProductSheet data={data} persona={persona} angle={angle} onClose={() => setOpen(false)} />}
        </Box>
    );
};
