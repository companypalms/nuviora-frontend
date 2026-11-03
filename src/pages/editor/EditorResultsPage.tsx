// src/pages/editor/EditorResultsPage.tsx
// Etapa 5, paso 5b (2026-10-30): "Mis resultados" de los editores de video. Sus indicadores del período (entregas a
// tiempo, lo devuelto, % de ganadores) y cómo les fue a sus batches. `.63` (decisión del dueño): solo si ganó, perdió o
// empató; ni compras, ni CPA, ni ciudades (el servidor ya no los manda). El editor líder ve además los de cada editor.
// .94 (dueño, entrevista del rol de editor: "todo debe ser muy intuitivo, fácil de utilizar y gamificado"): rehecha con
// las reglas del juego (guias/DISENO-UX-UI.md). La pregunta: "¿Cómo me va?". Arriba el marcador de verdad (racha a
// tiempo, a la primera y ganadores del mes); después el período; el equipo en orden (solo el líder: el ranking lo ven
// él y el dueño); y cada batch con su resultado en palabras.
import React, { useCallback, useEffect, useState } from "react";
import { Box, Button, ButtonBase, Skeleton, Stack, Tooltip, Typography } from "@mui/material";
import { EmojiEventsRounded, ReportProblemRounded } from "@mui/icons-material";
import { Layout } from "../../components/ui/Layout";
import { useValidateSession } from "../../hooks/useValidateSession";
import { api, dateTime } from "../../components/meta-ads/metaAds";
import { EditorGameData } from "../../components/meta-ads/editorShared";
import { Better, MetricFormat, PeriodInfo, formatValue } from "../../components/owner-panel/ownerPanel";
import { cardSx, geist, inkSx, plural, tapSx, Tokens, useTokens } from "../../components/ui/design";
import { Dot, Scoreboard, Section } from "../../components/ui/designParts";

type Preset = "7d" | "month" | "last_month";
type Metric = { key: string; label: string; format: MetricFormat; better: Better; help: string };
type Values = { values: Record<string, number | null>; details: Record<string, string> };
type ResultBatch = {
    id: number; code: string; product: string | null; editor: string | null; status: string; status_label: string; testing_at: string | null; tested_at: string | null;
    /** .63: "Ganó", "Perdió", "Empate", "En test" o "Por lanzar". */
    result: string; winner: boolean | null; on_time: boolean | null; versions: number; returned: number;
};
type Data = {
    period: PeriodInfo; leader: boolean; metrics: Metric[]; me: Values; game?: EditorGameData;
    team: { totals: Values; people: ({ id: number; name: string; group: string | null } & Values)[] } | null;
    batches: ResultBatch[];
};

const PRESETS: { key: Preset; label: string }[] = [{ key: "7d", label: "7 días" }, { key: "month", label: "Este mes" }, { key: "last_month", label: "Mes pasado" }];
/** El resultado con su punto (color solo para señales, siempre con palabra). */
const resultDot = (t: Tokens, r: string) => (r === "Ganó" ? t.green : r === "Perdió" ? t.red : r === "En test" ? t.amber : t.gray);

