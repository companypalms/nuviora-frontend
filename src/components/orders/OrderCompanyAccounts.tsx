import React, { useEffect, useState } from "react";
import { Box, Typography, Paper, Stack, Tooltip, IconButton, Skeleton, Alert, TextField, MenuItem, Chip } from "@mui/material";
import {
    ContentCopyRounded,
    PaymentRounded,
    AccountBalanceWalletRounded,
    AccountBalanceRounded,
    ContactlessRounded,
    SavingsRounded
} from "@mui/icons-material";
import { toast } from "react-toastify";
import { request } from "../../common/request";
import { IResponse } from "../../interfaces/response-type";
import { ICompanyAccount, ICompanyAccountDetail } from "../../interfaces/company-account.types";
import { useUserStore } from "../../store/user/UserStore";
import { fmtMoney } from "../../lib/money";
import { OrderPaymentInfo, PAGO_MOVIL_KIND, pagoMovilBs, paysByPagoMovil } from "../../lib/paymentAccount";

const IconRenderer = ({ iconName, color = 'inherit' }: { iconName: string | null, color?: any }) => {
    switch (iconName) {
        case 'AccountBalanceRounded': return <AccountBalanceRounded color={color} />;
        case 'AccountBalanceWalletRounded': return <AccountBalanceWalletRounded color={color} />;
        case 'PaymentRounded': return <PaymentRounded color={color} />;
        case 'ContactlessRounded': return <ContactlessRounded color={color} />;
        case 'SavingsRounded': return <SavingsRounded color={color} />;
        default: return <PaymentRounded color={color} />;
    }
};

const getIconColor = (name: string): any => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('zelle')) return 'secondary';
    if (lowerName.includes('binance')) return { sx: { color: '#f3ba2f' } };
    if (lowerName.includes('pago móvil') || lowerName.includes('zinli')) return 'success';
    if (lowerName.includes('paypal')) return 'info';
    return 'primary';
};

/**
 * Las cuentas para darle al cliente. .60: con la orden, el pago móvil es solo el de la cuenta de ESA orden (cada orden
 * con pago móvil recibe una de las cuentas, repartidas por monto del día); las otras de pago móvil no se muestran, para
 * que nadie dé la equivocada. El Admin la puede cambiar.
 */
