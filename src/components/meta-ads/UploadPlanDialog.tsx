// src/components/meta-ads/UploadPlanDialog.tsx
// .57 (2026-10-31): "Subir a Meta" de un batch en banca, en simulacro. Muestra exactamente lo que se va a crear (la
// campaña, el ad set que se copia, el nombre, un anuncio por pieza con su archivo de Drive, los textos y los parámetros de
// URL) y lo que lo impide. No escribe nada en Meta: subirlo de verdad llega en la .58.
import React, { useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import { CheckCircleRounded, ErrorOutlineRounded } from "@mui/icons-material";
import { api } from "./metaAds";

type Plan = {
    batch: { id: number; code: string | null; product: string; angle: string | null; city: string | null; reference: string | null };
    campaign: { meta_id: string; name: string; budget: number | null } | null;
    template_adset: { meta_id: string; name: string; optimization_goal: string | null } | null;
    adset_name: string | null;
    status: string;
    texts: { from: string | null; title: string | null; body: string | null; landing_url: string | null; url_tags: string } | null;
    ads: { code: string | null; name: string | null; format: string | null; hook: string | null; link: string | null; file_name?: string | null; file_ok: boolean; file_note: string | null; size_mb: number | null }[];
    problems: string[];
    warnings: string[];
    ready: boolean;
};

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <Box sx={{ display: "flex", gap: 1, py: 0.5, borderBottom: "1px solid", borderColor: "divider", "&:last-child": { borderBottom: 0 } }}>
        <Typography variant="body2" color="text.secondary" sx={{ width: { xs: 96, sm: 150 }, flexShrink: 0 }}>{label}</Typography>
        <Box sx={{ minWidth: 0, flex: 1 }}>{children}</Box>
    </Box>
);

export const UploadPlanDialog: React.FC<{ batchId: number; code: string | null; open: boolean; onClose: () => void }> = ({ batchId, code, open, onClose }) => {
    const [plan, setPlan] = useState<Plan | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setPlan(null);
        setError(null);
        api<{ plan: Plan }>(`/meta/queue/${batchId}/upload-plan`, "POST").then((r) => setPlan(r.plan)).catch((e) => setError((e as Error).message));
    }, [open, batchId]);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Subir {code ?? "el batch"} a Meta · simulacro</DialogTitle>
            <DialogContent>
                <Alert severity="info" sx={{ mb: 2 }}>
                    Esto es un <b>simulacro</b>: muestra lo que se va a crear, sin tocar Meta. Subirlo de verdad llega en la próxima versión.
                </Alert>
                {error && <Alert severity="error">{error}</Alert>}
                {!plan && !error && <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={28} /></Stack>}
                {plan && (
                    <Stack spacing={2}>
                        {plan.ready
                            ? <Alert icon={<CheckCircleRounded />} severity="success">Todo listo: así se subiría.</Alert>
                            : (
                                <Alert icon={<ErrorOutlineRounded />} severity="error">
                                    <b>Todavía no se puede subir:</b>
                                    {plan.problems.map((p, i) => <Typography key={i} variant="body2">• {p}</Typography>)}
                                </Alert>
                            )}
                        {plan.warnings.map((w, i) => <Alert key={i} severity="warning">{w}</Alert>)}
                        <Box>
                            <Row label="Campaña">
                                <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
                                    {plan.campaign ? plan.campaign.name : "—"}
                                    {plan.campaign?.budget != null && <Typography component="span" variant="caption" color="text.secondary"> · presupuesto de la campaña ${plan.campaign.budget.toFixed(2)}/día</Typography>}
                                </Typography>
                            </Row>
                            <Row label="Ad set nuevo">
                                <Typography variant="body2"><b>{plan.adset_name ?? "—"}</b>{plan.template_adset && <> · copia la configuración de <i>{plan.template_adset.name}</i></>} · sin presupuesto propio</Typography>
                            </Row>
                            <Row label="Estado">
                                <Typography variant="body2">{plan.status === "ACTIVE" ? "Encendidos" : "Pausados"}</Typography>
                            </Row>
                            {plan.texts && (
                                <>
                                    <Row label="Textos">
                                        {plan.texts.title && <Typography variant="body2" fontWeight={700}>{plan.texts.title}</Typography>}
                                        <Typography variant="body2" sx={{ whiteSpace: "pre-line", overflowWrap: "anywhere" }}>{plan.texts.body ?? "—"}</Typography>
                                        <Typography variant="caption" color="text.secondary">De {plan.texts.from}</Typography>
                                    </Row>
                                    <Row label="Landing">
                                        <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>{plan.texts.landing_url ?? "—"}</Typography>
                                    </Row>
                                    <Row label="Parámetros de URL">
                                        <Typography variant="caption" sx={{ overflowWrap: "anywhere", fontFamily: "monospace" }}>{plan.texts.url_tags}</Typography>
                                    </Row>
                                </>
                            )}
                        </Box>
                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Anuncios ({plan.ads.length})</Typography>
                            {plan.ads.map((a, i) => (
                                <Stack key={i} direction="row" spacing={1} alignItems="flex-start" sx={{ py: 0.5 }}>
                                    {a.file_ok ? <CheckCircleRounded color="success" fontSize="small" /> : <ErrorOutlineRounded color="error" fontSize="small" />}
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography variant="body2"><b>{a.name ?? a.code ?? "Pieza"}</b>{a.format ? ` · ${a.format}` : ""}{a.size_mb != null ? ` · ${a.size_mb} MB` : ""}</Typography>
                                        {a.file_name && <Typography variant="caption" component="div" color="text.secondary">Archivo en el sistema: {a.file_name}</Typography>}
                                        {a.hook && <Typography variant="caption" component="div" color="text.secondary">Hook: {a.hook}</Typography>}
                                        {a.file_note && <Typography variant="caption" component="div" color={a.file_ok ? "text.secondary" : "error.main"}>{a.file_note}</Typography>}
                                    </Box>
                                </Stack>
                            ))}
                        </Box>
                    </Stack>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cerrar</Button>
                <Button variant="contained" disabled>Subir (en la próxima versión)</Button>
            </DialogActions>
        </Dialog>
    );
};
