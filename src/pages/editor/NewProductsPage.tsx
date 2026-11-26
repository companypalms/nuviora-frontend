// src/pages/editor/NewProductsPage.tsx
// .177 (dueño, 2026-11-26: "necesito que a él le aparezcan todos los productos que vamos a montar. Es decir, todos los que
// están en cola le deben aparecer a él. Le debe aparecer por completo la ficha, la foto del producto, el nombre del
// producto, etcétera, para que él pueda decidir si lo van adelantando o no lo van adelantando"): "Productos nuevos" del
// editor líder (/editor/productos-nuevos). Responde "¿qué productos vienen y cuál adelanto?":
// - el marcador: en cola, listos para adelantar y el testeo que el equipo está haciendo ahora;
// - cada producto de la cola del dueño, en su orden, con su foto, su ficha (como en un encargo: sin precios), los documentos
//   de estrategia (el dueño eligió que también los vea) y "Adelantar" si no le falta nada (si le falta, qué tiene que
//   completar el dueño).
// El orden lo pone el dueño: aquí no se mueve ni se saca nada.
import React, { useCallback, useEffect, useState } from "react";
import { Box, Button, Link, Skeleton, Stack, Typography } from "@mui/material";
import { CheckCircleRounded, DescriptionOutlined, FastForwardRounded, ImageOutlined, ReportProblemRounded } from "@mui/icons-material";
import { Layout } from "../../components/ui/Layout";
import { useValidateSession } from "../../hooks/useValidateSession";
import { api } from "../../components/meta-ads/metaAds";
import { AdvanceItem, TeamMember, notifyEditorChanged } from "../../components/meta-ads/editorShared";
import { AdvanceDialog } from "../../components/meta-ads/editorTeam";
import { AngleInfo, PersonaInfo, ProductBox, ProductInfo } from "../../components/meta-ads/productProfile";
import type { StoredFile } from "../../components/meta-ads/fileUpload";
import { appear, cardSx, geist, inkSx, plural, tapSx, useTokens } from "../../components/ui/design";
import { Dot, Scoreboard, Section } from "../../components/ui/designParts";

type NewProduct = {
    product_id: number; product: string; position: number; ready: boolean; waiting_for: string | null; next: boolean; batches: number;
    info: ProductInfo | null; personas: PersonaInfo[]; angles: AngleInfo[]; photos: StoredFile[]; strategy: StoredFile[];
};
type Building = { product_id: number; product: string; delivered: number; of: number };
type Data = { queue: NewProduct[]; building: Building[]; team: TeamMember[] };

/** Para la ventana de "Adelantar" (la misma de "Para adelantar"). */
const asItem = (p: NewProduct): AdvanceItem => ({ key: `new-${p.product_id}`, kind: "new", product_id: p.product_id, product: p.product, left: p.batches, next: null, why: "", blocked: null });

