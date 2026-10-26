// src/components/orders/receipt-checks/ReceiptCheckViews.tsx
// Lo que se ve de la revisión con IA: una marca sobre cada comprobante y, debajo, el detalle con el motivo
// (Fran, 2026-10-03). La agencia también lo ve, para pedir otra foto si no se lee.
import React, { useState } from "react";
import {
    Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography,
} from "@mui/material";
import { CheckCircleRounded, ErrorRounded, HelpRounded, RefreshRounded, VisibilityOffRounded, WarningRounded } from "@mui/icons-material";
import moment from "moment";
import { toast } from "react-toastify";
import { request } from "../../../common/request";
import { useUserStore } from "../../../store/user/UserStore";
import { ReceiptCheckStatus, ReceiptCheckView, statusMeta } from "./receiptChecks";

const ICON: Record<ReceiptCheckStatus, React.ReactElement> = {
    pending: <CircularProgress size={14} color="inherit" />,
    ok: <CheckCircleRounded fontSize="small" />,
    warning: <WarningRounded fontSize="small" />,
    fail: <ErrorRounded fontSize="small" />,
    unreadable: <VisibilityOffRounded fontSize="small" />,
    error: <HelpRounded fontSize="small" />,
};

/** Marca pequeña sobre la miniatura del comprobante. */
export const ReceiptCheckChip: React.FC<{ check?: ReceiptCheckView }> = ({ check }) => {
    if (!check) return null;
    const meta = statusMeta(check);
    const label = check.approved ? "Aprobado" : meta.short;
    return (
        <Chip
            size="small"
            icon={check.approved ? <CheckCircleRounded fontSize="small" /> : ICON[check.status]}
            label={label}
            color={check.approved ? "success" : meta.color}
            sx={{ position: "absolute", left: 6, bottom: 6, zIndex: 2, fontWeight: 700, height: 22, "& .MuiChip-label": { px: 0.75 } }}
        />
    );
};

const fmtSummary = (s: Record<string, string | number>) => {
    const parts: string[] = [];
    if (s.monto !== undefined) {
        const n = Number(s.monto);
        parts.push(s.moneda === "VES" ? `Bs. ${n.toLocaleString("es-VE", { minimumFractionDigits: 2 })}` : `${s.moneda ?? ""} ${n.toFixed(2)}`.trim());
    }
    if (s.banco) parts.push(String(s.banco));
    if (s.referencia) parts.push(`Ref. ${s.referencia}`);
    if (s.fecha) parts.push(moment(String(s.fecha)).format("DD/MM/YYYY") + (s.hora ? ` ${s.hora}` : ""));
    return parts.join(" · ");
};

interface PanelProps {
    orderId: number;
    receiptIds: (number | undefined)[];
    checks: ReceiptCheckView[];
    block: string | null;
    mode: string;
    onChanged: () => void;
}

