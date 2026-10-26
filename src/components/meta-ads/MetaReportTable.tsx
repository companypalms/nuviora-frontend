// src/components/meta-ads/MetaReportTable.tsx
// §29: bajar de producto → ciudad a campaña → ad set → anuncio/creativo. Lo inactivo se marca (§42) y muestra su
// último estado conocido (§43). En los anuncios se ve y se corrige el Creative Tracking ID (§32).
import React, { useState } from "react";
import {
    Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Link, Table, TableBody, TableCell,
    TableHead, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import { EditRounded } from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { toast } from "react-toastify";
import { COLUMNS, CREATIVE_STATUS, ReportRow, api } from "./metaAds";
import { MetricCell, RuleChips } from "./MetaWidgets";

const STATUS_LABEL: Record<string, string> = {
    ACTIVE: "Activa", PAUSED: "Pausada", ARCHIVED: "Archivada", DELETED: "Eliminada", CAMPAIGN_PAUSED: "Campaña pausada",
    ADSET_PAUSED: "Ad set pausado", IN_PROCESS: "En proceso", WITH_ISSUES: "Con problemas", PENDING_REVIEW: "En revisión",
    DISAPPROVED: "Rechazada", PREAPPROVED: "Preaprobada", PENDING_BILLING_INFO: "Falta facturación",
};

const TrackingIdDialog: React.FC<{ row: ReportRow | null; onClose: () => void; onSaved: () => void }> = ({ row, onClose, onSaved }) => {
    const [value, setValue] = useState("");
    React.useEffect(() => { setValue(row?.tracking_id_source === "manual" ? row.creative_tracking_id ?? "" : row?.creative_tracking_id ?? ""); }, [row]);
    const save = async (v: string) => {
        try {
            await api(`/meta/ads/${row!.id}/tracking-id`, "PUT", { creative_tracking_id: v });
            toast.success(v ? "Creative Tracking ID guardado" : "Se vuelve a detectar por el nombre");
            onSaved();
        } catch (e) { toast.error((e as Error).message); }
    };
    return (
        <Dialog open={row !== null} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Creative Tracking ID</DialogTitle>
            <DialogContent>
                <Typography variant="body2" sx={{ mb: 2 }}>Anuncio «{row?.name}». Si lo pones a mano, la sincronización no lo cambia.</Typography>
                <TextField label="Creative Tracking ID" value={value} onChange={(e) => setValue(e.target.value)} fullWidth autoFocus placeholder="C004" />
            </DialogContent>
            <DialogActions>
                {row?.tracking_id_source === "manual" && <Button onClick={() => save("")}>Volver a detectar</Button>}
                <Button onClick={onClose}>Cancelar</Button>
                <Button variant="contained" disabled={!value.trim()} onClick={() => save(value.trim())}>Guardar</Button>
            </DialogActions>
        </Dialog>
    );
};

export const MetaReportTable: React.FC<{
    rows: ReportRow[];
    level: ReportRow["level"];
    canSeeSpend: boolean;
    onOpen?: (row: ReportRow) => void;
    onChanged?: () => void;
}> = ({ rows, level, canSeeSpend, onOpen, onChanged }) => {
    const [editing, setEditing] = useState<ReportRow | null>(null);
    const anyVideo = level === "creative" ? rows.some((r) => r.type !== "image") : level === "ad" ? rows.some((r) => r.creative_type !== "image") : true;
    const cols = COLUMNS.filter((c) => (canSeeSpend || !c.financial) && (anyVideo || !c.video));

    if (rows.length === 0) return <Typography sx={{ p: 2 }} color="text.secondary">No hay nada con estos filtros.</Typography>;

    return (
        <Box sx={{ overflowX: "auto" }}>
            <Table size="small" sx={{ "& td, & th": { px: 1 } }}>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ minWidth: 220 }}>{{ campaign: "Campaña", adset: "Ad set", ad: "Anuncio", creative: "Creativo" }[level]}</TableCell>
                        {cols.map((c) => <TableCell key={c.key} align="right">{c.label}</TableCell>)}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((r) => {
                        const isVideoRow = level === "creative" ? r.type !== "image" : level === "ad" ? r.creative_type !== "image" : true;
                        return (
                            <TableRow key={`${r.level}-${r.id}`} hover sx={{ opacity: r.active === false ? 0.6 : 1 }}>
                                <TableCell>
                                    {onOpen ? (
                                        <Link component="button" variant="body2" fontWeight="bold" textAlign="left" onClick={() => onOpen(r)}>{r.name ?? r.meta_id}</Link>
                                    ) : <Typography variant="body2" fontWeight="bold">{r.name ?? r.meta_id}</Typography>}
                                    <Typography variant="caption" color="text.secondary" component="div">
                                        {[r.account, level === "campaign" ? (r.product ? `${r.product} / ${r.city}` : "Sin clasificar") : r.campaign,
                                            r.effective_status ? STATUS_LABEL[r.effective_status] ?? r.effective_status : null,
                                            r.missing_since ? `ya no está en Meta (último estado: ${STATUS_LABEL[r.last_known_state ?? ""] ?? r.last_known_state ?? "—"})` : null,
                                            level === "creative" ? `${r.ads} anuncios · ${r.accounts} cuentas · ${r.type === "image" ? "imagen" : r.type === "video" ? "video" : r.type ?? "—"}` : null,
                                        ].filter(Boolean).join(" · ")}
                                    </Typography>
                                    {level === "ad" && (
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                            <Typography variant="caption">Creativo:</Typography>
                                            {r.creative_id ? (
                                                <Link component={RouterLink} to={`/meta-ads/creativos/${r.creative_id}`} variant="caption" fontWeight="bold">{r.creative_tracking_id}</Link>
                                            ) : <Typography variant="caption" color="warning.main">sin ID</Typography>}
                                            {r.tracking_id_source === "manual" && <Chip size="small" label="a mano" sx={{ height: 18 }} />}
                                            <Tooltip title="Corregir el Creative Tracking ID"><IconButton size="small" aria-label="Corregir el Creative Tracking ID" onClick={() => setEditing(r)}><EditRounded sx={{ fontSize: 14 }} /></IconButton></Tooltip>
                                        </Box>
                                    )}
                                    {level === "creative" && r.status && <Chip size="small" label={CREATIVE_STATUS[r.status] ?? r.status} sx={{ mt: 0.5 }} />}
                                    <RuleChips rules={r.signals.rules} />
                                </TableCell>
                                {cols.map((c) => (
                                    <TableCell key={c.key} align="right">
                                        {c.video && !isVideoRow ? <Typography variant="body2" color="text.disabled">—</Typography> : <MetricCell node={r} col={c} />}
                                    </TableCell>
                                ))}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
            <TrackingIdDialog row={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChanged?.(); }} />
        </Box>
    );
};
