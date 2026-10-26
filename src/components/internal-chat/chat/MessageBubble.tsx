// Un mensaje del chat interno: el archivo (si tiene), el texto con los enlaces clicables y la hora.
import { FC, Fragment } from "react";
import { Box, Link, Typography } from "@mui/material";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { AttachmentView } from "./AttachmentView";
import { ChatMessage } from "./types";

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]"'])/g;

/** Los enlaces (p. ej. la ubicación de Google Maps) se abren al tocarlos. */
const Linkified: FC<{ text: string }> = ({ text }) => (
    <>
        {text.split(URL_RE).map((part, i) =>
            i % 2 === 1 ? (
                <Link key={i} href={part} target="_blank" rel="noopener noreferrer" color="inherit" sx={{ textDecorationColor: "currentColor", wordBreak: "break-all" }}>
                    {part}
                </Link>
            ) : (
                <Fragment key={i}>{part}</Fragment>
            ),
        )}
    </>
);

interface Props {
    message: ChatMessage;
    mine: boolean;
    /** Primer mensaje de una racha de la misma persona: lleva el nombre y la esquina marcada. */
    firstInGroup: boolean;
    onMediaLoad?: () => void;
}

export const MessageBubble: FC<Props> = ({ message, mine, firstInGroup, onMediaLoad }) => {
    const { attachment, body } = message;
    const hasText = !!body?.trim();
    const mediaOnly = !!attachment && !hasText && ["image", "video"].includes(attachment.kind);

    return (
        <Box sx={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: { xs: "88%", sm: "72%" }, mt: firstInGroup ? 1.25 : 0.25, minWidth: 0 }}>
            {firstInGroup && !mine && message.sender?.name && (
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: "block", ml: 1, mb: 0.25 }}>
                    {message.sender.name}
                </Typography>
            )}
            <Box
                sx={{
                    p: mediaOnly ? 0.5 : attachment ? 0.75 : "6px 10px",
                    borderRadius: 2,
                    ...(firstInGroup && (mine ? { borderTopRightRadius: 4 } : { borderTopLeftRadius: 4 })),
                    bgcolor: mine ? "primary.main" : "background.paper",
                    color: mine ? "primary.contrastText" : "text.primary",
                    border: mine ? "none" : "1px solid",
                    borderColor: "divider",
                    minWidth: 0,
                }}
            >
                {attachment && <AttachmentView attachment={attachment} mine={mine} onMediaLoad={onMediaLoad} />}
                {hasText && (
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", px: attachment ? 0.5 : 0, pt: attachment ? 0.75 : 0 }}>
                        <Linkified text={body} />
                    </Typography>
                )}
                <Typography variant="caption" component="div" sx={{ opacity: 0.7, textAlign: "right", fontSize: "0.68rem", lineHeight: 1.4, px: attachment ? 0.5 : 0, mt: 0.25 }}>
                    {dayjs(message.created_at).locale("es").format("h:mm a")}
                </Typography>
            </Box>
        </Box>
    );
};
