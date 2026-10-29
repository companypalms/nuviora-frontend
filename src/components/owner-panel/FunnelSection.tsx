// src/components/owner-panel/FunnelSection.tsx
// Panel del dueño › Embudo (diccionario de métricas, §3, §4 y §8): de los pedidos creados en el período, cuántos llegaron
// a cada paso, dónde se quedaron los demás y cuánto tardan. Los números y sus explicaciones vienen del backend
// (Metrics\Rules\FunnelRules).
import React, { FC } from "react";
import { Box, Stack, Typography, alpha, useTheme } from "@mui/material";
import SouthRoundedIcon from "@mui/icons-material/SouthRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import { Panel } from "../ui/surface/Panel";
import { Explain } from "./Explain";
import { MetricCard } from "./MetricCard";
import { BoxTitle, Empty, SectionTitle } from "./parts";
import { FunnelResponse, FunnelStep, count, duration, pct } from "./ownerPanel";

const plural = (n: number, one: string, many: string) => `${count(n)} ${n === 1 ? one : many}`;

const StepRow: FC<{ step: FunnelStep; index: number; last: boolean; before: number | null; compareLabel: string }> = ({ step, index, last, before, compareLabel }) => {
    const t = useTheme();
    const color = last ? t.palette.success.main : alpha(t.palette.primary.main, 1 - index * 0.15);
    const width = Math.max(step.of_created ?? 0, 8);

    return (
        <Explain
            title={`${step.label}: ${count(step.count)}`}
            help={step.help}
            detail={index === 0 ? null : `${pct(step.of_created)} de los creados · ${pct(step.of_previous)} pasó del paso anterior`}
            extra={
                <Typography variant="caption" color="text.secondary" component="div">
                    {step.median_hours !== null && (
                        <Box component="span" display="block">
                            Tiempo normal desde el paso anterior: <b>{duration(step.median_hours)}</b> (la mitad de los {count(step.timed)} pedidos con hora tardó menos).
                        </Box>
                    )}
                    {index > 0 && <Box component="span" display="block" sx={{ mt: 0.5 }}>{compareLabel}: <b>{pct(before)}</b> de los creados.</Box>}
                </Typography>
            }
        >
            <Stack direction={{ xs: "column", md: "row" }} alignItems={{ md: "center" }} gap={{ xs: 0.5, md: 2 }} sx={{ cursor: "help" }} tabIndex={0}>
                <Typography variant="body2" fontWeight={700} sx={{ width: { md: 190 }, flexShrink: 0, textAlign: { md: "right" } }}>{step.label}</Typography>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{
                        mx: "auto", width: `${width}%`, minWidth: 92, height: 40, borderRadius: 2, bgcolor: color, color: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75, transition: "filter .15s", "&:hover": { filter: "brightness(1.1)" },
                    }}>
                        <Typography fontWeight={800}>{count(step.count)}</Typography>
                        {index > 0 && <Typography variant="caption" sx={{ opacity: 0.9 }}>{pct(step.of_created)}</Typography>}
                    </Box>
                </Box>
                <Stack sx={{ width: { md: 150 }, flexShrink: 0 }} direction={{ xs: "row", md: "column" }} gap={{ xs: 1.5, md: 0 }} justifyContent="center">
                    {index > 0 && <Typography variant="caption" color="text.secondary"><b>{pct(step.of_previous)}</b> del paso anterior</Typography>}
                    {step.median_hours !== null && (
                        <Stack direction="row" alignItems="center" gap={0.5}>
                            <ScheduleRoundedIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                            <Typography variant="caption" color="text.secondary">{duration(step.median_hours)}</Typography>
                        </Stack>
                    )}
                </Stack>
            </Stack>
        </Explain>
    );
};

/** Entre dos pasos: los que no pasaron al siguiente y qué les pasó. */
const Drop: FC<{ step: FunnelStep; next: FunnelStep }> = ({ step, next }) => {
    const s = step.stayed!;
    const parts = [
        s.cancelled > 0 && { n: s.cancelled, text: plural(s.cancelled, "cancelado", "cancelados"), color: "error.main" },
        s.rejected > 0 && { n: s.rejected, text: plural(s.rejected, "rechazado en puerta", "rechazados en puerta"), color: "warning.dark" },
        s.open > 0 && { n: s.open, text: `${plural(s.open, "sigue", "siguen")} en proceso`, color: "warning.main" },
    ].filter(Boolean) as { n: number; text: string; color: string }[];

    return (
        <Stack direction="row" alignItems="center" justifyContent="center" gap={1} flexWrap="wrap" sx={{ py: 0.75, pl: { md: "206px" }, pr: { md: "166px" } }}>
            <SouthRoundedIcon sx={{ fontSize: 16, color: "text.disabled" }} />
            {s.total === 0 ? (
                <Typography variant="caption" color="text.secondary">Todos pasaron a «{next.label}»</Typography>
            ) : (
                <>
                    <Typography variant="caption" color="text.secondary"><b>{count(s.total)}</b> no pasaron a «{next.label}»:</Typography>
                    {parts.map((p) => (
                        <Stack key={p.text} direction="row" alignItems="center" gap={0.5}>
                            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: p.color }} />
                            <Typography variant="caption" color="text.secondary">{p.text}</Typography>
                        </Stack>
                    ))}
                </>
            )}
        </Stack>
    );
};

export const FunnelSection: FC<{ data: FunnelResponse; loading: boolean }> = ({ data, loading }) => {
    const before = Object.fromEntries(data.previous_steps.map((s) => [s.key, s.of_created]));
    const created = data.steps[0]?.count ?? 0;

    return (
        <Stack spacing={2} sx={{ opacity: loading ? 0.55 : 1, transition: "opacity .2s" }}>
            <SectionTitle title="Embudo" />

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))" }, gap: { xs: 1, sm: 1.5 } }}>
                {data.cards.map((c) => <MetricCard key={c.key} card={c} compareLabel={data.previous.label} />)}
            </Box>

            {data.relation && (
                <Stack direction="row" gap={1} alignItems="flex-start">
                    <LightbulbOutlinedIcon sx={{ fontSize: 18, color: "warning.main", mt: 0.25 }} />
                    <Typography variant="body2" color="text.secondary">{data.relation}</Typography>
                </Stack>
            )}

            <Panel>
                <BoxTitle
                    title="¿Dónde se pierden los pedidos?"
                    subtitle="Cada barra es un paso; entre una y otra, los que se quedaron y qué les pasó. Pasa el cursor por cada paso."
                    help={data.help}
                />
                {created === 0 ? <Empty text="No entraron pedidos en este período con estos filtros." /> : (
                    <Box>
                        {data.steps.map((s, i) => (
                            <React.Fragment key={s.key}>
                                <StepRow step={s} index={i} last={i === data.steps.length - 1} before={before[s.key] ?? null} compareLabel={data.previous.label} />
                                {i < data.steps.length - 1 && s.stayed && <Drop step={s} next={data.steps[i + 1]} />}
                            </React.Fragment>
                        ))}
                    </Box>
                )}
            </Panel>
        </Stack>
    );
};
