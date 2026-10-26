// Un hilo en la bandeja del chat interno: con quién, la orden, el último mensaje, la hora y los no leídos.
import { FC } from "react";
import { Avatar, Box, ListItemButton, Typography } from "@mui/material";
import { colorFor, Conversation, inboxTime, initials, orderLabel, partyLabel } from "./inbox";

interface Props {
    conversation: Conversation;
    selected: boolean;
    isAdmin: boolean;
    userId: number;
    onClick: () => void;
}

export const ConversationRow: FC<Props> = ({ conversation: c, selected, isAdmin, userId, onClick }) => {
    const party = partyLabel(c, isAdmin);
    const avatarName = c.counterpart?.name ?? c.agency?.name ?? party;
    const unread = c.unread > 0;
    const last = c.last_message;
    const preview = last ? `${last.sender_id === userId ? "Tú: " : ""}${last.body}` : "Sin mensajes todavía";

    return (
        <ListItemButton
            selected={selected}
            onClick={onClick}
            sx={{ gap: 1.5, py: 1.25, px: 1.5, alignItems: "flex-start", borderBottom: "1px solid", borderColor: "divider" }}
        >
            <Avatar sx={{ bgcolor: colorFor(avatarName), width: 42, height: 42, fontSize: "0.95rem", fontWeight: 700, mt: 0.25 }}>
                {initials(avatarName)}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
                <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
                    <Typography variant="body2" noWrap fontWeight={unread ? 800 : 600} sx={{ flex: 1, minWidth: 0 }}>
                        {orderLabel(c)} · {party}
                    </Typography>
                    <Typography variant="caption" sx={{ flexShrink: 0, color: unread ? "primary.main" : "text.secondary", fontWeight: unread ? 700 : 400 }}>
                        {inboxTime(c.last_message_at)}
                    </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.25 }}>
                    <Typography variant="caption" noWrap sx={{ flex: 1, minWidth: 0, color: unread ? "text.primary" : "text.secondary", fontWeight: unread ? 600 : 400 }}>
                        {preview}
                    </Typography>
                    {unread && (
                        <Box
                            aria-label={`${c.unread} sin leer`}
                            sx={{ flexShrink: 0, minWidth: 20, height: 20, px: 0.75, borderRadius: 10, bgcolor: "primary.main", color: "primary.contrastText", fontSize: "0.7rem", fontWeight: 700, display: "grid", placeItems: "center" }}
                        >
                            {c.unread}
                        </Box>
                    )}
                </Box>
                {c.client && (
                    <Typography variant="caption" color="text.disabled" noWrap display="block">Cliente: {c.client}</Typography>
                )}
            </Box>
        </ListItemButton>
    );
};
