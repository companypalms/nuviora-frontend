// El archivo de un mensaje del chat interno: la foto (se amplía al tocarla), el video o el audio con su
// reproductor, y el PDF o el documento como tarjeta para abrir o descargar.
import { FC, useState } from "react";
import { alpha, Box, Button, Dialog, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import {
    AudiotrackRounded, CloseRounded, DescriptionRounded, DownloadRounded, InsertDriveFileRounded, MicRounded,
    OpenInNewRounded, PictureAsPdfRounded, TableChartRounded,
} from "@mui/icons-material";
import { fmtSize } from "./chatFiles";
import { ChatAttachment } from "./types";

interface Props {
    attachment: ChatAttachment;
    /** El mensaje es propio: va sobre el color principal. */
    mine: boolean;
    /** Avisa cuando la foto o el video ya tienen tamaño, para bajar al final del hilo. */
    onMediaLoad?: () => void;
}

const extension = (name: string) => (name.includes(".") ? name.split(".").pop()!.toUpperCase() : "");

const FileIcon: FC<{ attachment: ChatAttachment }> = ({ attachment }) => {
    const ext = extension(attachment.name);
    if (attachment.kind === "pdf") return <PictureAsPdfRounded />;
    if (["XLS", "XLSX", "CSV", "ODS"].includes(ext)) return <TableChartRounded />;
    if (["DOC", "DOCX", "ODT", "RTF", "TXT"].includes(ext)) return <DescriptionRounded />;
    return <InsertDriveFileRounded />;
};

/** PDF, Word, Excel, zip…: nombre, tamaño y botones para abrir (si se puede) o descargar. */
const FileCard: FC<Props & { note?: string }> = ({ attachment, mine, note }) => (
    <Box
        sx={{
            display: "flex", alignItems: "center", gap: 1.25, p: 1, pr: 0.5, borderRadius: 1.5, minWidth: 0,
            width: { xs: 240, sm: 280 }, maxWidth: "100%",
            bgcolor: (t) => (mine ? alpha(t.palette.common.white, 0.16) : alpha(t.palette.text.primary, 0.05)),
        }}
    >
        <Box
            sx={{
                width: 40, height: 40, borderRadius: 1, flexShrink: 0, display: "grid", placeItems: "center",
                bgcolor: (t) => (mine ? alpha(t.palette.common.white, 0.2) : alpha(attachment.kind === "pdf" ? t.palette.error.main : t.palette.primary.main, 0.12)),
                color: (t) => (mine ? "inherit" : attachment.kind === "pdf" ? t.palette.error.main : t.palette.primary.main),
            }}
        >
            <FileIcon attachment={attachment} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" fontWeight={600} noWrap title={attachment.name}>{attachment.name}</Typography>
            <Typography variant="caption" sx={{ opacity: 0.75 }}>
                {[extension(attachment.name), fmtSize(attachment.size), note].filter(Boolean).join(" · ")}
            </Typography>
        </Box>
        {attachment.kind === "pdf" && (
            <Tooltip title="Abrir">
                <IconButton size="small" color="inherit" component="a" href={attachment.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${attachment.name}`}>
                    <OpenInNewRounded fontSize="small" />
                </IconButton>
            </Tooltip>
        )}
        <Tooltip title="Descargar">
            <IconButton size="small" color="inherit" component="a" href={attachment.download_url} aria-label={`Descargar ${attachment.name}`}>
                <DownloadRounded fontSize="small" />
            </IconButton>
        </Tooltip>
    </Box>
);

export const AttachmentView: FC<Props> = (props) => {
    const { attachment, onMediaLoad } = props;
    const [viewerOpen, setViewerOpen] = useState(false);
    const [broken, setBroken] = useState(false);

    // Un video que el navegador no sabe reproducir (p. ej. HEVC del iPhone) queda para descargar
    if (broken) return <FileCard {...props} note={attachment.kind === "image" ? "no se puede mostrar aquí" : "no se puede reproducir aquí"} />;

    if (attachment.kind === "image") {
        return (
            <>
                <Box
                    component="button"
                    type="button"
                    onClick={() => setViewerOpen(true)}
                    aria-label={`Ver foto ${attachment.name}`}
                    sx={{ p: 0, border: 0, bgcolor: "transparent", cursor: "zoom-in", display: "block", borderRadius: 1.5, overflow: "hidden", lineHeight: 0 }}
                >
                    <Box
                        component="img"
                        src={attachment.url}
                        alt={attachment.name}
                        loading="lazy"
                        onLoad={onMediaLoad}
                        onError={() => setBroken(true)}
                        sx={{ display: "block", maxWidth: { xs: 240, sm: 300 }, maxHeight: 320, width: "auto", height: "auto", minWidth: 120, minHeight: 80, objectFit: "cover" }}
                    />
                </Box>
                <Dialog
                    open={viewerOpen}
                    onClose={() => setViewerOpen(false)}
                    fullScreen
                    PaperProps={{ sx: { bgcolor: "rgba(0,0,0,0.92)", color: "common.white", backgroundImage: "none" } }}
                >
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 1, pl: 2 }}>
                        <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>{attachment.name}</Typography>
                        <Button color="inherit" size="small" startIcon={<DownloadRounded />} href={attachment.download_url} sx={{ textTransform: "none" }}>
                            Descargar
                        </Button>
                        <IconButton color="inherit" onClick={() => setViewerOpen(false)} aria-label="Cerrar">
                            <CloseRounded />
                        </IconButton>
                    </Stack>
                    <Box sx={{ flex: 1, minHeight: 0, display: "grid", placeItems: "center", p: { xs: 1, sm: 3 } }} onClick={() => setViewerOpen(false)}>
                        <Box component="img" src={attachment.url} alt={attachment.name} sx={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} onClick={(e) => e.stopPropagation()} />
                    </Box>
                </Dialog>
            </>
        );
    }

    if (attachment.kind === "video") {
        return (
            <Box
                component="video"
                controls
                preload="metadata"
                playsInline
                src={attachment.url}
                onLoadedMetadata={onMediaLoad}
                onError={() => setBroken(true)}
                sx={{ display: "block", width: { xs: 240, sm: 300 }, maxWidth: "100%", maxHeight: 360, borderRadius: 1.5, bgcolor: "common.black" }}
            />
        );
    }

    if (attachment.kind === "voice" || attachment.kind === "audio") {
        const voice = attachment.kind === "voice";
        return (
            <Box sx={{ width: { xs: 240, sm: 280 }, maxWidth: "100%" }}>
                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5, opacity: 0.8, minWidth: 0 }}>
                    {voice ? <MicRounded sx={{ fontSize: 16 }} /> : <AudiotrackRounded sx={{ fontSize: 16 }} />}
                    <Typography variant="caption" noWrap>{voice ? "Nota de voz" : attachment.name}</Typography>
                </Stack>
                <Box component="audio" controls preload="metadata" src={attachment.url} onError={() => setBroken(true)} sx={{ display: "block", width: "100%", height: 40 }} />
            </Box>
        );
    }

    return <FileCard {...props} />;
};
