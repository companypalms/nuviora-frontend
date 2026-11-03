// src/components/meta-ads/fileView.tsx
// .90: ver lo subido al almacén ahí mismo (el video con su reproductor, la foto, o el enlace para bajarlo) y "Probar el
// almacén". Subir está en fileUpload.ts.
import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Link, Paper, Stack, Typography } from "@mui/material";
import { DownloadRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { api } from "./metaAds";
import { fmtSize } from "../internal-chat/chat/chatFiles";
import type { StoredFile } from "./fileUpload";

/** Dónde se guardan los archivos y "Probar el almacén" (después de poner las llaves de Cloudflare R2 en el servidor). */
export const StoreCheckCard: React.FC = () => {
    const [status, setStatus] = useState<{ driver: string; label: string; on: boolean } | null>(null);
    const [check, setCheck] = useState<{ ok: boolean; message: string } | null>(null);
    const [busy, setBusy] = useState(false);
    useEffect(() => { api<{ driver: string; label: string; on: boolean }>("/meta/files/status").then(setStatus).catch(() => setStatus(null)); }, []);
    const probe = async () => {
        setBusy(true);
        try { setCheck(await api<{ ok: boolean; message: string }>("/meta/files/check", "POST")); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
    };
    return (
        <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: 2 }}>
            <Typography fontWeight="bold">Almacén de archivos</Typography>
            <Typography variant="body2" color="text.secondary">
                Donde se guardan los videos que entregan los editores, las fotos y la estrategia de cada producto. Hoy: <b>{status?.label ?? "…"}</b>.
            </Typography>
            <Button size="small" variant="outlined" sx={{ mt: 1 }} disabled={busy} onClick={probe}>{busy ? "Probando…" : "Probar el almacén"}</Button>
            {check && <Alert severity={check.ok ? "success" : "warning"} sx={{ mt: 1 }}>{check.message}</Alert>}
        </Paper>
    );
};

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
