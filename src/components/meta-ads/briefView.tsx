// src/components/meta-ads/briefView.tsx
// El encargo como lo leen los editores: todo el detalle (BriefDetail, de "Mis encargos" y "Encargos del equipo") y, .93,
// "Lo que se busca" para revisar (dueño: "que se vea en ese mismo pop-up la hipótesis que se quiere probar y lo que se le
// pidió al editor, para que tenga todos los datos claros"): la hipótesis (solo el líder y el dueño), qué probamos, el
// ángulo y de qué trata, lo que buscamos, lo que funcionó y lo que hay que mejorar; el resto, plegado.
import React, { useState } from "react";
import { Box, Collapse, Link, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import { OpenInNewRounded } from "@mui/icons-material";
import { EditorBatch, ReferenceBrief, ReviewContext } from "./editorShared";
import { PersonaBox, ProductBox } from "./productProfile";
import { FileView } from "./fileView";
import { useTokens } from "../ui/design";
import { Dot, TextAction } from "../ui/designParts";

const FORMATS: Record<string, string> = { video: "Video", image: "Imagen", mixed: "Video e imagen" };

/** Un bloque del encargo con su título chico (lo que buscamos, lo que funcionó…). El punto de color va siempre con palabra. */
const Block: React.FC<{ title: string; text?: string | null; dot?: string }> = ({ title, text, dot }) => {
    const t = useTokens();
    return text && text.trim() ? (
        <Box sx={{ mt: 1.25 }}>
            <Stack direction="row" spacing={0.75} alignItems="center">
                {dot && <Dot color={dot} size={8} />}
                <Typography sx={{ fontSize: 13, color: t.muted }}>{title}</Typography>
            </Stack>
            <Typography sx={{ fontSize: 14, lineHeight: 1.5, overflowWrap: "anywhere", whiteSpace: "pre-line" }}>{text}</Typography>
        </Box>
    ) : null;
};

/** `.94`: la referencia que sugirió el líder al asignar, con su video: de ahí conviene partir. */
export const SuggestedRef: React.FC<{ r: ReferenceBrief }> = ({ r }) => {
    const t = useTokens();
    return (
        <Box sx={{ mt: 1.5, p: "10px 12px", borderRadius: "10px", bgcolor: t.soft }}>
            <Typography sx={{ fontSize: 13, color: t.muted }}>Parte de esta referencia (te la sugirió el líder)</Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{[r.code, r.type_label].filter(Boolean).join(" · ")}</Typography>
            {r.why && <Typography sx={{ fontSize: 13, color: t.muted, overflowWrap: "anywhere" }}>Por qué: {r.why}</Typography>}
            {r.file && <Box sx={{ mt: 1 }}><FileView file={r.file} height={240} /></Box>}
            {r.link && (
                <Link href={r.link} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ fontSize: 13, color: t.muted }}>
                    ver el original <OpenInNewRounded sx={{ fontSize: 12, verticalAlign: "middle" }} />
                </Link>
            )}
        </Box>
    );
};

