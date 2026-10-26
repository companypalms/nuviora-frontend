import React, { useState, useEffect } from "react";
import {
    Box,
    Stack,
    TextField,
    MenuItem,
    IconButton,
    FormControl,
    FormHelperText,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    InputAdornment,
    Paper,
    Divider,
    Button,
    Tooltip,
    Grid,
    useTheme
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CalculateIcon from "@mui/icons-material/Calculate";
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PaymentsIcon from '@mui/icons-material/Payments';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ContactlessIcon from '@mui/icons-material/Contactless';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

import { ButtonCustom, SelectCustom, TextFieldCustom, TypographyCustom } from "../../custom";
import { useUserStore } from "../../../store/user/UserStore";
import { request } from "../../../common/request";
import { IResponse } from "../../../interfaces/response-type";
import { green, blue, purple, grey, red } from "@mui/material/colors";
import { darken, lighten } from "@mui/material/styles";

export type PaymentMethodType =
    | "DOLARES_EFECTIVO"
    | "BOLIVARES_EFECTIVO"
    | "EUROS_EFECTIVO"
    | "PAGOMOVIL"
    | "TRANSFERENCIA_BANCARIA_BOLIVARES"
    | "ZINLI"
    | "ZELLE"
    | "BINANCE"
    | "PAYPAL";

export interface PaymentMethod {
    method: PaymentMethodType;
    amount: number;
    rate?: number;
}

interface PaymentMethodsSelectorProps {
    initialValue?: PaymentMethod[];
    onChange?: (value: PaymentMethod[]) => void;
    onSave?: (value: PaymentMethod[]) => void;
    totalPrice?: number;
    binanceRate?: number;
}

interface PaymentRowState {
    method: PaymentMethodType | "";
    amount: string;
}

const PAYMENT_METHOD_OPTIONS: { value: PaymentMethodType; label: string; icon: any; color: string }[] = [
    { value: "DOLARES_EFECTIVO", label: "Dólares efectivo", icon: <PaymentsIcon />, color: '#85bb65' },
    { value: "BOLIVARES_EFECTIVO", label: "Bolívares efectivo", icon: <PaymentsIcon />, color: '#00a859' },
    { value: "EUROS_EFECTIVO", label: "Euros efectivo", icon: <PaymentsIcon />, color: '#003399' },
    { value: "PAGOMOVIL", label: "Pago Móvil", icon: <ContactlessIcon />, color: '#ff4d4f' },
    { value: "TRANSFERENCIA_BANCARIA_BOLIVARES", label: "Transf. Bancaria BS", icon: <AccountBalanceIcon />, color: '#1890ff' },
    { value: "ZINLI", label: "Zinli", icon: <AccountBalanceWalletIcon />, color: '#52c41a' },
    { value: "ZELLE", label: "Zelle", icon: <CheckCircleOutlineIcon />, color: '#6d1ed1' },
    { value: "BINANCE", label: "Binance", icon: <AccountBalanceWalletIcon />, color: '#f3ba2f' },
    { value: "PAYPAL", label: "PayPal", icon: <AccountBalanceWalletIcon />, color: '#003087' },
];

const PaymentMethodsSelector: React.FC<PaymentMethodsSelectorProps> = ({
    initialValue,
    onChange,
    onSave,
    totalPrice = 0,
    binanceRate,
}) => {
    const [rows, setRows] = useState<PaymentRowState[]>(() => {
        if (initialValue && initialValue.length > 0) {
            return initialValue.map((item) => ({
                method: item.method,
                amount: item.amount.toString(),
            }));
        }
        return [{ method: "", amount: "" }];
    });

    const [touched, setTouched] = useState(false);
    const user = useUserStore(state => state.user);
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    // Calculation Rates
    const [rates, setRates] = useState({
        bcv_usd: 0,
        binance_usd: 0,
        bcv_eur: 0
    });

    // Mixed Calculation States
    const [showMixedCalc, setShowMixedCalc] = useState(false);
    const [calcData, setCalcData] = useState({
        amountUsd: "",
        discountPercent: "",
    });

    const fetchRates = async () => {
        try {
            const { status, response }: IResponse = await request("/currency", "GET");
            if (status === 200) {
                const { data } = await response.json();
                setRates({
                    bcv_usd: Number(data.bcv_usd?.value || 0),
                    binance_usd: Number(data.binance_usd?.value || 0),
                    bcv_eur: Number(data.bcv_eur?.value || 0)
                });
            }
        } catch (error) {
            console.error("Error fetching rates:", error);
        }
    };

    useEffect(() => {
        fetchRates();
    }, []);

    const serialize = (state: PaymentRowState[]): PaymentMethod[] => {
        return state
            .filter((row) => row.method !== "" && row.amount.trim() !== "")
            .map((row) => {
                const isVes = ["BOLIVARES_EFECTIVO", "PAGOMOVIL", "TRANSFERENCIA_BANCARIA_BOLIVARES"].includes(row.method);
                const currentRate = (binanceRate || rates.binance_usd);

                return {
                    method: row.method as PaymentMethodType,
                    amount: Number(row.amount),
                    rate: isVes ? currentRate : undefined
                };
            });
    };

    const isRowValid = (row: PaymentRowState): boolean => {
        if (row.method === "") return false;
        const value = Number(row.amount);
        if (row.amount.trim() === "" || Number.isNaN(value)) return false;
        if (value <= 0) return false;
        return true;
    };

    const hasErrors = (): boolean =>
        rows.some((row) => !isRowValid(row));

    const handleRowChange = (
        index: number,
        field: "method" | "amount",
        value: string
    ) => {
        const newRows = [...rows];
        if (field === "method") {
            newRows[index].method = value as PaymentMethodType | "";
        } else {
            newRows[index].amount = value;
        }
        setRows(newRows);
        onChange?.(serialize(newRows));
    };

    const handleAddRow = () => {
        setRows((prev) => [...prev, { method: "", amount: "" }]);
    };

    const handleRemoveRow = (index: number) => {
        setRows((prev) => {
            if (prev.length === 1) return [{ method: "", amount: "" }];
            const newRows = [...prev];
            newRows.splice(index, 1);
            onChange?.(serialize(newRows));
            return newRows;
        });
    };

    const handleSave = () => {
        setTouched(true);
        if (hasErrors()) return;
        const result = serialize(rows);
        onSave?.(result);
    };

    const handleApplyMixedCalc = () => {
        const mp = Number(calcData.amountUsd);
        const d = Number(calcData.discountPercent) / 100;
        if (isNaN(mp) || isNaN(d) || rates.bcv_usd === 0) return;
        const me = mp / (1 - d);
        const mapd = totalPrice - me;
        const mapbs = Math.max(0, mapd * rates.bcv_usd);

        const newRows: PaymentRowState[] = [
            { method: "DOLARES_EFECTIVO", amount: mp.toFixed(2) },
            { method: "TRANSFERENCIA_BANCARIA_BOLIVARES", amount: (mapbs).toFixed(2) }
        ];

        setRows(newRows);
        onChange?.(serialize(newRows));
        setShowMixedCalc(false);
    };

    const currentTotalPaid = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    const remaining = totalPrice - currentTotalPaid;

    const statusColor = remaining <= 0 ? (isDark ? green[400] : green[600]) : (remaining < totalPrice ? (isDark ? blue[400] : blue[600]) : 'text.primary');

    return (
        <Box>
            <Paper elevation={0} sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                mb: 3
            }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: 1 }}>
                            Estado de Pago
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                            <Typography variant="h4" fontWeight="bold" color={statusColor}>
                                ${currentTotalPaid.toFixed(2)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                de ${totalPrice.toFixed(2)}
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                        {remaining > 0 ? (
                            <Typography variant="body2" sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', px: 1.5, py: 0.5, borderRadius: 2, fontWeight: 'medium' }}>
                                Pendiente: <strong>${remaining.toFixed(2)}</strong>
                            </Typography>
                        ) : remaining < 0 ? (
                            <Typography variant="body2" sx={{
                                bgcolor: isDark ? darken(green[900], 0.7) : green[50],
                                color: isDark ? green[200] : green[800],
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 2,
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5
                            }}>
                                <CheckCircleOutlineIcon fontSize="small" /> Vuelto: ${Math.abs(remaining).toFixed(2)}
                            </Typography>
                        ) : (
                            <Typography variant="body2" sx={{ bgcolor: green[600], color: 'white', px: 1.5, py: 0.5, borderRadius: 2, fontWeight: 'bold' }}>
                                PAGADO TOTAL
                            </Typography>
                        )}
                    </Box>
                </Box>
                <Box sx={{ width: '100%', height: 6, bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
                    <Box sx={{
                        width: `${Math.min(100, (currentTotalPaid / totalPrice) * 100)}%`,
                        height: '100%',
                        bgcolor: remaining <= 0 ? green[600] : (isDark ? blue[500] : blue[600]),
                        transition: 'width 0.4s ease-out'
                    }} />
                </Box>
            </Paper>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                    Métodos de pago
                </Typography>
                <Stack direction="row" spacing={1}>
                    <Tooltip title="Cálculo Mixto">
                        <IconButton size="small" onClick={() => setShowMixedCalc(true)} sx={{
                            bgcolor: isDark ? darken(green[900], 0.5) : green[50],
                            color: isDark ? green[100] : green[700],
                            '&:hover': { bgcolor: isDark ? green[900] : green[100] }
                        }}>
                            <CalculateIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <IconButton size="small" onClick={handleAddRow} sx={{
                        bgcolor: user.color + (isDark ? '44' : '22'),
                        color: isDark ? lighten(user.color, 0.5) : user.color,
                        '&:hover': { bgcolor: user.color + (isDark ? '66' : '33') }
                    }}>
                        <AddCircleOutlineIcon fontSize="small" />
                    </IconButton>
                </Stack>
            </Box>

            <Stack spacing={2}>
                {rows.map((row, index) => {
                    const selectedOption = PAYMENT_METHOD_OPTIONS.find(o => o.value === row.method);
                    const showErrors = touched;
                    const methodError = showErrors && row.method === "";
                    const amountNumber = Number(row.amount);
                    const amountError = showErrors && (row.amount.trim() === "" || Number.isNaN(amountNumber) || amountNumber <= 0);

                    return (
                        <Paper key={index} elevation={0} sx={{
                            p: 2,
                            border: '1px solid',
                            borderColor: methodError || amountError ? 'error.main' : 'divider',
                            borderRadius: 3,
                            display: 'flex',
                            gap: 2,
                            alignItems: 'flex-start',
                            position: 'relative',
                            transition: 'all 0.2s',
                            bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'transparent',
                            '&:hover': { borderColor: user.color, bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.01)' }
                        }}>
                            <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 44,
                                height: 44,
                                borderRadius: 2,
                                bgcolor: selectedOption ? selectedOption.color + (isDark ? '25' : '15') : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
                                color: selectedOption ? (isDark ? lighten(selectedOption.color, 0.4) : selectedOption.color) : grey[500],
                                mt: 0.5
                            }}>
                                {selectedOption ? selectedOption.icon : <PaymentsIcon />}
                            </Box>

                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 5 }}>
                                    <FormControl fullWidth error={methodError}>
                                        <SelectCustom
                                            value={row.method}
                                            onChange={(e: any) => handleRowChange(index, "method", e.target.value)}
                                            displayEmpty
                                            variant="standard"
                                            sx={{ mt: 1 }}
                                        >
                                            <MenuItem value="" disabled>Selecciona método</MenuItem>
                                            {PAYMENT_METHOD_OPTIONS.map((opt) => (
                                                <MenuItem key={opt.value} value={opt.value}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Box sx={{ display: 'flex', color: isDark ? lighten(opt.color, 0.3) : opt.color }}>{opt.icon}</Box>
                                                        {opt.label}
                                                    </Box>
                                                </MenuItem>
                                            ))}
                                        </SelectCustom>
                                    </FormControl>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 3 }}>
                                    <TextFieldCustom
                                        fullWidth
                                        variant="standard"
                                        placeholder="Monto"
                                        value={row.amount}
                                        type="number"
                                        onChange={(e: any) => handleRowChange(index, "amount", e.target.value)}
                                        error={amountError}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start" sx={{ opacity: 0.5 }}>$</InputAdornment>,
                                        }}
                                        sx={{ mt: 1 }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }} sx={{ display: 'flex', alignItems: 'center', pt: 1 }}>
                                    {["BOLIVARES_EFECTIVO", "PAGOMOVIL", "TRANSFERENCIA_BANCARIA_BOLIVARES"].includes(row.method) && (binanceRate || rates.binance_usd) > 0 && amountNumber > 0 && (
                                        <Box sx={{
                                            p: 1,
                                            borderRadius: 2,
                                            bgcolor: isDark ? 'rgba(133, 187, 101, 0.1)' : 'rgba(133, 187, 101, 0.05)',
                                            border: '1px solid',
                                            borderColor: isDark ? 'rgba(133, 187, 101, 0.2)' : 'rgba(133, 187, 101, 0.1)',
                                            width: '100%'
                                        }}>
                                            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 'bold' }}>
                                                Ref. Binance (Tasa: {(binanceRate || rates.binance_usd).toFixed(2)})
                                            </Typography>
                                            <Typography variant="body2" fontWeight="bold" color={green[700]}>
                                                Bs. {(amountNumber * (binanceRate || rates.binance_usd)).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                            </Typography>
                                        </Box>
                                    )}
                                </Grid>
                            </Grid>

                            {user.role?.description !== 'Repartidor' && (
                                <IconButton
                                    size="small"
                                    onClick={() => handleRemoveRow(index)}
                                    sx={{
                                        position: 'absolute',
                                        top: -10,
                                        right: -10,
                                        bgcolor: 'background.paper',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        '&:hover': { bgcolor: isDark ? red[900] : red[50], color: isDark ? 'white' : red[600] }
                                    }}
                                >
                                    <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                            )}
                        </Paper>
                    );
                })}
                <Box sx={{ px: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AccountBalanceWalletIcon sx={{ fontSize: 14 }} />
                        Tasa Binance del día: <strong>{rates.binance_usd.toFixed(2)} Bs/$</strong>
                    </Typography>
                </Box>
            </Stack>

            {user.role?.description !== 'Repartidor' && (
                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                    <ButtonCustom
                        onClick={handleSave}
                        sx={{ px: 4, py: 1.2, borderRadius: 2, fontWeight: 'bold' }}
                    >
                        Guardar Pagos
                    </ButtonCustom>
                </Box>
            )}

            {/* Diálogo de Cálculo Mixto Rediseñado */}
            <Dialog
                open={showMixedCalc}
                onClose={() => setShowMixedCalc(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 4, p: 1 } }}
            >
                <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalculateIcon color="primary" /> Cálculo Mixto USD/VES
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <Paper elevation={0} sx={{ bgcolor: isDark ? darken(blue[900], 0.6) : 'primary.light', p: 2, borderRadius: 3, color: isDark ? blue[100] : 'primary.contrastText' }}>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>Total a completar:</Typography>
                            <Typography variant="h5" fontWeight="bold">${totalPrice.toFixed(2)}</Typography>
                        </Paper>

                        <TextField
                            label="¿Cuánto paga en Dólares?"
                            type="number"
                            value={calcData.amountUsd}
                            onChange={(e) => setCalcData({ ...calcData, amountUsd: e.target.value })}
                            fullWidth
                            variant="outlined"
                            InputProps={{
                                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            }}
                        />

                        <TextField
                            label="Descuento (%)"
                            type="number"
                            value={calcData.discountPercent}
                            onChange={(e) => setCalcData({ ...calcData, discountPercent: e.target.value })}
                            fullWidth
                            variant="outlined"
                            helperText="Opcional: aplicado al monto en divisas"
                            InputProps={{
                                endAdornment: <InputAdornment position="end">%</InputAdornment>,
                            }}
                        />

                        <Box sx={{ p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="caption" color="text.secondary">Tasa BCV:</Typography>
                                <Typography variant="caption" fontWeight="bold">{rates.bcv_usd.toFixed(2)} Bs/$</Typography>
                            </Box>

                            {Number(calcData.amountUsd) > 0 && (
                                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                                    <Typography variant="subtitle2" color="primary" gutterBottom>Restante en Bolívares:</Typography>
                                    <Typography variant="h5" fontWeight="black" color={isDark ? blue[400] : "primary"}>
                                        Bs. {Math.max(0, (totalPrice - (Number(calcData.amountUsd) / (1 - (Number(calcData.discountPercent || 0) / 100)))) * rates.bcv_usd).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setShowMixedCalc(false)} color="inherit">Cancelar</Button>
                    <ButtonCustom
                        onClick={handleApplyMixedCalc}
                        disabled={!calcData.amountUsd || rates.bcv_usd === 0}
                    >
                        Aplicar Cálculo
                    </ButtonCustom>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PaymentMethodsSelector;
