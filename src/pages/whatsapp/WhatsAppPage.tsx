import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { Box, Paper, CircularProgress, Drawer } from "@mui/material";
import { Layout } from "../../components/ui/Layout";
import { request } from "../../common/request";
import { Sidebar } from "./components/Sidebar";
import { ChatArea } from "./components/ChatArea";
import { ContextPanel } from "./components/ContextPanel";
import { useSocketStore } from "../../store/sockets/SocketStore";
import { OrderDialog } from "../../components/orders/OrderDialog";
import { useUserStore } from "../../store/user/UserStore";
import { DeliveryInfo } from "../../common/whatsappDelivery";

// ─── Utilidades de notificacion ───────────────────────────────────────────────

/** Solicita permiso de notificacion del navegador una sola vez */
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

/**
 * Reproduce un tono suave usando Web Audio API (sin archivos externos).
 * Nota corta tipo "ping" — solo suena para mensajes del cliente.
 */
function playNotificationSound() {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);

        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
    } catch (_) {
        // Si el navegador bloquea AudioContext, silencio sin error
    }
}

/**
 * Muestra notificacion del SO solo cuando la pestana no tiene foco.
 * Unifica multiples notificaciones en una sola (tag unico).
 */
function showBrowserNotification(title: string, body: string) {
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
        const notif = new Notification(title, {
            body,
            icon: '/favicon.ico',
            tag: 'whatsapp-crm-incoming',
        });
        setTimeout(() => notif.close(), 5000);
    }
}

export type ConversationBucket = 'requires_attention' | 'follow_up' | 'closed';
export type MessageType = 'incoming_message' | 'outgoing_agent_message' | 'outgoing_automated_message' | 'system_event';
export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

export interface ContactData {
    id: number;
    name: string;
    phone: string;
    unread_count: number;
    is_window_open: boolean;
    last_message: string;
    last_message_date: string;
    last_message_type: MessageType;
    conversation_bucket: ConversationBucket;
    type: 'lead' | 'order';
    products_summary?: string;
    total_ves?: number;
    context: {
        order?: any;
        agent?: any;
        conversation?: any;
    };
}

// Prioridad numérica de bucket para ordenar en el cliente
const BUCKET_PRIORITY: Record<ConversationBucket, number> = {
    requires_attention: 1,
    follow_up: 2,
    closed: 3,
};

function insertContactSorted(list: ContactData[], contact: ContactData): ContactData[] {
    // 1. Eliminar duplicados previos por seguridad
    const filtered = list.filter(c => Number(c.id) !== Number(contact.id));
    const result = [...filtered, contact];

    // 2. Ordenar con criterios claros para las vendedoras
    return result.sort((a, b) => {
        // A. Prioridad por Bucket (Atención > Seguimiento > Cerrados)
        const pa = BUCKET_PRIORITY[a.conversation_bucket] ?? 2;
        const pb = BUCKET_PRIORITY[b.conversation_bucket] ?? 2;
        if (pa !== pb) return pa - pb;

        // B. Prioridad por Pendientes (Puntos rojos arriba)
        const ua = a.unread_count || 0;
        const ub = b.unread_count || 0;
        if (ua !== ub) return ub - ua;

        // C. Por fecha (Más reciente arriba)
        const da = new Date(a.last_message_date || 0).getTime();
        const db = new Date(b.last_message_date || 0).getTime();
        return db - da;
    });
}

