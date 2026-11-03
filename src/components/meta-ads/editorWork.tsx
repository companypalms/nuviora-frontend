// src/components/meta-ads/editorWork.tsx
// Etapa 5, paso 5a (2026-10-30): lo de los editores en la cola de producción, compartido entre sus pantallas (Mis encargos y
// El equipo) y la Cola y banca del dueño: entregar, revisar (aprobar a la banca o devolver con un comentario), asignar y el
// historial de versiones (V01, V02…).
// .90: con el almacén encendido, cada pieza se sube al sistema (no más enlaces de Drive) y se ve ahí mismo.
// .91 (dueño: "se debe saber en menos de 3 segundos qué se debe hacer, cómo se debe hacer"): "Entregar" y "Revisar" como
// un juego: cuántas piezas van listas, una zona grande para cada archivo, qué pasa al entregar, y revisar pieza por pieza
// con el video en grande. Diseño nuevo (guias/DISENO-UX-UI.md).
// .93: revisar comparando (la referencia a la izquierda, lo entregado a la derecha) con lo que se busca a la vista, motivos
// rápidos y "Marcar este segundo"; y el editor se compara antes de entregar.
import React, { useEffect, useRef, useState } from "react";
import {
    Box, Button, ButtonBase, CircularProgress, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, LinearProgress, Link, Menu, MenuItem,
    Stack, TextField, Typography, useMediaQuery, useTheme,
} from "@mui/material";
import {
    CheckCircleRounded, CheckRounded, CloseRounded, ContentCopyRounded, EditRounded, ExpandLessRounded, ExpandMoreRounded, OpenInNewRounded,
    PersonAddAlt1Rounded, RateReviewRounded, UploadFileRounded,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import { api, dateTime } from "./metaAds";
import {
    Delivery, EditorOption, Iteration, REVIEW_REASONS, ReferenceLibraryData, ReferenceSource, ReviewContext, clock, driveFileId, referenceSide,
} from "./editorShared";
import { UploadReferenceDialog } from "./references";
import { ACCEPT, StoredFile, fileProblem, sendFile } from "./fileUpload";
import { FileView } from "./fileView";
import { CompareMedia } from "./compare";
import { ReviewBrief } from "./briefView";
import { geist, inkSx, lineSx, tapSx, useTokens } from "../ui/design";
import { Dot, TextAction } from "../ui/designParts";

type DeliverPiece = { id?: number; code?: string | null; change: string | null; format: string | null; link?: string | null; file?: StoredFile | null; hook?: string | null;
    source?: ReferenceSource | null; reference_id?: number | null };

const linkProblem = (url: string) => (url.includes("/folders/")
    ? "Es una carpeta: pega el enlace de este video."
    : "Pega el enlace de Drive del archivo (clic derecho › Compartir › Copiar enlace).");

/** Copiar el encargo; si el navegador no deja (algunos teléfonos), el texto seleccionado para copiarlo a mano. */
export const CopyBrief: React.FC<{ text: string; label?: string; asLink?: boolean }> = ({ text, label = "Copiar encargo", asLink = false }) => {
    const [manual, setManual] = useState(false);
    const copy = () => (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject(new Error("sin portapapeles")))
        .then(() => toast.success("Encargo copiado")).catch(() => setManual(true));
    return (
        <>
            {asLink ? <TextAction onClick={copy}>{label}</TextAction> : <Button size="small" startIcon={<ContentCopyRounded />} onClick={copy}>{label}</Button>}
            <Dialog open={manual} onClose={() => setManual(false)} fullWidth maxWidth="sm">
                <DialogTitle>Copia el encargo</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>El navegador no dejó copiarlo solo: el texto ya está seleccionado, cópialo (Ctrl+C o mantener apretado).</Typography>
                    <TextField value={text} fullWidth multiline minRows={6} InputProps={{ readOnly: true }} autoFocus onFocus={(e) => e.target.select()} />
                </DialogContent>
                <DialogActions><Button onClick={() => setManual(false)}>Listo</Button></DialogActions>
            </Dialog>
        </>
    );
};

/**
 * Asignar o cambiar el editor. Sin asignar solo se puede dejar lo que todavía no se empezó. `.91`: "primary" = el botón
 * principal de la misión ("Asignar"); "asLink" = un enlace chico ("Cambiar editor").
 */
export const AssignButton = <B,>({ editors, current, url, allowNone, onDone, primary = false, asLink = false }: {
    editors: EditorOption[]; current: number | null; url: string; allowNone: boolean; onDone: (b: B) => void; primary?: boolean; asLink?: boolean;
}) => {
    const t = useTokens();
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const [busy, setBusy] = useState(false);
    const assign = async (editorId: number | null) => {
        setAnchor(null);
        setBusy(true);
        try {
            const r = await api<{ batch: B }>(url, "PUT", { editor_id: editorId });
            onDone(r.batch);
            toast.success(editorId ? `Asignado a ${editors.find((e) => e.id === editorId)?.name ?? "el editor"}` : "Quedó sin asignar");
        } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
    };
    const label = current ? "Cambiar editor" : "Asignar editor";
    return (
        <>
            {primary ? (
                <Button variant="contained" disableElevation disabled={busy} onClick={(e) => setAnchor(e.currentTarget)} aria-haspopup="menu"
                    startIcon={busy ? <CircularProgress size={14} sx={{ color: "inherit" }} /> : <PersonAddAlt1Rounded />} sx={{ ...inkSx(t), ...tapSx }}>
                    {current ? "Cambiar editor" : "Asignar"}
                </Button>
            ) : asLink ? (
                <TextAction onClick={(e) => setAnchor(e.currentTarget)} disabled={busy} aria-haspopup="menu">{busy ? "Asignando…" : label}</TextAction>
            ) : (
                <Button size="small" startIcon={busy ? <CircularProgress size={14} /> : <PersonAddAlt1Rounded />} disabled={busy} onClick={(e) => setAnchor(e.currentTarget)}>
                    {label}
                </Button>
            )}
            <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
                {editors.length === 0 && <MenuItem disabled>No hay editores: créalos en Usuarios con el rol "Editor de video" o "Editor líder".</MenuItem>}
                {editors.map((e) => (
                    <MenuItem key={e.id} selected={e.id === current} onClick={() => assign(e.id)} sx={{ minHeight: 44 }}>{e.name}{e.leader ? " (líder, tú)" : ""}</MenuItem>
                ))}
                {allowNone && current && <MenuItem onClick={() => assign(null)} sx={{ minHeight: 44 }}>Sin asignar</MenuItem>}
            </Menu>
        </>
    );
};

const REVIEW_TONE: Record<Delivery["review"], "amber" | "green" | "red"> = { pending: "amber", approved: "green", returned: "red" };

/** Las versiones entregadas, la más nueva arriba, con el archivo (o el enlace) y el hook de cada pieza y lo que dijo la revisión. */
export const DeliveriesList: React.FC<{ deliveries: Delivery[]; defaultOpen?: boolean }> = ({ deliveries, defaultOpen = false }) => {
    const t = useTokens();
    const [open, setOpen] = useState(defaultOpen);
    if (deliveries.length === 0) return null;
    return (
        <Box sx={{ mt: 0.75 }}>
            <Button size="small" onClick={() => setOpen(!open)} endIcon={open ? <ExpandLessRounded /> : <ExpandMoreRounded />} aria-expanded={open}
                sx={{ textTransform: "none", px: 0.5, color: t.ink, minHeight: 36 }}>
                Entregas ({deliveries.map((d) => d.version).join(", ")})
            </Button>
            <Collapse in={open}>
                <Stack spacing={1.25} sx={{ mt: 0.5 }}>
                    {deliveries.map((d) => (
                        <Box key={d.id} sx={{ borderLeft: `3px solid ${t[REVIEW_TONE[d.review]]}`, pl: 1.25 }}>
                            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                                <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{d.version}</Typography>
                                <Dot color={t[REVIEW_TONE[d.review]]} size={8} />
                                <Typography sx={{ fontSize: 13 }}>{d.review_label}</Typography>
                                <Typography sx={{ fontSize: 12, color: t.muted }}>
                                    {[d.editor, d.delivered_at && dateTime(d.delivered_at), d.reviewed_by && `revisó ${d.reviewed_by}`].filter(Boolean).join(" · ")}
                                </Typography>
                            </Stack>
                            {(d.concept || d.angle) && (
                                <Typography sx={{ fontSize: 12, color: t.muted, overflowWrap: "anywhere" }}>
                                    {[d.concept && `Concepto: ${d.concept}`, d.angle && `Ángulo: ${d.angle}`].filter(Boolean).join(" · ")}
                                </Typography>
                            )}
                            {d.pieces.map((p) => (
                                <Box key={p.piece_id} sx={{ mt: 0.5 }}>
                                    <Typography sx={{ fontSize: 13, overflowWrap: "anywhere" }}>
                                        <b>{p.code ?? "Pieza"}</b>
                                        {!p.file && p.link && (
                                            <>{" "}<Link href={p.link} target="_blank" rel="noopener noreferrer" underline="hover">abrir en Drive <OpenInNewRounded sx={{ fontSize: 12, verticalAlign: "middle" }} /></Link></>
                                        )}
                                        {p.hook && <> · hook: {p.hook}</>}
                                        {(p.reference || p.source_label) && <> · salió de {p.reference ? p.reference.code : p.source_label?.toLowerCase()}</>}
                                    </Typography>
                                    {p.file && <FileView file={p.file} />}
                                </Box>
                            ))}
                            {d.notes && <Typography sx={{ fontSize: 12, color: t.muted }}>Notas: {d.notes}</Typography>}
                            {d.comment && <Typography sx={{ fontSize: 14, mt: 0.25, overflowWrap: "anywhere", whiteSpace: "pre-line" }}><b>{d.review === "returned" ? "Para cambiar" : "Comentario"}:</b> {d.comment}</Typography>}
                        </Box>
                    ))}
                </Stack>
            </Collapse>
        </Box>
    );
};

type Verdict = "ok" | "change";

/**
 * Revisar la entrega pendiente pieza por pieza. En cada una "Está bien" o "Cambiar algo" (con lo que hay que cambiar en esa
 * pieza). Al final, aprobar (pasa a la banca) o devolver: el comentario se arma solo con el código de cada pieza ("C0144: …").
 * `.93` (dueño: "del lado izquierdo la referencia que se utilizó en el video y del lado derecho el video que acaba de hacer el
 * editor… y también la hipótesis que se quiere probar y lo que se le pidió al editor"): arriba "Lo que se busca"; por pieza,
 * lo que se pidió y la referencia al lado de lo entregado, "Ver los dos juntos" y "Marcar este segundo"; motivos rápidos al
 * pedir un cambio; y al terminar, el siguiente por revisar ("next"; sin "next", se cierra como antes).
 */
export const ReviewDialog = <B,>({ open, title, delivery, url, context, detail, next, onClose, onDone }: {
    open: boolean; title: string; delivery: Delivery | null; url: string;
    /** .93: lo que se busca y lo que se pidió en cada pieza; "detail": todo el encargo, plegado. */
    context?: ReviewContext | null; detail?: React.ReactNode;
    /** .93: lo que queda por revisar después de este (null: nada; sin pasarlo, la ventana se cierra al terminar). */
    next?: { code: string; left: number; onOpen: () => void } | null;
    onClose: () => void; onDone: (b: B) => void;
}) => {
    const t = useTokens();
    const phone = useMediaQuery(useTheme().breakpoints.down("sm"));
    const pieces = delivery?.pieces ?? [];
    const [idx, setIdx] = useState(0);
    const [verdicts, setVerdicts] = useState<Record<number, Verdict>>({});
    const [notes, setNotes] = useState<Record<number, string>>({});
    const [reasons, setReasons] = useState<Record<number, string[]>>({});
    const [general, setGeneral] = useState("");
    const [showGeneral, setShowGeneral] = useState(false);
    const [busy, setBusy] = useState(false);
    const [finished, setFinished] = useState<string | null>(null);
    const noteRef = useRef<HTMLTextAreaElement | null>(null);
    const [wasOpen, setWasOpen] = useState(open);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) { setIdx(0); setVerdicts({}); setNotes({}); setReasons({}); setGeneral(""); setShowGeneral(false); setFinished(null); }
    }

    const p = pieces[Math.min(idx, Math.max(pieces.length - 1, 0))];
    const noteOf = (id: number) => (notes[id] ?? "").trim();
    const reasonsOf = (id: number) => reasons[id] ?? [];
    const changes = pieces.filter((x) => verdicts[x.piece_id] === "change" && (reasonsOf(x.piece_id).length > 0 || noteOf(x.piece_id) !== ""));
    // "C0146: Hook flojo, Texto mal puesto. seg. 0:03: el texto tapa la cara"
    const comment = [
        ...changes.map((x) => `${x.code ?? "Pieza"}: ${[reasonsOf(x.piece_id).join(", "), noteOf(x.piece_id)].filter(Boolean).join(". ")}`),
        general.trim(),
    ].filter(Boolean).join("\n");
    const seen = pieces.filter((x) => verdicts[x.piece_id]).length;
    const canReturn = comment.length >= 10;

    const choose = (v: Verdict) => {
        if (!p) return;
        setVerdicts((s) => ({ ...s, [p.piece_id]: v }));
        // "Está bien" pasa sola a la siguiente pieza que falta mirar
        if (v === "ok") {
            const nextPiece = pieces.findIndex((x, i) => i > idx && !verdicts[x.piece_id]);
            if (nextPiece >= 0) setIdx(nextPiece);
        }
    };
    const toggleReason = (r: string) => {
        if (!p) return;
        setReasons((s) => {
            const cur = s[p.piece_id] ?? [];
            return { ...s, [p.piece_id]: cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r] };
        });
    };
    /** "Marcar este segundo": la pieza pasa a "Cambiar algo" y la nota suma "seg. 0:03: ". */
    const mark = (seconds: number) => {
        if (!p) return;
        const id = p.piece_id;
        setVerdicts((s) => ({ ...s, [id]: "change" }));
        setNotes((s) => {
            const cur = (s[id] ?? "").trimEnd();
            return { ...s, [id]: `${cur ? `${cur}\n` : ""}seg. ${clock(seconds)}: ` };
        });
        window.setTimeout(() => { const el = noteRef.current; if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 50);
    };
    const send = async (approve: boolean) => {
        if (approve && changes.length > 0 && !window.confirm(`Marcaste cambios en ${changes.length === 1 ? "1 pieza" : `${changes.length} piezas`}. ¿Aprobar igual? (Tus notas quedan como comentario.)`)) return;
        setBusy(true);
        try {
            const r = await api<{ batch: B }>(url, "POST", { approve, comment: comment || null });
            const done = approve ? `${title} aprobado: pasa a la banca.` : `${title} devuelto${delivery?.editor ? ` a ${delivery.editor}` : ""} con ${changes.length === 1 ? "1 cambio" : `${changes.length || 1} cambios`}.`;
            onDone(r.batch);
            if (next === undefined) { toast.success(done); onClose(); } else setFinished(done);
        } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
    };

    const pick = (v: Verdict, label: string, icon: React.ReactNode) => {
        const on = p && verdicts[p.piece_id] === v;
        return (
            <Button variant="outlined" startIcon={icon} onClick={() => choose(v)} aria-pressed={!!on}
                sx={{ ...lineSx(t), ...tapSx, flex: 1, ...(on ? { borderColor: t.ink, borderWidth: 2, "&:hover": { borderColor: t.ink, borderWidth: 2 } } : {}) }}>
                {label}
            </Button>
        );
    };
    const asked = p ? context?.asked[p.piece_id] : undefined;

    // .93: terminado: lo que pasó y el siguiente por revisar (o "Equipo al día")
    if (finished) {
        return (
            <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { ...geist, borderRadius: "12px" } }}>
                <DialogContent sx={{ textAlign: "center", pt: 3 }}>
                    <CheckCircleRounded sx={{ fontSize: 40, color: t.green }} />
                    <Typography role="status" sx={{ fontSize: 16, fontWeight: 600, mt: 1 }}>{finished}</Typography>
                    <Typography sx={{ fontSize: 14, color: t.muted, mt: 0.5 }}>
                        {next ? (next.left === 1 ? "Queda 1 por revisar." : `Quedan ${next.left} por revisar.`) : "Equipo al día: no queda nada por revisar."}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button onClick={onClose} sx={{ color: t.muted, ...tapSx }}>Cerrar</Button>
                    {next && (
                        <Button variant="contained" disableElevation startIcon={<RateReviewRounded />} onClick={next.onOpen} sx={{ ...inkSx(t), ...tapSx, flex: 1 }}>
                            Revisar {next.code}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onClose={busy ? undefined : onClose} fullScreen={phone} fullWidth maxWidth="lg" PaperProps={{ sx: { ...geist, borderRadius: phone ? 0 : "12px" } }}>
            <DialogTitle sx={{ pb: 1, pr: 7, position: "relative" }}>
                <IconButton aria-label="Cerrar sin revisar" onClick={onClose} disabled={busy} sx={{ position: "absolute", right: 8, top: 8, width: 44, height: 44, color: t.muted }}>
                    <CloseRounded />
                </IconButton>
                <Typography component="span" sx={{ display: "block", fontSize: 20, fontWeight: 600 }}>Revisar {title}{delivery ? ` · ${delivery.version}` : ""}</Typography>
                {delivery && (
                    <Typography component="span" sx={{ display: "block", fontSize: 13, color: t.muted, mt: 0.25 }}>
                        {[delivery.editor && `Lo entregó ${delivery.editor}`, delivery.concept && `Concepto: ${delivery.concept}`, delivery.angle && `Ángulo: ${delivery.angle}`].filter(Boolean).join(" · ")}
                    </Typography>
                )}
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: t.line }}>
                {!p ? <Typography sx={{ color: t.muted }}>No hay una entrega para revisar.</Typography> : <>
                    {context && <ReviewBrief c={context} detail={detail} />}
                    {/* Las piezas como un mapa: mirada bien (verde), con cambios (ámbar) o sin mirar */}
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1.25 }}>
                        <Typography sx={{ fontSize: 13, color: t.muted }}>Pieza {idx + 1} de {pieces.length}</Typography>
                        {pieces.map((x, i) => {
                            const v = verdicts[x.piece_id];
                            return (
                                <ButtonBase key={x.piece_id} onClick={() => setIdx(i)} aria-label={`${x.code ?? `Pieza ${i + 1}`}: ${v === "ok" ? "está bien" : v === "change" ? "con cambios" : "sin mirar"}`}
                                    sx={{ px: 1.25, minHeight: 36, borderRadius: "8px", fontSize: 13, gap: 0.5, border: `1px solid ${i === idx ? t.ink : t.line}`,
                                        "&.Mui-focusVisible": { outline: `2px solid ${t.ink}` } }}>
                                    <Dot color={v === "ok" ? t.green : v === "change" ? t.amber : t.gray} size={8} />{x.code ?? i + 1}
                                </ButtonBase>
                            );
                        })}
                    </Stack>
                    {/* Lo que se pidió en esta pieza */}
                    {(asked?.change || asked?.hypothesis) && (
                        <Box sx={{ mb: 1.25, pl: 1.25, borderLeft: `3px solid ${t.ink}` }}>
                            <Typography sx={{ fontSize: 12, color: t.muted }}>Lo que se pidió en {p.code ?? "esta pieza"}{asked.test_label ? ` · ${asked.test_label}` : ""}</Typography>
                            {asked.change && <Typography sx={{ fontSize: 14, lineHeight: 1.45, overflowWrap: "anywhere" }}>{asked.change}</Typography>}
                            {asked.hypothesis && <Typography sx={{ fontSize: 13, color: t.muted, overflowWrap: "anywhere" }}>Qué probamos: {asked.hypothesis}</Typography>}
                        </Box>
                    )}
                    <CompareMedia key={`comparar-${p.piece_id}`} onMark={mark}
                        left={referenceSide(p.source, p.reference, context?.iteration)}
                        right={{
                            label: `Lo entregado · ${p.code ?? "la pieza"}`, file: p.file,
                            lines: [p.hook ? `Hook: ${p.hook}` : ""].filter(Boolean),
                            empty: !p.file && p.link ? "Entrega de antes: está en Drive." : "Esta pieza no tiene archivo.",
                            link: !p.file && p.link ? { href: p.link, label: "abrir en Drive" } : null,
                        }} />
                    <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                        {pick("ok", "Está bien", <CheckRounded />)}
                        {pick("change", "Cambiar algo", <EditRounded />)}
                    </Stack>
                    {verdicts[p.piece_id] === "change" && (
                        <Box key={`cambiar-${p.piece_id}`} sx={{ mt: 1.5 }}>
                            <Typography sx={{ fontSize: 13, color: t.muted }}>Qué cambiar en {p.code ?? "esta pieza"} (toca uno o varios)</Typography>
                            <Stack direction="row" flexWrap="wrap" useFlexGap gap={0.75} sx={{ mt: 0.5 }}>
                                {REVIEW_REASONS.map((r) => {
                                    const on = reasonsOf(p.piece_id).includes(r);
                                    return (
                                        <ButtonBase key={r} onClick={() => toggleReason(r)} aria-pressed={on}
                                            sx={{ px: 1.5, minHeight: { xs: 40, sm: 34 }, borderRadius: "999px", fontSize: 13, border: `1px solid ${on ? t.ink : t.line}`,
                                                bgcolor: on ? t.ink : "transparent", color: on ? t.onInk : t.ink, gap: 0.5, "&.Mui-focusVisible": { outline: `2px solid ${t.ink}`, outlineOffset: 2 } }}>
                                            {on && <CheckRounded sx={{ fontSize: 16 }} />}{r}
                                        </ButtonBase>
                                    );
                                })}
                            </Stack>
                            <TextField inputRef={noteRef} label="Nota (opcional)" placeholder="Algo que se vea: el segundo, el texto o la imagen (seg. 0:03: el texto tapa la cara)"
                                value={notes[p.piece_id] ?? ""} onChange={(e) => setNotes((s) => ({ ...s, [p.piece_id]: e.target.value }))} fullWidth multiline minRows={2}
                                sx={{ mt: 1.25 }} inputProps={{ maxLength: 600 }} />
                        </Box>
                    )}
                    <Stack direction="row" justifyContent="space-between" sx={{ mt: 1.5, fontSize: 14 }}>
                        <TextAction onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}>← Anterior</TextAction>
                        <TextAction onClick={() => setIdx((i) => Math.min(pieces.length - 1, i + 1))} disabled={idx >= pieces.length - 1}>Siguiente →</TextAction>
                    </Stack>
                    <Box sx={{ mt: 2, fontSize: 14 }}>
                        {showGeneral ? (
                            <TextField label="Comentario general (opcional)" value={general} onChange={(e) => setGeneral(e.target.value)} fullWidth multiline minRows={2} inputProps={{ maxLength: 800 }} />
                        ) : <TextAction onClick={() => setShowGeneral(true)} sx={{ color: t.muted }}>Agregar un comentario general</TextAction>}
                    </Box>
                </>}
            </DialogContent>
            <DialogActions sx={{ flexDirection: "column", alignItems: "stretch", gap: 1, p: 2 }}>
                <Typography role="status" sx={{ fontSize: 13, color: t.muted }}>
                    {seen < pieces.length ? `Miraste ${seen} de ${pieces.length}. ` : "Miraste todas. "}
                    {changes.length > 0 ? `Para cambiar: ${changes.map((x) => x.code).join(", ")}.` : canReturn ? "" : "Para devolver, toca «Cambiar algo» en la pieza y elige qué cambiar."}
                </Typography>
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button variant="outlined" disabled={busy || !canReturn} onClick={() => send(false)}
                        sx={{ ...lineSx(t), ...tapSx, flex: { xs: 1, sm: "none" }, color: t.red, borderColor: t.red, "&:hover": { borderColor: t.red, bgcolor: "transparent" } }}>
                        {phone ? "Devolver" : changes.length > 1 ? `Devolver con ${changes.length} cambios` : "Devolver con el cambio"}
                    </Button>
                    <Button variant="contained" disableElevation disabled={busy} onClick={() => send(true)} startIcon={<CheckCircleRounded />}
                        sx={{ ...inkSx(t), ...tapSx, flex: { xs: 1, sm: "none" } }}>
                        {phone ? "Aprobar" : "Aprobar: a la banca"}
                    </Button>
                </Stack>
            </DialogActions>
        </Dialog>
    );
};

