// El cuerpo de un hilo del chat interno: los mensajes y donde se escribe. Se pueden soltar archivos encima.
// Lo usan la pantalla de chats y el chat dentro de la ficha de la orden.
import { DragEvent, FC, useRef, useState } from "react";
import { alpha, Box, Typography } from "@mui/material";
import { UploadFileRounded } from "@mui/icons-material";
import { ChatComposer, ChatComposerHandle } from "./ChatComposer";
import { MessageList } from "./MessageList";
import { ChatMessage, OutgoingMessage } from "./types";

interface Props {
    messages: ChatMessage[];
    loading: boolean;
    userId: number;
    emptyText: string;
    onSend: (msg: OutgoingMessage, onProgress: (percent: number) => void) => Promise<void>;
    disabled?: boolean;
    autoFocus?: boolean;
}

const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");

export const ChatPanel: FC<Props> = ({ messages, loading, userId, emptyText, onSend, disabled, autoFocus }) => {
    const composerRef = useRef<ChatComposerHandle>(null);
    const depth = useRef(0);
    const [dragging, setDragging] = useState(false);

    const dropHandlers = disabled ? {} : {
        onDragEnter: (e: DragEvent) => {
            if (!hasFiles(e)) return;
            e.preventDefault();
            depth.current += 1;
            setDragging(true);
        },
        onDragOver: (e: DragEvent) => {
            if (hasFiles(e)) e.preventDefault();
        },
        onDragLeave: () => {
            depth.current = Math.max(0, depth.current - 1);
            if (depth.current === 0) setDragging(false);
        },
        onDrop: (e: DragEvent) => {
            if (!hasFiles(e)) return;
            e.preventDefault();
            depth.current = 0;
            setDragging(false);
            composerRef.current?.addFiles(e.dataTransfer.files);
        },
    };

    return (
        <Box sx={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }} {...dropHandlers}>
            <MessageList messages={messages} loading={loading} userId={userId} emptyText={emptyText} />
            <ChatComposer ref={composerRef} onSend={onSend} disabled={disabled} autoFocus={autoFocus} />
            {dragging && (
                <Box
                    sx={{
                        position: "absolute", inset: 8, zIndex: 2, pointerEvents: "none", borderRadius: 2,
                        border: "2px dashed", borderColor: "primary.main", bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
                        display: "grid", placeItems: "center", textAlign: "center", color: "primary.main",
                    }}
                >
                    <Box>
                        <UploadFileRounded sx={{ fontSize: 44 }} />
                        <Typography fontWeight={700}>Suelta los archivos para adjuntarlos</Typography>
                        <Typography variant="caption">Fotos, videos, audios, PDF y documentos de hasta 50 MB</Typography>
                    </Box>
                </Box>
            )}
        </Box>
    );
};
