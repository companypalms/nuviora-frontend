import React from "react";
import { FC, useRef, useCallback, useState } from "react";
import {
    Box, Typography, TextField, InputAdornment, Divider,
    IconButton, Tooltip, CircularProgress, Button, Chip,
    useTheme, alpha, Select, MenuItem, FormControl,
    Menu, ListItemIcon, ListItemText
} from "@mui/material";
import {
    SearchRounded, RefreshRounded, WifiOffRounded,
    ErrorOutlineRounded, AccessTimeRounded, CheckCircleOutlineRounded,
    AllInclusiveRounded, ArrowBackRounded, SortRounded,
    MarkChatUnreadRounded, ScheduleRounded
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { CrmContactCard, CrmConversation } from "./CrmContactCard";

type BucketFilter = "all" | "requires_attention" | "follow_up" | "closed";

interface Props {
    conversations: CrmConversation[];
    selected: CrmConversation | null;
    onSelect: (conv: CrmConversation) => void;
    loading: boolean;
    searchTerm: string;
    onSearchChange: (val: string) => void;
    bucket: BucketFilter;
    onBucketChange: (b: BucketFilter) => void;
    bucketCounts: Record<string, number>;
    hasMore: boolean;
    onLoadMore: () => void;
    isOffline: boolean;
    onRefresh: () => void;
    isAdmin?: boolean;
    agents?: any[];
    agentId?: string;
    onAgentChange?: (id: string) => void;
    /** La Líder: elegir sus chats, los de su grupo o los de una vendedora (Fran, 2026-10-02). */
    leaderSlot?: React.ReactNode;
    sortBy: "latency" | "unread";
    onSortChange: (s: "latency" | "unread") => void;
}

const BUCKET_TABS: { key: BucketFilter; label: string; color: string; icon: any }[] = [
    { key: "requires_attention", label: "Atención", color: "#ef4444", icon: ErrorOutlineRounded },
    { key: "follow_up",          label: "Seguimiento", color: "#f59e0b", icon: AccessTimeRounded },
    { key: "closed",             label: "Cerrados",    color: "#64748b", icon: CheckCircleOutlineRounded },
    { key: "all",                label: "Todos",       color: "#3b82f6", icon: AllInclusiveRounded },
];

export const CrmSidebar: FC<Props> = ({
    conversations,
    selected,
    onSelect,
    loading,
    searchTerm,
    onSearchChange,
    bucket,
    onBucketChange,
    bucketCounts,
    hasMore,
    onLoadMore,
    isOffline,
    onRefresh,
    isAdmin,
    agents,
    agentId,
    onAgentChange,
    leaderSlot,
    sortBy,
    onSortChange,
}) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const listRef = useRef<HTMLDivElement>(null);

    const [sortMenuAnchor, setSortMenuAnchor] = useState<null | HTMLElement>(null);

    const handleScroll = useCallback(() => {
        const el = listRef.current;
        if (!el || !hasMore || loading) return;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
            onLoadMore();
        }
    }, [hasMore, loading, onLoadMore]);

    const totalUnread = bucketCounts.requires_attention ?? 0;

    return (
        <Box
            sx={{
                width: { xs: "100%", md: 340 },
                flexShrink: 0,
                borderRight: "1px solid",
                borderColor: "divider",
                display: "flex",
                flexDirection: "column",
                height: "100%",
                bgcolor: "background.paper",
                zIndex: 10,
            }}
        >
            {/* ── HEADER ───────────────────────────────────────────────── */}
            <Box
                sx={{
                    px: 2.5,
                    py: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: "-0.5px" }}>
                        WhatsApp CRM
                    </Typography>
                    {totalUnread > 0 && (
                        <Chip
                            label={totalUnread}
                            size="small"
                            sx={{
                                height: 22,
                                fontSize: "0.75rem",
                                fontWeight: 800,
                                bgcolor: "#ef4444",
                                color: "white",
                                borderRadius: "6px",
                            }}
                        />
                    )}
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    {isOffline && (
                        <Tooltip title="Sin conexión — Reconectando...">
                            <WifiOffRounded fontSize="small" color="warning" />
                        </Tooltip>
                    )}
                    
                    {isAdmin && (
                        <Tooltip title="Gestionar Turnos / Roster">
                            <IconButton 
                                size="small" 
                                onClick={() => navigate("/roster")} 
                                sx={{ 
                                    bgcolor: alpha(theme.palette.secondary.main, 0.1),
                                    color: "secondary.main",
                                    "&:hover": { bgcolor: alpha(theme.palette.secondary.main, 0.2) }
                                }}
                            >
                                <AccessTimeRounded fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}

                    <Tooltip title="Refrescar lista">
                        <IconButton size="small" onClick={onRefresh} disabled={loading} sx={{ bgcolor: alpha(theme.palette.text.primary, 0.05) }}>
                            {loading ? (
                                <CircularProgress size={18} />
                            ) : (
                                <RefreshRounded fontSize="small" />
                            )}
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Volver a Pedidos">
                        <Button 
                            variant="outlined" 
                            size="small" 
                            onClick={() => navigate("/orders")}
                            startIcon={<ArrowBackRounded fontSize="small" />}
                            sx={{ 
                                borderRadius: "8px", 
                                fontSize: "0.7rem", 
                                fontWeight: 700, 
                                textTransform: "none",
                                py: 0.5,
                                borderColor: "divider",
                                color: "text.primary"
                            }}
                        >
                            Pedidos
                        </Button>
                    </Tooltip>
                </Box>
            </Box>

            {/* ── BÚSQUEDA Y FILTROS ───────────────────────────────────── */}
            <Box sx={{ px: 2, py: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Buscar por nombre, teléfono o nº ord"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    variant="outlined"
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchRounded fontSize="small" color="action" />
                            </InputAdornment>
                        ),
                        sx: { 
                            borderRadius: "10px", 
                            fontSize: "0.85rem",
                            bgcolor: alpha(theme.palette.background.default, 0.6),
                            "& fieldset": { borderColor: "transparent" },
                            "&:hover fieldset": { borderColor: "divider" },
                            "&.Mui-focused fieldset": { borderColor: "primary.main" }
                        },
                    }}
                />
                
                {!isAdmin && leaderSlot}

                {isAdmin && agents && onAgentChange && (
                    <FormControl size="small" fullWidth>
                        <Select
                            displayEmpty
                            value={agentId || ""}
                            onChange={(e) => onAgentChange(e.target.value)}
                            sx={{
                                borderRadius: "10px",
                                fontSize: "0.8rem",
                                bgcolor: alpha(theme.palette.background.default, 0.6),
                                "& fieldset": { borderColor: "transparent" },
                                "&:hover fieldset": { borderColor: "divider" },
                                "&.Mui-focused fieldset": { borderColor: "primary.main" },
                                "& .MuiSelect-select": { py: 1 }
                            }}
                        >
                            <MenuItem value="">
                                <Typography variant="body2" fontSize="0.8rem" color="text.secondary" fontWeight={600}>
                                    Todos los agentes
                                </Typography>
                            </MenuItem>
                            {Array.isArray(agents) && (agents as any[]).map((a: any) => (
                                <MenuItem key={a.id} value={a.id}>
                                    <Typography variant="body2" fontSize="0.8rem" fontWeight={700}>
                                        {a.names}
                                    </Typography>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}

                {/* Botón de Ordenar — visible para TODOS los usuarios */}
                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <Tooltip title="Ordenar por...">
                        <IconButton 
                            size="small" 
                            onClick={(e) => setSortMenuAnchor(e.currentTarget)}
                            sx={{ 
                                borderRadius: "10px", 
                                bgcolor: alpha(theme.palette.background.default, 0.6),
                                border: "1px solid",
                                borderColor: sortBy !== "latency" ? "primary.main" : "transparent",
                                "&:hover": { bgcolor: alpha(theme.palette.text.primary, 0.05) }
                            }}
                        >
                            <SortRounded fontSize="small" color={sortBy !== "latency" ? "primary" : "inherit"} />
                        </IconButton>
                    </Tooltip>

                    <Menu
                        anchorEl={sortMenuAnchor}
                        open={Boolean(sortMenuAnchor)}
                        onClose={() => setSortMenuAnchor(null)}
                        PaperProps={{ sx: { borderRadius: "12px", minWidth: 200, boxShadow: theme.shadows[10], mt: 1 } }}
                    >
                        <Typography variant="caption" sx={{ px: 2, py: 1, display: "block", fontWeight: 800, color: "text.secondary", textTransform: "uppercase" }}>
                            Ordenar chats por:
                        </Typography>
                        <MenuItem 
                            onClick={() => { onSortChange("latency"); setSortMenuAnchor(null); }} 
                            selected={sortBy === "latency"}
                            sx={{ py: 1.2 }}
                        >
                            <ListItemIcon><ScheduleRounded fontSize="small" /></ListItemIcon>
                            <ListItemText primary="Orden de llegada" secondary="Más recientes primero" primaryTypographyProps={{ variant: "body2", fontWeight: 700 }} secondaryTypographyProps={{ variant: "caption" }} />
                        </MenuItem>
                        <MenuItem 
                            onClick={() => { onSortChange("unread"); setSortMenuAnchor(null); }} 
                            selected={sortBy === "unread"}
                            sx={{ py: 1.2 }}
                        >
                            <ListItemIcon><MarkChatUnreadRounded fontSize="small" color="error" /></ListItemIcon>
                            <ListItemText primary="No leídos" secondary="Más urgentes primero" primaryTypographyProps={{ variant: "body2", fontWeight: 700 }} secondaryTypographyProps={{ variant: "caption" }} />
                        </MenuItem>
                    </Menu>
                </Box>
            </Box>

            {/* ── TABS DE BUCKET ───────────────────────────────────────── */}
            <Box
                sx={{
                    display: "flex",
                    px: 1,
                    pb: 1,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    gap: 0.5,
                }}
            >
                {BUCKET_TABS.map((tab) => {
                    const count = tab.key !== "all" ? (bucketCounts[tab.key] ?? 0) : undefined;
                    const isActive = bucket === tab.key;
                    const Icon = tab.icon;
                    
                    return (
                        <Box
                            key={tab.key}
                            onClick={() => onBucketChange(tab.key)}
                            sx={{
                                flex: 1,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                py: 1,
                                px: 0.5,
                                cursor: "pointer",
                                borderRadius: "8px",
                                bgcolor: isActive ? alpha(tab.color, 0.12) : "transparent",
                                color: isActive ? tab.color : "text.secondary",
                                transition: "all 0.2s ease",
                                "&:hover": { 
                                    bgcolor: isActive ? alpha(tab.color, 0.15) : alpha(theme.palette.text.primary, 0.04) 
                                },
                            }}
                        >
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.2 }}>
                                <Icon sx={{ fontSize: "1rem" }} />
                                {count !== undefined && count > 0 && (
                                    <Typography
                                        sx={{
                                            fontSize: "0.7rem",
                                            fontWeight: 800,
                                            lineHeight: 1,
                                            bgcolor: isActive ? tab.color : alpha(theme.palette.text.primary, 0.2),
                                            color: isActive ? "#fff" : "text.primary",
                                            px: 0.6,
                                            py: 0.2,
                                            borderRadius: "10px",
                                        }}
                                    >
                                        {count}
                                    </Typography>
                                )}
                            </Box>
                            <Typography
                                sx={{ 
                                    fontSize: "0.65rem", 
                                    fontWeight: isActive ? 700 : 500,
                                    letterSpacing: "-0.2px"
                                }}
                            >
                                {tab.label}
                            </Typography>
                        </Box>
                    );
                })}
            </Box>

            {/* ── LISTA DE CONVERSACIONES ──────────────────────────────── */}
            <Box
                ref={listRef}
                onScroll={handleScroll}
                sx={{
                    flexGrow: 1,
                    overflowY: "auto",
                    overflowX: "hidden", // Fix badges being cut off horizontally
                    pt: 1,
                    pb: 2,
                    "&::-webkit-scrollbar": { width: 5 },
                    "&::-webkit-scrollbar-thumb": {
                        bgcolor: alpha(theme.palette.text.primary, 0.15),
                        borderRadius: 4,
                    },
                    "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
                }}
            >
                {loading && conversations.length === 0 ? (
                    <Box sx={{ display: "flex", justifyContent: "center", pt: 6 }}>
                        <CircularProgress size={28} />
                    </Box>
                ) : conversations.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <Box sx={{ p: 2, borderRadius: "50%", bgcolor: alpha(theme.palette.text.primary, 0.05) }}>
                            <SearchRounded sx={{ fontSize: 32, color: "text.disabled" }} />
                        </Box>
                        <Typography variant="body2" color="text.secondary" fontWeight={500}>
                            {searchTerm
                                ? "Sin resultados para esa búsqueda."
                                : "No hay conversaciones en esta pestaña."}
                        </Typography>
                    </Box>
                ) : (
                    conversations.map((conv, idx) => (
                        <Box key={conv.client_id} sx={{ px: 1, mb: 0.5 }}>
                            <CrmContactCard
                                conv={conv}
                                isSelected={selected?.client_id === conv.client_id}
                                onClick={() => onSelect(conv)}
                            />
                        </Box>
                    ))
                )}

                {hasMore && !loading && (
                    <Box sx={{ p: 2, textAlign: "center" }}>
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={onLoadMore}
                            sx={{ borderRadius: "8px", fontSize: "0.75rem", textTransform: "none", fontWeight: 600 }}
                        >
                            Cargar más chats
                        </Button>
                    </Box>
                )}
                {loading && conversations.length > 0 && (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                        <CircularProgress size={22} />
                    </Box>
                )}
            </Box>
        </Box>
    );
};
