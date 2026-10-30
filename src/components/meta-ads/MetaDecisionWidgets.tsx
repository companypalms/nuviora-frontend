// src/components/meta-ads/MetaDecisionWidgets.tsx
// Etapa 5, paso 2a (2026-10-30): lo que dicen las reglas del dueño. El veredicto de cada anuncio, batch y creativo (el
// dato, la lectura y la propuesta), lo de cada creativo por ciudad, el embudo y el diagnóstico del video, y los números
// de las reglas, que se cambian en Meta Ads › Reglas. Nada de esto toca Meta: solo recomienda.
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Box, Chip, FormControlLabel, InputAdornment, Paper, Stack, Switch, TextField, Tooltip, Typography } from "@mui/material";
import { toast } from "react-toastify";
import { api, fmt } from "./metaAds";

export type Verdict = {
    key: "no_target" | "no_data" | "evaluation" | "promising" | "proven" | "intermediate" | "loser" | "failing";
    label: string; tone: "default" | "info" | "success" | "warning" | "error";
    data: string; reading: string; proposal: string | null;
    causes?: { key: string; label: string; evidence: string }[];
};
export type DecisionNote = { key: string; label: string; text: string };
export type Funnel = { key: "top" | "middle" | "bottom"; label: string; frequency: number | null };
type Grade = "good" | "ok" | "weak" | null;
export type CreativeDecision = {
    id: number; label: string; active: boolean; verdict: Verdict;
    cross: { key: string; label: string; detail: string } | null;
    cities: (Verdict & { campaign_meta_id: string; city: string | null })[];
    funnel: Funnel | null;
    video: {
        window: string; grades: Record<"hook" | "hold" | "ctr" | "visit" | "conversion" | "watch", Grade>;
        leaves: "opening" | "body" | "end" | null; watch_pct: number | null; diagnosis: string[];
        iterate: "hook" | "duration" | "cta" | "landing" | "format" | null;
    } | null;
};

const GRADE: Record<string, { label: string; color: "success" | "default" | "error" }> = {
    good: { label: "bueno", color: "success" }, ok: { label: "regular", color: "default" }, weak: { label: "flojo", color: "error" },
};
const ITERATE: Record<string, string> = {
    hook: "el hook (los primeros segundos)", duration: "la duración o el ritmo", cta: "el cierre (CTA)", landing: "la landing, sin cambiar el creativo", format: "el formato (probar en imagen)",
};

/** El veredicto en una etiqueta; al pasar el mouse, el dato, la lectura y la propuesta. */
export const VerdictChip: React.FC<{ v?: Verdict | null; prefix?: string }> = ({ v, prefix }) => {
    if (!v) return null;
    return (
        <Tooltip title={
            <Box sx={{ p: 0.5 }}>
                <Typography variant="caption" component="div">{v.data}</Typography>
                <Typography variant="caption" component="div" fontWeight={700} sx={{ mt: 0.5 }}>{v.reading}</Typography>
                {v.proposal && <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>→ {v.proposal}</Typography>}
            </Box>
        }>
            <Chip size="small" color={v.tone} variant={v.key === "loser" || v.key === "proven" ? "filled" : "outlined"}
                label={`${prefix ?? ""}${v.label}`} sx={{ mt: 0.5, mr: 0.5, maxWidth: "100%" }} />
        </Tooltip>
    );
};

/** Lo que se ve de una campaña (saturación, CTR bajo en toda la ciudad). */
export const DecisionNotes: React.FC<{ notes?: DecisionNote[] }> = ({ notes }) => (
    !notes?.length ? null : (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {notes.map((n) => <Tooltip key={n.key} title={n.text}><Chip size="small" color="warning" variant="outlined" label={n.label} sx={{ mt: 0.5 }} /></Tooltip>)}
        </Stack>
    )
);

