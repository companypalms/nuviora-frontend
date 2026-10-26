// src/components/dashboard/admin/PendingTable.tsx
// Las listas del panel de pendientes: una tabla compacta con el encabezado fijo y un alto máximo (baja dentro de la
// tabla, no la página), y unos chips para filtrar por grupo (agencia, almacén, ciudad).
import React, { ReactNode } from "react";
import { Box, Chip, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";

/** hideOnMobile: la columna no se muestra en pantallas angostas (el teléfono), para que la tabla quepa. */
export type Column<T> = { key: string; label: string; align?: "left" | "right"; width?: number | string; hideOnMobile?: boolean; render: (row: T) => ReactNode };

const cellDisplay = (c: { hideOnMobile?: boolean }) => (c.hideOnMobile ? { xs: "none", sm: "table-cell" } : undefined);

export function PendingTable<T>({ rows, columns, rowKey, onRowClick, rowLabel, maxHeight = 420, empty = "Nada pendiente." }: {
    rows: T[];
    columns: Column<T>[];
    rowKey: (row: T, index: number) => string | number;
    onRowClick?: (row: T) => void;
    /** Para el lector de pantalla, en las filas que se abren con un clic */
    rowLabel?: (row: T) => string;
    maxHeight?: number;
    empty?: string;
}) {
    if (rows.length === 0) {
        return <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>{empty}</Typography>;
    }
    return (
        <TableContainer sx={{ maxHeight, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
            <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow>
                        {columns.map((c) => (
                            <TableCell key={c.key} align={c.align} sx={{ display: cellDisplay(c), width: c.width, fontWeight: 600, color: "text.secondary", bgcolor: "background.paper", whiteSpace: "nowrap" }}>
                                {c.label}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((r, i) => (
                        <TableRow
                            key={rowKey(r, i)}
                            hover={!!onRowClick}
                            onClick={onRowClick ? () => onRowClick(r) : undefined}
                            onKeyDown={onRowClick ? (e) => { if (e.key === "Enter") onRowClick(r); } : undefined}
                            tabIndex={onRowClick ? 0 : undefined}
                            aria-label={rowLabel?.(r)}
                            sx={{ cursor: onRowClick ? "pointer" : "default", "&:last-child td": { borderBottom: 0 }, "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: -2 } }}
                        >
                            {columns.map((c) => (
                                <TableCell key={c.key} align={c.align} sx={{ display: cellDisplay(c), py: 0.9 }}>{c.render(r)}</TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

export type Group = { key: string; label: string; count: number };

/** "Todas (63) · Rapi2 (25) · PYP (20)…": filtra la tabla por grupo. */
export const GroupChips: React.FC<{ groups: Group[]; value: string; onChange: (key: string) => void; allLabel?: string }> = ({ groups, value, onChange, allLabel = "Todas" }) => {
    if (groups.length < 2) return null;
    const total = groups.reduce((s, g) => s + g.count, 0);
    const chip = (key: string, label: string, count: number) => (
        <Chip
            key={key}
            size="small"
            label={`${label} · ${count}`}
            color={value === key ? "primary" : "default"}
            variant={value === key ? "filled" : "outlined"}
            onClick={() => onChange(key)}
            aria-pressed={value === key}
        />
    );
    return (
        <Box sx={{ overflowX: "auto", pb: 0.5, mb: 1 }}>
            <Stack direction="row" gap={0.75} sx={{ width: "max-content" }}>
                {chip("", allLabel, total)}
                {groups.map((g) => chip(g.key, g.label, g.count))}
            </Stack>
        </Box>
    );
};