/** Un producto de la cola: su foto, su nombre, si se puede adelantar, su ficha, la estrategia y "Adelantar". */
const ProductCard: React.FC<{ p: NewProduct; onAdvance: () => void }> = ({ p, onAdvance }) => {
    const t = useTokens();
    const cover = p.photos.find((f) => f.url)?.url ?? null;
    const box = { flex: "none", width: { xs: 72, sm: 96 }, height: { xs: 72, sm: 96 }, borderRadius: "10px" } as const;
    return (
        <Box component="li" sx={{ ...cardSx(t), ...appear, p: "14px 16px", mb: 1.25, listStyle: "none", borderColor: p.next ? t.ink : t.line }}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
                {cover ? <Box component="img" src={cover} alt={`Foto de ${p.product}`} sx={{ ...box, objectFit: "cover", border: `1px solid ${t.line}` }} />
                    : <Box aria-hidden sx={{ ...box, bgcolor: t.soft, color: t.faint, display: "flex", alignItems: "center", justifyContent: "center" }}><ImageOutlined /></Box>}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13, color: p.next ? t.ink : t.muted, fontWeight: p.next ? 600 : 400 }}>
                        Lugar {p.position} de la cola{p.next ? " · sale solo primero" : ""}
                    </Typography>
                    <Typography component="h3" sx={{ fontSize: 17, fontWeight: 600, overflowWrap: "anywhere" }}>{p.product}</Typography>
                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.25 }}>
                        <Dot color={p.ready ? t.green : t.amber} size={8} />
                        <Typography sx={{ fontSize: 13 }}>{p.ready ? `Listo para adelantar · ${plural(p.batches, "batch", "batches")} del testeo` : "Le falta algo"}</Typography>
                    </Stack>
                    {!cover && <Typography sx={{ fontSize: 13, color: t.muted }}>Sin foto todavía</Typography>}
                </Box>
            </Stack>
            {p.waiting_for && <Typography sx={{ fontSize: 14, mt: 1.25, overflowWrap: "anywhere" }}>{p.waiting_for}</Typography>}
            {p.info ? <ProductBox product={p.product} hideName info={p.info} personas={p.personas} angles={p.angles} photos={p.photos} />
                : <Typography sx={{ fontSize: 14, color: t.muted, mt: 1.25 }}>El dueño todavía no llenó su ficha.</Typography>}
            {p.strategy.length > 0 && (
                <Box sx={{ mt: 1.5 }}>
                    <Typography component="h4" sx={{ fontSize: 13, color: t.muted }}>La estrategia del dueño ({p.strategy.length})</Typography>
                    {p.strategy.map((f) => (
                        <Stack key={f.id} direction="row" spacing={1} alignItems="center" sx={{ minHeight: 44 }}>
                            <DescriptionOutlined sx={{ fontSize: 18, color: t.muted, flex: "none" }} />
                            <Typography sx={{ fontSize: 14, flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{f.name}</Typography>
                            {f.url && <Link href={f.url} target="_blank" rel="noopener noreferrer" sx={{ color: t.ink, fontSize: 14, py: 1.25 }} aria-label={`Abrir ${f.name}`}>Abrir</Link>}
                            {f.download_url && <Link href={f.download_url} sx={{ color: t.ink, fontSize: 14, py: 1.25 }} aria-label={`Bajar ${f.name}`}>Bajar</Link>}
                        </Stack>
                    ))}
                </Box>
            )}
            {p.ready && (
                <Button variant="contained" disableElevation startIcon={<FastForwardRounded />} onClick={onAdvance}
                    sx={{ ...inkSx(t), ...tapSx, mt: 2, width: { xs: "100%", sm: "auto" } }}>Adelantar {p.product}</Button>
            )}
        </Box>
    );
};

