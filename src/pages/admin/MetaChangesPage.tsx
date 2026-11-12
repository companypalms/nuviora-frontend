// src/pages/admin/MetaChangesPage.tsx
// .131 (dueño, 2026-11-10: "necesito que cada cambio de Meta Ads tenga una hipótesis que se guarda en un historial. De esta
// manera podemos ver si la hipótesis se cumplió o no se cumplió con el cambio"). Meta Ads › Historial de cambios: cada cambio
// que el sistema vio en Meta (sin que el dueño anote nada), con su hipótesis, quién lo pidió, los números de antes y de
// después, y si se cumplió. Arriba el marcador de aciertos y cada tipo de cambio; el dueño le puede dejar una nota a cada uno.
// Solo el Admin. Las reglas, en el backend (Meta/Changes/ChangeRules.php).
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Button, ButtonBase, CircularProgress, MenuItem, Skeleton, Stack, TextField, Typography } from "@mui/material";
import { ReportProblemRounded } from "@mui/icons-material";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { useValidateSession } from "../../hooks/useValidateSession";
import { api, dateTime, fmt } from "../../components/meta-ads/metaAds";
import { todayVe } from "../../components/meta-ads/editorShared";
import { appear, cardSx, geist, inkSx, lineSx, plural, tapSx, Tokens, useTokens } from "../../components/ui/design";
import { Dot, Scoreboard, Section, TextAction } from "../../components/ui/designParts";

type Result = "measuring" | "met" | "not_met" | "unknown" | "not_measured";
type Numbers = { from: string; to: string; days: number; spend: number; purchases: number; cpa: number | null; per_day: number; gain_day: number | null;
    /** .140: un cambio de precio se mide con los pedidos del producto (PriceChangeRules). */
    orders_day?: number; effectiveness?: number | null };
type Change = {
    id: number; kind: string; kind_label: string; big: boolean; date: string; changed_at: string | null; product_id: number | null; product: string | null;
    city: string | null; campaign: string | null; what: string; mission: { date: string; kind: string; title: string | null; done: string | null } | null;
    hypothesis: string | null; criterion: string | null; c: number | null; be: number | null; before: Numbers | null; after: Numbers | null;
    result: Result; result_label: string; result_text: string | null; note: string | null;
};
type KindScore = { kind: string; label: string; met: number; not_met: number; measuring: number; unknown: number; total: number };
type Data = {
    score: { met: number; not_met: number; measuring: number; unknown: number; not_measured: number; total: number; by_kind: KindScore[] };
    changes: Change[]; products: { id: number; name: string }[]; cities: string[]; kinds: Record<string, string>; results: Record<Result, string>;
    refreshed_at: string | null; refresh_error: string | null;
};

/** El color de cada resultado (siempre con su palabra al lado). */
const RESULT_COLOR = (t: Tokens): Record<Result, string> => ({ met: t.green, not_met: t.red, measuring: t.amber, unknown: t.gray, not_measured: t.gray });
const RESULT_FILTERS: { key: Result | ""; label: string }[] = [
    { key: "", label: "Todos" }, { key: "met", label: "Se cumplió" }, { key: "not_met", label: "No se cumplió" }, { key: "measuring", label: "Midiendo" },
    { key: "unknown", label: "No se puede saber" },
];

const short = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const dayLabel = (d: string) => {
    const today = todayVe();
    const y = new Date(`${today}T12:00:00Z`);
    y.setUTCDate(y.getUTCDate() - 1);
    if (d === today) return "Hoy";
    if (d === y.toISOString().slice(0, 10)) return "Ayer";
    const w = new Date(`${d}T12:00:00Z`).toLocaleDateString("es-VE", { weekday: "long", timeZone: "UTC" });
    return `${w.charAt(0).toUpperCase()}${w.slice(1)} ${short(d)}`;
};
const range = (n: Numbers) => n.days === 1 ? `el ${short(n.from)}` : `del ${short(n.from)} al ${short(n.to)}`;