/** Todo el encargo: qué probamos, lo que buscamos, a quién le hablas, el producto, la referencia y qué lleva cada pieza. */
export const BriefDetail: React.FC<{ b: EditorBatch; hideSuggested?: boolean }> = ({ b, hideSuggested = false }) => {
    const t = useTokens();
    const planned = b.pieces.some((p) => p.hypothesis);
    return (
        <Box sx={{ mt: 0.5 }}>
            {b.suggested_reference && !hideSuggested && <SuggestedRef r={b.suggested_reference} />}
            <Block title="Qué estamos probando" text={b.test_idea} />
            <Block title="Lo que buscamos" text={b.goal} />
            <PersonaBox persona={b.persona} />
            <Block title="Lo que funcionó (no lo cambies)" text={b.keep} dot={t.green} />
            <Block title="Lo que hay que mejorar" text={b.improve} dot={t.amber} />
            <Block title="Concepto" text={b.concept} />
            <Block title="Dolor o público" text={b.audience} />
            {(b.format || b.style_label || b.offer) && (
                <Typography sx={{ fontSize: 13, color: t.muted, mt: 1 }}>
                    {[b.format && FORMATS[b.format], b.style_label && `Estilo: ${b.style_label}`, b.offer].filter(Boolean).join(" · ")}
                </Typography>
            )}
            {b.pieces.length > 0 && (
                <Box sx={{ mt: 1.5 }}>
                    <Typography sx={{ fontSize: 13, color: t.muted }}>{planned ? "Qué lleva cada pieza" : "Ideas para cada pieza (tú decides cómo)"}</Typography>
                    <Stack spacing={0.75} sx={{ mt: 0.5 }}>
                        {b.pieces.map((p, i) => (
                            <Box key={p.id}>
                                <Typography sx={{ fontSize: 14, lineHeight: 1.5, overflowWrap: "anywhere" }}>
                                    <b style={{ fontWeight: 600 }}>{p.code ?? `Pieza ${i + 1}`}</b>
                                    {p.hypothesis && p.test_label && <> · {p.test_label}{p.style_label ? ` (${p.style_label})` : ""}</>}
                                    {": "}{p.change || <span style={{ color: t.faint }}>sin detalle</span>}
                                    {p.format && p.format !== b.format && <> ({(FORMATS[p.format] ?? p.format).toLowerCase()})</>}
                                </Typography>
                                {p.hypothesis && <Typography sx={{ fontSize: 13, color: t.muted }}>Qué probamos: {p.hypothesis}</Typography>}
                            </Box>
                        ))}
                    </Stack>
                </Box>
            )}
            <ProductBox product={b.product} info={b.product_info} personas={b.personas} angles={b.angles} photos={b.photos} persona={b.persona?.name} angle={b.angle_code} />
            {b.reference && (
                <Box sx={{ mt: 1.5, p: "10px 12px", borderRadius: "10px", bgcolor: t.soft }}>
                    <Stack direction="row" spacing={1.25}>
                        {b.reference_thumbnail && !b.iteration?.file && (
                            <Box component="img" src={b.reference_thumbnail} alt={`Miniatura de ${b.reference}`} loading="lazy"
                                sx={{ width: 72, height: 72, objectFit: "cover", borderRadius: "8px", flexShrink: 0 }} />
                        )}
                        <Box sx={{ minWidth: 0 }}>
                            {/* .98: en el encargo de iterar un ganador, se dice que es eso (no "una referencia") */}
                            <Typography sx={{ fontSize: 13, color: t.muted }}>{b.iteration_of ? "Iteración (variación) de este ganador" : "La referencia"}</Typography>
                            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{b.reference}</Typography>
                            {b.reference_texts.map((x, i) => <Typography key={i} sx={{ fontSize: 13, color: t.muted, overflowWrap: "anywhere" }}>“{x}”</Typography>)}
                            {b.reference_script?.hook && <Typography sx={{ fontSize: 13, mt: 0.5, overflowWrap: "anywhere" }}><b>Hook de su video:</b> «{b.reference_script.hook}»</Typography>}
                            {b.reference_script?.text && <Typography sx={{ fontSize: 13, color: t.muted, whiteSpace: "pre-line", overflowWrap: "anywhere" }}><b>Lo que dice su video:</b> {b.reference_script.text}</Typography>}
                        </Box>
                    </Stack>
                    {/* .98: el video del ganador, si se entregó por el sistema */}
                    {b.iteration?.file && <Box sx={{ mt: 1 }}><FileView file={b.iteration.file} height={240} /></Box>}
                </Box>
            )}
            <Block title="Entregables" text={b.deliverables} />
            {b.meta_names.ads.length > 0 && (
                <Typography sx={{ fontSize: 13, color: t.muted, mt: 1.25, overflowWrap: "anywhere" }}>
                    {b.uploads ? <>Los archivos se nombran solos al subirlos: {b.meta_names.ads.join(", ")} (ad set {b.meta_names.adset}).</>
                        : <>Nombra cada archivo de Drive con su código: {b.meta_names.ads.join(", ")} (van en el ad set {b.meta_names.adset}).</>}
                </Typography>
            )}
        </Box>
    );
};

/**
 * `.93`: "Lo que se busca" arriba de la ventana de revisar, en corto. En el celular se ven las 2 primeras cosas y el resto,
 * con "Ver todo el encargo" (que también abre el detalle completo, si la pantalla lo da).
 */
export const ReviewBrief: React.FC<{ c: ReviewContext; detail?: React.ReactNode }> = ({ c, detail }) => {
    const t = useTokens();
    const phone = useMediaQuery(useTheme().breakpoints.down("sm"));
    const [open, setOpen] = useState(false);
    const rows = ([
        ["La hipótesis", c.hypothesis],
        ["Qué estamos probando", c.testIdea],
        ["El ángulo", c.angle ? `${c.angle}${c.angleAbout ? `: ${c.angleAbout}` : ""}` : c.angleAbout],
        ["Lo que buscamos", c.goal],
        ["Lo que funcionó (no lo cambies)", c.keep],
        ["Lo que hay que mejorar", c.improve],
    ] as [string, string | null | undefined][]).filter(([, v]) => !!v && v.trim() !== "") as [string, string][];
    if (rows.length === 0 && !detail) return null;
    const shown = phone && !open ? rows.slice(0, 2) : rows;
    const more = (phone && rows.length > 2) || !!detail;
    const row = ([k, v]: [string, string]) => (
        <Box key={k} sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 12, color: t.muted }}>{k}</Typography>
            <Typography sx={{ fontSize: 14, lineHeight: 1.45, overflowWrap: "anywhere", whiteSpace: "pre-line" }}>{v}</Typography>
        </Box>
    );
    return (
        <Box component="section" aria-label="Lo que se busca" sx={{ p: "10px 12px", borderRadius: "10px", bgcolor: t.soft, mb: 1.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Lo que se busca</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, columnGap: 2, rowGap: 0.75, mt: 0.5 }}>{shown.map(row)}</Box>
            {more && (
                <>
                    <TextAction onClick={() => setOpen(!open)} aria-expanded={open} sx={{ fontSize: 13, color: t.muted, mt: 0.75 }}>
                        {open ? "Ocultar" : "Ver todo el encargo"}
                    </TextAction>
                    {detail && <Collapse in={open} unmountOnExit>{detail}</Collapse>}
                </>
            )}
        </Box>
    );
};
