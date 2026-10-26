import { FC } from "react";
import { Box, Typography, Avatar, Badge, Chip, useTheme, alpha } from "@mui/material";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";

dayjs.extend(relativeTime);
dayjs.locale("es");

export interface CrmConversation {
    client_id: number;
    client_name: string;
    client_phone: string;
    agent_id: number | null;
    agent_name: string | null;
    is_lead: boolean;
    is_window_open: boolean;
    unread_count: number;
    last_message: string;
    last_message_at: string;
    last_message_type: string;
    conversation_bucket: "requires_attention" | "follow_up" | "closed";
    conversation_id: number | null;
    order: {
        id: number;
        order_number: string;
        status: string;
        status_id: number;
        products_summary: string;
        total_usd: number;
        total_ves: number;
        bcv_equivalence: number;
        agent_name: string | null;
        created_at: string;
        reset_count: number;
        location: string;
        address1: string | null;
        address2: string | null;
    } | null;
}

interface Props {
    conv: CrmConversation;
    isSelected: boolean;
    onClick: () => void;
}

const BUCKET_ACCENT: Record<string, string> = {
    requires_attention: "#ef4444",
    follow_up: "#f59e0b",
    closed: "#64748b",
};

const STATUS_BG: Record<string, { bg: string; color: string; darkBg: string; darkColor: string }> = {
    "Nuevo":              { bg: "#dbeafe", color: "#1d4ed8", darkBg: "#1e3a8a", darkColor: "#bfdbfe" },
    "En proceso":         { bg: "#ede9fe", color: "#6d28d9", darkBg: "#4c1d95", darkColor: "#ddd6fe" },
    "Entregado":          { bg: "#dcfce7", color: "#15803d", darkBg: "#14532d", darkColor: "#bbf7d0" },
    "Cancelado":          { bg: "#fee2e2", color: "#b91c1c", darkBg: "#7f1d1d", darkColor: "#fecaca" },
    "En ruta":            { bg: "#fef9c3", color: "#92400e", darkBg: "#713f12", darkColor: "#fef08a" },
    "Sin Stock":          { bg: "#ffedd5", color: "#c2410c", darkBg: "#7c2d12", darkColor: "#fed7aa" },
    "Novedades":          { bg: "#fce7f3", color: "#be185d", darkBg: "#831843", darkColor: "#fbcfe8" },
};

function stringToColor(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const colors = ["#6366f1","#8b5cf6","#ec4899","#14b8a6","#f59e0b","#10b981","#3b82f6","#ef4444"];
    return colors[Math.abs(hash) % colors.length];
}

