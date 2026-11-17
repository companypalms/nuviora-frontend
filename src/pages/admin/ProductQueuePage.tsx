// src/pages/admin/ProductQueuePage.tsx
// .154 (dueño, 2026-11-17: "quiero tener una banca de productos por montar. Es decir, que yo vaya montando la estrategia de
// algunos productos, la imagen, etcétera, y el sistema automáticamente se lo vaya pasando al editor líder… siempre dándole
// prioridad a los batch de los productos que están activos actualmente, pero en cuanto tenga un chance, envía cada uno de
// esos productos por orden de cola"): "Productos por montar" (/meta-ads/por-montar). Responde "¿qué productos vienen y
// cuándo sale el siguiente?": el camino Cola → Taller → Listo para lanzar, con el marcador de los 3, lo que falta para que
// salga el siguiente y la cola en orden (Subir, Bajar, Ver ficha, Sacar). Que salga no lleva botón: lo decide el sistema.
import React, { useCallback, useEffect, useState } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Link, Skeleton, Stack, Tooltip, Typography, useMediaQuery, useTheme } from "@mui/material";
import { ArrowDownwardRounded, ArrowUpwardRounded, ReportProblemRounded } from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { useValidateSession } from "../../hooks/useValidateSession";
import { api, dateTime } from "../../components/meta-ads/metaAds";
import { appear, cardSx, geist, inkSx, lineSx, plural, tapSx, Tokens, useTokens } from "../../components/ui/design";
import { Dot, Scoreboard, Section, TextAction } from "../../components/ui/designParts";

type Queued = { product_id: number; product: string; position: number; missing: string[]; linked: boolean; angles: number; photos: number; photo_url: string | null; strategy: number };
type Building = { product_id: number; product: string; delivered: number; of: number };
type Ready = { product_id: number; product: string; of: number };
type Data = { queue: Queued[]; building: Building[]; ready: Ready[]; missing: string[]; checked_at: string | null; next: number | null; mission_product_id: number | null };

const fichaLink = (id: number) => `/admin/integraciones?seccion=meta&tab=profile&producto=${id}`;

/** La barra del taller: un tramo por batch del testeo, lleno cuando ya está en la banca. */
const Segments: React.FC<{ done: number; of: number; t: Tokens; label: string }> = ({ done, of, t, label }) => (
    <Box role="progressbar" aria-label={label} aria-valuenow={done} aria-valuemin={0} aria-valuemax={of} sx={{ display: "flex", gap: 0.5, mt: 1 }}>
        {Array.from({ length: of }, (_, i) => (
            <Box key={i} sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: i < done ? t.green : t.soft, transition: "background-color 200ms",
                "@media (prefers-reduced-motion: reduce)": { transition: "none" } }} />
        ))}
    </Box>
);

