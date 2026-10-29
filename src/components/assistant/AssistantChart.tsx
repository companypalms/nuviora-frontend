// src/components/assistant/AssistantChart.tsx
// Una gráfica de una respuesta del asistente, con los datos que mandó el servidor: columnas (por día), barras acostadas
// (rankings) o línea. Los colores y los números con el mismo formato del Panel del dueño.
import React, { FC } from "react";
import { Box, Stack, Typography, useTheme } from "@mui/material";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import { ChartTip } from "../owner-panel/parts";
import { formatValue } from "../owner-panel/ownerPanel";
import { DisplayBlock } from "./assistant";

type ChartBlock = Extract<DisplayBlock, { type: "chart" }>;

/** Los nombres de las barras acostadas en una sola línea (el nombre entero sale al pasar el cursor). */
const NameTick: FC<{ x?: number; y?: number; payload?: { value: string }; fill: string }> = ({ x = 0, y = 0, payload, fill }) => {
    const name = String(payload?.value ?? "");
    return (
        <text x={x} y={y} dy={4} textAnchor="end" fill={fill} fontSize={11}>
            {name.length > 22 ? `${name.slice(0, 21)}…` : name}
        </text>
    );
};

const Tip: FC<{ active?: boolean; payload?: { payload: Record<string, string | number | null> }[]; block: ChartBlock; colors: string[] }> = ({ active, payload, block, colors }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    return (
        <ChartTip>
            <Typography variant="subtitle2" fontWeight={800}>{p.label}</Typography>
            {block.series.map((s, i) => (
                <Stack key={s.key} direction="row" alignItems="center" gap={0.75}>
                    <Box sx={{ width: 10, height: 10, borderRadius: "2px", bgcolor: colors[i % colors.length] }} />
                    <Typography variant="body2">{s.label}: <b>{formatValue(p[s.key] as number | null, block.format)}</b></Typography>
                </Stack>
            ))}
        </ChartTip>
    );
};

export const AssistantChart: FC<{ block: ChartBlock }> = ({ block }) => {
    const t = useTheme();
    const colors = [t.palette.primary.main, t.palette.success.main, t.palette.warning.main, t.palette.info.main];
    const tick = { fill: t.palette.text.secondary, fontSize: 11 };
    const short = (v: number) => (block.format === "money" ? `$${Math.round(v)}` : block.format === "percent" ? `${v}%` : formatValue(v, block.format));
    const horizontal = block.kind === "hbar";
    const height = horizontal ? Math.max(120, block.points.length * 28 + 30) : 220;
    const tooltip = <ChartTooltip content={<Tip block={block} colors={colors} />} cursor={{ fill: t.palette.action.hover }} />;

    return (
        <Box>
            <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>{block.title}</Typography>
            <Box sx={{ width: "100%", height }}>
                <ResponsiveContainer width="100%" height="100%">
                    {block.kind === "line" ? (
                        <LineChart data={block.points} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={t.palette.divider} />
                            <XAxis dataKey="label" tick={tick} interval="preserveStartEnd" minTickGap={10} />
                            <YAxis tick={tick} width={48} tickFormatter={short} />
                            {tooltip}
                            {block.series.map((s, i) => <Line key={s.key} dataKey={s.key} stroke={colors[i % colors.length]} strokeWidth={2} dot={false} />)}
                        </LineChart>
                    ) : horizontal ? (
                        <BarChart data={block.points} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={t.palette.divider} />
                            <XAxis type="number" tick={tick} tickFormatter={short} />
                            <YAxis type="category" dataKey="label" tick={<NameTick fill={t.palette.text.secondary} />} width={140} interval={0} />
                            {tooltip}
                            {block.series.map((s, i) => <Bar key={s.key} dataKey={s.key} fill={colors[i % colors.length]} radius={[0, 4, 4, 0]} barSize={18} />)}
                        </BarChart>
                    ) : (
                        <BarChart data={block.points} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={t.palette.divider} />
                            <XAxis dataKey="label" tick={tick} interval="preserveStartEnd" minTickGap={10} />
                            <YAxis tick={tick} width={48} tickFormatter={short} allowDecimals={block.format !== "count"} />
                            {tooltip}
                            {block.series.map((s, i) => <Bar key={s.key} dataKey={s.key} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} />)}
                        </BarChart>
                    )}
                </ResponsiveContainer>
            </Box>
            {block.series.length > 1 && (
                <Stack direction="row" gap={2} flexWrap="wrap" sx={{ mt: 0.5 }}>
                    {block.series.map((s, i) => (
                        <Stack key={s.key} direction="row" alignItems="center" gap={0.75}>
                            <Box sx={{ width: 10, height: 10, borderRadius: "2px", bgcolor: colors[i % colors.length] }} />
                            <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                        </Stack>
                    ))}
                </Stack>
            )}
        </Box>
    );
};
