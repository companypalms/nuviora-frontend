// src/components/meta-ads/editorTeam.tsx
// .175 (dueño, 2026-11-23: "la meta mínima diaria por editor son 2 batchs al día. Si resulta que terminan esos batchs antes de
// su horario laboral…"; "nunca se le da la opción al editor, le debe aparecer una misión al líder para que le asigne otro";
// "el líder de editores sí debe ver absolutamente todo lo que se tiene que hacer… para que él vaya asignando y adelantando
// creativos si ve que al editor le sobra tiempo o a él mismo"): la meta de hoy, la franja del equipo del líder (con el horario
// de cada uno: el del líder lo pone el dueño, el de sus editores el líder), la ventana del horario y "Para adelantar".
import React, { useCallback, useEffect, useState } from "react";
import {
    Box, Button, ButtonBase, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Link, Stack, TextField, Typography, useMediaQuery, useTheme,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { CheckCircleRounded, FastForwardRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { api } from "./metaAds";
import { AdvanceItem, EditorToday, Schedule, TeamMember, dueLabel, stateLabel, todayVe } from "./editorShared";
import { appear, cardSx, geist, inkSx, lineSx, plural, tapSx, Tokens, useTokens } from "../ui/design";
import { Dot, TextAction } from "../ui/designParts";

const stateColor = (t: Tokens, m: EditorToday) => (m.free ? t.amber : m.state === "in" || m.state === "no_schedule" ? t.ink : t.gray);

/** La meta de hoy: "1 de 2" con una barrita por batch. */
export const GoalMeter: React.FC<{ today: EditorToday; title?: string }> = ({ today, title = "Tu meta de hoy" }) => {
    const t = useTokens();
    const met = today.done >= today.goal;
    const extra = today.done - today.goal;
    return (
        <Box sx={{ ...cardSx(t), p: "12px 14px", mt: 2 }} role="status" aria-label={`${title}: ${today.done} de ${today.goal} batches`}>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                <Typography sx={{ fontSize: 13, color: t.muted }}>{title}</Typography>
                <Typography sx={{ fontSize: 13, color: t.muted }}>{today.schedule_text ? `Tu horario: ${today.schedule_text}` : "Sin horario todavía"}</Typography>
            </Stack>
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mt: 0.5 }}>
                <Typography sx={{ fontSize: 22, fontWeight: 600 }}>{today.done} de {today.goal}</Typography>
                <Typography sx={{ fontSize: 14, color: met ? t.green : t.muted, fontWeight: met ? 600 : 400 }}>
                    {met ? (extra > 0 ? `¡Meta cumplida, y ${plural(extra, "batch extra", "batches extra")}!` : "¡Meta cumplida!") : `batches entregados hoy`}
                </Typography>
                {met && <CheckCircleRounded sx={{ fontSize: 20, color: t.green }} />}
            </Stack>
            <Stack direction="row" spacing={0.5} sx={{ mt: 1 }} aria-hidden>
                {Array.from({ length: Math.max(today.goal, today.done) }, (_, i) => (
                    <Box key={i} sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: i < today.done ? (met ? t.green : t.ink) : t.soft, transition: "background-color .3s" }} />
                ))}
            </Stack>
            <Typography sx={{ fontSize: 12, color: t.faint, mt: 0.75 }}>Cuenta el día en que entregas un batch por primera vez; las correcciones no suman otro.</Typography>
        </Box>
    );
};

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** El horario de un editor: los días que trabaja y de qué hora a qué hora (hora de Venezuela). */
export const ScheduleDialog: React.FC<{ open: boolean; name: string; schedule: Schedule | null; url: string; onClose: () => void; onDone: () => void }> = ({
    open, name, schedule, url, onClose, onDone,
}) => {
    const t = useTokens();
    const phone = useMediaQuery(useTheme().breakpoints.down("sm"));
    const [days, setDays] = useState<number[]>(schedule?.days ?? [1, 2, 3, 4, 5]);
    const [start, setStart] = useState(schedule?.start ?? "08:00");
    const [end, setEnd] = useState(schedule?.end ?? "17:00");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const toggle = (d: number) => setDays((list) => (list.includes(d) ? list.filter((x) => x !== d) : [...list, d]));
    const save = async () => {
        setBusy(true);
        setError(null);
        try {
            await api(url, "PUT", { days, start, end });
            toast.success(`Listo: el horario de ${name} quedó guardado.`);
            onDone();
        } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
    };
    return (
        <Dialog open={open} onClose={busy ? undefined : onClose} fullScreen={phone} fullWidth maxWidth="xs" PaperProps={{ sx: { ...geist, borderRadius: phone ? 0 : "12px" } }}>
            <DialogTitle sx={{ pb: 1 }}>
                <Typography component="span" sx={{ display: "block", fontSize: 20, fontWeight: 600 }}>El horario de {name}</Typography>
                <Typography component="span" sx={{ display: "block", fontSize: 14, color: t.muted, mt: 0.5 }}>
                    Con su horario, el sistema sabe cuándo está libre (te sale la misión de asignarle otro) y mide su meta solo en sus días de trabajo.
                </Typography>
            </DialogTitle>
            <DialogContent>
                <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1 }}>Los días que trabaja</Typography>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    {DAY_ORDER.map((d) => {
                        const on = days.includes(d);
                        return (
                            <ButtonBase key={d} onClick={() => toggle(d)} aria-pressed={on}
                                sx={{ minWidth: 48, minHeight: 44, px: 1, borderRadius: "10px", fontSize: 14, fontWeight: 500, border: `1px solid ${on ? t.ink : t.line}`,
                                    bgcolor: on ? t.ink : "transparent", color: on ? t.onInk : t.ink, "&.Mui-focusVisible": { outline: `2px solid ${t.ink}`, outlineOffset: 2 } }}>
                                {DAY_SHORT[d]}
                            </ButtonBase>
                        );
                    })}
                </Stack>
                <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }}>
                    <TextField label="Entra" type="time" value={start} onChange={(e) => setStart(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} inputProps={{ step: 300 }} />
                    <TextField label="Sale" type="time" value={end} onChange={(e) => setEnd(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} inputProps={{ step: 300 }} />
                </Stack>
                <Typography sx={{ fontSize: 12, color: t.faint, mt: 1 }}>Hora de Venezuela.</Typography>
                {error && <Typography role="alert" sx={{ fontSize: 14, color: t.red, mt: 1.5 }}>{error}</Typography>}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button onClick={onClose} disabled={busy} sx={{ color: t.ink, ...tapSx }}>Cancelar</Button>
                <Button variant="contained" disableElevation onClick={save} disabled={busy || days.length === 0}
                    startIcon={busy ? <CircularProgress size={14} sx={{ color: "inherit" }} /> : undefined} sx={{ ...inkSx(t), ...tapSx }}>Guardar</Button>
            </DialogActions>
        </Dialog>
    );
};

