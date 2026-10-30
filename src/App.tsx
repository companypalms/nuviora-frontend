import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Theme } from '@mui/material';
import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getThemeLight, getThemeDark } from './common/theme';
import { Login } from './pages/auth/Login';

import { RecoverPassword } from './pages/auth/RecoverPassword';
import { RiderApp } from './pages/auth/RiderApp';
import { ResetPassword } from './pages/auth/ResetPassword';
import { useUserStore } from './store/user/UserStore';
import { RequireRole } from './components/auth/RequireRole';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/auth/Profile';
import { WhatsAppCrmPage } from './pages/whatsapp-crm/WhatsAppCrmPage';
import { Orders } from './pages/Orders';
import { UsersAndDeliverers } from './pages/users/UsersAndDeliverers';
import { CancellationsReview } from './pages/orders/cancellations/CancellationsReview';
// import { Roster } from './pages/roster/Roster';
import { WarehouseInventory } from './pages/inventory/WarehouseInventory';
import { EarningsAdmin } from './pages/money/EarningsAdmin';
import { MyEarningsPage } from './pages/money/EarningsMyPage';
import { Metrics } from './pages/Metrics';
import { BusinessMetrics } from './pages/BusinessMetrics';
import { ShopsAndCities } from './pages/admin/ShopsAndCities';
import { RatesAndPayments } from './pages/admin/RatesAndPayments';
import { PendingVueltos } from './pages/admin/PendingVueltos';
import { PendingApprovals } from './pages/admin/PendingApprovals';
import { Reconciliation } from './pages/admin/Reconciliation';
import { ReconciliationDay } from './pages/admin/ReconciliationDay';
import { Finance } from './pages/admin/Finance';
import { OwnerPanel } from './pages/owner-panel/OwnerPanel';
import { CalendarPage } from './pages/calendar/CalendarPage';
import { DaySummaryPage } from './pages/admin/DaySummaryPage';
import { AgencyClosures } from './pages/admin/AgencyClosures';
import { MyClosures } from './pages/agency/MyClosures';
import { MetaAdsDashboard } from './pages/admin/MetaAdsDashboard';
import { MetaCreativePage } from './pages/admin/MetaCreativePage';
import { MetaAnalysisPage } from './pages/admin/MetaAnalysisPage';
import { MetaQueuePage } from './pages/admin/MetaQueuePage';
import { SalesLite } from './pages/lite/SalesLite';
import { OrderTrackingReport } from './pages/OrderTrackingReport';
import { Integrations } from './pages/admin/Integrations';
import { RedirectToSection } from './components/ui/SectionTabsPage';
import { DeliveredHoursReport } from './pages/admin/DeliveredHoursReport';
import { PurchaseOrders } from './pages/inventory/PurchaseOrders';
import { OrdersExportPage } from './pages/admin/OrdersExportPage';
import { StockExportPage } from './pages/admin/StockExportPage';
import { Distribution } from './pages/round-robin/Distribution';
import { MyGroup } from './pages/my-group/MyGroup';
import { CityInventory } from './pages/inventory/CityInventory';
import { WeeklyReportPage } from './pages/my-group/WeeklyReportPage';
import { InternalChatPage } from './pages/internal-chat/InternalChatPage';
import { AgencyChatGateModal } from './components/internal-chat/AgencyChatGateModal';
import { CancelReasonPrompt } from './components/orders/CancelReasonPrompt';
import { ControlTower } from './pages/logistics/ControlTower';

const useGetTheme = () => {
  const user = useUserStore((state) => state.user);
  const [theme, setTheme] = useState<Theme>(getThemeLight('#0073ff'))

  useEffect(() => {
    const color = user?.color || '#0073ff';
    if (user?.theme === 'dark') {
      setTheme(getThemeDark(color));
    } else {
      setTheme(getThemeLight(color));
    }
  }, [user?.theme, user?.color])
  return theme
}

