import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    IconButton,
    Typography,
    Box,
    Paper,
    Divider,
    useTheme,
    alpha,
    Grid,
    CircularProgress
} from '@mui/material';
import { CurrencyExchange, CloseRounded, TrendingUp, TrendingDown, CalendarToday } from '@mui/icons-material';
import { request } from '../../common/request';
import { toast } from 'react-toastify';
import { fmtMoney } from '../../lib/money';

interface DailyRatesDialogProps {
    open: boolean;
    onClose: () => void;
}

interface RateData {
    value: string | number;
    description: string;
    updated_at: string;
}

interface CurrencyResponse {
    bcv_usd: RateData | null;
    bcv_eur: RateData | null;
    binance_usd: RateData | null;
    updated_at: string | null;
    has_values: boolean;
}

export const DailyRatesDialog: React.FC<DailyRatesDialogProps> = ({ open, onClose }) => {
    const theme = useTheme();
    const [rates, setRates] = useState<CurrencyResponse | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            fetchRates();
        }
    }, [open]);

    const fetchRates = async () => {
        setLoading(true);
        try {
            const { status, response } = await request('/currency', 'GET');
            if (status === 200) {
                const data = await response.json();
                if (data.status) {
                    setRates(data.data);
                }
            }
        } catch (e) {
            console.error("Error fetching rates", e);
            toast.error("Error al cargar tasas");
        } finally {
            setLoading(false);
        }
    };

    const RateCard = ({ title, value, color, icon }: { title: string, value: string | number, color: string, icon: React.ReactNode }) => (
        <Paper
            elevation={0}
            sx={{
                p: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: alpha(color, 0.2),
                bgcolor: alpha(color, 0.05),
                display: 'flex',
                flexDirection: 'column',
                gap: 1
            }}
        >
            <Box display="flex" alignItems="center" gap={1}>
                <Box sx={{ color: color }}>{icon}</Box>
                <Typography variant="subtitle2" fontWeight="bold" color="text.secondary">
                    {title}
                </Typography>
            </Box>
            <Typography variant="h5" fontWeight="bold" sx={{ color: color }}>
                {Number(value).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
            </Typography>
        </Paper>
    );

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: { borderRadius: 3 }
            }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                <Box display="flex" alignItems="center" gap={1.5}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 1,
                            borderRadius: '50%',
                            bgcolor: alpha(theme.palette.success.main, 0.1),
                            color: theme.palette.success.main,
                            display: 'flex'
                        }}
                    >
                        <CurrencyExchange />
                    </Paper>
                    <Typography variant="h6" fontWeight="bold">
                        Tasas del Día
                    </Typography>
                </Box>
                <IconButton onClick={onClose} size="small">
                    <CloseRounded />
                </IconButton>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ p: 3 }}>
                {loading ? (
                    <Box display="flex" justifyContent="center" py={4}>
                        <CircularProgress size={30} />
                    </Box>
                ) : !rates || !rates.has_values ? (
                    <Typography align="center" color="text.secondary" py={4}>
                        No hay tasas disponibles
                    </Typography>
                ) : (
                    <Box display="flex" flexDirection="column" gap={2}>
                        {rates.bcv_usd && (
                            <RateCard
                                title="BCV Dólar"
                                value={rates.bcv_usd.value}
                                color={theme.palette.info.main}
                                icon={<TrendingUp />}
                            />
                        )}
                        {rates.bcv_eur && (
                            <RateCard
                                title="BCV Euro"
                                value={rates.bcv_eur.value}
                                color={theme.palette.secondary.main}
                                icon={<TrendingUp />}
                            />
                        )}
                        {rates.binance_usd && (
                            <RateCard
                                title="Binance (Paralelo)"
                                value={rates.binance_usd.value}
                                color={theme.palette.warning.main}
                                icon={<TrendingUp />}
                            />
                        )}

                        {rates.updated_at && (
                            <Box display="flex" alignItems="center" gap={1} justifyContent="center" mt={1}>
                                <CalendarToday fontSize="small" color="action" />
                                <Typography variant="caption" color="text.secondary">
                                    Actualizado: {new Date(rates.updated_at).toLocaleString()}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2, pt: 0 }}>
                <Button onClick={onClose} fullWidth variant="contained" sx={{ borderRadius: 2 }}>
                    Cerrar
                </Button>
            </DialogActions>
        </Dialog>
    );
};