/**
 * La franja del equipo (el líder y el dueño): cada uno con lo de hoy contra la meta, si está libre y su horario. Quien puede,
 * cambia el horario y marca "Hoy está de permiso" (ese día no cuenta para su meta).
 */
export const TeamStrip: React.FC<{ team: TeamMember[]; meId?: number; base: string; onChanged: () => void; title?: string; hint?: string }> = ({
    team, meId, base, onChanged, title = "Tu equipo hoy", hint,
}) => {
    const t = useTokens();
    const [editing, setEditing] = useState<TeamMember | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);
    const today = todayVe();
    if (team.length === 0) return null;
    const goal = team[0].goal;
    const dayOff = async (m: TeamMember, off: boolean) => {
        setBusyId(m.id);
        try {
            await api(`${base}/${m.id}/day-off`, "PUT", { date: today, off });
            toast.success(off ? `${m.name} quedó de permiso hoy: hoy no cuenta para su meta.` : `Listo: ${m.name} ya no está de permiso hoy.`);
            onChanged();
        } catch (e) { toast.error((e as Error).message); } finally { setBusyId(null); }
    };
    return (
        <Box component="section" aria-label={title} sx={{ ...cardSx(t), p: "12px 14px", mt: 3 }}>
            <Typography component="h2" sx={{ fontSize: 15, fontWeight: 600 }}>{title}</Typography>
            <Typography sx={{ fontSize: 13, color: t.muted }}>{hint ?? `La meta es ${plural(goal, "batch", "batches")} por día cada uno. Cuenta la primera entrega; las correcciones no suman.`}</Typography>
            {team.map((m) => {
                const met = m.done >= m.goal;
                const offToday = (m.days_off ?? []).some((d) => d.date === today) || m.state === "day_off";
                return (
                    <Box key={m.id} sx={{ py: 1.25, borderBottom: `1px solid ${t.line}`, "&:last-child": { borderBottom: 0 } }}>
                        <Stack direction="row" spacing={1.25} alignItems="flex-start">
                            <Box sx={{ pt: "6px" }}><Dot color={stateColor(t, m)} size={9} /></Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{ fontSize: 15, fontWeight: 500, overflowWrap: "anywhere" }}>
                                    {m.name}{m.id === meId ? " (tú)" : ""}{m.leader ? " · líder" : ""}
                                </Typography>
                                <Typography sx={{ fontSize: 13, color: m.free ? t.amber : t.muted, fontWeight: m.free ? 600 : 400 }}>{stateLabel(m)}</Typography>
                                <Typography sx={{ fontSize: 12, color: t.faint, overflowWrap: "anywhere" }}>
                                    {m.schedule_text ? `Horario: ${m.schedule_text}` : "Falta su horario"}
                                    {!m.can_edit && m.leader && m.id === meId ? " · tu horario lo pone el dueño" : ""}
                                </Typography>
                                {m.can_edit && (
                                    <Stack direction="row" columnGap={2} rowGap={0.5} flexWrap="wrap" sx={{ mt: 0.5, fontSize: 13 }}>
                                        <TextAction onClick={() => setEditing(m)} sx={{ fontSize: 13 }}>{m.schedule ? "Cambiar horario" : "Poner su horario"}</TextAction>
                                        <TextAction onClick={() => dayOff(m, !offToday)} disabled={busyId === m.id} sx={{ fontSize: 13, color: t.muted }}>
                                            {busyId === m.id ? "Guardando…" : offToday ? "Quitar el permiso de hoy" : "Hoy está de permiso"}
                                        </TextAction>
                                    </Stack>
                                )}
                            </Box>
                            <Box sx={{ textAlign: "right", flex: "none" }}>
                                <Typography sx={{ fontSize: 15, fontWeight: 600, color: met ? t.green : t.ink }}>{m.done} de {m.goal}</Typography>
                                <Typography sx={{ fontSize: 12, color: t.muted }}>{met ? "meta cumplida" : "hoy"}</Typography>
                            </Box>
                        </Stack>
                    </Box>
                );
            })}
            {editing && (
                <ScheduleDialog open name={editing.name} schedule={editing.schedule} url={`${base}/${editing.id}/schedule`}
                    onClose={() => setEditing(null)} onDone={() => { setEditing(null); onChanged(); }} />
            )}
        </Box>
    );
};

