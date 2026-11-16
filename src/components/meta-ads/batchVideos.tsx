// src/components/meta-ads/batchVideos.tsx
// .102 (dueño, 2026-11-04: "cuando me diga para lanzar un batch, me debería dejar descargar los creativos desde esa misma
// ventana"): los videos de los batches que lanza una misión del Análisis del día, con su nombre de Meta, para verlos y
// bajarlos ahí mismo. Los enlaces se piden al abrir la misión (vencen a las 6 horas; el análisis se hizo a las 00:30).
// .148 (dueño, 2026-11-16: "los videos estaban malos… no era el producto indicado"): "Devolver al líder" un batch de la
// banca, con una nota y las piezas que están mal.
import React, { useEffect, useState } from "react";
import {
    Box, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Link, Stack, TextField, Typography,
    useMediaQuery, useTheme,
} from "@mui/material";
import { DownloadRounded, UndoRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { api } from "./metaAds";
import { geist, inkSx, tapSx, useTokens } from "../ui/design";
import { TextAction } from "../ui/designParts";

type VideoFile = { id: number; name: string; size: number; type: string; url: string | null; download_url: string | null };
type Piece = { id: number; code: string | null; name: string | null; file: VideoFile | null; link: string | null };
type Batch = { id: number; code: string; adset: string | null; status: string; status_label: string; pieces: Piece[] };

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

/** .148: la nota y las piezas que están mal; el batch vuelve al líder, sin asignar, y la misión de lanzarlo se quita. */
const SendBackDialog: React.FC<{ batch: Batch | null; onClose: () => void; onDone: () => void }> = ({ batch, onClose, onDone }) => {
    const t = useTokens();
    const phone = useMediaQuery(useTheme().breakpoints.down("sm"));
    const [picked, setPicked] = useState<number[]>([]);
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [shown, setShown] = useState<number | null>(null);
    if ((batch?.id ?? null) !== shown) {
        setShown(batch?.id ?? null);
        setPicked([]);
        setNote("");
        setError(null);
    }
    const short = note.trim().length < 10;
    const send = async () => {
        if (!batch) return;
        setBusy(true);
        setError(null);
        try {
            await api(`/meta/queue/${batch.id}/send-back`, "POST", { note: note.trim(), pieces: picked });
            toast.success(`${batch.code} volvió al líder con tu nota. La misión de lanzarlo vuelve sola cuando esté corregido.`);
            onDone();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={!!batch} onClose={busy ? undefined : onClose} fullScreen={phone} fullWidth maxWidth="sm" PaperProps={{ sx: { ...geist, borderRadius: phone ? 0 : "12px" } }}>
            <DialogTitle sx={{ pb: 1 }}>
                <Typography component="span" sx={{ display: "block", fontSize: 20, fontWeight: 600 }}>Devolver {batch?.code} al líder</Typography>
                <Typography component="span" sx={{ display: "block", fontSize: 13, color: t.muted, mt: 0.5 }}>
                    El líder elige quién lo corrige (el mismo editor u otro). Tiene 2 días. Cuando vuelva corregido a la banca, te sale otra vez la misión de lanzarlo.
                </Typography>
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: t.line }}>
                <Typography sx={{ fontSize: 14, fontWeight: 600 }}>¿Qué piezas están mal?</Typography>
                <Stack sx={{ mt: 0.5 }}>
                    {(batch?.pieces ?? []).map((p) => (
                        <FormControlLabel key={p.id} sx={{ minHeight: 44, mr: 0 }}
                            control={<Checkbox checked={picked.includes(p.id)} onChange={(e) => setPicked((x) => (e.target.checked ? [...x, p.id] : x.filter((i) => i !== p.id)))} />}
                            label={<Box component="span" sx={{ fontFamily: "ui-monospace, Consolas, monospace", fontSize: 14 }}>{p.name ?? p.code ?? "sin nombre"}</Box>} />
                    ))}
                </Stack>
                <TextField label="¿Qué está mal?" value={note} onChange={(e) => setNote(e.target.value)} fullWidth multiline minRows={3} sx={{ mt: 2 }}
                    inputProps={{ maxLength: 2000 }} placeholder="Por ejemplo: los videos muestran otro producto, no el que estamos vendiendo."
                    helperText="La ven el líder y el editor que lo corrija." />
                {error && <Typography role="alert" sx={{ fontSize: 14, color: t.red, mt: 1.5 }}>{error}</Typography>}
            </DialogContent>
            <DialogActions sx={{ p: 2, gap: 1, flexWrap: "wrap" }}>
                <Button onClick={onClose} disabled={busy} sx={{ color: t.muted, ...tapSx }}>Cancelar</Button>
                <Button variant="contained" disableElevation disabled={busy || short || picked.length === 0} onClick={send}
                    startIcon={busy ? <CircularProgress size={14} sx={{ color: "inherit" }} /> : <UndoRounded />} sx={{ ...inkSx(t), ...tapSx, flex: { xs: 1, sm: "none" } }}>
                    {picked.length === 0 ? "Marca las piezas" : short ? "Escribe qué está mal" : `Devolver ${picked.length === 1 ? "1 pieza" : `${picked.length} piezas`}`}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export const BatchVideos: React.FC<{ codes: string[]; onSentBack?: () => void }> = ({ codes, onSentBack }) => {
    const t = useTokens();
    const [batches, setBatches] = useState<Batch[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState<number | null>(null);
    const [sending, setSending] = useState<Batch | null>(null);
    const [reload, setReload] = useState(0);
    const key = codes.join(",");

    useEffect(() => {
        let alive = true;
        const q = new URLSearchParams();
        key.split(",").forEach((c) => q.append("codes[]", c));
        api<{ batches: Batch[] }>(`/meta/analysis/videos?${q}`)
            .then((r) => { if (alive) setBatches(r.batches); })
            .catch((e) => { if (alive) setError((e as Error).message); });
        return () => { alive = false; };
    }, [key, reload]);

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
                    <Stack direction="row" spacing={1} alignItems="baseline" justifyContent="space-between" useFlexGap flexWrap="wrap">
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                            Videos de {b.adset ?? b.code}
                            {b.status !== "bank" && <Box component="span" sx={{ fontWeight: 400, color: t.muted }}> · {b.status_label}</Box>}
                        </Typography>
                        {/* .148: algo está mal (por ejemplo, otro producto): vuelve al líder con tu nota */}
                        {b.status === "bank" && <TextAction onClick={() => setSending(b)} aria-haspopup="dialog">Devolver al líder</TextAction>}
                    </Stack>
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
            <SendBackDialog batch={sending} onClose={() => setSending(null)} onDone={() => { setSending(null); setReload((n) => n + 1); onSentBack?.(); }} />
        </Box>
    );
};