export const OrderCompanyAccounts: React.FC<{ order?: OrderPaymentInfo & { id: number }; onChange?: () => void }> = ({ order, onChange }) => {
    const user = useUserStore((state) => state.user);
    const isAdmin = user.role?.description === 'Admin';
    const [accounts, setAccounts] = useState<ICompanyAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        setLoading(true);
        try {
            const { status, response }: IResponse = await request('/company-accounts', 'GET');
            if (status >= 200 && status < 300) {
                const data = await response.json();
                // Filter only active accounts
                setAccounts(data.filter((a: ICompanyAccount) => a.is_active));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.info(`📋 Copiado: ${text}`);
    };

    const changeAccount = async (id: number) => {
        if (!order || id === order.payment_account?.id) return;
        setSaving(true);
        try {
            const { response }: IResponse = await request(`/orders/${order.id}/payment-account`, 'PUT', { company_account_id: id });
            const json = await response.json();
            if (json.status) {
                toast.success(`Cuenta de pago móvil: ${json.payment_account?.name}`);
                onChange?.();
            } else {
                toast.error(json.message ?? 'No se pudo cambiar la cuenta');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error de conexión');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: 'background.paper', mb: 3, border: '1px solid', borderColor: 'divider' }}>
                <Skeleton variant="text" width="60%" height={40} sx={{ mb: 2 }} />
                <Stack spacing={2}>
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} variant="rectangular" height={100} sx={{ borderRadius: 3 }} />
                    ))}
                </Stack>
            </Paper>
        );
    }

    const pagoMovil = accounts.filter((a) => a.method === PAGO_MOVIL_KIND);
    // Con la orden, las de pago móvil no van en la lista: va la de la orden arriba
    const shown = order && pagoMovil.length > 0 ? accounts.filter((a) => a.method !== PAGO_MOVIL_KIND) : accounts;
    const own = order?.payment_account ?? null;
    const bs = order ? pagoMovilBs(order) : 0;

    if (shown.length === 0 && !own && !(order && pagoMovil.length > 0)) return null;

    const detailRows = (details: ICompanyAccountDetail[] | null) => (
        <Stack spacing={1}>
            {details?.map((detail, j) => (
                <Box key={j} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1 }}>{detail.label}</Typography>
                        <Typography variant="body2" fontWeight="medium">{detail.value}</Typography>
                    </Box>
                    <Tooltip title={`Copiar ${detail.label}`}>
                        <IconButton size="small" onClick={() => handleCopy(detail.value)}>
                            <ContentCopyRounded sx={{ fontSize: '1rem' }} />
                        </IconButton>
                    </Tooltip>
                </Box>
            ))}
        </Stack>
    );

    return (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: 'background.paper', mb: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PaymentRounded color="primary" /> Cuentas Bancarias
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
                Proporciona estos datos al cliente para recibir el pago. Haz clic en el icono para copiar cada dato.
            </Typography>

            <Stack spacing={2}>
                {own && (
                    <Box sx={{ p: 2, borderRadius: 3, bgcolor: 'action.hover', border: '2px solid', borderColor: 'success.main' }}>
                        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5, flexWrap: 'wrap', rowGap: 0.5 }}>
                            <ContactlessRounded color="success" />
                            <Typography variant="subtitle2" fontWeight="bold">Pago móvil de esta orden: {own.name}</Typography>
                            {bs > 0 && <Chip size="small" color="success" variant="outlined" label={fmtMoney(bs, 'VES')} />}
                        </Stack>
                        {!own.is_active && (
                            <Alert severity="warning" sx={{ mb: 1.5 }}>
                                Esta cuenta está desactivada. {isAdmin ? 'Cámbiala abajo.' : 'Pídele al Admin que la cambie.'}
                            </Alert>
                        )}
                        {detailRows(own.details)}
                        {isAdmin && pagoMovil.length > 1 && (
                            <TextField
                                select size="small" fullWidth label="Cambiar la cuenta de esta orden" sx={{ mt: 2 }}
                                value={pagoMovil.some((a) => a.id === own.id) ? own.id : ''} disabled={saving}
                                onChange={(e) => changeAccount(Number(e.target.value))}
                            >
                                {pagoMovil.map((a) => (
                                    <MenuItem key={a.id} value={a.id}>{a.name}{a.takes_orders === false ? ' (pausada)' : ''}</MenuItem>
                                ))}
                            </TextField>
                        )}
                    </Box>
                )}
                {order && !own && pagoMovil.length > 0 && (
                    <Alert severity={paysByPagoMovil(order) ? 'warning' : 'info'}>
                        {paysByPagoMovil(order)
                            ? 'Esta orden se paga por pago móvil y todavía no tiene cuenta. Vuelve a guardar el pago; si sigue sin cuenta, revisa en Tasa y pagos › Cuentas que haya cuentas de pago móvil que reciban órdenes.'
                            : 'Pago móvil: cada orden tiene su cuenta. Registra el pago por Pago Móvil y aquí aparece la cuenta que le toca a esta orden.'}
                    </Alert>
                )}
                {shown.map((account, idx) => {
                    const iconColorProps = getIconColor(account.name);
                    const colorAttr = typeof iconColorProps === 'string' ? iconColorProps : undefined;
                    const sxAttr = typeof iconColorProps === 'object' ? iconColorProps.sx : undefined;

                    return (
                        <Box key={idx} sx={{ p: 2, borderRadius: 3, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                                <IconRenderer iconName={account.icon} color={colorAttr as any} />
                                <Typography variant="subtitle2" fontWeight="bold" sx={sxAttr}>{account.name}</Typography>
                            </Stack>

                            {detailRows(account.details)}
                        </Box>
                    );
                })}
            </Stack>
        </Paper>
    );
};