/** La tarjeta del dueño en Cola y banca: el horario de cada editor (el del líder solo lo pone él) y cómo va cada uno hoy. */
export const OwnerTeamCard: React.FC = () => {
    const [team, setTeam] = useState<TeamMember[] | null>(null);
    const load = useCallback(() => { api<{ editors: TeamMember[] }>("/meta/editor-team").then((r) => setTeam(r.editors)).catch(() => setTeam([])); }, []);
    useEffect(() => { load(); }, [load]);
    if (!team || team.length === 0) return null;
    return (
        <Box sx={{ ...geist, mb: 2 }}>
            <TeamStrip team={team} base="/meta/editor-team" onChanged={load} title="Los editores hoy y su horario"
                hint={`La meta es ${plural(team[0].goal, "batch", "batches")} por día cada uno (también el líder). El horario del líder lo pones tú; el de sus editores lo pone él (tú también puedes).`} />
        </Box>
    );
};

/** "Adelantar": a quién dárselo (o sin asignar todavía); el sistema arma el encargo como los de cada mañana. */
export const AdvanceDialog: React.FC<{ item: AdvanceItem; team: TeamMember[]; preset?: number | null; onClose: () => void; onDone: (message: string) => void }> = ({
    item, team, preset = null, onClose, onDone,
}) => {
    const t = useTokens();
    const phone = useMediaQuery(useTheme().breakpoints.down("sm"));
    const firstFree = team.find((m) => m.free)?.id ?? null;
    const [pick, setPick] = useState<number | null>(preset ?? firstFree ?? team[0]?.id ?? null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const go = async () => {
        setBusy(true);
        setError(null);
        try {
            const r = await api<{ made: { id: number; code: string | null; editor_id: number | null }[] }>("/editor/advance", "POST", { product_id: item.product_id, editor_id: pick });
            const codes = r.made.map((b) => b.code).filter(Boolean).join(", ");
            const who = team.find((m) => m.id === pick)?.name;
            onDone(item.kind === "new"
                ? `${item.product} salió de la cola: ${codes || "sus batches del testeo"}${who && r.made[0] ? ` (${r.made[0].code} para ${who})` : ""}.`
                : `${codes || "El encargo"} adelantado${who ? ` y asignado a ${who}` : ""}.`);
        } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
    };
    return (
        <Dialog open onClose={busy ? undefined : onClose} fullScreen={phone} fullWidth maxWidth="xs" PaperProps={{ sx: { ...geist, borderRadius: phone ? 0 : "12px" } }}>
            <DialogTitle sx={{ pb: 1 }}>
                <Typography component="span" sx={{ display: "block", fontSize: 20, fontWeight: 600 }}>Adelantar · {item.product}</Typography>
                <Typography component="span" sx={{ display: "block", fontSize: 14, color: t.muted, mt: 0.5 }}>
                    {item.kind === "new"
                        ? `Sale ya de la cola de productos nuevos: el sistema escribe sus ${item.left} batches del testeo. El primero queda para quien elijas; los demás, en "Sin asignar".`
                        : "El sistema escribe el siguiente batch de este producto, como los de cada mañana, y queda en la banca cuando se entregue."}
                </Typography>
            </DialogTitle>
            <DialogContent>
                <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1 }}>¿Quién lo hace?</Typography>
                {[...team.map((m) => ({ id: m.id as number | null, name: m.name, note: m.free ? "libre ahora" : stateLabel(m) })),
                    { id: null as number | null, name: "Sin asignar todavía", note: "lo asignas después" }].map((o) => {
                    const on = pick === o.id;
                    return (
                        <ButtonBase key={String(o.id)} onClick={() => setPick(o.id)} aria-pressed={on}
                            sx={{ display: "flex", width: "100%", justifyContent: "flex-start", textAlign: "left", p: "10px 12px", mb: 0.75, borderRadius: "10px",
                                border: `1px solid ${on ? t.ink : t.line}`, "&.Mui-focusVisible": { outline: `2px solid ${t.ink}`, outlineOffset: 2 } }}>
                            <Box>
                                <Typography sx={{ fontSize: 15, fontWeight: on ? 600 : 500 }}>{o.name}</Typography>
                                <Typography sx={{ fontSize: 13, color: o.note === "libre ahora" ? t.amber : t.muted }}>{o.note}</Typography>
                            </Box>
                        </ButtonBase>
                    );
                })}
                {error && <Typography role="alert" sx={{ fontSize: 14, color: t.red, mt: 1.5 }}>{error}</Typography>}
                {busy && (
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5, ...appear }} role="status">
                        <CircularProgress size={16} sx={{ color: t.ink }} />
                        <Typography sx={{ fontSize: 14 }}>Escribiendo {item.kind === "new" ? "los encargos" : "el encargo"}… puede tardar hasta un minuto.</Typography>
                    </Stack>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button onClick={onClose} disabled={busy} sx={{ color: t.ink, ...tapSx }}>Cancelar</Button>
                <Button variant="contained" disableElevation onClick={go} disabled={busy || !!error} startIcon={<FastForwardRounded />} sx={{ ...inkSx(t), ...tapSx }}>Adelantar</Button>
            </DialogActions>
        </Dialog>
    );
};

