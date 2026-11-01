// src/pages/admin/MetaMemoryPage.tsx
// .66 (dueño, 2026-11-01): "la IA debe ser capaz de aprender de cada hipótesis positiva o negativa… sabiendo qué
// funciona y qué no, tanto en ángulos, formatos, conceptos, buyers personas". Meta Ads › Lo que sabemos: por producto,
// el resumen (lo que funciona, lo que no y lo que falta probar; los números los cuenta el sistema y la IA los explica),
// los resultados por ángulo, buyer persona y estilo, los batches testeados con su aprendizaje (se puede corregir) y las
// notas del dueño. La IA lo lee antes de escribir los encargos. Solo el Admin: los editores nunca lo ven.
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { AddRounded, AutoAwesomeRounded, DeleteOutlineRounded, EditRounded } from "@mui/icons-material";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { Loading } from "../../components/ui/content/Loading";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { useValidateSession } from "../../hooks/useValidateSession";
import { api, dateTime } from "../../components/meta-ads/metaAds";

type Group = { subject: string | null; label: string; won: number; lost: number; tie: number; total: number; lessons: string[]; codes: string[] };
type TestedBatch = { id: number; code: string | null; angle: string | null; angle_name: string | null; persona: string | null; style: string | null;
    concept: string | null; outcome: "Ganó" | "Perdió" | "Empate"; learning: string | null; tested_at: string | null };
type Note = { id: number; kind: string; kind_label: string; text: string; source: string; by: string | null; at: string | null };
type Page = {
    products: { id: number; name: string; tested: number }[]; product_id: number | null; kinds: Record<string, string>; styles: Record<string, string>;
    summary?: { works: string[]; fails: string[]; untested: string[] } | null; status?: string | null; model?: string | null; error?: string | null;
    unknown_numbers?: string[]; generated_at?: string | null; stale?: boolean; tested?: number; totals?: { won: number; lost: number; tie: number };
    groups?: Record<"angle" | "persona" | "style", Group[]>; untested?: { angle: string[]; persona: string[]; style: string[] }; batches?: TestedBatch[]; notes?: Note[];
};

const card = { borderRadius: 3, border: "1px solid", borderColor: "divider", p: 2 } as const;
const OUTCOME_COLOR: Record<string, "success" | "error" | "default"> = { "Ganó": "success", "Perdió": "error", "Empate": "default" };
const DIMENSIONS: { key: "angle" | "persona" | "style"; title: string }[] = [
    { key: "angle", title: "Por ángulo" }, { key: "persona", title: "Por buyer persona" }, { key: "style", title: "Por estilo" },
];

const SummaryList: React.FC<{ title: string; items?: string[]; color: "success" | "error" | "info"; empty: string }> = ({ title, items, color, empty }) => (
    <Paper elevation={0} sx={{ ...card, flex: 1, minWidth: 0, borderLeft: "4px solid", borderLeftColor: `${color}.main` }}>
        <Typography variant="subtitle2" fontWeight={800} color={`${color}.main`}>{title}</Typography>
        {items && items.length > 0 ? (
            <Box component="ul" sx={{ m: 0, mt: 0.75, pl: 2.25 }}>
                {items.map((t, i) => <Typography key={i} component="li" variant="body2" sx={{ overflowWrap: "anywhere", mb: 0.5 }}>{t}</Typography>)}
            </Box>
        ) : <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>{empty}</Typography>}
    </Paper>
);

const GroupRows: React.FC<{ title: string; rows: Group[] }> = ({ title, rows }) => (
    <Paper elevation={0} sx={card}>
        <Typography variant="subtitle1" fontWeight="bold">{title}</Typography>
        {rows.length === 0 ? <Typography variant="body2" color="text.secondary">Todavía nada testeado.</Typography> : rows.map((g) => (
            <Box key={g.label} sx={{ py: 1, borderBottom: "1px solid", borderColor: "divider", "&:last-child": { borderBottom: 0 } }}>
                <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="body2" fontWeight={700} sx={{ mr: 0.5, color: g.subject ? "text.primary" : "text.secondary" }}>{g.label}</Typography>
                    {g.won > 0 && <Chip size="small" color="success" label={`Ganó ${g.won}`} />}
                    {g.lost > 0 && <Chip size="small" color="error" label={`Perdió ${g.lost}`} />}
                    {g.tie > 0 && <Chip size="small" label={`Empate ${g.tie}`} />}
                    <Typography variant="caption" color="text.secondary">de {g.total} {g.total === 1 ? "batch" : "batches"}</Typography>
                </Stack>
                {g.lessons.slice(0, 3).map((l, i) => <Typography key={i} variant="caption" color="text.secondary" component="div" sx={{ overflowWrap: "anywhere" }}>· {l}</Typography>)}
            </Box>
        ))}
    </Paper>
);

