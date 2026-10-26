// Los archivos elegidos que todavía no se enviaron: miniatura o ícono, nombre, quitar y el avance de la subida.
import { FC } from "react";
import { alpha, Box, CircularProgress, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { AudiotrackRounded, CloseRounded, InsertDriveFileRounded, MovieRounded, PictureAsPdfRounded } from "@mui/icons-material";
import { fmtSize } from "./chatFiles";

export interface PendingFile {
    id: string;
    file: File;
    /** URL local para la miniatura de una foto. */
    preview?: string;
    progress?: number;
}

const iconFor = (file: File) => {
    if (file.type.startsWith("video/")) return <MovieRounded />;
    if (file.type.startsWith("audio/")) return <AudiotrackRounded />;
    if (file.type === "application/pdf") return <PictureAsPdfRounded />;
    return <InsertDriveFileRounded />;
};

interface Props {
    items: PendingFile[];
    sending: boolean;
    onRemove: (id: string) => void;
}

export const PendingFiles: FC<Props> = ({ items, sending, onRemove }) => (
    <Box sx={{ mb: 1 }}>
        <Stack direction="row" spacing={1} sx={{ overflowX: "auto", pb: 0.5 }} role="list" aria-label="Archivos por enviar">
            {items.map((item) => (
                <Tooltip key={item.id} title={`${item.file.name} · ${fmtSize(item.file.size)}`}>
                    <Box
                        role="listitem"
                        sx={{
                            position: "relative", flexShrink: 0, width: 72, height: 72, borderRadius: 1.5, overflow: "hidden",
                            border: "1px solid", borderColor: "divider", bgcolor: (t) => alpha(t.palette.text.primary, 0.04),
                        }}
                    >
                        {item.preview ? (
                            <Box component="img" src={item.preview} alt={item.file.name} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                            <Stack alignItems="center" justifyContent="center" spacing={0.25} sx={{ height: "100%", px: 0.5, color: "text.secondary" }}>
                                {iconFor(item.file)}
                                <Typography variant="caption" noWrap sx={{ fontSize: "0.62rem", maxWidth: "100%" }}>{item.file.name}</Typography>
                            </Stack>
                        )}
                        {item.progress !== undefined && (
                            <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", bgcolor: "rgba(0,0,0,0.45)" }}>
                                <CircularProgress variant={item.progress > 0 ? "determinate" : "indeterminate"} value={item.progress} size={30} sx={{ color: "common.white" }} />
                            </Box>
                        )}
                        {!sending && (
                            <IconButton
                                size="small"
                                onClick={() => onRemove(item.id)}
                                aria-label={`Quitar ${item.file.name}`}
                                sx={{ position: "absolute", top: 2, right: 2, p: 0.25, bgcolor: "rgba(0,0,0,0.55)", color: "common.white", "&:hover": { bgcolor: "rgba(0,0,0,0.75)" } }}
                            >
                                <CloseRounded sx={{ fontSize: 14 }} />
                            </IconButton>
                        )}
                    </Box>
                </Tooltip>
            ))}
        </Stack>
        {items.length > 1 && (
            <Typography variant="caption" color="text.secondary">
                {items.length} archivos: se envían uno por uno; el texto va con el primero.
            </Typography>
        )}
    </Box>
);
