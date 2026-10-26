import { useState, useEffect, ChangeEvent } from "react";
import { toast } from "react-toastify";
import { request } from "../common/request";
import { sendOrderStatus } from "../common/orderStatus";
import { IResponse } from "../interfaces/response-type";
import { useOrdersStore } from "../store/orders/OrdersStore";
import { useUserStore } from "../store/user/UserStore";
import { orderNo } from "../lib/functions";

/** El motivo que da el servidor (por ejemplo "No se puede modificar una orden entregada."), o el texto por defecto. */
const serverMessage = async (response: Response, fallback: string) => {
    const data = await response.json().catch(() => ({}));
    return data?.message || fallback;
};

export const useOrderDialogLogic = (
    id: number | undefined,
    open: boolean,
    setOpen: React.Dispatch<React.SetStateAction<boolean>>
) => {
    const { selectedOrder, setSelectedOrder, updateOrderInColumns, initialTabId } = useOrdersStore();

    const user = useUserStore((state) => state.user);

    const [openCancel, setOpenCancel] = useState(false);
    const [openPostpone, setOpenPostpone] = useState(false);
    const [openApprove, setOpenApprove] = useState(false);
    const [openReject, setOpenReject] = useState(false);
    const [openApproveDelivery, setOpenApproveDelivery] = useState(false);
    const [openRejectDelivery, setOpenRejectDelivery] = useState(false);
    const [openApproveLocation, setOpenApproveLocation] = useState(false);

    const [openRejectLocation, setOpenRejectLocation] = useState(false);
    const [openApproveRejection, setOpenApproveRejection] = useState(false);
    const [openRejectRejection, setOpenRejectRejection] = useState(false);

    // 🆕 Novedades and Cash
    const [openMarkDelivered, setOpenMarkDelivered] = useState(false);
    const [openReportNovedad, setOpenReportNovedad] = useState(false);
    const [openResolveNovedad, setOpenResolveNovedad] = useState(false);
    const [pendingStatus, setPendingStatus] = useState<{ description: string } | null>(null);
    const [targetStatus, setTargetStatus] = useState<string | undefined>(undefined);
    const [pendingExtraData, setPendingExtraData] = useState<any>(null);

    const [loadingReview, setLoadingReview] = useState(false);
    const [openAssignDeliverer, setOpenAssignDeliverer] = useState(false);
    const [openAssign, setOpenAssign] = useState(false);
    const [newLocation, setNewLocation] = useState<string>("");

    const handleClose = () => {
        setOpen(false);
        setSelectedOrder(null);
    };

    const fetchOrder = async () => {
        if (!id) return;
        const { status, response }: IResponse = await request(`/orders/${id}`, "GET");
        if (status === 200) {
            const data = await response.json();
            setSelectedOrder(data.order);
            setNewLocation(data.order.location || "");
        } else if (status === 403) {
            // 🔒 No es su orden: cerrar y avisar sin dejar el diálogo en blanco.
            toast.error("No tienes permiso para ver esta orden.");
            setSelectedOrder(null);
            setOpen(false);
        } else {
            toast.error("No se pudo cargar la orden.");
            setSelectedOrder(null);
            setOpen(false);
        }
    };

    useEffect(() => {
        if (id && open) {
            fetchOrder();
        }
    }, [id, open]);


    const sendLocation = async () => {
        if (!newLocation || !id) return;
        const body = new URLSearchParams();
        body.append('location', String(newLocation));

        try {
            const { status, response }: IResponse = await request(
                `/orders/${id}/location`,
                "PUT",
                body
            );
            if (status === 200) {
                const data = await response.json();
                updateOrderInColumns(data.data); // Backend returns the order in 'data' key for this specific endpoint
                toast.success('Ubicacion actualizada');
            } else {
                // Fran (2026-10-12): solo se acepta un link de Google Maps; el backend dice por qué no
                const data = await response.json().catch(() => null);
                toast.error(data?.message ?? 'No se logro añadir la ubicacion');
            }
        } catch (e) {
            toast.error('No se logro conectar con el servidor');
            console.log({ e });
        }
    };

    const approveCancellation = async (note: string) => {
        if (!selectedOrder) return;
        setLoadingReview(true);
        try {
            const pending = (selectedOrder.cancellations ?? []).find((c: any) => c.status === "pending");
            if (!pending) {
                toast.error("No hay solicitud pendiente");
                return;
            }
            const body = new URLSearchParams();
            if (note.trim()) body.append("response_note", note.trim());

            const { status, response }: IResponse = await request(
                `/orders/cancellations/${pending.id}/approve`,
                "PUT",
                body
            );
            if (status >= 200 && status < 300) {
                const data = await response.json();
                updateOrderInColumns(data.order);
                toast.success("Cancelación aprobada ✅");
                setOpenApprove(false);
            } else {
                toast.error(await serverMessage(response, "No se pudo aprobar ❌"));
            }
        } catch {
            toast.error("Error al aprobar 🚨");
        } finally {
            setLoadingReview(false);
        }
    };

    const rejectCancellation = async (note: string) => {
        if (!selectedOrder) return;
        setLoadingReview(true);
        try {
            const pending = (selectedOrder.cancellations ?? []).find((c: any) => c.status === "pending");
            if (!pending) {
                toast.error("No hay solicitud pendiente");
                return;
            }
            const body = new URLSearchParams();
            if (note.trim()) body.append("response_note", note.trim());

            const { status, response }: IResponse = await request(
                `/orders/cancellations/${pending.id}/reject`,
                "PUT",
                body
            );
            if (status >= 200 && status < 300) {
                const data = await response.json();
                updateOrderInColumns(data.order);
                toast.success("Cancelación rechazada ❎");
                setOpenReject(false);
            } else {
                toast.error(await serverMessage(response, "No se pudo rechazar ❌"));
            }
        } catch {
            toast.error("Error al rechazar 🚨");
        } finally {
            setLoadingReview(false);
        }
    };

    const changeStatus = async (status: string, extraData: any = null) => {
        if (!selectedOrder) return;

        // 🔒 Strict rule: If currently "Novedades", ONLY can go to "Novedad Solucionada" or Postponed statuses
        if (selectedOrder.status.description === "Novedades") {
            const isPostponing = (status === "Programado para otro dia" || status === "Programado para mas tarde");

            if (isPostponing) {
                if (!extraData?.novedad_resolution) {
                    setPendingStatus({ description: status });
                    setOpenResolveNovedad(true);
                    return;
                }
            } else if (status !== "Novedad Solucionada") {
                toast.error("Una orden en Novedades solo puede pasar a Novedad Solucionada o Programarse ⚠️");
                return;
            }
        }

        // Intercept Novedades
        if (status === "Novedades" && !extraData) {
            setPendingStatus({ description: status });
            setOpenReportNovedad(true);
            return;
        }

        // Intercept Novedad Solucionada
        if (status === "Novedad Solucionada" && !extraData) {
            // Validations
            if (!selectedOrder.location) {
                toast.error("Se requiere una ubicación para marcar como solucionada 📍");
                return;
            }
            if (!selectedOrder.payments || selectedOrder.payments.length === 0) {
                // Skip payment validation for return, exchange or $0 orders
                const total = Number(selectedOrder.current_total_price);
                if (!selectedOrder.is_return && !selectedOrder.is_exchange && total > 0) {
                    toast.error("Se requieren métodos de pago registrados 💳");
                    return;
                }
            }
            // Check coverage/change
            const totalPaid = selectedOrder.payments.reduce((acc: number, p: any) => acc + Number(p.amount), 0);
            const total = Number(selectedOrder.current_total_price);

            // Allow a small margin of error for float comparisons (though typically strict >= is fine here)
            // But strict requirement: "totalmente pagados"
            if (totalPaid < total - 0.01) {
                toast.error(`El monto pagado ($${totalPaid.toFixed(2)}) es menor al total ($${total.toFixed(2)}). Debe cubrirse el total.`);
                return;
            }

            // Validate excess payment (change)
            if (totalPaid > total + 0.01) {
                if (!selectedOrder.change_covered_by) {
                    toast.error("El monto pagado excede el total. Debe registrar quién cubre el vuelto (Agencia/Empresa) 💸");
                    return;
                }
            }

            setPendingStatus({ description: status });
            setOpenResolveNovedad(true);
            return;
        }



        // Validar que existe comprobante de pago si se intenta cambiar a Entregado
        // Skip for return/exchange orders - they don't require payment receipts
        if (status === "Entregado" && !selectedOrder.is_return && !selectedOrder.is_exchange) {
            if (!selectedOrder.payment_receipt) {
                toast.error("No se puede marcar como entregado sin un comprobante de pago ❌");
                return;
            }
            if (!extraData) {
                setPendingStatus({ description: status });
                setOpenMarkDelivered(true);
                return;
            }
        }

        // Intercept postponing
        if (status === "Programado para otro dia" || status === "Programado para mas tarde") {
            setTargetStatus(status);
            setPendingExtraData(extraData);
            setOpenPostpone(true);
            return;
        }

        const body = new URLSearchParams();
        body.append("status", status);

        if (extraData) {
            Object.keys(extraData).forEach(key => {
                body.append(key, String(extraData[key]));
            });
        }

        try {
            const sent: IResponse | null = await sendOrderStatus(selectedOrder.id, body);
            if (!sent) return; // ya hay un cambio de esta orden en camino (doble toque)
            const { status: ok, response } = sent;
            if (ok === 200) {
                const data = await response.json();
                updateOrderInColumns(data.order);
                toast.success(`Orden ${orderNo(selectedOrder.name)} actualizada a ${status} ✅`);

                // Cleanup
                setOpenMarkDelivered(false);
                setOpenReportNovedad(false);
                setOpenResolveNovedad(false);
                setPendingStatus(null);
            } else {
                const errorData = await response.json();
                toast.error(errorData.message || "No se pudo actualizar el estado ❌");
            }
        } catch (e) {
            console.error("Error updating status:", e);
            toast.error("Error en el servidor al actualizar estado 🚨");
        }
    };

    const addUpsell = async (productId: number, quantity: number, price: number, is_upsell: boolean = true, variantId?: number | null) => {
        if (!selectedOrder) return false;
        try {
            const body = new URLSearchParams();
            body.append("product_id", String(productId));
            if (variantId) body.append("variant_id", String(variantId)); // tarea 4: la talla elegida
            body.append("quantity", String(quantity));
            body.append("is_upsell", is_upsell ? "1" : "0");

            // Don't send price for return/exchange orders - backend will set it to 0
            if (!selectedOrder.is_return && !selectedOrder.is_exchange) {
                body.append("price", String(price));
            }

            const { status, response }: IResponse = await request(
                `/orders/${selectedOrder.id}/upsell`,
                "POST",
                body
            );

            // Antes cualquier respuesta contaba como éxito (un 422 mostraba su mensaje en verde)
            if (status >= 200 && status < 300) {
                const data = await response.json();
                updateOrderInColumns(data.order);
                await fetchOrder(); // trae la línea con su talla y su stock
                toast.success(data.message || ((selectedOrder.is_return || selectedOrder.is_exchange) ? "Producto agregado ✅" : "Agregado correctamente ✅"));
                return true;
            } else {
                // 🔥 CLIENT REQUEST: Mostrar mensaje específico si se bloqueó por modificación de productos originales
                const errorData = await response.json();
                toast.error(errorData.message || "Error al agregar producto ❌");
                return false;
            }
        } catch {
            toast.error("Error de servidor 🚨");
            return false;
        }
    };

    const removeUpsell = async (itemId: number) => {
        if (!selectedOrder) return;
        try {
            const { status, response }: IResponse = await request(
                `/orders/${selectedOrder.id}/upsell/${itemId}`,
                "DELETE"
            );

            if (status >= 200 && status < 300) {
                const data = await response.json();
                updateOrderInColumns(data.order);
                toast.success("Upsell eliminado correctamente ✅");
            } else {
                toast.error(await serverMessage(response, "Error al eliminar upsell ❌"));
            }
        } catch {
            toast.error("Error de servidor 🚨");
        }
    };
    const updateProductQuantity = async (itemId: number, quantity?: number, price?: number) => {
        if (!selectedOrder) return;
        try {
            const body = new URLSearchParams();
            if (quantity !== undefined) body.append("quantity", String(quantity));
            if (price !== undefined) body.append("price", String(price));

            const { status, response }: IResponse = await request(
                `/orders/${selectedOrder.id}/upsell/${itemId}`,
                "PUT",
                body
            );

            if (status >= 200 && status < 300) {
                const data = await response.json();
                updateOrderInColumns(data.order);
                toast.success("Producto actualizado ✅");
            } else {
                toast.error(await serverMessage(response, "Error al actualizar producto ❌"));
            }
        } catch {
            toast.error("Error de servidor 🚨");
        }
    };

    /** Tarea 4: cambia la talla o variante de una línea. Si la orden ya descontó, el stock se ajusta solo. */
    const changeProductVariant = async (itemId: number, variantId: number) => {
        if (!selectedOrder) return;
        try {
            const body = new URLSearchParams();
            body.append("variant_id", String(variantId));
            const { status, response }: IResponse = await request(`/orders/${selectedOrder.id}/upsell/${itemId}`, "PUT", body);
            const data = await response.json().catch(() => ({}));
            if (status >= 200 && status < 300) {
                updateOrderInColumns(data.order);
                toast.success("Talla cambiada ✅");
                await fetchOrder();
            } else {
                toast.error(data.message || "No se pudo cambiar la talla ❌");
            }
        } catch {
            toast.error("Error de servidor 🚨");
        }
    };

    const approveDelivery = async (note: string) => {
        if (!selectedOrder) return;
        setLoadingReview(true);
        try {
            const pending = (selectedOrder.delivery_reviews ?? []).find((c: any) => c.status === "pending");
            if (!pending) {
                toast.error("No hay solicitud de entrega pendiente");
                return;
            }
            const body = new URLSearchParams();
            if (note.trim()) body.append("response_note", note.trim());

            const { status, response }: IResponse = await request(
                `/orders/delivery-review/${pending.id}/approve`,
                "PUT",
                body
            );
            if (status >= 200 && status < 300) {
                const data = await response.json();
                updateOrderInColumns(data.order);
                toast.success("Entrega aprobada ✅");
                setOpenApproveDelivery(false);
            } else {
                toast.error(await serverMessage(response, "No se pudo aprobar la entrega ❌"));
            }
        } catch {
            toast.error("Error al aprobar entrega 🚨");
        } finally {
            setLoadingReview(false);
        }
    };

    const rejectDelivery = async (note: string) => {
        if (!selectedOrder) return;
        setLoadingReview(true);
        try {
            const pending = (selectedOrder.delivery_reviews ?? []).find((c: any) => c.status === "pending");
            if (!pending) {
                toast.error("No hay solicitud de entrega pendiente");
                return;
            }
            const body = new URLSearchParams();
            if (note.trim()) body.append("response_note", note.trim());

            const { status, response }: IResponse = await request(
                `/orders/delivery-review/${pending.id}/reject`,
                "PUT",
                body
            );
            if (status >= 200 && status < 300) {
                const data = await response.json();
                updateOrderInColumns(data.order);
                toast.success("Entrega rechazada ❎");
                setOpenRejectDelivery(false);
            } else {
                toast.error(await serverMessage(response, "No se pudo rechazar la entrega ❌"));
            }
        } catch {
            toast.error("Error al rechazar entrega 🚨");
        } finally {
            setLoadingReview(false);
        }
    };

    const approveLocation = async (note: string) => {
        if (!selectedOrder) return;
        setLoadingReview(true);
        try {
            const pending = (selectedOrder.location_reviews ?? []).find((c: any) => c.status === "pending");
            if (!pending) {
                toast.error("No hay solicitud de ubicación pendiente");
                return;
            }
            const body = new URLSearchParams();
            if (note.trim()) body.append("response_note", note.trim());

            const { status, response }: IResponse = await request(
                `/orders/location-review/${pending.id}/approve`,
                "PUT",
                body
            );
            if (status >= 200 && status < 300) {
                const data = await response.json();
                updateOrderInColumns(data.order);
                toast.success("Cambio de ubicación aprobado ✅");
                setOpenApproveLocation(false);
            } else {
                toast.error(await serverMessage(response, "No se pudo aprobar el cambio ❌"));
            }
        } catch {
            toast.error("Error al aprobar 🚨");
        } finally {
            setLoadingReview(false);
        }
    };

    const rejectLocation = async (note: string) => {
        if (!selectedOrder) return;
        setLoadingReview(true);
        try {
            const pending = (selectedOrder.location_reviews ?? []).find((c: any) => c.status === "pending");
            if (!pending) {
                toast.error("No hay solicitud de ubicación pendiente");
                return;
            }
            const body = new URLSearchParams();
            if (note.trim()) body.append("response_note", note.trim());

            const { status, response }: IResponse = await request(
                `/orders/location-review/${pending.id}/reject`,
                "PUT",
                body
            );
            if (status >= 200 && status < 300) {
                const data = await response.json();
                updateOrderInColumns(data.order);
                toast.success("Cambio de ubicación rechazado ❎");
                setOpenRejectLocation(false);
            } else {
                toast.error(await serverMessage(response, "No se pudo rechazar el cambio ❌"));
            }
        } catch {
            toast.error("Error al rechazar 🚨");
        } finally {
            setLoadingReview(false);
        }
    };

    const approveRejection = async (note: string) => {
        if (!selectedOrder) return;
        setLoadingReview(true);
        try {
            const pending = (selectedOrder.rejection_reviews ?? []).find((c: any) => c.status === "pending");
            if (!pending) {
                toast.error("No hay solicitud de rechazo pendiente");
                return;
            }
            const body = new URLSearchParams();
            if (note.trim()) body.append("response_note", note.trim());

            const { status, response }: IResponse = await request(
                `/orders/rejection-review/${pending.id}/approve`,
                "PUT",
                body
            );
            if (status >= 200 && status < 300) {
                const data = await response.json();
                updateOrderInColumns(data.order);
                toast.success("Rechazo aprobado ✅");
                setOpenApproveRejection(false);
            } else {
                toast.error(await serverMessage(response, "No se pudo aprobar el rechazo ❌"));
            }
        } catch {
            toast.error("Error el aprobar 🚨");
        } finally {
            setLoadingReview(false);
        }
    };

    const rejectRejection = async (note: string) => {
        if (!selectedOrder) return;
        setLoadingReview(true);
        try {
            const pending = (selectedOrder.rejection_reviews ?? []).find((c: any) => c.status === "pending");
            if (!pending) {
                toast.error("No hay solicitud de rechazo pendiente");
                return;
            }
            const body = new URLSearchParams();
            if (note.trim()) body.append("response_note", note.trim());

            const { status, response }: IResponse = await request(
                `/orders/rejection-review/${pending.id}/reject`,
                "PUT",
                body
            );
            if (status >= 200 && status < 300) {
                const data = await response.json();
                updateOrderInColumns(data.order);
                toast.success("Solicitud de rechazo denegada ❎");
                setOpenRejectRejection(false);
            } else {
                toast.error(await serverMessage(response, "No se pudo denegar la solicitud ❌"));
            }
        } catch {
            toast.error("Error al denegar 🚨");
        } finally {
            setLoadingReview(false);
        }
    };

    const handleChangeNewLocation = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setNewLocation(e.target.value);
    };

    const setReminder = async (date: string) => {
        if (!selectedOrder) return;
        try {
            const body = new URLSearchParams();
            body.append('reminder_at', date);

            const { status, response }: IResponse = await request(
                `/orders/${selectedOrder.id}/reminder`,
                "PUT",
                body
            );
            if (status >= 200 && status < 300) {
                const data = await response.json();
                updateOrderInColumns(data.order);
                toast.success('Recordatorio establecido 📅');
            } else {
                toast.error(await serverMessage(response, 'Error al guardar recordatorio'));
            }
        } catch {
            toast.error('Error de conexión');
        }
    };

    // 🔥 CLIENT REQUEST: Admin can manually edit order total
    const updateOrderTotal = async (newTotal: number) => {
        if (!selectedOrder) return;
        try {
            const body = new URLSearchParams();
            body.append('total', String(newTotal));

            const { status, response }: IResponse = await request(
                `/orders/${selectedOrder.id}/total`,
                "PUT",
                body
            );
            if (status >= 200 && status < 300) {
                const data = await response.json();
                updateOrderInColumns(data.order);
                toast.success('Total actualizado correctamente ✅');
            } else {
                const errorData = await response.json();
                toast.error(errorData.message || 'Error al actualizar total');
            }
        } catch {
            toast.error('Error de conexión');
        }
    };

    return {
        selectedOrder,
        initialTabId,
        user,

        openCancel, setOpenCancel,
        openPostpone, setOpenPostpone,
        openApprove, setOpenApprove,
        openReject, setOpenReject,
        loadingReview,
        openAssignDeliverer, setOpenAssignDeliverer,
        openAssign, setOpenAssign,
        newLocation,
        handleClose,
        sendLocation,
        approveCancellation,
        rejectCancellation,
        changeStatus,
        handleChangeNewLocation,
        updateOrder: updateOrderInColumns,
        addUpsell,
        removeUpsell,
        changeProductVariant,
        openApproveDelivery, setOpenApproveDelivery,
        openRejectDelivery, setOpenRejectDelivery,
        approveDelivery,
        rejectDelivery,
        openApproveLocation, setOpenApproveLocation,
        openRejectLocation, setOpenRejectLocation,
        openApproveRejection, setOpenApproveRejection,
        openRejectRejection, setOpenRejectRejection,
        approveLocation,
        rejectLocation,
        approveRejection,
        rejectRejection,
        setReminder,
        // 🆕 
        openMarkDelivered, setOpenMarkDelivered,
        openReportNovedad, setOpenReportNovedad,
        openResolveNovedad, setOpenResolveNovedad,
        pendingStatus,
        targetStatus,
        pendingExtraData,
        fetchOrder,
        refreshOrder: fetchOrder,
        updateProductQuantity,
        updateOrderTotal,
    };
};
