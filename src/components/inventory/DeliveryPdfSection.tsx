// src/components/inventory/DeliveryPdfSection.tsx
// .106 (dueño, 2026-11-05): el PDF que recibe por WhatsApp el cliente de este producto (ej. la guía de uso) 10 minutos
// después de que su pedido se marca Entregado. Sale solo si el cliente escribió en las últimas 24 horas (sin plantilla de
// Meta), una vez por cliente. Quitarlo apaga el envío al instante. Solo Admin/Master (backend: ProductDeliveryPdfController).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, CircularProgress, Link, Skeleton, TextField, Typography } from '@mui/material';
import PictureAsPdfRounded from '@mui/icons-material/PictureAsPdfRounded';
import { toast } from 'react-toastify';
import { request } from '../../common/request';
import { cardSx, geist, inkSx, lineSx, plural, tapSx, useTokens } from '../ui/design';

interface DeliveryPdf {
    name: string | null;
    url: string | null;
    since: string | null;
    caption: string | null;
    default_caption: string;
    sent_count: number;
    last_sent_at: string | null;
}

const fecha = (s: string | null) => (s ? new Date(s.replace(' ', 'T')).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' }) : '');

export const DeliveryPdfSection: React.FC<{ productId: number }> = ({ productId }) => {
    const t = useTokens();
    const fileRef = useRef<HTMLInputElement>(null);
    const [data, setData] = useState<DeliveryPdf | null>(null);
    const [error, setError] = useState(false);
    const [busy, setBusy] = useState<'' | 'file' | 'text' | 'remove'>('');
    const [caption, setCaption] = useState('');

    const show = (d: DeliveryPdf) => {
        setData(d);
        setCaption(d.caption ?? d.default_caption);
    };

    const load = useCallback(async () => {
        setError(false);
        const { status, response } = await request(`/products/${productId}/delivery-pdf`, 'GET');
        if (status === 200) show(await response.json());
        else setError(true);
    }, [productId]);

    useEffect(() => { load(); }, [load]);

    const upload = async (file: File) => {
        const form = new FormData();
        form.append('file', file);
        setBusy('file');
        const { status, response } = await request(`/products/${productId}/delivery-pdf`, 'POST', form, true);
        setBusy('');
        if (status === 200) {
            show(await response.json());
            toast.success('PDF listo: se manda desde ahora a quien reciba este producto.');
        } else {
            const body = await response.json().catch(() => ({}));
            toast.error(body?.errors?.file?.[0] ?? body?.message ?? 'No se pudo subir el PDF. Revisa que sea un PDF de menos de 20 MB.');
        }
    };

    const saveText = async () => {
        setBusy('text');
        const { status, response } = await request(`/products/${productId}/delivery-pdf`, 'PUT', { caption });
        setBusy('');
        if (status === 200) {
            show(await response.json());
            toast.success('Texto guardado.');
        } else toast.error('No se pudo guardar el texto. Reintenta.');
    };

    const remove = async () => {
        if (!window.confirm('¿Quitar el PDF? Deja de mandarse al instante.')) return;
        setBusy('remove');
        const { status, response } = await request(`/products/${productId}/delivery-pdf`, 'DELETE');
        setBusy('');
        if (status === 200) {
            show(await response.json());
            toast.success('PDF quitado: ya no se manda.');
        } else toast.error('No se pudo quitar. Reintenta.');
    };

    const picker = (
        <input ref={fileRef} type="file" accept="application/pdf,.pdf" hidden
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) upload(f); }} />
    );

    return (
        <Box sx={{ ...cardSx(t), ...geist, p: 2 }}>
            <Typography sx={{ fontSize: 15, fontWeight: 500, color: t.ink }}>PDF para el cliente al entregar</Typography>
            <Typography sx={{ fontSize: 13, color: t.muted, mt: 0.5 }}>
                Le llega por WhatsApp 10 minutos después de que su pedido se marca Entregado, si el cliente escribió en las
                últimas 24 horas. Una sola vez por cliente.
            </Typography>
            {picker}

            {!data && !error && <Skeleton variant="rounded" height={44} sx={{ mt: 1.5, borderRadius: '10px' }} />}

            {error && (
                <Box role="alert" sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography sx={{ fontSize: 14, color: t.ink, flex: 1 }}>No se pudo ver el PDF de este producto.</Typography>
                    <Button type="button" variant="outlined" sx={{ ...lineSx(t), ...tapSx }} onClick={load}>Reintentar</Button>
                </Box>
            )}

            {data && !data.url && (
                <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontSize: 14, color: t.muted, flex: 1, minWidth: 180 }}>Este producto todavía no tiene PDF: no se manda nada.</Typography>
                    <Button type="button" variant="contained" disableElevation disabled={busy !== ''} sx={{ ...inkSx(t), ...tapSx }} onClick={() => fileRef.current?.click()}>
                        {busy === 'file' ? <CircularProgress size={20} color="inherit" /> : 'Subir PDF'}
                    </Button>
                </Box>
            )}

            {data?.url && (
                <>
                    <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <PictureAsPdfRounded sx={{ color: t.muted }} />
                        <Link href={data.url} target="_blank" rel="noopener" underline="always" sx={{ fontSize: 14, color: t.ink, flex: 1, minWidth: 160, wordBreak: 'break-word' }}>
                            {data.name}
                        </Link>
                        <Button type="button" variant="outlined" disabled={busy !== ''} sx={{ ...lineSx(t), ...tapSx }} onClick={() => fileRef.current?.click()}>
                            {busy === 'file' ? <CircularProgress size={18} color="inherit" /> : 'Cambiar'}
                        </Button>
                        <Button type="button" variant="text" disabled={busy !== ''} sx={{ color: t.muted, textDecoration: 'underline', ...tapSx }} onClick={remove}>
                            Quitar
                        </Button>
                    </Box>
                    <Typography sx={{ fontSize: 13, color: t.muted, mt: 1 }}>
                        Se manda desde el {fecha(data.since)} · ya lo recibieron {plural(data.sent_count, 'cliente', 'clientes')}
                    </Typography>
                </>
            )}

            {data && (
                <Box sx={{ mt: 2 }}>
                    <TextField
                        fullWidth multiline minRows={3} size="small"
                        label="Texto que acompaña al PDF"
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        inputProps={{ maxLength: 900 }}
                        helperText="{nombre} y {producto} se cambian solos por el nombre del cliente y el del producto."
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
                        <Button type="button" variant="text" sx={{ color: t.muted, textDecoration: 'underline' }} onClick={() => setCaption(data.default_caption)}>
                            Usar el texto de siempre
                        </Button>
                        <Button type="button" variant="outlined" disabled={busy !== '' || caption === (data.caption ?? data.default_caption)} sx={{ ...lineSx(t), ...tapSx }} onClick={saveText}>
                            {busy === 'text' ? <CircularProgress size={18} color="inherit" /> : 'Guardar texto'}
                        </Button>
                    </Box>
                </Box>
            )}
        </Box>
    );
};