/** La página del creativo: lo que dicen las reglas, por ciudad, entre ciudades, el embudo y el video. */
export const CreativeDecisionBox: React.FC<{ d: CreativeDecision | null | undefined }> = ({ d }) => {
    if (!d) return null;
    const v = d.verdict;
    return (
        <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: 2, mt: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold">Qué dicen tus reglas</Typography>
            <Typography variant="caption" color="text.secondary">Con los 3 días cerrados, los 3 anteriores y toda la vida del creativo, sin importar el rango elegido arriba.</Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
                <Box>
                    <VerdictChip v={v} />
                    {d.funnel && <Chip size="small" variant="outlined" label={`${d.funnel.label} (frecuencia ${fmt.freq(d.funnel.frequency)})`} sx={{ mt: 0.5 }} />}
                    <Typography variant="body2" sx={{ mt: 0.5 }}>{v.reading}</Typography>
                    {v.proposal && <Typography variant="body2" fontWeight={700}>→ {v.proposal}</Typography>}
                </Box>
                {d.cities.length > 0 && (
                    <Box>
                        <Typography variant="caption" color="text.secondary">Por ciudad</Typography>
                        {d.cities.map((c) => (
                            <Box key={c.campaign_meta_id} sx={{ display: "flex", gap: 1, alignItems: "baseline", flexWrap: "wrap" }}>
                                <Typography variant="body2" fontWeight={700} sx={{ minWidth: 90 }}>{c.city ?? "—"}</Typography>
                                <VerdictChip v={c} />
                                <Typography variant="caption" color="text.secondary">{c.data}</Typography>
                            </Box>
                        ))}
                    </Box>
                )}
                {d.video && (
                    <Box>
                        <Typography variant="caption" color="text.secondary">{d.video.grades.hook !== null ? "Video" : "Anuncio"} ({d.video.window})</Typography>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                            {(["hook", "hold", "ctr", "visit", "conversion", "watch"] as const).filter((k) => d.video!.grades[k]).map((k) => (
                                <Chip key={k} size="small" variant="outlined" color={GRADE[d.video!.grades[k]!].color}
                                    label={`${{ hook: "Hook", hold: "Hold", ctr: "CTR único", visit: "Visita", conversion: "Compra", watch: "Tiempo visto" }[k]}: ${GRADE[d.video!.grades[k]!].label}`} />
                            ))}
                            {d.video.watch_pct !== null && <Chip size="small" variant="outlined" label={`Ven en promedio el ${fmt.pct(d.video.watch_pct)} del video`} />}
                        </Stack>
                        {d.video.diagnosis.map((t, i) => <Typography key={i} variant="body2" sx={{ mt: 0.5 }}>• {t}</Typography>)}
                        {d.video.iterate && <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5 }}>Qué iterar primero: {ITERATE[d.video.iterate]}.</Typography>}
                        {d.video.diagnosis.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Nada flojo contra tus valores ni contra tus ganadores.</Typography>}
                    </Box>
                )}
            </Stack>
        </Paper>
    );
};

// ---------------------------------------------------------------- paso 2b: qué hacer con cada campaña y cada producto

export type CampaignAction = {
    key: "no_target" | "wait" | "none" | "scale" | "hold" | "hold_prune" | "intervene" | "decrease" | "pause_city" | "last_test" | "drop";
    label: string; tone: "default" | "info" | "success" | "warning" | "error";
    data: string; reading: string; proposal: string | null; from: number | null; to: number | null; campaign?: string;
};
export type PriceOption = { text: string; price: number; to: number; min: number };
export type ProductPlan = {
    urgency: { level: 1 | 2 | 3 | 4 | 5; label: string; batches: string; reasons: string[]; needed?: string; bank?: string[] };
    next_work: string[]; price: string[]; price_watch: string | null; alarms: string[]; money_at_risk: number;
};

const URGENCY_COLOR: Record<number, "error" | "warning" | "success" | "default"> = { 1: "error", 2: "warning", 3: "success", 4: "default", 5: "default" };

