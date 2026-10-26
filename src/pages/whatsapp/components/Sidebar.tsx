import { FC, useState } from "react";
import {
    Box, Typography, List, ListItemButton, Avatar, Badge,
    Chip, TextField, InputAdornment, Divider, Button, Tooltip
} from "@mui/material";
import {
    SearchRounded, ArrowBackRounded,
    ErrorOutlineRounded,
    HourglassTopRounded,
    CheckCircleOutlineRounded,
    ChatBubbleRounded,
    WifiRounded, WifiOffRounded, SyncRounded,
    PriorityHighRounded,
} from "@mui/icons-material";
import { Tabs, Tab } from "@mui/material";
import { ContactData, ConversationBucket, ConnectionStatus } from "../WhatsAppPage";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { ShiftManagement } from "./ShiftManagement";
import { useUserStore } from "../../../store/user/UserStore";
import { orderNo } from "../../../lib/functions";

// ─── Nivel 3 Crítico: umbral de minutos sin respuesta ─────────────────────────
const CRITICAL_THRESHOLD_MINUTES = 30;

/**
 * Devuelve true si el chat requiere acción Y lleva más de 30 min esperando.
 * Cálculo puramente en frontend — sin necesidad de backend.
 */
function isCritical(contact: ContactData): boolean {
    if (contact.conversation_bucket !== 'requires_attention') return false;
    if (!contact.last_message_date) return false;
    const diffMs = Date.now() - new Date(contact.last_message_date).getTime();
    return diffMs > CRITICAL_THRESHOLD_MINUTES * 60 * 1000;
}

// ─── Bucket config ────────────────────────────────────────────────────────────
const BUCKET_CONFIG = {
    all: { label: 'Todos', Icon: ChatBubbleRounded, dotColor: 'transparent' },
    requires_attention: { label: 'Requieren atención', Icon: ErrorOutlineRounded, dotColor: '#f44336' },
    follow_up: { label: 'En seguimiento', Icon: HourglassTopRounded, dotColor: '#ff9800' },
    closed: { label: 'Cerrados', Icon: CheckCircleOutlineRounded, dotColor: '#4caf50' },
} as const;

// ─── Connection status config ─────────────────────────────────────────────────
const CONNECTION_CONFIG: Record<ConnectionStatus, { label: string; color: string; Icon: any }> = {
    connected:    { label: 'Conectado',     color: '#4caf50', Icon: WifiRounded },
    reconnecting: { label: 'Reconectando…', color: '#ff9800', Icon: SyncRounded },
    disconnected: { label: 'Desconectado',  color: '#f44336', Icon: WifiOffRounded },
};

interface SidebarProps {
    contacts: ContactData[];
    selectedContact: ContactData | null;
    onSelect: (contact: ContactData) => void;
    searchTerm: string;
    onSearchChange: (value: string) => void;
    bucket: ConversationBucket | 'all';
    onBucketChange: (value: ConversationBucket | 'all') => void;
    hasMore: boolean;
    onLoadMore: () => void;
    connectionStatus: ConnectionStatus;
    // Nuevos filtros
    sortBy: string;
    onSortChange: (val: string) => void;
    agentId: string | number;
    onAgentChange: (val: string) => void;
    startDate: string;
    onStartDateChange: (val: string) => void;
    endDate: string;
    onEndDateChange: (val: string) => void;
    agents: any[];
    serverBucketCounts?: Record<string, number>;
    serverCriticalCount?: number;
}

