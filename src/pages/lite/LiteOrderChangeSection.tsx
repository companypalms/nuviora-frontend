import React, { useState, useEffect } from "react";
import {
    Box,
    Typography,
    Grid,
    TextField,
    Paper,
    Collapse,
    useTheme,
    alpha,
    MenuItem,
    Divider,
    IconButton,
    Tooltip
} from "@mui/material";
import { ButtonCustom, SelectCustom } from "../../components/custom";
import { useUserStore } from "../../store/user/UserStore";
import { request } from "../../common/request";
import { changeReceiptUrl } from "../../common/receipts";
import { toast } from "react-toastify";
import { IResponse } from "../../interfaces/response-type";
import { IBank } from "../../interfaces/bank.types";
import { green, blue, orange, grey } from "@mui/material/colors";
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { paymentKind } from "../../lib/changeRules";
import { ChangeRuleNotice } from "../../components/orders/ChangeRuleNotice";

interface OrderChangeSectionProps {
    order: any;
    onUpdate?: () => void;
    payments?: any[];
}

const CHANGE_METHOD_OPTIONS = [
    { value: "BOLIVARES_PAGOMOVIL", label: "Pago Móvil (Bolívares)" },
    { value: "BOLIVARES_TRANSFERENCIA", label: "Transferencia Bancaria (Bs)" },
    { value: "ZELLE_DOLARES", label: "Zelle (Dólares)" },
    { value: "BINANCE_DOLARES", label: "Binance PAY (USDT)" },
    { value: "PAYPAL_DOLARES", label: "Paypal (Dólares)" },
    { value: "ZINLI_DOLARES", label: "Zinli (Dólares)" },
    { value: "DOLARES_EFECTIVO", label: "Dólares efectivo" },
];

const AGENCY_CHANGE_METHOD_OPTIONS = [
    { value: "DOLARES_EFECTIVO", label: "Dólares efectivo" },
    { value: "BOLIVARES_EFECTIVO", label: "Bolívares efectivo" },
];

const PHONE_PREFIXES = ["0414", "0424", "0412", "0422", "0416", "0426"];

