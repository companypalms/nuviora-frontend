// src/components/owner-panel/TeamTable.tsx
// Panel del dueño › Equipo: la tabla "uno por uno" de un rol, con cada KPI contra el período anterior. Las columnas y su
// explicación vienen del backend (Metrics\Team), así que sirve igual para cualquier rol, también los que se agreguen.
import React, { FC, useState } from "react";
import { Box, Chip, Table, TableBody, TableCell, TableHead, TableRow, TableSortLabel, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Explain } from "./Explain";
import { TeamColumn, TeamRow, TeamTable as TableData, TeamValues, formatValue, sortTeam, teamChange } from "./ownerPanel";

const oneDecimal = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 1 });

/** "▲ 5 pts" o "▼ 12 %", en verde si mejoró, rojo si empeoró y gris si todavía puede cambiar o no es ni bueno ni malo. */
export const TeamChange: FC<{ col: TeamColumn; value: number | null | undefined; before: number | null | undefined; maturing: boolean }> = ({ col, value, before, maturing }) => {
    const c = teamChange(col, value, before);
    if (c === null || c === 0) return null;
    const neutral = col.better === "none" || (col.matures && maturing);
    const good = col.better === "lower" ? c < 0 : c > 0;
    return (
        <Typography variant="caption" fontWeight={700} sx={{ color: neutral ? "text.secondary" : good ? "success.main" : "error.main", whiteSpace: "nowrap" }}>
            {c > 0 ? "▲" : "▼"} {oneDecimal.format(Math.abs(c))}{col.format === "percent" ? " pts" : " %"}
        </Typography>
    );
};

const Cell: FC<{ col: TeamColumn; values: TeamValues; previous: TeamValues | null | undefined; maturing: boolean; compareLabel: string; flagged: boolean; bold?: boolean }> = ({ col, values, previous, maturing, compareLabel, flagged, bold }) => {
    const v = values[col.key] ?? null;
    const before = previous?.[col.key];
    return (
        <TableCell align="right" title={previous && !col.now ? `${compareLabel}: ${formatValue(before ?? null, col.format)}` : undefined}
            sx={{ bgcolor: flagged ? (t) => alpha(t.palette.warning.main, 0.18) : undefined, verticalAlign: "top" }}>
            <Typography variant="body2" fontWeight={bold ? 800 : 600} sx={{ whiteSpace: "nowrap" }}>{formatValue(v, col.format)}</Typography>
            <Box sx={{ minHeight: 18 }}><TeamChange col={col} value={v} before={before} maturing={maturing} /></Box>
        </TableCell>
    );
};

export const TeamTable: FC<{
    data: TableData;
    maturing: boolean;
    compareLabel: string;
    totals?: TeamValues;
    totalsPrevious?: TeamValues;
    onOpen?: (row: TeamRow) => void;
}> = ({ data, maturing, compareLabel, totals, totalsPrevious, onOpen }) => {
    const [sortKey, setSortKey] = useState(data.rank_by);
    const [reverse, setReverse] = useState(false);
    const sortCol = data.columns.find((c) => c.key === sortKey) ?? data.columns[0];
    const sorted = sortTeam(data.rows, sortCol.key, sortCol.better);
    const rows = reverse ? [...sorted].reverse() : sorted;
    const sortBy = (key: string) => {
        if (key === sortKey) setReverse((r) => !r);
        else {
            setSortKey(key);
            setReverse(false);
        }
    };

    return (
        <Box sx={{ overflowX: "auto", mx: { xs: -1.5, sm: 0 } }}>
            <Table size="small" sx={{ minWidth: 640, "& td, & th": { px: 1.25 } }}>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ position: "sticky", left: 0, zIndex: 2, bgcolor: "background.paper", minWidth: 150 }}>Nombre</TableCell>
                        {data.columns.map((col) => (
                            <TableCell key={col.key} align="right" sx={{ verticalAlign: "bottom", minWidth: 96 }}>
                                <Explain title={col.label} help={col.help}>
                                    <TableSortLabel active={sortKey === col.key} direction={(col.better === "lower") !== reverse ? "asc" : "desc"}
                                        onClick={() => sortBy(col.key)} sx={{ cursor: "help", "& .MuiTableSortLabel-icon": { mx: 0.25 } }}>
                                        <Typography variant="caption" fontWeight={800} sx={{ lineHeight: 1.2 }}>{col.label}</Typography>
                                    </TableSortLabel>
                                </Explain>
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((r) => (
                        <TableRow key={r.id} hover={Boolean(onOpen)} onClick={onOpen ? () => onOpen(r) : undefined}
                            sx={{ cursor: onOpen ? "pointer" : undefined, opacity: r.low_data ? 0.6 : 1 }}>
                            <TableCell sx={{ position: "sticky", left: 0, zIndex: 1, bgcolor: "background.paper", verticalAlign: "top" }}>
                                <Typography variant="body2" fontWeight={700}>{r.name}</Typography>
                                {r.group && <Typography variant="caption" color="text.secondary" component="div">{r.group}</Typography>}
                                {r.low_data && <Chip size="small" variant="outlined" label="pocos datos" sx={{ mt: 0.5, height: 20, fontSize: 11 }} />}
                            </TableCell>
                            {data.columns.map((col) => (
                                <Cell key={col.key} col={col} values={r.values} previous={r.previous} maturing={maturing} compareLabel={compareLabel}
                                    flagged={r.flags.includes(col.key)} />
                            ))}
                        </TableRow>
                    ))}
                    {totals && (
                        <TableRow sx={{ "& td": { borderTop: "2px solid", borderTopColor: "divider", borderBottom: 0 } }}>
                            <TableCell sx={{ position: "sticky", left: 0, zIndex: 1, bgcolor: "background.paper" }}>
                                <Typography variant="body2" fontWeight={800}>Todos juntos</Typography>
                                <Typography variant="caption" color="text.secondary" component="div">Un pedido que pasó por dos personas cuenta una vez</Typography>
                            </TableCell>
                            {data.columns.map((col) => (
                                <Cell key={col.key} col={col} values={totals} previous={totalsPrevious} maturing={maturing} compareLabel={compareLabel} flagged={false} bold />
                            ))}
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </Box>
    );
};
