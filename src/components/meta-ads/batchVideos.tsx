// src/components/meta-ads/batchVideos.tsx
// .102 (dueño, 2026-11-04: "cuando me diga para lanzar un batch, me debería dejar descargar los creativos desde esa misma
// ventana"): los videos de los batches que lanza una misión del Análisis del día, con su nombre de Meta, para verlos y
// bajarlos ahí mismo. Los enlaces se piden al abrir la misión (vencen a las 6 horas; el análisis se hizo a las 00:30).
import React, { useEffect, useState } from "react";
import { Box, Button, Link, Stack, Typography } from "@mui/material";
import { DownloadRounded } from "@mui/icons-material";
import { api } from "./metaAds";
import { useTokens } from "../ui/design";

type VideoFile = { id: number; name: string; size: number; type: string; url: string | null; download_url: string | null };
type Piece = { name: string | null; file: VideoFile | null; link: string | null };
type Batch = { code: string; adset: string | null; status: string; status_label: string; pieces: Piece[] };

const mb = (bytes: number) => bytes >= 1024 * 1024 ? `${new Intl.NumberFormat("es-VE", { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Baja un archivo sin salir de la página: el enlace ya dice "attachment" (el navegador lo guarda con su nombre). */
const download = (url: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
};

export const BatchVideos: React.FC<{ codes: string[] }> = ({ codes }) => {
    const t = useTokens();
    const [batches, setBatches] = useState<Batch[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState<number | null>(null);
    const key = codes.join(",");

    useEffect(() => {
        let alive = true;
        const q = new URLSearchParams();
        key.split(",").forEach((c) => q.append("codes[]", c));
        api<{ batches: Batch[] }>(`/meta/analysis/videos?${q}`)
            .then((r) => { if (alive) setBatches(r.batches); })
            .catch((e) => { if (alive) setError((e as Error).message); });
        return () => { alive = false; };
    }, [key]);

    if (error) return <Typography sx={{ fontSize: 13, color: t.muted, mt: 1.25 }}>No se pudieron traer los videos: {error}</Typography>;
    if (!batches) return <Typography sx={{ fontSize: 13, color: t.muted, mt: 1.25 }}>Buscando los videos…</Typography>;
    if (!batches.length) return null;

    const urls = batches.flatMap((b) => b.pieces.map((p) => p.file?.download_url).filter((u): u is string => !!u));
    // Uno detrás de otro: la primera vez Chrome pregunta si deja bajar varios archivos
    const all = async () => {
        for (let i = 0; i < urls.length; i++) {
            setBusy(i + 1);
            download(urls[i]);
            await new Promise((r) => setTimeout(r, 900));
        }
        setBusy(null);
    };

    return (
        <Box sx={{ bgcolor: t.soft, borderRadius: "8px", p: "10px 12px", mt: 1.25 }}>
            {batches.map((b) => (
                <Box key={b.code} sx={{ "& + &": { mt: 1 } }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                        Videos de {b.adset ?? b.code}
                        {b.status !== "bank" && <Box component="span" sx={{ fontWeight: 400, color: t.muted }}> · {b.status_label}</Box>}
                    </Typography>
                    <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0, mt: 0.5 }}>
                        {b.pieces.map((p, i) => (
                            <Typography key={i} component="li" sx={{ fontSize: 13, py: 0.25, overflowWrap: "anywhere", color: t.ink }}>
                                <Box component="span" sx={{ fontFamily: "ui-monospace, Consolas, monospace", fontSize: "0.92em", bgcolor: t.card, border: `1px solid ${t.line}`,
                                    borderRadius: "5px", px: 0.75, py: "1px" }}>{p.name ?? "sin nombre"}</Box>
                                {p.file?.download_url ? <>
                                    <Box component="span" sx={{ color: t.muted }}> · {mb(p.file.size)} · </Box>
                                    {p.file.url && <><Link href={p.file.url} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ color: t.ink }}>ver</Link>{" · "}</>}
                                    <Link href={p.file.download_url} underline="hover" sx={{ color: t.ink, fontWeight: 600 }}>bajar</Link>
                                </> : p.link
                                    ? <> · <Link href={p.link} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ color: t.ink }}>abrir en Drive</Link></>
                                    : <Box component="span" sx={{ color: t.muted }}> · todavía no está</Box>}
                            </Typography>
                        ))}
                    </Box>
                </Box>
            ))}
            {urls.length > 1 && (
                <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                    <Button variant="outlined" size="small" startIcon={<DownloadRounded />} disabled={busy !== null} onClick={all}
                        sx={{ color: t.ink, borderColor: t.line, borderRadius: "10px", minHeight: 36, "&:hover": { borderColor: t.faint, bgcolor: "transparent" } }}>
                        {busy !== null ? `Bajando ${busy} de ${urls.length}…` : `Bajar los ${urls.length} videos`}
                    </Button>
                    <Typography sx={{ fontSize: 12, color: t.muted }}>Si Chrome pregunta, toca «Permitir».</Typography>
                </Stack>
            )}
        </Box>
    );
};