/** Antes y después, en una tabla chica: gasto, compras, CPA y lo que deja por día. .140: un precio, con los pedidos del producto. */
const NumbersTable: React.FC<{ before: Numbers | null; after: Numbers | null; price?: boolean }> = ({ before, after, price = false }) => {
    const t = useTokens();
    const cols = [before && { name: `Antes (${range(before)})`, n: before }, after && { name: `Después (${range(after)})`, n: after }].filter(Boolean) as { name: string; n: Numbers }[];
    if (!cols.length) return null;
    const gain = { label: price ? "Ganancia por día" : "Deja por día", v: (n: Numbers) => n.gain_day === null ? "—" : n.gain_day < 0 ? `−${fmt.money(-n.gain_day)}` : fmt.money(n.gain_day),
        color: (n: Numbers) => n.gain_day !== null && n.gain_day < 0 ? t.red : undefined };
    const rows: { label: string; v: (n: Numbers) => string; color?: (n: Numbers) => string | undefined }[] = price ? [
        { label: "Pedidos por día", v: (n) => fmt.num(n.orders_day ?? 0) },
        { label: "Efectividad", v: (n) => n.effectiveness == null ? "—" : `${n.effectiveness.toLocaleString("es-VE", { maximumFractionDigits: 1 })} %` },
        { label: "CPA de Meta", v: (n) => n.cpa === null ? "Sin compras" : fmt.money(n.cpa) },
        gain,
    ] : [
        { label: "Gasto", v: (n) => fmt.money(n.spend) },
        { label: "Compras", v: (n) => fmt.num(n.purchases) },
        { label: "CPA", v: (n) => n.cpa === null ? "Sin compras" : fmt.money(n.cpa) },
        ...(cols.some((c) => c.n.gain_day !== null) ? [gain] : []),
    ];
    return (
        <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", mt: 1, fontSize: 13, "& td, & th": { py: 0.5, pr: 1, textAlign: "left", verticalAlign: "top" },
            "& th": { color: t.muted, fontWeight: 500 }, "& tr + tr td": { borderTop: `1px solid ${t.line}` } }}>
            {/* .140: "1px" (en MUI, width: 1 es el 100 %: la página se salía de lado al ver los números) */}
            <thead><tr><th scope="col"><Box component="span" sx={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0 0 0 0)" }}>Número</Box></th>
                {cols.map((c) => <th key={c.name} scope="col">{c.name}</th>)}</tr></thead>
            <tbody>
                {rows.map((r) => (
                    <tr key={r.label}><td style={{ color: t.muted }}>{r.label}</td>
                        {cols.map((c) => <td key={c.name} style={{ color: r.color?.(c.n) ?? t.ink, fontWeight: 600 }}>{r.v(c.n)}</td>)}</tr>
                ))}
            </tbody>
        </Box>
    );
};

