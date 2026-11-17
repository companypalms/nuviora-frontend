// src/components/meta-ads/AutoUpload.tsx
// .155 (dueño, 2026-11-17: "que me aparezcan en mis misiones diarias, yo le doy un botón de aprobar y él los suba
// automáticamente en meta ads"): en una misión que lanza batches de la banca en campañas que ya corren, el botón "Aprobar y
// subir". Primero muestra lo que se va a crear (la campaña, el ad set que se copia, el gasto mínimo, un anuncio por pieza con
// su archivo y el texto) y lo que lo impide; al aprobar, el sistema lo sube solo y la misión muestra cómo va.
// Las primeras 5 subidas quedan en pausa: el dueño las revisa en el Administrador y las prende.
import React, { useContext, useEffect, useState } from "react";
import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import { CloudUploadRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { api } from "./metaAds";
import { cardSx, inkSx, lineSx, plural, tapSx, useTokens } from "../ui/design";
import { Dot } from "../ui/designParts";
import { OPEN, UploadsContext } from "./autoUploadState";

type Plan = {
    batch: { id: number; code: string | null; product: string; angle: string | null };
    campaign: { meta_id: string; name: string; budget: number | null } | null;
    account: { name: string | null; connection: string | null; can_upload: boolean | null } | null;
    template_adset: { name: string } | null;
    adset_name: string | null;
    min_spend: number | null;
    paused: boolean | null;
    texts: { from: string | null; title: string | null; body: string | null; landing_url: string | null } | null;
    ads: { code: string | null; name: string | null; type: "video" | "image"; file_name?: string | null; file_ok: boolean; file_note: string | null; size_mb: number | null }[];
    problems: string[];
    warnings: string[];
    ready: boolean;
};

const money = (n: number) => `$${n.toFixed(2)}`;

/** En la misión: el botón o, si ya se aprobó, cómo va cada subida (con "Reintentar" si falló). */
export const AutoUpload: React.FC<{ itemKey: string; targets?: { code: string; campaign: string; min: number | null }[]; done?: boolean }> = ({ itemKey, targets, done }) => {
    const t = useTokens();
    const { on, analysisId, uploads, refresh } = useContext(UploadsContext);
    const [dialog, setDialog] = useState(false);
    const [busy, setBusy] = useState<number | null>(null);
    if (!targets?.length || analysisId === null) return null;
    const mine = uploads.filter((u) => u.key === itemKey);
    // Se aprueba una vez; si falla, "Reintentar" sigue donde se quedó
    const canApprove = on && !done && mine.length === 0;

    const retry = async (id: number) => {
        setBusy(id);
        try {
            await api(`/meta/uploads/${id}/retry`, "POST");
            refresh();
        } catch (e) {
            toast.error((e as Error).message);
        } finally {
            setBusy(null);
        }
    };

    if (mine.length === 0 && !canApprove) return null;
    return (
        <Box sx={{ mt: 1.5 }}>
            {mine.map((u) => {
                const color = u.status === "failed" ? t.red : u.status === "done" ? (u.paused ? t.amber : t.green) : t.faint;
                return (
                    <Box key={u.id} role="status" aria-live="polite" sx={{ display: "flex", gap: 1, alignItems: "flex-start", p: "8px 10px", mb: 0.75, borderRadius: "8px", border: `1px solid ${t.line}` }}>
                        <Box sx={{ mt: "5px", display: "flex" }}>
                            {OPEN.includes(u.status) ? <CircularProgress size={10} thickness={6} sx={{ color: t.muted }} aria-hidden /> : <Dot color={color} size={8} />}
                        </Box>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.ink, overflowWrap: "anywhere" }}>
                                {u.adset ?? u.batch} → {u.campaign}
                            </Typography>
                            <Typography sx={{ fontSize: 13, color: u.status === "failed" ? t.red : t.muted, overflowWrap: "anywhere", lineHeight: 1.5 }}>{u.text}</Typography>
                            {u.can_retry && on && (
                                <Button variant="outlined" size="small" onClick={() => retry(u.id)} disabled={busy === u.id} sx={{ ...lineSx(t), ...tapSx, mt: 1 }}>
                                    {busy === u.id ? "Reintentando…" : "Reintentar"}
                                </Button>
                            )}
                        </Box>
                    </Box>
                );
            })}
            {canApprove && (
                <Button variant="contained" disableElevation startIcon={<CloudUploadRounded />} onClick={() => setDialog(true)} sx={{ ...inkSx(t), ...tapSx }}>
                    Aprobar y subir
                </Button>
            )}
            {dialog && <ApproveDialog analysisId={analysisId} itemKey={itemKey} onClose={() => setDialog(false)} onDone={() => { setDialog(false); refresh(); }} />}
        </Box>
    );
};

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => {
    const t = useTokens();
    return (
        <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: { xs: 0.25, sm: 1.5 }, py: 0.75, borderBottom: `1px solid ${t.line}`, "&:last-child": { borderBottom: 0 } }}>
            <Typography sx={{ fontSize: 13, color: t.muted, width: { sm: 130 }, flexShrink: 0 }}>{label}</Typography>
            <Box sx={{ minWidth: 0, flex: 1, fontSize: 14 }}>{children}</Box>
        </Box>
    );
};

