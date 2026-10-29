// src/components/assistant/MessageView.tsx
// Un mensaje del chat del asistente: la pregunta del dueño a la derecha (con sus fotos, PDF o Excel, que se abren como
// en el chat interno); la respuesta a la izquierda, con su texto
// (negritas, listas y tablas: react-markdown, sin HTML) y debajo las tarjetas y gráficas. Mientras piensa, qué revisa.
import React, { FC } from "react";
import { Alert, Box, CircularProgress, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AttachmentView } from "../internal-chat/chat/AttachmentView";
import { ChatMessage } from "./assistant";
import { DisplayBlocks } from "./DisplayBlocks";

/** El texto de la respuesta con el estilo del panel. */
const Text: FC<{ text: string }> = ({ text }) => (
    <Box
        sx={(t) => ({
            fontSize: 15, lineHeight: 1.55, overflowWrap: "anywhere",
            "& p": { m: 0, mb: 1 }, "& p:last-child": { mb: 0 },
            "& ul, & ol": { m: 0, mb: 1, pl: 2.5 }, "& li": { mb: 0.25 },
            "& strong": { fontWeight: 800 },
            "& h1, & h2, & h3": { fontSize: 16, fontWeight: 800, m: 0, mb: 0.5 },
            "& table": { borderCollapse: "collapse", my: 1, display: "block", overflowX: "auto", maxWidth: "100%" },
            "& th, & td": { border: `1px solid ${t.palette.divider}`, px: 1, py: 0.5, fontSize: 13, whiteSpace: "nowrap" },
            "& a": { color: "primary.main" },
            "& code": { fontSize: 13, bgcolor: "action.hover", px: 0.5, borderRadius: 0.5 },
        })}
    >
        <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
    </Box>
);

export const MessageView: FC<{ message: ChatMessage }> = ({ message }) => {
    if (message.role === "user") {
        const files = message.attachments ?? [];
        return (
            <Stack alignItems="flex-end" spacing={0.5}>
                {files.length > 0 && (
                    // Las fotos se ven chicas (se amplían al tocarlas); el PDF y el Excel, como tarjeta
                    <Stack direction="row" gap={0.75} flexWrap="wrap" justifyContent="flex-end" sx={{ maxWidth: { xs: "88%", sm: "75%" }, "& img": { maxHeight: 180, maxWidth: 220 } }}>
                        {files.map((a) => <AttachmentView key={a.url} attachment={a} mine={false} />)}
                    </Stack>
                )}
                {message.text && (
                    <Box sx={{ maxWidth: { xs: "88%", sm: "75%" }, bgcolor: "primary.main", color: "primary.contrastText", px: 1.75, py: 1, borderRadius: "16px 16px 4px 16px" }}>
                        <Typography sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 15 }}>{message.text}</Typography>
                    </Box>
                )}
                {message.time && <Typography variant="caption" color="text.disabled" sx={{ mt: 0.25 }}>{message.time}</Typography>}
            </Stack>
        );
    }

    if (message.status === "thinking") {
        return (
            <Stack direction="row" alignItems="center" gap={1} role="status" sx={{ color: "text.secondary", py: 0.5 }}>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">{message.progress || "Pensando…"}</Typography>
            </Stack>
        );
    }

    if (message.status === "failed") {
        return <Alert severity="warning" variant="outlined" sx={{ py: 0.25 }}>{message.error || "No pude responder. Intenta de nuevo."}</Alert>;
    }

    return (
        <Box sx={(t) => ({ maxWidth: "100%", bgcolor: alpha(t.palette.text.primary, 0.03), border: 1, borderColor: "divider", px: { xs: 1.5, sm: 2 }, py: 1.25, borderRadius: "16px 16px 16px 4px" })}>
            {message.text && <Text text={message.text} />}
            <DisplayBlocks blocks={message.display} />
            {message.time && <Typography variant="caption" color="text.disabled" component="div" sx={{ mt: 0.5 }}>{message.time}</Typography>}
        </Box>
    );
};