/** Un cambio: qué fue, la hipótesis, si se cumplió, quién lo pidió, los números y la nota del dueño. */
const ChangeCard: React.FC<{ c: Change; onNote: (id: number, note: string | null) => Promise<void> }> = ({ c, onNote }) => {
    const t = useTokens();
    const color = RESULT_COLOR(t)[c.result];
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [note, setNote] = useState(c.note ?? "");
    const [saving, setSaving] = useState(false);
    const save = async () => {
        setSaving(true);
        try {
            await onNote(c.id, note.trim() || null);
            setEditing(false);
        } finally {
            setSaving(false);
        }
    };
    return (
        <Box component="article" sx={{ ...cardSx(t), p: { xs: 1.75, sm: 2 }, mb: 1, borderLeft: `3px solid ${color}`, ...appear }}>
            <Stack direction="row" columnGap={1} rowGap={0.25} alignItems="center" flexWrap="wrap">
                <Dot color={color} />
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: c.result === "unknown" || c.result === "not_measured" ? t.muted : color }}>{c.result_label}</Typography>
                <Typography sx={{ fontSize: 13, color: t.muted }}>· {c.kind_label}{c.city ? ` · ${c.city}` : ""}</Typography>
            </Stack>
            <Typography component="h3" sx={{ fontSize: 16, fontWeight: 600, mt: 0.5, overflowWrap: "anywhere" }}>{c.what}</Typography>
            <Typography sx={{ fontSize: 13, color: t.muted, overflowWrap: "anywhere" }}>
                {[c.product, c.campaign].filter(Boolean).join(" · ")}
                {c.kind === "price" ? ` · desde el ${short(c.date)} (en los pedidos)` : c.changed_at ? ` · ${dateTime(c.changed_at)}` : ""}
            </Typography>
            {c.hypothesis && (
                <Typography sx={{ fontSize: 14, mt: 1, overflowWrap: "anywhere" }}><Box component="span" sx={{ fontWeight: 600 }}>Hipótesis: </Box>{c.hypothesis}</Typography>
            )}
            {c.result_text && (
                <Typography sx={{ fontSize: 14, mt: 0.75, overflowWrap: "anywhere", color: c.result === "not_met" ? t.red : c.result === "met" ? t.greenInk : t.ink,
                    bgcolor: c.result === "met" ? t.greenSoft : "transparent", borderRadius: "6px", px: c.result === "met" ? 1 : 0, py: c.result === "met" ? 0.5 : 0 }}>
                    {c.result_text}
                </Typography>
            )}
            <Typography sx={{ fontSize: 13, color: t.muted, mt: 0.75, overflowWrap: "anywhere" }}>
                {c.mission ? <>Lo pidió el análisis del {short(c.mission.date)}{c.mission.title ? <>: «{c.mission.title}»</> : null}
                    {c.mission.done === "done" ? " · lo marcaste hecho" : c.mission.done === "disagree" ? " · dijiste que no estabas de acuerdo" : ""}</>
                    : "Lo hiciste por tu cuenta (ninguna misión lo pedía)."}
            </Typography>
            {c.note && !editing && <Typography sx={{ fontSize: 14, mt: 0.75, overflowWrap: "anywhere" }}><Box component="span" sx={{ fontWeight: 600 }}>Tu nota: </Box>{c.note}</Typography>}
            {editing ? (
                <Box sx={{ mt: 1 }}>
                    <TextField fullWidth size="small" multiline minRows={2} label="Tu nota (por qué lo hiciste, qué viste)" value={note} inputProps={{ maxLength: 500 }}
                        onChange={(e) => setNote(e.target.value)} autoFocus />
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Button variant="contained" disableElevation sx={{ ...inkSx(t), ...tapSx }} onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
                        <Button variant="outlined" sx={{ ...lineSx(t), ...tapSx }} onClick={() => { setEditing(false); setNote(c.note ?? ""); }}>Cancelar</Button>
                    </Stack>
                </Box>
            ) : null}
            <Stack direction="row" columnGap={2} rowGap={0.5} flexWrap="wrap" sx={{ mt: 1, fontSize: 13 }}>
                {(c.before || c.after || c.criterion) && (
                    <TextAction onClick={() => setOpen((v) => !v)} aria-expanded={open} sx={{ minHeight: { xs: 40, sm: "auto" } }}>{open ? "Ocultar los números" : "Ver los números"}</TextAction>
                )}
                {!editing && <TextAction onClick={() => setEditing(true)} sx={{ minHeight: { xs: 40, sm: "auto" } }}>{c.note ? "Cambiar la nota" : "Agregar una nota"}</TextAction>}
            </Stack>
            {open && (
                <Box sx={{ mt: 0.5 }}>
                    {c.criterion && <Typography sx={{ fontSize: 13, color: t.muted }}>{c.criterion}</Typography>}
                    {(c.c !== null || c.be !== null) && (
                        <Typography sx={{ fontSize: 13, color: t.muted }}>Ese día tu C era {fmt.money(c.c)} y tu BE {fmt.money(c.be)}.</Typography>
                    )}
                    <NumbersTable before={c.before} after={c.after} price={c.kind === "price"} />
                </Box>
            )}
        </Box>
    );
};

