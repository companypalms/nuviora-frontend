// src/pages/editor/EditorPage.tsx
// Etapa 5, paso 5a (2026-10-30): las pantallas de los editores de video. "Mis encargos" (los dos editores) y "Encargos del
// equipo" (solo el editor líder: asignar y revisar). Sin dinero.
// .91 (dueño, 2026-11-03: "se debe saber en menos de 3 segundos qué se debe hacer, cómo se debe hacer… debe ser muy
// intuitivo todo"): rehechas con las reglas del juego (guias/DISENO-UX-UI.md). Cada una responde una pregunta:
// - Mis encargos: "¿Qué entrego ahora?" → arriba la misión (el encargo más urgente: lo devuelto, lo atrasado, por fecha)
//   con dónde, qué, los pasos y un solo botón ("Entregar"); el marcador (por entregar, atrasados, en revisión); lo demás
//   debajo. Sin "Empezar": el primer archivo lo empieza solo.
// - Encargos del equipo: "¿Qué reviso o asigno ahora?" → arriba lo más urgente con su botón ("Revisar" o "Asignar"); el
//   marcador (para revisar, sin asignar, atrasados); "Lo que necesitamos" (cada uno se toca); "¿Alcanza el equipo?" en
//   una línea; las listas debajo.
// .93 (dueño: "la pantalla principal debería ser la de encargos del equipo"; "no veo ningún lado que diga por revisar"):
//   el líder entra aquí; "Por revisar" va justo debajo de lo de ahora y se ve siempre (vacío también); tocar un encargo
//   abre "Revisar", que compara la referencia con lo entregado y al terminar ofrece el siguiente.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Button, ButtonBase, Collapse, Link, Skeleton, Stack, Typography } from "@mui/material";
import { CheckCircleRounded, RateReviewRounded, ReportProblemRounded, TaskAltRounded, UploadRounded } from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { Layout } from "../../components/ui/Layout";
import { useValidateSession } from "../../hooks/useValidateSession";
import { api, dateTime } from "../../components/meta-ads/metaAds";
import { AssignButton, CopyBrief, DeliverDialog, DeliveriesList, ReviewDialog } from "../../components/meta-ads/editorWork";
import { EditorBatch, EditorOption, dueLabel, notifyEditorChanged, reviewContext, todayVe, whenLabel } from "../../components/meta-ads/editorShared";
import { Forecast, ForecastCard, NeedsList, Unfilled } from "../../components/meta-ads/editorDemand";
import { BriefDetail } from "../../components/meta-ads/briefView";
import { appear, cardSx, geist, inkSx, lineSx, plural, tapSx, Tokens, useTokens } from "../../components/ui/design";
import { Dot, NumberedSteps, Scoreboard, Section, TextAction } from "../../components/ui/designParts";

type Data = {
    me: { id: number; name: string; leader: boolean }; batches: EditorBatch[]; editors: EditorOption[];
    pending: { todo: number; to_assign: number; to_review: number; total: number };
    /** .88: para el líder: lo que hace falta y no se pudo pedir, si alcanza el equipo y el día de hoy (hora de Venezuela). */
    unfilled?: Unfilled[]; forecast?: Forecast | null; today?: string;
    /** .89: entrega + estos días de correcciones = lista en la banca. .90: se entrega subiendo el archivo. */
    corrections_days?: number; uploads?: boolean;
};

const DONE = ["bank", "testing", "tested", "discarded"];
const TODO = ["approved", "production"];

