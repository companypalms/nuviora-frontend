// src/pages/editor/EditorPage.tsx
// Etapa 5, paso 5a (2026-10-30): las pantallas de los editores de video. "Mis encargos" (los dos editores): lo que les
// asignaron, con todo el encargo, para empezarlo y entregarlo con el enlace de Drive de cada pieza. "Encargos del equipo"
// (solo el editor líder): asignar lo aprobado por el dueño y revisar lo entregado (aprobar a la banca o devolver). Sin
// dinero: los resultados llegan en el paso 5b.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { CheckRounded, PlayArrowRounded, RateReviewRounded, UploadRounded } from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { Loading } from "../../components/ui/content/Loading";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { useValidateSession } from "../../hooks/useValidateSession";
import { api, dateTime } from "../../components/meta-ads/metaAds";
import { AssignButton, CopyBrief, DeliverDialog, DeliveriesList, ReviewDialog } from "../../components/meta-ads/editorWork";
import { EditorFields, EditorOption, dueLabel, notifyEditorChanged } from "../../components/meta-ads/editorShared";

type Status = "approved" | "production" | "review" | "bank" | "testing" | "tested" | "discarded";
type Piece = { id: number; code: string | null; change: string | null; format: string | null; link: string | null; hook: string | null };
type EBatch = EditorFields & {
    id: number; code: string | null; product: string; status: Status; status_label: string; status_at: string | null; position: number | null;
    kind: string; kind_label: string; angle_code: string | null; angle_name: string | null; concept: string | null; hypothesis: string | null; audience: string | null;
    reference: string | null; reference_thumbnail: string | null; reference_texts: string[]; city: string | null; format: string | null; keep: string | null;
    offer: string | null; deliverables: string | null; urgency: number | null; due_date: string | null; pieces: Piece[];
    meta_names: { adset: string | null; ads: string[] }; brief: string;
};
type Data = {
    me: { id: number; name: string; leader: boolean }; batches: EBatch[]; editors: EditorOption[];
    pending: { todo: number; to_assign: number; to_review: number; total: number };
};

const card = { borderRadius: 3, border: "1px solid", borderColor: "divider", p: 2 } as const;
const FORMATS: Record<string, string> = { video: "Video", image: "Imagen", mixed: "Video e imagen" };
const STATUS_COLOR: Record<Status, "info" | "primary" | "secondary" | "success" | "warning" | "default"> = {
    approved: "info", production: "primary", review: "secondary", bank: "success", testing: "warning", tested: "success", discarded: "default",
};
const DONE: Status[] = ["bank", "testing", "tested", "discarded"];

/** Lo más urgente arriba: lo atrasado, después por plazo y por el orden de la cola. */
const byDue = (a: EBatch, b: EBatch) => Number(b.overdue) - Number(a.overdue) || (a.due_date ?? "9").localeCompare(b.due_date ?? "9")
    || (a.position ?? 1e9) - (b.position ?? 1e9) || a.id - b.id;

const Field: React.FC<{ label: string; value: string | null }> = ({ label, value }) => (value && value.trim()
    ? <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}><b>{label}:</b> {value}</Typography> : null);

