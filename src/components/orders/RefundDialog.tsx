import { FC, useEffect, useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import { request } from "../../common/request";
import { ButtonCustom } from "../custom";
import { fmtMoney } from "../../lib/money";
import { REFUND_METHODS } from "../../common/refunds";

type Props = {
    open: boolean;
    onClose: () => void;
    orderId: number;
    orderName: string;
    /** Lo que queda por devolver (cobrado menos lo ya reembolsado). */
    refundable: number;
    methods?: string[];
    onSaved: () => void;
};

/**
 * Devolución = reembolso (Fran §7): se le transfiere el dinero al cliente y el producto se queda con él.
 * No sale ninguna agencia, no se mueve stock y la vendedora conserva su comisión.
 */
export const RefundDialog: FC<Props> = ({ open, onClose, orderId, orderName, refundable, methods = REFUND_METHODS, onSaved }) => {
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('');
    const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [notes, setNotes] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setAmount(refundable > 0 ? String(refundable) : '');
            setMethod('');
            setDate(dayjs().format('YYYY-MM-DD'));
            setNotes('');
            setFile(null);
        }
    }, [open, refundable]);

    const save = async () => {
        const value = Number(amount);
        if (!value || value <= 0) {
            toast.error('Escribe el monto del reembolso');
            return;
        }
        setSaving(true);
        const body = new FormData();
        body.append('amount_usd', String(value));
        if (method) body.append('method', method);
        body.append('refunded_at', date);
        if (notes.trim()) body.append('notes', notes.trim());
        if (file) body.append('receipt', file);
        try {
            const { ok, response } = await request(`/orders/${orderId}/refunds`, 'POST', body, true);
            const data = await response.json().catch(() => ({}));
            if (ok && data.status) {
                toast.success('Reembolso registrado');
                onSaved();
                onClose();
            } else {
                const first = data.errors ? Object.values(data.errors)[0] : null;
                toast.error((Array.isArray(first) ? first[0] : null) || data.message || 'No se pudo registrar el reembolso');
            }
        } catch {
            toast.error('Error de conexión');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
            <DialogTitle>Registrar devolución de #{orderName}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                        Se le devuelve el dinero al cliente y el producto se queda con él: no sale ninguna agencia, no se mueve el stock y la vendedora conserva su comisión.
                    </Alert>
                    <TextField
                        label="Monto devuelto (USD)"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        inputProps={{ min: 0.01, max: refundable, step: 0.01 }}
                        helperText={`Se puede devolver hasta ${fmtMoney(refundable, 'USD')}`}
                        fullWidth
                    />
                    <TextField select label="Cómo se devolvió" value={method} onChange={(e) => setMethod(e.target.value)} fullWidth>
                        <MenuItem value="">Sin indicar</MenuItem>
                        {methods.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                    </TextField>
                    <TextField
                        label="Fecha del reembolso"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        inputProps={{ max: dayjs().format('YYYY-MM-DD') }}
                        slotProps={{ inputLabel: { shrink: true } }}
                        fullWidth
                    />
                    <TextField label="Motivo o nota" value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={2} fullWidth />
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Button component="label" variant="outlined" size="small">
                            Comprobante
                            <input hidden type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                        </Button>
                        <Typography variant="caption" color="text.secondary" noWrap>{file ? file.name : 'Opcional (imagen o PDF)'}</Typography>
                    </Stack>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>Cancelar</Button>
                <ButtonCustom onClick={save} disabled={saving || refundable <= 0}>{saving ? 'Guardando...' : 'Registrar'}</ButtonCustom>
            </DialogActions>
        </Dialog>
    );
};
