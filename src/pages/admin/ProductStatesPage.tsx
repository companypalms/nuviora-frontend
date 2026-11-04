// src/pages/admin/ProductStatesPage.tsx
// .99 (dueño, 2026-11-04: "necesito que sea mucho más fácil pausarlo y reactivarlo, o colocarlo en liquidación… no conseguí
// la pantalla que me dijiste"): "Pausar o activar productos" (/meta-ads/productos, en el menú de Meta Ads). Cada producto
// con su estado y botones grandes (Activo, En pausa, Liquidación, Abandonado); al tocar uno, la ventana dice qué va a
// pasar (qué encargos quedan en espera o vuelven) y se confirma. Lo mismo se le puede pedir al asistente.
import React, { useCallback, useEffect, useState } from "react";
import { Box, Button, ButtonBase, Dialog, DialogActions, DialogContent, DialogTitle, Skeleton, Stack, TextField, Typography, useMediaQuery, useTheme } from "@mui/material";
import { ReportProblemRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { useValidateSession } from "../../hooks/useValidateSession";
import { api, dateTime } from "../../components/meta-ads/metaAds";
import { cardSx, geist, inkSx, lineSx, plural, tapSx, Tokens, useTokens } from "../../components/ui/design";
import { Dot } from "../../components/ui/designParts";

type Task = { id: number; code: string | null; status: string; status_label: string; editor: string | null };
type Product = {
    id: number; name: string; campaigns: number; active_campaigns: number; mode: string; note: string | null;
    updated_by: string | null; updated_at: string | null; tasks: Task[];
};
type Data = { modes: string[]; labels: Record<string, string>; help: Record<string, string>; products: Product[] };

const ORDER = ["normal", "paused", "liquidation", "abandoned"];
const stopped = (mode: string) => mode !== "normal";
const color = (t: Tokens, mode: string) => (mode === "normal" ? t.green : mode === "liquidation" ? t.amber : t.gray);
const verb: Record<string, string> = { normal: "Reactivar", paused: "Pausar", liquidation: "Poner en liquidación", abandoned: "Abandonar" };

/** "B0100 (lo tiene Eva) y B0105 (sin asignar)". */
const tasksText = (tasks: Task[]) => {
    const parts = tasks.map((x) => `${x.code ?? "un encargo"} (${x.status === "review" ? "por revisar" : x.editor ? `lo tiene ${x.editor}` : "sin asignar"})`);
    return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}` : parts[0] ?? "";
};
/** Lo que va a pasar (lo mismo que dice el servidor al cambiarlo, ProductModes::effect). */
const effect = (from: string, to: string, tasks: Task[]) => {
    const list = tasks.length ? tasksText(tasks) : null;
    if (stopped(to) && !stopped(from)) return `Deja de pedir encargos para este producto.${list ? ` Quedan en espera (salen de las listas de los editores): ${list}.` : ""}`;
    if (!stopped(to)) return `Vuelve a recibir encargos cuando haga falta.${list ? ` Vuelven a las listas, con fecha nueva: ${list}.` : ""}`;
    return "Sigue sin recibir encargos.";
};

const ProductCard: React.FC<{ p: Product; data: Data; onPick: (mode: string) => void }> = ({ p, data, onPick }) => {
    const t = useTokens();
    return (
        <Box sx={{ ...cardSx(t), p: "14px 16px", mb: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center">
                <Dot color={color(t, p.mode)} size={10} />
                <Typography component="h2" sx={{ fontSize: 16, fontWeight: 600, flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{p.name}</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: stopped(p.mode) ? t.muted : t.greenInk }}>{data.labels[p.mode] ?? p.mode}</Typography>
            </Stack>
            <Typography sx={{ fontSize: 13, color: t.muted, mt: 0.25 }}>
                {plural(p.active_campaigns, "campaña activa", "campañas activas")}
                {p.updated_by ? ` · lo cambió ${p.updated_by}${p.updated_at ? ` (${dateTime(p.updated_at)})` : ""}` : ""}
            </Typography>
            {p.note && <Typography sx={{ fontSize: 13, color: t.muted, overflowWrap: "anywhere" }}>Nota: {p.note}</Typography>}
            {p.tasks.length > 0 && (
                <Typography sx={{ fontSize: 13, mt: 0.5, color: stopped(p.mode) ? t.muted : t.ink, overflowWrap: "anywhere" }}>
                    {stopped(p.mode) ? "En espera (no salen en ninguna lista): " : "Encargos en curso: "}{tasksText(p.tasks)}
                </Typography>
            )}
            <Box role="radiogroup" aria-label={`Estado de ${p.name}`} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" }, gap: 0.75, mt: 1.25 }}>
                {ORDER.filter((m) => data.modes.includes(m)).map((m) => {
                    const on = p.mode === m;
                    return (
                        <ButtonBase key={m} role="radio" aria-checked={on} onClick={() => !on && onPick(m)}
                            sx={{ minHeight: 44, px: 1, borderRadius: "10px", fontSize: 14, fontWeight: on ? 600 : 500, gap: 0.75,
                                border: `${on ? 2 : 1}px solid ${on ? t.ink : t.line}`, bgcolor: on ? t.soft : "transparent", color: t.ink,
                                "&.Mui-focusVisible": { outline: `2px solid ${t.ink}`, outlineOffset: 2 } }}>
                            <Dot color={color(t, m)} size={8} />{data.labels[m] ?? m}
                        </ButtonBase>
                    );
                })}
            </Box>
        </Box>
    );
};

export const ProductStatesPage: React.FC = () => {
    const t = useTokens();
    const phone = useMediaQuery(useTheme().breakpoints.down("sm"));
    const { loadingSession, isValid } = useValidateSession();
    const [data, setData] = useState<Data | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pick, setPick] = useState<{ p: Product; mode: string } | null>(null);
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => {
        setError(null);
        api<Data>("/meta/product-modes").then(setData).catch((e) => setError((e as Error).message));
    }, []);
    useEffect(() => { if (isValid) load(); }, [isValid, load]);

    const save = async () => {
        if (!pick) return;
        setBusy(true);
        try {
            const r = await api<{ message: string }>(`/meta/product-modes/${pick.p.id}`, "PUT", { mode: pick.mode, ...(note.trim() ? { note: note.trim() } : {}) });
            toast.success(r.message);
            setPick(null);
            load();
        } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
    };

    return (
        <Layout>
            <Box sx={{ ...geist, color: t.ink, maxWidth: 640, mx: "auto", px: { xs: 0, sm: 1 }, py: 2, pb: 6 }}>
                <Typography component="h1" sx={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>Pausar o activar productos</Typography>
                <Typography sx={{ fontSize: 14, color: t.muted, mt: 0.5 }}>
                    Si un producto se queda sin stock, páusalo aquí o díselo a tu asistente («pausa el Comprimax, no hay stock»). Parado, no se escala, no se le
                    piden encargos y lo que los editores tenían de ese producto queda en espera: vuelve solo cuando lo reactives.
                </Typography>
                {data && (
                    <Box component="dl" sx={{ m: 0, mt: 1.5, display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 1.25, rowGap: 0.5, fontSize: 13 }}>
                        {ORDER.filter((m) => data.modes.includes(m)).map((m) => (
                            <React.Fragment key={m}>
                                <Box component="dt" sx={{ display: "flex", alignItems: "center", gap: 0.75, fontWeight: 600 }}><Dot color={color(t, m)} size={8} />{data.labels[m]}</Box>
                                <Box component="dd" sx={{ m: 0, color: t.muted }}>{data.help[m]}</Box>
                            </React.Fragment>
                        ))}
                    </Box>
                )}

                <Box sx={{ mt: 2.5 }}>
                    {error && !data ? (
                        <Box role="alert" sx={{ ...cardSx(t), p: 3 }}>
                            <Stack direction="row" spacing={1} alignItems="center"><ReportProblemRounded sx={{ color: t.red }} />
                                <Typography sx={{ fontSize: 16, fontWeight: 600 }}>No se pudieron abrir los productos</Typography></Stack>
                            <Button variant="contained" disableElevation sx={{ ...inkSx(t), ...tapSx, mt: 2 }} onClick={load}>Reintentar</Button>
                            <Typography sx={{ fontSize: 12, color: t.faint, mt: 2 }}>Detalle técnico: {error}</Typography>
                        </Box>
                    ) : loadingSession || !data ? (
                        <Box aria-busy="true" aria-label="Cargando los productos">{[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={150} sx={{ mb: 1 }} />)}</Box>
                    ) : data.products.length === 0 ? (
                        <Typography sx={{ fontSize: 14, color: t.muted }}>Todavía no hay productos con campañas de Meta.</Typography>
                    ) : data.products.map((p) => <ProductCard key={p.id} p={p} data={data} onPick={(mode) => { setNote(""); setPick({ p, mode }); }} />)}
                </Box>
            </Box>

            <Dialog open={!!pick} onClose={busy ? undefined : () => setPick(null)} fullScreen={phone} fullWidth maxWidth="xs" PaperProps={{ sx: { ...geist, borderRadius: phone ? 0 : "12px" } }}>
                {pick && data && (
                    <>
                        <DialogTitle sx={{ pb: 1 }}>
                            <Typography component="span" sx={{ display: "block", fontSize: 20, fontWeight: 600 }}>{verb[pick.mode] ?? "Cambiar"} {pick.p.name}</Typography>
                            <Typography component="span" sx={{ display: "block", fontSize: 13, color: t.muted }}>
                                Ahora: {data.labels[pick.p.mode]} → queda: {data.labels[pick.mode]}
                            </Typography>
                        </DialogTitle>
                        <DialogContent dividers sx={{ borderColor: t.line }}>
                            <Typography sx={{ fontSize: 15, fontWeight: 500 }}>Qué va a pasar</Typography>
                            <Typography sx={{ fontSize: 14, mt: 0.5, overflowWrap: "anywhere" }}>{effect(pick.p.mode, pick.mode, pick.p.tasks)}</Typography>
                            <Typography sx={{ fontSize: 13, color: t.muted, mt: 1 }}>{data.help[pick.mode]}</Typography>
                            <TextField label="¿Por qué? (opcional)" placeholder="Por ejemplo: sin stock del proveedor" value={note} onChange={(e) => setNote(e.target.value)}
                                inputProps={{ maxLength: 255 }} fullWidth size="small" sx={{ mt: 2 }} />
                        </DialogContent>
                        <DialogActions sx={{ px: 3, py: 1.5 }}>
                            <Button onClick={() => setPick(null)} disabled={busy} sx={{ ...lineSx(t), ...tapSx }} variant="outlined">Cancelar</Button>
                            <Button onClick={save} disabled={busy} variant="contained" disableElevation sx={{ ...inkSx(t), ...tapSx }}>
                                {busy ? "Guardando…" : `${verb[pick.mode] ?? "Cambiar"} ${pick.p.name}`}
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Layout>
    );
};
