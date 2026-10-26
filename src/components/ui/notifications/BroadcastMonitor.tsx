import { useEffect, useRef } from "react";
import { useSocketStore } from "../../../store/sockets/SocketStore";
import { useUserStore } from "../../../store/user/UserStore";
import { toast } from "react-toastify";
import { useOrdersStore } from "../../../store/orders/OrdersStore";
import { useNotificationStore, AppNotification, AppWhatsAppNotification } from "../../../store/notifications/NotificationStore";
import {
    AssignmentIndRounded,
    NewReleasesRounded,
    CheckCircleRounded,
    ScheduleRounded,
    TimerRounded,
    WarningAmberRounded,
    WhatsApp
} from "@mui/icons-material";

import { request } from "../../../common/request";
import { IResponse } from "../../../interfaces/response-type";
import { OrderDialog } from "../../orders/OrderDialog"; // Import OrderDialog if we need to mount it here? No, better mounted in Layout or Orders.tsx

export const BroadcastMonitor = () => {
    const { echo, setSocket } = useSocketStore();
    const { user } = useUserStore();
    const { updateOrderInColumns, setSelectedOrder, setIncomingWhatsappMessage } = useOrdersStore();
    const { addNotification, dismissNotification, addWhatsAppNotification } = useNotificationStore();

    useEffect(() => {
        if (!echo) {
            setSocket();
        }
    }, [echo, setSocket]);

    useEffect(() => {
        if (!echo || !user?.id) return;

        console.log("📡 Connecting to channel: App.Models.User." + user.id);
        const channelName = `App.Models.User.${user.id}`;

        const channel = echo.private(channelName);

        channel.notification(async (notification: any) => {
            console.log("🔔 Broadcast received:", notification);

            // 1. Play Sound
            try {
                const soundName = notification.sound || 'notification_sound';
                const soundFile = `/${soundName}.mp3`;
                console.log("🔊 Playing sound:", soundFile);
                const audio = new Audio(soundFile);
                await audio.play();
            } catch (e) {
                console.warn('Audio autoplay blocked or file not found', e);
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
            }

            // 3. Add to store (for the bell)
            const newNotif: AppNotification = {
                id: Date.now() + (notification.order_id || 0),
                orderId: notification.order_id || 0,
                orderName: notification.order_name || 'Nueva',
                type: notification.type === 'novelty' ? 'novedad' : (notification.type === 'scheduled' ? 'scheduled' : 'reminder'),
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
                autoClose: false,
                closeOnClick: false,
                position: "top-right",
                onClick: () => {
                    if (!notification.order_id && notification.url) {
                        toast.dismiss(toastId);
                        window.location.href = notification.url;
                        return;
                    }
                    if (notification.order_id) {
                        dismissNotification(notification.order_id);

                        // Fetch fresh order data logic is already in "Refresh Specific Order Data" below?
                        // No, we need to open the dialog. Fetching data updates the columns, but opening dialog requires data.
                        // Ideally we fetch and then set selected order.

                        const fetchAndOpen = async () => {
                            try {
                                const { status, response }: IResponse = await request(`/orders/${notification.order_id}`, 'GET');
                                if (status === 200) {
                                    const data = await response.json();
                                    const fullOrder = data.order || data;
                                    updateOrderInColumns(fullOrder);
                                    setSelectedOrder(fullOrder, 'detail'); // Open the dialog

                                }
                            } catch (e) {
                                console.error("Error opening order from notification", e);
                            }
                        };
                        fetchAndOpen();
                        toast.dismiss(toastId);
                    }
                }
            });

            // 5. Refresh Specific Order Data
            if (notification.order_id) {
                try {
                    const { status, response }: IResponse = await request(`/orders/${notification.order_id}`, 'GET');
                    if (status) {
                        const data = await response.json();
                        updateOrderInColumns(data.order || data);
                    }
                } catch (err) {
                    console.error("Error fetching updated order", err);
                }
            }
        });

        return () => {
            channel.stopListening('.Illuminate\\Notifications\\Events\\BroadcastNotificationCreated');
            echo.leave(channelName);
        };
    }, [echo, user?.id, updateOrderInColumns, addNotification, dismissNotification, setSelectedOrder]);

    // 🆕 LISTENER GLOBAL DE ORDENES (KANBAN)
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

        console.log("📡 Connecting to global channel:", channelName);

        const channel = echo.private(channelName);

        channel.listen('.App\\Events\\OrderUpdated', (e: any) => {
            console.log("♻️ Order Updated Event Received:", e);
            if (e.order) {
                // Actualizamos la orden en el store/kanban directamente
                updateOrderInColumns(e.order);
                console.log(`✅ Order #${e.order.id} updated via WebSocket`);
            }
        });

        if (!role.includes('agencia')) {
            channel.listen('.App\\Events\\WhatsappMessageReceived', (e: any) => {
                console.log("💬 WhatsApp Message Received:", e);
                const msg = e.message || e;

                // 🛑 SECURITY FALLBACK: Strict Multi-Agent Isolation
                const currentUserRole = user?.role?.description?.toLowerCase() || '';
                if (currentUserRole.includes('vendedor') && msg.agent_id && String(msg.agent_id) !== String(user?.id)) {
                    console.warn(`[Security] Ignored external message intended for agent ${msg.agent_id}`);
                    return;
                }
                if (currentUserRole.includes('agencia') && msg.agency_id && String(msg.agency_id) !== String(user?.id)) {
                    return;
                }

                // Dispatch to global store so OrderWhatsApp.tsx reacts instantly
                setIncomingWhatsappMessage(msg);

                if (msg.is_from_client) {
                    addWhatsAppNotification({
                        id: msg.id || Date.now(),
                        orderId: msg.order_id,
                        orderName: msg.order_id ? String(msg.order_id) : 'Unknown',
                        message: msg.body ? (msg.body.length > 50 ? msg.body.substring(0, 50) + '...' : msg.body) : 'Media file...',
                        time: new Date().toLocaleTimeString(),
                        createdAt: Date.now()
                    });

                     // 1. Toast Notification
                    const toastText = msg.body 
                        ? `WhatsApp: "${msg.body.substring(0, 40)}${msg.body.length > 40 ? '...' : ''}"` 
                        : `WhatsApp: 📷 Archivo recibido`;
                    const toastId = toast.info(toastText, {
                        icon: <div style={{ backgroundColor: '#25D366', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                            <WhatsApp sx={{ fontSize: '1.2rem' }} />
                        </div>,
                        autoClose: 10000,
                        position: "top-right",
                        onClick: async () => {
                            try {
                                const { status, response }: IResponse = await request(`/orders/${msg.order_id}`, 'GET');
                                if (status === 200) {
                                    const data = await response.json();
                                    setSelectedOrder(data.order || data, 'whatsapp');
                                }
                            } catch (err) {
                                console.error("Error opening order from WhatsApp toast", err);
                            }
                            toast.dismiss(toastId);
                        }
                    });

                    // 2. CRITICAL: Optimistic Global Store Update for Kanban Bubble!
                    // Find the current unread count dynamically across lists
                    let currentCount = 0;
                    const stateCols = useOrdersStore.getState().columns;
                    for (const colKey in stateCols) {
                        const found = stateCols[colKey].items.find((o: any) => String(o.id) === String(msg.order_id));
                        if (found) { 
                            currentCount = found.whatsapp_unread_count || 0; 
                            break; 
                        }
                    }

                    // Push partial object. updateOrderInColumns parses IDs natively.
                    updateOrderInColumns({ 
                        id: msg.order_id, 
                        whatsapp_unread_count: currentCount + 1 
                    });
                }
            });
        }



        return () => {
            channel.stopListening('.App\\Events\\OrderUpdated');
            channel.stopListening('.App\\Events\\WhatsappMessageReceived');
            echo.leave(channelName);
        };

    }, [echo, user?.id, updateOrderInColumns, setIncomingWhatsappMessage, setSelectedOrder]);

    return null;
};