/** Qué hacer con una campaña, con el monto; al pasar el mouse, el dato, la lectura, la propuesta y lo demás. */
export const ActionChip: React.FC<{ a?: CampaignAction | null; extra?: (string | null | undefined)[] }> = ({ a, extra = [] }) => {
    if (!a) return null;
    const more = extra.filter(Boolean) as string[];
    return (
        <Tooltip title={
            <Box sx={{ p: 0.5 }}>
                {a.campaign && <Typography variant="caption" component="div" sx={{ opacity: 0.8 }}>{a.campaign}</Typography>}
                {a.data && <Typography variant="caption" component="div">{a.data}</Typography>}
                <Typography variant="caption" component="div" fontWeight={700} sx={{ mt: 0.5 }}>{a.reading}</Typography>
                {a.proposal && <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>→ {a.proposal}</Typography>}
                {more.map((t, i) => <Typography key={i} variant="caption" component="div" sx={{ mt: 0.5 }}>• {t}</Typography>)}
            </Box>
        }>
            <Chip size="small" color={a.tone} variant={["scale", "decrease", "pause_city", "drop"].includes(a.key) ? "filled" : "outlined"}
                label={a.label} sx={{ mt: 0.5, mr: 0.5, maxWidth: "100%" }} />
        </Tooltip>
    );
};

/** Lo del producto: urgencia, cuántos batches pedir, qué producir, el precio y las alarmas. */
export const PlanBox: React.FC<{ plan?: ProductPlan | null }> = ({ plan }) => {
    if (!plan) return null;
    const u = plan.urgency;
    return (
        <Box sx={{ mt: 0.75 }}>
            <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                <Tooltip title={u.reasons.length ? u.reasons.join(" · ") : "Sin problemas en los 3 días cerrados."}>
                    <Chip size="small" color={URGENCY_COLOR[u.level]} label={u.label} />
                </Tooltip>
                <Typography variant="caption" color="text.secondary">
                    Batches a pedir: <b>{u.batches}</b>{u.bank && u.bank.length > 0 ? ` · en banca: ${u.bank.join(", ")}` : ""}
                </Typography>
            </Stack>
            {plan.next_work.map((t, i) => <Typography key={i} variant="body2" sx={{ mt: 0.25 }}>• {t}</Typography>)}
            {[...plan.price, ...(plan.price_watch ? [plan.price_watch] : [])].map((t, i) => (
                <Typography key={`p${i}`} variant="caption" color="text.secondary" component="div" sx={{ mt: 0.25 }}>💲 {t}</Typography>
            ))}
            {plan.alarms.map((t, i) => <Alert key={`a${i}`} severity="warning" sx={{ mt: 0.5, py: 0 }}>{t}</Alert>)}
        </Box>
    );
};

// ---------------------------------------------------------------- los números (Meta Ads › Reglas)

type Settings = Record<string, number | boolean>;
type SettingsData = { values: Settings; defaults: Settings };