export const LiteOrderChangeSection: React.FC<OrderChangeSectionProps> = ({ order, onUpdate, payments }) => {
    const user = useUserStore((state) => state.user);
    const theme = useTheme();
    const [loading, setLoading] = useState(false);
    const [euroRate, setEuroRate] = useState<number>(Number(order.change_rate) || 0);

    const [form, setForm] = useState({
        cash_received: order.cash_received || "",
        change_amount: order.change_amount || "",
        change_covered_by: order.change_covered_by || "",
        change_amount_company: order.change_amount_company || "",
        change_amount_agency: order.change_amount_agency || "",
        change_method_company: order.change_method_company || "",
        change_method_agency: order.change_method_agency || "",
        change_rate: Number(order.change_rate) || 0,
        change_payment_details: order.change_payment_details || {},
    });

    const [banks, setBanks] = useState<IBank[]>([]);

    useEffect(() => {
        const fetchBanks = async () => {
            const { status, response }: IResponse = await request("/banks", "GET");
            if (status === 200) {
                const data = await response.json();
                setBanks(data);
            }
        };
        fetchBanks();
    }, []);

    useEffect(() => {
        const fetchRates = async () => {
            try {
                const { status, response }: IResponse = await request("/currency", "GET");
                if (status === 200) {
                    const { data } = await response.json();
                    if (data.bcv_eur?.value) {
                        const rate = Number(data.bcv_eur.value);
                        setEuroRate(rate);
                        setForm(prev => ({ ...prev, change_rate: rate }));
                    }
                }
            } catch (error) {
                console.error("Error fetching rates:", error);
            }
        };
        if (!Number(order.change_rate)) {
            fetchRates();
        }
    }, [order.change_rate]);

    useEffect(() => {
        if (payments && payments.length > 0) {
            const totalReceived = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
            const orderTotal = Number(order.current_total_price) || 0;
            const diff = totalReceived - orderTotal;

            setForm(prev => ({
                ...prev,
                cash_received: totalReceived > 0 ? totalReceived.toFixed(2) : prev.cash_received,
                change_amount: diff > 0 ? diff.toFixed(2) : "0.00"
            }));
        }
    }, [payments, order.current_total_price]);

    useEffect(() => {
        setForm(prev => ({
            ...prev,
            cash_received: order.cash_received ?? "",
            change_amount: order.change_amount ?? "",
            change_covered_by: order.change_covered_by ?? "",
            change_amount_company: order.change_amount_company ?? "",
            change_amount_agency: order.change_amount_agency ?? "",
            change_method_company: order.change_method_company ?? "",
            change_method_agency: order.change_method_agency ?? "",
            change_rate: Number(order.change_rate) || euroRate,
            change_payment_details: (typeof order.change_payment_details === 'object' && order.change_payment_details !== null) ? order.change_payment_details : {},
        }));
    }, [order]);

    // Permisos más flexibles (case insensitive)
    const userRole = (user.role?.description || '').toLowerCase();
    const canEdit = ['gerente', 'admin', 'vendedor', 'super'].some(r => userRole.includes(r));

    // Con pago solo digital la agencia no da vuelto: lo devuelve la empresa (Fran, 2026-10-03)
    const kind = paymentKind(payments && payments.length > 0 ? payments : order.payments);
    const agencyBlocked = kind === "digital";
    useEffect(() => {
        if (agencyBlocked && ["agency", "partial"].includes(form.change_covered_by)) {
            setForm(prev => ({ ...prev, change_covered_by: "company", change_amount_agency: "", change_method_agency: "" }));
        }
    }, [agencyBlocked, form.change_covered_by]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement> | any) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleDetailChange = (name: string, value: any) => {
        setForm(prev => ({
            ...prev,
            change_payment_details: {
                ...(typeof prev.change_payment_details === 'object' ? prev.change_payment_details : {}),
                [name]: value
            }
        }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("_method", "PUT");
            formData.append("cash_received", form.cash_received);
            formData.append("change_amount", form.change_amount);
            formData.append("change_covered_by", form.change_covered_by);
            formData.append("change_amount_company", form.change_amount_company);
            formData.append("change_amount_agency", form.change_amount_agency);
            formData.append("change_method_company", form.change_method_company);
            formData.append("change_method_agency", form.change_method_agency);
            formData.append("change_rate", String(form.change_rate));
            formData.append("change_payment_details", JSON.stringify(form.change_payment_details));

            const { status, response }: IResponse = await request(
                `/orders/${order.id}/change`,
                "POST",
                formData,
                true
            );

            if (status === 200) {
                const data = await response.json().catch(() => null);
                // Con pago mixto y vuelto de la agencia, avisa que falta la validación de administración
                if (data?.change_approval?.pending) toast.warning(data.message, { autoClose: 10000 });
                else toast.success("Vuelto actualizado correctamente");
                if (onUpdate) onUpdate();
            } else {
                const data = await response.json();
                toast.error(data.message || "Error al actualizar el vuelto");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    const changeAmountNum = Number(form.change_amount) || 0;
    const partialTotal = Number(form.change_amount_company) + Number(form.change_amount_agency);
    const isSumCorrect = form.change_covered_by !== 'partial' || Math.abs(partialTotal - changeAmountNum) < 0.01;

    const isDetailsFilled = () => {
        if (form.change_covered_by === 'agency') return true;
        const method = form.change_method_company;
        if (!method || method === 'DOLARES_EFECTIVO') return true;
        const details = form.change_payment_details as any;
        if (!details) return false;

        if (method === 'BOLIVARES_PAGOMOVIL') return !!(details.cedula && details.bank_id && details.phone_number && details.phone_prefix);
        if (method === 'BOLIVARES_TRANSFERENCIA') return !!(details.account_number && details.cedula && details.bank_id);
        if (['ZELLE_DOLARES', 'BINANCE_DOLARES', 'PAYPAL_DOLARES', 'ZINLI_DOLARES'].includes(method)) return !!details.email;
        return true;
    };

    const isMethodSelected =
        (form.change_covered_by === 'company' ? (!!form.change_method_company && isDetailsFilled()) :
            form.change_covered_by === 'agency' ? !!form.change_method_agency :
                form.change_covered_by === 'partial' ? (!!form.change_method_company && !!form.change_method_agency && isDetailsFilled()) :
                    false);

    const isSaveDisabled = loading || !isSumCorrect || !isMethodSelected || !form.change_covered_by || (changeAmountNum <= 0 && form.cash_received === order.cash_received);

    const currentRate = Number(form.change_rate) || Number(euroRate) || 0;
    const changeInVES = currentRate > 0 ? (changeAmountNum * currentRate).toLocaleString('es-VE', { minimumFractionDigits: 2 }) : "N/A";

    const totalPaidActual = (payments && payments.length > 0)
        ? payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0)
        : (order.payments?.reduce((acc: any, p: any) => acc + (Number(p.amount) || 0), 0) || 0);
    const currentTotalActual = Number(order.current_total_price) || 0;
    const currentCalculatedChange = totalPaidActual - currentTotalActual;

    const shouldShow = currentCalculatedChange > 0.005 || (order.change_amount > 0 && currentCalculatedChange >= -0.01 && !canEdit);

    if (!shouldShow) return null;

    return (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, fontFamily: 'inherit' }}>
            <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">Gestión de Vuelto</Typography>
            </Box>

            <Grid container spacing={2}>
                {/* 1. SIMPLE ROW: CASH RECEIVED & CHANGE AMOUNT */}
                <Grid size={{ xs: 6 }}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Recibido"
                        value={form.cash_received}
                        InputProps={{ readOnly: true, startAdornment: <Typography variant="body2" sx={{ mr: 0.5, opacity: 0.7 }}>$</Typography> }}
                        variant="standard"
                    />
                </Grid>
                <Grid size={{ xs: 6 }}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Vuelto"
                        value={form.change_amount}
                        InputProps={{ readOnly: true, startAdornment: <Typography variant="body2" sx={{ mr: 0.5, opacity: 0.7 }}>$</Typography> }}
                        variant="standard"
                        error={changeAmountNum > 0}
                        helperText={changeAmountNum > 0 ? "Devolver al cliente" : ""}
                    />
                </Grid>

                {/* 2. MINIMALIST BOLIVAR EQUIVALENT */}
                {changeAmountNum > 0 && (
                    <Grid size={{ xs: 12 }}>
                        <Typography variant="body2" color="primary" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), p: 1, borderRadius: 1, display: 'inline-block', fontFamily: 'inherit' }}>
                            Equivalente: <Box component="span" fontWeight="bold">Bs. {changeInVES}</Box> <span style={{ opacity: 0.7 }}>(Tasa: {currentRate.toFixed(2)})</span>
                        </Typography>
                    </Grid>
                )}

                {/* 3. MINIMALIST RESPONSIBLE SELECTOR */}
                <Grid size={{ xs: 12 }}>
                    <SelectCustom
                        fullWidth
                        label="Responsable del Vuelto"
                        name="change_covered_by"
                        value={form.change_covered_by}
                        onChange={handleChange}
                        variant="outlined"
                        size="small"
                    >
                        <MenuItem value="">Seleccione Responsable</MenuItem>
                        <MenuItem value="company">Empresa (Transferencia/Caja)</MenuItem>
                        <MenuItem value="agency" disabled={agencyBlocked}>Agencia/Repartidor (Efectivo)</MenuItem>
                        <MenuItem value="partial" disabled={agencyBlocked}>Parcial (Ambos)</MenuItem>
                    </SelectCustom>
                </Grid>

                <Grid size={{ xs: 12 }}>
                    <ChangeRuleNotice kind={kind} coveredBy={form.change_covered_by} approval={order.change_approval} />
                </Grid>

                {/* 4. DYNAMIC FORMS (Simplified) */}
                <Grid size={{ xs: 12 }}>

                    {/* EMPRESA FORM */}
                    {form.change_covered_by === 'company' && (
                        <Box sx={{ mt: 1 }}>
                            <SelectCustom
                                fullWidth size="small"
                                label="Método de Pago (Empresa)"
                                name="change_method_company"
                                value={form.change_method_company}
                                onChange={handleChange}
                            >
                                <MenuItem value="">Seleccione método...</MenuItem>
                                {CHANGE_METHOD_OPTIONS.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                            </SelectCustom>

                            {form.change_method_company && (
                                <SimpleDetailForm
                                    method={form.change_method_company}
                                    details={form.change_payment_details}
                                    onChange={handleDetailChange}
                                    banks={banks}
                                />
                            )}
                        </Box>
                    )}

                    {/* AGENCIA FORM */}
                    {form.change_covered_by === 'agency' && (
                        <Box sx={{ mt: 1 }}>
                            <SelectCustom
                                fullWidth size="small"
                                label="Método de Pago (Agencia)"
                                name="change_method_agency"
                                value={form.change_method_agency}
                                onChange={handleChange}
                            >
                                {AGENCY_CHANGE_METHOD_OPTIONS.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                            </SelectCustom>
                        </Box>
                    )}

                    {/* PARCIAL FORM */}
                    {form.change_covered_by === 'partial' && (
                        <Grid container spacing={2} sx={{ mt: 0 }}>
                            <Grid size={{ xs: 6 }}>
                                <TextField size="small" label="Monto Empresa" name="change_amount_company" value={form.change_amount_company} onChange={handleChange} fullWidth
                                    InputProps={{ startAdornment: <Typography variant="caption" sx={{ mr: 0.5 }}>$</Typography> }} />
                                <SelectCustom fullWidth size="small" label="Método" name="change_method_company" value={form.change_method_company} onChange={handleChange} sx={{ mt: 1 }}>
                                    {CHANGE_METHOD_OPTIONS.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                                </SelectCustom>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                                <TextField size="small" label="Monto Agencia" name="change_amount_agency" value={form.change_amount_agency} onChange={handleChange} fullWidth
                                    InputProps={{ startAdornment: <Typography variant="caption" sx={{ mr: 0.5 }}>$</Typography> }} />
                                <SelectCustom fullWidth size="small" label="Método" name="change_method_agency" value={form.change_method_agency} onChange={handleChange} sx={{ mt: 1 }}>
                                    {AGENCY_CHANGE_METHOD_OPTIONS.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                                </SelectCustom>
                            </Grid>

                            {form.change_method_company && (
                                <Grid size={{ xs: 12 }}>
                                    <SimpleDetailForm
                                        method={form.change_method_company}
                                        details={form.change_payment_details}
                                        onChange={handleDetailChange}
                                        banks={banks}
                                    />
                                </Grid>
                            )}

                            {!isSumCorrect && (
                                <Grid size={{ xs: 12 }}>
                                    <Typography variant="caption" color="error">
                                        Suma no coincide (Faltan: ${(changeAmountNum - partialTotal).toFixed(2)})
                                    </Typography>
                                </Grid>
                            )}
                        </Grid>
                    )}
                </Grid>

                {/* COMPROBANTE DE VUELTO (Si existe) */}
                {order.change_receipt && (
                    <Grid size={{ xs: 12 }}>
                        <Paper variant="outlined" sx={{
                            p: 2,
                            mt: 1,
                            bgcolor: alpha(green[500], 0.05),
                            borderColor: alpha(green[500], 0.3),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderRadius: 2
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="h5">✅</Typography>
                                <Box>
                                    <Typography variant="subtitle2" color="success.main" fontWeight="bold">Comprobante Disponible</Typography>
                                    <Typography variant="caption" color="text.secondary">Vuelto pagado por administración</Typography>
                                </Box>
                            </Box>
                            <ButtonCustom
                                size="small"
                                variant="contained"
                                color="success"
                                onClick={() => {
                                    window.open(changeReceiptUrl(order), '_blank');
                                }}
                                sx={{ borderRadius: 2, textTransform: 'none', boxShadow: 'none' }}
                            >
                                Ver Recibo
                            </ButtonCustom>
                        </Paper>
                    </Grid>
                )}

                {/* SAVE BUTTON */}
                <Grid size={{ xs: 12 }}>
                    <ButtonCustom
                        fullWidth
                        size="medium"
                        onClick={handleSave}
                        disabled={isSaveDisabled}
                        sx={{ mt: 1, borderRadius: 2 }}
                    >
                        {loading ? "Guardando..." : "Guardar Vuelto"}
                    </ButtonCustom>
                </Grid>
            </Grid>
        </Paper>
    );
};

// Componente ultra-simplificado para detalles bancarios
const SimpleDetailForm = ({ method, details, onChange, banks }: any) => {
    if (method === 'BOLIVARES_PAGOMOVIL') {
        return (
            <Grid container spacing={1} sx={{ mt: 1 }}>
                <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField fullWidth size="small" label="Cédula" value={details.cedula || ""} onChange={(e) => onChange('cedula', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 8 }}>
                    <SelectCustom fullWidth size="small" label="Banco" value={details.bank_id || ""} onChange={(e) => onChange('bank_id', e.target.value)}>
                        {banks.map((b: any) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                    </SelectCustom>
                </Grid>
                <Grid size={{ xs: 5, sm: 4 }}>
                    <SelectCustom fullWidth size="small" label="Prefijo" value={details.phone_prefix || ""} onChange={(e) => onChange('phone_prefix', e.target.value)}>
                        {PHONE_PREFIXES.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                    </SelectCustom>
                </Grid>
                <Grid size={{ xs: 7, sm: 8 }}>
                    <TextField fullWidth size="small" label="Teléfono" value={details.phone_number || ""} onChange={(e) => onChange('phone_number', e.target.value.replace(/\D/g, ""))} />
                </Grid>
            </Grid>
        );
    }
    if (['ZELLE_DOLARES', 'BINANCE_DOLARES', 'PAYPAL_DOLARES'].includes(method)) {
        return (
            <Box sx={{ mt: 1 }}>
                <TextField fullWidth size="small" label="Email / Usuario" value={details.email || ""} onChange={(e) => onChange('email', e.target.value)} />
            </Box>
        );
    }
    return null;
};
