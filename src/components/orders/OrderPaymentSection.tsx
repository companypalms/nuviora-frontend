import React, { useState } from "react";
import { Box, Typography, CircularProgress, Card, CardMedia, Dialog, IconButton, Zoom, Backdrop } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import ReceiptLongRounded from "@mui/icons-material/ReceiptLongRounded";
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import DeleteRounded from "@mui/icons-material/DeleteRounded";
import PaymentMethodsSelector, { PaymentMethod } from "./payment_method/PaymentMethod";
import { request } from "../../common/request";
import { receiptUrl, orderPaymentReceiptUrl } from "../../common/receipts";
import { toast } from "react-toastify";
import { IResponse } from "../../interfaces/response-type";
import { ButtonCustom } from "../custom";
import { useUserStore } from "../../store/user/UserStore";
import { useReceiptChecks } from "./receipt-checks/receiptChecks";
import { ReceiptCheckChip, ReceiptChecksPanel } from "./receipt-checks/ReceiptCheckViews";

interface OrderPaymentSectionProps {
    order: any;
    onPaymentsChange?: (payments: PaymentMethod[]) => void;
    onUpdate?: () => void;
}

export const OrderPaymentSection: React.FC<OrderPaymentSectionProps> = ({ order, onPaymentsChange, onUpdate }) => {
    const user = useUserStore((state) => state.user);
    const [uploading, setUploading] = useState(false);

    const isDelivered = order.status?.description === 'Entregado';
    const isAdmin = user.role?.description === 'Admin';
    const canEdit = !isDelivered || isAdmin;

    // Viewer states
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const initialPayments: PaymentMethod[] = order.payments?.length > 0
        ? order.payments.map((p: any) => ({
            method: p.method,
            amount: Number(p.amount),
        }))
        : [{ method: "", amount: 0 }];

    const handleSavePayments = async (payments: PaymentMethod[]) => {
        const body = new URLSearchParams();

        payments.forEach((payment, index) => {
            body.append(`payments[${index}][method]`, payment.method);
            body.append(`payments[${index}][amount]`, payment.amount.toString());
            if (payment.rate) {
                body.append(`payments[${index}][rate]`, payment.rate.toString());
            }
        });

        try {
            const { status, response }: IResponse = await request(
                `/orders/${order.id}/payment`,
                "PUT",
                body
            );

            if (status === 200) {
                const data = await response.json();
                toast.success(data.message || "Pagos actualizados correctamente");
                if (onUpdate) onUpdate();
            } else {
                const errorData = await response.json().catch(() => ({ message: "Error al guardar los pagos" }));
                toast.error(errorData.message || "Error al guardar los pagos");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error de conexión");
        }
    };

    // Helper to get all receipts
    const getReceiptsList = () => {
        let list: { id?: number, url: string }[] = [];

        // 1. Explicit gallery key (newest)
        if (Array.isArray(order.receipts_gallery) && order.receipts_gallery.length > 0) {
            list = order.receipts_gallery.map((r: any) => ({
                id: r.id,
                url: receiptUrl(r)
            }));
        }
        // 2. Snake case relation
        else if (Array.isArray(order.payment_receipts) && order.payment_receipts.length > 0) {
            list = order.payment_receipts.map((r: any) => ({
                id: r.id,
                url: receiptUrl(r)
            }));
        }
        // 3. Camel case relation
        else if (Array.isArray(order.paymentReceipts) && order.paymentReceipts.length > 0) {
            list = order.paymentReceipts.map((r: any) => ({
                id: r.id,
                url: receiptUrl(r)
            }));
        }

        // 4. Legacy fallback
        if (list.length === 0 && order.payment_receipt) {
            list.push({ url: orderPaymentReceiptUrl(order) });
        }

        return list;
    };

    const receipts = getReceiptsList();
    const currentImage = receipts[viewerIndex]?.url;
    // Revisión de cada comprobante con IA (Fran, 2026-10-03)
    const receiptChecks = useReceiptChecks(order.id, receipts.map((r) => r.id).join(","), receipts.length > 0 && order.receipt_checks_mode !== "off");

    const handleReceiptUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        // Validation
        for (let i = 0; i < files.length; i++) {
            if (!files[i].type.startsWith('image/')) {
                toast.error(`El archivo ${files[i].name} no es una imagen válida`);
                return;
            }
        }

        setUploading(true);

        try {
            const formData = new FormData();
            // Append all files
            for (let i = 0; i < files.length; i++) {
                formData.append('payment_receipts[]', files[i]);
            }

            const { status, response }: IResponse = await request(
                `/orders/${order.id}/payment-receipt`,
                "POST",
                formData,
                true // multipart
            );

            if (status === 200) {
                const data = await response.json();
                toast.success(data.message || 'Comprobante(s) subido(s) exitosamente');
                if (onUpdate) onUpdate();
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Error al subir comprobantes' }));
                toast.error(errorData.message);
            }
        } catch (error) {
            console.error(error);
            toast.error('Error de conexión');
        } finally {
            setUploading(false);
            // Clear input
            event.target.value = '';
        }
    };

    const handleDeleteReceipt = async (e: React.MouseEvent, receiptId: number | undefined) => {
        e.stopPropagation(); // Don't open viewer
        if (!receiptId) {
            toast.error("No se puede eliminar este comprobante (ID faltante)");
            return;
        }

        if (!window.confirm("¿Está seguro de eliminar este comprobante?")) return;

        try {
            const { status, response }: IResponse = await request(
                `/orders/${order.id}/payment-receipt/${receiptId}`,
                "DELETE"
            );

            if (status === 200) {
                const data = await response.json();
                toast.success(data.message || 'Comprobante eliminado');
                if (onUpdate) onUpdate();
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Error al eliminar comprobante' }));
                toast.error(errorData.message);
            }
        } catch (error) {
            console.error(error);
            toast.error('Error de conexión');
        }
    };

    const handleDownload = () => {
        if (!currentImage) return;
        const downloadUrl = currentImage.includes('?') ? `${currentImage}&download=1` : `${currentImage}?download=1`;
        window.open(downloadUrl, '_self');
        toast.success('Iniciando descarga...');
    };

    const handleZoomIn = () => {
        setZoomLevel(prev => Math.min(prev + 0.25, 3));
    };

    const handleZoomOut = () => {
        setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
    };

    const handleOpenViewer = (index: number) => {
        setViewerIndex(index);
        setViewerOpen(true);
        setZoomLevel(1);
        setPosition({ x: 0, y: 0 });
    };

    const handleCloseViewer = () => {
        setViewerOpen(false);
        setZoomLevel(1);
        setPosition({ x: 0, y: 0 });
    };

    const handleNextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (viewerIndex < receipts.length - 1) {
            setViewerIndex(prev => prev + 1);
            setZoomLevel(1);
            setPosition({ x: 0, y: 0 });
        }
    };

    const handlePrevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (viewerIndex > 0) {
            setViewerIndex(prev => prev - 1);
            setZoomLevel(1);
            setPosition({ x: 0, y: 0 });
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (zoomLevel > 1) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging && zoomLevel > 1) {
            e.preventDefault();
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Touch events for mobile
    const handleTouchStart = (e: React.TouchEvent) => {
        if (zoomLevel > 1) {
            setIsDragging(true);
            const touch = e.touches[0];
            setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (isDragging && zoomLevel > 1) {
            // e.preventDefault(); 
            const touch = e.touches[0];
            setPosition({
                x: touch.clientX - dragStart.x,
                y: touch.clientY - dragStart.y
            });
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
    };

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 3, width: "100%" }}>

            {/* Sección de Pagos Registrados (Read-only) */}
            <Box sx={{
                mb: 1, p: 2,
                bgcolor: 'background.paper',
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ReceiptLongRounded sx={{ fontSize: '1rem' }} /> PAGOS REGISTRADOS
                </Typography>
                {order.payments && order.payments.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {order.payments.map((p: any, index: number) => (
                            <Box key={index} sx={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                p: 1.5, borderRadius: 2,
                                bgcolor: 'action.hover',
                                mb: 0.5
                            }}>
                                <Box>
                                    <Typography variant="body2" fontWeight="bold">
                                        {p.method.replace(/_/g, " ")}
                                    </Typography>
                                    {(() => {
                                        const isVes = ["BOLIVARES_EFECTIVO", "PAGOMOVIL", "TRANSFERENCIA_BANCARIA_BOLIVARES"].includes(p.method);
                                        const displayRate = isVes ? (p.rate || Number(order.binance_rate)) : (p.usd_rate || p.rate);

                                        if (!displayRate) return null;

                                        return (
                                            <>
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                                                    Tasa: {displayRate}
                                                </Typography>
                                                {isVes && (
                                                    <Typography variant="caption" sx={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: 'info.main' }}>
                                                        = Bs. {(Number(p.amount) * Number(displayRate)).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                                    </Typography>
                                                )}
                                            </>
                                        );
                                    })()}
                                </Box>
                                <Typography variant="body2" fontWeight="black" color="success.main">
                                    {Number(p.amount).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', py: 2 }}>
                        No hay pagos registrados aún.
                    </Typography>
                )}
            </Box>

            {!['Repartidor', 'Agencia'].includes(user.role?.description || '') && canEdit && (
                <>
                    <Typography variant="subtitle2" sx={{ mt: 1, mb: 0.5 }}>
                        Editar / Agregar Pagos:
                    </Typography>
                    <PaymentMethodsSelector
                        key={JSON.stringify(order.payments)} // Force re-render when payments change due to fetch
                        onSave={handleSavePayments}
                        onChange={onPaymentsChange}
                        initialValue={initialPayments}
                        totalPrice={Number(order.current_total_price)}
                        binanceRate={Number(order.binance_rate) || 0}
                    />
                </>
            )}

            {/* Payment Receipt Section */}
            <Box sx={{ mt: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    Comprobantes de Pago
                    {receipts.length > 1 && (
                        <Typography variant="caption" sx={{ bgcolor: 'secondary.main', color: 'white', px: 1, borderRadius: 1 }}>
                            {receipts.length}
                        </Typography>
                    )}
                </Typography>

                {receipts.length > 0 ? (
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', pb: 2 }}>
                        {receipts.map((receipt, index) => (
                            <Card
                                key={receipt.id || index}
                                sx={{
                                    minWidth: 150,
                                    maxWidth: 150,
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s',
                                    '&:hover': {
                                        transform: 'scale(1.05)',
                                        boxShadow: 3
                                    },
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    position: 'relative' // For delete button
                                }}
                                onClick={() => handleOpenViewer(index)}
                            >
                                {canEdit && receipt.id && (
                                    <IconButton
                                        size="small"
                                        color="error"
                                        onClick={(e) => handleDeleteReceipt(e, receipt.id)}
                                        sx={{
                                            position: 'absolute',
                                            top: 5,
                                            right: 5,
                                            bgcolor: 'rgba(255,255,255,0.8)',
                                            '&:hover': { bgcolor: 'white' },
                                            zIndex: 2,
                                            boxShadow: 1
                                        }}
                                    >
                                        <DeleteRounded fontSize="small" />
                                    </IconButton>
                                )}
                                <CardMedia
                                    component="img"
                                    image={receipt.url}
                                    alt={`Comprobante ${index + 1}`}
                                    sx={{
                                        height: 150,
                                        objectFit: 'cover',
                                        backgroundColor: '#f5f5f5'
                                    }}
                                />
                                <ReceiptCheckChip check={receiptChecks.byReceipt(receipt.id)} />
                            </Card>
                        ))}
                    </Box>
                ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        No hay comprobantes subidos
                    </Typography>
                )}

                <ReceiptChecksPanel
                    orderId={order.id}
                    receiptIds={receipts.map((r) => r.id)}
                    checks={receiptChecks.checks}
                    block={receiptChecks.block}
                    mode={receiptChecks.mode}
                    onChanged={() => { receiptChecks.reload(); onUpdate?.(); }}
                />

                <ButtonCustom
                    component="label"
                    startIcon={uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                    disabled={uploading || !canEdit}
                    nofull
                    sx={{ mt: 2 }}
                >
                    {uploading ? 'Subiendo...' : (receipts.length > 0 ? 'Subir otro(s)' : 'Subir Comprobante')}
                    <input
                        type="file"
                        hidden
                        accept="image/*"
                        multiple // Allow multiple selection
                        onChange={handleReceiptUpload}
                        disabled={uploading}
                    />
                </ButtonCustom>
            </Box>

            {/* Fullscreen Image Viewer */}
            <Dialog
                open={viewerOpen}
                onClose={handleCloseViewer}
                maxWidth={false}
                fullScreen
                TransitionComponent={Zoom}
                PaperProps={{
                    sx: {
                        backgroundColor: 'rgba(0, 0, 0, 0.95)',
                    }
                }}
            >
                {/* Close Button */}
                <IconButton
                    onClick={handleCloseViewer}
                    sx={{
                        position: 'fixed',
                        top: 16,
                        right: 16,
                        color: 'white',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        },
                        zIndex: 1300
                    }}
                >
                    <CloseIcon />
                </IconButton>

                {/* Navigation Arrows */}
                {receipts.length > 1 && (
                    <>
                        <IconButton
                            onClick={handlePrevImage}
                            disabled={viewerIndex === 0}
                            sx={{
                                position: 'fixed',
                                top: '50%',
                                left: 16,
                                transform: 'translateY(-50%)',
                                color: 'white',
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                },
                                zIndex: 1300,
                                '&:disabled': { opacity: 0.3 }
                            }}
                        >
                            <ArrowBackIosNewIcon />
                        </IconButton>
                        <IconButton
                            onClick={handleNextImage}
                            disabled={viewerIndex === receipts.length - 1}
                            sx={{
                                position: 'fixed',
                                top: '50%',
                                right: 16,
                                transform: 'translateY(-50%)',
                                color: 'white',
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                },
                                zIndex: 1300,
                                '&:disabled': { opacity: 0.3 }
                            }}
                        >
                            <ArrowForwardIosIcon />
                        </IconButton>

                        {/* Indicator */}
                        <Typography sx={{
                            position: 'fixed',
                            top: 16,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            color: 'white',
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            px: 2, py: 0.5,
                            borderRadius: 10,
                            zIndex: 1300
                        }}>
                            {viewerIndex + 1} / {receipts.length}
                        </Typography>
                    </>
                )}

                {/* Zoom Controls - Fixed at bottom */}
                <Box sx={{
                    position: 'fixed',
                    bottom: 16,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: 3,
                    padding: 1.5,
                    zIndex: 1300,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                }}>
                    <IconButton
                        onClick={handleZoomOut}
                        disabled={zoomLevel <= 0.5}
                        sx={{
                            color: 'white',
                            '&:disabled': { color: 'rgba(255,255,255,0.3)' }
                        }}
                    >
                        <ZoomOutIcon />
                    </IconButton>
                    <Typography sx={{
                        color: 'white',
                        alignSelf: 'center',
                        minWidth: 60,
                        textAlign: 'center',
                        fontWeight: 'bold'
                    }}>
                        {Math.round(zoomLevel * 100)}%
                    </Typography>
                    <IconButton
                        onClick={handleZoomIn}
                        disabled={zoomLevel >= 3}
                        sx={{
                            color: 'white',
                            '&:disabled': { color: 'rgba(255,255,255,0.3)' }
                        }}
                    >
                        <ZoomInIcon />
                    </IconButton>
                    <Box sx={{ width: 1, backgroundColor: 'rgba(255,255,255,0.2)', mx: 1 }} />
                    <IconButton
                        onClick={handleDownload}
                        sx={{ color: 'white' }}
                    >
                        <DownloadIcon />
                    </IconButton>
                </Box>

                {/* Scrollable container for image */}
                <Box sx={{
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 2,
                    paddingBottom: 10,
                    cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    {/* Image wrapper for zoom */}
                    <Box sx={{
                        display: 'inline-block',
                        transform: `scale(${zoomLevel}) translate(${position.x / zoomLevel}px, ${position.y / zoomLevel}px)`,
                        transformOrigin: 'center center',
                        transition: isDragging ? 'none' : 'transform 0.3s ease-out',
                        userSelect: 'none',
                    }}>
                        <Box
                            component="img"
                            src={currentImage}
                            alt="Comprobante"
                            sx={{
                                maxWidth: '90vw',
                                maxHeight: '90vh',
                                objectFit: 'contain',
                                display: 'block',
                                pointerEvents: 'none',
                            }}
                        />
                    </Box>
                </Box>
            </Dialog>
        </Box>
    );
};
