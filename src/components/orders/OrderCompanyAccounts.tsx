import React, { useEffect, useState } from "react";
import { Box, Typography, Paper, Stack, Tooltip, IconButton, Skeleton } from "@mui/material";
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
import { ICompanyAccount } from "../../interfaces/company-account.types";

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

export const OrderCompanyAccounts: React.FC = () => {
    const [accounts, setAccounts] = useState<ICompanyAccount[]>([]);
    const [loading, setLoading] = useState(true);

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

    if (accounts.length === 0) return null;

    return (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: 'background.paper', mb: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PaymentRounded color="primary" /> Cuentas Bancarias
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
                Proporciona estos datos al cliente para recibir el pago. Haz clic en el icono para copiar cada dato.
            </Typography>

            <Stack spacing={2}>
                {accounts.map((account, idx) => {
                    const iconColorProps = getIconColor(account.name);
                    const colorAttr = typeof iconColorProps === 'string' ? iconColorProps : undefined;
                    const sxAttr = typeof iconColorProps === 'object' ? iconColorProps.sx : undefined;

                    return (
                        <Box key={idx} sx={{ p: 2, borderRadius: 3, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                                <IconRenderer iconName={account.icon} color={colorAttr as any} />
                                <Typography variant="subtitle2" fontWeight="bold" sx={sxAttr}>{account.name}</Typography>
                            </Stack>

                            <Stack spacing={1}>
                                {account.details?.map((detail, j) => (
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
                        </Box>
                    );
                })}
            </Stack>
        </Paper>
    );
};
