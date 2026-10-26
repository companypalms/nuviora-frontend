import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AppNotification {
    id: number;
    orderId: number;
    orderName: string;
    type: 'reminder' | 'scheduled' | 'novedad' | 'novelty_resolved' | 'assigned' | 'waiting_location';
    message: string;
    time: string;
    createdAt: number;
}

export interface AppWhatsAppNotification {
    id: number;
    orderId: number;
    orderName: string;
    message: string;
    time: string;
    createdAt: number;
}

interface NotificationState {
    notifications: AppNotification[];
    dismissedOrderIds: Record<number, number>; // orderId -> timestamp of last dismissal
    openDialogOrderId: number | null; // GLOBAL STATE FOR DIALOG
    addNotification: (notification: AppNotification) => void;
    dismissNotification: (orderId: number) => void;
    setOpenDialogOrderId: (id: number | null) => void;
    clearAll: () => void;
    
    // WHATSAPP SPECIFIC STATE
    whatsappNotifications: AppWhatsAppNotification[];
    addWhatsAppNotification: (notification: AppWhatsAppNotification) => void;
    dismissWhatsAppNotification: (orderId: number) => void;
    clearAllWhatsApp: () => void;
}

export const useNotificationStore = create<NotificationState>()(
    persist(
        (set) => ({
            notifications: [],
            dismissedOrderIds: {},
            openDialogOrderId: null,
            whatsappNotifications: [],
            setOpenDialogOrderId: (id) => set({ openDialogOrderId: id }),
            addNotification: (notification) => set((state) => {
                // Avoid duplicates for same order/type if recently notified
                const exists = state.notifications.find(
                    n => n.orderId === notification.orderId && n.type === notification.type
                );
                if (exists) return state;

                return {
                    notifications: [notification, ...state.notifications].slice(0, 50)
                };
            }),
            dismissNotification: (orderId) => set((state) => ({
                notifications: state.notifications.filter(n => n.orderId !== orderId),
                dismissedOrderIds: {
                    ...state.dismissedOrderIds,
                    [orderId]: Date.now()
                }
            })),
            clearAll: () => set({ notifications: [] }),

            // WHATSAPP ACTIONS
            addWhatsAppNotification: (notification) => set((state) => {
                // Avoid duplicates 
                const exists = state.whatsappNotifications.find(n => n.id === notification.id);
                if (exists) return state;

                // Also remove any older notification for the same order to prevent clutter, 
                // but keep the count of unique unread ones (actually, just replacing it is easier)
                const filtered = state.whatsappNotifications.filter(n => n.orderId !== notification.orderId);

                return {
                    whatsappNotifications: [notification, ...filtered].slice(0, 50)
                };
            }),
            dismissWhatsAppNotification: (orderId) => set((state) => ({
                whatsappNotifications: state.whatsappNotifications.filter(n => n.orderId !== orderId)
            })),
            clearAllWhatsApp: () => set({ whatsappNotifications: [] })
        }),
        { name: "notification-storage" }
    )
);