/** Cada tipo de cambio: cuántos se cumplieron de los medidos, con su barra. Tocarlo filtra la lista. */
const KindRow: React.FC<{ k: KindScore; active: boolean; onPick: () => void }> = ({ k, active, onPick }) => {
    const t = useTokens();
    const measured = k.met + k.not_met;
    return (
        <ButtonBase onClick={onPick} aria-pressed={active} sx={{ display: "block", width: "100%", textAlign: "left", py: 1, px: 1.25, borderRadius: "8px",
            bgcolor: active ? t.soft : "transparent", "&.Mui-focusVisible": { outline: `2px solid ${t.ink}` }, ...tapSx }}>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline" columnGap={1} flexWrap="wrap">
                <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{k.label}</Typography>
                <Typography sx={{ fontSize: 13, color: t.muted }}>
                    {measured ? `${k.met} de ${measured} se cumplieron` : "Nada medido todavía"}{k.measuring ? ` · ${k.measuring} midiendo` : ""}
                </Typography>
            </Stack>
            <Box aria-hidden sx={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", bgcolor: t.soft, mt: 0.75 }}>
                {k.met > 0 && <Box sx={{ flex: k.met, bgcolor: t.green }} />}
                {k.not_met > 0 && <Box sx={{ flex: k.not_met, bgcolor: t.red }} />}
                {k.measuring > 0 && <Box sx={{ flex: k.measuring, bgcolor: t.amber }} />}
                {k.unknown > 0 && <Box sx={{ flex: k.unknown, bgcolor: t.gray }} />}
            </Box>
        </ButtonBase>
    );
};

const PageSkeleton: React.FC = () => (
    <Box aria-busy="true" aria-label="Cargando el historial">
        <Skeleton variant="text" width={240} height={36} />
        <Skeleton variant="rounded" height={64} sx={{ mt: 2, mb: 3, borderRadius: "8px" }} />
        {[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={120} sx={{ mb: 1, borderRadius: "10px" }} />)}
    </Box>
);

export const MetaChangesPage: React.FC = () => {
    const t = useTokens();
    const { loadingSession, isValid } = useValidateSession();
    // .132: desde una misión del análisis llega ya filtrado ("Ver el historial": ese tipo de cambio, ese producto y esa ciudad)
    const [params] = useSearchParams();
    const [data, setData] = useState<Data | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [productId, setProductId] = useState<number | "">(params.get("product_id") ? Number(params.get("product_id")) : "");
    const [city, setCity] = useState(params.get("city") ?? "");
    const [kind, setKind] = useState(params.get("kind") ?? "");
    const [result, setResult] = useState<Result | "">("");
    const [refreshing, setRefreshing] = useState(false);
    const [slow, setSlow] = useState(false);

    const load = useCallback(async (fresh = false) => {
        const q = new URLSearchParams();
        if (productId !== "") q.set("product_id", String(productId));
        if (city) q.set("city", city);
        if (kind) q.set("kind", kind);
        if (result) q.set("result", result);
        if (fresh) q.set("fresh", "1");
        setError(null);
        try {
            setData(await api<Data>(`/meta/changes${q.toString() ? `?${q}` : ""}`));
        } catch (e) {
            setError((e as Error).message);
        }
    }, [productId, city, kind, result]);
    useEffect(() => { if (isValid) load(); }, [isValid, load]);
    useEffect(() => {
        if (data || error) return;
        const id = setTimeout(() => setSlow(true), 8000);
        return () => clearTimeout(id);
    }, [data, error]);

    const refresh = async () => {
        setRefreshing(true);
        await load(true);
        setRefreshing(false);
    };
    const saveNote = async (id: number, note: string | null) => {
        try {
            const r = await api<{ note: string | null }>(`/meta/changes/${id}/note`, "PUT", { note });
            setData((d) => d ? { ...d, changes: d.changes.map((c) => c.id === id ? { ...c, note: r.note } : c) } : d);
            toast.success(r.note ? "Nota guardada" : "Nota borrada");
        } catch (e) {
            toast.error((e as Error).message);
            throw e;
        }
    };

    const days = useMemo(() => {
        const out: { date: string; items: Change[] }[] = [];
        for (const c of data?.changes ?? []) {
            const last = out[out.length - 1];
            if (last && last.date === c.date) last.items.push(c);
            else out.push({ date: c.date, items: [c] });
        }
        return out;
    }, [data]);

    const s = data?.score;
    const measured = s ? s.met + s.not_met : 0;
    const best = s?.by_kind.filter((k) => k.met + k.not_met >= 2).sort((a, b) => b.met / (b.met + b.not_met) - a.met / (a.met + a.not_met) || b.met - a.met)[0];
    const filtered = productId !== "" || city !== "" || kind !== "" || result !== "";
    const ink = inkSx(t);

    return (
        <Layout>
            <Box sx={{ ...geist, color: t.ink, maxWidth: 640, mx: "auto", px: { xs: 0, sm: 1 }, pb: 6 }}>
                {loadingSession || !isValid || (!data && !error) ? (
                    <>
                        <PageSkeleton />
                        {slow && <Typography sx={{ fontSize: 13, color: t.muted, mt: 1 }}>Sigue cargando…</Typography>}
                    </>
                ) : !data ? (
                    <Box role="alert" sx={{ ...cardSx(t), p: 3, mt: 2 }}>
                        <Stack direction="row" spacing={1} alignItems="center"><ReportProblemRounded sx={{ color: t.red }} />
                            <Typography sx={{ fontSize: 16, fontWeight: 600 }}>No se pudo abrir el historial</Typography></Stack>
                        <Typography sx={{ fontSize: 14, color: t.muted, mt: 1 }}>Revisa tu conexión a internet y vuelve a intentar.</Typography>
                        <Button variant="contained" disableElevation sx={{ ...ink, ...tapSx, mt: 2 }} onClick={() => load()}>Reintentar</Button>
                        <Typography sx={{ fontSize: 12, color: t.faint, mt: 2 }}>Detalle técnico: {error}</Typography>
                    </Box>
                ) : (
                    <>
                        <Stack direction="row" justifyContent="space-between" alignItems="baseline" flexWrap="wrap" useFlexGap spacing={1.5}>
                            <Typography component="h1" sx={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>Historial de cambios</Typography>
                            <Typography component="div" sx={{ fontSize: 13, color: t.muted }}>
                                {data.refreshed_at ? `Al día: ${dateTime(data.refreshed_at)}` : "Sin revisar todavía"}{" · "}
                                <TextAction onClick={refresh} disabled={refreshing}>
                                    {refreshing ? <><CircularProgress size={11} sx={{ color: t.muted, mr: 0.75 }} />Revisando…</> : "Revisar ahora"}
                                </TextAction>
                            </Typography>
                        </Stack>
                        <Typography sx={{ fontSize: 14, color: t.muted, mt: 0.75 }}>
                            Cada cambio que haces en Meta, con su hipótesis y si se cumplió. Se arma solo: no tienes que anotar nada.
                        </Typography>
                        {data.refresh_error && (
                            <Typography role="status" sx={{ fontSize: 13, color: t.red, mt: 1 }}>
                                No se pudo revisar Meta esta vez: ves lo último que se guardó. Detalle técnico: {data.refresh_error}
                            </Typography>
                        )}

                        {s && s.total > 0 && (
                            <>
                                <Scoreboard tiles={[
                                    { label: "Se cumplieron", value: measured ? `${s.met} de ${measured}` : "—", color: measured && s.met / measured >= 0.5 ? t.green : undefined,
                                        help: "De los cambios que ya se midieron. No cuenta los que no se pueden saber ni los que no se miden (pausar)." },
                                    { label: "Midiendo", value: s.measuring, help: "Esperan sus días cerrados (hasta 3) o el veredicto del batch." },
                                    { label: "Lo que más funciona", value: best ? best.label : "—",
                                        help: best ? `${best.met} de ${best.met + best.not_met} se cumplieron. Cuenta cuando ya se midieron 2 o más de ese tipo.` : "Sale cuando ya se midieron 2 o más cambios de un mismo tipo." },
                                ]} />
                                <Section name="Por tipo de cambio" hint={kind ? "Toca otra vez para ver todos" : "Toca uno para ver solo esos"}>
                                    <Box sx={{ ...cardSx(t), p: 0.5 }}>
                                        {s.by_kind.map((k) => <KindRow key={k.kind} k={k} active={kind === k.kind} onPick={() => setKind((v) => v === k.kind ? "" : k.kind)} />)}
                                    </Box>
                                </Section>
                            </>
                        )}

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 3 }}>
                            <TextField select size="small" label="Producto" value={productId} onChange={(e) => setProductId(e.target.value === "" ? "" : Number(e.target.value))} sx={{ flex: 1 }}>
                                <MenuItem value="">Todos</MenuItem>
                                {data.products.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                            </TextField>
                            <TextField select size="small" label="Ciudad" value={city} onChange={(e) => setCity(e.target.value)} sx={{ flex: 1 }}>
                                <MenuItem value="">Todas</MenuItem>
                                {data.cities.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                            </TextField>
                            <TextField select size="small" label="Tipo de cambio" value={kind} onChange={(e) => setKind(e.target.value)} sx={{ flex: 1 }}>
                                <MenuItem value="">Todos</MenuItem>
                                {Object.entries(data.kinds).map(([k, label]) => <MenuItem key={k} value={k}>{label}</MenuItem>)}
                            </TextField>
                        </Stack>
                        <Stack direction="row" columnGap={0.75} rowGap={0.75} flexWrap="wrap" sx={{ mt: 1 }} role="group" aria-label="Filtrar por resultado">
                            {RESULT_FILTERS.map((f) => {
                                const on = result === f.key;
                                return (
                                    <ButtonBase key={f.key || "all"} onClick={() => setResult(f.key)} aria-pressed={on}
                                        sx={{ px: 1.5, minHeight: { xs: 48, sm: 32 }, borderRadius: "999px", fontSize: 13, border: `1px solid ${on ? t.ink : t.line}`,
                                            bgcolor: on ? t.ink : "transparent", color: on ? t.onInk : t.ink, "&.Mui-focusVisible": { outline: `2px solid ${t.ink}`, outlineOffset: 2 } }}>
                                        {f.label}
                                    </ButtonBase>
                                );
                            })}
                        </Stack>

                        {days.length === 0 ? (
                            <Box sx={{ ...cardSx(t), p: 3, mt: 2, textAlign: "center" }}>
                                <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{filtered ? "Nada con estos filtros" : "Todavía no hay cambios"}</Typography>
                                <Typography sx={{ fontSize: 14, color: t.muted, mt: 0.5 }}>
                                    {filtered ? "Prueba con otros filtros o quítalos." : "Aparecen solos cuando cambias algo en Meta: el sistema mira Meta cada 30 minutos."}
                                </Typography>
                                {filtered && (
                                    <Button variant="outlined" sx={{ ...lineSx(t), ...tapSx, mt: 1.5 }}
                                        onClick={() => { setProductId(""); setCity(""); setKind(""); setResult(""); }}>Quitar los filtros</Button>
                                )}
                            </Box>
                        ) : days.map((d) => (
                            <Section key={d.date} name={dayLabel(d.date)} hint={plural(d.items.length, "cambio", "cambios")}>
                                {d.items.map((c) => <ChangeCard key={c.id} c={c} onNote={saveNote} />)}
                            </Section>
                        ))}
                    </>
                )}
            </Box>
        </Layout>
    );
};