type FormPiece = { id: number; code: string | null; change: string | null; link: string; hook: string; file: StoredFile | null; progress: number | null; error: string | null;
    /** .92: de dónde salió ("" = falta elegir) y la referencia. */
    source: ReferenceSource | ""; ref: number | null };

/**
 * Entregar: el archivo (`.90`, subido al sistema; sin almacén, el enlace de Drive) y el hook de cada pieza, y la ficha
 * (concepto y ángulo, ya llenos). En una corrección cada pieza parte con su archivo de antes: se vuelve a subir solo la que
 * cambió. `.91`: "2 de 3 listas", una zona grande para tocar o soltar cada archivo, qué pasa al entregar ("own": lo del
 * líder pasa directo a la banca), te lleva a lo que falta y avisa antes de cerrar mientras sube algo.
 */
export const DeliverDialog = <B,>({ open, code, product, pieces, angle, concept, url, uploads, own, batchId, productId, angleCode, iterationOf, iteration, onClose, onDone }: {
    open: boolean; code: string; product?: string; pieces: DeliverPiece[]; angle: string; concept: string; url: string; uploads: boolean; own?: boolean; batchId: number;
    /** .92: para ofrecer primero las referencias de este producto y ángulo; "iterationOf": el ganador de una iteración. */
    productId?: number; angleCode?: string | null; iterationOf?: string | null;
    /** .93: el ganador que se itera, para compararse antes de entregar. */
    iteration?: Iteration | null;
    onClose: () => void; onDone: (b: B) => void;
}) => {
    const t = useTokens();
    const phone = useMediaQuery(useTheme().breakpoints.down("sm"));
    const fresh = () => ({
        concept, angle, notes: "",
        pieces: pieces.map((p): FormPiece => ({ id: p.id as number, code: p.code ?? null, change: p.change, link: p.link ?? "", hook: p.hook ?? "", file: p.file ?? null,
            progress: null, error: null, source: p.source ?? (iterationOf ? "iteration" : ""), ref: p.reference_id ?? null })),
    });
    const [form, setForm] = useState(fresh);
    const [busy, setBusy] = useState(false);
    const [tried, setTried] = useState(false);
    const [ficha, setFicha] = useState(false);
    const [dragging, setDragging] = useState<number | null>(null);
    const refs = useRef<Record<number, HTMLDivElement | null>>({});
    // .92: la biblioteca, para decir de dónde salió cada pieza (las de este producto primero)
    const [lib, setLib] = useState<ReferenceLibraryData | null>(null);
    const [uploadFor, setUploadFor] = useState<number | null>(null);
    // .93: la pieza que se está comparando con su referencia
    const [comparing, setComparing] = useState<number | null>(null);
    useEffect(() => {
        if (!open) return;
        api<ReferenceLibraryData>(`/editor/references${productId ? `?product_id=${productId}` : ""}`).then(setLib).catch(() => setLib(null));
    }, [open, productId]);
    const rank = (r: ReferenceLibraryData["references"][number]) => (r.product_id && r.product_id === productId ? (r.angle_code && r.angle_code === angleCode ? 0 : 1) : 2);
    const library = [...(lib?.references ?? [])].sort((a, b) => rank(a) - rank(b));
    // Al abrir de nuevo se parte de lo último entregado (si se lo devolvieron, cambia solo lo que hace falta)
    const [wasOpen, setWasOpen] = useState(open);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) { setForm(fresh()); setTried(false); setFicha(!concept.trim() || !angle.trim()); }
    }

    const linkError = (link: string) => (link.trim() === "" ? "Falta el enlace." : driveFileId(link) ? null : linkProblem(link));
    const hasFile = (p: FormPiece) => (uploads ? !!p.file && p.progress === null : !linkError(p.link));
    const sourced = (p: FormPiece) => !!p.source && (p.source !== "reference" || !!p.ref);
    const ready = (p: FormPiece) => hasFile(p) && p.hook.trim() !== "" && sourced(p);
    const uploading = form.pieces.some((p) => p.progress !== null);
    const done = form.pieces.filter(ready).length;
    const missing = [
        ...form.pieces.flatMap((p) => [!hasFile(p) && `${uploads ? "el archivo" : "el enlace"} de ${p.code ?? "una pieza"}`, p.hook.trim() === "" && `el hook de ${p.code ?? "una pieza"}`,
            !sourced(p) && `de dónde salió ${p.code ?? "una pieza"}`]),
        !form.concept.trim() && "el concepto", !form.angle.trim() && "el ángulo",
    ].filter(Boolean) as string[];
    const setPiece = (i: number, patch: Partial<FormPiece>) => setForm((f) => ({ ...f, pieces: f.pieces.map((p, j) => (j === i ? { ...p, ...patch } : p)) }));

    /** Sube el archivo de una pieza (queda con el nombre de su anuncio). */
    const upload = async (i: number, file: File | undefined) => {
        if (!file) return;
        const problem = fileProblem("piece", file);
        if (problem) { setPiece(i, { error: problem }); return; }
        setPiece(i, { progress: 0, error: null });
        try {
            const r = await sendFile<{ file: StoredFile }>(`/editor/queue/${batchId}/pieces/${form.pieces[i].id}/upload`, {}, file,
                (id) => `/editor/files/${id}/confirm`, (percent) => setPiece(i, { progress: percent }));
            setPiece(i, { file: r.file, progress: null });
        } catch (e) { setPiece(i, { progress: null, error: (e as Error).message }); }
    };
    const close = () => {
        if (busy) return;
        if (uploading && !window.confirm("Se está subiendo un archivo. Si cierras ahora, se pierde. ¿Cerrar igual?")) return;
        onClose();
    };

    const send = async () => {
        setTried(true);
        if (missing.length > 0 || uploading) {
            // Te lleva a lo primero que falta
            const first = form.pieces.findIndex((p) => !ready(p));
            if (first >= 0) refs.current[first]?.scrollIntoView({ behavior: "smooth", block: "center" });
            else setFicha(true);
            return;
        }
        setBusy(true);
        try {
            const r = await api<{ batch: B }>(url, "POST", {
                concept: form.concept, angle: form.angle, notes: form.notes,
                pieces: form.pieces.map((p) => ({ ...(uploads ? { id: p.id, file_id: p.file?.id ?? null, hook: p.hook } : { id: p.id, link: p.link, hook: p.hook }),
                    source: p.source || null, reference_id: p.source === "reference" ? p.ref : null })),
            });
            // .89: lo que entrega el editor líder pasa directo a la banca
            toast.success((r.batch as { status?: string } | null)?.status === "bank" ? `${code} entregado: pasa directo a la banca` : `${code} entregado: va a revisión del líder`);
            onDone(r.batch);
            onClose();
        } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
    };

    return (
        <Dialog open={open} onClose={close} fullScreen={phone} fullWidth maxWidth="sm" PaperProps={{ sx: { ...geist, borderRadius: phone ? 0 : "12px" } }}>
            <DialogTitle sx={{ pb: 1 }}>
                <Typography component="span" sx={{ display: "block", fontSize: 20, fontWeight: 600 }}>Entregar {code}</Typography>
                {product && <Typography component="span" sx={{ display: "block", fontSize: 13, color: t.muted }}>{product}</Typography>}
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                    <Typography component="span" sx={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" }} role="status">
                        {done} de {form.pieces.length} {form.pieces.length === 1 ? "pieza lista" : "piezas listas"}
                    </Typography>
                    <LinearProgress variant="determinate" value={form.pieces.length ? (done / form.pieces.length) * 100 : 0} aria-hidden
                        sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: t.soft, "& .MuiLinearProgress-bar": { bgcolor: done === form.pieces.length ? t.green : t.ink } }} />
                </Stack>
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: t.line }}>
                {!uploads && (
                    <Typography sx={{ fontSize: 13, color: t.muted, mb: 1.5 }}>
                        Sube cada video a Drive y pega el enlace <b>de cada archivo</b> (no de la carpeta). Dale acceso al dueño. Ponle a cada archivo su número (por ejemplo, C0457).
                    </Typography>
                )}
                <Stack spacing={1.5}>
                    {form.pieces.map((p, i) => {
                        const ok = ready(p);
                        const err = p.error ?? (tried && !hasFile(p) ? (uploads ? "Falta el video o la imagen." : linkError(p.link)) : null);
                        return (
                            <Box key={p.id} ref={(el: HTMLDivElement | null) => { refs.current[i] = el; }}
                                sx={{ border: `1px solid ${tried && !ok ? t.red : t.line}`, borderRadius: "10px", p: "12px 14px" }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
                                    <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{p.code ?? `Pieza ${i + 1}`}</Typography>
                                    <Typography sx={{ fontSize: 13, color: ok ? t.green : t.muted, display: "flex", alignItems: "center", gap: 0.5, whiteSpace: "nowrap" }}>
                                        {ok ? <><CheckCircleRounded sx={{ fontSize: 16 }} />Lista</> : p.progress !== null ? `Subiendo ${p.progress} %` : "Falta"}
                                    </Typography>
                                </Stack>
                                {p.change && <Typography sx={{ fontSize: 13, color: t.muted, overflowWrap: "anywhere" }}>{p.change}</Typography>}
                                {uploads ? (
                                    <Box sx={{ mt: 1 }}>
                                        {p.progress !== null ? (
                                            <Box sx={{ p: 2, borderRadius: "10px", bgcolor: t.soft }}>
                                                <LinearProgress variant="determinate" value={p.progress} sx={{ height: 6, borderRadius: 3, "& .MuiLinearProgress-bar": { bgcolor: t.ink } }} />
                                                <Typography sx={{ fontSize: 13, color: t.muted, mt: 0.75 }}>Subiendo… {p.progress} % · no cierres esta ventana</Typography>
                                            </Box>
                                        ) : p.file ? (
                                            <>
                                                <FileView file={p.file} height={200} />
                                                <ButtonBase component="label" sx={{ fontSize: 14, color: t.ink, textDecoration: "underline", textUnderlineOffset: 3, mt: 0.5, minHeight: 32, borderRadius: 1,
                                                    "&:focus-within": { outline: `2px solid ${t.ink}` } }}>
                                                    Cambiar el archivo
                                                    <input hidden type="file" accept={ACCEPT.piece} onChange={(e) => { upload(i, e.target.files?.[0]); e.target.value = ""; }} />
                                                </ButtonBase>
                                            </>
                                        ) : (
                                            <ButtonBase component="label"
                                                onDragOver={(e: React.DragEvent) => { e.preventDefault(); setDragging(i); }} onDragLeave={() => setDragging(null)}
                                                onDrop={(e: React.DragEvent) => { e.preventDefault(); setDragging(null); upload(i, e.dataTransfer.files?.[0]); }}
                                                sx={{ width: "100%", minHeight: 96, p: 2, borderRadius: "10px", border: `1.5px dashed ${dragging === i ? t.ink : err ? t.red : t.faint}`,
                                                    bgcolor: dragging === i ? t.soft : "transparent", display: "flex", flexDirection: "column", gap: 0.5, textAlign: "center",
                                                    "&:hover": { bgcolor: t.soft }, "&:focus-within": { outline: `2px solid ${t.ink}`, outlineOffset: 2 } }}>
                                                <UploadFileRounded sx={{ color: t.muted }} />
                                                <Typography sx={{ fontSize: 15, fontWeight: 500 }}>{phone ? "Toca para elegir el video" : "Toca para elegir el video o suéltalo aquí"}</Typography>
                                                <Typography sx={{ fontSize: 12, color: t.muted }}>mp4, mov o webm (hasta 1 GB), o una imagen. Se nombra solo.</Typography>
                                                <input hidden type="file" accept={ACCEPT.piece} onChange={(e) => { upload(i, e.target.files?.[0]); e.target.value = ""; }} />
                                            </ButtonBase>
                                        )}
                                        {err && <Typography role="alert" sx={{ fontSize: 13, color: t.red, mt: 0.75 }}>{err}</Typography>}
                                    </Box>
                                ) : (
                                    <TextField label="Enlace de Drive del video" value={p.link} onChange={(e) => setPiece(i, { link: e.target.value })} fullWidth sx={{ mt: 1 }}
                                        error={!!err} helperText={err ?? " "} inputProps={{ maxLength: 1000, inputMode: "url" }} />
                                )}
                                {/* .92: de dónde salió (para medir qué referencias dan ganadores) */}
                                <TextField select label="¿De dónde salió?" fullWidth sx={{ mt: 1.5 }}
                                    value={p.source === "reference" && p.ref ? `ref:${p.ref}` : p.source}
                                    onChange={(e) => { const v = e.target.value; setPiece(i, v.startsWith("ref:") ? { source: "reference", ref: Number(v.slice(4)) } : { source: v as ReferenceSource, ref: null }); }}
                                    error={tried && !sourced(p)} helperText={tried && !sourced(p) ? "Elige la referencia de la que salió, o «Idea propia»." : undefined}>
                                    <MenuItem value="own">Idea propia</MenuItem>
                                    {iterationOf && <MenuItem value="iteration">Iteración de {iterationOf}</MenuItem>}
                                    {library.map((r) => (
                                        <MenuItem key={r.id} value={`ref:${r.id}`} sx={{ whiteSpace: "normal" }}>
                                            {r.code} · {r.type_label} · {r.product ? `${r.product}${r.angle_code ? ` ${r.angle_code}` : ""}` : "cualquier producto"} — {r.why.length > 60 ? `${r.why.slice(0, 60)}…` : r.why}
                                        </MenuItem>
                                    ))}
                                </TextField>
                                {lib?.uploads && (
                                    <TextAction onClick={() => setUploadFor(i)} sx={{ fontSize: 13, color: t.muted, mt: 0.5 }}>¿No está en la biblioteca? Súbela</TextAction>
                                )}
                                {/* .93: compararse con la referencia antes de entregar */}
                                {p.file && p.progress === null && ((p.source === "reference" && p.ref) || (p.source === "iteration" && iteration)) && (() => {
                                    const ref = p.source === "reference" ? library.find((r) => r.id === p.ref) : null;
                                    return (
                                        <Box sx={{ mt: 0.75 }}>
                                            <TextAction onClick={() => setComparing((c) => (c === i ? null : i))} aria-expanded={comparing === i} sx={{ fontSize: 14 }}>
                                                {comparing === i ? "Ocultar la comparación" : `Comparar con ${ref ? ref.code : `el ganador ${iteration?.code ?? ""}`.trim()}`}
                                            </TextAction>
                                            <Collapse in={comparing === i} unmountOnExit>
                                                <Box sx={{ mt: 1 }}>
                                                    <CompareMedia left={referenceSide(p.source || null, ref, iteration)} right={{ label: `Tu pieza · ${p.code ?? `Pieza ${i + 1}`}`, file: p.file, lines: [] }} />
                                                </Box>
                                            </Collapse>
                                        </Box>
                                    );
                                })()}
                                <TextField label="Hook (lo primero que se dice o se lee)" value={p.hook} onChange={(e) => setPiece(i, { hook: e.target.value })} fullWidth sx={{ mt: 1.5 }}
                                    error={tried && p.hook.trim() === ""} helperText={tried && p.hook.trim() === "" ? "Falta el hook." : undefined} inputProps={{ maxLength: 300 }} />
                            </Box>
                        );
                    })}
                    {/* El concepto y el ángulo ya vienen llenos: se cambian solo si hace falta */}
                    <Box sx={{ fontSize: 14 }}>
                        {!ficha ? (
                            <Typography component="div" sx={{ fontSize: 14, color: t.muted, overflowWrap: "anywhere" }}>
                                Concepto: <b style={{ color: t.ink, fontWeight: 500 }}>{form.concept}</b> · Ángulo: <b style={{ color: t.ink, fontWeight: 500 }}>{form.angle}</b>
                                {" · "}<TextAction onClick={() => setFicha(true)}>Cambiar o agregar una nota</TextAction>
                            </Typography>
                        ) : (
                            <Stack spacing={1.5}>
                                <TextField label="Concepto" value={form.concept} onChange={(e) => setForm({ ...form, concept: e.target.value })} fullWidth
                                    error={tried && !form.concept.trim()} inputProps={{ maxLength: 255 }} />
                                <TextField label="Ángulo" value={form.angle} onChange={(e) => setForm({ ...form, angle: e.target.value })} fullWidth
                                    error={tried && !form.angle.trim()} inputProps={{ maxLength: 120 }} />
                                <TextField label="Nota para el líder (opcional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} fullWidth multiline minRows={2}
                                    inputProps={{ maxLength: 2000 }} />
                            </Stack>
                        )}
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ flexDirection: "column", alignItems: "stretch", gap: 1, p: 2 }}>
                {tried && missing.length > 0 ? (
                    <Typography role="alert" sx={{ fontSize: 13, color: t.red }}>Falta {missing.slice(0, 3).join(", ")}{missing.length > 3 ? ` y ${missing.length - 3} más` : ""}.</Typography>
                ) : (
                    <Typography sx={{ fontSize: 13, color: t.muted }}>{own ? "Al entregar: pasa directo a la banca, a tu nombre." : "Al entregar: va a revisión del líder."}</Typography>
                )}
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button onClick={close} disabled={busy} sx={{ color: t.muted, ...tapSx }}>Cancelar</Button>
                    <Button variant="contained" disableElevation disabled={busy || uploading} onClick={send} sx={{ ...inkSx(t), ...tapSx, flex: { xs: 1, sm: "none" } }}
                        startIcon={busy ? <CircularProgress size={14} sx={{ color: "inherit" }} /> : undefined}>
                        {busy ? "Entregando…" : uploading ? "Esperando la subida…" : `Entregar ${code}`}
                    </Button>
                </Stack>
            </DialogActions>
            {lib && (
                <UploadReferenceDialog open={uploadFor !== null} products={lib.products} types={lib.types} productId={productId} angleCode={angleCode}
                    onClose={() => setUploadFor(null)}
                    onCreated={(r) => {
                        setLib((l) => (l ? { ...l, references: [r, ...l.references] } : l));
                        if (uploadFor !== null) setPiece(uploadFor, { source: "reference", ref: r.id });
                    }} />
            )}
        </Dialog>
    );
};
