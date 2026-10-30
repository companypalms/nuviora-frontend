// src/components/meta-ads/landingTasks.tsx
// Etapa 5, paso 6b (2026-10-30): los encargos de landing, compartidos entre Meta Ads › Landings › Encargos del dueño y
// "Mis encargos de landing" del editor: la tarjeta con lo que se vio, la hipótesis, qué cambiar y qué conservar; entregar
// (la vista previa de Shopify y qué cambió), revisar (aprobar para publicar o devolver con un comentario), "Publicada"
// (empieza el test antes/después con los mismos anuncios), asignar, descartar y pedir un cambio. Por ahora las landings
// las hace el dueño: él ve todos los botones. Nada de esto toca Meta ni Shopify.
import React, { useEffect, useState } from "react";
import {
    Alert, Box, Button, Checkbox, Chip, CircularProgress, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Link, Menu,
    MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import {
    CheckRounded, DeleteOutlineRounded, EditRounded, ExpandLessRounded, ExpandMoreRounded, OpenInNewRounded, PersonAddAlt1Rounded, PlayArrowRounded,
    PublishRounded, RateReviewRounded, UploadRounded,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import { api, dateTime, fmt } from "./metaAds";
import { dueLabel } from "./editorShared";
import { LANDING_KINDS, LandingOption, LandingTask, PersonOption, TEST_COLOR, TaskDraft, TestResult, notifyLandingChanged, validHttps } from "./landingTasksShared";

const STATUS_COLOR: Record<LandingTask["status"], "default" | "primary" | "secondary" | "success" | "warning" | "info" | "error"> = {
    proposed: "default", approved: "primary", production: "secondary", review: "warning", ready: "info", testing: "info", tested: "success", discarded: "default",
};
const card = { borderRadius: 3, border: "1px solid", borderColor: "divider", p: 2 } as const;
const pct = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${new Intl.NumberFormat("es-VE", { maximumFractionDigits: 2 }).format(v)} %`);
const int = (v: number) => new Intl.NumberFormat("es-VE").format(v);

/** Hacer una acción del encargo y avisar a la pantalla y al número del menú. */
const useAction = (onChanged: (t: LandingTask) => void) => {
    const [busy, setBusy] = useState(false);
    const run = async (url: string, method: "POST" | "PUT", body: unknown, done: string): Promise<boolean> => {
        setBusy(true);
        try {
            const r = await api<{ task: LandingTask }>(url, method, body);
            onChanged(r.task);
            notifyLandingChanged();
            toast.success(done);
            return true;
        } catch (e) {
            toast.error((e as Error).message);
            return false;
        } finally { setBusy(false); }
    };
    return { busy, run };
};

const Field: React.FC<{ label: string; text: string | null }> = ({ label, text }) => (text ? (
    <Box sx={{ mt: 1 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={700}>{label}</Typography>
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{text}</Typography>
    </Box>
) : null);

/** El test: antes y después con los mismos anuncios, y el veredicto. */
const TestBlock: React.FC<{ r: TestResult; admin: boolean }> = ({ r, admin }) => (
    <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, bgcolor: "action.hover" }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip size="small" color={TEST_COLOR[r.state]} label={r.label} />
            <Typography variant="caption" color="text.secondary">
                {r.ads} {r.ads === 1 ? "anuncio" : "anuncios"} · antes {dueLabel(r.before_from)}–{dueLabel(r.before_to)}
                {r.after_days > 0 ? ` · después ${dueLabel(r.after_from)}–${dueLabel(r.after_to)}` : " · después: desde mañana"}
            </Typography>
        </Stack>
        <Typography variant="body2" sx={{ mt: 0.75 }}>{r.text}</Typography>
        <Box sx={{ overflowX: "auto" }}>
            <Table size="small" sx={{ mt: 0.5, "& td, & th": { px: 1 } }}>
                <TableHead>
                    <TableRow>
                        <TableCell />
                        {["Visitas", "Compras", "% visita", "% compra", ...(admin ? ["CPA"] : [])].map((h) => <TableCell key={h} align="right">{h}</TableCell>)}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {([["Antes", r.before], ["Después", r.after]] as const).map(([name, side]) => (
                        <TableRow key={name}>
                            <TableCell>{name}</TableCell>
                            <TableCell align="right">{int(side.totals.visits)}</TableCell>
                            <TableCell align="right">{int(side.totals.purchases)}</TableCell>
                            <TableCell align="right">{pct(side.metrics.visit)}</TableCell>
                            <TableCell align="right">{pct(side.metrics.conversion)}</TableCell>
                            {admin && <TableCell align="right">{fmt.money(side.metrics.cpa ?? null)}</TableCell>}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Box>
    </Box>
);

const Deliveries: React.FC<{ t: LandingTask }> = ({ t }) => {
    const [open, setOpen] = useState(t.status === "review");
    if (t.deliveries.length === 0) return null;
    return (
        <Box sx={{ mt: 1 }}>
            <Button size="small" onClick={() => setOpen(!open)} endIcon={open ? <ExpandLessRounded /> : <ExpandMoreRounded />} sx={{ textTransform: "none", px: 0.5 }}>
                Entregas ({t.deliveries.map((d) => d.version).join(", ")})
            </Button>
            <Collapse in={open}>
                <Stack spacing={1} sx={{ mt: 0.5 }}>
                    {t.deliveries.map((d) => (
                        <Box key={d.id} sx={{ pl: 1.5, borderLeft: "3px solid", borderColor: d.review === "approved" ? "success.main" : d.review === "returned" ? "error.main" : "warning.main" }}>
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                <Typography variant="body2" fontWeight={700}>{d.version}</Typography>
                                <Chip size="small" variant="outlined" label={d.review_label} color={d.review === "approved" ? "success" : d.review === "returned" ? "error" : "warning"} />
                                <Typography variant="caption" color="text.secondary">{d.editor} · {dateTime(d.delivered_at)}</Typography>
                                <Link href={d.preview_url} target="_blank" rel="noopener noreferrer" variant="body2">Abrir vista previa</Link>
                            </Stack>
                            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{d.notes}</Typography>
                            {d.comment && <Typography variant="body2" color="error.main" sx={{ whiteSpace: "pre-wrap" }}>Comentario: {d.comment}</Typography>}
                        </Box>
                    ))}
                </Stack>
            </Collapse>
        </Box>
    );
};

const DeliverDialog: React.FC<{ t: LandingTask; base: string; onClose: () => void; onChanged: (t: LandingTask) => void }> = ({ t, base, onClose, onChanged }) => {
    const [url, setUrl] = useState(t.deliveries[0]?.preview_url ?? "");
    const [notes, setNotes] = useState("");
    const { busy, run } = useAction(onChanged);
    const bad = url.trim() !== "" && !validHttps(url);
    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Entregar {t.code} · V{String(t.deliveries.length + 1).padStart(2, "0")}</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Prepárala en Shopify <b>sin publicarla</b> y pega el enlace de vista previa (en el editor del tema › Compartir vista previa › Copiar enlace).
                </Typography>
                <Stack spacing={2}>
                    <TextField label="Enlace de vista previa" value={url} onChange={(e) => setUrl(e.target.value)} fullWidth placeholder="https://…"
                        error={bad} helperText={bad ? "Tiene que ser un enlace que empiece con https://" : " "} />
                    <TextField label="Qué cambiaste" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline minRows={3}
                        placeholder="Por ejemplo: fotos más livianas y el título habla del dolor de rodilla" />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button variant="contained" disabled={busy || !validHttps(url) || notes.trim().length < 10}
                    onClick={async () => { if (await run(`${base}/${t.id}/deliver`, "POST", { preview_url: url, notes }, "Entregada: espera la revisión")) onClose(); }}>
                    Entregar
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const ReviewDialog: React.FC<{ t: LandingTask; base: string; onClose: () => void; onChanged: (t: LandingTask) => void }> = ({ t, base, onClose, onChanged }) => {
    const [comment, setComment] = useState("");
    const { busy, run } = useAction(onChanged);
    const d = t.deliveries.find((x) => x.review === "pending");
    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Revisar {t.code} · {d?.version}</DialogTitle>
            <DialogContent>
                {d && (
                    <Box sx={{ mb: 2 }}>
                        <Button size="small" variant="outlined" startIcon={<OpenInNewRounded />} href={d.preview_url} target="_blank" rel="noopener noreferrer">Abrir la vista previa</Button>
                        <Typography variant="body2" sx={{ mt: 1, whiteSpace: "pre-wrap" }}><b>Qué cambió:</b> {d.notes}</Typography>
                    </Box>
                )}
                <TextField label="Comentario (para devolverla)" value={comment} onChange={(e) => setComment(e.target.value)} fullWidth multiline minRows={2}
                    helperText="Algo que se vea: la sección, el texto o la foto. Para aprobar no hace falta." />
            </DialogContent>
            <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
                <Button onClick={onClose}>Cancelar</Button>
                <Button color="error" disabled={busy || comment.trim().length < 10}
                    onClick={async () => { if (await run(`${base}/${t.id}/review`, "POST", { approve: false, comment }, "Devuelta con tu comentario")) onClose(); }}>Devolver</Button>
                <Button variant="contained" color="success" startIcon={<CheckRounded />} disabled={busy}
                    onClick={async () => { if (await run(`${base}/${t.id}/review`, "POST", { approve: true, comment }, "Aprobada: ya se puede publicar")) onClose(); }}>
                    Aprobar: para publicar
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const PublishDialog: React.FC<{ t: LandingTask; base: string; onClose: () => void; onChanged: (t: LandingTask) => void }> = ({ t, base, onClose, onChanged }) => {
    const [url, setUrl] = useState(t.landing_url ?? "");
    const { busy, run } = useAction(onChanged);
    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>¿Ya está publicada?</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Publícala en Shopify y pega la dirección como la abre un cliente. Desde mañana el sistema compara <b>los mismos anuncios</b> antes y después.
                    No cambies esos anuncios mientras dura el test. Si es una landing nueva, cambia en Meta la URL de esos anuncios.
                </Typography>
                <TextField label="Dirección de la landing publicada" value={url} onChange={(e) => setUrl(e.target.value)} fullWidth placeholder="https://…"
                    error={url.trim() !== "" && !validHttps(url)} />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button variant="contained" startIcon={<PublishRounded />} disabled={busy || !validHttps(url)}
                    onClick={async () => { if (await run(`${base}/${t.id}/publish`, "POST", { url }, "Publicada: empieza el test")) onClose(); }}>Publicada</Button>
            </DialogActions>
        </Dialog>
    );
};

const DiscardDialog: React.FC<{ t: LandingTask; base: string; onClose: () => void; onChanged: (t: LandingTask) => void }> = ({ t, base, onClose, onChanged }) => {
    const [reason, setReason] = useState("");
    const { busy, run } = useAction(onChanged);
    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Descartar {t.code ?? "el encargo"}</DialogTitle>
            <DialogContent>
                <TextField label="Por qué" value={reason} onChange={(e) => setReason(e.target.value)} fullWidth autoFocus inputProps={{ maxLength: 255 }} sx={{ mt: 1 }} />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button color="error" disabled={busy || reason.trim().length < 3}
                    onClick={async () => { if (await run(`${base}/${t.id}/discard`, "POST", { reason }, "Descartado")) onClose(); }}>Descartar</Button>
            </DialogActions>
        </Dialog>
    );
};

/**
 * Un encargo de landing con lo que puede hacer quien mira (el servidor dice qué con "can").
 * base: "/meta/landing-tasks" (el dueño) o "/landing-editor/tasks" (el editor).
 */
export const LandingTaskCard: React.FC<{
    t: LandingTask; base: string; admin: boolean; people?: PersonOption[]; onChanged: (t: LandingTask) => void; onEdit?: (t: LandingTask) => void;
}> = ({ t, base, admin, people = [], onChanged, onEdit }) => {
    const [dialog, setDialog] = useState<"deliver" | "review" | "publish" | "discard" | null>(null);
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const { busy, run } = useAction(onChanged);
    const close = () => setDialog(null);
    const editable = admin && ["proposed", "approved", "production"].includes(t.status);

    return (
        <Paper elevation={0} sx={card}>
            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip size="small" color="primary" label={t.code ?? "Sin número"} sx={{ fontWeight: 700 }} />
                <Typography variant="body1" fontWeight={700}>{t.product}</Typography>
                <Chip size="small" variant="outlined" label={t.kind_label} />
                <Chip size="small" color={STATUS_COLOR[t.status]} label={t.status_label} />
                {t.overdue && <Chip size="small" color="error" label="Atrasado" />}
                {t.source === "rules" && <Chip size="small" variant="outlined" label="Propuesto por las reglas" />}
                {admin && t.editor && <Chip size="small" variant="outlined" label={t.editor} />}
                {t.due_date && ["approved", "production", "review"].includes(t.status) && <Typography variant="caption" color="text.secondary">Plazo: {dueLabel(t.due_date)}</Typography>}
            </Stack>
            <Typography variant="body2" sx={{ mt: 1 }}>
                Landing: <b>{t.landing ?? "nueva"}</b>
                {t.landing_url && <> · <Link href={t.landing_url} target="_blank" rel="noopener noreferrer">abrir</Link></>}
                {t.angle_code && <> · ángulo <b>{t.angle_code}</b>{t.angle_name && t.angle_name !== t.angle_code ? ` (${t.angle_name})` : ""}</>}
            </Typography>
            {t.published_url && (
                <Typography variant="body2" color="text.secondary">
                    Publicada el {dateTime(t.published_at)}: <Link href={t.published_url} target="_blank" rel="noopener noreferrer">{t.test_landing ?? t.published_url}</Link>
                </Typography>
            )}
            {t.returned && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                    <b>{admin ? "Devuelta" : "Te la devolvieron"} ({t.returned.version}):</b> {t.returned.comment}
                </Alert>
            )}
            <Field label="Qué se vio" text={t.observed} />
            <Field label="Hipótesis" text={t.hypothesis} />
            <Field label="Qué cambiar" text={t.change} />
            <Field label="Qué conservar" text={t.keep} />
            <Field label="Notas" text={t.notes} />
            {t.discard_reason && <Field label="Descartado" text={t.discard_reason} />}
            <Deliveries t={t} />
            {t.result && <TestBlock r={t.result} admin={admin} />}
            {t.status === "testing" && !t.result && (
                <Alert severity="info" sx={{ mt: 1 }}>El test empieza mañana: se compara con los 7 días antes de publicar, con los mismos anuncios.</Alert>
            )}

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                {t.can.approve && <Button size="small" variant="contained" startIcon={busy ? <CircularProgress size={14} /> : <CheckRounded />} disabled={busy}
                    onClick={() => run(`${base}/${t.id}/approve`, "POST", {}, "Aprobado")}>Aprobar</Button>}
                {t.can.start && <Button size="small" variant="contained" startIcon={<PlayArrowRounded />} disabled={busy}
                    onClick={() => run(`${base}/${t.id}/start`, "POST", {}, "En producción")}>Empezar</Button>}
                {t.can.deliver && <Button size="small" variant={t.can.start ? "outlined" : "contained"} startIcon={<UploadRounded />} onClick={() => setDialog("deliver")}>Entregar</Button>}
                {t.can.review && <Button size="small" variant="contained" color="warning" startIcon={<RateReviewRounded />} onClick={() => setDialog("review")}>Revisar entrega</Button>}
                {t.can.publish && <Button size="small" variant="contained" color="success" startIcon={<PublishRounded />} onClick={() => setDialog("publish")}>Publicada</Button>}
                {t.can.assign && (
                    <>
                        <Button size="small" startIcon={<PersonAddAlt1Rounded />} onClick={(e) => setAnchor(e.currentTarget)}>Quién lo hace</Button>
                        <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
                            {people.map((p) => (
                                <MenuItem key={p.id} selected={p.id === t.editor_id}
                                    onClick={() => { setAnchor(null); run(`${base}/${t.id}/editor`, "PUT", { editor_id: p.id }, `Lo hace ${p.name}`); }}>{p.name}</MenuItem>
                            ))}
                        </Menu>
                    </>
                )}
                {editable && onEdit && <Button size="small" startIcon={<EditRounded />} onClick={() => onEdit(t)}>Editar</Button>}
                {t.can.discard && <Button size="small" color="inherit" startIcon={<DeleteOutlineRounded />} onClick={() => setDialog("discard")}>Descartar</Button>}
            </Stack>
            {dialog === "deliver" && <DeliverDialog t={t} base={base} onClose={close} onChanged={onChanged} />}
            {dialog === "review" && <ReviewDialog t={t} base={base} onClose={close} onChanged={onChanged} />}
            {dialog === "publish" && <PublishDialog t={t} base={base} onClose={close} onChanged={onChanged} />}
            {dialog === "discard" && <DiscardDialog t={t} base={base} onClose={close} onChanged={onChanged} />}
        </Paper>
    );
};

/** Pedir un cambio de landing (o corregir lo que dice un encargo que todavía no se entregó). Solo el dueño. */
export const TaskFormDialog: React.FC<{
    open: boolean; initial: TaskDraft; editing?: LandingTask | null; products: { id: number; name: string }[]; landings: LandingOption[];
    onClose: () => void; onSaved: (t: LandingTask) => void;
}> = ({ open, initial, editing, products, landings, onClose, onSaved }) => {
    const [f, setF] = useState<TaskDraft>(initial);
    const [approve, setApprove] = useState(true);
    const [busy, setBusy] = useState(false);
    useEffect(() => { if (open) { setF(initial); setApprove(true); } }, [open, initial]);
    const set = (k: keyof TaskDraft, v: string | number) => setF((x) => ({ ...x, [k]: v }));
    const options = landings.filter((l) => l.product_id === f.product_id);
    const needsLanding = f.kind !== "new";

    const save = async () => {
        setBusy(true);
        try {
            const text = { kind: f.kind, angle_code: f.angle_code.trim().toUpperCase() || null, observed: f.observed, hypothesis: f.hypothesis, change: f.change, keep: f.keep, notes: f.notes };
            const r = editing
                ? await api<{ task: LandingTask }>(`/meta/landing-tasks/${editing.id}`, "PUT", text)
                : await api<{ task: LandingTask }>("/meta/landing-tasks", "POST", { ...text, product_id: f.product_id, landing_id: needsLanding ? f.landing_id || null : null, approve });
            onSaved(r.task);
            notifyLandingChanged();
            toast.success(editing ? "Guardado" : r.task.code ? `Encargo ${r.task.code} aprobado` : "Encargo creado: queda para aprobar");
            onClose();
        } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{editing ? `Editar ${editing.code ?? "el encargo"}` : "Pedir un cambio de landing"}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField select label="Producto" value={f.product_id} disabled={!!editing} fullWidth
                            onChange={(e) => setF((x) => ({ ...x, product_id: Number(e.target.value), landing_id: "" }))}>
                            {products.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                        </TextField>
                        <TextField select label="Tipo" value={f.kind} onChange={(e) => set("kind", e.target.value)} fullWidth>
                            {Object.entries(LANDING_KINDS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                        </TextField>
                    </Stack>
                    {needsLanding && (
                        <TextField select label="Landing que se cambia" value={f.landing_id} disabled={!!editing || !f.product_id} fullWidth
                            onChange={(e) => set("landing_id", Number(e.target.value))} helperText={f.product_id && options.length === 0 ? "Este producto todavía no tiene landings." : " "}>
                            {options.map((l) => <MenuItem key={l.id} value={l.id}>{l.label}</MenuItem>)}
                        </TextField>
                    )}
                    <TextField label="Ángulo (código)" value={f.angle_code} onChange={(e) => set("angle_code", e.target.value)} inputProps={{ maxLength: 12 }}
                        helperText="Por ejemplo FASP. Vacío si es para todos." />
                    <TextField label="Qué se vio" value={f.observed} onChange={(e) => set("observed", e.target.value)} multiline minRows={2} fullWidth />
                    <TextField label="Hipótesis" value={f.hypothesis} onChange={(e) => set("hypothesis", e.target.value)} multiline minRows={2} fullWidth
                        placeholder="Por ejemplo: si la página habla de los nervios, los que llegan por ese ángulo compran más" />
                    <TextField label="Qué cambiar" required value={f.change} onChange={(e) => set("change", e.target.value)} multiline minRows={2} fullWidth />
                    <TextField label="Qué conservar" value={f.keep} onChange={(e) => set("keep", e.target.value)} multiline minRows={1} fullWidth />
                    <TextField label="Notas" value={f.notes} onChange={(e) => set("notes", e.target.value)} multiline minRows={1} fullWidth />
                    {!editing && <FormControlLabel control={<Checkbox checked={approve} onChange={(e) => setApprove(e.target.checked)} />} label="Aprobarlo ya (le da su número L####)" />}
                    <Alert severity="info">Nunca a la vez que un cambio de creativo: mientras dure el test, no cambies los anuncios que llevan a esta landing.</Alert>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button variant="contained" onClick={save}
                    disabled={busy || !f.product_id || f.change.trim() === "" || (!editing && needsLanding && !f.landing_id)}>{editing ? "Guardar" : "Crear"}</Button>
            </DialogActions>
        </Dialog>
    );
};
