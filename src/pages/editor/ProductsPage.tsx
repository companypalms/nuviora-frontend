// src/pages/editor/ProductsPage.tsx
// .180 (dueño, 2026-11-26: "necesito que al líder le aparezca de manera fácil e intuitiva la ficha de los productos y el pdf
// e imágenes que yo monto para cada producto"): "Productos" del editor líder (/editor/productos; antes, .177, "Productos
// nuevos" solo con la cola). Responde "¿de qué trata cada producto y qué viene?":
// - todos los productos con los que trabaja el equipo: los de la cola del dueño (en su orden), los que están en testeo y los
//   que venden; con un buscador y botones para ver solo una parte;
// - cada uno, una tarjeta con su foto grande; al tocarla, su hoja (productSheet.tsx): la ficha, las fotos, los PDF de
//   estrategia del dueño, los buyer personas y los ángulos;
// - en los de la cola, "Adelantar" (si no les falta nada) o qué tiene que completar el dueño.
// El orden de la cola lo pone el dueño: aquí no se mueve ni se saca nada.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Button, ButtonBase, InputAdornment, Skeleton, Stack, TextField, Typography } from "@mui/material";
import { CheckCircleRounded, FastForwardRounded, ImageOutlined, ReportProblemRounded, SearchRounded } from "@mui/icons-material";
import { Layout } from "../../components/ui/Layout";
import { useValidateSession } from "../../hooks/useValidateSession";
import { api } from "../../components/meta-ads/metaAds";
import { AdvanceItem, TeamMember, notifyEditorChanged } from "../../components/meta-ads/editorShared";
import { AdvanceDialog } from "../../components/meta-ads/editorTeam";
import { ProductSheet } from "../../components/meta-ads/productSheet";
import { coverOf, ProductSheetData, sheetSummary } from "../../components/meta-ads/productSheetShared";
import { appear, cardSx, geist, inkSx, plural, tapSx, Tokens, useTokens } from "../../components/ui/design";
import { Dot, Section } from "../../components/ui/designParts";

type Stage = "queued" | "testing" | "selling";
type CatalogProduct = ProductSheetData & {
    product_id: number; stage: Stage; note: string;
    position?: number; ready?: boolean; waiting_for?: string | null; next?: boolean; batches?: number;
};
type Building = { product_id: number; product: string; delivered: number; of: number };
type Data = { products: CatalogProduct[]; building: Building[]; team: TeamMember[] };

const STAGES: { key: Stage; label: string; hint: string }[] = [
    { key: "queued", label: "En cola", hint: "en el orden del dueño" },
    { key: "testing", label: "En testeo", hint: "sus batches del testeo" },
    { key: "selling", label: "Vendiendo", hint: "con campañas activas" },
];
const stageColor = (t: Tokens, p: CatalogProduct) => (p.stage === "selling" ? t.green : p.stage === "testing" ? t.ink : p.ready ? t.green : t.amber);

/** Para la ventana de "Adelantar" (la misma de "Para adelantar"). */
const asItem = (p: CatalogProduct): AdvanceItem => ({ key: `new-${p.product_id}`, kind: "new", product_id: p.product_id, product: p.product, left: p.batches ?? 1, next: null, why: "", blocked: null });