const GROUPS: { title: string; help?: string; fields: [string, string, string?][] }[] = [
    {
        title: "Estados de anuncios y batches", help: "Con el gasto y las compras de toda su vida. ×C = veces el CPA objetivo de esa ciudad.", fields: [
            ["no_data_cpa", "Sin datos: gastó menos de", "×C"], ["loser_spend_cpa", "Perdedor: gastó, con 0 o 1 compra", "×C"],
            ["evaluation_cap_cpa", "Con 2+ compras en el break-even: tope de evaluación", "×C"],
            ["promising_purchases", "Prometedor: compras con CPA ≤ C", "compras"], ["proven_purchases", "PROVEN: compras con CPA ≤ C", "compras"],
        ],
    },
    {
        title: "Embudo y saturación", help: "Con la frecuencia de los 3 días cerrados.", fields: [
            ["funnel_middle_from", "Medio del embudo desde"], ["funnel_bottom_above", "Abajo del embudo: más de"], ["saturation_from", "Campaña saturada desde"],
        ],
    },
    {
        title: "Qué cambió", help: "Los 3 días cerrados contra los 3 anteriores.", fields: [
            ["freq_rise_pct", "Fatiga: la frecuencia sube", "%"], ["ctr_drop_pct", "Fatiga: el CTR único o el hook bajan", "%"],
            ["cpm_rise_pct", "Subasta: el CPM de la ciudad sube", "%"], ["conv_drop_pct", "Landing u oferta: la compra baja", "%"],
            ["tracking_low_pct", "Tracking: Meta ve menos de", "% de los pedidos"], ["tracking_high_pct", "…o más de", "% de los pedidos"],
        ],
    },
    {
        title: "Video y anuncio", help: "Bueno desde / flojo debajo de. Además, flojo si está muy debajo de la mediana de tus ganadores del mismo producto.", fields: [
            ["hook_good", "Hook bueno desde", "%"], ["hook_weak", "Hook flojo debajo de", "%"], ["hold_good", "Hold bueno desde", "%"], ["hold_weak", "Hold flojo debajo de", "%"],
            ["ctr_good", "CTR único bueno desde", "%"], ["ctr_weak", "CTR único flojo debajo de", "%"], ["visit_ok", "Visita normal desde", "%"], ["visit_leak", "Visita: fuga debajo de", "%"],
            ["retention_open", "Se van al principio si llega al 25 % menos del", "%"], ["retention_body", "Se van en el medio si del 25 % al 75 % sigue menos del", "%"],
            ["retention_end", "Se van al final si del 75 % al final sigue menos del", "%"], ["watch_good", "Tiempo visto bueno desde", "% del video"],
            ["watch_weak", "Tiempo visto flojo debajo de", "% del video"], ["winners_gap_pct", "Flojo si está debajo de tus ganadores por", "%"],
        ],
    },
    {
        title: "Escalar, bajar y pausar", help: "Qué hacer con cada campaña, con los 3 días cerrados. Nunca presupuesto y creativos el mismo día.", fields: [
            ["scale_min_purchases", "Escalar con al menos", "compras en 3 días"], ["scale_big_below_pct", "Subida grande si el CPA está debajo de C por", "%"],
            ["scale_big_pct", "Subida grande", "%"], ["scale_small_pct", "Subida chica", "%"], ["decrease_pct", "Bajar", "%"],
            ["decrease_after_days", "Bajar si sigue en el BE después de intervenir", "días"], ["pause_after_days", "Pausar la ciudad a los", "días"],
            ["last_test_budget_cpa", "Último test: por día", "×C"], ["last_test_days", "Último test: durante", "días"],
            ["stock_days_min", "Escalar solo con stock para", "días de ventas"],
        ],
    },
    {
        title: "Presupuesto y precio", help: "Los mínimos de gasto de los ad sets (CBO) y la opción de bajar el precio.", fields: [
            ["startup_min_mult", "Arranque: C × batches nuevos × desde", "veces"], ["startup_max_mult", "…hasta", "veces"],
            ["mins_low_pct", "Mínimos bajos debajo de", "% del presupuesto"], ["mins_ok_pct", "Mínimos bien hasta", "% del presupuesto"],
            ["mins_review_pct", "Revisar hasta (más, no)", "% del presupuesto"], ["price_step", "Probar bajar el precio de a", "$"],
        ],
    },
    { title: "Estados automáticos de los creativos", help: "Se ponen cada día a las 06:45. Los que pones a mano no se tocan.", fields: [["archive_days", "Archived: sin anuncios activos ni gasto en", "días"]] },
    {
        title: "Cola y banca", help: "La banca son los batches aprobados sin testear de cada producto; se restan de los que hay que pedir.", fields: [
            ["bank_min", "Banca por producto: desde", "batches"], ["bank_max", "…hasta", "batches"], ["batch_pieces", "Piezas por batch", "piezas"],
            ["video_editors", "Editores de video", "personas"], ["batches_per_editor", "Batches por editor por día", "batches"],
            ["corrections_pct", "Tiempo de correcciones", "%"], ["due_days", "Plazo de un encargo al aprobarlo", "días"],
        ],
    },
    {
        title: "Landings", help: "Con menos no se opina. Lenta y \"compra menos\" usan la visita y el \"debajo de tus ganadores\" de arriba.", fields: [
            ["landing_min_clicks", "Opinar de la visita con al menos", "clics"], ["landing_min_visits", "Opinar de la compra con al menos", "visitas"],
        ],
    },
];

