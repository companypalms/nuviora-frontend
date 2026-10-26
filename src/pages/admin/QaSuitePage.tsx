import { FC, useState } from 'react';
import {
    Box, Typography, Tabs, Tab, Paper, Alert, alpha, Chip,
} from '@mui/material';
import {
    BugReportRounded, SwapHorizRounded, PaymentRounded,
    CancelRounded, PersonRounded, AddShoppingCartRounded,
    WarningAmberRounded, BusinessRounded,
} from '@mui/icons-material';
import { Layout } from '../../components/ui/Layout';
import { StatusFlowTest } from './qa-tests/StatusFlowTest';
import { PaymentMethodTest } from './qa-tests/PaymentMethodTest';
import { CancellationFlowTest } from './qa-tests/CancellationFlowTest';
import { AgentAssignmentTest } from './qa-tests/AgentAssignmentTest';
import { UpsellItemTest } from './qa-tests/UpsellItemTest';
import { AgencyAssignmentTest } from './qa-tests/AgencyAssignmentTest';
import { InventorySizesTest } from './qa-tests/InventorySizesTest';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

const TabPanel: FC<TabPanelProps> = ({ children, value, index }) => (
    <Box role="tabpanel" hidden={value !== index} sx={{ pt: 3 }}>
        {value === index && children}
    </Box>
);

const TABS = [
    {
        label: 'Status Flow',
        icon: <SwapHorizRounded fontSize="small" />,
        description: 'Cambia estado de una orden y revierte',
        color: '#6366f1',
        risk: 'medio',
    },
    {
        label: 'Método de Pago',
        icon: <PaymentRounded fontSize="small" />,
        description: 'Añade pago ficticio y restaura',
        color: '#10b981',
        risk: 'bajo',
    },
    {
        label: 'Cancelación',
        icon: <CancelRounded fontSize="small" />,
        description: 'Solicita y rechaza una cancelación',
        color: '#f59e0b',
        risk: 'medio',
    },
    {
        label: 'Asignar Agente',
        icon: <PersonRounded fontSize="small" />,
        description: 'Reasigna agente y revierte',
        color: '#3b82f6',
        risk: 'bajo',
    },
    {
        label: 'Upsell / Ítem',
        icon: <AddShoppingCartRounded fontSize="small" />,
        description: 'Añade ítem y lo elimina (más seguro)',
        color: '#22c55e',
        risk: 'ninguno',
    },
    {
        label: 'Asignar Agencia',
        icon: <BusinessRounded fontSize="small" />,
        description: 'Reasigna almacén/agencia y revierte',
        color: '#8b5cf6',
        risk: 'alto',
    },
    {
        label: 'Inventario (Tallas)',
        icon: <AddShoppingCartRounded fontSize="small" />,
        description: 'Prueba entrada/salida manual por talla',
        color: '#f43f5e',
        risk: 'medio',
    },
];

const riskColor: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
    ninguno: 'success',
    bajo: 'success',
    medio: 'warning',
    alto: 'error',
};

