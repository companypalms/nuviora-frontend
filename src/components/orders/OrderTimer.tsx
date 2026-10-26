import React, { useState, useEffect, FC } from 'react';
import { Box, Tooltip } from '@mui/material';
import { TimerRounded } from '@mui/icons-material';
import { TypographyCustom } from '../custom';
import { red, green, orange } from '@mui/material/colors';

interface OrderTimerProps {
    receivedAt: string | null;
    deliveredAt?: string | null;
    status: string;
}

export const OrderTimer: FC<OrderTimerProps> = ({ receivedAt, deliveredAt, status }) => {
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [isOverdue, setIsOverdue] = useState(false);

    useEffect(() => {
        if (!receivedAt) return;

        const timer = setInterval(() => {
            // Backend configured as 'America/Caracas'.
            // We interpret the string as LOCAL time (assuming user is in Venezuela).
            // We replace space with T for standard ISO local format.
            const startStr = receivedAt.replace(' ', 'T');
            const startT = new Date(startStr).getTime();

            let now = new Date().getTime();
            if (deliveredAt) {
                // If delivered, we use that timestamp (also Local/Backend time)
                const endStr = deliveredAt.replace(' ', 'T');
                now = new Date(endStr).getTime();
            }

            const diffInSeconds = Math.floor((now - startT) / 1000);

            const isNovedad = status === 'Novedades';
            const isEsperandoUbicacion = status === 'Esperando Ubicacion';

            let limitMinutes = 45;
            if (isNovedad) limitMinutes = 10;
            // if (isEsperandoUbicacion) limitMinutes = 45; // Default is 45, so redundant but keeps logic clear if 45 is default.
            // actually, 'En ruta' is also 45. Waiting is 45. Default is 45.
            // Only Novedad is 10.

            // To be explicit based on user feedback:
            if (isEsperandoUbicacion) limitMinutes = 30;

            const limitSeconds = limitMinutes * 60;

            const remaining = limitSeconds - diffInSeconds;
            setTimeLeft(remaining);
            setIsOverdue(remaining <= 0);

            if (deliveredAt || status === 'Entregado') {
                clearInterval(timer);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [receivedAt, deliveredAt, status]);

    if (!receivedAt) return null;

    const formatTime = (seconds: number) => {
        const absSeconds = Math.abs(seconds);
        const mins = Math.floor(absSeconds / 60);
        const secs = absSeconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getColor = () => {
        if (status === 'Entregado') return green[600];
        if (isOverdue) return red[600];
        if (timeLeft && timeLeft < 600) return orange[600]; // Less than 10 mins
        return 'info.main';
    };

    const isNovedad = status === 'Novedades';
    const isEsperandoUbicacion = status === 'Esperando Ubicacion';

    let limitMinutes = 45;
    if (isNovedad) limitMinutes = 10;
    if (isEsperandoUbicacion) limitMinutes = 30;

    const label = isNovedad ? "Tiempo de novedad" : (isEsperandoUbicacion ? "Tiempo de espera" : "Tiempo para entrega");
    const limitSeconds = limitMinutes * 60;

    return (
        <Tooltip title={isOverdue ? `Tiempo excedido (Límite ${limitMinutes} min)` : `${label} (${limitMinutes} min)`}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TimerRounded sx={{ fontSize: '1rem', color: getColor() }} />
                <TypographyCustom variant="caption" sx={{ color: getColor(), fontWeight: 'bold' }}>
                    {timeLeft !== null ? (isOverdue ? `-${formatTime(timeLeft)}` : formatTime(timeLeft)) : '--:--'}
                </TypographyCustom>
            </Box>
        </Tooltip>
    );
};