const NumberField: React.FC<{ k: string; label: string; unit?: string; value: number; initial: number; onSave: (k: string, v: number) => void }> = ({ k, label, unit, value, initial, onSave }) => {
    const [text, setText] = useState(String(value));
    useEffect(() => { setText(String(value)); }, [value]);
    const commit = () => {
        const n = Number(text.replace(",", "."));
        if (text.trim() === "" || Number.isNaN(n)) { setText(String(value)); return; }
        if (n !== value) onSave(k, n);
    };
    return (
        <Box sx={{ width: { xs: "100%", sm: 250 } }}>
            <Typography variant="body2" sx={{ mb: 0.5, minHeight: { sm: 40 } }}>{label}</Typography>
            <TextField size="small" value={text} onChange={(e) => setText(e.target.value)} onBlur={commit} fullWidth
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                helperText={`inicial ${initial}`} inputProps={{ inputMode: "decimal", "aria-label": label }}
                InputProps={{ endAdornment: unit ? <InputAdornment position="end">{unit}</InputAdornment> : undefined }} />
        </Box>
    );
};

export const MetaDecisionSettings: React.FC = () => {
    const [data, setData] = useState<SettingsData | null>(null);
    const load = useCallback(() => { api<SettingsData>("/meta/decisions/settings").then(setData).catch((e) => toast.error(e.message)); }, []);
    useEffect(() => { load(); }, [load]);
    const save = async (k: string, v: number | boolean) => {
        try {
            const r = await api<{ values: Settings }>("/meta/decisions/settings", "PUT", { [k]: v });
            setData((d) => d ? { ...d, values: r.values } : d);
            toast.success("Guardado");
        } catch (e) { toast.error((e as Error).message); load(); }
    };
    if (!data) return <Typography sx={{ p: 2 }}>Cargando…</Typography>;
    const box = { borderRadius: 3, border: "1px solid", borderColor: "divider", p: 2 } as const;
    return (
        <Stack spacing={2}>
            <Alert severity="info">
                <b>Tus números para decidir.</b> Con estos números el sistema dice si cada anuncio, batch y creativo está sin datos, en evaluación,
                prometedor, PROVEN, intermedio o perdedor, qué cambió cuando un ganador empieza a fallar y qué hacer con cada campaña (con montos).
                Solo recomienda: nunca toca Meta.
            </Alert>
            {GROUPS.map((g) => (
                <Paper key={g.title} elevation={0} sx={box}>
                    <Typography fontWeight="bold">{g.title}</Typography>
                    {g.help && <Typography variant="body2" color="text.secondary">{g.help}</Typography>}
                    {g.title.startsWith("Estados automáticos") && (
                        <FormControlLabel sx={{ mt: 1 }} control={<Switch checked={!!data.values.auto_statuses} onChange={(e) => save("auto_statuses", e.target.checked)} />}
                            label={data.values.auto_statuses ? "Encendidos" : "Apagados: los estados quedan como están"} />
                    )}
                    <Stack direction="row" flexWrap="wrap" useFlexGap gap={1.5} sx={{ mt: 1.5 }}>
                        {g.fields.map(([k, label, unit]) => (
                            <NumberField key={k} k={k} label={label} unit={unit} value={Number(data.values[k])} initial={Number(data.defaults[k])} onSave={save} />
                        ))}
                    </Stack>
                </Paper>
            ))}
        </Stack>
    );
};
