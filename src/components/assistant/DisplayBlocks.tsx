// src/components/assistant/DisplayBlocks.tsx
// Lo que se ve debajo de una respuesta del asistente: las tarjetas del Panel del dueño (MetricCard), gráficas, tablas
// (los rankings), listas (las alertas) y enlaces. Todo sale de los datos del sistema, no de la IA.
import React, { FC, useState } from "react";
import { Box, Button, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { useNavigate } from "react-router-dom";
import { MetricCard } from "../owner-panel/MetricCard";
import { formatValue } from "../owner-panel/ownerPanel";
import { AssistantChart } from "./AssistantChart";
import { DisplayBlock } from "./assistant";

/** Las filas que se ven de una tabla antes de "Ver todas". */
const TABLE_ROWS = 10;

const LEVEL_COLOR: Record<string, string> = { red: "error.main", yellow: "warning.main", pending: "text.disabled" };

const TableBlock: FC<{ block: Extract<DisplayBlock, { type: "table" }> }> = ({ block }) => {
    const [all, setAll] = useState(false);
    const rows = all ? block.rows : block.rows.slice(0, TABLE_ROWS);
    return (
        <Box>
            <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>{block.title}</Typography>
            <Box sx={{ overflowX: "auto", border: 1, borderColor: "divider", borderRadius: 2 }}>
                <Table size="small" sx={{ "& td, & th": { whiteSpace: "nowrap", py: 0.75 } }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ position: "sticky", left: 0, bgcolor: "background.paper", zIndex: 1 }}>Nombre</TableCell>
                            {block.columns.map((c) => <TableCell key={c.key} align="right">{c.label}</TableCell>)}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((r, i) => (
                            <TableRow key={`${r.name}-${i}`} sx={{ opacity: r.low_data ? 0.55 : 1 }}>
                                <TableCell sx={{ position: "sticky", left: 0, bgcolor: "background.paper", zIndex: 1 }}>
                                    <Typography variant="body2" fontWeight={600}>{r.name}</Typography>
                                    {(r.group || r.low_data) && (
                                        <Typography variant="caption" color="text.secondary">{[r.group, r.low_data ? "pocos datos" : null].filter(Boolean).join(" · ")}</Typography>
                                    )}
                                </TableCell>
                                {block.columns.map((c) => <TableCell key={c.key} align="right">{formatValue(r.values[c.key] ?? null, c.format)}</TableCell>)}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Box>
            {block.rows.length > TABLE_ROWS && (
                <Button size="small" onClick={() => setAll(!all)} sx={{ mt: 0.5, textTransform: "none" }}>
                    {all ? "Ver menos" : `Ver todas (${block.rows.length})`}
                </Button>
            )}
        </Box>
    );
};

const Block: FC<{ block: DisplayBlock }> = ({ block }) => {
    const navigate = useNavigate();
    switch (block.type) {
        case "cards":
            return (
                <Box>
                    <Typography variant="body2" fontWeight={700} sx={{ mb: 0.75 }}>{block.title}</Typography>
                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 1 }}>
                        {block.cards.map((c) => <MetricCard key={c.key} card={c} compareLabel={block.compare_label} />)}
                    </Box>
                </Box>
            );
        case "chart":
            return <AssistantChart block={block} />;
        case "table":
            return <TableBlock block={block} />;
        case "list":
            return (
                <Box>
                    <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>{block.title}</Typography>
                    <Stack spacing={0.5}>
                        {block.items.map((it, i) => (
                            <Stack key={i} direction="row" alignItems="flex-start" gap={1}>
                                <Box sx={{ width: 8, height: 8, borderRadius: "50%", mt: 0.75, flexShrink: 0, bgcolor: LEVEL_COLOR[it.level ?? ""] ?? "text.secondary" }} />
                                <Typography variant="body2">{it.text}</Typography>
                            </Stack>
                        ))}
                    </Stack>
                </Box>
            );
        case "link":
            return (
                <Box>
                    <Button variant="outlined" size="small" endIcon={<ArrowForwardRoundedIcon />} onClick={() => navigate(block.to)} sx={{ textTransform: "none" }}>
                        {block.label}
                    </Button>
                </Box>
            );
        default:
            return null;
    }
};

export const DisplayBlocks: FC<{ blocks: DisplayBlock[] }> = ({ blocks }) =>
    blocks.length === 0 ? null : (
        <Stack spacing={1.5} sx={{ mt: 1.5 }}>
            {blocks.map((b, i) => <Block key={i} block={b} />)}
        </Stack>
    );
