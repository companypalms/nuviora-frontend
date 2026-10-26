import { useEffect, useRef, useState, useCallback } from "react";
import { Box, Paper, CircularProgress } from "@mui/material";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { request } from "../../common/request";
import { useSocketStore } from "../../store/sockets/SocketStore";
import { useUserStore } from "../../store/user/UserStore";
import { CrmSidebar } from "./components/CrmSidebar";
import { LeaderViewSelect } from "../my-group/LeaderViewSelect";
import { appendLeaderView, LeaderView, MY_ORDERS } from "../my-group/leaderView";
import { CrmChatArea } from "./components/CrmChatArea";
import { CrmConversation } from "./components/CrmContactCard";
import { DeliveryInfo } from "../../common/whatsappDelivery";

// ── helpers de notificación ──────────────────────────────────────────────────
function playPing() {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
        osc.start(); osc.stop(ctx.currentTime + 0.3);
    } catch { /* silencio */ }
}

function showDesktopNotif(title: string, body: string) {
    if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
        const n = new Notification(title, { body, icon: "/favicon.ico", tag: "crm-v2" });
        setTimeout(() => n.close(), 5000);
    }
}

// ── Ordenar conversaciones: opcionalmente por bucket o estrictamente por fecha ──
function sortConversations(list: CrmConversation[], sortBy: "latency" | "unread"): CrmConversation[] {
    return [...list].sort((a, b) => {
        if (sortBy === "unread") {
            const BUCKET_P: Record<string, number> = { requires_attention: 1, follow_up: 2, closed: 3 };
            const pa = BUCKET_P[a.conversation_bucket] ?? 2;
            const pb = BUCKET_P[b.conversation_bucket] ?? 2;
            if (pa !== pb) return pa - pb;
            if (a.unread_count !== b.unread_count) return b.unread_count - a.unread_count;
        }
        
        // Orden de llegada (Latency) o fallback
        const dateA = new Date(a.last_message_at || 0).getTime();
        const dateB = new Date(b.last_message_at || 0).getTime();
        return dateB - dateA;
    });
}

type BucketFilter = "all" | "requires_attention" | "follow_up" | "closed";