/** Lo que se va a crear, batch por batch; "Aprobar y subir" solo si a ninguno le falta nada. */
const ApproveDialog: React.FC<{ analysisId: number; itemKey: string; onClose: () => void; onDone: () => void }> = ({ analysisId, itemKey, onClose, onDone }) => {
    const t = useTokens();
    const theme = useTheme();
    const phone = useMediaQuery(theme.breakpoints.down("sm"));
    const [plans, setPlans] = useState<Plan[] | null>(null);
    const [error, setError] = useState<string[] | null>(null);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        api<{ on: boolean; plans: Plan[] }>("/meta/uploads/plan", "POST", { analysis_id: analysisId, key: itemKey })
            .then((r) => setPlans(r.plans)).catch((e) => setError([(e as Error).message]));
    }, [analysisId, itemKey]);

    const ready = !!plans?.length && plans.every((p) => p.ready);
    const approve = async () => {
        setSending(true);
        setError(null);
        try {
            await api("/meta/uploads", "POST", { analysis_id: analysisId, key: itemKey });
            toast.success(plans && plans.length > 1 ? "Aprobado: se están subiendo." : "Aprobado: se está subiendo.");
            onDone();
        } catch (e) {
            const errs = (e as { errors?: Record<string, string[] | string> }).errors?.upload;
            setError(errs ? ([] as string[]).concat(errs) : [(e as Error).message]);
        } finally {
            setSending(false);
        }
    };

    return (
        <Dialog open onClose={sending ? undefined : onClose} fullWidth maxWidth="sm" fullScreen={phone} aria-labelledby="aprobar-subir">
            <DialogTitle id="aprobar-subir" sx={{ fontWeight: 600 }}>Aprobar y subir a Meta</DialogTitle>
            <DialogContent>
                {!plans && !error && <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={26} sx={{ color: t.muted }} /></Stack>}
                {error && (
                    <Box role="alert" sx={{ p: "10px 12px", borderRadius: "8px", border: `1px solid ${t.red}`, mb: 2 }}>
                        {error.map((m, i) => <Typography key={i} sx={{ fontSize: 14, color: t.red, overflowWrap: "anywhere" }}>{m}</Typography>)}
                    </Box>
                )}
                {plans?.map((p) => (
                    <Box key={`${p.batch.id}-${p.campaign?.meta_id}`} sx={{ ...cardSx(t), p: "12px 14px", mb: 1.5 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                            <Dot color={p.ready ? t.green : t.red} size={8} />
                            <Typography sx={{ fontSize: 15, fontWeight: 600, overflowWrap: "anywhere" }}>{p.adset_name ?? p.batch.code}</Typography>
                        </Stack>
                        {p.problems.length > 0 && (
                            <Box sx={{ mb: 1 }}>
                                <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.red }}>Así no se puede subir:</Typography>
                                {p.problems.map((m, i) => <Typography key={i} sx={{ fontSize: 13, color: t.red, overflowWrap: "anywhere" }}>• {m}</Typography>)}
                            </Box>
                        )}
                        <Row label="Campaña"><Typography sx={{ fontSize: 14, overflowWrap: "anywhere" }}>{p.campaign?.name ?? "—"}{p.account?.name ? <Box component="span" sx={{ color: t.muted }}> · cuenta {p.account.name}</Box> : null}</Typography></Row>
                        <Row label="Ad set nuevo">
                            <Typography sx={{ fontSize: 14, overflowWrap: "anywhere" }}>
                                <b>{p.adset_name ?? "—"}</b>{p.template_adset ? <> · copia la configuración de «{p.template_adset.name}»</> : null}
                            </Typography>
                            <Typography sx={{ fontSize: 13, color: t.muted }}>
                                {p.min_spend != null ? `Gasto mínimo ${money(p.min_spend)} por día` : "Sin gasto mínimo"} · sin presupuesto propio (lo reparte la campaña)
                            </Typography>
                        </Row>
                        <Row label={plural(p.ads.length, "anuncio", "anuncios")}>
                            {p.ads.map((a, i) => (
                                <Typography key={i} sx={{ fontSize: 14, overflowWrap: "anywhere", color: a.file_ok ? t.ink : t.red }}>
                                    {a.name ?? a.code} · {a.type === "image" ? "imagen" : "video"}{a.size_mb != null ? ` · ${a.size_mb} MB` : ""}{a.file_note ? ` · ${a.file_note}` : ""}
                                </Typography>
                            ))}
                        </Row>
                        {p.texts && (
                            <Row label="Texto">
                                {p.texts.title && <Typography sx={{ fontSize: 14, fontWeight: 600, overflowWrap: "anywhere" }}>{p.texts.title}</Typography>}
                                <Typography sx={{ fontSize: 14, whiteSpace: "pre-line", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                    {p.texts.body ?? "—"}
                                </Typography>
                                <Typography sx={{ fontSize: 13, color: t.muted, overflowWrap: "anywhere" }}>
                                    Lleva a {p.texts.landing_url ?? "—"} · copiado de {p.texts.from}
                                </Typography>
                            </Row>
                        )}
                        {p.warnings.map((w, i) => (
                            <Typography key={i} sx={{ fontSize: 13, color: w.includes("EN PAUSA") ? t.ink : t.muted, fontWeight: w.includes("EN PAUSA") ? 600 : 400, mt: 1, overflowWrap: "anywhere" }}>{w}</Typography>
                        ))}
                    </Box>
                ))}
                {plans && (
                    <Typography sx={{ fontSize: 13, color: t.muted }}>
                        El sistema solo crea: nunca borra nada en Meta ni cambia el presupuesto de la campaña. Si algo falla, lo creado queda apagado y puedes reintentar.
                    </Typography>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, gap: 1, flexWrap: "wrap" }}>
                <Button onClick={onClose} disabled={sending} variant="outlined" sx={{ ...lineSx(t), ...tapSx }}>Cancelar</Button>
                <Button onClick={approve} disabled={!ready || sending} variant="contained" disableElevation startIcon={sending ? <CircularProgress size={16} sx={{ color: "inherit" }} /> : <CloudUploadRounded />}
                    sx={{ ...inkSx(t), ...tapSx }}>
                    {sending ? "Aprobando…" : "Aprobar y subir"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
