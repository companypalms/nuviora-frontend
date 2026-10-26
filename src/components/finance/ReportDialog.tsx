// src/components/finance/ReportDialog.tsx
// Ver un reporte guardado (Módulo 4 de Fran, §53 a §58): sus cifras comparadas con el período anterior (§58), el estado
// (§20) y sus versiones. Consolidado no es congelado: si una entrega tardía cambió las cifras hay otra versión que dice
// qué cambió (§21), y las anteriores se siguen pudiendo abrir y bajar (§83).
import React, { useEffect, useState } from "react";
import {
    Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, MenuItem, Stack, TextField, Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import { PnlStatement } from "./PnlStatement";
import { StatusChip } from "./StatusNotes";
import { FinancialReportRow, ReportContent, ReportVersion, api, changeText, day, errorMessage, money, pct } from "./finance";

type Detail = { report: FinancialReportRow; version: ReportVersion; content: ReportContent; versions: ReportVersion[] };

const Kpi: React.FC<{ label: string; now: number | null; before: number | null; isPct?: boolean }> = ({ label, now, before, isPct }) => (
    <Box sx={{ p: 1.25, borderRadius: 2, border: 1, borderColor: "divider" }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="subtitle1" fontWeight={700}>{isPct ? pct(now) : money(now)}</Typography>
        <Typography variant="caption" color="text.secondary">antes: {isPct ? pct(before) : money(before)}</Typography>
    </Box>
);

export const ReportDialog: React.FC<{ reportId: number | null; onClose: () => void; onPdf: (id: number, version?: number) => void }> = ({ reportId, onClose, onPdf }) => {
    const [data, setData] = useState<Detail | null>(null);
    const [version, setVersion] = useState<number | null>(null);

    useEffect(() => {
        if (!reportId) { setData(null); setVersion(null); return; }
        let alive = true;
        api<Detail>(`/finance/reports/${reportId}${version ? `?version=${version}` : ""}`)
            .then((r) => { if (alive) setData(r); }).catch((e) => toast.error(errorMessage(e)));
        return () => { alive = false; };
    }, [reportId, version]);

    if (!reportId) return null;
    const c = data?.content.company;
    const p = data?.content.previous.company;

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>
                <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                    {data?.report.title ?? "Reporte"} {data && <StatusChip status={data.content.status} />}
                </Stack>
            </DialogTitle>
            <DialogContent dividers>
                {!data || !c || !p ? <Typography color="text.secondary">Cargando…</Typography> : (
                    <Stack spacing={2}>
                        <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} alignItems={{ sm: "center" }}>
                            <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                                Del {day(data.content.from)} al {day(data.content.to)}, comparado con el {day(data.content.previous.from)} al {day(data.content.previous.to)}.
                                {" "}Versión {data.version.version}: {data.version.reason.toLowerCase()} el {data.version.generated_at.replace(" ", " a las ")}.
                            </Typography>
                            {data.versions.length > 1 && (
                                <TextField select size="small" label="Versión" value={data.version.version} onChange={(e) => setVersion(Number(e.target.value))} sx={{ minWidth: 150 }}>
                                    {data.versions.map((v) => <MenuItem key={v.version} value={v.version}>v{v.version} · {v.generated_at.slice(0, 10)}</MenuItem>)}
                                </TextField>
                            )}
                        </Stack>
                        {data.version.changes && data.version.changes.length > 0 && (
                            <Alert severity="info">
                                <Typography variant="body2" fontWeight={600}>Qué cambió desde la versión {data.version.version - 1}</Typography>
                                {data.version.changes.map((ch) => <Typography key={ch.key} variant="body2">{changeText(ch)}</Typography>)}
                            </Alert>
                        )}
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 1.5 }}>
                            <Kpi label="Ingresos" now={c.revenue} before={p.revenue} />
                            <Kpi label="Beneficio operativo" now={c.operating_profit} before={p.operating_profit} />
                            <Kpi label="Margen de contribución" now={c.margin_pct} before={p.margin_pct} isPct />
                            <Kpi label="Publicidad" now={c.advertising} before={p.advertising} />
                        </Box>
                        <PnlStatement c={c} />
                        <Divider />
                        <Typography variant="body2">
                            Caja disponible al generarlo: <b>≈ {money(data.content.cash.available_usd)}</b> · en agencias ≈ {money(data.content.cash.agencies_usd)}
                            {" "}· por pagar ≈ {money(data.content.cash.payable_usd)} · transporte de inventario {money(data.content.transport.total_usd)}
                            {" "}· cierres pendientes {data.content.closures_pending.length}
                        </Typography>
                        {(data.content.status.reasons.length > 0 || data.content.warnings.length > 0) && (
                            <Alert severity="warning" variant="outlined">
                                {[...data.content.status.reasons, ...data.content.warnings].map((w) => <Typography key={w} variant="body2">{w}</Typography>)}
                            </Alert>
                        )}
                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Versiones</Typography>
                            {data.versions.map((v) => (
                                <Stack key={v.version} direction="row" gap={1} alignItems="center" flexWrap="wrap" sx={{ py: 0.25 }}>
                                    <Chip size="small" label={`v${v.version}`} variant={v.version === data.version.version ? "filled" : "outlined"} />
                                    <Typography variant="body2">{v.generated_at} · {v.reason}{v.generated_by ? ` (${v.generated_by})` : ""}</Typography>
                                    {v.whatsapp_sent_at && <Chip size="small" color="success" variant="outlined" label={`WhatsApp ${v.whatsapp_sent_at.slice(5, 16)}`} />}
                                    <Button size="small" onClick={() => onPdf(data.report.id, v.version)}>PDF</Button>
                                </Stack>
                            ))}
                        </Box>
                    </Stack>
                )}
            </DialogContent>
            <DialogActions>
                <Button color="inherit" onClick={onClose}>Cerrar</Button>
                {data && <Button variant="contained" onClick={() => onPdf(data.report.id, data.version.version)}>Ver PDF</Button>}
            </DialogActions>
        </Dialog>
    );
};