export const CrmContactCard: FC<Props> = ({ conv, isSelected, onClick }) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    
    const initials = conv.client_name
        .split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";

    const timeAgo = conv.last_message_at ? dayjs(conv.last_message_at).fromNow(true) : "";
    const isIncoming = conv.last_message_type === "incoming_message";
    const accent = BUCKET_ACCENT[conv.conversation_bucket] ?? "#64748b";
    const hasUnread = conv.unread_count > 0;
    const avatarColor = stringToColor(conv.client_name || conv.client_phone);
    const statusStyle = STATUS_BG[conv.order?.status ?? ""] ?? null;

    return (
        <Box
            onClick={onClick}
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                px: 1.5,
                py: 1.5,
                cursor: "pointer",
                position: "relative",
                borderRadius: "12px",
                transition: "all 0.2s ease",
                bgcolor: isSelected
                    ? alpha(theme.palette.primary.main, 0.1)
                    : "transparent",
                "&:hover": {
                    bgcolor: isSelected
                        ? alpha(theme.palette.primary.main, 0.15)
                        : alpha(theme.palette.text.primary, 0.04),
                },
                // Borde izquierdo de bucket
                "&::before": {
                    content: '""',
                    position: "absolute",
                    left: 0,
                    top: "15%",
                    height: "70%",
                    width: isSelected || hasUnread ? 4 : 3,
                    borderRadius: "0 4px 4px 0",
                    bgcolor: accent,
                    opacity: isSelected || hasUnread ? 1 : (isDark ? 0.5 : 0.3),
                    transition: "all 0.2s",
                },
            }}
        >
            {/* Avatar */}
            <Badge
                badgeContent={conv.unread_count > 0 ? conv.unread_count : 0}
                max={99}
                sx={{
                    flexShrink: 0,
                    "& .MuiBadge-badge": {
                        bgcolor: "#ef4444",
                        color: "#fff",
                        fontSize: "0.6rem",
                        height: 18,
                        minWidth: 18,
                        fontWeight: 800,
                        boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
                        right: 2, // Adjusted for proper alignment
                        top: 2,
                    },
                }}
            >
                <Avatar
                    sx={{
                        width: 48,
                        height: 48,
                        fontSize: "1rem",
                        fontWeight: 700,
                        bgcolor: avatarColor,
                        boxShadow: hasUnread
                            ? `0 0 0 2px ${theme.palette.background.paper}, 0 0 0 4px ${accent}`
                            : "none",
                        transition: "box-shadow 0.2s",
                        letterSpacing: "-0.5px",
                    }}
                >
                    {initials}
                </Avatar>
            </Badge>

            {/* Contenido principal */}
            <Box sx={{ flexGrow: 1, minWidth: 0, ml: 0.5 }}>
                {/* Fila 1: nombre + tiempo */}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 0.3 }}>
                    <Typography
                        noWrap
                        sx={{
                            fontSize: "0.9rem",
                            fontWeight: hasUnread ? 800 : 600,
                            color: "text.primary",
                            maxWidth: "70%",
                            letterSpacing: "-0.2px",
                        }}
                    >
                        {conv.client_name || conv.client_phone}
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: "0.65rem",
                            color: hasUnread ? accent : "text.secondary",
                            fontWeight: hasUnread ? 800 : 500,
                            flexShrink: 0,
                            ml: 1,
                        }}
                    >
                        {timeAgo}
                    </Typography>
                </Box>

                {/* Fila 2: preview del último mensaje */}
                <Typography
                    noWrap
                    sx={{
                        fontSize: "0.78rem",
                        color: hasUnread ? "text.primary" : "text.secondary",
                        fontWeight: hasUnread ? 600 : 400,
                        mb: 0.8,
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        opacity: hasUnread ? 1 : 0.8,
                    }}
                >
                    {!isIncoming && (
                        <Box component="span" sx={{ color: "text.disabled", fontSize: "0.75rem", flexShrink: 0, fontWeight: 500 }}>Tú:</Box>
                    )}
                    <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {conv.last_message || "Sin mensajes"}
                    </Box>
                </Typography>

                {/* Fila 3: chips de estado */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, flexWrap: "nowrap", overflow: "hidden" }}>
                    {(conv.order?.agent_name || conv.agent_name) && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.3, bgcolor: alpha(theme.palette.info.main, 0.1), px: 0.8, py: 0.2, borderRadius: "6px" }}>
                            <Typography sx={{ fontSize: "0.6rem", color: "info.main", fontWeight: 800, flexShrink: 0, letterSpacing: "-0.2px" }}>
                                👤 {(conv.order?.agent_name || conv.agent_name)?.split(" ")[0]}
                            </Typography>
                        </Box>
                    )}
                    
                    {conv.is_lead ? (
                        <Chip
                            label="Lead"
                            size="small"
                            sx={{ height: 18, fontSize: "0.6rem", fontWeight: 800, bgcolor: isDark ? "#4c1d95" : "#ede9fe", color: isDark ? "#ddd6fe" : "#6d28d9", borderRadius: "6px" }}
                        />
                    ) : statusStyle ? (
                        <Chip
                            label={conv.order!.status}
                            size="small"
                            sx={{ height: 18, fontSize: "0.6rem", fontWeight: 800, bgcolor: isDark ? statusStyle.darkBg : statusStyle.bg, color: isDark ? statusStyle.darkColor : statusStyle.color, borderRadius: "6px" }}
                        />
                    ) : conv.order ? (
                        <Chip
                            label={conv.order.status}
                            size="small"
                            sx={{ height: 18, fontSize: "0.6rem", fontWeight: 800, bgcolor: alpha(theme.palette.text.primary, 0.1), borderRadius: "6px" }}
                        />
                    ) : null}

                    {!conv.is_window_open && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.3, bgcolor: alpha(theme.palette.warning.main, 0.1), px: 0.8, py: 0.2, borderRadius: "6px" }}>
                            <Typography sx={{ fontSize: "0.6rem", color: "warning.main", fontWeight: 800, flexShrink: 0, letterSpacing: "-0.2px" }}>
                                ⏱ 24h
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Box>
        </Box>
    );
};
