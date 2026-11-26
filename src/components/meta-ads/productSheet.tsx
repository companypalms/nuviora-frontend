// src/components/meta-ads/productSheet.tsx
// .180 (dueño, 2026-11-26: "necesito que al líder le aparezca de manera fácil e intuitiva la ficha de los productos y el pdf
// e imágenes que yo monto para cada producto"; y eligió que también los editores): la hoja de un producto, en una ventana
// (en el teléfono, a pantalla completa). Arriba, botones para saltar a cada parte: la ficha, las fotos (cada una se abre
// en grande o se baja), los PDF de estrategia del dueño (abrir o bajar), los buyer personas y los ángulos. Se abre desde
// "Productos" del líder y desde "Ver el producto" de cada encargo (con el buyer persona y el ángulo del encargo marcados).
import React, { useRef } from "react";
import { Box, Button, ButtonBase, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Link, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import { CloseRounded, DescriptionOutlined, ImageOutlined, OpenInNewRounded } from "@mui/icons-material";
import type { PersonaInfo, ProductInfo } from "./productProfile";
import { coverOf, ProductSheetData } from "./productSheetShared";
import { geist, lineSx, tapSx, useTokens } from "../ui/design";

const FICHA: [keyof ProductInfo, string][] = [["what_it_is", "Qué es"], ["benefits", "Para qué sirve"], ["mechanism", "Cómo funciona"], ["key_info", "Información clave"]];
const PERSONA: [keyof PersonaInfo, string][] = [["who", "Quién es"], ["pain", "Qué le duele"], ["wants", "Qué quiere"], ["objections", "Qué lo frena"]];

const Line: React.FC<{ label: string; text?: string | null }> = ({ label, text }) => (text
    ? <Typography sx={{ fontSize: 15, lineHeight: 1.55, overflowWrap: "anywhere", whiteSpace: "pre-line", mt: 0.75 }}><b style={{ fontWeight: 600 }}>{label}:</b> {text}</Typography> : null);

export const ProductSheet: React.FC<{
    data: ProductSheetData; onClose: () => void;
    /** Debajo del nombre: en qué va (en cola, en testeo…) o lo que le falta. */
    status?: React.ReactNode;
    /** El buyer persona y el ángulo del encargo, marcados. */
    persona?: string | null; angle?: string | null;
    /** Botones de la ventana (Adelantar…), antes de Cerrar. */
    actions?: React.ReactNode;
}> = ({ data, onClose, status, persona, angle, actions }) => {
    const t = useTokens();
    const phone = useMediaQuery(useTheme().breakpoints.down("sm"));
    const refs = {
        ficha: useRef<HTMLDivElement>(null), fotos: useRef<HTMLDivElement>(null), estrategia: useRef<HTMLDivElement>(null),
        personas: useRef<HTMLDivElement>(null), angulos: useRef<HTMLDivElement>(null),
    };
    const photos = data.photos ?? [];
    const docs = data.strategy ?? [];
    const personas = data.personas ?? [];
    const angles = data.angles ?? [];
    const cover = coverOf(data);
    const jumps: [keyof typeof refs, string][] = [["ficha", "Ficha"], ["fotos", `Fotos (${photos.length})`], ["estrategia", `Estrategia (${docs.length})`],
        ["personas", `Buyer personas (${personas.length})`], ["angulos", `Ángulos (${angles.length})`]];
    const head = (key: keyof typeof refs, text: string) => (
        <Typography ref={refs[key]} component="h3" sx={{ fontSize: 16, fontWeight: 600, mt: 3, mb: 0.5, scrollMarginTop: 8 }}>{text}</Typography>
    );
    const empty = (text: string) => <Typography sx={{ fontSize: 14, color: t.muted }}>{text}</Typography>;
    const mine = { borderLeft: `3px solid ${t.ink}`, pl: 1.25 } as const;
    return (
        <Dialog open onClose={onClose} fullScreen={phone} fullWidth maxWidth="md" scroll="paper" aria-labelledby="hoja-producto"
            PaperProps={{ sx: { ...geist, borderRadius: phone ? 0 : "12px" } }}>
            <DialogTitle sx={{ pb: 1.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    {cover ? <Box component="img" src={cover} alt="" sx={{ width: 56, height: 56, borderRadius: "10px", objectFit: "cover", flex: "none", border: `1px solid ${t.line}` }} />
                        : <Box aria-hidden sx={{ width: 56, height: 56, borderRadius: "10px", bgcolor: t.soft, color: t.faint, flex: "none", display: "flex", alignItems: "center", justifyContent: "center" }}><ImageOutlined /></Box>}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography id="hoja-producto" component="span" sx={{ display: "block", fontSize: 20, fontWeight: 600, overflowWrap: "anywhere" }}>{data.product}</Typography>
                        {status && <Box sx={{ fontSize: 14, color: t.muted }}>{status}</Box>}
                    </Box>
                    <IconButton aria-label="Cerrar" onClick={onClose} sx={{ width: 44, height: 44, flex: "none", color: t.ink }}><CloseRounded /></IconButton>
                </Stack>
                {/* Saltar a cada parte */}
                <Stack direction="row" gap={0.75} sx={{ mt: 1.5, overflowX: "auto", pb: 0.5, mx: -0.5, px: 0.5, scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
                    {jumps.map(([key, label]) => (
                        <ButtonBase key={key} onClick={() => refs[key].current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                            sx={{ flex: "none", fontSize: 14, px: 1.5, minHeight: 36, borderRadius: "18px", border: `1px solid ${t.line}`, color: t.ink, whiteSpace: "nowrap",
                                "&:hover": { bgcolor: t.soft }, "&.Mui-focusVisible": { outline: `2px solid ${t.ink}`, outlineOffset: 2 } }}>
                            {label}
                        </ButtonBase>
                    ))}
                </Stack>
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: t.line, pt: 0.5 }}>
                {head("ficha", "La ficha")}
                {data.info ? <>
                    {FICHA.map(([k, label]) => <Line key={k} label={label} text={data.info?.[k]} />)}
                    {data.info.not_this && (
                        <Box sx={{ mt: 1.25, p: "10px 12px", borderRadius: "10px", border: `1px solid ${t.red}` }}>
                            <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.red }}>Lo que NO es y nunca se dice</Typography>
                            <Typography sx={{ fontSize: 15, lineHeight: 1.55, overflowWrap: "anywhere", whiteSpace: "pre-line" }}>{data.info.not_this}</Typography>
                        </Box>
                    )}
                    {data.info.photos_url && (
                        <Link href={data.info.photos_url} target="_blank" rel="noopener noreferrer" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, mt: 1, color: t.ink, fontSize: 14 }}>
                            Más fotos en Drive <OpenInNewRounded sx={{ fontSize: 14 }} />
                        </Link>
                    )}
                </> : empty("El dueño todavía no llenó la ficha.")}

                {head("fotos", "Fotos del producto")}
                {photos.length === 0 ? empty("Todavía no hay fotos.") : (
                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 1.25 }}>
                        {photos.map((f) => (
                            <Box key={f.id} sx={{ minWidth: 0 }}>
                                <Box component="a" href={f.url ?? undefined} target="_blank" rel="noopener noreferrer" aria-label={`Ver ${f.name} en grande`}
                                    sx={{ display: "block", borderRadius: "10px", overflow: "hidden", border: `1px solid ${t.line}`, "&:focus-visible": { outline: `2px solid ${t.ink}`, outlineOffset: 2 } }}>
                                    {f.url ? <Box component="img" src={f.url} alt={f.name} loading="lazy" sx={{ display: "block", width: "100%", aspectRatio: "1 / 1", objectFit: "cover" }} />
                                        : <Box sx={{ aspectRatio: "1 / 1", bgcolor: t.soft }} />}
                                </Box>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                                    <Typography sx={{ fontSize: 12, color: t.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</Typography>
                                    {f.download_url && <Link href={f.download_url} sx={{ fontSize: 14, color: t.ink, py: 1.25, flex: "none" }} aria-label={`Bajar ${f.name}`}>Bajar</Link>}
                                </Stack>
                            </Box>
                        ))}
                    </Box>
                )}

                {head("estrategia", "La estrategia del dueño")}
                {docs.length === 0 ? empty("El dueño todavía no subió su estrategia.") : docs.map((f) => (
                    <Stack key={f.id} direction="row" spacing={1.25} alignItems="center" sx={{ minHeight: 52, borderBottom: `1px solid ${t.line}`, "&:last-of-type": { borderBottom: 0 } }}>
                        <DescriptionOutlined sx={{ color: t.muted, flex: "none" }} />
                        <Typography sx={{ fontSize: 15, flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{f.name}</Typography>
                        {f.url && <Button variant="outlined" size="small" href={f.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${f.name}`} sx={{ ...lineSx(t), ...tapSx, flex: "none" }}>Abrir</Button>}
                        {f.download_url && <Button size="small" href={f.download_url} aria-label={`Bajar ${f.name}`} sx={{ color: t.ink, ...tapSx, flex: "none" }}>Bajar</Button>}
                    </Stack>
                ))}

                {head("personas", "Los buyer personas")}
                {personas.length === 0 ? empty("Todavía no tiene buyer personas.") : (
                    <Stack spacing={1.5}>
                        {personas.map((p) => (
                            <Box key={p.name} sx={p.name === persona ? mine : { pl: 1.25 }}>
                                <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{p.name}{p.name === persona ? " · el de este encargo" : ""}</Typography>
                                {PERSONA.map(([k, label]) => <Line key={k} label={label} text={p[k]} />)}
                            </Box>
                        ))}
                    </Stack>
                )}

                {head("angulos", "Los ángulos de venta")}
                {angles.length === 0 ? empty("Todavía no tiene ángulos.") : (
                    <Stack spacing={1.5} sx={{ pb: 1 }}>
                        {angles.map((a) => (
                            <Box key={a.code} sx={a.code === angle ? mine : { pl: 1.25 }}>
                                <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{a.code}{a.name ? ` · ${a.name}` : ""}{a.code === angle ? " · el de este encargo" : ""}</Typography>
                                <Line label="A quién le habla" text={a.persona} />
                                <Line label="De qué trata" text={a.about} />
                            </Box>
                        ))}
                    </Stack>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 1.5, gap: 1, flexWrap: "wrap" }}>
                {actions}
                <Button onClick={onClose} sx={{ color: t.ink, ...tapSx }}>Cerrar</Button>
            </DialogActions>
        </Dialog>
    );
};
