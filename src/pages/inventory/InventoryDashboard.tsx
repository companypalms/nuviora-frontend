import React, { useState, useEffect } from 'react';
import {
    Box,
    Tabs,
    Tab,
} from '@mui/material';
import {
    Warehouse as WarehouseIcon,
    Inventory as InventoryIcon,
    LocalShipping as DelivererIcon,
    SwapHoriz as OperationIcon,
    History as HistoryIcon,
    AccountBalance as ValuationIcon,
    LocalShippingOutlined as InTransitIcon,
    Map as CityIcon,
    Route as ReplenishmentIcon,
    FileDownload as ExportIcon,
} from '@mui/icons-material';
import { Layout } from '../../components/ui/Layout';
import { DescripcionDeVista } from '../../components/ui/content/DescripcionDeVista';
import { useValidateSession } from '../../hooks/useValidateSession';
import { Loading } from '../../components/ui/content/Loading';
import { useLocation, useNavigate } from 'react-router-dom';

// Tab Contents (We'll reuse existing logic or import transformed components)
import { Warehouses } from './Warehouses';
import { InventoryOverview as GlobalInventory } from './InventoryOverview';
import { DelivererStock } from '../deliverers/DelivererStock';
import { StockTransfer } from './StockTransfer';
import { StockAdjustment } from './StockAdjustment';
import { TransferTripsPanel } from '../../components/finance/TransferTripsPanel';
import { InventoryMovements } from './InventoryMovements';
import { InventoryValuation } from './InventoryValuation';
import { InTransitPanel } from '../../components/inventory/InTransitPanel';
import { CityInventory } from './CityInventory';
import { Replenishment } from '../admin/Replenishment';
import { StockExportPage } from '../admin/StockExportPage';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`inventory-tabpanel-${index}`}
            aria-labelledby={`inventory-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ py: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

export const InventoryDashboard: React.FC = () => {
    const { loadingSession, isValid, user } = useValidateSession();
    const location = useLocation();

    const roleDesc = user?.role?.description ?? "Repartidor";
    const isAdminOrAgencia = roleDesc === 'Admin' || roleDesc === 'Agencia';

    // Define tabs with their requirements
    const allTabs = [
        { label: 'Inventario Global', icon: <InventoryIcon />, component: <GlobalInventory isEmbedded />, roles: ['Admin', 'Agencia'], path: '/inventory' },
        // Las pestañas "Por ciudad", "Reabastecimiento" y "Exportar" son solo del Admin: Gerente y Vendedora siguen entrando
        // a /inventario-ciudades y /admin/stock-export desde su menú
        { label: 'Por ciudad', icon: <CityIcon />, component: <CityInventory isEmbedded />, roles: ['Admin'], path: '/inventory/por-ciudad' },
        { label: 'Almacenes', icon: <WarehouseIcon />, component: <Warehouses isEmbedded />, roles: ['Admin', 'Agencia'], path: '/warehouses' },
        { label: 'Stock Repartidores', icon: <DelivererIcon />, component: <DelivererStock isEmbedded />, roles: ['Admin', 'Agencia', 'Repartidor'], path: '/deliverers/stock' },
        {
            label: 'Operaciones', icon: <OperationIcon />, component: (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <StockTransfer isEmbedded />
                    <TransferTripsPanel />
                    <StockAdjustment isEmbedded />
                </Box>
            ), roles: ['Admin'], path: '/operations'
        },
        // Módulo 5 (§15, §16, R2, R3): traslados en tránsito y compras por recibir
        { label: 'En camino', icon: <InTransitIcon />, component: <InTransitPanel />, roles: ['Admin', 'Agencia'], path: '/in-transit' },
        { label: 'Historial', icon: <HistoryIcon />, component: <InventoryMovements isEmbedded />, roles: ['Admin', 'Agencia'], path: '/movements' },
        // R9 (Módulo 5): "Reabastecimiento SCM", "Órdenes de Compra" y "Test SCM" salieron del menú; los reemplaza Reabastecimiento
        { label: 'Valoración', icon: <ValuationIcon />, component: <InventoryValuation />, roles: ['Admin', 'Gerente', 'Master'], path: '/valuation' },
        { label: 'Reabastecimiento', icon: <ReplenishmentIcon />, component: <Replenishment isEmbedded />, roles: ['Admin'], path: '/reabastecimiento' },
        { label: 'Exportar', icon: <ExportIcon />, component: <StockExportPage isEmbedded />, roles: ['Admin'], path: '/inventory/exportar' },
    ];

    const availableTabs = allTabs.filter(tab => tab.roles.includes(roleDesc));

    // Determine initial tab
    const getInitialTabIndex = () => {
        const path = location.pathname;
        // La pestaña más específica: "/inventory" está en todas las rutas, así que gana la de ruta más larga
        let index = -1;
        availableTabs.forEach((tab, i) => {
            if (path.includes(tab.path) && (index === -1 || tab.path.length > availableTabs[index].path.length)) index = i;
        });
        return index !== -1 ? index : 0;
    };

    const [value, setValue] = useState(getInitialTabIndex());

    // Sync tab with URL if needed (optional but good)
    useEffect(() => {
        setValue(getInitialTabIndex());
    }, [location.pathname]);

    const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };

    if (loadingSession || !isValid || !user.token) return <Loading />;

    return (
        <Layout>
            <DescripcionDeVista
                title="Centro de Control de Inventario"
                description={isAdminOrAgencia ? "Gestión centralizada de almacenes, stock global, repartidores y movimientos." : "Gestión de stock personal y entregas."}
            />

            <Box sx={{ width: '100%', mt: 2 }}>
                {availableTabs.length > 1 && (
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', borderRadius: '12px 12px 0 0' }}>
                        <Tabs
                            value={value}
                            onChange={handleChange}
                            variant="scrollable"
                            scrollButtons="auto"
                            aria-label="inventory dashboard tabs"
                            sx={{
                                px: 2,
                                '& .MuiTab-root': {
                                    minHeight: 64,
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem'
                                }
                            }}
                        >
                            {availableTabs.map((tab, index) => (
                                <Tab key={index} icon={tab.icon} iconPosition="start" label={tab.label} />
                            ))}
                        </Tabs>
                    </Box>
                )}

                {availableTabs.map((tab, index) => (
                    <TabPanel key={index} value={value} index={index}>
                        {tab.component}
                    </TabPanel>
                ))}
            </Box>
        </Layout>
    );
};