/** Un producto: su foto grande, su nombre y en qué va. Tocarlo abre su hoja. */
const ProductCard: React.FC<{ p: CatalogProduct; onOpen: () => void }> = ({ p, onOpen }) => {
    const t = useTokens();
    const cover = coverOf(p);
    return (
        <ButtonBase component="li" onClick={onOpen} aria-label={`Ver ${p.product}: ${p.note}`}
            sx={{ ...cardSx(t), ...appear, display: "flex", flexDirection: "column", alignItems: "stretch", justifyContent: "flex-start", textAlign: "left", overflow: "hidden", listStyle: "none",
                borderColor: p.next ? t.ink : t.line, transition: "border-color .15s, transform .15s", "&:hover": { borderColor: t.faint },
                "&:active": { transform: "scale(.99)" }, "&.Mui-focusVisible": { outline: `2px solid ${t.ink}`, outlineOffset: 2 },
                "@media (prefers-reduced-motion: reduce)": { transition: "none", "&:active": { transform: "none" } } }}>
            <Box sx={{ position: "relative", aspectRatio: "4 / 3", overflow: "hidden", bgcolor: t.soft, flex: "none" }}>
                {cover ? <Box component="img" src={cover} alt="" loading="lazy" sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                    : <Box aria-hidden sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: t.faint }}><ImageOutlined fontSize="large" /></Box>}
                {p.stage === "queued" && (
                    <Box aria-hidden sx={{ position: "absolute", top: 8, left: 8, minWidth: 28, height: 28, px: 0.75, borderRadius: "14px", bgcolor: p.next ? t.ink : t.card,
                        color: p.next ? t.onInk : t.ink, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${t.line}` }}>{p.position}</Box>
                )}
            </Box>
            <Box sx={{ p: "10px 12px 12px" }}>
                <Typography component="h3" sx={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3, overflowWrap: "anywhere" }}>{p.product}</Typography>
                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.5 }}>
                    <Dot color={stageColor(t, p)} size={8} />
                    <Typography sx={{ fontSize: 13, color: t.muted }}>
                        {p.stage === "queued" ? (p.ready ? (p.next ? "Sale solo primero" : "Listo para adelantar") : "Le falta algo") : p.note}
                    </Typography>
                </Stack>
                <Typography sx={{ fontSize: 12, color: t.faint, mt: 0.25 }}>{sheetSummary(p) || "Sin ficha todavía"}</Typography>
            </Box>
        </ButtonBase>
    );
};

export const ProductsPage: React.FC = () => {
    const t = useTokens();
    const { loadingSession, isValid } = useValidateSession();
    const [data, setData] = useState<Data | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [stage, setStage] = useState<Stage | "all">("all");
    const [query, setQuery] = useState("");
    const [openId, setOpenId] = useState<number | null>(null);
    const [advancing, setAdvancing] = useState<CatalogProduct | null>(null);
    const [cheer, setCheer] = useState<string | null>(null);

    const load = useCallback(() => {
        setError(null);
        api<Data>("/editor/products").then(setData).catch((e) => setError((e as Error).message));
    }, []);
    useEffect(() => { if (isValid) load(); }, [isValid, load]);

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        return (data?.products ?? []).filter((p) => (stage === "all" || p.stage === stage) && (!q || p.product.toLowerCase().includes(q)));
    }, [data, stage, query]);

    const frame = (children: React.ReactNode) => (
        <Layout><Box sx={{ ...geist, maxWidth: 880, mx: "auto", px: { xs: 0, sm: 2 }, py: 2, pb: 6, color: t.ink }}>{children}</Box></Layout>
    );
    if (loadingSession || !isValid || (!data && !error)) {
        return frame(
            <Box aria-busy="true" aria-label="Cargando los productos">
                <Skeleton width={180} height={34} />
                <Skeleton variant="rounded" height={40} sx={{ mt: 2 }} />
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" }, gap: 1.5, mt: 2 }}>
                    {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} variant="rounded" height={220} />)}
                </Box>
            </Box>,
        );
    }
    if (!data) {
        return frame(
            <Box role="alert" sx={{ ...cardSx(t), p: 3 }}>
                <Stack direction="row" spacing={1} alignItems="center"><ReportProblemRounded sx={{ color: t.red }} />
                    <Typography sx={{ fontSize: 16, fontWeight: 600 }}>No se pudieron abrir los productos</Typography></Stack>
                <Typography sx={{ fontSize: 14, color: t.muted, mt: 1 }}>Revisa tu conexión a internet y vuelve a intentar.</Typography>
                <Button variant="contained" disableElevation sx={{ ...inkSx(t), ...tapSx, mt: 2 }} onClick={load}>Reintentar</Button>
                <Typography sx={{ fontSize: 12, color: t.faint, mt: 2 }}>Detalle técnico: {error}</Typography>
            </Box>,
        );
    }
    const count = (s: Stage) => data.products.filter((p) => p.stage === s).length;
    const open = data.products.find((p) => p.product_id === openId) ?? null;
    const chips: { key: Stage | "all"; label: string }[] = [{ key: "all", label: `Todos (${data.products.length})` }, ...STAGES.map((s) => ({ key: s.key, label: `${s.label} (${count(s.key)})` }))];
    const grid = (list: CatalogProduct[], label: string) => (
        <Box component="ul" aria-label={label} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" }, gap: { xs: 1.25, sm: 1.5 }, p: 0, m: 0 }}>
            {list.map((p) => <ProductCard key={p.product_id} p={p} onOpen={() => setOpenId(p.product_id)} />)}
        </Box>
    );

    return frame(
        <>
            <Typography component="h1" sx={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>Productos</Typography>
            <Typography sx={{ fontSize: 14, color: t.muted, mt: 0.5 }}>
                La ficha, las fotos y la estrategia de cada producto con el que trabaja el equipo. Toca uno para verlo completo.
            </Typography>
            {cheer && (
                <Box role="status" sx={{ mt: 2, p: "10px 14px", borderRadius: "8px", display: "flex", gap: 1, alignItems: "center", bgcolor: t.greenSoft, color: t.greenInk, ...appear }}>
                    <CheckCircleRounded sx={{ fontSize: 20 }} /><Typography sx={{ fontSize: 14, color: "inherit", overflowWrap: "anywhere" }}>{cheer}</Typography>
                </Box>
            )}

            <TextField value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar un producto" size="small" fullWidth
                inputProps={{ "aria-label": "Buscar un producto" }} sx={{ mt: 2 }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded sx={{ color: t.muted }} /></InputAdornment> }} />
            <Stack direction="row" gap={0.75} sx={{ mt: 1.25, overflowX: "auto", pb: 0.5, scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }} role="group" aria-label="Qué productos ver">
                {chips.map((c) => {
                    const on = stage === c.key;
                    return (
                        <ButtonBase key={c.key} onClick={() => setStage(c.key)} aria-pressed={on}
                            sx={{ flex: "none", fontSize: 14, px: 1.75, minHeight: 40, borderRadius: "20px", whiteSpace: "nowrap", fontWeight: on ? 600 : 400,
                                bgcolor: on ? t.ink : "transparent", color: on ? t.onInk : t.ink, border: `1px solid ${on ? t.ink : t.line}`,
                                "&.Mui-focusVisible": { outline: `2px solid ${t.ink}`, outlineOffset: 2 } }}>
                            {c.label}
                        </ButtonBase>
                    );
                })}
            </Stack>

            {(stage === "all" || stage === "queued") && data.building.length > 0 && (
                <Typography sx={{ fontSize: 14, mt: 1.5, overflowWrap: "anywhere" }}>
                    El equipo está haciendo el testeo de {data.building.map((b) => `${b.product} (${b.delivered} de ${b.of} en la banca)`).join(", ")}. Si adelantas otro de la
                    cola, se suma a ese trabajo: lo de los productos que venden va primero.
                </Typography>
            )}

            {shown.length === 0 ? (
                <Box sx={{ ...cardSx(t), p: "16px", mt: 2 }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{query.trim() ? "Ningún producto con ese nombre" : "No hay productos aquí"}</Typography>
                    <Typography sx={{ fontSize: 14, color: t.muted, mt: 0.5 }}>
                        {query.trim() ? "Revisa cómo lo escribiste o mira «Todos»." : "Cuando el dueño prepare uno, aparece con su foto y su ficha."}
                    </Typography>
                </Box>
            ) : stage === "all" && !query.trim() ? STAGES.filter((s) => count(s.key) > 0).map((s) => (
                <Section key={s.key} name={`${s.label} · ${count(s.key)}`} hint={s.hint}>{grid(shown.filter((p) => p.stage === s.key), s.label)}</Section>
            )) : <Box sx={{ mt: 2 }}>{grid(shown, "Productos")}</Box>}

            {open && (
                <ProductSheet data={open} onClose={() => setOpenId(null)}
                    status={<>
                        {STAGES.find((s) => s.key === open.stage)?.label} · {open.note}
                        {open.stage === "queued" && open.next && " · sale solo primero"}
                        {open.waiting_for && <Typography sx={{ fontSize: 14, color: t.ink, mt: 0.5, overflowWrap: "anywhere" }}>{open.waiting_for}</Typography>}
                    </>}
                    actions={open.stage === "queued" && open.ready ? (
                        <Button variant="contained" disableElevation startIcon={<FastForwardRounded />} onClick={() => { setCheer(null); setAdvancing(open); setOpenId(null); }}
                            sx={{ ...inkSx(t), ...tapSx }}>Adelantar ({plural(open.batches ?? 1, "batch", "batches")})</Button>
                    ) : undefined} />
            )}
            {advancing && (
                <AdvanceDialog item={asItem(advancing)} team={data.team} onClose={() => { setAdvancing(null); load(); }}
                    onDone={(m) => { setAdvancing(null); setCheer(m); notifyEditorChanged(); load(); }} />
            )}
        </>,
    );
};