export const Sidebar: FC<SidebarProps> = ({
    contacts,
    selectedContact,
    onSelect,
    searchTerm,
    onSearchChange,
    bucket,
    onBucketChange,
    hasMore,
    onLoadMore,
    connectionStatus,
    sortBy,
    onSortChange,
    agentId,
    onAgentChange,
    startDate,
    onStartDateChange,
    endDate,
    onEndDateChange,
    agents,
    serverBucketCounts,
    serverCriticalCount,
}) => {
    const user = useUserStore(state => state.user);
    const navigate = useNavigate();
    const [openShift, setOpenShift] = useState(false);
    const isAdmin = ['Admin', 'Manager', 'Gerente', 'Master'].includes(user.role?.description || '');

    const connInfo = CONNECTION_CONFIG[connectionStatus];
    const ConnIcon = connInfo.Icon;

    // Usar contadores del servidor si estan disponibles (precisos)
    // Si no, calcular desde los contactos visibles (fallback)
    const bucketCounts = serverBucketCounts && Object.keys(serverBucketCounts).length > 0
        ? serverBucketCounts
        : contacts.reduce((acc, c) => {
            acc[c.conversation_bucket] = (acc[c.conversation_bucket] ?? 0) + 1;
            return acc;
        }, {} as Record<string, number>);

    const criticalCount = serverCriticalCount !== undefined
        ? serverCriticalCount
        : contacts.filter(isCritical).length;

    return (
        <Box
            sx={{
                width: { xs: '100%', md: 320 },
                flexShrink: 0,
                borderRight: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                display: { xs: selectedContact ? 'none' : 'flex', md: 'flex' },
                flexDirection: 'column'
            }}
        >
            {user.is_lite_view && (
                <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                    <Button
                        startIcon={<ArrowBackRounded />}
                        fullWidth
                        onClick={() => navigate('/dashboard')}
                        sx={{ textTransform: 'none', justifyContent: 'start', fontWeight: 'bold', borderRadius: 2, color: 'text.secondary' }}
                    >
                        Volver al Panel
                    </Button>
                </Box>
            )}

            {/* Header */}
            <Box sx={{ p: 2, pb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6" fontWeight="bold">Mensajes</Typography>
                        <Tooltip title={connInfo.label} placement="right">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                                <ConnIcon
                                    sx={{
                                        fontSize: '0.9rem',
                                        color: connInfo.color,
                                        animation: connectionStatus === 'reconnecting' ? 'spin 1.2s linear infinite' : 'none',
                                        '@keyframes spin': {
                                            from: { transform: 'rotate(0deg)' },
                                            to: { transform: 'rotate(360deg)' },
                                        },
                                    }}
                                />
                                {connectionStatus !== 'connected' && (
                                    <Typography variant="caption" sx={{ color: connInfo.color, fontSize: '0.65rem', fontWeight: 'bold' }}>
                                        {connInfo.label}
                                    </Typography>
                                )}
                            </Box>
                        </Tooltip>
                    </Box>

                    {isAdmin && (
                        <Button size="small" variant="outlined" onClick={() => setOpenShift(true)}
                            sx={{ borderRadius: 4, textTransform: 'none', px: 1.5 }}>
                            Turnos
                        </Button>
                    )}
                </Box>
                <ShiftManagement open={openShift} onClose={() => setOpenShift(false)} />

                {/* ── Nivel 3 CRÍTICO: banner pulsante cuando hay chats esperando mucho ── */}
                {criticalCount > 0 && (
                    <Box
                        onClick={() => onBucketChange('requires_attention')}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            px: 1.5,
                            py: 0.8,
                            mb: 1,
                            borderRadius: 2,
                            bgcolor: 'rgba(211,47,47,0.10)',
                            border: '1.5px solid rgba(211,47,47,0.35)',
                            cursor: 'pointer',
                            animation: 'criticalBorder 2s ease-in-out infinite',
                            '@keyframes criticalBorder': {
                                '0%, 100%': { borderColor: 'rgba(211,47,47,0.35)' },
                                '50%':      { borderColor: 'rgba(211,47,47,0.9)' },
                            },
                            '&:hover': { bgcolor: 'rgba(211,47,47,0.18)' },
                        }}
                    >
                        <PriorityHighRounded sx={{ color: '#d32f2f', fontSize: '1rem', flexShrink: 0 }} />
                        <Typography variant="caption" sx={{ color: '#d32f2f', fontWeight: 'bold', flexGrow: 1, lineHeight: 1.3 }}>
                            {criticalCount === 1
                                ? `1 chat lleva +${CRITICAL_THRESHOLD_MINUTES} min sin respuesta`
                                : `${criticalCount} chats llevan +${CRITICAL_THRESHOLD_MINUTES} min sin respuesta`}
                        </Typography>
                    </Box>
                )}

                <TextField
                    fullWidth size="small"
                    placeholder="Buscar o empezar un chat"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchRounded fontSize="small" sx={{ opacity: 0.6 }} />
                                </InputAdornment>
                            ),
                            sx: { borderRadius: 3, bgcolor: 'action.hover', '& fieldset': { border: 'none' } }
                        }
                    }}
                />

                {/* --- NUEVOS FILTROS (Kid-friendly / CEO style) --- */}
                <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ flexGrow: 1, minWidth: '45%' }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', ml: 0.5, color: 'text.secondary' }}>
                            Ordenar por:
                        </Typography>
                        <TextField
                            select
                            fullWidth
                            size="small"
                            value={sortBy}
                            onChange={(e) => onSortChange(e.target.value)}
                            SelectProps={{ native: true }}
                            sx={{ '& .MuiInputBase-root': { borderRadius: 2, fontSize: '0.75rem', bgcolor: 'rgba(0,0,0,0.03)' } }}
                        >
                            <option value="latency">Orden de llegada</option>
                            <option value="messages_count">Cantidad de mensajes</option>
                        </TextField>
                    </Box>

                    {isAdmin && (
                        <Box sx={{ flexGrow: 1, minWidth: '45%' }}>
                            <Typography variant="caption" sx={{ fontWeight: 'bold', ml: 0.5, color: 'text.secondary' }}>
                                Vendedora:
                            </Typography>
                            <TextField
                                select
                                title="Filtrar por vendedora"
                                fullWidth
                                size="small"
                                value={agentId || ""}
                                onChange={(e) => onAgentChange(e.target.value)}
                                SelectProps={{ native: true }}
                                sx={{ '& .MuiInputBase-root': { borderRadius: 2, fontSize: '0.75rem', bgcolor: 'rgba(0,0,0,0.03)' } }}
                            >
                                <option value="">Todas</option>
                                {agents.map((a: any) => (
                                    <option key={a.id} value={a.id}>{a.names}</option>
                                ))}
                            </TextField>
                        </Box>
                    )}

                    <Box sx={{ flexGrow: 1, minWidth: '100%' }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', ml: 0.5, color: 'text.secondary' }}>
                            Fecha interacción:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <TextField
                                type="date"
                                size="small"
                                fullWidth
                                value={startDate}
                                onChange={(e) => onStartDateChange(e.target.value)}
                                sx={{ '& .MuiInputBase-root': { borderRadius: 2, fontSize: '0.7rem' } }}
                            />
                            <TextField
                                type="date"
                                size="small"
                                fullWidth
                                value={endDate}
                                onChange={(e) => onEndDateChange(e.target.value)}
                                sx={{ '& .MuiInputBase-root': { borderRadius: 2, fontSize: '0.7rem' } }}
                            />
                        </Box>
                    </Box>
                </Box>
            </Box>

            {/* Bucket tabs */}
            <Tabs
                value={bucket}
                onChange={(_, val) => onBucketChange(val)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                    minHeight: 44,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '& .MuiTab-root': {
                        textTransform: 'none', fontSize: '0.72rem', fontWeight: 'bold',
                        minWidth: 0, px: 1.2, gap: 0.4, minHeight: 44,
                    }
                }}
            >
                <Tab value="all" label="Todos"
                    icon={<ChatBubbleRounded sx={{ fontSize: '0.9rem' }} />}
                    iconPosition="start"
                />
                <Tab
                    value="requires_attention"
                    label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            Atención
                            {(bucketCounts.requires_attention ?? 0) > 0 && (
                                <Chip
                                    label={bucketCounts.requires_attention}
                                    size="small"
                                    sx={{
                                        height: 16, fontSize: '0.6rem', fontWeight: 'bold',
                                        bgcolor: criticalCount > 0 ? '#b71c1c' : '#f44336',
                                        color: '#fff',
                                        // Badge pulsante si hay críticos
                                        animation: criticalCount > 0 ? 'badgePulse 1.5s ease-in-out infinite' : 'none',
                                        '@keyframes badgePulse': {
                                            '0%, 100%': { transform: 'scale(1)' },
                                            '50%': { transform: 'scale(1.25)' },
                                        },
                                    }}
                                />
                            )}
                        </Box>
                    }
                    icon={
                        <ErrorOutlineRounded sx={{
                            fontSize: '0.9rem',
                            color: criticalCount > 0 ? '#b71c1c' : '#f44336',
                        }} />
                    }
                    iconPosition="start"
                />
                <Tab value="follow_up" label="Seguimiento"
                    icon={<HourglassTopRounded sx={{ fontSize: '0.9rem', color: '#ff9800' }} />}
                    iconPosition="start"
                />
                <Tab value="closed" label="Cerrados"
                    icon={<CheckCircleOutlineRounded sx={{ fontSize: '0.9rem', color: '#4caf50' }} />}
                    iconPosition="start"
                />
            </Tabs>

            <Divider />

            {/* Contact list */}
            <List sx={{ flexGrow: 1, overflowY: 'auto', p: 0 }}>
                {contacts.map(contact => {
                    const bucketDotColor = BUCKET_CONFIG[contact.conversation_bucket]?.dotColor ?? 'transparent';
                    const isSelected     = selectedContact?.id === contact.id;
                    const critical       = isCritical(contact);

                    return (
                        <ListItemButton
                            key={contact.id}
                            selected={isSelected}
                            onClick={() => onSelect(contact)}
                            sx={{
                                p: 0,
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                                position: 'relative',
                                overflow: 'hidden',
                                // ── Nivel 3 Crítico: fondo levemente pulsante ──
                                ...(critical && !isSelected && {
                                    animation: 'rowCritical 2.5s ease-in-out infinite',
                                    '@keyframes rowCritical': {
                                        '0%, 100%': { backgroundColor: 'rgba(211,47,47,0.05)' },
                                        '50%':      { backgroundColor: 'rgba(211,47,47,0.13)' },
                                    },
                                }),
                                '&.Mui-selected': {
                                    bgcolor: 'primary.light',
                                    color: 'primary.contrastText',
                                    '&:hover': { bgcolor: 'primary.main' }
                                }
                            }}
                        >
                            {/* Stripe lateral — más gruesa y rojo oscuro en críticos */}
                            <Box sx={{
                                width: critical ? 6 : 4,
                                alignSelf: 'stretch',
                                bgcolor: critical ? '#b71c1c' : bucketDotColor,
                                flexShrink: 0,
                                opacity: isSelected ? 0.6 : 1,
                                transition: 'width 0.2s, background-color 0.2s',
                            }} />

                            <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', width: '100%', gap: 1.5 }}>
                                <Badge color="error" badgeContent={contact.unread_count} invisible={contact.unread_count === 0}>
                                    <Avatar sx={{
                                        bgcolor: contact.type === 'lead' ? 'secondary.main' : 'primary.main',
                                        fontWeight: 'bold', width: 40, height: 40, fontSize: '1rem'
                                    }}>
                                        {contact.name.charAt(0)}
                                    </Avatar>
                                </Badge>

                                <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.3 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, overflow: 'hidden' }}>
                                            {/* Ícono de alerta en el nombre para críticos */}
                                            {critical && (
                                                <Tooltip title={`Sin respuesta hace más de ${CRITICAL_THRESHOLD_MINUTES} min`} placement="right">
                                                    <PriorityHighRounded sx={{ fontSize: '0.85rem', color: '#d32f2f', flexShrink: 0 }} />
                                                </Tooltip>
                                            )}
                                            <Typography variant="subtitle2" fontWeight="bold" noWrap
                                                sx={{ color: critical && !isSelected ? '#d32f2f' : 'inherit' }}>
                                                {contact.name}
                                            </Typography>
                                        </Box>
                                        <Typography variant="caption" sx={{ opacity: 0.7, whiteSpace: 'nowrap', ml: 1 }}>
                                            {dayjs(contact.last_message_date).format('HH:mm')}
                                        </Typography>
                                    </Box>

                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.1 }}>
                                        <Typography variant="body2" sx={{
                                            opacity: contact.last_message_type === 'incoming_message' ? 1 : 0.65,
                                            fontWeight: contact.last_message_type === 'incoming_message' && contact.unread_count > 0 ? 'bold' : 'normal',
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180,
                                        }}>
                                            {contact.last_message_type === 'outgoing_automated_message' && (
                                                <Box component="span" sx={{ opacity: 0.5, mr: 0.3 }}>🤖</Box>
                                            )}
                                            {contact.last_message}
                                        </Typography>

                                        {contact.products_summary && (
                                            <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 'bold', fontSize: '0.65rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                🛒 {contact.products_summary}
                                            </Typography>
                                        )}
                                        
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.2 }}>
                                            {(contact.total_ves ?? 0) > 0 && (
                                                <Typography variant="caption" sx={{ fontWeight: 'bold', bgcolor: 'rgba(76,175,80,0.1)', color: '#2e7d32', px: 0.5, borderRadius: 1, fontSize: '0.65rem' }}>
                                                    {new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(contact.total_ves ?? 0)}
                                                </Typography>
                                            )}
                                            
                                            {contact.type === 'lead' || !contact.context.order?.name ? (
                                                <Chip label="Lead" size="small" color="secondary"
                                                    sx={{ height: 16, fontSize: '0.6rem', fontWeight: 'bold', flexShrink: 0 }} />
                                            ) : (
                                                <Chip
                                                    label={`${orderNo(contact.context.order.name)}`}
                                                    size="small" color="primary" variant="outlined"
                                                    sx={{ height: 16, fontSize: '0.6rem', fontWeight: 'bold', borderColor: 'currentColor', color: 'inherit', flexShrink: 0 }}
                                                />
                                            )}
                                        </Box>
                                    </Box>
                                </Box>
                            </Box>
                        </ListItemButton>
                    );
                })}

                {hasMore && (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                        <Button onClick={onLoadMore} fullWidth size="small" variant="text"
                            sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                            Cargar más chats…
                        </Button>
                    </Box>
                )}

                {contacts.length === 0 && (
                    <Box sx={{ p: 4, textAlign: 'center', opacity: 0.5 }}>
                        <Typography variant="body2">No hay chats en este filtro</Typography>
                    </Box>
                )}
            </List>
        </Box>
    );
};
