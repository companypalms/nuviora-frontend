// src/components/meta-ads/fileView.tsx
// .90: ver lo subido al almacén ahí mismo (el video con su reproductor, la foto, o el enlace para bajarlo) y "Probar el
// almacén". Subir está en fileUpload.ts.
import React, { useEffect, useState } from "react";
import { Box, Button, Link, Stack, Typography } from "@mui/material";
import { DownloadRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { api } from "./metaAds";
import { fmtSize } from "../internal-chat/chat/chatFiles";
import type { StoredFile } from "./fileUpload";
import { cardSx, lineSx, tapSx, useTokens } from "../ui/design";
import { Dot } from "../ui/designParts";

/** Dónde se guardan los archivos y "Probar el almacén" (después de poner las llaves de Cloudflare R2 en el servidor). */
export const StoreCheckCard: React.FC = () => {
    const t = useTokens();
    const [status, setStatus] = useState<{ driver: string; label: string; on: boolean } | null>(null);
    const [check, setCheck] = useState<{ ok: boolean; message: string } | null>(null);
    const [busy, setBusy] = useState(false);
    useEffect(() => { api<{ driver: string; label: string; on: boolean }>("/meta/files/status").then(setStatus).catch(() => setStatus(null)); }, []);
    const probe = async () => {
        setBusy(true);
        try { setCheck(await api<{ ok: boolean; message: string }>("/meta/files/check", "POST")); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
    };
    // .91: en Conexiones, con su estado a la vista (el color siempre con palabra)
    const state = !status ? { color: t.gray, text: "Revisando…" }
        : status.driver === "r2" ? { color: t.green, text: "Conectado a Cloudflare R2" }
        : status.driver === "local" ? { color: t.amber, text: "La carpeta de esta PC (solo para pruebas)" }
        : { color: t.gray, text: "Apagado: las entregas siguen con Google Drive" };
    return (
        <Box sx={{ ...cardSx(t), p: "14px 16px" }}>
            <Typography component="h2" sx={{ fontSize: 15, fontWeight: 600 }}>Almacén de archivos</Typography>
            <Typography sx={{ fontSize: 13, color: t.muted }}>Donde se guardan los videos que entregan los editores, las fotos y la estrategia de cada producto.</Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                <Dot color={state.color} /><Typography sx={{ fontSize: 15, fontWeight: 500 }}>{state.text}</Typography>
            </Stack>
            {status && !status.on && (
                <Typography sx={{ fontSize: 13, color: t.muted, mt: 0.5 }}>
                    Para conectarlo: crea el almacén en Cloudflare R2 y pon sus 4 llaves en el servidor (los pasos están en tu lista, la parte B de la .90). Después toca "Probar el almacén".
                </Typography>
            )}
            <Button variant="outlined" sx={{ ...lineSx(t), ...tapSx, mt: 1.5 }} disabled={busy} onClick={probe}>{busy ? "Probando…" : "Probar el almacén"}</Button>
            {check && (
                <Stack role="status" direction="row" spacing={1} alignItems="flex-start" sx={{ mt: 1.5, p: "10px 12px", borderRadius: "8px", bgcolor: check.ok ? t.greenSoft : t.soft }}>
                    <Dot color={check.ok ? t.green : t.red} />
                    <Typography sx={{ fontSize: 14, color: check.ok ? t.greenInk : t.ink }}>{check.message}</Typography>
                </Stack>
            )}
        </Box>
    );
};

/**
 * .91: un archivo en grande, para revisarlo: el video vertical (9:16) casi del alto de la pantalla, sobre negro, sin
 * recortarlo; abajo su nombre y "bajar".
 */
export const BigMedia: React.FC<{ file: StoredFile }> = ({ file }) => (
    <Stack spacing={0.5} sx={{ minWidth: 0 }}>
        <Box sx={{ bgcolor: "common.black", borderRadius: "10px", display: "flex", justifyContent: "center", overflow: "hidden" }}>
            {file.url && file.type === "video" && (
                <Box component="video" key={file.id} src={file.url} controls preload="metadata" playsInline aria-label={`Video ${file.name}`}
                    sx={{ display: "block", maxWidth: "100%", height: { xs: "min(42vh, 420px)", sm: "min(58vh, 560px)" } }} />
            )}
            {file.url && file.type === "image" && (
                <Box component="img" src={file.url} alt={file.name} sx={{ display: "block", maxWidth: "100%", maxHeight: { xs: "42vh", sm: "58vh" }, objectFit: "contain" }} />
            )}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
            {file.name} · {fmtSize(file.size)}
            {file.download_url && <>{" · "}<Link href={file.download_url} underline="hover">bajar <DownloadRounded sx={{ fontSize: 12, verticalAlign: "middle" }} /></Link></>}
        </Typography>
    </Stack>
);

/** Un archivo subido: el video con su reproductor o la foto, y su nombre con el enlace para bajarlo. */
export const FileView: React.FC<{ file: StoredFile; height?: number }> = ({ file, height = 220 }) => (
    <Stack spacing={0.5} sx={{ minWidth: 0 }}>
        {file.url && file.type === "video" && (
            <Box component="video" src={file.url} controls preload="metadata" playsInline
                sx={{ width: "100%", maxWidth: 360, maxHeight: height, borderRadius: 1, bgcolor: "common.black" }} />
        )}
        {file.url && file.type === "image" && (
            <Box component="img" src={file.url} alt={file.name} loading="lazy" sx={{ maxWidth: "100%", maxHeight: height, borderRadius: 1, objectFit: "contain", alignSelf: "flex-start" }} />
        )}
        <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
            {file.name} · {fmtSize(file.size)}
            {file.download_url && (
                <>{" · "}<Link href={file.download_url} underline="hover">bajar <DownloadRounded sx={{ fontSize: 12, verticalAlign: "middle" }} /></Link></>
            )}
        </Typography>
    </Stack>
);
