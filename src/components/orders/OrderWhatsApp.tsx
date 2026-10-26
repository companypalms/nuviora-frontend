import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Box, TextField, IconButton, Typography, CircularProgress, Paper, Button, LinearProgress, Tooltip, Link } from '@mui/material';
import { SendRounded, AutoAwesomeRounded, AttachFileRounded, WhatsApp as WhatsAppIcon, VerifiedRounded, LockRounded, LockOpenRounded } from '@mui/icons-material';
import { request } from '../../common/request';
import { WHATSAPP_ACCEPT, whatsappFileTooBig, readUploadError } from '../../common/whatsappMedia';
import { toast } from 'react-toastify';
import { useSocketStore } from '../../store/sockets/SocketStore';
import { useUserStore } from '../../store/user/UserStore';
import { Avatar, Badge, Dialog, DialogTitle, DialogContent, List, ListItem, ListItemText, ListItemButton, Divider } from '@mui/material';
import { useOrdersStore } from '../../store/orders/OrdersStore';
import { DeliveryFailure, DeliveryTicks } from '../whatsapp/MessageDelivery';
import { DeliveryInfo, undeliveredOutline, withDelivery } from '../../common/whatsappDelivery';

// ─── 24-hour window helpers ────────────────────────────────────────────────────
const WINDOW_MS = 24 * 60 * 60 * 1000; // 86 400 000 ms

/** Returns ms remaining in the Meta 24-h window, or 0 if closed / never opened. */
function getWindowMsLeft(lastClientMsgAt: string | null | undefined): number {
    if (!lastClientMsgAt) return 0;
    const elapsed = Date.now() - new Date(lastClientMsgAt).getTime();
    return Math.max(0, WINDOW_MS - elapsed);
}

