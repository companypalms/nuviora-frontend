// src/components/owner-panel/GoalsDialog.tsx
// "Metas y límites" del panel del dueño (diccionario §6): las metas del negocio de cada mes (el que corre y el siguiente,
// para dejarlas listas; con los números del mes anterior de referencia y un botón para copiar las del mes anterior), las de
// cada vendedora y agencia (con excepciones por persona) y desde dónde avisa cada alerta, en amarillo y en rojo. Solo el
// Admin. Qué es cada cosa y "tus números" vienen del backend (GoalRules); una casilla vacía es "sin meta".
import React, { FC, ReactNode, useEffect, useState } from "react";
import {
    Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControlLabel, IconButton, InputAdornment,
    LinearProgress, MenuItem, Stack, Switch, TextField, Typography, useMediaQuery, useTheme,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { toast } from "react-toastify";
import { Explain } from "./Explain";
import { GoalDef, GoalsResponse, MetricFormat, Option, fetchGoals, monthName, saveGoals } from "./ownerPanel";

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const lower = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

/** Lo que se escribe en cada casilla (texto, para poder dejarla vacía). */
type Num = string;
type TeamForm = { value: Num; red: Num; alert: boolean; people: { id: number; value: Num }[] };
type AlertForm = { yellow: Num; red: Num; on: boolean };
/** months: las metas del negocio de los meses que se pueden poner (el que corre y el siguiente). */
type Form = { months: Record<string, Record<string, Num>>; team: Record<string, TeamForm>; alerts: Record<string, AlertForm> };

const str = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));
const num = (v: Num) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
const map = <T, U>(o: Record<string, T>, f: (v: T) => U) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, f(v)])) as Record<string, U>;

const toForm = (r: GoalsResponse): Form => {
    const c = r.config;
    const empty = map(r.catalog.business, () => "");
    return {
        months: Object.fromEntries(r.months.map((m) => [m.key, { ...empty, ...map<number | null, Num>(c.months[m.key] ?? {}, str) }])),
        team: map(c.team, (g) => ({ value: str(g.value), red: str(g.red), alert: g.alert, people: g.people.map((p) => ({ id: p.id, value: str(p.value) })) })),
        alerts: map(c.alerts, (a) => ({ yellow: str(a.yellow), red: str(a.red), on: a.on })),
    };
};

const fromForm = (f: Form) => ({
    months: map(f.months, (b) => map(b, num)),
    team: map(f.team, (g) => ({
        value: num(g.value), red: num(g.red), alert: g.alert,
        people: g.people.filter((p) => p.value.trim() !== "").map((p) => ({ id: p.id, value: num(p.value) as number })),
    })),
    alerts: map(f.alerts, (a) => ({ yellow: num(a.yellow), red: num(a.red), on: a.on })),
});

const UNIT: Record<MetricFormat, { start?: string; end?: string }> = { money: { start: "$" }, percent: { end: "%" }, hours: { end: "h" }, hours_total: { end: "h" }, count: {} };

const NumberField: FC<{ label: string; value: Num; format: MetricFormat; error?: string; disabled?: boolean; onChange: (v: Num) => void; width?: number }> = ({ label, value, format, error, disabled, onChange, width }) => {
    const u = UNIT[format];
    return (
        <TextField size="small" type="number" label={label} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}
            error={Boolean(error)} helperText={error} InputLabelProps={{ shrink: true }}
            inputProps={{ min: 0, step: format === "money" ? 1 : 0.5, inputMode: "decimal" }}
            InputProps={{
                startAdornment: u.start ? <InputAdornment position="start">{u.start}</InputAdornment> : undefined,
                endAdornment: u.end ? <InputAdornment position="end">{u.end}</InputAdornment> : undefined,
            }}
            sx={{ width: { xs: "100%", sm: width ?? 175 } }} />
    );
};

/** El nombre de la meta, su explicación al pasar el cursor y "tus números" de referencia. */
const Label: FC<{ def: GoalDef; reference?: string }> = ({ def, reference }) => (
    <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" alignItems="center" gap={0.5}>
            <Typography variant="body2" fontWeight={700}>{def.label}</Typography>
            <Explain title={def.label} help={def.help}>
                <InfoOutlinedIcon sx={{ fontSize: 16, color: "text.disabled", cursor: "help" }} tabIndex={0} />
            </Explain>
        </Stack>
        {reference && <Typography variant="caption" color="text.secondary" component="div">{reference}</Typography>}
    </Box>
);