const BatchRow: React.FC<{ b: TestedBatch; styles: Record<string, string>; onSaved: () => void }> = ({ b, styles, onSaved }) => {
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState(b.learning ?? "");
    const [saving, setSaving] = useState(false);
    useEffect(() => setText(b.learning ?? ""), [b.learning]);
    const save = async () => {
        setSaving(true);
        try {
            await api(`/meta/queue/${b.id}`, "PUT", { learning: text.trim() || null });
            toast.success("Aprendizaje corregido");
            setEditing(false);
            onSaved();
        } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
    };
    return (
        <Box sx={{ py: 1, borderBottom: "1px solid", borderColor: "divider", "&:last-child": { borderBottom: 0 } }}>
            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip size="small" color="primary" label={b.code ?? "—"} />
                <Chip size="small" color={OUTCOME_COLOR[b.outcome]} label={b.outcome} />
                <Typography variant="caption" color="text.secondary">
                    {[b.angle && (b.angle_name ? `${b.angle} · ${b.angle_name}` : b.angle), b.persona, b.style && (styles[b.style] ?? b.style), b.concept, b.tested_at && `testeado ${b.tested_at}`].filter(Boolean).join(" · ")}
                </Typography>
                <Box sx={{ flex: 1 }} />
                {!editing && <Button size="small" startIcon={<EditRounded />} onClick={() => setEditing(true)} sx={{ textTransform: "none" }}>Corregir</Button>}
            </Stack>
            {editing ? (
                <Stack spacing={1} sx={{ mt: 1 }}>
                    <TextField size="small" multiline minRows={2} value={text} onChange={(e) => setText(e.target.value)} inputProps={{ maxLength: 2000 }} fullWidth
                        label="Lo que aprendimos de este batch" />
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button size="small" onClick={() => { setEditing(false); setText(b.learning ?? ""); }}>Cancelar</Button>
                        <Button size="small" variant="contained" disabled={saving} onClick={save}>Guardar</Button>
                    </Stack>
                </Stack>
            ) : (
                <Typography variant="body2" sx={{ mt: 0.5, overflowWrap: "anywhere", color: b.learning ? "text.primary" : "text.secondary" }}>
                    {b.learning ?? "Todavía sin aprendizaje: la IA lo escribe en la próxima propuesta de la mañana."}
                </Typography>
            )}
        </Box>
    );
};