/** Formats ms into "HH h MM m SS s" or "Cerrada". */
function formatCountdown(ms: number): string {
    if (ms <= 0) return 'Cerrada';
    const totalSecs = Math.floor(ms / 1000);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

// ─── Component ─────────────────────────────────────────────────────────────────
const extractVars = (tpl: any) => {
    const allText = [
        tpl.body,
        ...(tpl.meta_components || []).map((c: any) => c.text || '')
    ].join(' ');
    const matches = allText.match(/\{\{(\d+)\}\}/g);
    if (!matches) return [];
    const nums = matches.map(m => parseInt(m.match(/\d+/)![0]));
    return [...new Set(nums)].sort((a, b) => a - b);
};

export const OrderWhatsApp = ({ orderId }: { orderId: number }) => {
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [templates, setTemplates] = useState<any[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);

    // 24-h window state
    const [windowMsLeft, setWindowMsLeft] = useState<number>(0);
    const windowTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const user = useUserStore((s) => s.user);
    const echo = useSocketStore((s) => s.echo);
    const { selectedOrder: order, updateOrderInColumns } = useOrdersStore();

    // Move clientName up here so the WebSocket closure can capture it safely
    const clientName  = order?.client?.first_name ? `${order.client.first_name} ${order.client.last_name || ''}` : 'Cliente';

    // Ref to track latest order without rebinding websocket listeners
    const orderRef = useRef(order);
    useEffect(() => {
        orderRef.current = order;
    }, [order]);

    const windowOpen = windowMsLeft > 0;
    const windowPct  = (windowMsLeft / WINDOW_MS) * 100;

    // ── Window timer ──────────────────────────────────────────────────────────
    const startWindowTimer = useCallback((lastAt: string | null | undefined) => {
        if (windowTimerRef.current) clearInterval(windowTimerRef.current);

        setWindowMsLeft(getWindowMsLeft(lastAt));

        if (!lastAt) return;

        windowTimerRef.current = setInterval(() => {
            const msLeft = getWindowMsLeft(lastAt);
            setWindowMsLeft(msLeft);
            if (msLeft <= 0 && windowTimerRef.current) {
                clearInterval(windowTimerRef.current);
            }
        }, 1000);
    }, []);

    // Recalculate when order client data changes
    useEffect(() => {
        const lastAt = order?.client?.last_whatsapp_received_at ?? null;
        startWindowTimer(lastAt);
        return () => {
            if (windowTimerRef.current) clearInterval(windowTimerRef.current);
        };
    }, [order?.client?.last_whatsapp_received_at, startWindowTimer]);

    // ── Channel helper ────────────────────────────────────────────────────────
    const getChannelName = () => {
        const roleDesc = user.role?.description?.toLowerCase() || '';
        let channelName = 'orders';

        if (roleDesc.includes('agencia')) {
            channelName = `orders.agency.${user.id}`;
        } else if (roleDesc.includes('vendedor')) {
            channelName = `orders.agent.${user.id}`;
        } else if (roleDesc.includes('repartidor')) {
            channelName = `orders.deliverer.${user.id}`;
        }

        return channelName;
    };

    // ── Fetch messages ────────────────────────────────────────────────────────
    const containerRef = useRef<HTMLDivElement>(null);

    const fetchMessages = async (pageNumber: number, isLoadMore = false) => {
        if (isLoadMore) setLoadingMore(true);
        else setLoading(true);

        try {
            const { status, response } = await request(`/orders/${orderId}/whatsapp-messages?page=${pageNumber}&per_page=20`, 'GET');
            if (status === 200) {
                const data = await response.json();
                
                // Ensure data.data is an array before spreading and reversing
                const incomingArray = Array.isArray(data.data) ? data.data : [];
                const fetched = [...incomingArray].reverse();

                if (isLoadMore) {
                    const scrollContainer = containerRef.current;
                    const prevScrollHeight = scrollContainer ? scrollContainer.scrollHeight : 0;
                    
                    setMessages(prev => {
                        const prevArray = Array.isArray(prev) ? prev : [];
                        const newItems = fetched.filter(f => !prevArray.some(p => p.id === f.id));
                        return [...newItems, ...prevArray];
                    });

                    // Restore scroll position so it doesn't jump to the top visually
                    requestAnimationFrame(() => {
                        if (scrollContainer) {
                            const newScrollHeight = scrollContainer.scrollHeight;
                            scrollContainer.scrollTop = scrollContainer.scrollTop + (newScrollHeight - prevScrollHeight);
                        }
                    });

                } else {
                    setMessages(fetched);
                    setTimeout(() => scrollToBottom(true), 150);
                }

                setHasMore(data.current_page < data.last_page);
                setPage(data.current_page);
            } else {
                toast.error('Error cargando mensajes de WhatsApp');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    // ── Mark as read ──────────────────────────────────────────────────────────
    const markAsRead = async () => {
        if (!orderId) return;
        try {
            const { status } = await request(`/orders/${orderId}/read-whatsapp`, 'PUT');
            if (status === 200) {
                const { status: ok, response } = await request(`/orders/${orderId}`, 'GET');
                if (ok) {
                    const data = await response.json();
                    updateOrderInColumns(data.order || data);
                }
            }
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = (instant = false) => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: instant ? 'instant' : 'smooth', block: 'end' });
        }
    };

    // ── Mount / real-time ─────────────────────────────────────────────────────
    useEffect(() => {
        if (orderId) {
            fetchMessages(1);
            markAsRead();
        } else {
            setLoading(false);
        }

        if (echo && orderId) {
            // Listen specifically to this order's private channel
            const channelName = `orders.${orderId}`;
            const channel = echo.private(channelName);

            // Mandatory Action 1: Error listener
            if (channel.error) {
                channel.error((err: any) => console.error('[WS] Auth Error', err));
            }

            // Mandatory Action 2: Global listener for debugging
            if (channel.listenToAll) {
                channel.listenToAll((eventName: string, data: any) => console.log('[WS] Raw Event:', eventName, data));
            }

            const handleNewMessage = (e: any) => {
                const inboundMsg = e.message || e;
                
                // Active order check!
                if (String(inboundMsg.order_id) !== String(orderId)) return;

                setMessages(prev => {
                    const prevArray = Array.isArray(prev) ? prev : [];
                    
                    // Prevent duplicates (ignoring broken backend IDs if applicable)
                    const isDup = prevArray.some(m => 
                        (m.id && inboundMsg.id && String(m.id) === String(inboundMsg.id) && String(inboundMsg.id) !== '1') || 
                        (m.message_id && inboundMsg.message_id && m.message_id === inboundMsg.message_id)
                    );

                    // Fallback: assign a temporary unique ID for React rendering if the backend sends a collision ID
                    if (String(inboundMsg.id) === '1') {
                        inboundMsg.id = `temp-${Date.now()}`;
                    }

                    if (isDup) return prevArray;

                    // Append instantly to the End of the Array
                    setTimeout(() => scrollToBottom(), 100);
                    return [...prevArray, inboundMsg];
                });

                if (inboundMsg.is_from_client) {
                    startWindowTimer(inboundMsg.sent_at);
                    markAsRead();
                }
            };

            // Meta avisó que un mensaje se entregó, se leyó o no llegó
            const handleDelivery = (e: DeliveryInfo) => setMessages(prev => withDelivery(Array.isArray(prev) ? prev : [], e));

            // Mandatory Action 3: DOUBLE BIND
            channel.listen('.App\\Events\\WhatsappMessageReceived', handleNewMessage);
            channel.listen('WhatsappMessageReceived', handleNewMessage);
            channel.listen('.WhatsappMessageReceived', handleNewMessage);
            channel.listen('WhatsappMessageStatus', handleDelivery);

            return () => {
                channel.stopListening('.App\\Events\\WhatsappMessageReceived', handleNewMessage);
                channel.stopListening('WhatsappMessageReceived', handleNewMessage);
                channel.stopListening('.WhatsappMessageReceived', handleNewMessage);
                channel.stopListening('WhatsappMessageStatus', handleDelivery);
                
                // Mandatory Action 4: Ensure the cleanup function explicitly disconnects
                echo.leave(channelName);
            };
        }
    }, [orderId, echo, startWindowTimer]);

    // ── Scroll pagination ─────────────────────────────────────────────────────
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const t = e.target as HTMLDivElement;
        // Check if user scrolled to the top to load older messages
        const isAtTop = t.scrollTop <= 5;
        if (isAtTop && hasMore && !loadingMore) fetchMessages(page + 1, true);
    };

    // ── Send ──────────────────────────────────────────────────────────────────
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !orderId) return;
        const tooBig = whatsappFileTooBig(file);
        if (tooBig) { toast.error(tooBig); return; }

        setSending(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            // Use the established `request` wrapper to ensure the correct Auth Headers / Cookies are sent
            const { status, response } = await request(`/orders/${orderId}/whatsapp-media`, 'POST', formData, true);

            if (status === 201) {
                const newMessage = await response.json();
                setMessages(prev => {
                    const messagesArray = Array.isArray(prev) ? prev : [];
                    if (messagesArray.some(m => m.id === newMessage.id)) return messagesArray;
                    return [...messagesArray, newMessage];
                });
                setTimeout(() => scrollToBottom(), 100);
            } else {
                toast.error(await readUploadError(response, status));
            }
        } catch (err) {
            console.error(err);
            toast.error('Error de conexión al subir');
        } finally {
            setSending(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    
    const handleSend = async (e?: React.FormEvent, templateName?: string, vars?: string[], customBody?: string) => {
        if (e) e.preventDefault();
        const bodyToSend = customBody || input.trim();
        if (!bodyToSend && !templateName) return;

        setSending(true);
        try {
            const body = new URLSearchParams();
            body.append('body', bodyToSend);
            body.append('is_from_client', '0');
            if (templateName) {
                body.append('template_name', templateName);
                if (vars) vars.forEach(v => body.append('vars[]', v));
            }

            const { status, response } = await request(`/orders/${orderId}/whatsapp-messages`, 'POST', body);
            if (status === 201) {
                const newMessage = await response.json();
                // Append new message at the end safely
                setMessages(prev => {
                    const messagesArray = Array.isArray(prev) ? prev : [];
                    if (messagesArray.some(m => m.id === newMessage.id)) return messagesArray;
                    return [...messagesArray, newMessage];
                });
                setTimeout(() => scrollToBottom(), 100);
                if (!templateName) setInput('');
            } else {
                toast.error('Error al enviar mensaje');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error de conexión');
        } finally {
            setSending(false);
        }
    };

    // ── Templates ─────────────────────────────────────────────────────────────
    const fetchTemplates = async () => {
        setLoadingTemplates(true);
        try {
            const { status, response } = await request('/whatsapp-templates', 'GET');
            if (status === 200) setTemplates(await response.json());
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingTemplates(false);
        }
    };

    useEffect(() => { fetchTemplates(); }, []);

    const handleQuickReply = async (template: any) => {
        if (template.is_official) {
            const varNums = extractVars(template);
            // Fill all variables with clientName as fallback
            const vars = varNums.map(() => clientName);
            
            let finalBody = template.body;
            varNums.forEach(n => {
                finalBody = finalBody.replace(`{{${n}}}`, clientName);
            });
            
            await handleSend(undefined, template.name, vars, finalBody);
        } else {
            setInput(template.body);
        }
    };

    // ── Early return ──────────────────────────────────────────────────────────
    if (loading && messages.length === 0) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 400 }}>
                <CircularProgress color="secondary" />
            </Box>
        );
    }

    const clientPhone = order?.client?.phone || '';

    const windowUrgent = windowMsLeft > 0 && windowMsLeft < 2 * 60 * 60 * 1000; // < 2 h remaining
    const windowColor  = !windowOpen ? '#ff4444' : windowUrgent ? '#ff9800' : '#25d366';

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <Paper elevation={0} sx={{
            display: 'flex', flexDirection: 'column', height: { xs: '450px', md: '600px' },
            borderRadius: { xs: 0, md: 4 }, bgcolor: '#0b141a', overflow: 'hidden',
            border: '1px solid', borderColor: 'rgba(255,255,255,0.05)', position: 'relative'
        }}>
            {/* ── Header ── */}
            <Box sx={{ p: 2, bgcolor: '#202c33', display: 'flex', alignItems: 'center', gap: 2, borderBottom: '1px solid rgba(255,255,255,0.05)', zIndex: 10 }}>
                <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} variant="dot"
                    sx={{ '& .MuiBadge-badge': { bgcolor: '#25d366', width: 12, height: 12, borderRadius: '50%', border: '2px solid #202c33' } }}>
                    <Avatar sx={{ bgcolor: 'secondary.main', fontWeight: 'bold' }}>{clientName.charAt(0)}</Avatar>
                </Badge>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ color: 'white', lineHeight: 1.2 }}>{clientName}</Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>WhatsApp: {clientPhone}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'rgba(37, 211, 102, 0.1)', px: 1.5, py: 0.5, borderRadius: 2 }}>
                    <VerifiedRounded sx={{ fontSize: '0.9rem', color: '#25d366' }} />
                    <Typography variant="caption" fontWeight="bold" sx={{ color: '#25d366', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Official API
                    </Typography>
                </Box>
            </Box>

            {/* ── 24-h Window Indicator ── */}
            <Tooltip
                title={
                    windowOpen
                        ? `Ventana abierta. Tiempo restante: ${formatCountdown(windowMsLeft)}. Puedes enviar mensajes de texto libre.`
                        : 'Ventana cerrada. El cliente no ha escrito en las últimas 24 h. Solo puedes usar plantillas oficiales de Meta.'
                }
                placement="bottom"
                arrow
            >
                <Box sx={{
                    px: 2, py: 0.75,
                    bgcolor: windowOpen
                        ? (windowUrgent ? 'rgba(255,152,0,0.08)' : 'rgba(37,211,102,0.06)')
                        : 'rgba(255,68,68,0.08)',
                    borderBottom: `1px solid ${windowColor}22`,
                    display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'default'
                }}>
                    {windowOpen
                        ? <LockOpenRounded sx={{ fontSize: '0.95rem', color: windowColor, flexShrink: 0 }} />
                        : <LockRounded    sx={{ fontSize: '0.95rem', color: windowColor, flexShrink: 0 }} />}

                    <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.4 }}>
                            <Typography variant="caption" sx={{ color: windowColor, fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                                {windowOpen ? 'Ventana de 24h abierta' : 'Ventana de 24h cerrada'}
                            </Typography>
                            <Typography variant="caption" sx={{
                                color: windowOpen ? windowColor : 'rgba(255,255,255,0.35)',
                                fontFamily: 'monospace', fontWeight: 700, fontSize: '0.7rem'
                            }}>
                                {windowOpen ? formatCountdown(windowMsLeft) : '—'}
                            </Typography>
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={windowOpen ? windowPct : 0}
                            sx={{
                                height: 3, borderRadius: 2,
                                bgcolor: 'rgba(255,255,255,0.07)',
                                '& .MuiLinearProgress-bar': { bgcolor: windowColor, borderRadius: 2 }
                            }}
                        />
                    </Box>
                </Box>
            </Tooltip>

            {/* ── Messages Area ── */}
            <Box
                ref={containerRef}
                onScroll={handleScroll}
                sx={{
                    flex: 1, overflowY: 'auto', p: { xs: 2, md: 3 },
                    display: 'flex', flexDirection: 'column', gap: 1,
                    bgcolor: '#0b141a',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.03' fill-rule='evenodd'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 86c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm66-3c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm-46-4c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm13-82c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm-46 44c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm44-18c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM4 66c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm18-50c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM5 28c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm14 78c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z'/%3E%3C/g%3E%3C/svg%3E")`,
                    '&::-webkit-scrollbar': { width: '6px' },
                    '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '10px' }
                }}
            >
                {loadingMore && <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={20} color="secondary" /></Box>}

                {!loadingMore && hasMore && messages.length > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                        <Button size="small" onClick={() => fetchMessages(page + 1, true)}
                            sx={{ color: 'rgba(255,255,255,0.4)', textTransform: 'none', fontSize: '0.7rem', bgcolor: 'rgba(255,255,255,0.05)', px: 2, borderRadius: 20 }}>
                            Cargar mensajes anteriores
                        </Button>
                    </Box>
                )}

                {messages.length === 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.3 }}>
                        <WhatsAppIcon sx={{ fontSize: 64, mb: 1 }} />
                        <Typography variant="body2" sx={{ textAlign: 'center', fontWeight: 500 }}>Aún no hay mensajes en esta orden.</Typography>
                    </Box>
                ) : (
                    messages.map((m, i) => {
                        const isSentByMe = !m.is_from_client;
                        const showTail   = i === 0 || messages[i - 1]?.is_from_client !== m.is_from_client;
                        const uniqueKey  = m.id ? `msg-${m.id}` : (m.message_id ? `wamid-${m.message_id}` : `idx-${i}-${Date.now()}`);
                        
                        return (
                            <Box key={uniqueKey} sx={{ alignSelf: isSentByMe ? 'flex-end' : 'flex-start', maxWidth: '85%', display: 'flex', flexDirection: 'column', mb: 0.2 }}>
                                <Box sx={{
                                    bgcolor: isSentByMe ? '#005c4b' : '#202c33', color: 'white',
                                    p: '6px 10px 8px 10px', borderRadius: '8px',
                                    borderTopRightRadius: (isSentByMe  && showTail) ? 0 : '8px',
                                    borderTopLeftRadius:  (!isSentByMe && showTail) ? 0 : '8px',
                                    boxShadow: (isSentByMe && undeliveredOutline(m)) || '0 1px 0.5px rgba(0,0,0,0.13)', position: 'relative', minWidth: '60px',
                                    '&::before': (isSentByMe && showTail) ? {
                                        content: '""', position: 'absolute', top: 0, right: -8,
                                        width: 0, height: 0, borderTop: '0px solid transparent',
                                        borderBottom: '10px solid transparent', borderLeft: '10px solid #005c4b',
                                    } : (!isSentByMe && showTail) ? {
                                        content: '""', position: 'absolute', top: 0, left: -8,
                                        width: 0, height: 0, borderTop: '0px solid transparent',
                                        borderBottom: '10px solid transparent', borderRight: '10px solid #202c33',
                                    } : {}
                                }}>
                                    {/* 1. EXTRACT MEDIA URL & TEXT BODY */}
                                    {(() => {
                                        // 1. Normalizar multimedia (Soportar string antiguo o objeto nuevo)
                                        const mediaData = typeof m.media === 'string' ? { link: m.media, type: 'unknown' } : m.media;
                                        
                                        const cloudinaryMatch = (!mediaData && m.body) ? m.body.match(/(https?:\/\/[^\s]*(res\.cloudinary\.com|storage\/whatsapp\/|api\.nuviora\.cloud\/storage)[^\s]*)/i) : null;
                                        
                                        const finalMedia = mediaData || (cloudinaryMatch ? { link: cloudinaryMatch[0], type: 'unknown' } : null);
                                        const mediaSrc = finalMedia?.link || null;
                                        const mediaType = finalMedia?.type || 'unknown';

                                        // Limpiar el body del mensaje de links de cloudinary para que no se dupliquen
                                        const textBody = m.body ? m.body.replace(mediaSrc || '', '').trim() : '';

                                        // Helper: detectar tipo de medio por URL o tipo explícito
                                        const urlLower = (mediaSrc || '').toLowerCase().split('?')[0]; // quitar query params
                                        const isSticker = mediaType === 'sticker' || urlLower.includes('wa_sticker_') || urlLower.endsWith('.webp');
                                        const isVideo = !isSticker && (
                                            mediaType === 'video' ||
                                            urlLower.endsWith('.mp4') ||
                                            urlLower.endsWith('.webm') ||
                                            urlLower.endsWith('.mov') ||
                                            urlLower.endsWith('.3gp') ||
                                            urlLower.includes('wa_vid_') // prefijo generado por el webhook
                                        );
                                        const isAudio = !isSticker && !isVideo && (
                                            mediaType === 'audio' || mediaType === 'voice' ||
                                            urlLower.endsWith('.ogg') ||
                                            urlLower.endsWith('.mp3') ||
                                            urlLower.endsWith('.wav') ||
                                            urlLower.endsWith('.m4a') ||
                                            urlLower.includes('wa_audio_') // prefijo generado por el webhook
                                        );

                                        return (
                                            <>
                                                {mediaSrc && (
                                                    isSticker ? (
                                                        // Stickers (Animados o Estáticos): siempre en <img> (WebP animado es soportado por <img>)
                                                        <Box component='img'
                                                            src={mediaSrc}
                                                            alt='Sticker'
                                                            onClick={() => window.open(mediaSrc, '_blank')}
                                                            sx={{
                                                                width: 150, height: 150,
                                                                display: 'block',
                                                                objectFit: 'contain',
                                                                cursor: 'pointer',
                                                                mb: textBody ? 1 : 0,
                                                                bgcolor: 'transparent',
                                                            }}
                                                        />
                                                    ) : (
                                                        <Box sx={{ 
                                                            mb: textBody ? 1.5 : 0,
                                                            borderRadius: '10px', 
                                                            overflow: 'hidden', 
                                                            border: '1px solid rgba(255,255,255,0.05)', 
                                                            maxWidth: '100%'
                                                        }}>
                                                            {isVideo ? (
                                                                <Box component='video' 
                                                                    controls 
                                                                    src={mediaSrc} 
                                                                    sx={{ width: '100%', display: 'block', maxHeight: '300px', bgcolor: '#000' }} 
                                                                />
                                                            ) : isAudio ? (
                                                                <Box sx={{ width: '100%', minWidth: { xs: 220, md: 280 }, mt: 1, mb: 1, bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 2, p: 0.5 }}>
                                                                    <Box component='audio' 
                                                                        controls 
                                                                        src={mediaSrc} 
                                                                        sx={{ width: '100%', outline: 'none', height: 45, display: 'block' }} 
                                                                    >
                                                                        <source src={mediaSrc} type={urlLower.endsWith('.m4a') ? "audio/mp4" : "audio/ogg"} />
                                                                    </Box>
                                                                </Box>
                                                            ) : (
                                                                <Box component='img' 
                                                                    src={mediaSrc} 
                                                                    alt={textBody || 'WhatsApp Media'}
                                                                    onClick={() => window.open(mediaSrc, '_blank')}
                                                                    sx={{ 
                                                                        width: '100%', 
                                                                        height: 'auto', 
                                                                        display: 'block', 
                                                                        objectFit: 'cover',
                                                                        maxHeight: '300px',
                                                                        cursor: 'pointer'
                                                                    }} 
                                                                />
                                                            )}
                                                        </Box>
                                                    )
                                                )}

                                                {/* 2. TEXT BODY W/ URL PARSER */}
                                                {textBody && (
                                                    <Typography variant="body2" sx={{ fontSize: '0.9rem', lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                                        {textBody.split(/(https?:\/\/[^\s]+)/g).map((part: string, index: number) => 
                                                            part.match(/(https?:\/\/[^\s]+)/g) 
                                                            ? <Link key={index} href={part} target="_blank" rel="noopener" sx={{ color: isSentByMe ? '#a6d4fa' : '#53bdeb', textDecoration: 'underline' }}>{part}</Link>
                                                            : <span key={index}>{part}</span>
                                                        )}
                                                    </Typography>
                                                )}
                                            </>
                                        );
                                    })()}
                                    {isSentByMe && <DeliveryFailure message={m} dark />}
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, mt: 0.2 }}>
                                        <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.6, fontWeight: 500 }}>
                                            {new Date(m.created_at || m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Typography>
                                        {isSentByMe && (
                                            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', mt: -0.2 }}>
                                                <DeliveryTicks message={m} dark readColor="#53bdeb" />
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            </Box>
                        );
                    })
                )}
                <div ref={messagesEndRef} style={{ height: 1 }} />
            </Box>

            {/* ── Window-closed banner (replaces input when expired) ── */}
            {!windowOpen && (
                <Box sx={{
                    px: 2, py: 1.5, bgcolor: 'rgba(255,68,68,0.07)',
                    borderTop: '1px solid rgba(255,68,68,0.15)',
                    display: 'flex', alignItems: 'center', gap: 2
                }}>
                    <LockRounded sx={{ color: '#ff4444', fontSize: '1.1rem', flexShrink: 0 }} />
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)', flex: 1, lineHeight: 1.4 }}>
                        La ventana de 24 h está <strong style={{ color: '#ff4444' }}>cerrada</strong>.
                        Solo puedes enviar <strong style={{ color: 'white' }}>plantillas oficiales</strong> de Meta.
                    </Typography>
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AutoAwesomeRounded />}
                        onClick={() => setShowTemplates(true)}
                        sx={{
                            borderColor: '#25d366', color: '#25d366', flexShrink: 0,
                            textTransform: 'none', fontSize: '0.75rem', px: 1.5,
                            '&:hover': { bgcolor: 'rgba(37,211,102,0.1)', borderColor: '#25d366' }
                        }}
                    >
                        Usar plantilla
                    </Button>
                </Box>
            )}

            {/* ── Input Area (only when window is open) ── */}
            {windowOpen && (
                <Box component="form" onSubmit={handleSend} sx={{
                    p: 1.5, bgcolor: '#202c33', display: 'flex', alignItems: 'center', gap: 1,
                    borderTop: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <IconButton size="small" onClick={() => setShowTemplates(true)}
                        sx={{ color: '#8696a0', '&:hover': { color: '#25d366', bgcolor: 'rgba(37, 211, 102, 0.1)' } }}>
                        <AutoAwesomeRounded />
                    </IconButton>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        accept={WHATSAPP_ACCEPT} 
                        onChange={handleFileSelect} 
                    />
                    <IconButton size="small" onClick={() => fileInputRef.current?.click()} disabled={sending} sx={{ color: '#8696a0', '&:hover': { color: '#25d366', bgcolor: 'rgba(37, 211, 102, 0.1)' } }}>
                        <AttachFileRounded sx={{ transform: 'rotate(45deg)' }} />
                    </IconButton>
                    <TextField
                        fullWidth size="small"
                        placeholder="Escribe un mensaje..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={sending}
                        autoComplete="off"
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                bgcolor: '#2a3942', color: 'white', borderRadius: 3,
                                '& fieldset': { border: 'none' },
                                '&:hover fieldset': { border: 'none' },
                                '&.Mui-focused fieldset': { border: 'none' },
                            }
                        }}
                    />
                    <IconButton type="submit" disabled={sending || !input.trim()} sx={{
                        bgcolor: sending || !input.trim() ? 'transparent' : '#25d366',
                        color: sending || !input.trim() ? '#8696a0' : '#111b21',
                        '&:hover': { bgcolor: '#128c7e' }, transition: 'all 0.2s'
                    }}>
                        {sending ? <CircularProgress size={24} color="inherit" /> : <SendRounded />}
                    </IconButton>
                </Box>
            )}

            {/* ── Templates Dialog ── */}
            <Dialog open={showTemplates} onClose={() => setShowTemplates(false)}
                PaperProps={{ sx: { borderRadius: 4, bgcolor: '#2a3942', color: 'white', maxWidth: '400px', width: '100%' } }}>
                <DialogTitle sx={{ fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    Plantillas de Respuesta
                    {!windowOpen && (
                        <Typography variant="caption" display="block" sx={{ color: '#ff9800', mt: 0.5, fontWeight: 400 }}>
                            ⚠️ Ventana cerrada — solo plantillas <strong>Oficial</strong> llegarán al cliente.
                        </Typography>
                    )}
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    {loadingTemplates ? (
                        <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={24} color="secondary" /></Box>
                    ) : (
                        <List sx={{ py: 0 }}>
                            {templates.length === 0 && (
                                <Box sx={{ p: 3, textAlign: 'center', opacity: 0.5 }}>
                                    <Typography variant="body2">No hay plantillas registradas.</Typography>
                                </Box>
                            )}
                            {templates.map((qr, i) => (
                                <React.Fragment key={qr.id || i}>
                                    <ListItem disablePadding>
                                        <ListItemButton
                                            onClick={() => { handleQuickReply(qr); setShowTemplates(false); }}
                                            disabled={!windowOpen && !qr.is_official}
                                            sx={{
                                                py: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
                                                '&.Mui-disabled': { opacity: 0.35 }
                                            }}
                                        >
                                            <ListItemText
                                                primary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        {qr.label}
                                                        {!!qr.is_official && (
                                                            <Box component="span" sx={{ fontSize: '0.6rem', bgcolor: 'secondary.main', color: 'white', px: 0.8, py: 0.2, borderRadius: 1, textTransform: 'uppercase' }}>
                                                                Oficial
                                                            </Box>
                                                        )}
                                                        {!windowOpen && !qr.is_official && (
                                                            <Box component="span" sx={{ fontSize: '0.6rem', bgcolor: 'rgba(255,68,68,0.2)', color: '#ff4444', px: 0.8, py: 0.2, borderRadius: 1 }}>
                                                                No disponible
                                                            </Box>
                                                        )}
                                                    </Box>
                                                }
                                                secondary={
                                                    <Box sx={{ mt: 0.5 }}>
                                                        {qr.meta_components?.find((c: any) => c.type === 'HEADER')?.text && (
                                                            <Typography variant="caption" display="block" sx={{ fontWeight: 'bold', color: 'white', borderBottom: '1px solid rgba(255,255,255,0.1)', pb: 0.5, mb: 0.5 }}>
                                                                {qr.meta_components.find((c: any) => c.type === 'HEADER').text}
                                                            </Typography>
                                                        )}
                                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
                                                            {qr.body}
                                                        </Typography>
                                                    </Box>
                                                }
                                                primaryTypographyProps={{ fontWeight: 'bold', color: 'secondary.main', mb: 0.5 }}
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                    {i < templates.length - 1 && <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />}
                                </React.Fragment>
                            ))}
                        </List>
                    )}
                </DialogContent>
                <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Button fullWidth onClick={() => setShowTemplates(false)} sx={{ color: '#8696a0', textTransform: 'none' }}>
                        Cerrar
                    </Button>
                </Box>
            </Dialog>
        </Paper>
    );
};
