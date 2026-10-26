import React, { useEffect, useRef } from "react";
import { useOrdersStore } from "../../../store/orders/OrdersStore";
import { useNotificationStore, AppNotification } from "../../../store/notifications/NotificationStore";
import { toast } from "react-toastify";
import { useUserStore } from "../../../store/user/UserStore";
import { orderNo } from "../../../lib/functions";

export const NotificationMonitor = () => {
    const { columns, setSelectedOrder } = useOrdersStore();
    const { addNotification, dismissedOrderIds, notifications, dismissNotification } = useNotificationStore();
    const user = useUserStore(s => s.user);
    const toastedRef = useRef<Set<number>>(new Set());

    useEffect(() => {
        const checkReminders = () => {
            const now = new Date();
            let newFound = false;

            // Gather all currently loaded orders from all columns
            const allLoadedOrders = Object.values(columns).flatMap(col => col.items);

            allLoadedOrders.forEach(order => {
                const processAlert = (timeStr: string, type: AppNotification['type'], label: string) => {
                    if (!timeStr) return;
                    const time = new Date(timeStr);
                    const diff = now.getTime() - time.getTime();

                    // Si la hora ya pasó (pero no por más de 24h)
                    if (diff >= 0 && diff < 86400000) {
                        const lastDismissed = dismissedOrderIds[order.id] || 0;
                        const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);

                        // Si no ha sido descartado recientemente
                        if (lastDismissed < twoHoursAgo) {
                            const exists = notifications.some(n => n.orderId === order.id && n.type === type);

                            if (!exists) {
                                const newNotif: AppNotification = {
                                    id: Date.now() + order.id,
                                    orderId: order.id,
                                    orderName: order.name,
                                    type,
                                    message: `${label}: ${orderNo(order.name)}`,
                                    time: timeStr,
                                    createdAt: Date.now()
                                };

                                addNotification(newNotif);
                                newFound = true;

                                // Mostrar toast solo una vez por sesión para este pedido
                                if (!toastedRef.current.has(order.id)) {
                                    const toastId = toast.warning(`⏰ ${label}: Orden ${orderNo(order.name)}`, {
                                        autoClose: false, // Persistente
                                        position: "top-right",
                                        onClick: () => {
                                            dismissNotification(order.id);
                                            // Trigger global dialog opening
                                            useNotificationStore.getState().setOpenDialogOrderId(order.id);
                                            toast.dismiss(toastId);
                                        }
                                    });
                                    toastedRef.current.add(order.id);
                                }
                            }
                        }
                    }
                };

                if (order.reminder_at) {
                    processAlert(order.reminder_at, "reminder", "Recordatorio");
                }

                if (order.scheduled_for && order.status && (order.status.description === 'Programado para mas tarde' || order.status.description === 'Reprogramado para hoy')) {
                    // Filtrar por rol y asignación
                    // Nota: Admin excluido a petición del cliente
                    let canSee = true;
                    if (user.role?.description === 'Admin') canSee = false;
                    else if (user.role?.description === 'Agencia') canSee = false;
                    else if (user.role?.description === 'Vendedor' && order.agent_id !== user.id) canSee = false;

                    if (canSee) {
                        processAlert(order.scheduled_for, "scheduled", "Contacto/Entrega");
                    }
                }
            });

            if (newFound) {
                const audio = new Audio('/notification_sound.mp3');
                audio.play().catch(e => console.log('Audio feedback blocked by browser until user interaction.'));
            }
        };

        const interval = setInterval(checkReminders, 20000); // Revisar cada 20s
        checkReminders();
        return () => clearInterval(interval);
    }, [columns, dismissedOrderIds, addNotification, notifications, dismissNotification, setSelectedOrder, user]);

    return null;
};
