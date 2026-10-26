// Los mensajes de un hilo, con un separador por día. Baja sola al final cuando llega algo y ya estabas abajo;
// si estabas leyendo más arriba, muestra un botón con los mensajes nuevos.
import { FC, Fragment, useCallback, useLayoutEffect, useRef, useState } from "react";
import { Box, Chip, Fab, Skeleton, Stack, Typography } from "@mui/material";
import { ForumRounded, KeyboardArrowDownRounded } from "@mui/icons-material";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { MessageBubble } from "./MessageBubble";
import { ChatMessage } from "./types";

/** Mensajes seguidos de la misma persona (menos de 5 min) van juntos, sin repetir el nombre. */
const GROUP_MINUTES = 5;
const NEAR_BOTTOM_PX = 120;

const dayLabel = (date: string) => {
    const d = dayjs(date).locale("es");
    const today = dayjs();
    if (d.isSame(today, "day")) return "Hoy";
    if (d.isSame(today.subtract(1, "day"), "day")) return "Ayer";
    const text = d.format(d.year() === today.year() ? "dddd D [de] MMMM" : "D [de] MMMM [de] YYYY");
    return text.charAt(0).toUpperCase() + text.slice(1);
};

interface Props {
    messages: ChatMessage[];
    loading: boolean;
    userId: number;
    emptyText: string;
}

export const MessageList: FC<Props> = ({ messages, loading, userId, emptyText }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const atBottomRef = useRef(true);
    const shownRef = useRef(0);
    const [unseen, setUnseen] = useState(0);

    const scrollToBottom = useCallback((smooth = false) => {
        const el = scrollRef.current;
        if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
        atBottomRef.current = true;
        setUnseen(0);
    }, []);

    useLayoutEffect(() => {
        if (loading) return;
        const added = messages.length - shownRef.current;
        const first = shownRef.current === 0;
        shownRef.current = messages.length;
        if (added <= 0) return;
        const last = messages[messages.length - 1];
        const mine = last.mine ?? last.sender_id === userId;
        if (first || mine || atBottomRef.current) scrollToBottom(!first);
        else setUnseen((n) => n + added);
    }, [messages, loading, userId, scrollToBottom]);

    const onScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
        if (atBottomRef.current && unseen) setUnseen(0);
    };

    // Las fotos cargan después: si estabas abajo, se sigue abajo
    const onMediaLoad = useCallback(() => {
        if (atBottomRef.current) scrollToBottom();
    }, [scrollToBottom]);

    return (
        <Box sx={{ position: "relative", flex: 1, minHeight: 0, display: "flex" }}>
            <Box
                ref={scrollRef}
                onScroll={onScroll}
                role="log"
                aria-live="polite"
                aria-busy={loading}
                sx={{ flex: 1, overflowY: "auto", px: { xs: 1.5, sm: 2.5 }, py: 1.5, display: "flex", flexDirection: "column" }}
            >
                {loading ? (
                    <Stack spacing={1.5} sx={{ mt: 2 }} aria-label="Cargando mensajes">
                        {[60, 40, 70, 35].map((w, i) => (
                            <Skeleton key={i} variant="rounded" height={44} sx={{ width: `${w}%`, alignSelf: i % 2 ? "flex-end" : "flex-start", borderRadius: 2 }} />
                        ))}
                    </Stack>
                ) : messages.length === 0 ? (
                    <Box sx={{ m: "auto", textAlign: "center", color: "text.secondary", px: 2 }}>
                        <ForumRounded sx={{ fontSize: 40, opacity: 0.4 }} />
                        <Typography variant="body2" sx={{ mt: 1 }}>{emptyText}</Typography>
                    </Box>
                ) : (
                    messages.map((m, i) => {
                        const prev = messages[i - 1];
                        const newDay = !prev || !dayjs(prev.created_at).isSame(m.created_at, "day");
                        const firstInGroup = newDay || prev.sender_id !== m.sender_id || dayjs(m.created_at).diff(prev.created_at, "minute") >= GROUP_MINUTES;
                        return (
                            <Fragment key={m.id}>
                                {newDay && (
                                    <Chip label={dayLabel(m.created_at)} size="small" sx={{ alignSelf: "center", my: 1.5, fontWeight: 600, bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }} />
                                )}
                                <MessageBubble message={m} mine={m.mine ?? m.sender_id === userId} firstInGroup={firstInGroup} onMediaLoad={onMediaLoad} />
                            </Fragment>
                        );
                    })
                )}
            </Box>
            {unseen > 0 && (
                <Fab
                    size="small"
                    color="primary"
                    variant="extended"
                    onClick={() => scrollToBottom(true)}
                    sx={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", textTransform: "none", gap: 0.5 }}
                >
                    <KeyboardArrowDownRounded fontSize="small" />
                    {unseen === 1 ? "1 mensaje nuevo" : `${unseen} mensajes nuevos`}
                </Fab>
            )}
        </Box>
    );
};