/**
 * "Para adelantar": lo que va a hacer falta después (lo que el sistema todavía no pidió). .177: los productos nuevos de la cola
 * del dueño están en su pantalla ("Productos nuevos"); aquí, cuántos hay y "Ver".
 */
export const AdvanceList: React.FC<{ items: AdvanceItem[]; team: TeamMember[]; queued?: number; onDone: (message: string) => void; onBlocked?: () => void }> = ({
    items, team, queued = 0, onDone, onBlocked,
}) => {
    const t = useTokens();
    const [open, setOpen] = useState<AdvanceItem | null>(null);
    return (
        <Box sx={{ mt: 1.5 }}>
            <Stack direction="row" spacing={0.75} alignItems="center">
                <Dot color={t.ink} size={8} />
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Para adelantar · {items.length}</Typography>
            </Stack>
            <Typography sx={{ fontSize: 13, color: t.muted }}>
                Lo que va a hacer falta después y el sistema todavía no pidió. Si a alguien (o a ti) le sobra tiempo, adelántalo.
            </Typography>
            {items.length === 0 ? <Typography sx={{ fontSize: 14, color: t.muted, mt: 0.75 }}>Nada más para adelantar en las próximas 2 semanas.</Typography>
                : items.map((it) => (
                    <Stack key={it.key} direction="row" spacing={1.25} alignItems="center" sx={{ py: 1, borderBottom: `1px solid ${t.line}`, "&:last-child": { borderBottom: 0 } }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontSize: 14, fontWeight: 500, overflowWrap: "anywhere" }}>
                                {it.kind === "new" ? `Producto nuevo · ${it.product}` : `${it.product} · el siguiente batch`}
                            </Typography>
                            <Typography sx={{ fontSize: 13, color: t.muted, overflowWrap: "anywhere" }}>
                                {it.why}{it.next ? ` El próximo hace falta más o menos el ${dueLabel(it.next) ?? it.next}.` : ""}
                            </Typography>
                            {it.blocked && <Typography sx={{ fontSize: 13, color: t.amber, overflowWrap: "anywhere" }}>Hoy no se puede: {it.blocked}</Typography>}
                        </Box>
                        {!it.blocked && (
                            <Button variant="outlined" size="small" onClick={() => setOpen(it)} startIcon={<FastForwardRounded />} sx={{ ...lineSx(t), ...tapSx, whiteSpace: "nowrap", flex: "none" }}>
                                Adelantar
                            </Button>
                        )}
                    </Stack>
                ))}
            {queued > 0 && (
                <Typography sx={{ fontSize: 14, mt: 1 }}>
                    Productos nuevos en la cola del dueño: {queued} ·{" "}
                    <Link component={RouterLink} to="/editor/productos" sx={{ color: t.ink, textUnderlineOffset: 3 }}>Ver</Link>
                </Typography>
            )}
            {open && <AdvanceDialog item={open} team={team} onClose={() => { setOpen(null); onBlocked?.(); }} onDone={(m) => { setOpen(null); onDone(m); }} />}
        </Box>
    );
};