export const WhatsAppPage = () => {
    const [contacts, setContacts] = useState<ContactData[]>([]);
    const [selectedContact, setSelectedContact] = useState<ContactData | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [showMobileContext, setShowMobileContext] = useState(false);
    const [bucket, setBucket] = useState<ConversationBucket | 'all'>('all');
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connected');
    const [totalUnread, setTotalUnread] = useState(0);

    // Nuevos filtros
    const [sortBy, setSortBy] = useState('latency');
    const [agentId, setAgentId] = useState<string | number>("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [agents, setAgents] = useState<any[]>([]);

    const [incomingMessage, setIncomingMessage] = useState<any>(null);
    const [deliveryUpdate, setDeliveryUpdate] = useState<DeliveryInfo | null>(null);

    const [orderDialogOpen, setOrderDialogOpen] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<number | undefined>(undefined);

    // Contadores globales que vienen del servidor (siempre precisos, no dependen de paginacion)
    const [serverBucketCounts, setServerBucketCounts] = useState<Record<string, number>>({});
    const [serverCriticalCount, setServerCriticalCount] = useState(0);

    const { echo } = useSocketStore();
    const user = useUserStore(state => state.user);

    const selectedContactRef = useRef<ContactData | null>(null);
    useEffect(() => {
        selectedContactRef.current = selectedContact;
    }, [selectedContact]);

    const bucketRef = useRef(bucket);
    useEffect(() => { bucketRef.current = bucket; }, [bucket]);

    const searchTermRef = useRef(searchTerm);
    useEffect(() => { searchTermRef.current = searchTerm; }, [searchTerm]);

    const filtersRef = useRef({ sortBy, agentId, startDate, endDate });
    useEffect(() => { 
        filtersRef.current = { sortBy, agentId, startDate, endDate }; 
    }, [sortBy, agentId, startDate, endDate]);

    // Ref de contacts para evitar stale closure dentro del WebSocket listener
    const contactsRef = useRef<ContactData[]>([]);
    useEffect(() => { contactsRef.current = contacts; }, [contacts]);

    // Pedir permiso de notificaciones al abrir la pagina
    useEffect(() => {
        requestNotificationPermission();
    }, []);

    // Titulo de pestana con contador de no leidos
    useEffect(() => {
        if (totalUnread > 0) {
            document.title = `(${totalUnread}) Mensajes – Nuviora`;
        } else {
            document.title = 'Mensajes – Nuviora';
        }
        return () => { document.title = 'Nuviora'; };
    }, [totalUnread]);


    const fetchContacts = useCallback(async (isLoadMore = false, forcedSearch?: string, forcedBucket?: string) => {
        try {
            const search = forcedSearch !== undefined ? forcedSearch : searchTermRef.current;
            const currentBucket = forcedBucket !== undefined ? forcedBucket : bucketRef.current;
            const { sortBy, agentId, startDate, endDate } = filtersRef.current;
            
            const currentPage = isLoadMore ? page + 1 : 1;
            const url = `/whatsapp-conversations?search=${encodeURIComponent(search)}&page=${currentPage}&bucket=${currentBucket}&sort_by=${sortBy}&agent_id=${agentId}&start_date=${startDate}&end_date=${endDate}`;
            
            const { status, response } = await request(url, 'GET');
            if (status) {
                const json = await response.json();
                const newContacts = json.data;
                
                if (isLoadMore) {
                    setContacts(prev => [...prev, ...newContacts].map(c => 
                        selectedContactRef.current?.id === c.id ? { ...c, unread_count: 0 } : c
                    ));
                    setPage(currentPage);
                } else {
                    setContacts(newContacts.map((c: ContactData) => 
                        selectedContactRef.current?.id === c.id ? { ...c, unread_count: 0 } : c
                    ));
                    setPage(1);
                }
                
                setHasMore(!!json.next_page_url);

                // Guardar contadores globales del servidor
                if (json.bucket_counts) setServerBucketCounts(json.bucket_counts);
                if (json.critical_count !== undefined) setServerCriticalCount(json.critical_count);

                if (selectedContactRef.current) {
                    const updated = newContacts.find((c: ContactData) => c.id === selectedContactRef.current!.id);
                    if (updated) setSelectedContact(prev => ({ ...prev, ...updated, unread_count: 0 }));
                }
            }
        } catch (error) {
            console.error("Error fetching contacts", error);
        } finally {
            setLoading(false);
        }
    }, [searchTerm, bucket, page, sortBy, agentId, startDate, endDate]);

    const fetchAgents = async () => {
        const { status, response } = await request('/users/agents', 'GET');
        if (status) {
            const json = await response.json();
            setAgents(json.data || []);
        }
    }

    // Fetch inicial de agentes
    useEffect(() => {
        fetchAgents();
    }, []);

    // REACCIVIDAD: Cuando cambia cualquier filtro, refrescar la lista
    // Usamos un pequeño delay para la busqueda de texto (debounce) para no saturar el servidor
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchContacts();
        }, searchTerm ? 400 : 0);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, bucket, sortBy, agentId, startDate, endDate]);

    // ─── WebSocket hub ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!echo) return;

        const channel = echo.private('whatsapp');

        // Monitorear estado de conexión del socket
        const connector = (echo as any).connector;
        if (connector?.pusher) {
            const pusher = connector.pusher;

            // Un solo handler para 'connected': actualiza estado Y recupera mensajes perdidos
            pusher.connection.bind('connected', () => {
                setConnectionStatus('connected');
                fetchContacts(false); // recuperar mensajes perdidos durante la desconexión
            });
            pusher.connection.bind('connecting',  () => setConnectionStatus('reconnecting'));
            pusher.connection.bind('unavailable', () => setConnectionStatus('disconnected'));
            pusher.connection.bind('disconnected', () => setConnectionStatus('disconnected'));
            pusher.connection.bind('failed',      () => setConnectionStatus('disconnected'));
        }

        // Debounce ref — refresca desde el servidor 1.5s despues del ultimo mensaje
        let refreshTimer: ReturnType<typeof setTimeout> | null = null;
        const scheduleRefresh = () => {
            if (refreshTimer) clearTimeout(refreshTimer);
            refreshTimer = setTimeout(() => fetchContacts(false), 1500);
        };

        // Mensaje nuevo (entrante del cliente O saliente del agente/n8n)
        channel.listen('WhatsappMessageReceived', (data: any) => {
            const { message } = data;
            if (!message) return;

            const client_id = message.client_id || (message.client ? message.client.id : null);
            if (!client_id) return;

            const isIncoming   = message.message_type === 'incoming_message';
            const newBucket: ConversationBucket = message.conversation_bucket ?? 'follow_up';
            const isActiveChat = selectedContactRef.current?.id == client_id;

            // ─── Solo procesar mensajes que pertenecen a este usuario ────────
            const isAdmin = ['Admin', 'Manager', 'Gerente', 'Master'].includes(user?.role?.description || '');
            const isMineChat = isAdmin
                || Number(message.agent_id) === Number(user?.id)
                || Number(message.order?.agent_id) === Number(user?.id)
                || contactsRef.current.some(c => Number(c.id) === Number(client_id));

            if (!isMineChat) return;

            // ─── NOTIFICACIONES ──────────────────────────────────────────────
            if (isIncoming && !isActiveChat) {
                playNotificationSound();
                const clientName = message.client?.names || message.client?.first_name || 'Cliente';
                const bodyPreview = message.body?.slice(0, 80) ?? 'Nuevo mensaje';
                showBrowserNotification(`Nuevo mensaje de ${clientName}`, bodyPreview);
                toast.info(`📩 ${clientName}: ${bodyPreview}`, {
                    position: "top-right",
                    autoClose: 3500,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                });
                setTotalUnread(n => n + 1);
            }

            // ─── ACTUALIZACIÓN OPTIMISTA ──────────────────────────────────────
            // Actualiza la pantalla al instante. El servidor confirma en 1.5s.
            setContacts(prev => {
                const currentBucket = bucketRef.current;
                const index = prev.findIndex(c => Number(c.id) === Number(client_id));

                if (index === -1) return prev; // no está en lista, el refresh lo traerá

                const updatedContact: ContactData = {
                    ...prev[index],
                    last_message: message.body ?? prev[index].last_message,
                    last_message_date: message.sent_at || new Date().toISOString(),
                    last_message_type: message.message_type ?? 'outgoing_agent_message',
                    conversation_bucket: newBucket,
                    unread_count: isIncoming && !isActiveChat
                        ? (prev[index].unread_count || 0) + 1
                        : prev[index].unread_count,
                };

                // Si hay filtro de bucket Y el chat cambió → sacarlo de la vista
                if (currentBucket !== 'all' && newBucket !== currentBucket) {
                    return prev.filter(c => Number(c.id) !== Number(client_id));
                }

                // Mensaje entrante: subir al tope
                if (isIncoming) {
                    return [updatedContact, ...prev.filter(c => Number(c.id) !== Number(client_id))];
                }

                // Mensaje saliente: actualizar en su lugar
                return prev.map(c => Number(c.id) === Number(client_id) ? updatedContact : c);
            });

            // ─── REFRESH DEL SERVIDOR ────────────────────────────────────────
            // Corrige cualquier inconsistencia 1.5s despues (bucket, orden, etc.)
            scheduleRefresh();

            // ─── Pasar mensaje al chat activo ────────────────────────────────
            if (isActiveChat) {
                setIncomingMessage(message);
            }
        });

        // Meta avisó que un mensaje se entregó, se leyó o no llegó: solo importa en el chat abierto
        channel.listen('WhatsappMessageStatus', (data: DeliveryInfo) => {
            if (data?.client_id && selectedContactRef.current?.id == data.client_id) setDeliveryUpdate(data);
        });

        // Chat marcado como leido
        channel.listen('WhatsappChatRead', (data: any) => {
            const { client_id } = data;
            if (!client_id) return;
            setContacts(prev => {
                const contact = prev.find(c => c.id == client_id);
                const diff = contact?.unread_count ?? 0;
                if (diff > 0) setTotalUnread(n => Math.max(0, n - diff));
                return prev.map(c => c.id == client_id ? { ...c, unread_count: 0 } : c);
            });
        });

        return () => {
            channel.stopListening('WhatsappMessageReceived');
            channel.stopListening('WhatsappMessageStatus');
            channel.stopListening('WhatsappChatRead');
        };
    // searchTerm NO va en deps — causaría re-suscripción con cada letra que escribe la vendedora
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [echo]);


    // Debounced search
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (!loading) {
                fetchContacts(false, searchTerm);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    // Bucket or Filters change
    useEffect(() => {
        if (!loading) {
            fetchContacts(false, searchTerm, bucket);
        }
    }, [bucket, sortBy, agentId, startDate, endDate]);

    const handleLoadMore = () => fetchContacts(true);

    const handleSelectContact = (contact: ContactData) => {
        setContacts(prev => prev.map(c => 
            c.id === contact.id ? { ...c, unread_count: 0 } : c
        ));
        setIncomingMessage(null);
        setSelectedContact(contact);
    };

    const handleOpenOrder = (id: number) => {
        setSelectedOrderId(id);
        setOrderDialogOpen(true);
    };

    return (
        <Layout noMargin>
            <Paper 
                elevation={0} 
                sx={{ 
                    display: 'flex', 
                    height: '100vh', 
                    borderRadius: 0, 
                    overflow: 'hidden',
                    bgcolor: 'background.default'
                }}
            >
                {loading && contacts.length === 0 ? (
                    <Box sx={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        <Sidebar 
                            contacts={contacts} 
                            selectedContact={selectedContact} 
                            onSelect={handleSelectContact} 
                            searchTerm={searchTerm}
                            onSearchChange={setSearchTerm}
                            bucket={bucket}
                            onBucketChange={setBucket}
                            hasMore={hasMore}
                            onLoadMore={handleLoadMore}
                            connectionStatus={connectionStatus}
                            sortBy={sortBy}
                            onSortChange={setSortBy}
                            agentId={agentId}
                            onAgentChange={setAgentId}
                            startDate={startDate}
                            onStartDateChange={setStartDate}
                            endDate={endDate}
                            onEndDateChange={setEndDate}
                            agents={agents}
                            serverBucketCounts={serverBucketCounts}
                            serverCriticalCount={serverCriticalCount}
                        />

                        <ChatArea 
                            selectedContact={selectedContact} 
                            onRefreshContacts={() => fetchContacts(false)}
                            onBack={() => setSelectedContact(null)}
                            onOpenContext={() => setShowMobileContext(true)}
                            incomingMessage={incomingMessage}
                            deliveryUpdate={deliveryUpdate}
                        />

                        <ContextPanel 
                            selectedContact={selectedContact} 
                            onRefresh={() => fetchContacts(false)}
                            onOpenOrder={handleOpenOrder}
                        />

                        <Drawer
                            anchor="right"
                            open={showMobileContext}
                            onClose={() => setShowMobileContext(false)}
                        >
                            <Box sx={{ width: 320 }}>
                                <Sidebar 
                                    contacts={contacts} 
                                    selectedContact={selectedContact} 
                                    onSelect={handleSelectContact} 
                                    searchTerm={searchTerm}
                                    onSearchChange={setSearchTerm}
                                    bucket={bucket}
                                    onBucketChange={setBucket}
                                    hasMore={hasMore}
                                    onLoadMore={handleLoadMore}
                                    connectionStatus={connectionStatus}
                                    sortBy={sortBy}
                                    onSortChange={setSortBy}
                                    agentId={agentId}
                                    onAgentChange={setAgentId}
                                    startDate={startDate}
                                    onStartDateChange={setStartDate}
                                    endDate={endDate}
                                    onEndDateChange={setEndDate}
                                    agents={agents}
                                />
                            </Box>
                        </Drawer>

                        <OrderDialog 
                            id={selectedOrderId} 
                            open={orderDialogOpen} 
                            setOpen={setOrderDialogOpen} 
                        />
                    </>
                )}
            </Paper>
        </Layout>
    );
};