export const QaSuitePage: FC = () => {
    const [activeTab, setActiveTab] = useState(0);

    return (
        <Layout>
            <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, margin: '0 auto' }}>

                {/* ── Header ────────────────────────────────────────────── */}
                <Box sx={{ mb: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                        <Box sx={{
                            p: 1.5, borderRadius: 3,
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            color: 'white', display: 'flex',
                            boxShadow: '0 4px 14px rgba(245,158,11,0.4)',
                        }}>
                            <BugReportRounded />
                        </Box>
                        <Box>
                            <Typography variant="h4" fontWeight="800" sx={{ letterSpacing: '-0.5px' }}>
                                QA Suite — Panel de Pruebas
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Simulaciones interactivas de flujos críticos del sistema de órdenes
                            </Typography>
                        </Box>
                        <Chip
                            label="Solo Admin"
                            size="small"
                            color="warning"
                            icon={<WarningAmberRounded />}
                            sx={{ ml: 'auto', fontWeight: 700 }}
                        />
                    </Box>
                </Box>

                {/* ── Warning Banner ─────────────────────────────────────── */}
                <Alert
                    severity="warning"
                    icon={<WarningAmberRounded />}
                    sx={{ mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'warning.light' }}
                >
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        ⚠️ Ambiente de Producción — Operaciones Reales
                    </Typography>
                    <Typography variant="body2">
                        Este panel ejecuta llamadas reales a la API y modifica datos en la BD.
                        Todos los tests <strong>revierten automáticamente</strong> sus cambios al finalizar.
                        Úsalos en horarios de baja actividad. Si un test falla a mitad de ejecución,
                        revisa manualmente el log para corregir el estado.
                    </Typography>
                </Alert>

                {/* ── Tab Overview Cards ─────────────────────────────────── */}
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' },
                    gap: 1.5,
                    mb: 3,
                }}>
                    {TABS.map((tab, i) => (
                        <Paper
                            key={i}
                            elevation={0}
                            onClick={() => setActiveTab(i)}
                            sx={{
                                p: 1.5, borderRadius: 3, cursor: 'pointer',
                                border: '2px solid',
                                borderColor: activeTab === i ? tab.color : 'divider',
                                bgcolor: activeTab === i ? alpha(tab.color, 0.06) : 'background.paper',
                                transition: 'all 0.18s ease',
                                '&:hover': {
                                    borderColor: tab.color,
                                    bgcolor: alpha(tab.color, 0.04),
                                    transform: 'translateY(-2px)',
                                    boxShadow: `0 4px 16px ${alpha(tab.color, 0.15)}`,
                                },
                            }}
                        >
                            <Box sx={{ color: tab.color, mb: 0.5 }}>{tab.icon}</Box>
                            <Typography variant="caption" fontWeight="bold" display="block" noWrap>
                                {tab.label}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block"
                                sx={{ fontSize: '0.67rem', lineHeight: 1.3 }}>
                                {tab.description}
                            </Typography>
                            <Chip
                                label={`Riesgo: ${tab.risk}`}
                                size="small"
                                color={riskColor[tab.risk]}
                                sx={{ mt: 0.75, fontSize: '0.6rem', height: 18, fontWeight: 600 }}
                            />
                        </Paper>
                    ))}
                </Box>

                {/* ── Tab Navigation ─────────────────────────────────────── */}
                <Paper
                    elevation={0}
                    sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}
                >
                    <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#000', 0.02) }}>
                        <Tabs
                            value={activeTab}
                            onChange={(_, v) => setActiveTab(v)}
                            variant="scrollable"
                            scrollButtons="auto"
                            sx={{
                                px: 2,
                                '& .MuiTab-root': {
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    minHeight: 52,
                                    fontSize: '0.85rem',
                                },
                                '& .MuiTabs-indicator': {
                                    height: 3,
                                    borderRadius: '3px 3px 0 0',
                                    bgcolor: TABS[activeTab]?.color ?? 'primary.main',
                                },
                                '& .Mui-selected': {
                                    color: `${TABS[activeTab]?.color ?? 'primary.main'} !important`,
                                },
                            }}
                        >
                            {TABS.map((tab, i) => (
                                <Tab
                                    key={i}
                                    label={tab.label}
                                    icon={tab.icon}
                                    iconPosition="start"
                                    sx={{ gap: 0.5 }}
                                />
                            ))}
                        </Tabs>
                    </Box>

                    <Box sx={{ p: { xs: 2, md: 3 } }}>
                        <TabPanel value={activeTab} index={0}>
                            <StatusFlowTest />
                        </TabPanel>
                        <TabPanel value={activeTab} index={1}>
                            <PaymentMethodTest />
                        </TabPanel>
                        <TabPanel value={activeTab} index={2}>
                            <CancellationFlowTest />
                        </TabPanel>
                        <TabPanel value={activeTab} index={3}>
                            <AgentAssignmentTest />
                        </TabPanel>
                        <TabPanel value={activeTab} index={4}>
                            <UpsellItemTest />
                        </TabPanel>
                        <TabPanel value={activeTab} index={5}>
                            <AgencyAssignmentTest />
                        </TabPanel>
                        <TabPanel value={activeTab} index={6}>
                            <InventorySizesTest />
                        </TabPanel>
                    </Box>
                </Paper>
            </Box>
        </Layout>
    );
};
