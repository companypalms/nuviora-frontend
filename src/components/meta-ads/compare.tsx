// src/components/meta-ads/compare.tsx
// .93 (dueño: "del lado izquierdo la referencia que se utilizó en el video y del lado derecho el video que acaba de hacer el
// editor. De esta manera puede comparar el uno con el otro"): los dos lado a lado, también en el celular (más chicos, con
// "Agrandar"). "Ver los dos juntos" los arranca a la vez desde el principio (la referencia sin sonido) y "Marcar este
// segundo" toma el momento del video entregado para la nota. Lo usan Revisar (el líder y el dueño) y Entregar (el editor
// se compara antes de mandar).
import React, { useRef, useState } from "react";
import { Box, Button, Link, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import { BookmarkAddRounded, DownloadRounded, OpenInNewRounded, PlayArrowRounded } from "@mui/icons-material";
import { CompareSide } from "./editorShared";
import { fmtSize } from "../internal-chat/chat/chatFiles";
import { lineSx, tapSx, useTokens } from "../ui/design";
import { TextAction } from "../ui/designParts";

const media = { display: "block", width: "100%", height: "100%", objectFit: "contain" } as const;

/** Un lado: su título, el video (o la foto, la miniatura o por qué no hay), cómo bajarlo o abrir el original y sus líneas. */
const Pane: React.FC<{
    side: CompareSide; big: boolean; videoRef: React.RefObject<HTMLVideoElement | null>; onBig?: () => void; bigLabel: string;
}> = ({ side, big, videoRef, onBig, bigLabel }) => {
    const t = useTokens();
    const f = side.file;
    const dark = !!(f?.url || side.thumbnail);
    return (
        <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* En una línea, para que los dos videos queden a la misma altura */}
            <Typography noWrap title={side.label} sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>{side.label}</Typography>
            <Box sx={{ bgcolor: dark ? "common.black" : t.soft, borderRadius: "10px", overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "center",
                height: big ? "min(62vh, 560px)" : { xs: "min(40vh, 340px)", sm: "min(56vh, 540px)" } }}>
                {f?.url && f.type === "video" ? (
                    <video ref={videoRef} key={f.id} src={f.url} controls preload="metadata" playsInline aria-label={`Video ${f.name}`} style={media} />
                ) : f?.url && f.type === "image" ? (
                    <img src={f.url} alt={f.name} style={media} />
                ) : side.thumbnail ? (
                    <img src={side.thumbnail} alt={`Miniatura de ${side.label}`} style={media} />
                ) : (
                    <Typography sx={{ fontSize: 13, color: t.muted, p: 2, textAlign: "center" }}>{side.empty ?? "Sin video"}</Typography>
                )}
            </Box>
            {(f || side.link || onBig) && (
                <Typography component="div" sx={{ fontSize: 12, color: t.muted, mt: 0.5, overflowWrap: "anywhere" }}>
                    {[
                        f && <span key="n">{f.name} · {fmtSize(f.size)}</span>,
                        f?.download_url && <Link key="d" href={f.download_url} underline="hover" sx={{ color: t.muted }}>bajar <DownloadRounded sx={{ fontSize: 12, verticalAlign: "middle" }} /></Link>,
                        side.link && <Link key="o" href={side.link.href} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ color: t.muted }}>{side.link.label} <OpenInNewRounded sx={{ fontSize: 12, verticalAlign: "middle" }} /></Link>,
                        onBig && <TextAction key="b" onClick={onBig} sx={{ fontSize: 13, color: t.ink }}>{bigLabel}</TextAction>,
                    ].filter(Boolean).flatMap((x, i) => (i ? [" · ", x] : [x]))}
                </Typography>
            )}
            {side.lines.map((x, i) => (
                <Typography key={i} sx={{ fontSize: 13, color: i === 0 ? t.ink : t.muted, mt: 0.25, overflowWrap: "anywhere", whiteSpace: "pre-line" }}>{x}</Typography>
            ))}
        </Box>
    );
};

/** La referencia a la izquierda y lo entregado a la derecha. "onMark": con "Marcar este segundo" (al revisar). */
export const CompareMedia: React.FC<{ left: CompareSide; right: CompareSide; onMark?: (seconds: number) => void }> = ({ left, right, onMark }) => {
    const t = useTokens();
    const phone = useMediaQuery(useTheme().breakpoints.down("sm"));
    const leftRef = useRef<HTMLVideoElement | null>(null);
    const rightRef = useRef<HTMLVideoElement | null>(null);
    const [big, setBig] = useState<"left" | "right" | null>(null);
    const both = left.file?.type === "video" && right.file?.type === "video" && !!left.file.url && !!right.file.url;
    const markable = !!onMark && right.file?.type === "video" && !!right.file.url;

    const playBoth = () => {
        setBig(null);
        // Si uno estaba agrandado, el otro vuelve a aparecer: se arrancan cuando ya están los dos
        window.setTimeout(() => {
            ([[leftRef.current, true], [rightRef.current, false]] as const).forEach(([v, muted]) => {
                if (!v) return;
                v.currentTime = 0;
                v.muted = muted;
                v.play().catch(() => undefined);
            });
        }, 0);
    };
    const mark = () => {
        const v = rightRef.current;
        if (!v || !onMark) return;
        v.pause();
        onMark(v.currentTime);
    };
    const pane = (s: "left" | "right") => (
        <Pane side={s === "left" ? left : right} videoRef={s === "left" ? leftRef : rightRef} big={phone && big === s}
            onBig={phone ? () => setBig(big ? null : s) : undefined} bigLabel={big ? "Volver a comparar" : "Agrandar"} />
    );

    return (
        <Box>
            <Stack direction="row" spacing={{ xs: 1, sm: 2 }} alignItems="flex-start">
                {(!phone || big !== "right") && pane("left")}
                {(!phone || big !== "left") && pane("right")}
            </Stack>
            {(both || markable) && (
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    {both && (
                        <Button variant="outlined" startIcon={<PlayArrowRounded />} onClick={playBoth} sx={{ ...lineSx(t), ...tapSx, flex: { xs: 1, sm: "none" } }}>
                            {phone ? "Los dos juntos" : "Ver los dos juntos"}
                        </Button>
                    )}
                    {markable && (
                        <Button variant="outlined" startIcon={<BookmarkAddRounded />} onClick={mark} sx={{ ...lineSx(t), ...tapSx, flex: { xs: 1, sm: "none" } }}>
                            {phone ? "Marcar segundo" : "Marcar este segundo"}
                        </Button>
                    )}
                </Stack>
            )}
        </Box>
    );
};