import { InventoryDashboard } from './pages/inventory/InventoryDashboard';

function App() {
  const theme = useGetTheme()
  const isLite = useUserStore((s) => s.user.is_lite_view);
  // El operador logístico no tiene dashboard: su pantalla es la torre de control
  const isOperator = useUserStore((s) => s.user.role?.description === 'Operador logístico');

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AgencyChatGateModal />
        <CancelReasonPrompt />
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/recover-password" element={<RecoverPassword />} />
          <Route path="/app" element={<RiderApp />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route path="/dashboard" element={
            <RequireRole>
              {isLite ? <SalesLite /> : isOperator ? <Navigate to="/logistica" replace /> : <Dashboard />}
            </RequireRole>
          } />

          <Route path="/profile" element={<RequireRole><Profile /></RequireRole>} />

          <Route path="/orders" element={
            <RequireRole>
              {isLite ? <SalesLite /> : <Orders />}
            </RequireRole>
          } />

          {/* Fuera del menú desde 2026-10-29 (se cancela directo): queda para resolver solicitudes viejas del sistema real */}
          <Route path="/orders/cancelled" element={<RequireRole allowedRoles={['Admin', 'Gerente']}><CancellationsReview /></RequireRole>} />

          {/* El WhatsApp viejo se quitó (2026-10-29): su dirección lleva al CRM */}
          <Route path="/whatsapp-old" element={<Navigate to="/whatsapp" replace />} />

          {/* WhatsApp CRM v2 — Lógica de permisos nueva */}
          <Route path="/whatsapp" element={<RequireRole allowedRoles={['Admin', 'Gerente', 'Vendedor']}><WhatsAppCrmPage /></RequireRole>} />

          <Route path="/deliverers" element={<RedirectToSection to="/users" section="repartidores" />} />
          <Route path="/currency" element={<RedirectToSection to="/admin/tasa-y-pagos" section="tasa" />} />
          <Route path="/users" element={<RequireRole allowedRoles={['Admin', 'Gerente']}><UsersAndDeliverers /></RequireRole>} />

          {/* Unified Inventory Dashboard */}
          <Route path="/inventory" element={<RequireRole allowedRoles={['Admin', 'Agencia']}><InventoryDashboard /></RequireRole>} />
          <Route path="/inventory/warehouses" element={<RequireRole allowedRoles={['Admin', 'Agencia']}><InventoryDashboard /></RequireRole>} />
          <Route path="/inventory/warehouses/:id" element={<RequireRole allowedRoles={['Admin', 'Agencia']}><WarehouseInventory /></RequireRole>} />
          <Route path="/inventory/movements" element={<RequireRole allowedRoles={['Admin', 'Agencia']}><InventoryDashboard /></RequireRole>} />
          <Route path="/inventory/transfer" element={<RequireRole allowedRoles={['Admin', 'Agencia']}><InventoryDashboard /></RequireRole>} />
          <Route path="/inventory/adjust" element={<RequireRole allowedRoles={['Admin', 'Agencia']}><InventoryDashboard /></RequireRole>} />
          <Route path="/inventory/in-transit" element={<RequireRole allowedRoles={['Admin', 'Agencia']}><InventoryDashboard /></RequireRole>} />
          <Route path="/deliverers/stock" element={<RequireRole allowedRoles={['Repartidor']}><InventoryDashboard /></RequireRole>} />

          {/* ── Fase 5: Órdenes de Compra ──────────────────────────────────────── */}
          <Route path="/inventory/purchase-orders" element={<RequireRole allowedRoles={['Admin', 'Gerente']}><PurchaseOrders /></RequireRole>} />

          <Route path="/earnings" element={<RequireRole allowedRoles={['Admin']}><EarningsAdmin /></RequireRole>} />
          <Route path="/me/earnings" element={<RequireRole allowedRoles={['Vendedor', 'Repartidor', 'Gerente']}><MyEarningsPage /></RequireRole>} />
          <Route path="/shops" element={<RedirectToSection to="/admin/tiendas-y-ciudades" section="tiendas" />} />
          <Route path="/metrics" element={<RequireRole allowedRoles={['Admin', 'Gerente']}><Metrics /></RequireRole>} />
          <Route path="/business-metrics" element={<RequireRole allowedRoles={['Admin']}><BusinessMetrics /></RequireRole>} />
          <Route path="/cities" element={<RedirectToSection to="/admin/tiendas-y-ciudades" section="ciudades" />} />
          <Route path="/admin/tiendas-y-ciudades" element={<RequireRole allowedRoles={['Admin', 'Gerente', 'Master']}><ShopsAndCities /></RequireRole>} />
          <Route path="/admin/tasa-y-pagos" element={<RequireRole allowedRoles={['Admin', 'Gerente']}><RatesAndPayments /></RequireRole>} />
          <Route path="/admin/company-accounts" element={<RedirectToSection to="/admin/tasa-y-pagos" section="cuentas" />} />
          <Route path="/admin/banks" element={<RedirectToSection to="/admin/tasa-y-pagos" section="bancos" />} />
          <Route path="/por-aprobar" element={<RequireRole allowedRoles={['Admin', 'Gerente', 'Master']}><PendingApprovals /></RequireRole>} />
          <Route path="/admin/comprobantes" element={<RedirectToSection to="/por-aprobar" section="comprobantes" />} />
          <Route path="/admin/vueltos-por-validar" element={<RedirectToSection to="/por-aprobar" section="validar" />} />
          <Route path="/admin/pending-vueltos" element={<RedirectToSection to="/por-aprobar" section="pagar" />} />
          {/* Conciliación de pagos digitales (documento de Fran del 2026-10-06): solo el Administrador (§29) */}
          <Route path="/conciliacion" element={<RequireRole allowedRoles={['Admin']}><Reconciliation /></RequireRole>} />
          <Route path="/conciliacion/:date" element={<RequireRole allowedRoles={['Admin']}><ReconciliationDay /></RequireRole>} />
          {/* Meta Ads, solo lectura (Módulo 2 de Fran): solo el Administrador (§44) */}
          <Route path="/meta-ads" element={<RequireRole allowedRoles={['Admin']}><MetaAdsDashboard /></RequireRole>} />
          <Route path="/meta-ads/creativos/:id" element={<RequireRole allowedRoles={['Admin']}><MetaCreativePage /></RequireRole>} />
          <Route path="/meta-ads/analisis" element={<RequireRole allowedRoles={['Admin']}><MetaAnalysisPage /></RequireRole>} />
          <Route path="/meta-ads/cola" element={<RequireRole allowedRoles={['Admin']}><MetaQueuePage /></RequireRole>} />
          <Route path="/admin/meta-ads" element={<RedirectToSection to="/admin/integraciones" section="meta" />} />
          <Route path="/admin/tarifas-delivery" element={<RedirectToSection to="/admin/tiendas-y-ciudades" section="tarifas" />} />
          <Route path="/finanzas" element={<RequireRole allowedRoles={['Admin']}><Finance /></RequireRole>} />
          {/* Panel del dueño (Etapa 2, guias/DICCIONARIO-METRICAS.md): solo el Administrador */}
          <Route path="/panel-dueno" element={<RequireRole allowedRoles={['Admin']}><OwnerPanel /></RequireRole>} />
          {/* Calendario del dueño (Etapa 3): pagos, tareas y notas de cada día. Solo el Administrador */}
          <Route path="/calendario" element={<RequireRole allowedRoles={['Admin']}><CalendarPage /></RequireRole>} />
          {/* Resumen del día (Etapa 4): lo que estaba en el Dashboard del Admin antes de que quedara con sus metas, lo de hoy y su asistente */}
          <Route path="/resumen-del-dia" element={<RequireRole allowedRoles={['Admin']}><DaySummaryPage /></RequireRole>} />
          {/* Módulo 5 de Fran: reabastecimiento, solo Admin (§3). Es una pestaña del Inventario; esta dirección la abre */}
          <Route path="/reabastecimiento" element={<RequireRole allowedRoles={['Admin']}><InventoryDashboard /></RequireRole>} />
          <Route path="/admin/cierres-agencias" element={<RequireRole allowedRoles={['Admin']}><AgencyClosures /></RequireRole>} />
          <Route path="/admin/cierres-agencias/:id" element={<RequireRole allowedRoles={['Admin']}><AgencyClosures /></RequireRole>} />
          <Route path="/cierres" element={<RequireRole allowedRoles={['Agencia']}><MyClosures /></RequireRole>} />
          <Route path="/mi-grupo/vueltos" element={<RequireRole allowedRoles={['Vendedor']}><PendingVueltos /></RequireRole>} />
          <Route path="/admin/integraciones" element={<RequireRole allowedRoles={['Admin', 'Gerente']}><Integrations /></RequireRole>} />
          <Route path="/admin/whatsapp-templates" element={<RedirectToSection to="/admin/integraciones" section="whatsapp" />} />
          <Route path="/admin/webhooks" element={<RedirectToSection to="/admin/integraciones" section="webhooks" />} />
          <Route path="/admin/media-explorer" element={<RedirectToSection to="/admin/integraciones" section="medios" />} />
          <Route path="/tracking-report" element={<RequireRole allowedRoles={['Admin', 'Gerente']}><OrderTrackingReport /></RequireRole>} />
          <Route path="/admin/delivered-hours-report" element={<RequireRole allowedRoles={['Admin']}><DeliveredHoursReport /></RequireRole>} />
          {/* La Suite QA se quitó (2026-10-29): sus pruebas cambiaban órdenes reales */}
          <Route path="/admin/qa-suite" element={<Navigate to="/dashboard" replace />} />
          <Route path="/admin/orders-export" element={<RequireRole allowedRoles={['Admin', 'Gerente']}><OrdersExportPage /></RequireRole>} />
          <Route path="/admin/stock-export" element={<RequireRole allowedRoles={['Admin', 'Gerente']}><StockExportPage /></RequireRole>} />
          <Route path="/round-robin" element={<RequireRole allowedRoles={['Admin', 'Gerente', 'Master']}><Distribution /></RequireRole>} />
          <Route path="/grupos-de-venta" element={<RedirectToSection to="/round-robin" section="grupos" />} />
          {/* La Líder es una Vendedor; la página y el servidor comprueban que lidere un grupo. El Admin la mira con ?grupo= (solo lectura) */}
          <Route path="/inventario-ciudades" element={<RequireRole allowedRoles={['Vendedor', 'Admin', 'Gerente', 'Master']}><CityInventory /></RequireRole>} />
          <Route path="/mi-grupo" element={<RequireRole allowedRoles={['Vendedor', 'Admin', 'Master']}><MyGroup /></RequireRole>} />
          <Route path="/mi-grupo/reporte" element={<RequireRole allowedRoles={['Vendedor', 'Admin', 'Master']}><WeeklyReportPage /></RequireRole>} />

          {/* Logística propia (documento de Fran del 2026-10-21): torre de control del operador y configuración del Admin */}
          <Route path="/logistica" element={<RequireRole allowedRoles={['Admin', 'Master', 'Operador logístico']}><ControlTower /></RequireRole>} />

          {/* Chat interno vendedora <-> agencia */}
          <Route path="/internal-chat" element={<RequireRole allowedRoles={['Admin', 'Gerente', 'Master', 'Vendedor', 'Agencia']}><InternalChatPage /></RequireRole>} />

          {/* VISTA LITE DE VENTAS */}
          <Route path="/ordenes" element={
            <RequireRole>
              {isLite ? <SalesLite /> : <Dashboard />}
            </RequireRole>
          } />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
