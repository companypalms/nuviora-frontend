// src/pages/admin/ChangeApprovals.tsx
// Vueltos de la agencia por validar (Fran, 2026-10-03): el cliente pagó una parte en efectivo y otra digital y la
// agencia da vuelto. Hasta que administración lo valide, la orden no pasa a la agencia ni se marca entregada.
import React, { useEffect, useState } from "react";
import {
    Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Grid,
    Stack, TextField, Typography,
} from "@mui/material";
import { CheckCircleRounded, CancelRounded, RefreshRounded, StoreRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { Loading } from "../../components/ui/content/Loading";
import { OrderDialog } from "../../components/orders/OrderDialog";
import { request } from "../../common/request";
import { IResponse } from "../../interfaces/response-type";
import { useValidateSession } from "../../hooks/useValidateSession";
import { fmtMoney } from "../../lib/money";
import { orderNo } from "../../lib/functions";

interface Pending {
    id: number;
    name: string;
    status: string | null;
    shop: string | null;
    agent: string | null;
    agency: string | null;
    client: string;
    total: number;
    payments: { method: string; amount: number; is_cash: boolean }[];
    change_amount: number;
    change_covered_by: "agency" | "partial";
    change_amount_agency: number;
    change_method_agency: string | null;
    change_amount_company: number;
}

const METHOD_LABELS: Record<string, string> = {
    DOLARES_EFECTIVO: "Dólares efectivo",
    BOLIVARES_EFECTIVO: "Bolívares efectivo",
    EUROS_EFECTIVO: "Euros efectivo",
    PAGOMOVIL: "Pago móvil",
    TRANSFERENCIA_BANCARIA_BOLIVARES: "Transferencia Bs",
    ZELLE: "Zelle",
    BINANCE: "Binance",
    ZINLI: "Zinli",
    PAYPAL: "PayPal",
};
const methodLabel = (m?: string | null) => (m ? METHOD_LABELS[m] ?? m.replace(/_/g, " ").toLowerCase() : "sin método");

const Row: React.FC<{ label: React.ReactNode; value: React.ReactNode; strong?: boolean; color?: string }> = ({ label, value, strong, color }) => (
    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography variant="body2" fontWeight={strong ? "bold" : "medium"} color={color}>{value}</Typography>
    </Box>
);

export const ChangeApprovals: React.FC = () => {
    const { loadingSession, isValid } = useValidateSession();
    const [orders, setOrders] = useState<Pending[]>([]);
    const [loading, setLoading] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [rejecting, setRejecting] = useState<Pending | null>(null);
    const [reason, setReason] = useState("");
    const [openOrderId, setOpenOrderId] = useState<number | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const { status, response }: IResponse = await request("/orders/change-approvals", "GET");
            if (status === 200) {
                const data = await response.json();
                setOrders(data.orders ?? []);
            } else {
                toast.error("No se pudieron cargar los vueltos por validar");
            }
        } catch {
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isValid) load();
    }, [isValid]);

    const decide = async (order: Pending, decision: "approve" | "reject", why?: string) => {
        setBusyId(order.id);
        try {
            const { status, response }: IResponse = await request(`/orders/${order.id}/change-approval`, "POST", { decision, reason: why || null });
            const data = await response.json().catch(() => null);
            if (status === 200) {
                toast.success(data?.message ?? "Listo");
                setOrders((prev) => prev.filter((o) => o.id !== order.id));
                setRejecting(null);
                setReason("");
            } else {
                toast.error(data?.message ?? "No se pudo guardar");
                if (status === 422) load();
            }
        } catch {
            toast.error("Error de conexión");
        } finally {
            setBusyId(null);
        }
    };

    if (loadingSession || !isValid) return <Loading />;

    return (
        <Layout>
            <Box sx={{ p: 2 }}>
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <DescripcionDeVista
                            title="Vueltos por validar"
                            description="Órdenes donde el cliente pagó una parte en efectivo y otra digital, y la agencia da vuelto. Hasta que lo valides, la orden no pasa a la agencia ni se marca entregada. Si lo rechazas, la vendedora tiene que corregir los pagos o el vuelto."
                        />
                    </Box>
                    <Button startIcon={<RefreshRounded />} onClick={load} disabled={loading} sx={{ textTransform: "none", flexShrink: 0 }}>
                        Actualizar
                    </Button>
                </Box>

                {loading && orders.length === 0 ? (
                    <Loading />
                ) : orders.length === 0 ? (
                    <Box role="status" sx={{ textAlign: "center", py: 10, opacity: 0.6 }}>
                        <CheckCircleRounded color="success" sx={{ fontSize: 56, mb: 1 }} />
                        <Typography variant="h6">No hay vueltos por validar</Typography>
                    </Box>
                ) : (
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        {orders.map((o) => {
                            const cash = o.payments.filter((p) => p.is_cash).reduce((a, p) => a + p.amount, 0);
                            const paid = o.payments.reduce((a, p) => a + p.amount, 0);
                            const overpaid = Math.max(0, paid - o.total);
                            const tooMuch = o.change_amount_agency > cash + 0.009;
                            return (
                                <Grid key={o.id} size={{ xs: 12, md: 6, lg: 4 }}>
                                    <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", height: "100%" }}>
                                        <CardContent>
                                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Button onClick={() => setOpenOrderId(o.id)} sx={{ p: 0, minWidth: 0, textTransform: "none", fontWeight: "bold", fontSize: "1.1rem" }}>
                                                        {orderNo(o.name)}
                                                    </Button>
                                                    <Typography variant="body2" color="text.secondary" noWrap>{o.client || "Cliente sin nombre"}</Typography>
                                                </Box>
                                                {o.status && <Chip size="small" label={o.status} />}
                                            </Box>
                                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                                {o.agent ? `Vendedora: ${o.agent}` : "Sin vendedora"}
                                                {o.agency ? ` · Agencia: ${o.agency}` : ""}
                                                {o.shop ? ` · ${o.shop}` : ""}
                                            </Typography>

                                            <Divider sx={{ my: 1.5 }} />

                                            <Stack spacing={0.5}>
                                                <Row label="Total de la orden" value={fmtMoney(o.total, "USD")} strong />
                                                {o.payments.map((p, i) => (
                                                    <Row
                                                        key={i}
                                                        label={<>{p.is_cash ? "💵" : "📱"} {methodLabel(p.method)}</>}
                                                        value={fmtMoney(p.amount, "USD")}
                                                    />
                                                ))}
                                                <Row label="Pagó de más" value={fmtMoney(overpaid, "USD")} />
                                            </Stack>

                                            <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, bgcolor: "warning.main", color: "warning.contrastText", display: "flex", alignItems: "center", gap: 1 }}>
                                                <StoreRounded />
                                                <Box>
                                                    <Typography variant="subtitle2" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
                                                        La agencia da {fmtMoney(o.change_amount_agency, "USD")} de vuelto
                                                    </Typography>
                                                    <Typography variant="caption">
                                                        en {methodLabel(o.change_method_agency)}
                                                        {o.change_covered_by === "partial" && o.change_amount_company > 0 ? ` · la empresa pone ${fmtMoney(o.change_amount_company, "USD")}` : ""}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            {tooMuch && (
                                                <Alert severity="error" sx={{ mt: 1, py: 0 }}>
                                                    El vuelto de la agencia es mayor que el efectivo que cobró ({fmtMoney(cash, "USD")}).
                                                </Alert>
                                            )}

                                            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                                                <Button
                                                    fullWidth
                                                    variant="contained"
                                                    color="success"
                                                    startIcon={<CheckCircleRounded />}
                                                    disabled={busyId === o.id}
                                                    onClick={() => decide(o, "approve")}
                                                    sx={{ textTransform: "none", fontWeight: "bold", borderRadius: 2 }}
                                                >
                                                    Validar
                                                </Button>
                                                <Button
                                                    fullWidth
                                                    variant="outlined"
                                                    color="error"
                                                    startIcon={<CancelRounded />}
                                                    disabled={busyId === o.id}
                                                    onClick={() => { setRejecting(o); setReason(""); }}
                                                    sx={{ textTransform: "none", fontWeight: "bold", borderRadius: 2 }}
                                                >
                                                    Rechazar
                                                </Button>
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            );
                        })}
                    </Grid>
                )}
            </Box>

            <Dialog open={!!rejecting} onClose={() => setRejecting(null)} fullWidth maxWidth="xs">
                <DialogTitle>Rechazar el vuelto de {rejecting ? orderNo(rejecting.name) : ""}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Se quita el vuelto de la agencia y la vendedora tiene que corregir los pagos o el vuelto. Queda una nota en la orden.
                    </Typography>
                    <TextField
                        autoFocus
                        fullWidth
                        multiline
                        minRows={2}
                        label="Motivo (opcional)"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        inputProps={{ maxLength: 300 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRejecting(null)} color="inherit">Cancelar</Button>
                    <Button
                        variant="contained"
                        color="error"
                        disabled={!rejecting || busyId === rejecting.id}
                        onClick={() => rejecting && decide(rejecting, "reject", reason.trim())}
                    >
                        Rechazar vuelto
                    </Button>
                </DialogActions>
            </Dialog>

            {openOrderId && (
                <OrderDialog
                    id={openOrderId}
                    open={!!openOrderId}
                    setOpen={(val) => {
                        if (!val) {
                            setOpenOrderId(null);
                            load();
                        }
                    }}
                />
            )}
        </Layout>
    );
};
