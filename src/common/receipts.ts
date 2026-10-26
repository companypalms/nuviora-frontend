// 🔒 Los comprobantes solo se abren con el enlace firmado que manda el backend
// (receipts_gallery[].url, payment_receipt_url, change_receipt_url). Vence en 12 h: reabrir la orden lo renueva.
const apiUrl = () => import.meta.env.VITE_BACKEND_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const receiptUrl = (receipt: { id?: number; url?: string }) =>
    receipt.url || `${apiUrl()}/orders/receipt/${receipt.id}`;

export const orderPaymentReceiptUrl = (order: any) =>
    order?.payment_receipt_url || `${apiUrl()}/orders/${order?.id}/payment-receipt`;

export const changeReceiptUrl = (order: any) =>
    order?.change_receipt_url || `${apiUrl()}/orders/${order?.id}/change-receipt`;

export const withDownload = (url: string) => `${url}${url.includes('?') ? '&' : '?'}download=1`;