export const WhatsAppCrmPage = () => {
    const [conversations, setConversations] = useState<CrmConversation[]>([]);
    const [selected, setSelected] = useState<CrmConversation | null>(null);
    const [loading, setLoading] = useState(true);
    const [initialLoad, setInitialLoad] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [bucket, setBucket] = useState<BucketFilter>("all");
    const [agentId, setAgentId] = useState<string>("");
    const [leaderView, setLeaderView] = useState<LeaderView>(MY_ORDERS); // la Líder: suyos, su grupo o una vendedora
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [isOffline, setIsOffline] = useState(false);
    const [bucketCounts, setBucketCounts] = useState<Record<string, number>>({});
    const [incomingMessage, setIncomingMessage] = useState<any>(null);
    const [deliveryUpdate, setDeliveryUpdate] = useState<DeliveryInfo | null>(null);
    const [agents, setAgents] = useState<any[]>([]);
    const [sortBy, setSortBy] = useState<"latency" | "unread">("latency");

    const { echo } = useSocketStore();
    const user = useUserStore((s) => s.user);
    const isAdmin = ["Admin", "Manager", "Gerente", "Master"].includes(user?.role?.description ?? "");

    // Refs para evitar stale closures en el WebSocket
    const selectedRef = useRef<CrmConversation | null>(null);
    const bucketRef = useRef<BucketFilter>("all");
    const conversationsRef = useRef<CrmConversation[]>([]);
    const searchRef = useRef("");
    const sortByRef = useRef<"latency" | "unread">("latency");

    useEffect(() => { selectedRef.current = selected; }, [selected]);
    useEffect(() => { bucketRef.current = bucket; }, [bucket]);
    useEffect(() => { conversationsRef.current = conversations; }, [conversations]);
    useEffect(() => { searchRef.current = searchTerm; }, [searchTerm]);
    useEffect(() => { sortByRef.current = sortBy; }, [sortBy]);

    // Solicitar permisos de notificación al montar
    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, []);

    // Título de pestaña con badge de no leídos
    const totalUnread = bucketCounts.requires_attention ?? 0;
    useEffect(() => {
        document.title = totalUnread > 0 ? `(${totalUnread}) Mensajes — Nuviora` : "WhatsApp CRM — Nuviora";
        return () => { document.title = "Nuviora"; };
    }, [totalUnread]);

    // Fetch agentes (solo admins)
    useEffect(() => {
        if (!isAdmin) return;
        const loadAgents = async () => {
            try {
                const { status, response } = await request('/users/agents', 'GET');
                if (status === 200) {
                    const data = await response.json();
                    setAgents(Array.isArray(data) ? data : (data.data || []));
                }
            } catch (e) {
                console.error("Error fetching agents", e);
            }
        };
        loadAgents();
    }, [isAdmin]);

    // ── Fetch de conversaciones ───────────────────────────────────────────────
    const fetchConversations = useCallback(async (isLoadMore = false) => {
        const currentPage = isLoadMore ? page + 1 : 1;
        const params = new URLSearchParams({
            page: String(currentPage),
            bucket: bucket,
            search: searchTerm,
            sort_by: sortBy,
        });
        if (agentId) params.set("agent_id", agentId);
        appendLeaderView(params, leaderView);

        try {
            const { status, response } = await request(`/whatsapp-crm/conversations?${params}`, "GET");
            if (status === 200) {
                const json = await response.json();
                const newItems: CrmConversation[] = json.data ?? [];

                setConversations((prev) => {
                    const merged = isLoadMore ? [...prev, ...newItems] : newItems;
                    
                    // Deduplicar por ID de cliente
                    const uniqueMap = new Map();
                    merged.forEach(c => uniqueMap.set(c.client_id, c));
                    const uniqueList = Array.from(uniqueMap.values());

                    // Si el chat activo está en la lista, mantener unread_count = 0
                    const updatedList = uniqueList.map((c) =>
                        selectedRef.current?.client_id === c.client_id
                            ? { ...c, unread_count: 0 }
                            : c
                    );
                    return sortConversations(updatedList, sortBy);
                });

                if (isLoadMore) setPage(currentPage);
                else setPage(1);

                setHasMore(!!json.next_page_url);
                if (json.bucket_counts) setBucketCounts(json.bucket_counts);

                // Actualizar el chat seleccionado si está en la respuesta
                if (selectedRef.current) {
                    const updated = newItems.find((c) => c.client_id === selectedRef.current!.client_id);
                    if (updated) setSelected((prev) => ({ ...prev!, ...updated, unread_count: 0 }));
                }
            }
        } catch (err) {
            console.error("Error fetching CRM conversations", err);
        } finally {
            setLoading(false);
            setInitialLoad(false);
        }
    }, [agentId, page, bucket, searchTerm, sortBy, leaderView]);

    // ── Triggers de re-fetch ──────────────────────────────────────────────────
    useEffect(() => {
        setLoading(true);
        const timer = setTimeout(() => fetchConversations(false), searchTerm ? 400 : 0);
        return () => clearTimeout(timer);
    }, [searchTerm, bucket, agentId, sortBy, leaderView.scope, leaderView.sellerId]);

    // ── WebSocket hub ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!echo) return;
        const channel = echo.private("whatsapp");

        // Estado de conexión
        const pusher = (echo as any).connector?.pusher;
        if (pusher) {
            pusher.connection.bind("connected", () => { setIsOffline(false); fetchConversations(false); });
            pusher.connection.bind("connecting", () => setIsOffline(true));
            pusher.connection.bind("disconnected", () => setIsOffline(true));
            pusher.connection.bind("unavailable", () => setIsOffline(true));
        }

        let refreshTimer: ReturnType<typeof setTimeout> | null = null;
        const scheduleRefresh = () => {
            if (refreshTimer) clearTimeout(refreshTimer);
            refreshTimer = setTimeout(() => fetchConversations(false), 1500);
        };

        channel.listen("WhatsappMessageReceived", (data: any) => {
            const { message } = data;
            if (!message) return;

            const clientId = message.client_id;
            if (!clientId) return;

            const isIncoming = message.message_type === "incoming_message";
            const isActiveChat = selectedRef.current?.client_id == clientId;

            // Filtrar mensajes que no me pertenecen
            const isMine = isAdmin
                || Number(message.agent_id) === Number(user?.id)
                || Number(message.order?.agent_id) === Number(user?.id)
                || conversationsRef.current.some((c) => c.client_id == clientId);
            if (!isMine) return;

            // Notificaciones
            if (isIncoming && !isActiveChat) {
                playPing();
                const name = message.client?.names || "Cliente";
                const preview = (message.body || "Nuevo mensaje").slice(0, 80);
                showDesktopNotif(`📩 ${name}`, preview);
                toast.info(`📩 ${name}: ${preview}`, { autoClose: 3500 });
            }

            const newBucket = message.conversation_bucket;

            // 1. Actualización de CONTADORES (Badges)
            setBucketCounts((prev) => {
                const updated = { ...prev };
                const prevList = conversationsRef.current;
                const existing = prevList.find(c => c.client_id == clientId);
                
                const oldBucket = existing?.conversation_bucket;

                if (oldBucket && oldBucket !== newBucket) {
                    // Si ya estaba en la lista y cambió de bucket
                    updated[oldBucket] = Math.max(0, (updated[oldBucket] || 1) - 1);
                    updated[newBucket] = (updated[newBucket] || 0) + 1;
                } else if (!existing) {
                    // Si NO estaba en la lista (chat nuevo o de otro bucket/página)
                    // Solo incrementamos el nuevo si es pertinente
                    updated[newBucket] = (updated[newBucket] || 0) + 1;
                }
                return updated;
            });

            // 2. Actualización de LISTA
            setConversations((prev) => {
                const idx = prev.findIndex((c) => c.client_id == clientId);
                const activeBucket = bucketRef.current;

                if (idx === -1) {
                    // Si no está en la lista pero coincide con el filtro actual -> Recargar o agregar
                    if (activeBucket === "all" || activeBucket === newBucket) {
                        scheduleRefresh(); // Más seguro recargar para traer datos completos
                    }
                    return prev;
                }

                const cur = prev[idx];
                const updated: CrmConversation = {
                    ...cur,
                    last_message: message.body ?? cur.last_message,
                    last_message_at: message.sent_at || new Date().toISOString(),
                    last_message_type: message.message_type ?? cur.last_message_type,
                    conversation_bucket: newBucket,
                    unread_count: isIncoming && !isActiveChat ? (cur.unread_count || 0) + 1 : cur.unread_count,
                };

                // Si el bucket cambió y NO coincide con el filtro -> Remover (excepto si es el activo)
                if (activeBucket !== "all" && newBucket !== activeBucket && !isActiveChat) {
                    return sortConversations(prev.filter((c) => c.client_id != clientId), sortByRef.current);
                }
                
                return sortConversations(prev.map((c) => c.client_id == clientId ? updated : c), sortByRef.current);
            });

            // 3. Actualización de ÁREA DE CHAT
            if (isActiveChat) setIncomingMessage(message);
        });

        // Meta avisó que un mensaje se entregó, se leyó o no llegó: solo importa en el chat abierto
        channel.listen("WhatsappMessageStatus", (data: DeliveryInfo) => {
            if (data?.client_id && selectedRef.current?.client_id == data.client_id) setDeliveryUpdate(data);
        });

        channel.listen("WhatsappChatRead", (data: any) => {
            const { client_id, conversation_bucket: newBucket } = data;
            if (!client_id) return;

            // 1. Actualizar contadores si el bucket cambió
            if (newBucket) {
                setBucketCounts((prev) => {
                    const updated = { ...prev };
                    const existing = conversationsRef.current.find(c => c.client_id == client_id);
                    const oldBucket = existing?.conversation_bucket;
                    if (oldBucket && oldBucket !== newBucket) {
                        updated[oldBucket] = Math.max(0, (updated[oldBucket] || 1) - 1);
                        updated[newBucket] = (updated[newBucket] || 0) + 1;
                    }
                    return updated;
                });
            }

            // 2. Actualizar lista (marcar como leído y mover si es necesario)
            setConversations((prev) => {
                const idx = prev.findIndex((c) => c.client_id == client_id);
                if (idx === -1) return prev;

                const cur = prev[idx];
                const activeBucket = bucketRef.current;
                const finalBucket = newBucket || cur.conversation_bucket;
                const isActiveChat = selectedRef.current?.client_id == client_id;

                const updated = { ...cur, unread_count: 0, conversation_bucket: finalBucket };

                // Si cambió de bucket y no coincide con el filtro -> Remover (excepto si es el activo)
                if (activeBucket !== "all" && finalBucket !== activeBucket && !isActiveChat) {
                    return sortConversations(prev.filter((c) => c.client_id != client_id), sortByRef.current);
                }

                return sortConversations(prev.map((c) => c.client_id == client_id ? updated : c), sortByRef.current);
            });
        });

        return () => {
            channel.stopListening("WhatsappMessageReceived");
            channel.stopListening("WhatsappMessageStatus");
            channel.stopListening("WhatsappChatRead");
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [echo]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleSelect = (conv: CrmConversation) => {
        setConversations((prev) => prev.map((c) => c.client_id === conv.client_id ? { ...c, unread_count: 0 } : c));
        setIncomingMessage(null);
        setSelected(conv);
    };

    const handleBucketUpdate = (clientId: number, newBucket: string) => {
        setConversations((prev) => {
            const idx = prev.findIndex((c) => c.client_id === clientId);
            if (idx === -1) return prev;
            
            const cur = prev[idx];
            if (cur.conversation_bucket === newBucket) return prev;

            const updated = { ...cur, conversation_bucket: newBucket as any, unread_count: 0 };
            
            // Si el bucket cambió y hay filtro, remover de la vista
            const activeBucket = bucketRef.current;
            if (activeBucket !== "all" && newBucket !== activeBucket) {
                return sortConversations(prev.filter((c) => c.client_id !== clientId), sortBy);
            }
            return sortConversations(prev.map((c) => c.client_id === clientId ? updated : c), sortBy);
        });
    };

    const handleLoadMore = () => fetchConversations(true);

    return (
        <Layout noMargin>
            <Paper elevation={0} sx={{ display: "flex", height: "100vh", borderRadius: 0, overflow: "hidden", bgcolor: "background.default" }}>
                {initialLoad ? (
                    <Box sx={{ display: "flex", flex: 1, justifyContent: "center", alignItems: "center" }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        {/* Sidebar — visible en desktop, ocupa pantalla completa en mobile sin chat activo */}
                        <Box sx={{ display: { xs: selected ? "none" : "flex", md: "flex" }, flexDirection: "column", height: "100%" }}>
                                <CrmSidebar
                                    conversations={conversations}
                                    selected={selected}
                                    onSelect={handleSelect}
                                    loading={loading}
                                    searchTerm={searchTerm}
                                    onSearchChange={(v) => { setSearchTerm(v); }}
                                    bucket={bucket}
                                    onBucketChange={(b) => { setBucket(b); }}
                                    bucketCounts={bucketCounts}
                                    hasMore={hasMore}
                                    onLoadMore={handleLoadMore}
                                    isOffline={isOffline}
                                    onRefresh={() => fetchConversations(false)}
                                    isAdmin={isAdmin}
                                    agents={agents}
                                    agentId={agentId}
                                    onAgentChange={(id) => setAgentId(id)}
                                    leaderSlot={user?.leader_group ? <LeaderViewSelect value={leaderView} onChange={(v) => { setLeaderView(v); setSelected(null); }} minWidth={0} fullWidth /> : undefined}
                                    sortBy={sortBy}
                                    onSortChange={(s) => setSortBy(s)}
                                />
                        </Box>

                        {/* Área de chat */}
                        <Box sx={{ display: { xs: selected ? "flex" : "none", md: "flex" }, flexGrow: 1, flexDirection: "column", height: "100%", overflow: "hidden" }}>
                                <CrmChatArea
                                    selected={selected}
                                    incomingMessage={incomingMessage}
                                    deliveryUpdate={deliveryUpdate}
                                    onRefresh={() => fetchConversations(false)}
                                    onBucketUpdate={handleBucketUpdate}
                                    onBack={() => setSelected(null)}
                                    isAdmin={isAdmin}
                                    agents={agents}
                                />
                        </Box>
                    </>
                )}
            </Paper>
        </Layout>
    );
};
