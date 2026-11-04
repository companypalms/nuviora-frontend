// src/pages/editor/BankPage.tsx
// .99 (dueño, 2026-11-04: "lo de la banca de creativos, queremos que a él le aparezca en el menú del lado izquierdo… que
// tranquilamente pueda ir, subir los batch que ya tenemos listos y ver lo que está en banca, lo que no está en banca"):
// la banca del editor líder (/editor/banca). Responde "¿qué tengo listo para lanzar y qué producto se queda sin nada?":
// - arriba, "Cargar un batch ya hecho" (los de antes del sistema, de Drive: entran directo a la banca);
// - el marcador (en banca, en Meta, productos sin banca);
// - cada producto en una línea (en banca, en camino, en Meta; los parados por el dueño, "En pausa" con lo suyo en espera),
//   y al tocarlo se ven solo los suyos;
// - los batches en la banca, los que están en Meta y, plegados, los probados o descartados de los últimos días.
// Sin dinero ni resultados.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Button, ButtonBase, Collapse, Link, Skeleton, Stack, Typography } from "@mui/material";
import { AddRounded, CheckCircleRounded, ReportProblemRounded } from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { Layout } from "../../components/ui/Layout";
import { useValidateSession } from "../../hooks/useValidateSession";
import { api, dateTime } from "../../components/meta-ads/metaAds";
import { EditorBatch, dueLabel, notifyEditorChanged, todayVe } from "../../components/meta-ads/editorShared";
import { BriefDetail } from "../../components/meta-ads/briefView";
import { DeliveriesList } from "../../components/meta-ads/editorWork";
import { ImportBatchDialog } from "../../components/meta-ads/importBatch";
import { appear, cardSx, geist, inkSx, tapSx, useTokens } from "../../components/ui/design";
import { Dot, Scoreboard, Section, TextAction } from "../../components/ui/designParts";

type BankProduct = { id: number; name: string; mode: string; mode_label: string; stopped: boolean; bank: number; meta: number; coming: number; held: number };
type BankData = { products: BankProduct[]; batches: EditorBatch[]; today: string; recent_days: number };

const angleOf = (b: EditorBatch) => b.angle_name ?? b.angle_code;

/** Un batch de la banca (o de Meta): qué es, de dónde salió y, plegado, todo el encargo y lo que se entregó. */
const BankRow: React.FC<{ b: EditorBatch; dot: string; sub: string; open: boolean; onToggle: () => void }> = ({ b, dot, sub, open, onToggle }) => {
    const t = useTokens();
    return (
        <Box sx={{ ...cardSx(t), p: "12px 14px", mb: 0.75 }}>
            <Stack direction="row" spacing={1.25} alignItems="flex-start">
                <Box sx={{ pt: "6px" }}><Dot color={dot} size={9} /></Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 500, overflowWrap: "anywhere" }}>
                        {b.code} · {b.product}{angleOf(b) ? ` · ${angleOf(b)}` : ""}
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: t.muted, overflowWrap: "anywhere" }}>{sub}</Typography>
                    <TextAction onClick={onToggle} aria-expanded={open} sx={{ fontSize: 13, color: t.muted, mt: 0.25 }}>{open ? "Ocultar" : "Ver el batch"}</TextAction>
                </Box>
            </Stack>
            <Collapse in={open} unmountOnExit>
                <Box sx={{ pl: { xs: 0, sm: 2.5 } }}>
                    <BriefDetail b={b} />
                    <DeliveriesList deliveries={b.deliveries} />
                </Box>
            </Collapse>
        </Box>
    );
};

/** Un producto en una línea: cuántos tiene en la banca, en camino y en Meta. Al tocarlo, se ven solo los suyos. */
const ProductLine: React.FC<{ p: BankProduct; on: boolean; onClick: () => void }> = ({ p, on, onClick }) => {
    const t = useTokens();
    const empty = !p.stopped && p.bank === 0;
    const parts = p.stopped
        ? [p.bank ? `${p.bank} en banca` : null, p.held ? `${p.held} en espera` : null]
        : [empty ? null : `${p.bank} en banca`, p.coming ? `${p.coming} en camino` : null, p.meta ? `${p.meta} en Meta` : null];
    return (
        <ButtonBase onClick={onClick} aria-pressed={on}
            sx={{ display: "flex", width: "100%", justifyContent: "flex-start", textAlign: "left", gap: 1.25, p: "10px 12px", minHeight: 52, borderRadius: "10px", mb: 0.75,
                border: `${on ? 2 : 1}px solid ${on ? t.ink : t.line}`, "&.Mui-focusVisible": { outline: `2px solid ${t.ink}`, outlineOffset: 2 } }}>
            <Dot color={p.stopped ? t.gray : empty ? t.amber : t.green} size={10} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 15, fontWeight: 500, overflowWrap: "anywhere" }}>{p.name}</Typography>
                <Typography sx={{ fontSize: 13, color: t.muted }}>
                    {[p.stopped ? `${p.mode_label}: el dueño lo paró` : empty ? "Sin nada en la banca" : null, ...parts].filter(Boolean).join(" · ")}
                </Typography>
            </Box>
        </ButtonBase>
    );
};

