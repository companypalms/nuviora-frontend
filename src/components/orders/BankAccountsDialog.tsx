import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Typography,
    Box,
    Paper,
    Divider,
    useTheme,
    alpha,
    Alert
} from '@mui/material';
import { ContentCopyRounded, AccountBalanceRounded, CloseRounded } from '@mui/icons-material';
import { request } from '../../common/request';
import { toast } from 'react-toastify';

interface BankAccountsDialogProps {
    open: boolean;
    onClose: () => void;
}

interface CompanyAccount {
    id: number;
    name: string;
    icon: string;
    details: { label: string; value: string }[];
    is_active: boolean;
    method?: string | null;
}

export const BankAccountsDialog: React.FC<BankAccountsDialogProps> = ({ open, onClose }) => {
    const theme = useTheme();
    const [accounts, setAccounts] = useState<CompanyAccount[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasPagoMovil, setHasPagoMovil] = useState(false);

    useEffect(() => {
        if (open) {
            fetchAccounts();
        }
    }, [open]);

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const { status, response } = await request('/company-accounts', 'GET');
            if (status === 200) {
                const data = await response.json();
                // Parse details if string
                const formatted = data.map((d: any) => ({
                    ...d,
                    details: typeof d.details === 'string' ? JSON.parse(d.details) : d.details
                }));
                // .60: el pago móvil va por orden (cada una tiene su cuenta): aquí no se muestra, para no dar la equivocada
                const active: CompanyAccount[] = formatted.filter((d: CompanyAccount) => d.is_active);
                setHasPagoMovil(active.some((d) => d.method === 'pago_movil'));
                setAccounts(active.filter((d) => d.method !== 'pago_movil'));
            }
        } catch (e) {
            console.error("Error fetching accounts", e);
            toast.error("Error al cargar cuentas bancarias");
        } finally {
            setLoading(false);
        }
    };

    const handleCopyAll = (account: any) => {
        if (!account.details) return;

        // Just the values joined by space
        const text = account.details.map((d: any) => `${d.value}`).join(' ');

        navigator.clipboard.writeText(text);
        toast.success(`Datos de ${account.name} copiados`);
    };

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copiado al portapapeles`);
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
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
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main,
                            display: 'flex'
                        }}
                    >
                        <AccountBalanceRounded />
                    </Paper>
                    <Typography variant="h6" fontWeight="bold">
                        Cuentas Bancarias
                    </Typography>
                </Box>
                <IconButton onClick={onClose} size="small">
                    <CloseRounded />
                </IconButton>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ p: 2 }}>
                {!loading && hasPagoMovil && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        <b>Pago móvil:</b> cada orden tiene su propia cuenta. Abre la orden y copia la cuenta de esa orden (también va al final de la plantilla de la agencia).
                    </Alert>
                )}
                {loading ? (
                    <Typography align="center" sx={{ py: 4, color: 'text.secondary' }}>Cargando...</Typography>
                ) : accounts.length === 0 ? (
                    hasPagoMovil ? null : <Typography align="center" sx={{ py: 4, color: 'text.secondary' }}>No hay cuentas registradas</Typography>
                ) : (
                    <List sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {accounts.map((acc, idx) => (
                            <Paper
                                key={idx}
                                elevation={0}
                                sx={{
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 2,
                                    overflow: 'hidden',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        borderColor: theme.palette.primary.main,
                                        bgcolor: alpha(theme.palette.primary.main, 0.02)
                                    },
                                    p: 2
                                }}
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="h6" fontWeight="bold" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {acc.name}
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<ContentCopyRounded />}
                                        onClick={() => handleCopyAll(acc)}
                                        sx={{ borderRadius: 2, textTransform: 'none' }}
                                    >
                                        Copiar Datos
                                    </Button>
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, bgcolor: 'background.default', p: 1.5, borderRadius: 2 }}>
                                    {acc.details?.map((detail: any, j: number) => (
                                        <Box key={j} sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: j < acc.details.length - 1 ? '1px dashed rgba(0,0,0,0.1)' : 'none', pb: 0.5, mb: 0.5 }}>
                                            <Typography variant="body2" color="text.secondary" fontWeight="bold">
                                                {detail.label}:
                                            </Typography>
                                            <Typography variant="body2" fontWeight="medium" fontFamily="monospace" sx={{ userSelect: 'all' }}>
                                                {detail.value}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Box>
                            </Paper>
                        ))}
                    </List>
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
