// src/components/owner-panel/AiInsights.tsx
// Panel del dueño › Pérdidas: el análisis con IA de los motivos de cancelación (pedido del dueño, 2026-10-29). Se pide
// solo al entrar a la sección o al cambiar los filtros, no cada 2 minutos; el servidor lo guarda si no cambiaron los
// motivos. En la PC de pruebas no hay IA conectada: se ve un ejemplo.
import React, { FC, useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Chip, LinearProgress, Stack, Typography } from "@mui/material";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { Panel } from "../ui/surface/Panel";
import { Filters, InsightsResponse, count, fetchInsights } from "./ownerPanel";

const SEVERITY = { alta: { label: "Grave", color: "error" }, media: { label: "Importante", color: "warning" }, baja: { label: "Leve", color: "default" } } as const;
const IMPACT = { alto: { label: "Impacto alto", color: "success" }, medio: { label: "Impacto medio", color: "info" }, bajo: { label: "Impacto bajo", color: "default" } } as const;

const when = (ymdHm?: string) => (ymdHm ? `el ${ymdHm.slice(8, 10)}/${ymdHm.slice(5, 7)} a las ${ymdHm.slice(11, 16)}` : "");

export const AiInsights: FC<{ filters: Filters; ready: boolean }> = ({ filters, ready }) => {
    const [data, setData] = useState<InsightsResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback((force: boolean) => {
        setLoading(true);
        setError(null);
        return fetchInsights(filters, force)
            .then(setData)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [filters]);

    useEffect(() => {
        if (!ready) return;
        let alive = true;
        setLoading(true);
        setError(null);
        fetchInsights(filters)
            .then((r) => { if (alive) setData(r); })
            .catch((e) => { if (alive) setError(e.message); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [filters, ready]);

    const a = data?.status === "ok" ? data.analysis : undefined;

    return (
        <Panel sx={{ borderColor: "primary.main" }}>
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1} flexWrap="wrap" sx={{ mb: 1.5 }}>
                <Stack direction="row" gap={1} alignItems="flex-start">
                    <AutoAwesomeRoundedIcon color="primary" sx={{ mt: 0.25 }} />
                    <Box>
                        <Typography variant="subtitle1" component="h2" fontWeight={800}>Análisis de la IA</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Lee los motivos que escribieron al cancelar y te dice qué está pasando, qué mejorar y cómo.
                        </Typography>
                    </Box>
                </Stack>
                <Button size="small" startIcon={<RefreshRoundedIcon />} disabled={loading || !ready} onClick={() => load(true)} sx={{ textTransform: "none" }}>
                    Volver a analizar
                </Button>
            </Stack>

            {loading && (
                <Box sx={{ py: 2 }}>
                    <LinearProgress />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        La IA está leyendo los motivos… puede tardar hasta un minuto.
                    </Typography>
                </Box>
            )}

            {!loading && error && <Alert severity="error">{error}</Alert>}
            {!loading && data && data.status !== "ok" && (
                <Alert severity={data.status === "error" ? "error" : "info"}>{data.message}</Alert>
            )}

            {!loading && a && (
                <Stack spacing={2}>
                    {data?.example && (
                        <Alert severity="info" variant="outlined">
                            <b>Esto es un ejemplo.</b> En tu PC no hay IA conectada. Cuando se publique, aquí vas a ver el análisis real de los
                            motivos de tus vendedoras.
                        </Alert>
                    )}
                    <Typography variant="body1">{a.resumen}</Typography>

                    {a.hallazgos.length > 0 && (
                        <Box>
                            <Typography variant="body2" fontWeight={800} sx={{ mb: 1 }}>Lo que está pasando</Typography>
                            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" }, gap: 1 }}>
                                {a.hallazgos.map((h, i) => (
                                    <Box key={i} sx={{ p: 1.5, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                                        <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.5 }}>
                                            <Chip size="small" label={SEVERITY[h.gravedad]?.label ?? h.gravedad} color={SEVERITY[h.gravedad]?.color ?? "default"} />
                                            <Typography variant="body2" fontWeight={700}>{h.titulo}</Typography>
                                        </Stack>
                                        <Typography variant="body2" color="text.secondary">{h.detalle}</Typography>
                                        {h.pedidos_aprox > 0 && (
                                            <Typography variant="caption" color="text.secondary">Unos {count(h.pedidos_aprox)} pedidos</Typography>
                                        )}
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    )}

                    {a.mejoras.length > 0 && (
                        <Box>
                            <Typography variant="body2" fontWeight={800} sx={{ mb: 1 }}>Qué hacer</Typography>
                            <Stack spacing={1.25}>
                                {a.mejoras.map((m, i) => (
                                    <Stack key={i} direction="row" gap={1.5} alignItems="flex-start">
                                        <Box sx={{ width: 24, height: 24, borderRadius: "50%", bgcolor: "primary.main", color: "#fff", display: "grid", placeItems: "center", flexShrink: 0, fontSize: 13, fontWeight: 700 }}>
                                            {i + 1}
                                        </Box>
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography variant="body2" fontWeight={700}>{m.accion}</Typography>
                                            <Typography variant="body2" color="text.secondary">{m.como}</Typography>
                                            <Stack direction="row" gap={0.75} sx={{ mt: 0.5 }} flexWrap="wrap">
                                                <Chip size="small" variant="outlined" label={m.responsable} />
                                                <Chip size="small" label={IMPACT[m.impacto]?.label ?? m.impacto} color={IMPACT[m.impacto]?.color ?? "default"} />
                                            </Stack>
                                        </Box>
                                    </Stack>
                                ))}
                            </Stack>
                        </Box>
                    )}

                    {a.vendedoras.length > 0 && (
                        <Box>
                            <Typography variant="body2" fontWeight={800} sx={{ mb: 1 }}>Por vendedora</Typography>
                            <Stack spacing={0.75}>
                                {a.vendedoras.map((v, i) => (
                                    <Typography key={i} variant="body2"><b>{v.nombre}:</b> {v.observacion}</Typography>
                                ))}
                            </Stack>
                        </Box>
                    )}

                    <Typography variant="caption" color="text.secondary">
                        Analizó {count(data!.analyzed)} motivo{data!.analyzed === 1 ? "" : "s"} escrito{data!.analyzed === 1 ? "" : "s"}
                        {data!.written > data!.analyzed ? ` (los más recientes de ${count(data!.written)})` : ""}, {when(data!.generated_at)}
                        {data!.cached ? " (ya estaba hecho: los motivos no cambiaron)" : ""}. La IA puede equivocarse: úsalo como guía.
                    </Typography>
                </Stack>
            )}
        </Panel>
    );
};