export const EditorResultsPage: React.FC = () => {
    const t = useTokens();
    const { loadingSession, isValid } = useValidateSession();
    const [preset, setPreset] = useState<Preset>("month");
    const [data, setData] = useState<Data | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(() => {
        setError(null);
        api<Data>(`/editor/results?periodo=${preset}`).then(setData).catch((e) => setError((e as Error).message));
    }, [preset]);
    useEffect(() => { if (isValid) load(); }, [isValid, load]);

    const frame = (children: React.ReactNode) => (
        <Layout><Box sx={{ ...geist, maxWidth: 640, mx: "auto", px: { xs: 0, sm: 2 }, py: 2, color: t.ink }}>{children}</Box></Layout>
    );
    if (loadingSession || !isValid || (!data && !error)) {
        return frame(
            <Box aria-busy="true" aria-label="Cargando tus resultados">
                <Skeleton width={200} height={34} />
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, mt: 2 }}>{[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={58} />)}</Box>
                <Skeleton variant="rounded" height={140} sx={{ mt: 3 }} />
                <Skeleton variant="rounded" height={200} sx={{ mt: 2 }} />
            </Box>,
        );
    }
    if (error && !data) {
        return frame(
            <Box role="alert" sx={{ ...cardSx(t), p: 3 }}>
                <Stack direction="row" spacing={1} alignItems="center"><ReportProblemRounded sx={{ color: t.red }} /><Typography sx={{ fontSize: 16, fontWeight: 600 }}>No se pudieron abrir tus resultados</Typography></Stack>
                <Typography sx={{ fontSize: 14, color: t.muted, mt: 1 }}>Revisa tu conexión a internet y vuelve a intentar.</Typography>
                <Button variant="contained" disableElevation sx={{ ...inkSx(t), ...tapSx, mt: 2 }} onClick={load}>Reintentar</Button>
                <Typography sx={{ fontSize: 12, color: t.faint, mt: 2 }}>Detalle técnico: {error}</Typography>
            </Box>,
        );
    }
    const d = data!;
    const g = d.game?.me;
    const value = (v: Values, key: string, format: MetricFormat) => formatValue(v.values[key] ?? null, format);
    // El equipo en orden: más ganadores, después más a tiempo, después más entregados
    const people = [...(d.team?.people ?? [])].sort((a, b) =>
        (b.values.winners ?? -1) - (a.values.winners ?? -1) || (b.values.on_time ?? -1) - (a.values.on_time ?? -1) || (b.values.delivered ?? 0) - (a.values.delivered ?? 0));
    // En el orden del ranking: ganadores, a tiempo, entregados
    const short = ["winners", "on_time", "delivered"].map((k) => d.metrics.find((m) => m.key === k)).filter((m): m is Metric => !!m);
    const SHORT: Record<string, string> = { winners: "Ganadores", on_time: "A tiempo", delivered: "Entregados" };
    /** "Ganadores: 50 % · A tiempo: 90 % · Entregados: 6" */
    const line = (v: Values) => short.map((m) => `${SHORT[m.key]}: ${value(v, m.key, m.format)}`).join(" · ");

    return frame(
        <>
            <Typography component="h1" sx={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>Mis resultados</Typography>
            <Typography sx={{ fontSize: 13, color: t.muted }}>¿Cómo me va? Tus entregas y si tus videos ganaron en Meta.</Typography>

            {g && (
                <Scoreboard tiles={[
                    { label: "Racha a tiempo", value: plural(g.streak, "día", "días"), color: g.streak > 0 ? t.green : undefined,
                        help: "Días seguidos entregando a tiempo todo lo que vencía ese día. Un día sin entregas no la corta; uno tarde, sí." },
                    { label: "A la primera", value: g.first.total ? `${g.first.ok} de ${g.first.total}` : "—",
                        help: "De tus encargos revisados este mes, cuántos se aprobaron sin devolverte nada." },
                    { label: "Ganadores", value: g.winners, color: g.winners > 0 ? t.green : undefined, help: "Tus creativos que ganaron en Meta este mes." },
                ]} />
            )}
            {g && g.recent_wins.length > 0 && (
                <Box role="status" sx={{ mt: 1.5, p: "10px 14px", borderRadius: "10px", display: "flex", gap: 1, alignItems: "center", bgcolor: t.greenSoft, color: t.greenInk }}>
                    <EmojiEventsRounded sx={{ fontSize: 20 }} />
                    <Typography sx={{ fontSize: 14, color: "inherit" }}>
                        Esta semana {g.recent_wins.length === 1 ? `ganó tu ${g.recent_wins[0].code}` : `ganaron tus ${g.recent_wins.map((w) => w.code).join(", ")}`} en Meta.
                    </Typography>
                </Box>
            )}

            <Section name="En el período" hint={d.period.from === d.period.to ? d.period.from : `${d.period.from} al ${d.period.to}`}>
                <Stack direction="row" spacing={0.75} role="group" aria-label="Período" sx={{ mb: 1.25 }}>
                    {PRESETS.map((p) => {
                        const on = preset === p.key;
                        return (
                            <ButtonBase key={p.key} onClick={() => setPreset(p.key)} aria-pressed={on}
                                sx={{ flex: 1, minHeight: { xs: 44, sm: 36 }, borderRadius: "8px", fontSize: 14, border: `1px solid ${on ? t.ink : t.line}`,
                                    bgcolor: on ? t.ink : "transparent", color: on ? t.onInk : t.ink, "&.Mui-focusVisible": { outline: `2px solid ${t.ink}`, outlineOffset: 2 } }}>
                                {p.label}
                            </ButtonBase>
                        );
                    })}
                </Stack>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1 }}>
                    {d.metrics.map((m) => (
                        <Tooltip key={m.key} title={m.help}>
                            <Box tabIndex={0} sx={{ bgcolor: t.soft, borderRadius: "8px", p: "10px 12px", minWidth: 0, "&:focus-visible": { outline: `2px solid ${t.ink}` } }}>
                                <Typography sx={{ fontSize: 12, color: t.muted }}>{m.label}</Typography>
                                <Typography sx={{ fontSize: 18, fontWeight: 600 }}>{value(d.me, m.key, m.format)}</Typography>
                                {d.me.details[m.key] && <Typography sx={{ fontSize: 12, color: t.muted, overflowWrap: "anywhere" }}>{d.me.details[m.key]}</Typography>}
                            </Box>
                        </Tooltip>
                    ))}
                </Box>
            </Section>

            {d.team && (
                <Section name="El equipo" hint="en orden: más ganadores, después más a tiempo · solo lo ven tú y el dueño">
                    {people.length === 0 ? (
                        <Typography sx={{ fontSize: 14, color: t.muted }}>Todavía nadie entregó ni tiene resultados en este período.</Typography>
                    ) : (
                        <Box sx={{ ...cardSx(t) }}>
                            {people.map((p, i) => (
                                <Stack key={p.id} direction="row" spacing={1.25} alignItems="center" sx={{ p: "10px 14px", borderTop: i ? `1px solid ${t.line}` : 0 }}>
                                    <Box aria-hidden sx={{ flex: "none", width: 26, height: 26, borderRadius: "50%", bgcolor: i === 0 ? t.ink : t.soft, color: i === 0 ? t.onInk : t.muted,
                                        fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</Box>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography sx={{ fontSize: 15, fontWeight: 500 }}>{p.name}{p.group ? ` (${p.group.toLowerCase()})` : ""}</Typography>
                                        <Typography sx={{ fontSize: 13, color: t.muted }}>
                                            {line(p)}
                                        </Typography>
                                    </Box>
                                </Stack>
                            ))}
                            <Typography sx={{ fontSize: 13, color: t.muted, p: "8px 14px", borderTop: `1px solid ${t.line}` }}>
                                Todo el equipo: {line(d.team!.totals)}
                            </Typography>
                        </Box>
                    )}
                </Section>
            )}

            <Section name={d.leader ? "Los creativos del equipo" : "Tus creativos"} hint="en test arriba, después lo más nuevo">
                {d.batches.length === 0 ? (
                    <Typography sx={{ fontSize: 14, color: t.muted }}>{d.leader ? "Todavía no hay batches del equipo en Meta." : "Todavía no hay batches tuyos en Meta."}</Typography>
                ) : (
                    <Box sx={{ ...cardSx(t) }}>
                        {d.batches.map((b, i) => (
                            <Stack key={b.id} direction="row" spacing={1.25} alignItems="flex-start" sx={{ p: "10px 14px", borderTop: i ? `1px solid ${t.line}` : 0 }}>
                                <Box sx={{ pt: "6px" }}><Dot color={resultDot(t, b.result)} size={9} /></Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography sx={{ fontSize: 15, fontWeight: 500, overflowWrap: "anywhere" }}>
                                        {b.code} · {b.product ?? "—"}{d.leader && b.editor ? ` · ${b.editor}` : ""}
                                    </Typography>
                                    <Typography sx={{ fontSize: 13, color: t.muted, overflowWrap: "anywhere" }}>
                                        {[
                                            b.on_time === null ? null : b.on_time ? "entregado a tiempo" : "entregado tarde",
                                            b.versions > 1 ? `${b.versions} versiones (${b.returned} ${b.returned === 1 ? "devuelta" : "devueltas"})` : "a la primera",
                                            b.tested_at ? `testeado el ${dateTime(b.tested_at)}` : b.testing_at ? `en Meta desde el ${dateTime(b.testing_at)}` : null,
                                        ].filter(Boolean).join(" · ")}
                                    </Typography>
                                </Box>
                                <Typography sx={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", color: b.result === "Ganó" ? t.green : b.result === "Perdió" ? t.red : t.ink }}>{b.result}</Typography>
                            </Stack>
                        ))}
                    </Box>
                )}
            </Section>
        </>,
    );
};