const EditorBatchCard: React.FC<{ b: EBatch; data: Data; showEditor: boolean; onChanged: () => void }> = ({ b, data, showEditor, onChanged }) => {
    const [busy, setBusy] = useState(false);
    const [deliver, setDeliver] = useState(false);
    const [review, setReview] = useState(false);
    const done = DONE.includes(b.status);
    const changed = () => { onChanged(); notifyEditorChanged(); };

    const start = async () => {
        setBusy(true);
        try {
            await api(`/editor/queue/${b.id}/start`, "POST");
            toast.success(`${b.code}: en producción`);
            changed();
        } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
    };

    return (
        <Box sx={{ py: 1.5, borderBottom: "1px solid", borderColor: "divider", "&:last-child": { borderBottom: 0 } }}>
            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip size="small" color="primary" label={b.code ?? "—"} sx={{ fontWeight: 700 }} />
                <Typography variant="body2" fontWeight={700}>{b.product}</Typography>
                <Chip size="small" variant="outlined" label={b.kind_label} />
                {b.angle_code && <Chip size="small" variant="outlined" label={b.angle_name ? `${b.angle_code} · ${b.angle_name}` : b.angle_code} />}
                <Chip size="small" color={STATUS_COLOR[b.status]} label={b.status_label} />
                {b.due_date && !done && <Chip size="small" color={b.overdue ? "error" : "default"} variant={b.overdue ? "filled" : "outlined"}
                    label={b.overdue ? `Atrasado: era para el ${dueLabel(b.due_date)}` : `Plazo: ${dueLabel(b.due_date)}`} />}
                {showEditor && (b.editor || !done) && <Chip size="small" variant="outlined" color={b.editor ? "default" : "warning"} label={b.editor ? `Editor: ${b.editor}` : "Sin asignar"} />}
            </Stack>

            {b.returned && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                    <b>{b.editor_id === data.me.id ? "Te lo devolvieron" : "Devuelto"} ({b.returned.version}{b.returned.by ? `, ${b.returned.by}` : ""}):</b> {b.returned.comment}
                </Alert>
            )}
            {b.review_by_owner && <Alert severity="info" sx={{ mt: 1 }}>Es tu entrega: la revisa el dueño.</Alert>}

            {!done && (
                <Box sx={{ mt: 1 }}>
                    <Field label="Hipótesis" value={b.hypothesis} />
                    <Field label="Dolor o público" value={b.audience} />
                    <Field label="Concepto" value={b.concept} />
                    <Field label="Conservar" value={b.keep} />
                    <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.25 }}>
                        {[b.city && `Ciudad de aprendizaje: ${b.city}`, b.format && FORMATS[b.format], b.offer, b.urgency && `Prioridad U${b.urgency}`].filter(Boolean).join(" · ")}
                    </Typography>
                    {b.reference && (
                        <Stack direction="row" spacing={1.25} sx={{ mt: 1, p: 1, borderRadius: 2, bgcolor: "action.hover" }}>
                            {b.reference_thumbnail && (
                                <Box component="img" src={b.reference_thumbnail} alt={`Miniatura de ${b.reference}`} loading="lazy"
                                    sx={{ width: 72, height: 72, objectFit: "cover", borderRadius: 1.5, flexShrink: 0 }} />
                            )}
                            <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2"><b>Referencia:</b> {b.reference}</Typography>
                                {b.reference_texts.map((t, i) => <Typography key={i} variant="caption" component="div" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>“{t}”</Typography>)}
                            </Box>
                        </Stack>
                    )}
                    {b.pieces.length > 0 && (
                        <Box component="ol" sx={{ m: 0, mt: 1, pl: 2.5 }}>
                            {b.pieces.map((p) => (
                                <Typography key={p.id} component="li" variant="body2" sx={{ overflowWrap: "anywhere" }}>
                                    {p.code && <b>{p.code} </b>}{p.change || <span style={{ opacity: 0.6 }}>sin detalle</span>}
                                    {p.format && p.format !== b.format && <> ({(FORMATS[p.format] ?? p.format).toLowerCase()})</>}
                                </Typography>
                            ))}
                        </Box>
                    )}
                    <Field label="Entregables" value={b.deliverables} />
                    {b.meta_names.adset && (
                        <Typography variant="caption" component="div" sx={{ mt: 0.5, overflowWrap: "anywhere" }}>
                            Nombres de los archivos: {b.meta_names.ads.join(", ")} (ad set {b.meta_names.adset})
                        </Typography>
                    )}
                </Box>
            )}
            {done && (
                <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
                    {b.status_label}{b.status_at ? ` desde el ${dateTime(b.status_at)}` : ""}
                </Typography>
            )}

            <DeliveriesList deliveries={b.deliveries} />

            <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                {b.can.start && (
                    <Button size="small" variant="outlined" startIcon={busy ? <CircularProgress size={14} /> : <PlayArrowRounded />} disabled={busy} onClick={start}>Empezar</Button>
                )}
                {b.can.deliver && (
                    <Button size="small" variant="contained" startIcon={<UploadRounded />} onClick={() => setDeliver(true)}>
                        {b.returned ? "Entregar de nuevo" : "Entregar"}
                    </Button>
                )}
                {b.can.review && (
                    <Button size="small" variant="contained" color="secondary" startIcon={<RateReviewRounded />} onClick={() => setReview(true)}>Revisar entrega</Button>
                )}
                {b.can.assign && (
                    <AssignButton<EBatch> editors={data.editors} current={b.editor_id} url={`/editor/queue/${b.id}/editor`} allowNone={b.status === "approved"} onDone={changed} />
                )}
                {!done && <CopyBrief text={b.brief} />}
            </Stack>

            <DeliverDialog<EBatch> open={deliver} code={b.code ?? "el encargo"} pieces={b.pieces} url={`/editor/queue/${b.id}/deliver`}
                concept={b.deliveries[0]?.concept ?? b.concept ?? ""} angle={b.deliveries[0]?.angle ?? [b.angle_code, b.angle_name].filter(Boolean).join(" — ")}
                onClose={() => setDeliver(false)} onDone={changed} />
            <ReviewDialog<EBatch> open={review} title={b.code ?? "el encargo"} delivery={b.deliveries.find((d) => d.review === "pending") ?? null}
                url={`/editor/queue/${b.id}/review`} onClose={() => setReview(false)} onDone={changed} />
        </Box>
    );
};

