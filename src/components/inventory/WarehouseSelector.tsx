import React, { ChangeEvent, ReactNode, useEffect, useState } from 'react';
import { FormControl, InputLabel, Select, MenuItem, Chip, SelectChangeEvent } from '@mui/material';
import { Warehouse as WarehouseIcon, Star as StarIcon } from '@mui/icons-material';
import { request } from '../../common/request';
import { IResponse } from '../../interfaces/response-type';
import { IWarehouse } from '../../interfaces/inventory.types';
import { SelectCustom } from '../custom';
import { useUserStore } from '../../store/user/UserStore';

interface WarehouseSelectorProps {
    value: number | null;
    onChange: (warehouseId: number | null) => void;
    label?: string;
    showAll?: boolean;
    onlyActive?: boolean;
    size?: 'small' | 'medium';
    fullWidth?: boolean;
}

export const WarehouseSelector: React.FC<WarehouseSelectorProps> = ({
    value,
    onChange,
    label = 'Almacén',
    showAll = false,
    onlyActive = true,
    size = 'small',
    fullWidth = true,
}) => {
    const [warehouses, setWarehouses] = useState<IWarehouse[]>([]);
    const [loading, setLoading] = useState(false);
    const user = useUserStore.getState().user;
    useEffect(() => {
        loadWarehouses();
    }, []);

    const loadWarehouses = async () => {
        setLoading(true);
        try {
            const { status, response }: IResponse = await request('/warehouses', 'GET');
            if (status) {
                const data = await response.json();
                let warehouseList = data.data || [];
                if (onlyActive) {
                    warehouseList = warehouseList.filter((w: IWarehouse) => w.is_active);
                }
                setWarehouses(warehouseList);
            }
        } catch (error) {
            console.error('Error loading warehouses:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (event: ChangeEvent<HTMLInputElement> | (Event & { target: { value: unknown; name: string; }; }), child: ReactNode) => {
        const val = event.target.value;
        onChange(val === 'all' ? null : Number(val));
    };

    return (
        <SelectCustom
            value={value === null ? 'all' : value}
            onChange={handleChange}
            label={label}
            disabled={loading}
        >
            {showAll && (
                <MenuItem value="all">
                    <em>Todos los almacenes</em>
                </MenuItem>
            )}
            {warehouses.map((warehouse) => (
                <MenuItem key={warehouse.id} value={warehouse.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{warehouse.name} ({warehouse.code})</span>
                        {warehouse.is_main && (
                            <Chip
                                label="Principal"
                                size="small"
                                sx={{ ml: 1, color: (theme) => theme.palette.getContrastText(user.color), background: user.color }}
                            />
                        )}
                    </div>
                </MenuItem>
            ))}
        </SelectCustom>
    );
};