const QueueCard: React.FC<{ q: Queued; data: Data; busy: boolean; onMove: (dir: "up" | "down") => void; onRemove: () => void }> = ({ q, data, busy, onMove, onRemove }) => {
    const t = useTokens();
    const ready = q.missing.length === 0;
    const next = data.next === q.product_id;
    const last = q.position === data.queue.length;
    return (
        <Box component="li" sx={{ ...cardSx(t), ...appear, p: "12px 14px", mb: 1, listStyle: "none", borderColor: next ? t.ink : t.line }}>
            <Stack direction="row" spacing={1.25} alignItems="flex-start">
                <Box aria-hidden sx={{ flex: "none", width: 28, height: 28, borderRadius: "50%", bgcolor: next ? t.ink : t.soft, color: next ? t.onInk : t.muted,
                    fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", mt: "2px" }}>{q.position}</Box>
                {q.photo_url && <Box component="img" src={q.photo_url} alt="" sx={{ flex: "none", width: 44, height: 44, borderRadius: "8px", objectFit: "cover", border: `1px solid ${t.line}` }} />}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography component="h3" sx={{ fontSize: 15, fontWeight: 600, overflowWrap: "anywhere" }}>
                        <Box component="span" sx={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>Lugar {q.position}: </Box>
                        {q.product}
                    </Typography>
                    <Stack direction="row" columnGap={1.25} rowGap={0.25} flexWrap="wrap" sx={{ mt: 0.25, fontSize: 13, color: t.muted }}>
                        {next && <Box component="span" sx={{ fontWeight: 600, color: t.ink }}>{data.mission_product_id === q.product_id ? "Sale primero (es el de tu misión de esta semana)" : "Es el siguiente en salir"}</Box>}
                        <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}><Dot color={ready ? t.green : t.amber} size={8} />{ready ? "Listo para salir" : "Le falta algo"}</Box>
                        <span>{plural(q.angles, "ángulo", "ángulos")}</span>
                        <span>{q.photos > 0 ? plural(q.photos, "foto", "fotos") : "sin fotos"}</span>
                        {q.strategy > 0 && <span>con su estrategia</span>}
                        <span>{q.linked ? "con link de Shopify" : "sin link de Shopify (se pide antes de lanzar)"}</span>
                    </Stack>
                    {!ready && (
                        <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.25, fontSize: 13 }}>
                            {q.missing.map((m) => <li key={m}>{m}</li>)}
                        </Box>
                    )}
                    {!ready && <Typography sx={{ fontSize: 12, color: t.muted, mt: 0.25 }}>Mientras le falte, sale el siguiente de la cola.</Typography>}
                    <Stack direction="row" columnGap={2} rowGap={0.5} flexWrap="wrap" alignItems="center" sx={{ mt: 0.75, fontSize: 13 }}>
                        <Link component={RouterLink} to={fichaLink(q.product_id)} sx={{ color: t.ink, textUnderlineOffset: 3 }}>{ready ? "Ver la ficha" : "Completar la ficha"}</Link>
                        <TextAction onClick={onRemove} disabled={busy} sx={{ color: t.muted }}>Sacar de la cola</TextAction>
                    </Stack>
                </Box>
                <Stack spacing={0.5} sx={{ flex: "none" }}>
                    <Tooltip title="Subir un lugar"><span>
                        <IconButton aria-label={`Subir ${q.product} un lugar`} disabled={busy || q.position === 1} onClick={() => onMove("up")}
                            sx={{ border: `1px solid ${t.line}`, borderRadius: "10px", width: { xs: 44, sm: 36 }, height: { xs: 44, sm: 36 }, color: t.ink }}>
                            <ArrowUpwardRounded fontSize="small" />
                        </IconButton>
                    </span></Tooltip>
                    <Tooltip title="Bajar un lugar"><span>
                        <IconButton aria-label={`Bajar ${q.product} un lugar`} disabled={busy || last} onClick={() => onMove("down")}
                            sx={{ border: `1px solid ${t.line}`, borderRadius: "10px", width: { xs: 44, sm: 36 }, height: { xs: 44, sm: 36 }, color: t.ink }}>
                            <ArrowDownwardRounded fontSize="small" />
                        </IconButton>
                    </span></Tooltip>
                </Stack>
            </Stack>
        </Box>
    );
};

