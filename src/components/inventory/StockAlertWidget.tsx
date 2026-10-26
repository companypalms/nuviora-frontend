import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Chip, Stack, Skeleton, Tooltip, IconButton
} from '@mui/material';
import { Panel } from '../ui/surface/Panel';
import {
    ErrorRounded as RedIcon,
    WarningAmberRounded as OrangeIcon,
    InfoRounded as YellowIcon,
    CheckCircleRounded as GreenIcon,
    RefreshRounded,
    OpenInNewRounded,
} from '@mui/icons-material';
import { request } from '../../common/request';
import { useNavigate } from 'react-router-dom';

interface AlertMeta {
    total: number;
    red_count: number;
    orange_count: number;
    yellow_count: number;
    green_count: number;
}

export const StockAlertWidget: React.FC = () => {
    const [meta, setMeta] = useState<AlertMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const load = async () => {
        setLoading(true);
        try {
            const { status, response } = await request('/scm/dashboard', 'GET');
            if (status === 200) {
                const json = await response.json();
                setMeta(json.meta ?? null);
            }
        } catch { /* silently fail */ }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const hasAlerts = meta && (meta.red_count > 0 || meta.orange_count > 0);

    if (loading) return (
        <Panel>
            <Skeleton width={160} height={24} />
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                {[1, 2, 3, 4].map(i => <Skeleton key={i} width={80} height={32} sx={{ borderRadius: 5 }} />)}
            </Stack>
        </Panel>
    );

    if (!meta) return null;

    return (
        <Panel sx={(t) => ({ boxShadow: hasAlerts ? `inset 3px 0 0 ${t.palette.error.main}` : 'none' })}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="subtitle2" fontWeight="bold" color={hasAlerts ? 'error.main' : 'text.primary'}>
                    {hasAlerts ? 'Alertas de inventario' : 'Inventario'}
                </Typography>
                <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Actualizar">
                        <IconButton size="small" onClick={load}>
                            <RefreshRounded fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Ver SCM completo">
                        <IconButton size="small" onClick={() => navigate('/inventory')}>
                            <OpenInNewRounded fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Box>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {meta.red_count > 0 && (
                    <Chip
                        icon={<RedIcon />}
                        label={`${meta.red_count} Urgente`}
                        color="error"
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                    />
                )}
                {meta.orange_count > 0 && (
                    <Chip
                        icon={<OrangeIcon />}
                        label={`${meta.orange_count} Alerta`}
                        color="warning"
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                    />
                )}
                {meta.yellow_count > 0 && (
                    <Chip
                        icon={<YellowIcon />}
                        label={`${meta.yellow_count} Precaución`}
                        size="small"
                        sx={{ fontWeight: 'bold', bgcolor: 'rgba(234,179,8,0.15)', color: '#b45309' }}
                    />
                )}
                {meta.green_count > 0 && (
                    <Chip
                        icon={<GreenIcon />}
                        label={`${meta.green_count} OK`}
                        color="success"
                        size="small"
                        variant="outlined"
                    />
                )}
            </Stack>

            {!hasAlerts && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Todos los productos tienen cobertura suficiente.
                </Typography>
            )}
        </Panel>
    );
};