export const EditorPage: React.FC<{ team?: boolean }> = ({ team = false }) => {
    const { loadingSession, isValid } = useValidateSession();
    const [data, setData] = useState<Data | null>(null);

    const load = useCallback(() => { api<Data>("/editor/queue").then(setData).catch((e) => toast.error(e.message)); }, []);
    useEffect(() => { if (isValid) load(); }, [isValid, load]);

    const lists = useMemo(() => {
        const all = data?.batches ?? [];
        const mine = all.filter((b) => b.editor_id === data?.me.id);
        return {
            todo: mine.filter((b) => b.status === "approved" || b.status === "production").sort(byDue),
            inReview: mine.filter((b) => b.status === "review"),
            done: mine.filter((b) => DONE.includes(b.status)),
            toAssign: all.filter((b) => b.status === "approved" && !b.editor_id).sort(byDue),
            toReview: all.filter((b) => b.status === "review"),
            working: all.filter((b) => (b.status === "approved" && b.editor_id) || b.status === "production").sort(byDue),
            bank: all.filter((b) => b.status === "bank"),
        };
    }, [data]);

    if (loadingSession || !isValid || !data) return <Loading />;
    const leader = data.me.leader;
    const section = (title: string, help: string, list: EBatch[], empty: string, showEditor = false) => (
        <Paper elevation={0} sx={card}>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                <Typography variant="subtitle1" fontWeight="bold">{title}</Typography>
                <Typography variant="caption" color="text.secondary">{list.length}</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">{help}</Typography>
            {list.length === 0 ? <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{empty}</Typography>
                : list.map((b) => <EditorBatchCard key={b.id} b={b} data={data} showEditor={showEditor} onChanged={load} />)}
        </Paper>
    );

    if (team && !leader) {
        return <Layout><Box sx={{ p: 2 }}><Alert severity="info">Esta pantalla es del editor líder. Tus encargos están en "Mis encargos".</Alert></Box></Layout>;
    }

    return (
        <Layout>
            <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: 1000, mx: "auto" }}>
                {team ? (
                    <>
                        <DescripcionDeVista title="Encargos del equipo" description="Los encargos que aprobó el dueño: asígnalos (a ti o al otro editor) y revisa lo entregado. Si lo apruebas pasa a la banca; si lo devuelves, escribe qué cambiar con algo que se vea. Tus propias entregas las revisa el dueño." />
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                            <Chip color={data.pending.to_assign ? "warning" : "default"} label={`Para asignar: ${data.pending.to_assign}`} />
                            <Chip color={data.pending.to_review ? "secondary" : "default"} label={`Para revisar: ${data.pending.to_review}`} />
                        </Stack>
                        <Stack spacing={2}>
                            {section("Para asignar", "Aprobados por el dueño, en el orden de la cola.", lists.toAssign, "Nada para asignar.")}
                            {section("Para revisar", "Entregados: mira cada video y apruébalo o devuélvelo.", lists.toReview, "Nada para revisar.", true)}
                            {section("En curso", "Asignados o en producción.", lists.working, "Nadie está con un encargo.", true)}
                            {section("En banca", "Aprobados: el dueño los sube a Meta.", lists.bank, "Nada en banca.", true)}
                        </Stack>
                    </>
                ) : (
                    <>
                        <DescripcionDeVista title="Mis encargos" description='Los encargos de video que te asignaron, lo más urgente arriba. Toca "Empezar" cuando lo empieces y "Entregar" con el enlace de Drive de cada video, el hook de cada uno, el concepto y el ángulo.' />
                        {leader && (data.pending.to_assign > 0 || data.pending.to_review > 0) && (
                            <Alert severity="info" sx={{ mb: 2 }} action={<Button color="inherit" size="small" component={RouterLink} to="/editor/equipo">Ver</Button>}>
                                En el equipo hay {data.pending.to_assign} para asignar y {data.pending.to_review} para revisar.
                            </Alert>
                        )}
                        <Stack spacing={2}>
                            {section("Por hacer", "Por empezar y en producción (también lo que te devolvieron).", lists.todo, "No tienes encargos pendientes.")}
                            {section("En revisión", "Entregados: esperan la revisión.", lists.inReview, "Nada en revisión.")}
                            {section("Terminados", "Lo de los últimos 14 días que pasó a la banca, a Meta o se descartó.", lists.done, "Todavía nada.")}
                        </Stack>
                        {lists.todo.length === 0 && lists.inReview.length === 0 && <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
                            <CheckRounded fontSize="inherit" sx={{ verticalAlign: "middle" }} /> Al día.
                        </Typography>}
                    </>
                )}
            </Box>
        </Layout>
    );
};