export const MetaMemoryPage: React.FC = () => {
    const { loadingSession, isValid } = useValidateSession();
    const [params] = useSearchParams();
    const [productId, setProductId] = useState<number | null>(() => Number(params.get("producto")) || null);
    const [data, setData] = useState<Page | null>(null);
    const [busy, setBusy] = useState(false);
    const [kind, setKind] = useState("works");
    const [noteText, setNoteText] = useState("");
    const [editingNote, setEditingNote] = useState<{ id: number; text: string } | null>(null);

    const load = useCallback((pid: number | null) => {
        api<Page>(`/meta/memory${pid ? `?product_id=${pid}` : ""}`).then((d) => { setData(d); setProductId(d.product_id); }).catch((e) => toast.error(e.message));
    }, []);
    useEffect(() => { if (isValid) load(productId); }, [isValid]); // eslint-disable-line react-hooks/exhaustive-deps

    const keepList = (d: Page) => setData((prev) => (prev ? { ...prev, ...d, products: d.products ?? prev.products } : d));
    const summarize = async () => {
        if (!productId) return;
        setBusy(true);
        try {
            keepList(await api<Page>(`/meta/memory/${productId}/summarize`, "POST"));
            toast.success("Resumen actualizado");
        } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
    };
    const addNote = async () => {
        if (!productId || !noteText.trim()) return;
        try {
            keepList(await api<Page>(`/meta/memory/${productId}/notes`, "POST", { kind, text: noteText.trim() }));
            setNoteText("");
            toast.success("Nota guardada: la IA la lee en los encargos de este producto");
        } catch (e) { toast.error((e as Error).message); }
    };
    const saveNote = async () => {
        if (!editingNote) return;
        try {
            keepList(await api<Page>(`/meta/memory/notes/${editingNote.id}`, "PUT", { text: editingNote.text.trim() }));
            setEditingNote(null);
        } catch (e) { toast.error((e as Error).message); }
    };
    const removeNote = async (id: number) => {
        if (!window.confirm("¿Quitar esta nota? La IA deja de leerla.")) return;
        try { keepList(await api<Page>(`/meta/memory/notes/${id}`, "DELETE")); } catch (e) { toast.error((e as Error).message); }
    };

    if (loadingSession || !isValid || !data) return <Loading />;
    const s = data.summary;
    const empty = (data.tested ?? 0) === 0 && (data.notes ?? []).length === 0;

    return (
        <Layout>
            <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: 1100, mx: "auto" }}>
                <DescripcionDeVista title="Lo que sabemos" backPath="/meta-ads"
                    description="Lo que aprendimos de cada producto con los batches testeados: qué funciona, qué no y qué falta probar, por ángulo, buyer persona y estilo. La IA lo lee antes de escribir cada encargo, y nunca se lo cuenta a los editores. Solo lo ves tú." />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} sx={{ mb: 2 }}>
                    {data.products.length === 0 ? <Alert severity="info">Todavía no hay productos con campañas o batches testeados.</Alert> : (
                        <TextField select size="small" label="Producto" value={productId ?? ""} onChange={(e) => load(Number(e.target.value))} sx={{ minWidth: 280 }}>
                            {data.products.map((p) => <MenuItem key={p.id} value={p.id}>{p.name} · {p.tested} {p.tested === 1 ? "batch testeado" : "batches testeados"}</MenuItem>)}
                        </TextField>
                    )}
                    <Box sx={{ flex: 1 }} />
                    {productId && (
                        <Button variant="outlined" startIcon={busy ? <CircularProgress size={16} /> : <AutoAwesomeRounded />} disabled={busy || empty} onClick={summarize}>
                            {busy ? "Escribiendo…" : "Actualizar el resumen"}
                        </Button>
                    )}
                </Stack>
                {productId && (
                    <Stack spacing={2}>
                        {data.stale && <Alert severity="info">Hay batches testeados o notas nuevas desde el último resumen. Se actualiza solo mañana a las 7:00, o tócalo ahora en "Actualizar el resumen".</Alert>}
                        {data.error && <Alert severity="warning">{data.error}</Alert>}
                        {(data.unknown_numbers ?? []).length > 0 && (
                            <Alert severity="warning">La IA escribió números que no están en los datos: <b>{data.unknown_numbers!.join(", ")}</b>. Revísalo antes de confiar en ese punto.</Alert>
                        )}
                        {empty ? (
                            <Alert severity="info">
                                Todavía no hay batches testeados de este producto. Cuando tus batches tengan su resultado en Meta, aquí vas a ver qué ángulo, buyer persona y
                                estilo funcionó. Mientras tanto puedes anotar lo que ya sabes.
                            </Alert>
                        ) : (
                            <Box>
                                {s ? (
                                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                                        <SummaryList title="Lo que funciona" items={s.works} color="success" empty="Todavía nada ganó." />
                                        <SummaryList title="Lo que no funciona" items={s.fails} color="error" empty="Nada perdió del todo." />
                                        <SummaryList title="Lo que falta probar" items={s.untested} color="info" empty="Nada pendiente." />
                                    </Stack>
                                ) : (
                                    <Alert severity="info">Todavía no hay resumen escrito: se escribe solo mañana a las 7:00, o tócalo ahora en "Actualizar el resumen". Abajo ya están los números al día.</Alert>
                                )}
                                <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.75 }}>
                                    {data.totals && `${data.tested} batches testeados: ganaron ${data.totals.won}, perdieron ${data.totals.lost}, empate ${data.totals.tie}. `}
                                    {data.generated_at ? `Resumen del ${dateTime(data.generated_at)}` : "Todavía sin resumen"}
                                    {data.status === "ok" && data.model ? ` · escrito por la IA (${data.model})` : data.status === "example" ? " · con los números (en esta PC no hay IA)" : ""}.
                                </Typography>
                            </Box>
                        )}
                        {!empty && (
                            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems="flex-start">
                                {DIMENSIONS.map((d) => <Box key={d.key} sx={{ flex: 1, minWidth: 0, width: "100%" }}><GroupRows title={d.title} rows={data.groups?.[d.key] ?? []} /></Box>)}
                            </Stack>
                        )}
                        <Paper elevation={0} sx={card}>
                            <Typography variant="subtitle1" fontWeight="bold">Tus notas</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                Lo que sabes tú y el sistema no ve. La IA lo lee en los encargos de este producto. También se las puedes dictar a tu asistente.
                            </Typography>
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                                <TextField select size="small" value={kind} onChange={(e) => setKind(e.target.value)} sx={{ minWidth: 170 }}>
                                    {Object.entries(data.kinds).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                                </TextField>
                                <TextField size="small" fullWidth value={noteText} onChange={(e) => setNoteText(e.target.value)} inputProps={{ maxLength: 1000 }}
                                    placeholder="Por ejemplo: con modelo masculino no funciona" onKeyDown={(e) => { if (e.key === "Enter") addNote(); }} />
                                <Button variant="contained" startIcon={<AddRounded />} disabled={!noteText.trim()} onClick={addNote} sx={{ flexShrink: 0 }}>Anotar</Button>
                            </Stack>
                            {(data.notes ?? []).map((n) => (
                                <Box key={n.id} sx={{ py: 1, borderBottom: "1px solid", borderColor: "divider", "&:last-child": { borderBottom: 0 } }}>
                                    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                                        <Chip size="small" color={n.kind === "works" ? "success" : n.kind === "fails" ? "error" : "info"} variant="outlined" label={n.kind_label} />
                                        <Typography variant="caption" color="text.secondary">{[n.by, dateTime(n.at), n.source === "assistant" ? "con tu asistente" : null].filter(Boolean).join(" · ")}</Typography>
                                        <Box sx={{ flex: 1 }} />
                                        <Button size="small" startIcon={<EditRounded />} onClick={() => setEditingNote({ id: n.id, text: n.text })} sx={{ textTransform: "none" }}>Editar</Button>
                                        <Button size="small" color="inherit" startIcon={<DeleteOutlineRounded />} onClick={() => removeNote(n.id)} sx={{ textTransform: "none" }}>Quitar</Button>
                                    </Stack>
                                    {editingNote?.id === n.id ? (
                                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1 }}>
                                            <TextField size="small" fullWidth value={editingNote.text} onChange={(e) => setEditingNote({ id: n.id, text: e.target.value })} inputProps={{ maxLength: 1000 }} />
                                            <Button size="small" onClick={() => setEditingNote(null)}>Cancelar</Button>
                                            <Button size="small" variant="contained" disabled={!editingNote.text.trim()} onClick={saveNote}>Guardar</Button>
                                        </Stack>
                                    ) : <Typography variant="body2" sx={{ mt: 0.5, overflowWrap: "anywhere" }}>{n.text}</Typography>}
                                </Box>
                            ))}
                        </Paper>
                        {(data.batches ?? []).length > 0 && (
                            <Paper elevation={0} sx={card}>
                                <Typography variant="subtitle1" fontWeight="bold">Batches testeados y lo que aprendimos</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    El aprendizaje lo escribe la IA cuando el batch termina su test. Si algo no es así, corrígelo: la IA lee tu versión.
                                </Typography>
                                {data.batches!.map((b) => <BatchRow key={b.id} b={b} styles={data.styles} onSaved={() => load(productId)} />)}
                            </Paper>
                        )}
                    </Stack>
                )}
            </Box>
        </Layout>
    );
};