const addDays = (date: string, n: number) => {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
/** La fecha que cuenta: la entrega; lo entregado o devuelto, "lista" (entrega + correcciones del líder). */
const dueOf = (b: EditorBatch, corrections: number) => ((b.returned || b.status === "review") && b.due_date ? addDays(b.due_date, corrections) : b.due_date);
/** Lo devuelto primero, después lo atrasado, por fecha y por el orden de la cola. */
const byUrgency = (corrections: number) => (a: EditorBatch, b: EditorBatch) =>
    Number(!!b.returned) - Number(!!a.returned) || Number(b.overdue) - Number(a.overdue)
    || (dueOf(a, corrections) ?? "9").localeCompare(dueOf(b, corrections) ?? "9") || (a.position ?? 1e9) - (b.position ?? 1e9) || a.id - b.id;
const signal = (t: Tokens, level: string) => (level === "late" ? t.red : level === "today" ? t.amber : t.gray);
const angleOf = (b: EditorBatch) => b.angle_name ?? b.angle_code;
const piecesText = (b: EditorBatch) => plural(b.pieces.length, "pieza", "piezas");

/** Lo que te devolvieron: lo que pidió el líder, a la vista. */
const Returned: React.FC<{ b: EditorBatch }> = ({ b }) => {
    const t = useTokens();
    return b.returned ? (
        <Box sx={{ mt: 1.25, p: "10px 12px", borderRadius: "8px", bgcolor: t.soft, borderLeft: `3px solid ${t.amber}` }}>
            <Typography sx={{ fontSize: 13, color: t.muted }}>Lo que pidió {b.returned.by ?? "el líder"} ({b.returned.version})</Typography>
            <Typography sx={{ fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-line", overflowWrap: "anywhere" }}>{b.returned.comment}</Typography>
        </Box>
    ) : null;
};

/** Un encargo de la lista: qué es, para cuándo y su botón; todo el encargo, plegado. */
const BatchRow: React.FC<{
    b: EditorBatch; sub: string; dot: string; open: boolean; onToggle: () => void; action?: React.ReactNode; extra?: React.ReactNode;
    /** .93: tocar el encargo lo abre (en "Por revisar", la ventana de revisar). */
    onOpen?: () => void;
}> = ({ b, sub, dot, open, onToggle, action, extra, onOpen }) => {
    const t = useTokens();
    const head = (
        <>
            <Typography sx={{ fontSize: 15, fontWeight: 500, overflowWrap: "anywhere" }}>
                {b.code ?? "Encargo"} · {b.product}{angleOf(b) ? ` · ${angleOf(b)}` : ""}
            </Typography>
            <Typography sx={{ fontSize: 13, color: t.muted, overflowWrap: "anywhere" }}>{sub}</Typography>
        </>
    );
    return (
        <Box id={`encargo-${b.id}`} sx={{ ...cardSx(t), p: "12px 14px", mb: 0.75, scrollMarginTop: 80 }}>
            <Stack direction="row" spacing={1.25} alignItems="flex-start">
                <Box sx={{ pt: "6px" }}><Dot color={dot} size={9} /></Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    {onOpen ? (
                        <ButtonBase onClick={onOpen} aria-label={`Revisar ${b.code ?? "el encargo"}`}
                            sx={{ display: "block", textAlign: "left", width: "100%", borderRadius: "6px", "&.Mui-focusVisible": { outline: `2px solid ${t.ink}`, outlineOffset: 2 } }}>
                            {head}
                        </ButtonBase>
                    ) : head}
                    <TextAction onClick={onToggle} aria-expanded={open} sx={{ fontSize: 13, color: t.muted, mt: 0.25 }}>{open ? "Ocultar" : "Ver el encargo"}</TextAction>
                </Box>
                {action && <Box sx={{ flex: "none" }}>{action}</Box>}
            </Stack>
            <Collapse in={open} unmountOnExit>
                <Box sx={{ pl: { xs: 0, sm: 2.5 } }}>
                    <Returned b={b} />
                    <BriefDetail b={b} />
                    <DeliveriesList deliveries={b.deliveries} />
                    <Stack direction="row" columnGap={2} rowGap={0.5} flexWrap="wrap" sx={{ mt: 1, fontSize: 14 }}>
                        <CopyBrief text={b.brief} asLink />
                        {extra}
                    </Stack>
                </Box>
            </Collapse>
        </Box>
    );
};

/** Un botón con borde para la lista (lo principal de cada fila). */
const RowButton: React.FC<{ onClick: () => void; children: React.ReactNode; icon?: React.ReactNode }> = ({ onClick, children, icon }) => {
    const t = useTokens();
    return <Button variant="outlined" size="small" startIcon={icon} onClick={onClick} sx={{ ...lineSx(t), ...tapSx, whiteSpace: "nowrap" }}>{children}</Button>;
};

const PageSkeleton: React.FC = () => (
    <Box aria-busy="true" aria-label="Cargando tus encargos">
        <Skeleton width={220} height={34} />
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, mt: 2 }}>{[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={58} />)}</Box>
        <Skeleton variant="rounded" height={230} sx={{ mt: 2 }} />
        <Skeleton variant="rounded" height={64} sx={{ mt: 3 }} />
        <Skeleton variant="rounded" height={64} sx={{ mt: 1 }} />
    </Box>
);

export const EditorPage: React.FC<{ team?: boolean }> = ({ team = false }) => {
    const t = useTokens();
    const { loadingSession, isValid } = useValidateSession();
    const [data, setData] = useState<Data | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [openId, setOpenId] = useState<number | null>(null);
    const [deliverId, setDeliverId] = useState<number | null>(null);
    const [reviewId, setReviewId] = useState<number | null>(null);
    const [missionOpen, setMissionOpen] = useState(false);
    // El aviso verde de lo que acabas de hacer, solo en la pantalla donde lo hiciste
    const [cheerAt, setCheer] = useState<{ team: boolean; text: string } | null>(null);
    const cheer = cheerAt && cheerAt.team === team ? cheerAt.text : null;
    const [showDone, setShowDone] = useState(false);

    const load = useCallback(() => {
        setError(null);
        api<Data>("/editor/queue").then(setData).catch((e) => setError((e as Error).message));
    }, []);
    useEffect(() => { if (isValid) load(); }, [isValid, load]);

    const today = data?.today ?? todayVe();
    const corrections = data?.corrections_days ?? 1;
    const lists = useMemo(() => {
        const all = data?.batches ?? [];
        const mine = all.filter((b) => b.editor_id === data?.me.id);
        const urgent = byUrgency(corrections);
        return {
            todo: mine.filter((b) => TODO.includes(b.status)).sort(urgent),
            inReview: mine.filter((b) => b.status === "review"),
            done: mine.filter((b) => DONE.includes(b.status)),
            toReview: all.filter((b) => b.status === "review").sort((a, b) => Number(b.can.review) - Number(a.can.review) || urgent(a, b)),
            toAssign: all.filter((b) => b.status === "approved" && !b.editor_id).sort(urgent),
            working: all.filter((b) => (b.status === "approved" && b.editor_id) || b.status === "production").sort(urgent),
            bank: all.filter((b) => b.status === "bank"),
        };
    }, [data, corrections]);

    const changed = (message?: string) => { if (message) setCheer({ team, text: message }); setMissionOpen(false); load(); notifyEditorChanged(); };
    const toggle = (id: number) => setOpenId((o) => (o === id ? null : id));
    /** Desde "Lo que necesitamos": abre ese encargo y lo trae a la vista. */
    const openFromNeeds = (id: number) => {
        setOpenId(id);
        setTimeout(() => document.getElementById(`encargo-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    };

    const frame = (children: React.ReactNode) => (
        <Layout><Box sx={{ ...geist, maxWidth: 640, mx: "auto", px: { xs: 0, sm: 2 }, py: 2, color: t.ink }}>{children}</Box></Layout>
    );
    if (loadingSession || !isValid) return frame(<PageSkeleton />);
    if (error && !data) {
        return frame(
            <Box role="alert" sx={{ ...cardSx(t), p: 3 }}>
                <Stack direction="row" spacing={1} alignItems="center"><ReportProblemRounded sx={{ color: t.red }} />
                    <Typography sx={{ fontSize: 16, fontWeight: 600 }}>No se pudieron abrir tus encargos</Typography></Stack>
                <Typography sx={{ fontSize: 14, color: t.muted, mt: 1 }}>Revisa tu conexión a internet y vuelve a intentar.</Typography>
                <Button variant="contained" disableElevation sx={{ ...inkSx(t), ...tapSx, mt: 2 }} onClick={load}>Reintentar</Button>
                <Typography sx={{ fontSize: 12, color: t.faint, mt: 2 }}>Detalle técnico: {error}</Typography>
            </Box>,
        );
    }
    if (!data) return frame(<PageSkeleton />);
    const leader = data.me.leader;
    if (team && !leader) {
        return frame(<Typography sx={{ fontSize: 15 }}>Esta pantalla es del editor líder. Tus encargos están en <RouterLink to="/editor">Mis encargos</RouterLink>.</Typography>);
    }
    const byId = (id: number | null) => data.batches.find((b) => b.id === id) ?? null;
    const deliverBatch = byId(deliverId);
    const reviewBatch = byId(reviewId);
    const when = (b: EditorBatch) => whenLabel(dueOf(b, corrections), today);
    const reviewable = lists.toReview.filter((b) => b.can.review);
    // .93: lo que queda por revisar después del que está abierto
    const after = reviewable.filter((b) => b.id !== reviewId);
    const late = (list: EditorBatch[]) => list.filter((b) => when(b).level === "late").length;

    const header = (title: string, hint: string) => (
        <>
            <Typography component="h1" sx={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>{title}</Typography>
            <Typography sx={{ fontSize: 13, color: t.muted }}>{hint} · hoy {dueLabel(today)} (hora de Venezuela)</Typography>
            {cheer && (
                <Box role="status" sx={{ mt: 2, p: "10px 14px", borderRadius: "8px", display: "flex", gap: 1, alignItems: "center", bgcolor: t.greenSoft, color: t.greenInk, ...appear }}>
                    <CheckCircleRounded sx={{ fontSize: 20 }} /><Typography sx={{ fontSize: 14, color: "inherit" }}>{cheer}</Typography>
                </Box>
            )}
        </>
    );
    const empty = (title: string, hint: string) => (
        <Box sx={{ ...cardSx(t), p: "14px 16px", mt: 2, display: "flex", gap: 1.5, alignItems: "center" }}>
            <TaskAltRounded sx={{ color: t.green }} />
            <Box>
                <Typography sx={{ fontSize: 15, fontWeight: 500 }}>{title}</Typography>
                <Typography sx={{ fontSize: 13, color: t.muted }}>{hint}</Typography>
            </Box>
        </Box>
    );
    const missionFrame = (label: string, dot: string, where: string, title: string, children: React.ReactNode) => (
        <Box component="section" aria-label="Lo de ahora" sx={{ ...cardSx(t), p: "16px 18px", mt: 2, borderColor: t.ink, ...appear }}>
            <Stack direction="row" spacing={1} alignItems="center"><Dot color={dot} size={9} /><Typography sx={{ fontSize: 13, color: t.muted }}>{label}</Typography></Stack>
            <Typography sx={{ fontSize: 14, fontWeight: 500, color: t.muted, mt: 1.25 }}>{where}</Typography>
            <Typography component="h2" sx={{ fontSize: 20, fontWeight: 600, lineHeight: 1.3, mt: 0.25, overflowWrap: "anywhere" }}>{title}</Typography>
            {children}
        </Box>
    );
    const dialogs = (
        <>
            {deliverBatch && (
                <DeliverDialog<EditorBatch> open={!!deliverBatch} code={deliverBatch.code ?? "el encargo"} product={`${deliverBatch.product}${angleOf(deliverBatch) ? ` · ${angleOf(deliverBatch)}` : ""}`}
                    pieces={deliverBatch.pieces} url={`/editor/queue/${deliverBatch.id}/deliver`} uploads={!!(data.uploads ?? deliverBatch.uploads)} own={leader} batchId={deliverBatch.id}
                    productId={deliverBatch.product_id} angleCode={deliverBatch.angle_code} iterationOf={deliverBatch.iteration_of} iteration={deliverBatch.iteration}
                    concept={deliverBatch.deliveries[0]?.concept ?? deliverBatch.concept ?? ""}
                    angle={deliverBatch.deliveries[0]?.angle ?? [deliverBatch.angle_code, deliverBatch.angle_name].filter(Boolean).join(" — ")}
                    onClose={() => setDeliverId(null)}
                    onDone={(r) => changed(r?.status === "bank" ? `${deliverBatch.code} entregado: pasa directo a la banca.` : `${deliverBatch.code} entregado: va a revisión del líder.`)} />
            )}
            {reviewBatch && (
                <ReviewDialog<EditorBatch> key={reviewBatch.id} open={!!reviewBatch} title={reviewBatch.code ?? "el encargo"}
                    delivery={reviewBatch.deliveries.find((d) => d.review === "pending") ?? null}
                    context={reviewContext(reviewBatch)} detail={<BriefDetail b={reviewBatch} />}
                    next={after[0] ? { code: after[0].code ?? "el siguiente", left: after.length, onOpen: () => setReviewId(after[0].id) } : null}
                    url={`/editor/queue/${reviewBatch.id}/review`} onClose={() => setReviewId(null)}
                    onDone={(r) => changed(r?.status === "bank" ? `${reviewBatch.code} aprobado: pasa a la banca.` : `${reviewBatch.code} devuelto: le llega al editor con tus cambios.`)} />
            )}
        </>
    );

    // ---------- Encargos del equipo (el líder): ¿qué reviso o asigno ahora? ----------
    if (team) {
        const nextReview = reviewable[0];
        const nextAssign = nextReview ? null : lists.toAssign[0];
        const lateWorking = late(lists.working);
        return frame(
            <>
                {header("Encargos del equipo", "Lo más urgente primero")}
                {lists.todo.length > 0 && (
                    <Typography sx={{ fontSize: 13, color: t.muted, mt: 1 }}>
                        Tú también tienes {plural(lists.todo.length, "encargo por entregar", "encargos por entregar")} · <Link component={RouterLink} to="/editor" sx={{ color: t.ink }}>Ir a Mis encargos</Link>
                    </Typography>
                )}
                <Scoreboard tiles={[
                    { label: "Por revisar", value: reviewable.length, color: reviewable.length ? t.amber : undefined, help: "Entregas de los editores que esperan tu revisión. Las tuyas las revisa el dueño." },
                    { label: "Sin asignar", value: lists.toAssign.length, help: "Encargos aprobados que todavía no tienen editor." },
                    { label: "Atrasados", value: lateWorking, color: lateWorking ? t.red : undefined, help: "Encargos en curso que pasaron su fecha de entrega (o de correcciones)." },
                ]} />
                {nextReview ? missionFrame(`Por revisar · ${when(nextReview).text}`, signal(t, when(nextReview).level), `${nextReview.product}${angleOf(nextReview) ? ` · ${angleOf(nextReview)}` : ""}`,
                    `Revisa ${nextReview.code}: lo entregó ${nextReview.deliveries.find((d) => d.review === "pending")?.editor ?? nextReview.editor ?? "el editor"}`, <>
                        <NumberedSteps label="Cómo revisar" steps={[
                            `Mira ${nextReview.pieces.length === 1 ? "la pieza" : `las ${nextReview.pieces.length} piezas`} en grande, una por una.`,
                            "En cada una toca «Está bien» o «Cambiar algo» y escribe qué cambiar.",
                            "Aprueba (pasa a la banca) o devuélvelo con los cambios.",
                        ]} />
                        <Button variant="contained" disableElevation startIcon={<RateReviewRounded />} onClick={() => setReviewId(nextReview.id)}
                            sx={{ ...inkSx(t), ...tapSx, mt: 2, width: { xs: "100%", sm: "auto" } }}>Revisar {nextReview.code}</Button>
                    </>)
                    : nextAssign ? missionFrame(`Sin asignar · ${when(nextAssign).text}`, signal(t, when(nextAssign).level), `${nextAssign.product}${angleOf(nextAssign) ? ` · ${angleOf(nextAssign)}` : ""}`,
                        `Asigna ${nextAssign.code}: ${piecesText(nextAssign)}`, <>
                            {nextAssign.need && <Typography sx={{ fontSize: 13, color: t.muted, mt: 0.5 }}>Por qué: {nextAssign.need}</Typography>}
                            <NumberedSteps label="Cómo asignar" steps={["Toca «Asignar» y elige quién lo hace (puedes ser tú).", "Le llega en «Mis encargos» con su plazo y todo el encargo."]} />
                            <Box sx={{ mt: 2 }}><AssignButton<EditorBatch> primary editors={data.editors} current={null} url={`/editor/queue/${nextAssign.id}/editor`} allowNone onDone={() => changed(`${nextAssign.code} asignado.`)} /></Box>
                        </>)
                    : empty("Todo en orden: nada por revisar ni asignar", "Cuando alguien entregue o llegue un encargo nuevo, aparece aquí.")}

                {/* .93: "Por revisar", siempre a la vista; tocar un encargo abre la ventana de revisar */}
                <Section dot={t.amber} name="Por revisar" hint={lists.toReview.length ? "toca uno para revisarlo" : undefined} mt={3}>
                    {lists.toReview.length === 0 ? (
                        <Typography sx={{ fontSize: 14, color: t.muted }}>Nada por revisar: cuando un editor entregue, aparece aquí.</Typography>
                    ) : lists.toReview.map((b) => (
                        <BatchRow key={b.id} b={b} dot={t.amber} open={openId === b.id} onToggle={() => toggle(b.id)} onOpen={b.can.review ? () => setReviewId(b.id) : undefined}
                            sub={b.can.review ? `Lo entregó ${b.deliveries.find((d) => d.review === "pending")?.editor ?? b.editor ?? "el editor"} · ${when(b).text}` : "Es tu entrega: la revisa el dueño"}
                            action={b.can.review ? <RowButton icon={<RateReviewRounded />} onClick={() => setReviewId(b.id)}>Revisar</RowButton> : undefined} />
                    ))}
                </Section>

                <Box sx={{ mt: 3 }}>
                    <ForecastCard f={data.forecast} compact />
                    <NeedsList batches={data.batches} unfilled={data.unfilled ?? []} today={today} correctionsDays={corrections} onOpen={openFromNeeds} />
                </Box>

                {lists.toAssign.length > 0 && (
                    <Section dot={t.gray} name="Sin asignar" hint="lo más urgente arriba">
                        {lists.toAssign.map((b) => (
                            <BatchRow key={b.id} b={b} dot={signal(t, when(b).level)} open={openId === b.id} onToggle={() => toggle(b.id)} sub={`${piecesText(b)} · ${when(b).text}`}
                                action={<AssignButton<EditorBatch> asLink editors={data.editors} current={null} url={`/editor/queue/${b.id}/editor`} allowNone onDone={() => changed(`${b.code} asignado.`)} />} />
                        ))}
                    </Section>
                )}
                {lists.working.length > 0 && (
                    <Section dot={t.ink} name="En curso" hint="asignados o en producción">
                        {lists.working.map((b) => (
                            <BatchRow key={b.id} b={b} dot={signal(t, when(b).level)} open={openId === b.id} onToggle={() => toggle(b.id)}
                                sub={`Lo hace ${b.editor ?? "—"}${b.status === "approved" ? " (sin empezar)" : ""}${b.returned ? " · corrigiendo" : ""} · ${when(b).text}`}
                                extra={b.can.assign ? <AssignButton<EditorBatch> asLink editors={data.editors} current={b.editor_id} url={`/editor/queue/${b.id}/editor`} allowNone={b.status === "approved"} onDone={() => changed()} /> : undefined} />
                        ))}
                    </Section>
                )}
                {lists.bank.length > 0 && (
                    <Section dot={t.green} name="En banca" hint="aprobados: el dueño los lanza en Meta">
                        {lists.bank.map((b) => (
                            <BatchRow key={b.id} b={b} dot={t.green} open={openId === b.id} onToggle={() => toggle(b.id)} sub={`Lo hizo ${b.editor ?? "—"}${b.status_at ? ` · en banca desde el ${dateTime(b.status_at)}` : ""}`} />
                        ))}
                    </Section>
                )}
                {dialogs}
            </>,
        );
    }

    // ---------- Mis encargos: ¿qué entrego ahora? ----------
    const mission = lists.todo[0];
    const rest = lists.todo.slice(1);
    const lateMine = late(lists.todo);
    const missionSteps = (b: EditorBatch) => b.returned ? [
        `Cambia lo que pidió ${b.returned.by ?? "el líder"} (arriba).`,
        b.uploads ? "Toca «Entregar de nuevo» y sube solo las piezas que cambiaste: las demás quedan como estaban." : "Toca «Entregar de nuevo» y pega el enlace de las piezas que cambiaste.",
        "Revisa el hook de cada una y entrega.",
    ] : [
        `Haz ${b.pieces.length === 1 ? "la pieza" : `las ${b.pieces.length} piezas`}: ${b.pieces.map((p) => p.code).filter(Boolean).join(", ")}. Qué lleva cada una, en «Ver todo el encargo».`,
        b.uploads ? "Toca «Entregar» y sube el archivo de cada pieza: se nombra solo." : "Sube cada video a Drive con su código y toca «Entregar» para pegar los enlaces.",
        "Escribe el hook de cada una y entrega.",
    ];
    return frame(
        <>
            {header("Mis encargos", "Lo más urgente primero")}
            {leader && (data.pending.to_review > 0 || data.pending.to_assign > 0) && (
                <Typography sx={{ fontSize: 13, color: t.muted, mt: 1 }}>
                    En el equipo: {[data.pending.to_review > 0 && `${data.pending.to_review} por revisar`, data.pending.to_assign > 0 && `${data.pending.to_assign} sin asignar`].filter(Boolean).join(" · ")}
                    {" · "}<Link component={RouterLink} to="/editor/equipo" sx={{ color: t.ink }}>Ir a Encargos del equipo</Link>
                </Typography>
            )}
            <Scoreboard tiles={[
                { label: "Por entregar", value: lists.todo.length, help: "Tus encargos asignados que todavía no entregaste (también lo que te devolvieron)." },
                { label: "Atrasados", value: lateMine, color: lateMine ? t.red : undefined, help: "Los que pasaron su fecha de entrega (o de correcciones, si te los devolvieron)." },
                { label: "En revisión", value: lists.inReview.length, help: "Los que entregaste y esperan la revisión del líder." },
            ]} />
            {mission ? missionFrame(
                `${mission.returned ? "Te lo devolvieron" : `Encargo 1 de ${lists.todo.length}`} · ${when(mission).text}`, signal(t, when(mission).level),
                `${mission.product}${angleOf(mission) ? ` · ${angleOf(mission)}` : ""}`,
                mission.returned ? `Corrige ${mission.code} y entrégalo de nuevo` : `Haz y entrega ${mission.code}: ${piecesText(mission)}`, <>
                    <Returned b={mission} />
                    <NumberedSteps label="Cómo hacerlo" steps={missionSteps(mission)} />
                    {mission.goal && <Typography sx={{ fontSize: 14, mt: 1, overflowWrap: "anywhere" }}><b style={{ fontWeight: 600 }}>Lo que buscamos:</b> {mission.goal}</Typography>}
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }} sx={{ mt: 2 }}>
                        <Button variant="contained" disableElevation startIcon={<UploadRounded />} onClick={() => setDeliverId(mission.id)} disabled={!mission.can.deliver}
                            sx={{ ...inkSx(t), ...tapSx }}>{mission.returned ? "Entregar de nuevo" : "Entregar"}</Button>
                        <TextAction onClick={() => setMissionOpen((o) => !o)} aria-expanded={missionOpen} sx={{ fontSize: 14, alignSelf: { xs: "center", sm: "auto" } }}>
                            {missionOpen ? "Ocultar el encargo" : "Ver todo el encargo"}
                        </TextAction>
                    </Stack>
                    <Collapse in={missionOpen} unmountOnExit>
                        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${t.line}` }}>
                            <BriefDetail b={mission} />
                            <DeliveriesList deliveries={mission.deliveries} />
                            <Stack direction="row" columnGap={2} flexWrap="wrap" sx={{ mt: 1, fontSize: 14 }}>
                                <CopyBrief text={mission.brief} asLink />
                                {mission.can.assign && <AssignButton<EditorBatch> asLink editors={data.editors} current={mission.editor_id} url={`/editor/queue/${mission.id}/editor`} allowNone={mission.status === "approved"} onDone={() => changed()} />}
                            </Stack>
                        </Box>
                    </Collapse>
                </>)
                : empty("Estás al día: no tienes encargos por entregar", "Cuando te asignen uno, aparece aquí con su plazo y todo lo que necesitas.")}

            {rest.length > 0 && (
                <Section dot={t.ink} name="Lo que sigue" hint="por fecha">
                    {rest.map((b) => (
                        <BatchRow key={b.id} b={b} dot={signal(t, when(b).level)} open={openId === b.id} onToggle={() => toggle(b.id)}
                            sub={`${b.returned ? "Te lo devolvieron · " : ""}${piecesText(b)} · ${when(b).text}`}
                            action={b.can.deliver ? <RowButton icon={<UploadRounded />} onClick={() => setDeliverId(b.id)}>Entregar</RowButton> : undefined}
                            extra={b.can.assign ? <AssignButton<EditorBatch> asLink editors={data.editors} current={b.editor_id} url={`/editor/queue/${b.id}/editor`} allowNone={b.status === "approved"} onDone={() => changed()} /> : undefined} />
                    ))}
                </Section>
            )}
            {lists.inReview.length > 0 && (
                <Section dot={t.amber} name="Esperando revisión" hint="ya los entregaste">
                    {lists.inReview.map((b) => (
                        <BatchRow key={b.id} b={b} dot={t.amber} open={openId === b.id} onToggle={() => toggle(b.id)}
                            sub={b.review_by_owner ? "Lo revisa el dueño" : `Lo revisa el líder${b.delivered_at ? ` · entregado el ${dateTime(b.delivered_at)}` : ""}`} />
                    ))}
                </Section>
            )}
            {lists.done.length > 0 && (
                <Box sx={{ mt: 3, fontSize: 14 }}>
                    <TextAction onClick={() => setShowDone((s) => !s)} aria-expanded={showDone} sx={{ color: t.muted }}>
                        {showDone ? "Ocultar los terminados" : `Ver los terminados de los últimos 14 días (${lists.done.length})`}
                    </TextAction>
                    <Collapse in={showDone} unmountOnExit>
                        <Box sx={{ mt: 1 }}>
                            {lists.done.map((b) => (
                                <BatchRow key={b.id} b={b} dot={b.status === "discarded" ? t.gray : t.green} open={openId === b.id} onToggle={() => toggle(b.id)}
                                    sub={`${b.status_label}${b.status_at ? ` desde el ${dateTime(b.status_at)}` : ""}`} />
                            ))}
                        </Box>
                    </Collapse>
                </Box>
            )}
            {dialogs}
        </>,
    );
};
