import { useEffect, useRef } from "react";
import { useSocketStore } from "../../store/sockets/SocketStore";
import { useUserStore } from "../../store/user/UserStore";
import { useNotificationStore, AppNotification, AppWhatsAppNotification } from "../../store/notifications/NotificationStore";
import { toast } from "react-toastify";
import {
    AssignmentIndRounded,
    NewReleasesRounded,
    CheckCircleRounded,
    ScheduleRounded,
    TimerRounded,
    WarningAmberRounded,
    WhatsApp
} from "@mui/icons-material";
import { request } from "../../common/request";
import { useOrdersStore } from "../../store/orders/OrdersStore";

export const LiteBroadcastMonitor = ({ onOrderUpdate, onOpenOrder }: { onOrderUpdate: (reset?: boolean) => void, onOpenOrder?: (id: number) => void }) => {
    const { echo, setSocket } = useSocketStore();
    const { user } = useUserStore();
    const { addNotification, dismissNotification, addWhatsAppNotification } = useNotificationStore();
    const updateRef = useRef(onOrderUpdate);
    const openRef = useRef(onOpenOrder);

    useEffect(() => {
        updateRef.current = onOrderUpdate;
    }, [onOrderUpdate]);

    useEffect(() => {
        openRef.current = onOpenOrder;
    }, [onOpenOrder]);

    useEffect(() => {
        if (!echo) {
            setSocket();
        }
    }, [echo, setSocket]);

    useEffect(() => {
        if (!echo || !user?.id) return;

        const channelName = `App.Models.User.${user.id}`;

        const channel = echo.private(channelName);

        channel.notification(async (notification: any) => {
            console.log("🔔 Broadcast received (Lite):", notification);

            // 1. Play Sound
            try {
                const soundName = notification.sound || 'notification_sound';
                const soundFile = `/${soundName}.mp3`;
                console.log("🔊 Playing sound (Lite):", soundFile);
                const audio = new Audio(soundFile);
                await audio.play();
            } catch (e) {
                console.warn('Audio autoplay blocked or file not found (Lite)', e);
            }

            // 2. Select Icon and Color based on type
            let Icon = <AssignmentIndRounded />;
            let bgColor = user?.color || '#0073ff';

            switch (notification.type) {
                case 'novelty':
                    Icon = <NewReleasesRounded />;
                    bgColor = '#d32f2f'; // Error red
                    break;
                case 'novelty_resolved':
                    Icon = <CheckCircleRounded />;
                    bgColor = '#2e7d32'; // Success green
                    break;
                case 'scheduled':
                    Icon = <ScheduleRounded />;
                    bgColor = '#0288d1'; // Info blue
                    break;
                case 'waiting_location':
                    Icon = <TimerRounded />;
                    bgColor = '#ed6c02'; // Warning orange
                    break;
                case 'saturation':
                    // Alerta de saturación de una vendedora (spec de la Líder §9)
                    Icon = <WarningAmberRounded />;
                    bgColor = '#e65100';
                    break;
                case 'assigned':
                    Icon = <AssignmentIndRounded />;
                    bgColor = user?.color || '#0073ff';
                    break;
            }

            // 3. Add to store (for the bell)
            // Map incoming types to store types. We'll use the incoming type directly if it matches, or map it.
            let storeType: AppNotification['type'] = 'reminder';
            if (notification.type === 'novelty') storeType = 'novedad';
            else if (notification.type === 'novelty_resolved') storeType = 'novelty_resolved';
            else if (notification.type === 'assigned') storeType = 'assigned';
            else if (notification.type === 'waiting_location') storeType = 'waiting_location';
            else if (notification.type === 'scheduled') storeType = 'scheduled';

            const newNotif: AppNotification = {
                id: Date.now() + (notification.order_id || 0),
                orderId: notification.order_id || 0,
                orderName: notification.order_name || 'Nueva',
                type: storeType,
                message: notification.message,
                time: new Date().toISOString(),
                createdAt: Date.now()
            };
            addNotification(newNotif);

            // 4. Show Toast
            const toastId = toast.info(notification.message, {
                icon: (
                    <div style={{
                        backgroundColor: bgColor,
                        borderRadius: '50%',
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        flexShrink: 0
                    }}>
                        {Icon}
                    </div>
                ),
                autoClose: false, // Don't auto-close
                closeOnClick: false, // Handle manual click
                position: "top-right",
                onClick: () => {
                    const orderId = notification.order_id;
                    if (!orderId && notification.url) {
                        toast.dismiss(toastId);
                        window.location.href = notification.url;
                        return;
                    }
                    if (orderId) {
                        dismissNotification(orderId);

                        // Clean existing toast
                        toast.dismiss(toastId);

                        if (openRef.current) {
                            openRef.current(orderId);
                        }
                    }
                }
            });

            // 5. Refresh Data
            if (updateRef.current) {
                updateRef.current(true);
            }
        });

        return () => {
            channel.stopListening('.Illuminate\\Notifications\\Events\\BroadcastNotificationCreated');
            echo.leave(channelName);
        };
    }, [echo, user?.id]);

    // 🆕 LISTENER GLOBAL DE ORDENES (KANBAN) - Para actualizaciones en tiempo real
    useEffect(() => {
        if (!echo || !user?.id) return;

        const role = user.role?.description?.toLowerCase() || '';
        let channelName = 'orders';

        if (role.includes('agencia')) {
            channelName = `orders.agency.${user.id}`;
        } else if (role.includes('vendedor')) {
            channelName = `orders.agent.${user.id}`;
        } else if (role.includes('repartidor')) {
            channelName = `orders.deliverer.${user.id}`;
        }

        console.log("📡 [LITE] Connecting to global channel:", channelName);

        const channel = echo.private(channelName);

        channel.listen('OrderUpdated', (e: any) => {
            console.log("♻️ [LITE] Order Updated Event:", e);
            if (e.order) {
                // Refrescar la lista completa en Lite
                if (updateRef.current) {
                    updateRef.current(true); // Reset para traer data fresca
                }
                console.log(`✅ [LITE] Order #${e.order.id} updated via WebSocket`);
            }
        });

        // WhatsApp Listener for Lite Version
        channel.listen('.App\\Events\\WhatsappMessageReceived', (e: any) => {
            const msg = e.message || e;

            // 🛑 SECURITY FALLBACK: Strict Multi-Agent Isolation
            const currentUserRole = user?.role?.description?.toLowerCase() || '';
            if (currentUserRole.includes('vendedor') && msg.agent_id && String(msg.agent_id) !== String(user?.id)) {
                return;
            }
            if (currentUserRole.includes('agencia') && msg.agency_id && String(msg.agency_id) !== String(user?.id)) {
                return;
            }

            if (msg.is_from_client) {
                // Add to the new isolated state
                addWhatsAppNotification({
                    id: msg.id || Date.now(),
                    orderId: msg.order_id,
                    orderName: msg.order_id ? String(msg.order_id) : 'Unknown',
                    message: msg.body ? (msg.body.length > 50 ? msg.body.substring(0, 50) + '...' : msg.body) : 'Media file...',
                    time: new Date().toLocaleTimeString(),
                    createdAt: Date.now()
                });

                const toastText = msg.body 
                    ? `WhatsApp: "${msg.body.substring(0, 40)}${msg.body.length > 40 ? '...' : ''}"` 
                    : `WhatsApp: 📷 Archivo recibido`;
                const toastId = toast.info(toastText, {
                    icon: <div style={{ backgroundColor: '#25D366', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <WhatsApp sx={{ fontSize: '1.2rem' }} />
                    </div>,
                    autoClose: 10000,
                    position: "top-right",
                    onClick: () => {
                        toast.dismiss(toastId);
                        if (msg.order_id && openRef.current) {
                            useOrdersStore.getState().setInitialTabId('whatsapp');
                            openRef.current(msg.order_id);
                        }
                    }
                });

                // Update orders table so the bubble UI appears
                if (updateRef.current) {
                    updateRef.current(true);
                }
            }
        });

        return () => {
            channel.stopListening('OrderUpdated');
            channel.stopListening('.App\\Events\\WhatsappMessageReceived');
            echo.leave(channelName);
        };
    }, [echo, user?.id]);

    return null;
};