export const NewProductsPage: React.FC = () => {
    const t = useTokens();
    const { loadingSession, isValid } = useValidateSession();
    const [data, setData] = useState<Data | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [advancing, setAdvancing] = useState<NewProduct | null>(null);
    const [cheer, setCheer] = useState<string | null>(null);

    const load = useCallback(() => {
        setError(null);
        api<Data>("/editor/products").then(setData).catch((e) => setError((e as Error).message));
    }, []);
    useEffect(() => { if (isValid) load(); }, [isValid, load]);

    const frame = (children: React.ReactNode) => (
        <Layout><Box sx={{ ...geist, maxWidth: 640, mx: "auto", px: { xs: 0, sm: 2 }, py: 2, pb: 6, color: t.ink }}>{children}</Box></Layout>
    );
    if (loadingSession || !isValid || (!data && !error)) {
        return frame(
            <Box aria-busy="true" aria-label="Cargando los productos nuevos">
                <Skeleton width={220} height={34} />
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, mt: 2 }}>{[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={58} />)}</Box>
                {[0, 1].map((i) => <Skeleton key={i} variant="rounded" height={180} sx={{ mt: 1.5 }} />)}
            </Box>,
        );
    }
    if (!data) {
        return frame(
            <Box role="alert" sx={{ ...cardSx(t), p: 3 }}>
                <Stack direction="row" spacing={1} alignItems="center"><ReportProblemRounded sx={{ color: t.red }} />
                    <Typography sx={{ fontSize: 16, fontWeight: 600 }}>No se pudieron abrir los productos nuevos</Typography></Stack>
                <Typography sx={{ fontSize: 14, color: t.muted, mt: 1 }}>Revisa tu conexión a internet y vuelve a intentar.</Typography>
                <Button variant="contained" disableElevation sx={{ ...inkSx(t), ...tapSx, mt: 2 }} onClick={load}>Reintentar</Button>
                <Typography sx={{ fontSize: 12, color: t.faint, mt: 2 }}>Detalle técnico: {error}</Typography>
            </Box>,
        );
    }
    const ready = data.queue.filter((q) => q.ready).length;
    const building = data.building;

    return frame(
        <>
            <Typography component="h1" sx={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>Productos nuevos</Typography>
            <Typography sx={{ fontSize: 14, color: t.muted, mt: 0.5 }}>
                Todo lo que el dueño va a montar, en su orden. El sistema te pasa uno solo cuando el equipo tiene chance. Si a alguien (o a ti) le sobra
                tiempo, adelanta el que quieras.
            </Typography>
            {cheer && (
                <Box role="status" sx={{ mt: 2, p: "10px 14px", borderRadius: "8px", display: "flex", gap: 1, alignItems: "center", bgcolor: t.greenSoft, color: t.greenInk, ...appear }}>
                    <CheckCircleRounded sx={{ fontSize: 20 }} /><Typography sx={{ fontSize: 14, color: "inherit", overflowWrap: "anywhere" }}>{cheer}</Typography>
                </Box>
            )}
            <Scoreboard tiles={[
                { label: "En cola", value: data.queue.length, help: "Los productos nuevos que preparó el dueño y esperan su turno." },
                { label: "Listos", value: ready, color: ready ? t.green : undefined, help: "Los que tienen todo (la ficha y los ángulos de venta): puedes adelantarlos ya." },
                { label: "En el taller", value: building.length > 1 ? plural(building.length, "producto", "productos") : building.length ? `${building[0].delivered} de ${building[0].of}` : "Libre",
                    help: "El producto nuevo que el equipo está haciendo ahora: cuántos batches de su testeo ya están en la banca." },
            ]} />
            {building.length > 0 && (
                <Typography sx={{ fontSize: 14, mt: 1.5, overflowWrap: "anywhere" }}>
                    El equipo está haciendo el testeo de {building.map((b) => `${b.product} (${b.delivered} de ${b.of} en la banca)`).join(", ")}. Si adelantas otro,
                    se suma a ese trabajo: lo de los productos que venden va primero.
                </Typography>
            )}

            <Section name="En cola" hint={data.queue.length ? "en el orden del dueño" : undefined}>
                {data.queue.length === 0 ? (
                    <Box sx={{ ...cardSx(t), p: "16px" }}>
                        <Typography sx={{ fontSize: 15, fontWeight: 600 }}>No hay productos nuevos en la cola</Typography>
                        <Typography sx={{ fontSize: 14, color: t.muted, mt: 0.5 }}>Cuando el dueño prepare uno, aparece aquí con su foto y su ficha.</Typography>
                    </Box>
                ) : (
                    <Box component="ol" aria-label="Productos nuevos, en el orden del dueño" sx={{ p: 0, m: 0 }}>
                        {data.queue.map((p) => <ProductCard key={p.product_id} p={p} onAdvance={() => { setCheer(null); setAdvancing(p); }} />)}
                    </Box>
                )}
            </Section>

            {advancing && (
                <AdvanceDialog item={asItem(advancing)} team={data.team} onClose={() => { setAdvancing(null); load(); }}
                    onDone={(m) => { setAdvancing(null); setCheer(m); notifyEditorChanged(); load(); }} />
            )}
        </>,
    );
};
