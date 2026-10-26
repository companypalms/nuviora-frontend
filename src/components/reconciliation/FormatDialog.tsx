// src/components/reconciliation/FormatDialog.tsx
// Confirmar qué columna del extracto es cada dato (documento de Fran del 2026-10-06, §17: "Los diferentes bancos y
// plataformas pueden entregar archivos con estructuras distintas. El sistema debe normalizar esos archivos…"). El
// sistema propone las columnas por su título; el administrador las confirma una vez y quedan guardadas para ese
// extracto. Los valores salen siempre del archivo: aquí no se escribe ningún monto ni referencia.
import React, { useState } from "react";
import {
    Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, Grid, InputLabel, MenuItem, Select,
    Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from "@mui/material";
import { longDate, money, plural } from "./reconciliation";

type Field = "date" | "reference" | "description" | "credit" | "debit" | "amount" | "type";
type Mode = "credit" | "signed" | "type";

export interface FormatProposal {
    header_row: number;
    columns: Partial<Record<Field, number>>;
    mode: Mode;
    headers: string[];
    counts: { movimientos: number; ingresos: number; egresos: number };
    date_from: string | null;
    date_to: string | null;
    sample: { line: number; date: string; reference: string | null; description: string | null; amount: number }[];
}

const MODES: Record<Mode, { label: string; fields: Field[] }> = {
    credit: { label: "Una columna de ingresos (crédito) y otra de egresos", fields: ["date", "reference", "description", "credit", "debit"] },
    signed: { label: "Una columna de monto: lo negativo es egreso", fields: ["date", "reference", "description", "amount"] },
    type: { label: "Una columna de monto y otra que dice si es crédito o débito", fields: ["date", "reference", "description", "amount", "type"] },
};

const LABELS: Record<Field, string> = {
    date: "Fecha",
    reference: "Referencia",
    description: "Descripción",
    credit: "Ingresos (crédito)",
    debit: "Egresos (débito)",
    amount: "Monto",
    type: "Tipo (crédito o débito)",
};

const REQUIRED: Field[] = ["date", "credit", "amount", "type"];

interface Props {
    source: string;
    proposal: FormatProposal;
    busy: boolean;
    onPreview: (format: Pick<FormatProposal, "header_row" | "columns" | "mode">) => void;
    onConfirm: (format: Pick<FormatProposal, "header_row" | "columns" | "mode">) => void;
    onClose: () => void;
}

export const FormatDialog: React.FC<Props> = ({ source, proposal, busy, onPreview, onConfirm, onClose }) => {
    const [mode, setMode] = useState<Mode>(proposal.mode);
    const [columns, setColumns] = useState<Partial<Record<Field, number>>>(proposal.columns);
    const fields = MODES[mode].fields;
    const format = { header_row: proposal.header_row, mode, columns: Object.fromEntries(fields.filter((f) => columns[f] !== undefined).map((f) => [f, columns[f]])) };
    const changed = JSON.stringify(format.columns) !== JSON.stringify(Object.fromEntries(fields.filter((f) => proposal.columns[f] !== undefined).map((f) => [f, proposal.columns[f]]))) || mode !== proposal.mode;
    const missing = fields.filter((f) => REQUIRED.includes(f) && columns[f] === undefined);

    return (
        <Dialog open onClose={busy ? undefined : onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontWeight: "bold" }}>Columnas del extracto de {source}</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Es la primera vez que se sube este formato. Revisa que cada dato esté en la columna correcta: queda guardado para los
                    próximos extractos de {source}.
                </Typography>

                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                    <InputLabel id="modo-label">Cómo vienen los montos</InputLabel>
                    <Select labelId="modo-label" label="Cómo vienen los montos" value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
                        {(Object.keys(MODES) as Mode[]).map((m) => (
                            <MenuItem key={m} value={m}>{MODES[m].label}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <Grid container spacing={1.5}>
                    {fields.map((f) => (
                        <Grid key={f} size={{ xs: 12, sm: 6, md: 4 }}>
                            <FormControl fullWidth size="small" error={REQUIRED.includes(f) && columns[f] === undefined}>
                                <InputLabel id={`col-${f}`}>{LABELS[f]}{REQUIRED.includes(f) ? " *" : ""}</InputLabel>
                                <Select
                                    labelId={`col-${f}`}
                                    label={`${LABELS[f]}${REQUIRED.includes(f) ? " *" : ""}`}
                                    value={columns[f] ?? ""}
                                    onChange={(e) => setColumns((c) => ({ ...c, [f]: String(e.target.value) === "" ? undefined : Number(e.target.value) }))}
                                >
                                    <MenuItem value=""><em>Ninguna</em></MenuItem>
                                    {proposal.headers.map((h, i) => h.trim() !== "" && (
                                        <MenuItem key={i} value={i}>{h}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    ))}
                </Grid>

                {changed ? (
                    <Alert severity="info" sx={{ mt: 2 }} action={
                        <Button color="inherit" size="small" disabled={busy || missing.length > 0} onClick={() => onPreview(format)}>Ver cómo queda</Button>
                    }>
                        Cambiaste las columnas: mira cómo queda antes de confirmar.
                    </Alert>
                ) : (
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="body2">
                            Encontramos {plural(proposal.counts.movimientos, "movimiento", "movimientos")}: {plural(proposal.counts.ingresos, "ingreso", "ingresos")} y{" "}
                            {plural(proposal.counts.egresos, "egreso", "egresos")}. Los egresos no se guardan.
                            {proposal.date_from && ` Fechas: del ${longDate(proposal.date_from)}${proposal.date_to && proposal.date_to !== proposal.date_from ? ` al ${longDate(proposal.date_to)}` : ""}.`}
                        </Typography>
                        {proposal.sample.length > 0 && (
                            <Box sx={{ overflowX: "auto", mt: 1 }}>
                                <Table size="small" aria-label="Primeros ingresos del archivo">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Fila</TableCell>
                                            <TableCell>Fecha</TableCell>
                                            <TableCell>Referencia</TableCell>
                                            <TableCell>Descripción</TableCell>
                                            <TableCell align="right">Monto</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {proposal.sample.map((r) => (
                                            <TableRow key={r.line}>
                                                <TableCell>{r.line}</TableCell>
                                                <TableCell sx={{ whiteSpace: "nowrap" }}>{longDate(r.date)}</TableCell>
                                                <TableCell>{r.reference ?? "—"}</TableCell>
                                                <TableCell>{r.description ?? "—"}</TableCell>
                                                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{money(r.amount, null)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Box>
                        )}
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} disabled={busy} color="inherit">Cancelar</Button>
                <Button variant="contained" disabled={busy || missing.length > 0 || changed} onClick={() => onConfirm(format)}>
                    Confirmar y subir
                </Button>
            </DialogActions>
        </Dialog>
    );
};
