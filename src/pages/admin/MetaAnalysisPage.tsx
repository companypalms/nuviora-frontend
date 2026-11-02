// src/pages/admin/MetaAnalysisPage.tsx
// Etapa 5, paso 3a (2026-10-30): el análisis de campañas de cada mañana. Lo arma el sistema a las 7:00 con las reglas del
// dueño (Paso 2) y lo redacta la IA. Nada de esto toca Meta.
// .82 (dueño, 2026-11-02: "mucho más intuitivo, minimalista y fácil de entender, que cada cosa tenga una lógica y un
// porqué"): la pantalla responde una sola pregunta, "¿qué hago hoy en Ads Manager?". Arriba, cuánto falta; después las
// tareas en el orden en que se hacen (frenar pérdidas, arreglar, crecer), cada una con su porqué plegado; después lo que
// ya tiene el equipo y los avisos que no son de Ads Manager; al final, cada producto plegado y lo de la IA, en chico. El
// color es solo para las señales (rojo, ámbar, verde); los botones, en tinta. Como un juego (dueño: "que todo tenga la lógica
// y la usabilidad de un juego para que se vea fácil y se quiera usar y hacer"): una misión a la vez en grande, las 3 etapas
// como un mapa (todas abiertas: el dueño eligió sin candado), un marcador con números de verdad (misiones, racha y
// presupuesto movido), una celebración corta al terminar cada etapa y "Día completo" al final.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Box, Button, ButtonBase, Checkbox, CircularProgress, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, Link, MenuItem, Skeleton,
    Stack, TextField, Tooltip, Typography, useTheme,
} from "@mui/material";
import {
    CheckCircleRounded, CheckRounded, EmojiEventsRounded, ExpandMoreRounded, GroupsRounded, InsightsRounded, ListAltRounded, LocalFireDepartmentRounded,
    NotificationsNoneRounded, RemoveRounded, ReportProblemRounded, TaskAltRounded,
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { useValidateSession } from "../../hooks/useValidateSession";
import { api, dateTime, fmt } from "../../components/meta-ads/metaAds";
import { FONT_FAMILY } from "../../common/theme";

type Tone = "default" | "info" | "success" | "warning" | "error";
type Group = "frenar" | "arreglar" | "crecer" | "aviso";
/** .82: title, why, detail y group los arma el sistema; los análisis de antes no los traen (se arman aquí con lo que hay). */
type UrgentItem = {
    key: string; product_id: number; product: string; city: string | null; kind: string; label: string; text: string; tone: Tone; urgency: string | null;
    group?: Group; title?: string; why?: string | null; detail?: string[];
    /** Cuánto presupuesto por día mueve: lo que se baja o se pausa (cut) y lo que se sube (add). */
    money?: { cut: number | null; add: number | null } | null;
};
type Mark = { status: "done" | "disagree"; note: string | null; by: string | null; at: string };
type CityFact = {
    campaign_meta_id: string; campaign: string | null; city: string | null; notes: string[]; budget_notes: string[]; price_option: string | null;
    action: { key: string; label: string; tone: Tone; data: string; reading: string; proposal: string | null };
};
type CreativeFact = {
    id: number; label: string; verdict: string; verdict_key: string; tone: Tone; reading: string; proposal: string | null; cross: string | null;
    funnel: string | null; week: { spend: number; purchases: number; cpa: number | null } | null;
    video: { window: string; diagnosis: string[]; iterate: string | null } | null;
    /** .70: ESCALAR, MANTENER, PARAR o ITERAR (de tus reglas), sus números y qué hacer el editor (en palabras). Los análisis viejos no lo traen. */
    call?: { key: "scale" | "keep" | "stop" | "iterate" | "stop_city"; label: string; tone: Tone; todo: string; editor: string | null };
    numbers?: string[];
};
type ProductFact = {
    product_id: number; product: string; mode: string; money_at_risk: number;
    urgency: { level: number; label: string; batches: string; reasons: string[] } | null;
    next_work: string[]; price: string[]; price_watch: string | null; alarms: string[];
    cities: CityFact[]; creatives: CreativeFact[]; batches: { name: string; verdict: string; reading: string; proposal: string | null }[];
};
type AiProduct = { producto: string; diagnostico: string; ciudades: { ciudad: string; lectura: string }[]; decisiones_creativas: string[]; mensaje_editor: string; aprendizaje: string };
type Analysis = {
    id: number; date: string; version: number; status: "ok" | "example" | "no_ai" | "error"; created_at: string; requested_by: string | null;
    model: string | null; error: string | null; warnings: string[]; urgent: UrgentItem[]; marks: Record<string, Mark>;
    facts: ProductFact[]; text: { resumen: string; productos: AiProduct[] } | null;
    versions: { version: number; created_at: string; auto: boolean }[];
    /** .71: por creativo, el encargo que ya tiene el equipo (se le mandó solo al editor líder). */
    sent: Record<string, Sent>;
    /** .78: por producto, su turno: el creativo que va primero y sus encargos en camino o en la banca. */
    turns?: Record<string, Turn>;
    /** .82: días seguidos con todas las misiones resueltas, hasta el día anterior a este análisis. */
    streak?: { before: number };
};
type Sent = { code: string | null; status: string; status_label: string; editor: string | null };
type Turn = { pick: number; open: string[]; full: boolean };
type Data = { analysis: Analysis | null; dates: { date: string; versions: number }[]; runs_left: number; queue_pending?: number };

/** .82: Geist solo en esta pantalla (la prueba del sistema de diseño nuevo); Inter de reserva. */
const GEIST = `"Geist", ${FONT_FAMILY}`;
const geist = { fontFamily: GEIST, fontFeatureSettings: '"tnum"', "& *": { fontFamily: "inherit" } } as const;

/** Los colores de la pantalla: tinta y grises para todo; rojo, ámbar y verde solo para las señales. */
const useTokens = () => {
    const dark = useTheme().palette.mode === "dark";
    return dark
        ? { card: "#1B1F26", line: "#2A303A", soft: "#232832", ink: "#E8EBF0", onInk: "#14171C", muted: "#A3ABB7", faint: "#7C8592",
            red: "#F2686D", amber: "#F5B544", green: "#3CCB93", gray: "#5B6472", greenSoft: "#16342A", greenInk: "#9FE5C6" }
        : { card: "#FFFFFF", line: "#E6E8EC", soft: "#F3F4F6", ink: "#1C2230", onInk: "#FFFFFF", muted: "#5E6672", faint: "#8A919C",
            red: "#C62E34", amber: "#E8A100", green: "#0F7552", gray: "#B8BEC7", greenSoft: "#E6F4EE", greenInk: "#0B5A3F" };
};
type Tokens = ReturnType<typeof useTokens>;

/** Los grupos, en el orden en que se hacen, con su porqué. */
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Las etapas del día, en el orden en que se hacen, con su porqué, qué se logró y su celebración. */
const GROUPS: { key: Exclude<Group, "aviso">; name: string; hint: string; color: (t: Tokens) => string; did: (n: number) => string;
    cheer: (items: UrgentItem[], marks: Record<string, Mark>) => string }[] = [
    { key: "frenar", name: "Frenar pérdidas", hint: "primero esto: hoy te cuesta plata", color: (t) => t.red,
        did: (n) => `frenaste ${plural(n, "pérdida", "pérdidas")}`,
        cheer: (items, m) => {
            const cut = items.filter((i) => m[i.key]?.status === "done").reduce((sum, i) => sum + (i.money?.cut ?? 0), 0);
            return `Etapa completa: frenaste ${plural(items.length, "pérdida", "pérdidas")}.${cut > 0 ? ` Bajaste ${fmt.money(cut)} por día en lo que pierde.` : ""}`;
        } },
    { key: "arreglar", name: "Arreglar", hint: "va mal pero tiene arreglo", color: (t) => t.amber,
        did: (n) => `arreglaste ${plural(n, "cosa", "cosas")}`,
        cheer: (items) => `Etapa completa: arreglaste ${plural(items.length, "cosa", "cosas")}.` },
    { key: "crecer", name: "Crecer", hint: "al final, con lo de arriba resuelto", color: (t) => t.green,
        did: (n) => `subiste ${plural(n, "ganador", "ganadores")}`,
        cheer: (items, m) => {
            const add = items.filter((i) => m[i.key]?.status === "done").reduce((sum, i) => sum + (i.money?.add ?? 0), 0);
            return `Etapa completa: subiste ${plural(items.length, "ganador", "ganadores")}.${add > 0 ? ` Le das ${fmt.money(add)} más por día a lo que gana.` : ""}`;
        } },
];
/** "Frenaste 3 pérdidas, arreglaste 2 cosas y subiste 3 ganadores." (y en cuántas no estuvo de acuerdo) */
const daySummary = (tasks: UrgentItem[], marks: Record<string, Mark>) => {
    const parts = GROUPS.map((g) => ({ g, n: tasks.filter((i) => groupOf(i) === g.key).length })).filter((x) => x.n > 0).map((x) => x.g.did(x.n));
    const no = tasks.filter((i) => marks[i.key]?.status === "disagree").length;
    const text = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}` : parts[0] ?? "";
    return `${text.charAt(0).toUpperCase()}${text.slice(1)}.${no ? ` En ${plural(no, "misión", "misiones")} no estuviste de acuerdo: quedó tu nota.` : ""}`;
};
/** El grupo de cada cosa para los análisis de antes de la .82 (el mismo de UrgentList::GROUP). */
const KIND_GROUP: Record<string, Group> = {
    drop: "frenar", pause_city: "frenar", not_sold: "frenar", stop_creatives: "frenar", decrease: "frenar",
    intervene: "arreglar", last_test: "arreglar", tracking: "arreglar", hold_prune: "arreglar",
    scale: "crecer", stock_out: "aviso", alarm: "aviso", price: "aviso",
};
const groupOf = (i: UrgentItem): Group => i.group ?? KIND_GROUP[i.kind] ?? "aviso";
const titleOf = (i: UrgentItem) => i.title ?? `${i.label} · ${i.product}${i.city ? ` en ${i.city}` : ""}`;
const toneColor = (tone: Tone, t: Tokens) => ({ error: t.red, warning: t.amber, success: t.green, info: t.ink, default: t.gray }[tone]);

/** Hoy en Caracas ("AAAA-MM-DD"), para saber si el análisis que se ve es el de hoy. */
const todayYmd = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Caracas" });
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const hour = (iso: string) => new Date(iso).toLocaleTimeString("es-VE", { timeZone: "America/Caracas", hour: "2-digit", minute: "2-digit", hour12: false });

const Dot: React.FC<{ color: string; size?: number }> = ({ color, size = 10 }) => (
    <Box component="span" aria-hidden sx={{ width: size, height: size, borderRadius: "50%", bgcolor: color, display: "inline-block", flex: "none" }} />
);

/** Un enlace de texto que es un botón ("¿Por qué?", "Volver a analizar"). */
const TextAction: React.FC<React.ComponentProps<typeof ButtonBase>> = ({ sx, ...props }) => {
    const t = useTokens();
    return <ButtonBase {...props} sx={{ font: "inherit", color: t.ink, textDecoration: "underline", textUnderlineOffset: 3, borderRadius: 1, verticalAlign: "baseline",
        "&.Mui-disabled": { color: t.faint, textDecoration: "none" }, "&.Mui-focusVisible": { outline: `2px solid ${t.ink}`, outlineOffset: 2 }, ...sx }} />;
};

const Section: React.FC<{ icon?: React.ReactNode; dot?: string; name: string; hint?: string; children: React.ReactNode; mt?: number }> = ({ icon, dot, name, hint, children, mt = 3 }) => {
    const t = useTokens();
    return (
        <Box component="section" sx={{ mt }}>
            <Stack direction="row" columnGap={1} rowGap={0} alignItems="center" flexWrap="wrap" sx={{ mb: 0.75 }}>
                {dot ? <Dot color={dot} /> : <Box sx={{ display: "flex", color: t.muted, "& svg": { fontSize: 18 } }}>{icon}</Box>}
                <Typography component="h2" sx={{ fontSize: 15, fontWeight: 600, whiteSpace: "nowrap" }}>{name}</Typography>
                {hint && <Typography sx={{ fontSize: 13, color: t.muted }}>{hint}</Typography>}
            </Stack>
            {children}
        </Box>
    );
};

const cardSx = (t: Tokens) => ({ bgcolor: t.card, border: `1px solid ${t.line}`, borderRadius: "10px" });

/** Hecho o "no estoy de acuerdo": las dos resuelven la misión (la segunda, porque decidiste no hacerla). */
const isResolved = (m?: Mark) => m?.status === "done" || m?.status === "disagree";
const inkSx = (t: Tokens) => ({ bgcolor: t.ink, color: t.onInk, "&:hover": { bgcolor: t.ink, opacity: 0.9 }, borderRadius: "10px", px: 2 }) as const;
/** Lo que aparece (la misión siguiente, el día completo) entra suave; nada se mueve si el sistema pide menos movimiento. */
const appear = {
    animation: "nx-appear 220ms ease-out", "@keyframes nx-appear": { from: { opacity: 0, transform: "translateY(6px)" }, to: { opacity: 1, transform: "none" } },
    "@media (prefers-reduced-motion: reduce)": { animation: "none" },
} as const;

/** "No estoy de acuerdo" con una nota: resuelve la misión y sirve para ajustar tus reglas. Se monta al abrirse. */
const DisagreeDialog: React.FC<{ item: UrgentItem; mark?: Mark; onClose: () => void; onMark: (status: Mark["status"] | null, note?: string) => void }> = ({ item, mark, onClose, onMark }) => {
    const t = useTokens();
    const [note, setNote] = useState(mark?.status === "disagree" ? mark.note ?? "" : "");
    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: geist }}>
            <DialogTitle sx={{ fontSize: 18, fontWeight: 600 }}>No estoy de acuerdo</DialogTitle>
            <DialogContent>
                <Typography sx={{ fontSize: 14, mb: 1.5 }}>{titleOf(item)}</Typography>
                <TextField label="¿Qué harías tú y por qué?" value={note} onChange={(e) => setNote(e.target.value)} multiline minRows={3} fullWidth autoFocus
                    inputProps={{ maxLength: 500 }} helperText="La misión queda resuelta y tu nota sirve para ajustar tus reglas." />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                {mark?.status === "disagree" && <Button sx={{ color: t.muted, mr: "auto" }} onClick={() => { onMark(null); onClose(); }}>Quitar mi nota</Button>}
                <Button sx={{ color: t.ink }} onClick={onClose}>Cancelar</Button>
                <Button variant="contained" disableElevation sx={inkSx(t)} onClick={() => { onMark("disagree", note); onClose(); }}>Guardar nota</Button>
            </DialogActions>
        </Dialog>
    );
};

/** El porqué de una misión, plegado: los números en palabras y la regla. */
const WhyBox: React.FC<{ item: UrgentItem; children?: React.ReactNode }> = ({ item, children }) => {
    const t = useTokens();
    return (
        <Box sx={{ bgcolor: t.soft, borderRadius: "8px", p: "10px 12px", mt: 1, lineHeight: 1.55 }}>
            {(item.detail?.length ? item.detail : [item.text]).map((d, i) => <Typography key={i} sx={{ fontSize: 13, color: t.ink, overflowWrap: "anywhere" }}>{d}</Typography>)}
            {children}
        </Box>
    );
};

/** Una misión de la lista: la casilla (se puede hacer en cualquier orden), la frase con los montos y su porqué plegado. */
const TaskRow: React.FC<{ item: UrgentItem; mark?: Mark; onMark: (status: Mark["status"] | null, note?: string) => void }> = ({ item, mark, onMark }) => {
    const t = useTokens();
    const [open, setOpen] = useState(false);
    const [dialog, setDialog] = useState(false);
    const done = mark?.status === "done";
    const disagree = mark?.status === "disagree";
    const box = { width: 22, height: 22, borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" } as const;
    return (
        <Box sx={{ ...cardSx(t), display: "flex", gap: 1.5, alignItems: "flex-start", p: "12px 14px", mb: 0.75 }}>
            <Checkbox checked={done} indeterminate={disagree} onChange={(e) => onMark(e.target.checked ? "done" : null)} disableRipple sx={{ p: 0, mt: "1px" }}
                inputProps={{ "aria-label": `Hecho: ${titleOf(item)}` }}
                icon={<Box sx={{ ...box, border: `1.5px solid ${t.faint}` }} />}
                checkedIcon={<Box sx={{ ...box, bgcolor: t.ink, color: t.onInk }}><CheckRounded sx={{ fontSize: 16 }} /></Box>}
                indeterminateIcon={<Box sx={{ ...box, bgcolor: t.soft, border: `1.5px solid ${t.faint}`, color: t.muted }}><RemoveRounded sx={{ fontSize: 16 }} /></Box>} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 15, fontWeight: done || disagree ? 400 : 500, lineHeight: 1.4, overflowWrap: "anywhere",
                    color: done || disagree ? t.faint : t.ink, textDecoration: done ? "line-through" : "none" }}>
                    {titleOf(item)}
                </Typography>
                {disagree ? (
                    <Typography component="div" sx={{ fontSize: 13, color: t.muted, mt: 0.5, overflowWrap: "anywhere" }}>
                        No estás de acuerdo{mark?.note ? `: ${mark.note}` : ""} · <TextAction onClick={() => setDialog(true)} sx={{ color: t.muted }}>Cambiar tu nota</TextAction>
                    </Typography>
                ) : !done && (
                    <Typography component="div" sx={{ fontSize: 13, color: t.muted, mt: 0.5, overflowWrap: "anywhere" }}>
                        {item.why && <>{item.why} · </>}
                        <TextAction onClick={() => setOpen((o) => !o)} aria-expanded={open} sx={{ color: t.muted }}>{open ? "Ocultar" : "¿Por qué?"}</TextAction>
                    </Typography>
                )}
                <Collapse in={open && !done && !disagree} unmountOnExit>
                    <WhyBox item={item}>
                        <TextAction onClick={() => setDialog(true)} sx={{ mt: 1, fontSize: 13, color: t.muted }}>No estoy de acuerdo</TextAction>
                    </WhyBox>
                </Collapse>
            </Box>
            {dialog && <DisagreeDialog item={item} mark={mark} onClose={() => setDialog(false)} onMark={onMark} />}
        </Box>
    );
};

/** La misión de ahora, en grande: una sola cosa, con "Hecho" y "No estoy de acuerdo". La siguiente entra sola. */
const MissionCard: React.FC<{ item: UrgentItem; mark?: Mark; n: number; total: number; onMark: (status: Mark["status"] | null, note?: string) => void }> = ({ item, mark, n, total, onMark }) => {
    const t = useTokens();
    const [open, setOpen] = useState(false);
    const [dialog, setDialog] = useState(false);
    const g = GROUPS.find((x) => x.key === groupOf(item)) ?? GROUPS[0];
    return (
        <Box component="section" aria-label="Misión de ahora" sx={{ ...cardSx(t), p: "16px 18px", mt: 2, borderColor: t.ink, ...appear }}>
            <Stack direction="row" spacing={1} alignItems="center">
                <Dot color={g.color(t)} size={9} />
                <Typography sx={{ fontSize: 13, color: t.muted }}>Misión {n} de {total} · {g.name}</Typography>
            </Stack>
            <Typography component="h2" sx={{ fontSize: 18, fontWeight: 600, lineHeight: 1.35, mt: 1, overflowWrap: "anywhere" }}>{titleOf(item)}</Typography>
            <Typography component="div" sx={{ fontSize: 13, color: t.muted, mt: 0.5, overflowWrap: "anywhere" }}>
                {item.why && <>{item.why} · </>}
                <TextAction onClick={() => setOpen((o) => !o)} aria-expanded={open} sx={{ color: t.muted }}>{open ? "Ocultar" : "¿Por qué?"}</TextAction>
            </Typography>
            <Collapse in={open} unmountOnExit><WhyBox item={item} /></Collapse>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 2 }}>
                <Button variant="contained" disableElevation startIcon={<CheckRounded />} sx={{ ...inkSx(t), minHeight: 40 }} onClick={() => onMark("done")}>Hecho</Button>
                <Button variant="outlined" sx={{ color: t.ink, borderColor: t.line, borderRadius: "10px", minHeight: 40, "&:hover": { borderColor: t.faint, bgcolor: "transparent" } }}
                    onClick={() => setDialog(true)}>No estoy de acuerdo</Button>
            </Stack>
            {dialog && <DisagreeDialog item={item} mark={mark} onClose={() => setDialog(false)} onMark={onMark} />}
        </Box>
    );
};

/** El marcador: 3 números, todos de verdad (misiones, días seguidos y presupuesto movido). */
const Hud: React.FC<{ resolved: number; total: number; streak: number; cut: number; add: number }> = ({ resolved, total, streak, cut, add }) => {
    const t = useTokens();
    const tiles: { label: React.ReactNode; value: React.ReactNode; help: string }[] = [
        { label: "Misiones", value: `${resolved} de ${total}`, help: "Las que resolviste hoy: hechas o con \"No estoy de acuerdo\"." },
        { label: <><LocalFireDepartmentRounded sx={{ fontSize: 14, verticalAlign: "-2px", mr: 0.25 }} />Racha</>, value: plural(streak, "día", "días"),
            help: "Días seguidos en que resolviste todas tus misiones. Un día sin misiones no la corta." },
        { label: "Presupuesto hoy",
            help: "Presupuesto que moviste hoy, por día: lo que bajaste o pausaste (rojo) y lo que subiste (verde). Apagar creativos no cuenta: con CBO, Meta pasa esa plata a los otros anuncios.",
            value: cut || add ? <>{cut > 0 && <Box component="span" sx={{ color: t.red, display: "inline-block", whiteSpace: "nowrap", mr: 1 }}>−{fmt.money(cut)}</Box>}
                {add > 0 && <Box component="span" sx={{ color: t.green, display: "inline-block", whiteSpace: "nowrap" }}>+{fmt.money(add)}</Box>}</> : "$0" },
    ];
    return (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 1, mt: 2 }}>
            {tiles.map((x, i) => (
                <Tooltip key={i} title={x.help}>
                    <Box tabIndex={0} sx={{ bgcolor: t.soft, borderRadius: "8px", p: "10px 12px", minWidth: 0, "&:focus-visible": { outline: `2px solid ${t.ink}` } }}>
                        <Typography sx={{ fontSize: 12, color: t.muted }}>{x.label}</Typography>
                        <Typography component="div" sx={{ fontSize: { xs: 15, sm: 18 }, fontWeight: 600, mt: 0.25, lineHeight: 1.3 }}>{x.value}</Typography>
                    </Box>
                </Tooltip>
            ))}
        </Box>
    );
};

/** Las 3 etapas del día, como un mapa: las terminadas con su marca, la de ahora resaltada. Todas abiertas (el dueño eligió sin candado). */
const StageTrack: React.FC<{ stats: Record<string, { n: number; d: number }>; current: Group | null }> = ({ stats, current }) => {
    const t = useTokens();
    return (
        <Stack direction="row" alignItems="flex-start" sx={{ mt: 2.5 }} role="list" aria-label="Etapas del día">
            {GROUPS.map((g, k) => {
                const { n, d } = stats[g.key];
                const done = n > 0 && d === n;
                const on = current === g.key;
                const c = g.color(t);
                const prev = k > 0 ? stats[GROUPS[k - 1].key] : null;
                return (
                    <React.Fragment key={g.key}>
                        {prev && <Box aria-hidden sx={{ flex: 1, height: 2, mt: "16px", bgcolor: prev.d === prev.n ? GROUPS[k - 1].color(t) : t.line, transition: "background-color 200ms" }} />}
                        <Stack role="listitem" alignItems="center" sx={{ width: 96, flex: "none", textAlign: "center" }}>
                            <Box sx={{ width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 600,
                                transition: "all 200ms",
                                ...(done ? { bgcolor: c, color: t.onInk } : n === 0 ? { border: `1.5px dashed ${t.line}`, color: t.faint }
                                    : on ? { border: `2px solid ${c}`, color: c } : { border: `1.5px solid ${t.line}`, color: t.muted }) }}>
                                {done || n === 0 ? <CheckRounded sx={{ fontSize: 18 }} /> : k + 1}
                            </Box>
                            <Typography sx={{ fontSize: 13, mt: 0.5, lineHeight: 1.3, color: on ? t.ink : t.muted, fontWeight: on ? 600 : 400 }}>{g.name}</Typography>
                            <Typography sx={{ fontSize: 12, color: t.faint }}>{n === 0 ? "nada hoy" : `${d} de ${n}`}</Typography>
                        </Stack>
                    </React.Fragment>
                );
            })}
        </Stack>
    );
};

/** .78: por qué este creativo todavía no le llegó al editor líder (uno por producto a la vez, primero los ganadores). */
const notYet = (cr: CreativeFact, turn?: Turn): string | null => {
    if (!turn) return null;
    if (turn.open.length > 0) return `Este producto ya tiene su encargo en camino o listo en la banca (${turn.open.join(", ")}): va uno a la vez.`;
    if (turn.pick !== cr.id) return "Hoy va primero otro creativo de este producto (primero los ganadores).";
    return "Hoy no cupo en el día de tus editores: le llega solo al editor líder mañana, si sigue igual.";
};

/** .70: un creativo con su decisión (de tus reglas), sus números y qué hace el editor (.71: le llega solo). */
const CreativeCall: React.FC<{ cr: CreativeFact; sent?: Sent; today: boolean; turn?: Turn }> = ({ cr, sent, today, turn }) => {
    const t = useTokens();
    const call = cr.call!;
    const why = !sent && today ? notYet(cr, turn) : null;
    return (
        <Box sx={{ py: 1.25, borderTop: `1px solid ${t.line}` }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Dot color={toneColor(call.tone, t)} size={8} />
                <Typography sx={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.3 }}>{call.label}</Typography>
                <Link component={RouterLink} to={`/meta-ads/creativos/${cr.id}`} sx={{ fontSize: 14, fontWeight: 500, color: t.ink, overflowWrap: "anywhere" }}>{cr.label}</Link>
                <Tooltip title={<Box>{cr.reading}{cr.proposal ? <><br />{cr.proposal}</> : null}</Box>}>
                    <Typography component="span" sx={{ fontSize: 13, color: t.muted }}>{cr.verdict}</Typography>
                </Tooltip>
            </Stack>
            <Typography sx={{ fontSize: 14, mt: 0.5 }}>{call.todo}</Typography>
            {(cr.numbers ?? []).map((n, i) => <Typography key={i} sx={{ fontSize: 12, color: t.muted }}>{n}</Typography>)}
            {call.editor && (
                <Box sx={{ mt: 0.75, p: "8px 10px", borderRadius: "8px", bgcolor: t.soft }}>
                    <Typography sx={{ fontSize: 13, whiteSpace: "pre-line" }}><b>Para el editor:</b> {call.editor}</Typography>
                    {sent ? (
                        <Typography sx={{ fontSize: 12, mt: 0.5, color: t.green, fontWeight: 600 }}>
                            Le llegó al editor líder: {sent.code ?? "encargo"} · {sent.status_label} · {sent.editor ? `lo hace ${sent.editor}` : "todavía sin editor"}
                        </Typography>
                    ) : why ? <Typography sx={{ fontSize: 12, mt: 0.5, color: t.muted }}>{why}</Typography> : null}
                </Box>
            )}
        </Box>
    );
};

/** El detalle de un producto (plegado): la IA, sus ciudades, sus creativos y su trabajo. */
const ProductDetail: React.FC<{ p: ProductFact; ai?: AiProduct; sent: Record<string, Sent>; today: boolean; turn?: Turn }> = ({ p, ai, sent, today, turn }) => {
    const t = useTokens();
    const cityText = (city: string | null) => ai?.ciudades.find((c) => city && norm(c.ciudad) === norm(city))?.lectura;
    const calls = p.creatives.length > 0 && p.creatives.every((cr) => cr.call);
    const sub = { fontSize: 13, fontWeight: 600, color: t.muted, mt: 2, mb: 0.5 } as const;
    const copy = async () => {
        try { await navigator.clipboard.writeText(ai?.mensaje_editor ?? ""); toast.success("Mensaje copiado"); } catch { toast.error("No se pudo copiar"); }
    };
    return (
        <Box sx={{ pb: 2 }}>
            {(p.urgency || p.mode !== "normal") && (
                <Typography sx={{ fontSize: 13, color: t.muted }}>
                    {p.urgency ? `${p.urgency.label} · batches a pedir: ${p.urgency.batches}` : ""}{p.mode !== "normal" ? ` · modo ${p.mode}` : ""}
                </Typography>
            )}
            {ai?.diagnostico && <Typography sx={{ fontSize: 14, mt: 1 }}>{ai.diagnostico}</Typography>}

            {p.cities.length > 0 && <>
                <Typography sx={sub}>Ciudades</Typography>
                {p.cities.map((c) => (
                    <Box key={c.campaign_meta_id} sx={{ mb: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Dot color={toneColor(c.action.tone, t)} size={8} />
                            <Typography sx={{ fontSize: 14, fontWeight: 500 }}>{c.city ?? "—"}</Typography>
                            <Typography sx={{ fontSize: 13, color: t.muted }}>{c.action.label}</Typography>
                        </Stack>
                        <Typography sx={{ fontSize: 13, color: t.muted, pl: 2 }}>{cityText(c.city) ?? `${c.action.reading} ${c.action.proposal ?? ""}`}</Typography>
                        {c.action.data && <Typography sx={{ fontSize: 12, color: t.faint, pl: 2 }}>{c.action.data}</Typography>}
                        {[...c.notes, ...c.budget_notes].map((n, i) => <Typography key={i} sx={{ fontSize: 12, color: t.faint, pl: 2 }}>{n}</Typography>)}
                    </Box>
                ))}
            </>}

            {calls && <>
                <Typography sx={sub}>Cada creativo, de más a menos gasto en 7 días</Typography>
                {p.creatives.map((cr) => <CreativeCall key={cr.id} cr={cr} sent={sent[String(cr.id)]} today={today} turn={turn} />)}
            </>}
            {!calls && p.creatives.length > 0 && <>
                <Typography sx={sub}>Creativos, de más a menos gasto en 7 días</Typography>
                {p.creatives.map((cr) => (
                    <Typography key={cr.id} sx={{ fontSize: 13, mb: 0.5 }}>
                        <Link component={RouterLink} to={`/meta-ads/creativos/${cr.id}`} sx={{ color: t.ink, fontWeight: 500 }}>{cr.label}</Link>
                        <Box component="span" sx={{ color: t.muted }}> · {cr.verdict}{cr.week ? ` · 7 días: ${fmt.money(cr.week.spend)}, ${fmt.num(cr.week.purchases)} compras` : ""}</Box>
                    </Typography>
                ))}
                {ai && ai.decisiones_creativas.map((d, i) => <Typography key={i} sx={{ fontSize: 13 }}>• {d}</Typography>)}
            </>}

            {(p.next_work.length > 0 || p.price.length > 0) && <>
                <Typography sx={sub}>Trabajo y precio</Typography>
                {p.next_work.map((w, i) => <Typography key={i} sx={{ fontSize: 13 }}>{w}</Typography>)}
                {p.price.map((w, i) => <Typography key={`p${i}`} sx={{ fontSize: 13, color: t.muted }}>{w}</Typography>)}
            </>}
            {!calls && ai?.mensaje_editor && (
                <Box sx={{ mt: 2, p: "8px 10px", borderRadius: "8px", bgcolor: t.soft }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Mensaje al editor líder (borrador)</Typography>
                        <TextAction onClick={copy} sx={{ fontSize: 13 }}>Copiar</TextAction>
                    </Stack>
                    <Typography sx={{ fontSize: 13, whiteSpace: "pre-line", mt: 0.5 }}>{ai.mensaje_editor}</Typography>
                </Box>
            )}
            {ai?.aprendizaje && <Typography sx={{ fontSize: 13, mt: 2, color: t.muted }}>Aprendizaje: {ai.aprendizaje}</Typography>}
        </Box>
    );
};

/** El esqueleto de la pantalla mientras carga (la misma forma que el contenido). */
const PageSkeleton: React.FC = () => (
    <Box aria-busy="true" aria-label="Cargando el análisis">
        <Skeleton variant="text" width={220} height={36} />
        <Skeleton variant="rounded" height={8} sx={{ mt: 2, mb: 3 }} />
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={64} sx={{ mb: 0.75, borderRadius: "10px" }} />)}
    </Box>
);

export const MetaAnalysisPage: React.FC = () => {
    const t = useTokens();
    const { loadingSession, isValid } = useValidateSession();
    const [data, setData] = useState<Data | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [date, setDate] = useState<string>("");
    const [version, setVersion] = useState<number | "">("");
    const [running, setRunning] = useState(false);
    const [openProduct, setOpenProduct] = useState<number | null>(null);
    const [slow, setSlow] = useState(false);
    const [cheer, setCheer] = useState<string | null>(null);
    // La celebración de una etapa se va sola
    useEffect(() => {
        if (!cheer) return;
        const id = setTimeout(() => setCheer(null), 6000);
        return () => clearTimeout(id);
    }, [cheer]);

    const load = useCallback(() => {
        const q = new URLSearchParams();
        if (date) q.set("date", date);
        if (date && version !== "") q.set("version", String(version));
        setError(null);
        api<Data>(`/meta/analysis${q.toString() ? `?${q}` : ""}`).then(setData).catch((e) => setError((e as Error).message));
    }, [date, version]);
    useEffect(() => { if (isValid) load(); }, [isValid, load]);
    // Si tarda, decirlo (nunca una pantalla quieta sin explicación)
    useEffect(() => {
        if (data || error) return;
        const id = setTimeout(() => setSlow(true), 8000);
        return () => clearTimeout(id);
    }, [data, error]);

    const run = async () => {
        setRunning(true);
        try {
            const r = await api<{ analysis: Analysis; runs_left: number }>("/meta/analysis/run", "POST");
            setData((d) => d ? { ...d, analysis: r.analysis, runs_left: r.runs_left } : d);
            setDate(r.analysis.date);
            setVersion(r.analysis.version);
            toast.success("Análisis hecho de nuevo");
        } catch (e) { toast.error((e as Error).message); } finally { setRunning(false); }
    };
    // La casilla cambia al instante; si el servidor falla, vuelve como estaba
    const mark = async (key: string, status: Mark["status"] | null, note?: string) => {
        const a = data?.analysis;
        if (!a) return;
        const before = a.marks;
        const next = { ...before };
        if (status) next[key] = { status, note: note ?? null, by: null, at: new Date().toISOString() }; else delete next[key];
        setData((d) => d && d.analysis ? { ...d, analysis: { ...d.analysis, marks: next } } : d);
        // ¿Esta marca terminó una etapa (y no el día, que tiene su propio cierre)?
        const all = a.urgent.filter((i) => groupOf(i) !== "aviso");
        const left = (m: Record<string, Mark>, g?: Group) => all.filter((i) => (!g || groupOf(i) === g) && !isResolved(m[i.key])).length;
        const g = GROUPS.find((x) => all.some((i) => i.key === key && groupOf(i) === x.key));
        setCheer(g && left(before, g.key) > 0 && left(next, g.key) === 0 && left(next) > 0 ? g.cheer(all.filter((i) => groupOf(i) === g.key), next) : null);
        try {
            const r = await api<{ marks: Record<string, Mark> }>(`/meta/analysis/${a.id}/marks`, "PUT", { key, status, note: note ?? null });
            setData((d) => d && d.analysis ? { ...d, analysis: { ...d.analysis, marks: r.marks } } : d);
        } catch (e) {
            setData((d) => d && d.analysis ? { ...d, analysis: { ...d.analysis, marks: before } } : d);
            toast.error(`No se guardó: ${(e as Error).message}`);
        }
    };

    const a = data?.analysis ?? null;
    const tasks = useMemo(() => (a?.urgent ?? []).filter((i) => groupOf(i) !== "aviso"), [a]);
    const notices = useMemo(() => (a?.urgent ?? []).filter((i) => groupOf(i) === "aviso"), [a]);
    const today = a?.date === todayYmd();
    // El juego: cuántas resueltas, la misión de ahora (la primera sin resolver, en el orden de las etapas), la racha y el presupuesto movido
    const marks = a?.marks ?? {};
    const ordered = GROUPS.flatMap((g) => tasks.filter((i) => groupOf(i) === g.key));
    const resolved = ordered.filter((i) => isResolved(marks[i.key])).length;
    const current = ordered.find((i) => !isResolved(marks[i.key])) ?? null;
    const allDone = tasks.length > 0 && resolved === tasks.length;
    const streak = (a?.streak?.before ?? 0) + (allDone ? 1 : 0);
    const doneTasks = tasks.filter((i) => marks[i.key]?.status === "done");
    const cut = doneTasks.reduce((sum, i) => sum + (i.money?.cut ?? 0), 0);
    const add = doneTasks.reduce((sum, i) => sum + (i.money?.add ?? 0), 0);
    const stats = Object.fromEntries(GROUPS.map((g) => {
        const items = tasks.filter((i) => groupOf(i) === g.key);
        return [g.key, { n: items.length, d: items.filter((i) => isResolved(marks[i.key])).length }];
    })) as Record<string, { n: number; d: number }>;

    // Lo que ya tiene el equipo: los encargos de los creativos de este análisis
    const team = useMemo(() => {
        if (!a) return [];
        const product = new Map<number, string>();
        const label = new Map<number, string>();
        a.facts.forEach((p) => p.creatives.forEach((cr) => { product.set(cr.id, p.product); label.set(cr.id, cr.label); }));
        return Object.entries(a.sent ?? {}).map(([id, s]) => ({ ...s, product: product.get(Number(id)) ?? "", creative: label.get(Number(id)) ?? "" }));
    }, [a]);

    const aiFor = (p: ProductFact, i: number) => a?.text?.productos.find((x) => norm(x.producto) === norm(p.product)) ?? a?.text?.productos[i];
    const summaryOf = (p: ProductFact) => {
        const mine = tasks.filter((i) => i.product_id === p.product_id && !isResolved(marks[i.key]));
        const parts = GROUPS.map((g) => ({ g, n: mine.filter((i) => groupOf(i) === g.key).length })).filter((x) => x.n > 0);
        return { color: parts[0] ? parts[0].g.color(t) : t.gray, text: parts.length ? parts.map((x) => `${x.n} para ${x.g.key}`).join(" · ") : "nada pendiente" };
    };

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
                            <Typography sx={{ fontSize: 16, fontWeight: 600 }}>No se pudo abrir el análisis</Typography></Stack>
                        <Typography sx={{ fontSize: 14, color: t.muted, mt: 1 }}>Revisa tu conexión a internet y vuelve a intentar.</Typography>
                        <Button variant="contained" disableElevation sx={{ ...ink, mt: 2 }} onClick={load}>Reintentar</Button>
                        <Typography sx={{ fontSize: 12, color: t.faint, mt: 2 }}>Detalle técnico: {error}</Typography>
                    </Box>
                ) : (
                    <>
                        {/* 1. Qué día es y qué tan frescos son los datos */}
                        <Stack direction="row" justifyContent="space-between" alignItems="baseline" flexWrap="wrap" useFlexGap spacing={1.5}>
                            <Typography component="h1" sx={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>Tu día en Meta Ads</Typography>
                            <Typography component="div" sx={{ fontSize: 13, color: t.muted }}>
                                {a ? (today ? `Análisis de las ${hour(a.created_at)}` : `Análisis del ${dateTime(a.created_at)}`) : "Sin análisis"}
                                {" · "}
                                {!today && a ? (
                                    <TextAction onClick={() => { setDate(""); setVersion(""); }}>Ver el de hoy</TextAction>
                                ) : (
                                    <Tooltip title={data.runs_left > 0 ? `Lo vuelve a hacer con los datos de ahora. Te quedan ${data.runs_left} hoy.` : "Ya usaste las 10 de hoy."}>
                                        <span>
                                            <TextAction onClick={run} disabled={running || data.runs_left <= 0}>
                                                {running ? <><CircularProgress size={11} sx={{ color: t.muted, mr: 0.75 }} />Analizando…</> : "Volver a analizar"}
                                            </TextAction>
                                        </span>
                                    </Tooltip>
                                )}
                            </Typography>
                        </Stack>

                        {!a ? (
                            // Vacío: qué significa y cómo avanzar
                            <Box sx={{ ...cardSx(t), p: 3, mt: 3, textAlign: "center" }}>
                                <ListAltRounded sx={{ fontSize: 36, color: t.faint }} />
                                <Typography sx={{ fontSize: 16, fontWeight: 600, mt: 1 }}>Todavía no hay análisis</Typography>
                                <Typography sx={{ fontSize: 14, color: t.muted, mt: 0.5 }}>Sale solo cada mañana a las 7:00 con los 3 días cerrados.</Typography>
                                <Button variant="contained" disableElevation sx={{ ...ink, mt: 2 }} onClick={run} disabled={running || data.runs_left <= 0}
                                    startIcon={running ? <CircularProgress size={14} sx={{ color: "inherit" }} /> : undefined}>
                                    {running ? "Analizando…" : "Analizar ahora"}
                                </Button>
                            </Box>
                        ) : <>
                            {/* 2. El marcador, las etapas y la misión de ahora */}
                            {tasks.length === 0 ? (
                                <Box sx={{ ...cardSx(t), p: "14px 16px", mt: 2, display: "flex", gap: 1.5, alignItems: "center" }}>
                                    <TaskAltRounded sx={{ color: t.green }} />
                                    <Box>
                                        <Typography sx={{ fontSize: 15, fontWeight: 500 }}>Nada que tocar hoy en Ads Manager</Typography>
                                        <Typography sx={{ fontSize: 13, color: t.muted }}>Tus campañas están en mantener o esperar. Tu racha sigue.</Typography>
                                    </Box>
                                </Box>
                            ) : <>
                                <Hud resolved={resolved} total={tasks.length} streak={streak} cut={cut} add={add} />
                                <StageTrack stats={stats} current={current ? groupOf(current) : null} />
                                {cheer && (
                                    <Box role="status" sx={{ mt: 2, p: "10px 14px", borderRadius: "8px", display: "flex", gap: 1, alignItems: "center",
                                        bgcolor: t.greenSoft, color: t.greenInk, ...appear }}>
                                        <CheckCircleRounded sx={{ fontSize: 20 }} /><Typography sx={{ fontSize: 14, color: "inherit" }}>{cheer}</Typography>
                                    </Box>
                                )}
                                {allDone ? (
                                    <Box role="status" sx={{ ...cardSx(t), p: 3, mt: 2, textAlign: "center", ...appear }}>
                                        <EmojiEventsRounded sx={{ fontSize: 48, color: t.green }} />
                                        <Typography sx={{ fontSize: 20, fontWeight: 600, mt: 0.5 }}>Día completo</Typography>
                                        <Typography sx={{ fontSize: 14, color: t.muted, mt: 0.75 }}>{daySummary(tasks, marks)}</Typography>
                                        {(cut > 0 || add > 0) && (
                                            <Typography sx={{ fontSize: 14, color: t.muted }}>
                                                Presupuesto por día: {[cut > 0 && `−${fmt.money(cut)} en lo que pierde`, add > 0 && `+${fmt.money(add)} en lo que gana`].filter(Boolean).join(" y ")}.
                                            </Typography>
                                        )}
                                        <Typography sx={{ fontSize: 14, color: t.muted }}>
                                            Racha: {plural(streak, "día seguido", "días seguidos")}.{today ? " Tu próxima misión sale mañana a las 7:00." : ""}
                                        </Typography>
                                    </Box>
                                ) : current && (
                                    <MissionCard key={current.key} item={current} mark={marks[current.key]} n={resolved + 1} total={tasks.length}
                                        onMark={(st, n) => mark(current.key, st, n)} />
                                )}
                            </>}

                            {/* 3. Todas las misiones, por etapa: se pueden hacer en cualquier orden */}
                            {tasks.length > (current ? 1 : 0) && (
                                <Typography sx={{ fontSize: 13, color: t.muted, mt: 3 }}>{allDone ? "Tus misiones de hoy." : "Todas tus misiones de hoy. Puedes hacerlas en el orden que quieras."}</Typography>
                            )}
                            {GROUPS.map((g) => {
                                const items = tasks.filter((i) => groupOf(i) === g.key && i.key !== current?.key);
                                return items.length === 0 ? null : (
                                    <Section key={g.key} dot={g.color(t)} name={g.name} hint={g.hint} mt={1.5}>
                                        {items.map((i) => <TaskRow key={i.key} item={i} mark={marks[i.key]} onMark={(st, n) => mark(i.key, st, n)} />)}
                                    </Section>
                                );
                            })}

                            {/* 4. Lo que ya tiene el equipo: no hay que hacerlo */}
                            {(team.length > 0 || (data.queue_pending ?? 0) > 0) && (
                                <Section icon={<GroupsRounded />} name="Tu equipo" hint="esto ya lo tienen los editores">
                                    <Box sx={{ ...cardSx(t), p: "10px 14px" }}>
                                        {team.map((s, i) => (
                                            <Typography key={i} sx={{ fontSize: 14, py: 0.25, overflowWrap: "anywhere" }}>
                                                <b style={{ fontWeight: 600 }}>{s.code ?? "Encargo"}</b> {s.product}
                                                <Box component="span" sx={{ color: t.muted }}> · {s.creative} · {s.status_label}{s.editor ? ` · lo hace ${s.editor}` : " · sin editor"}</Box>
                                            </Typography>
                                        ))}
                                        {(data.queue_pending ?? 0) > 0 && (
                                            <Typography sx={{ fontSize: 14, py: 0.25 }}>
                                                {data.queue_pending === 1 ? "1 encargo espera que lo apruebes." : `${data.queue_pending} encargos esperan que los apruebes.`}
                                            </Typography>
                                        )}
                                        <Link component={RouterLink} to="/meta-ads/cola" sx={{ fontSize: 13, color: t.muted, display: "inline-block", mt: 0.5 }}>Ver en Cola y banca</Link>
                                    </Box>
                                </Section>
                            )}

                            {/* 5. Avisos: no son de Ads Manager */}
                            {notices.length > 0 && (
                                <Section icon={<NotificationsNoneRounded />} name="Avisos" hint="no son de Ads Manager">
                                    <Box sx={{ ...cardSx(t), p: "10px 14px" }}>
                                        {notices.map((i) => (
                                            <Typography key={i.key} sx={{ fontSize: 14, py: 0.25, overflowWrap: "anywhere" }}>
                                                <b style={{ fontWeight: 600 }}>{i.product}</b> · {i.title ?? i.text}
                                            </Typography>
                                        ))}
                                    </Box>
                                </Section>
                            )}

                            {/* 6. Cada producto, plegado */}
                            {a.facts.length > 0 && (
                                <Section icon={<ListAltRounded />} name="Cada producto" hint="el detalle, si lo quieres ver">
                                    <Box sx={{ ...cardSx(t), px: "14px" }}>
                                        {a.facts.map((p, i) => {
                                            const s = summaryOf(p);
                                            const open = openProduct === p.product_id;
                                            return (
                                                <Box key={p.product_id} sx={{ borderTop: i ? `1px solid ${t.line}` : 0 }}>
                                                    <ButtonBase onClick={() => setOpenProduct(open ? null : p.product_id)} aria-expanded={open}
                                                        sx={{ width: "100%", py: 1.25, display: "flex", justifyContent: "space-between", gap: 1, textAlign: "left", font: "inherit",
                                                            "&.Mui-focusVisible": { outline: `2px solid ${t.ink}`, outlineOffset: 2 } }}>
                                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flex: "0 1 auto" }}>
                                                            <Dot color={s.color} />
                                                            <Typography sx={{ fontSize: 14, fontWeight: 500, overflowWrap: "anywhere" }}>{p.product}</Typography>
                                                        </Stack>
                                                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: t.muted, minWidth: 0, flex: "0 1 auto" }}>
                                                            <Typography sx={{ fontSize: 13, textAlign: "right" }}>{s.text}</Typography>
                                                            <ExpandMoreRounded sx={{ fontSize: 18, transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms" }} />
                                                        </Stack>
                                                    </ButtonBase>
                                                    <Collapse in={open} unmountOnExit>
                                                        <ProductDetail p={p} ai={aiFor(p, i)} sent={a.sent ?? {}} today={today} turn={a.turns?.[String(p.product_id)]} />
                                                    </Collapse>
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                </Section>
                            )}

                            {/* 7. Lo de la IA y el historial, al final y en chico */}
                            <Box sx={{ mt: 4, pt: 2, borderTop: `1px solid ${t.line}` }}>
                                {a.text?.resumen && <>
                                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.muted }}>Resumen de la IA</Typography>
                                    <Typography sx={{ fontSize: 13, color: t.muted, whiteSpace: "pre-line", mt: 0.5 }}>{a.text.resumen}</Typography>
                                </>}
                                {a.status === "example" && <Typography sx={{ fontSize: 12, color: t.faint, mt: 1 }}>En esta PC no hay IA: el texto es una plantilla; las tareas y los montos son de tus reglas.</Typography>}
                                {(a.status === "no_ai" || a.status === "error") && a.error && <Typography sx={{ fontSize: 12, color: t.faint, mt: 1 }}>{a.error}</Typography>}
                                {a.warnings.length > 0 && (
                                    <Typography sx={{ fontSize: 12, color: t.red, mt: 1 }}>
                                        La IA escribió montos que no están en los datos ({a.warnings.join(", ")}). Fíate de las tareas de arriba, no de esos montos.
                                    </Typography>
                                )}
                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
                                    <TextField select size="small" label="Día" value={a.date} onChange={(e) => { setDate(e.target.value); setVersion(""); }} sx={{ minWidth: 150 }}>
                                        {data.dates.map((d) => <MenuItem key={d.date} value={d.date}>{d.date}</MenuItem>)}
                                    </TextField>
                                    {a.versions.length > 1 && (
                                        <TextField select size="small" label="Versión" value={a.version} onChange={(e) => { setDate(a.date); setVersion(Number(e.target.value)); }} sx={{ minWidth: 190 }}>
                                            {a.versions.map((v) => <MenuItem key={v.version} value={v.version}>{v.version} · {dateTime(v.created_at)}{v.auto ? " (automático)" : ""}</MenuItem>)}
                                        </TextField>
                                    )}
                                    <Button size="small" startIcon={<InsightsRounded />} component={RouterLink} to="/meta-ads" sx={{ color: t.ink }}>Ver métricas</Button>
                                </Stack>
                                <Typography sx={{ fontSize: 12, color: t.faint, mt: 1 }}>
                                    Hecho {dateTime(a.created_at)}{a.requested_by ? ` por ${a.requested_by}` : " (automático)"}{a.model ? ` · ${a.model}` : ""} · con los 3 días cerrados. Nada de esto cambia Meta: lo haces tú.
                                </Typography>
                            </Box>
                        </>}
                    </>
                )}
            </Box>
        </Layout>
    );
};