const Section: FC<{ title: string; subtitle: string; children: ReactNode }> = ({ title, subtitle, children }) => (
    <Box>
        <Typography variant="subtitle1" fontWeight={800}>{title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{subtitle}</Typography>
        <Stack spacing={2.25}>{children}</Stack>
    </Box>
);

/** La meta de un KPI para todas las personas de un rol, su rojo, si avisa arriba y las excepciones por persona. */
const TeamGoalEditor: FC<{
    k: string; def: GoalDef; goal: TeamForm; reference?: string; people: Option[]; errors: Record<string, string>; onChange: (g: TeamForm) => void;
}> = ({ k, def, goal, reference, people, errors, onChange }) => {
    const [adding, setAdding] = useState<{ id: string; value: Num } | null>(null);
    const lower = def.better === "lower";
    const names = new Map(people.map((p) => [p.id, p.name]));
    const used = new Set(goal.people.map((p) => p.id));
    const unit = UNIT[def.format].end ? ` ${UNIT[def.format].end}` : "";
    const noGoal = goal.value.trim() === "";

    return (
        <Box>
            <Label def={def} reference={reference} />
            <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} alignItems={{ sm: "flex-start" }} sx={{ mt: 1 }}>
                <NumberField label={lower ? "Máximo para todas" : "Meta para todas"} value={goal.value} format={def.format} error={errors[`team.${k}.value`]}
                    onChange={(v) => onChange({ ...goal, value: v })} />
                <NumberField label={lower ? "Rojo si pasa de" : "Rojo si baja de"} value={goal.red} format={def.format} error={errors[`team.${k}.red`]}
                    disabled={noGoal} onChange={(v) => onChange({ ...goal, red: v })} />
                <FormControlLabel sx={{ mt: { sm: 0.5 } }} label="Avisarme arriba"
                    control={<Switch checked={goal.alert} disabled={noGoal} onChange={(e) => onChange({ ...goal, alert: e.target.checked })} />} />
            </Stack>
            <Stack direction="row" flexWrap="wrap" gap={0.75} alignItems="center" sx={{ mt: 1 }}>
                {goal.people.length > 0 && <Typography variant="caption" color="text.secondary">Excepciones:</Typography>}
                {goal.people.map((p) => (
                    <Chip key={p.id} size="small" label={`${names.get(p.id) ?? `Persona ${p.id}`}: ${p.value}${unit}`}
                        color={errors[`team.${k}.people.${p.id}`] ? "error" : "default"}
                        onDelete={() => onChange({ ...goal, people: goal.people.filter((x) => x.id !== p.id) })} />
                ))}
                {!adding && (
                    <Button size="small" startIcon={<AddRoundedIcon />} disabled={noGoal} onClick={() => setAdding({ id: "", value: "" })} sx={{ textTransform: "none" }}>
                        Meta distinta para una persona
                    </Button>
                )}
            </Stack>
            {adding && (
                <Stack direction={{ xs: "column", sm: "row" }} gap={1} sx={{ mt: 1 }} alignItems={{ sm: "center" }}>
                    <TextField select size="small" label="Persona" value={adding.id} onChange={(e) => setAdding({ ...adding, id: e.target.value })} sx={{ minWidth: 210 }}>
                        {people.filter((p) => !used.has(p.id)).map((p) => <MenuItem key={p.id} value={String(p.id)}>{p.name}</MenuItem>)}
                    </TextField>
                    <NumberField label={lower ? "Su máximo" : "Su meta"} value={adding.value} format={def.format} width={130} onChange={(v) => setAdding({ ...adding, value: v })} />
                    <Stack direction="row" gap={1}>
                        <Button size="small" variant="contained" disabled={!adding.id || adding.value.trim() === ""} sx={{ textTransform: "none" }}
                            onClick={() => { onChange({ ...goal, people: [...goal.people, { id: Number(adding.id), value: adding.value }] }); setAdding(null); }}>
                            Agregar
                        </Button>
                        <Button size="small" onClick={() => setAdding(null)} sx={{ textTransform: "none" }}>Cancelar</Button>
                    </Stack>
                </Stack>
            )}
            {goal.people.length > 0 && goal.red.trim() !== "" && (
                <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
                    En una meta distinta, el rojo queda a la misma distancia que en la de todas.
                </Typography>
            )}
        </Box>
    );
};