/** El detalle de la revisión de cada comprobante, con el motivo, y lo que Fran puede hacer. */
export const ReceiptChecksPanel: React.FC<PanelProps> = ({ orderId, receiptIds, checks, block, mode, onChanged }) => {
    const role = useUserStore((s) => s.user.role?.description ?? "");
    const canApprove = ["Admin", "Gerente", "Master"].includes(role);
    const [approving, setApproving] = useState<ReceiptCheckView | null>(null);
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    if (mode === "off" || checks.length === 0) return null;

    const post = async (url: string, body?: object) => {
        setBusy(true);
        try {
            const { status, response } = await request(url, "POST", body ?? {});
            const data = await response.json().catch(() => null);
            if (status === 200) {
                toast.success(data?.message ?? "Listo");
                onChanged();
                return true;
            }
            toast.error(data?.message ?? "No se pudo guardar");
        } catch {
            toast.error("Error de conexión");
        } finally {
            setBusy(false);
        }
        return false;
    };

    const ordered = receiptIds
        .map((id, i) => ({ index: i + 1, check: checks.find((c) => c.payment_receipt_id === id) }))
        .filter((x): x is { index: number; check: ReceiptCheckView } => !!x.check);

    return (
        <Box sx={{ mt: 1, mb: 1 }} aria-live="polite">
            {block && (
                <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2 }}>
                    {block}
                </Alert>
            )}
            {mode === "observe" && canApprove && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    Revisión automática en modo observación: avisa, pero todavía no bloquea la entrega.
                </Typography>
            )}
            <Stack spacing={1}>
                {ordered.map(({ index, check }) => {
                    const meta = statusMeta(check);
                    const severity = check.approved ? "success" : meta.color === "default" ? "info" : meta.color;
                    const summary = fmtSummary(check.summary ?? {});
                    return (
                        <Alert
                            key={check.id}
                            severity={severity}
                            icon={check.approved ? <CheckCircleRounded /> : ICON[check.status]}
                            sx={{ borderRadius: 2, "& .MuiAlert-message": { width: "100%" } }}
                        >
                            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
                                <Typography variant="body2" fontWeight={700} sx={{ flex: 1, minWidth: 180 }}>
                                    Comprobante {index}
                                    {check.kind_label && check.status !== "pending" ? ` · ${check.kind_label}` : ""}
                                    {" · "}
                                    {check.approved ? "Aprobado a mano" : meta.label}
                                </Typography>
                                {canApprove && !check.approved && ["fail", "unreadable", "warning", "error"].includes(check.status) && (
                                    <Button size="small" color="inherit" variant="outlined" disabled={busy} onClick={() => { setApproving(check); setNote(""); }} sx={{ textTransform: "none" }}>
                                        Aprobar
                                    </Button>
                                )}
                                {check.status === "error" && (
                                    <Button
                                        size="small"
                                        color="inherit"
                                        startIcon={<RefreshRounded />}
                                        disabled={busy}
                                        onClick={() => post(`/orders/${orderId}/receipt-checks/${check.id}/retry`)}
                                        sx={{ textTransform: "none" }}
                                    >
                                        Revisar otra vez
                                    </Button>
                                )}
                            </Box>
                            {check.error && <Typography variant="body2">{check.error}</Typography>}
                            {check.issues.length > 0 && (
                                <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
                                    {check.issues.map((issue, i) => (
                                        <Typography component="li" variant="body2" key={i} fontWeight={issue.level === "fail" ? 600 : 400}>
                                            {issue.text}
                                        </Typography>
                                    ))}
                                </Box>
                            )}
                            {summary && !["pending", "unreadable"].includes(check.status) && (
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                    Leído: {summary}
                                </Typography>
                            )}
                            {check.approved && (
                                <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                    Aprobado por {check.approved_by ?? "administración"}
                                    {check.approved_at ? ` el ${moment(check.approved_at).format("DD/MM hh:mm A")}` : ""}
                                    {check.review_note ? `: ${check.review_note}` : ""}
                                </Typography>
                            )}
                        </Alert>
                    );
                })}
            </Stack>

            <Dialog open={!!approving} onClose={() => setApproving(null)} fullWidth maxWidth="xs">
                <DialogTitle>Aprobar el comprobante</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Úsalo cuando verificaste el pago por tu cuenta (por ejemplo, en el banco). Ya no va a bloquear la entrega y queda una nota en la orden.
                    </Typography>
                    <TextField autoFocus fullWidth multiline minRows={2} label="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} inputProps={{ maxLength: 300 }} />
                </DialogContent>
                <DialogActions>
                    <Button color="inherit" onClick={() => setApproving(null)}>Cancelar</Button>
                    <Button
                        variant="contained"
                        color="success"
                        disabled={busy}
                        onClick={async () => {
                            if (approving && (await post(`/orders/${orderId}/receipt-checks/${approving.id}/approve`, { note: note.trim() || null }))) setApproving(null);
                        }}
                    >
                        Aprobar
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