export const BankPage: React.FC = () => {
    const t = useTokens();
    const { loadingSession, isValid } = useValidateSession();
    const [data, setData] = useState<BankData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [product, setProduct] = useState<number | null>(null);
    const [openId, setOpenId] = useState<number | null>(null);
    const [showDone, setShowDone] = useState(false);
    const [importing, setImporting] = useState(false);
    const [cheer, setCheer] = useState<string | null>(null);

    const load = useCallback(() => {
        setError(null);
        api<BankData>("/editor/bank").then(setData).catch((e) => setError((e as Error).message));
    }, []);
    useEffect(() => { if (isValid) load(); }, [isValid, load]);

    const lists = useMemo(() => {
        const all = (data?.batches ?? []).filter((b) => product === null || b.product_id === product);
        return {
            bank: all.filter((b) => b.status === "bank"),
            meta: all.filter((b) => b.status === "testing"),
            done: all.filter((b) => b.status === "tested" || b.status === "discarded"),
        };
    }, [data, product]);

    const frame = (children: React.ReactNode) => (
        <Layout><Box sx={{ ...geist, maxWidth: 640, mx: "auto", px: { xs: 0, sm: 2 }, py: 2, color: t.ink }}>{children}</Box></Layout>
    );
    if (loadingSession || !isValid || (!data && !error)) {
        return frame(
            <Box aria-busy="true" aria-label="Cargando la banca">
                <Skeleton width={220} height={34} />
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, mt: 2 }}>{[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={58} />)}</Box>
                <Skeleton variant="rounded" height={52} sx={{ mt: 3 }} /><Skeleton variant="rounded" height={52} sx={{ mt: 1 }} />
            </Box>,
        );
    }
    if (!data) {
        return frame(
            <Box role="alert" sx={{ ...cardSx(t), p: 3 }}>
                <Stack direction="row" spacing={1} alignItems="center"><ReportProblemRounded sx={{ color: t.red }} />
                    <Typography sx={{ fontSize: 16, fontWeight: 600 }}>No se pudo abrir la banca</Typography></Stack>
                <Typography sx={{ fontSize: 14, color: t.muted, mt: 1 }}>Revisa tu conexión a internet y vuelve a intentar.</Typography>
                <Button variant="contained" disableElevation sx={{ ...inkSx(t), ...tapSx, mt: 2 }} onClick={load}>Reintentar</Button>
                <Typography sx={{ fontSize: 12, color: t.faint, mt: 2 }}>Detalle técnico: {error}</Typography>
            </Box>,
        );
    }
    const active = data.products.filter((p) => !p.stopped);
    const withoutBank = active.filter((p) => p.bank === 0).length;
    const chosen = data.products.find((p) => p.id === product) ?? null;
    const toggle = (id: number) => setOpenId((o) => (o === id ? null : id));
    const since = (b: EditorBatch) => (b.status_at ? dateTime(b.status_at) : null);

    return frame(
        <>
            <Typography component="h1" sx={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>Banca de creativos</Typography>
            <Typography sx={{ fontSize: 13, color: t.muted }}>Lo que está listo para lanzar en Meta, por producto · hoy {dueLabel(data.today ?? todayVe())}</Typography>
            {cheer && (
                <Box role="status" sx={{ mt: 2, p: "10px 14px", borderRadius: "8px", display: "flex", gap: 1, alignItems: "center", bgcolor: t.greenSoft, color: t.greenInk, ...appear }}>
                    <CheckCircleRounded sx={{ fontSize: 20 }} /><Typography sx={{ fontSize: 14, color: "inherit" }}>{cheer}</Typography>
                </Box>
            )}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }} sx={{ mt: 2 }}>
                <Button variant="contained" disableElevation startIcon={<AddRounded />} onClick={() => setImporting(true)} sx={{ ...inkSx(t), ...tapSx, whiteSpace: "nowrap", flexShrink: 0 }}>
                    Cargar un batch ya hecho
                </Button>
                <Typography sx={{ fontSize: 13, color: t.muted }}>Los de antes del sistema (de Drive): entran directo a la banca.</Typography>
            </Stack>
            <Scoreboard tiles={[
                { label: "En banca", value: data.batches.filter((b) => b.status === "bank").length, color: t.green, help: "Batches aprobados y listos: el dueño los lanza en Meta." },
                { label: "En Meta", value: data.batches.filter((b) => b.status === "testing").length, help: "Batches que ya se lanzaron y se están probando en Meta." },
                { label: "Sin banca", value: withoutBank, color: withoutBank ? t.amber : undefined, help: "Productos activos sin ningún batch en la banca." },
            ]} />

            <Section dot={t.ink} name="Por producto" hint={chosen ? undefined : "toca uno para ver solo los suyos"}>
                {data.products.length === 0 && <Typography sx={{ fontSize: 14, color: t.muted }}>Todavía no hay productos con campañas.</Typography>}
                {data.products.map((p) => <ProductLine key={p.id} p={p} on={product === p.id} onClick={() => setProduct((x) => (x === p.id ? null : p.id))} />)}
                {chosen && <TextAction onClick={() => setProduct(null)} sx={{ fontSize: 14 }}>Ver todos los productos</TextAction>}
            </Section>

            <Section dot={t.green} name={chosen ? `En banca: ${chosen.name}` : "En banca"} hint="listos para lanzar">
                {lists.bank.length === 0 ? (
                    <Typography sx={{ fontSize: 14, color: t.muted }}>
                        {chosen ? `${chosen.name} no tiene nada en la banca.` : "Nada en la banca todavía."} Cuando apruebes una entrega o cargues un batch ya hecho, aparece aquí.
                    </Typography>
                ) : lists.bank.map((b) => (
                    <BankRow key={b.id} b={b} dot={t.green} open={openId === b.id} onToggle={() => toggle(b.id)}
                        sub={[b.imported ? "Cargado de antes del sistema" : b.task?.title, b.editor ? `lo hizo ${b.editor}` : null, since(b) ? `en banca desde el ${since(b)}` : null]
                            .filter(Boolean).join(" · ")} />
                ))}
            </Section>

            <Section dot={t.ink} name="En Meta ahora" hint="ya se lanzaron">
                {lists.meta.length === 0 ? <Typography sx={{ fontSize: 14, color: t.muted }}>Nada en Meta{chosen ? ` de ${chosen.name}` : ""} ahora.</Typography>
                    : lists.meta.map((b) => (
                        <BankRow key={b.id} b={b} dot={t.ink} open={openId === b.id} onToggle={() => toggle(b.id)}
                            sub={[b.editor ? `Lo hizo ${b.editor}` : null, since(b) ? `en Meta desde el ${since(b)}` : null].filter(Boolean).join(" · ") || "En Meta"} />
                    ))}
            </Section>

            {lists.done.length > 0 && (
                <Box sx={{ mt: 3, fontSize: 14 }}>
                    <TextAction onClick={() => setShowDone((s) => !s)} aria-expanded={showDone} sx={{ color: t.muted }}>
                        {showDone ? "Ocultar los probados y descartados" : `Ver los probados y descartados de los últimos ${data.recent_days} días (${lists.done.length})`}
                    </TextAction>
                    <Collapse in={showDone} unmountOnExit>
                        <Box sx={{ mt: 1 }}>
                            {lists.done.map((b) => (
                                <BankRow key={b.id} b={b} dot={t.gray} open={openId === b.id} onToggle={() => toggle(b.id)}
                                    sub={`${b.status_label}${since(b) ? ` desde el ${since(b)}` : ""}`} />
                            ))}
                        </Box>
                    </Collapse>
                </Box>
            )}

            <Typography sx={{ fontSize: 13, color: t.muted, mt: 3 }}>
                Lo que falta asignar, hacer o revisar está en <Link component={RouterLink} to="/editor/equipo" sx={{ color: t.ink }}>Encargos del equipo</Link>.
                {" "}Cuando un producto tiene un batch en la banca, el sistema no pide otro de ese producto hasta que se lance.
            </Typography>
            <ImportBatchDialog open={importing} onClose={() => setImporting(false)}
                onDone={(code) => { setCheer(`${code} está en la banca.`); load(); notifyEditorChanged(); }} />
        </>,
    );
};
