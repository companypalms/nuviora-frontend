import React from 'react';
import { Chip } from '@mui/material';
import {
    SwapHoriz as TransferIcon,
    ArrowDownward as InIcon,
    ArrowUpward as OutIcon,
    TuneRounded as AdjustIcon
} from '@mui/icons-material';

interface MovementTypeChipProps {
    type: 'transfer' | 'in' | 'out' | 'adjustment';
    size?: 'small' | 'medium';
}

export const MovementTypeChip: React.FC<MovementTypeChipProps> = ({ type, size = 'small' }) => {
    const getConfig = () => {
        switch (type) {
            case 'transfer':
                return { label: 'Transferencia', color: 'primary' as const, icon: <TransferIcon /> };
            case 'in':
                return { label: 'Entrada', color: 'success' as const, icon: <InIcon /> };
            case 'out':
                return { label: 'Salida', color: 'error' as const, icon: <OutIcon /> };
            case 'adjustment':
                return { label: 'Ajuste', color: 'warning' as const, icon: <AdjustIcon /> };
        }
    };

    const config = getConfig();

    return (
        <Chip
            label={config.label}
            color={config.color}
            size={size}
            icon={config.icon}
            variant="filled"
        />
    );
};