/** Desde dónde avisa una alerta: amarillo, rojo y si está prendida. */
const AlertEditor: FC<{ k: string; def: GoalDef; limits: AlertForm; reference?: string; errors: Record<string, string>; onChange: (a: AlertForm) => void }> = ({ k, def, limits, reference, errors, onChange }) => (
    <Box>
        <Label def={def} reference={reference} />
        <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} alignItems={{ sm: "flex-start" }} sx={{ mt: 1 }}>
            <NumberField label="Amarillo si pasa de" value={limits.yellow} format={def.format} error={errors[`alerts.${k}.yellow`]} onChange={(v) => onChange({ ...limits, yellow: v })} />
            <NumberField label="Rojo si pasa de" value={limits.red} format={def.format} error={errors[`alerts.${k}.red`]} onChange={(v) => onChange({ ...limits, red: v })} />
            <FormControlLabel sx={{ mt: { sm: 0.5 } }} label="Avisarme" control={<Switch checked={limits.on} onChange={(e) => onChange({ ...limits, on: e.target.checked })} />} />
        </Stack>
    </Box>
);

export const GoalsDialog: FC<{ open: boolean; onClose: () => void; onSaved: () => void }> = ({ open, onClose, onSaved }) => {
    const theme = useTheme();
    const mobile = useMediaQuery(theme.breakpoints.down("sm"));
    const [data, setData] = useState<GoalsResponse | null>(null);
    const [form, setForm] = useState<Form | null>(null);
    const [month, setMonth] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        let alive = true;
        setErrors({});
        fetchGoals()
            .then((r) => { if (alive) { setData(r); setForm(toForm(r)); setMonth(r.months[0]?.key ?? ""); } })
            .catch((e) => toast.error(e.message));
        return () => { alive = false; };
    }, [open]);

    const save = async () => {
        if (!form) return;
        setSaving(true);
        setErrors({});
        try {
            const r = await saveGoals(fromForm(form));
            setData(r);
            setForm(toForm(r));
            toast.success("Metas y límites guardados");
            onSaved();
            onClose();
        } catch (e) {
            const err = e as Error & { errors?: Record<string, string[]> };
            if (err.errors) setErrors(map(err.errors, (m) => m[0]));
            toast.error(err.errors ? "Revisa las casillas marcadas en rojo." : err.message);
        } finally {
            setSaving(false);
        }
    };

    const c = data?.catalog;
    const selected = data?.months.find((m) => m.key === month);
    // Vendedoras, agencias y alertas no son por mes: su referencia es el mes anterior al que corre
    const refs = data && data.months[0] ? data.references[data.months[0].key] : undefined;
    const monthRefs = data && selected ? data.references[selected.key] : undefined;
    const teamOf = (role: string) => (c ? Object.entries(c.team).filter(([, d]) => d.role === role) : []);
    const filled = (b: Record<string, Num> | undefined) => Boolean(b && Object.values(b).some((v) => v.trim() !== ""));

    /** Las metas del mes anterior para copiarlas: las que se están escribiendo (si ese mes también se puede poner) o las guardadas. */
    const previousGoals = (): Record<string, Num> | null => {
        if (!data || !selected || !form) return null;
        if (form.months[selected.previous]) return filled(form.months[selected.previous]) ? form.months[selected.previous] : null;
        const saved = data.config.months[selected.previous];
        return saved ? map(saved, str) : null;
    };
    const copyPrevious = () => {
        const prev = previousGoals();
        if (form && selected && prev) setForm({ ...form, months: { ...form.months, [selected.key]: { ...prev } } });
    };

    return (
        <Dialog open={open} onClose={saving ? undefined : onClose} fullScreen={mobile} maxWidth="md" fullWidth scroll="paper">
            <DialogTitle sx={{ pr: 6 }}>
                Metas y límites
                <Typography variant="body2" color="text.secondary">Solo tú los ves. Deja una casilla vacía para no poner meta.</Typography>
                <IconButton onClick={onClose} disabled={saving} sx={{ position: "absolute", right: 8, top: 8 }} aria-label="Cerrar"><CloseRoundedIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
                {!form || !c || !refs || !selected || !monthRefs ? <LinearProgress /> : (
                    <Stack spacing={3}>
                        <Box>
                            <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 1.5 }}>
                                {data.months.map((m) => (
                                    <Chip key={m.key} color={m.key === month ? "primary" : "default"} variant={m.key === month ? "filled" : "outlined"}
                                        onClick={() => setMonth(m.key)}
                                        label={`${cap(m.name)} · ${m.current ? "este mes" : "el próximo"}${filled(form.months[m.key]) ? "" : " · sin metas"}`} />
                                ))}
                            </Stack>
                            <Section title={`Metas de ${selected.name}`}
                                subtitle={`Solo para ${selected.name}: cada mes tiene las suyas. Para Hoy, Últimos 7 días, etc., el panel las reparte por día. Se ven en el Dashboard y en las tarjetas de Ventas y Dinero.`}>
                                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1}
                                    sx={{ p: 1.25, borderRadius: 2, bgcolor: "action.hover" }}>
                                    <Typography variant="body2" color="text.secondary">De referencia, debajo de cada casilla: {lower(monthRefs.label)}</Typography>
                                    <Button size="small" startIcon={<ContentCopyRoundedIcon />} disabled={!previousGoals()} onClick={copyPrevious}
                                        sx={{ textTransform: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
                                        Copiar las de {monthName(selected.previous)}
                                    </Button>
                                </Stack>
                                {Object.entries(c.business).map(([key, def]) => (
                                    <Stack key={key} direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1}>
                                        <Label def={{ ...def, label: def.label.replace("del mes", `de ${selected.name}`) }} reference={monthRefs.business[key]} />
                                        <NumberField label={def.format === "money" ? `Meta de ${selected.name}` : "Meta"} value={form.months[month][key]} format={def.format}
                                            error={errors[`months.${month}.${key}`]}
                                            onChange={(v) => setForm({ ...form, months: { ...form.months, [month]: { ...form.months[month], [key]: v } } })} />
                                    </Stack>
                                ))}
                            </Section>
                        </Box>

                        <Divider />
                        <Alert severity="info" variant="outlined" sx={{ py: 0.25 }}>
                            Lo de abajo no es por mes: queda hasta que lo cambies. De referencia, debajo de cada casilla: {lower(refs.label)}
                        </Alert>

                        <Divider />
                        <Section title="Vendedoras" subtitle="En Equipo, quien quede por debajo sale en amarillo o rojo; y si lo prendes, también te avisa arriba.">
                            {teamOf("sellers").map(([key, def]) => (
                                <TeamGoalEditor key={key} k={key} def={def} goal={form.team[key]} reference={refs.team[key]} people={data.people.sellers} errors={errors}
                                    onChange={(g) => setForm({ ...form, team: { ...form.team, [key]: g } })} />
                            ))}
                        </Section>

                        <Divider />
                        <Section title="Agencias" subtitle="Igual que las vendedoras: en Equipo › Agencias y, si lo prendes, arriba.">
                            {teamOf("agencies").map(([key, def]) => (
                                <TeamGoalEditor key={key} k={key} def={def} goal={form.team[key]} reference={refs.team[key]} people={data.people.agencies} errors={errors}
                                    onChange={(g) => setForm({ ...form, team: { ...form.team, [key]: g } })} />
                            ))}
                        </Section>

                        <Divider />
                        <Section title="Otras alertas" subtitle="El panel te avisa arriba cuando un número pasa de estos límites.">
                            {Object.entries(c.alerts).map(([key, def]) => (
                                <AlertEditor key={key} k={key} def={def} limits={form.alerts[key]} reference={refs.alerts[key]} errors={errors}
                                    onChange={(a) => setForm({ ...form, alerts: { ...form.alerts, [key]: a } })} />
                            ))}
                        </Section>
                    </Stack>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 1.5, flexWrap: "wrap", gap: 1 }}>
                {data?.config.updated_by && (
                    <Typography variant="caption" color="text.secondary" sx={{ mr: "auto" }}>
                        Última vez: {data.config.updated_by}, {data.config.updated_at}
                    </Typography>
                )}
                <Button onClick={onClose} disabled={saving} sx={{ textTransform: "none" }}>Cancelar</Button>
                <Button variant="contained" onClick={save} disabled={!form || saving} sx={{ textTransform: "none" }}>{saving ? "Guardando…" : "Guardar"}</Button>
            </DialogActions>
        </Dialog>
    );
};
