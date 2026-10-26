import { useEffect, useState } from "react";
import { IconButton, Badge, Tooltip } from "@mui/material";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import { request } from "../../../common/request";
import { useSocketStore } from "../../../store/sockets/SocketStore";
import { useUserStore } from "../../../store/user/UserStore";
import { playNotificationSound } from "../../../lib/sound";

/**
 * Campanita del chat interno (vendedora <-> agencia).
 * Muestra el total de mensajes no leídos y escucha el canal personal del
 * usuario para incrementar en vivo. Solo aplica a Vendedor y Agencia.
 */
export const InternalChatBell = () => {
    const user = useUserStore((s) => s.user);
    const echo = useSocketStore((s) => s.echo);
    const setSocket = useSocketStore((s) => s.setSocket);
    const [unread, setUnread] = useState(0);

    const role = user.role?.description;
    const isParticipant = role === "Vendedor" || role === "Agencia";

    const fetchUnread = async () => {
        const { ok, response } = await request("/internal-chat/unread-count", "GET");
        if (ok) {
            const json = await response.json();
            setUnread(json.unread ?? 0);
        }
    };

    useEffect(() => {
        if (!isParticipant) return;
        fetchUnread();
        if (!echo) setSocket();
    }, [isParticipant]);

    useEffect(() => {
        if (!isParticipant || !echo || !user.id) return;

        const channelName = `App.Models.User.${user.id}`;
        const channel = echo.private(channelName);

        const onMessage = (e: any) => {
            // Ignorar mis propios mensajes
            if (e?.message?.sender_id === user.id) return;
            // Si ya estoy en la página del chat, dejo que la página gestione sonido/lectura
            if (window.location.pathname === "/internal-chat") return;
            playNotificationSound();
            setUnread((c) => c + 1);
        };

        channel.listen(".App\\Events\\InternalMessageSent", onMessage);
        channel.listen("InternalMessageSent", onMessage);

        return () => {
            echo.leave(channelName);
        };
    }, [echo, user.id, isParticipant]);

    if (!isParticipant) return null;

    return (
        <Tooltip title="Chat interno">
            <IconButton
                onClick={() => window.open("/internal-chat", "_blank")}
                sx={{
                    color: "inherit",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
                }}
            >
                <Badge badgeContent={unread} color="error">
                    <ForumRoundedIcon />
                </Badge>
            </IconButton>
        </Tooltip>
    );
};