export const ProductQueuePage: React.FC = () => {
    const t = useTokens();
    const phone = useMediaQuery(useTheme().breakpoints.down("sm"));
    const { loadingSession, isValid } = useValidateSession();
    const [data, setData] = useState<Data | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [removing, setRemoving] = useState<Queued | null>(null);

    const load = useCallback(() => {
        setError(null);
        api<Data>("/meta/product-queue").then(setData).catch((e) => setError((e as Error).message));
    }, []);
    useEffect(() => { if (isValid) load(); }, [isValid, load]);

    const move = async (q: Queued, dir: "up" | "down") => {
        if (!data) return;
        // Respuesta inmediata: se mueve ya; si el servidor falla, vuelve como estaba
        const before = data;
        const ids = data.queue.map((x) => x.product_id);
        const i = ids.indexOf(q.product_id);
        const j = dir === "up" ? i - 1 : i + 1;
        if (j >= 0 && j < ids.length) {
            const queue = [...data.queue];
            [queue[i], queue[j]] = [queue[j], queue[i]];
            setData({ ...data, queue: queue.map((x, k) => ({ ...x, position: k + 1 })) });
        }
        setBusy(true);
        try {
            setData(await api<Data>(`/meta/product-queue/${q.product_id}/move`, "POST", { dir }));
        } catch (e) { setData(before); toast.error((e as Error).message); } finally { setBusy(false); }
    };

    const remove = async () => {
        if (!removing) return;
        setBusy(true);
        try {
            setData(await api<Data>(`/meta/product-queue/${removing.product_id}`, "DELETE"));
            toast.success(`${removing.product} salió de la cola.`);
            setRemoving(null);
        } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
    };

    const building = data?.building ?? [];
    const nextName = data?.queue.find((q) => q.product_id === data.next)?.product ?? null;
    // Lo que falta para que salga el siguiente: el taller (en vivo) y lo de la última revisión
    const waitFor = [
        ...building.map((b) => `El equipo está terminando ${b.product}: ${b.delivered} de ${b.of} batches del testeo en la banca.`),
        ...(data?.missing ?? []),
    ];

    return (
        <Layout>
            <Box sx={{ ...geist, color: t.ink, maxWidth: 640, mx: "auto", px: { xs: 0, sm: 1 }, py: 2, pb: 6 }}>
                <Typography component="h1" sx={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>Productos por montar</Typography>
                <Typography sx={{ fontSize: 14, color: t.muted, mt: 0.5 }}>
                    Prepara aquí tus productos nuevos: dile a tu asistente «Producto nuevo: X» con su estrategia, sus fotos y el link de Shopify, y entra al final
                    de la cola. El sistema se los pasa solo al editor líder, uno a la vez y en orden, en cuanto el equipo tiene chance: lo de los productos
                    activos siempre va primero.
                </Typography>

                {error && !data ? (
                    <Box role="alert" sx={{ ...cardSx(t), p: 3, mt: 2.5 }}>
                        <Stack direction="row" spacing={1} alignItems="center"><ReportProblemRounded sx={{ color: t.red }} />
                            <Typography sx={{ fontSize: 16, fontWeight: 600 }}>No se pudo abrir la cola</Typography></Stack>
                        <Button variant="contained" disableElevation sx={{ ...inkSx(t), ...tapSx, mt: 2 }} onClick={load}>Reintentar</Button>
                        <Typography sx={{ fontSize: 12, color: t.faint, mt: 2 }}>Detalle técnico: {error}</Typography>
                    </Box>
                ) : loadingSession || !data ? (
                    <Box aria-busy="true" aria-label="Cargando la cola">
                        <Skeleton variant="rounded" height={64} sx={{ mt: 2 }} />
                        {[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={110} sx={{ mt: 1 }} />)}
                    </Box>
                ) : (
                    <>
                        <Scoreboard tiles={[
                            { label: "En cola", value: data.queue.length, help: "Los productos que preparaste y esperan su turno para llegarle al editor líder." },
                            { label: "En el taller", value: building.length > 1 ? plural(building.length, "producto", "productos") : building.length ? `${building[0].delivered} de ${building[0].of}` : "Libre",
                                help: "El producto nuevo que el equipo está haciendo ahora: cuántos batches de su testeo ya están en la banca." },
                            { label: "Listos para lanzar", value: data.ready.length, color: data.ready.length ? t.green : undefined,
                                help: "Productos nuevos con todos los batches del testeo en la banca: te esperan en «Lanza el testeo» de tu Análisis del día." },
                        ]} />

                        {data.queue.length > 0 && (
                            <Box role="status" sx={{ ...cardSx(t), ...appear, p: "14px 16px", mt: 2 }}>
                                <Typography sx={{ fontSize: 13, color: t.muted }}>El siguiente en salir</Typography>
                                <Typography sx={{ fontSize: 18, fontWeight: 600, mt: 0.25, overflowWrap: "anywhere" }}>{nextName ?? "Ninguno está listo todavía"}</Typography>
                                {waitFor.length > 0 ? (
                                    <>
                                        <Typography sx={{ fontSize: 14, mt: 0.75 }}>Ahora lo frena:</Typography>
                                        <Box component="ul" sx={{ m: 0, mt: 0.25, pl: 2.25, fontSize: 14 }}>{waitFor.map((w) => <li key={w}>{w}</li>)}</Box>
                                        <Typography sx={{ fontSize: 14, mt: 0.5 }}>Cuando no quede nada de esto, sale solo.</Typography>
                                    </>
                                ) : nextName ? (
                                    <Typography sx={{ fontSize: 14, mt: 0.75 }}>Nada lo frena: sale en la próxima revisión.</Typography>
                                ) : null}
                                <Typography sx={{ fontSize: 12, color: t.muted, mt: 1 }}>
                                    Se revisa cada madrugada, cada vez que un batch del testeo entra a la banca y cada vez que agregas un producto
                                    {data.checked_at ? ` · última revisión: ${dateTime(data.checked_at)} (hora de Venezuela)` : ""}. Cuando sale, te avisa en la campanita.
                                </Typography>
                            </Box>
                        )}

                        {building.length > 0 && (
                            <Section name="En el taller" hint="Lo hace el equipo ahora">
                                {building.map((b) => (
                                    <Box key={b.product_id} sx={{ ...cardSx(t), ...appear, p: "12px 14px", mb: 1 }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
                                            <Typography component="h3" sx={{ fontSize: 15, fontWeight: 600, overflowWrap: "anywhere" }}>{b.product}</Typography>
                                            <Typography sx={{ fontSize: 13, color: t.muted, whiteSpace: "nowrap" }}>{b.delivered} de {b.of} en la banca</Typography>
                                        </Stack>
                                        <Segments done={b.delivered} of={b.of} t={t} label={`Batches del testeo de ${b.product} en la banca`} />
                                        <Typography sx={{ fontSize: 13, color: t.muted, mt: 0.75 }}>Cuando estén todos, te sale «Lanza el testeo» en tu Análisis del día.</Typography>
                                    </Box>
                                ))}
                            </Section>
                        )}

                        {data.ready.length > 0 && (
                            <Section dot={t.green} name="Listos para lanzar" hint="Te esperan a ti">
                                {data.ready.map((r) => (
                                    <Box key={r.product_id} sx={{ ...cardSx(t), ...appear, p: "12px 14px", mb: 1 }}>
                                        <Typography component="h3" sx={{ fontSize: 15, fontWeight: 600, overflowWrap: "anywhere" }}>{r.product}</Typography>
                                        <Typography sx={{ fontSize: 13, color: t.muted, mt: 0.25 }}>
                                            Los {r.of} batches del testeo están en la banca.{" "}
                                            <Link component={RouterLink} to="/meta-ads/analisis" sx={{ color: t.ink, textUnderlineOffset: 3 }}>Lánzalo desde tu Análisis del día</Link>
                                        </Typography>
                                    </Box>
                                ))}
                            </Section>
                        )}

                        <Section name="En cola" hint={data.queue.length ? "En el orden en que salen" : undefined}>
                            {data.queue.length === 0 ? (
                                <Box sx={{ ...cardSx(t), p: "16px" }}>
                                    <Typography sx={{ fontSize: 15, fontWeight: 600 }}>Tu cola está vacía</Typography>
                                    <Typography sx={{ fontSize: 14, color: t.muted, mt: 0.5 }}>
                                        Dile a tu asistente «Producto nuevo: X» con su estrategia, sus fotos y el link de Shopify: entra aquí solo. También puedes poner un
                                        producto «En cola» desde su ficha.
                                    </Typography>
                                </Box>
                            ) : (
                                <Box component="ol" aria-label="Productos en cola, en el orden en que salen" sx={{ p: 0, m: 0 }}>
                                    {data.queue.map((q) => (
                                        <QueueCard key={q.product_id} q={q} data={data} busy={busy} onMove={(dir) => move(q, dir)} onRemove={() => setRemoving(q)} />
                                    ))}
                                </Box>
                            )}
                        </Section>
                    </>
                )}
            </Box>

            <Dialog open={!!removing} onClose={busy ? undefined : () => setRemoving(null)} fullScreen={phone} fullWidth maxWidth="xs" PaperProps={{ sx: { ...geist, borderRadius: phone ? 0 : "12px" } }}>
                {removing && (
                    <>
                        <DialogTitle sx={{ pb: 1 }}>
                            <Typography component="span" sx={{ display: "block", fontSize: 20, fontWeight: 600 }}>Sacar {removing.product} de la cola</Typography>
                        </DialogTitle>
                        <DialogContent dividers sx={{ borderColor: t.line }}>
                            <Typography sx={{ fontSize: 14, overflowWrap: "anywhere" }}>
                                Ya no le llega al editor líder. Su ficha, sus fotos y su estrategia se quedan guardadas: para volver a ponerlo, elige «En cola» en su ficha
                                o díselo a tu asistente.
                            </Typography>
                            {data?.mission_product_id === removing.product_id && (
                                <Typography sx={{ fontSize: 14, mt: 1 }}>Es el de tu misión de esta semana: la misión toma el siguiente de la cola.</Typography>
                            )}
                        </DialogContent>
                        <DialogActions sx={{ px: 3, py: 1.5 }}>
                            <Button onClick={() => setRemoving(null)} disabled={busy} sx={{ ...lineSx(t), ...tapSx }} variant="outlined">Cancelar</Button>
                            <Button onClick={remove} disabled={busy} variant="contained" disableElevation sx={{ ...inkSx(t), ...tapSx }}>{busy ? "Sacando…" : "Sacar de la cola"}</Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Layout>
    );
};
