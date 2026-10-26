import React, { useEffect, useRef } from "react";
import { useNotificationStore, AppNotification } from "../../store/notifications/NotificationStore";
import { toast } from "react-toastify";
import { useUserStore } from "../../store/user/UserStore";
import { orderNo } from "../../lib/functions";

interface LiteNotificationMonitorProps {
    orders: any[];
    onOpenOrder?: (id: number) => void;
}

export const LiteNotificationMonitor: React.FC<LiteNotificationMonitorProps> = ({ orders, onOpenOrder }) => {
    const { addNotification, dismissedOrderIds, notifications, dismissNotification } = useNotificationStore();
    const user = useUserStore(s => s.user);
    const toastedRef = useRef<Set<number>>(new Set());
    const openRef = useRef(onOpenOrder);

    useEffect(() => {
        openRef.current = onOpenOrder;
    }, [onOpenOrder]);

    useEffect(() => {
        if (!orders || orders.length === 0) return;

        const checkReminders = () => {
            const now = new Date();
            let newFound = false;

            orders.forEach(order => {
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

                                if (!toastedRef.current.has(order.id)) {
                                    const toastId = toast.warning(`⏰ ${label}: Orden ${orderNo(order.name)}`, {
                                        autoClose: false,
                                        position: "top-right",
                                        onClick: () => {
                                            if (openRef.current) {
                                                dismissNotification(order.id);
                                                openRef.current(order.id);
                                                toast.dismiss(toastId);
                                            }
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
                    // Nota: Admin excluido a petición del cliente
                    let canSee = true;
                    if (user.role?.description === 'Admin') canSee = false;
                    else if (user.role?.description === 'Agencia') canSee = false;
                    else if (user.role?.description === 'Vendedor' && order.agent_id !== user.id) canSee = false;

                    if (canSee) {
                        processAlert(order.scheduled_for, "scheduled", "Contacto/Entrega");
                    }
                }

                // New Time-based Alerts mirroring OrderTimer
                if (order.status?.description === 'Novedades' && order.updated_at) {
                    // 10 minutes limit for Novedades
                    const time = new Date(order.updated_at);
                    const diff = now.getTime() - time.getTime();
                    if (diff > 10 * 60 * 1000) {
                        // We trick processAlert by passing a past time that triggers 'diff >= 0' logic immediately
                        // actually processAlert expects 'timeStr' as the TARGET time.
                        // For deadlines, target = start + limit.
                        const deadline = new Date(time.getTime() + 10 * 60 * 1000);
                        processAlert(deadline.toISOString(), "novedad", "Límite Novedad Excedido");
                    }
                }

                if (order.status?.description === 'Esperando Ubicacion' && order.received_at) {
                    // 30 minutes limit
                    const time = new Date(order.received_at);
                    const deadline = new Date(time.getTime() + 30 * 60 * 1000);
                    processAlert(deadline.toISOString(), "waiting_location", "Tiempo de Espera Excedido");
                }

                if ((order.status?.description === 'En ruta' || order.status?.description === 'Asignar a agencia') && order.received_at) {
                    // 45 minutes limit
                    const time = new Date(order.received_at);
                    const deadline = new Date(time.getTime() + 45 * 60 * 1000);
                    processAlert(deadline.toISOString(), "reminder", "Tiempo de Entrega Excedido");
                }
            });

            if (newFound) {
                const audio = new Audio('/notification_sound.mp3');
                audio.play().catch(e => console.log('Audio feedback blocked by browser.'));
            }
        };

        checkReminders();
        const interval = setInterval(checkReminders, 30000);
        return () => clearInterval(interval);

    }, [orders, dismissedOrderIds, addNotification, notifications, dismissNotification, user]);

    return null;
};
