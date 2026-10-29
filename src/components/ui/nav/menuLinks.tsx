// src/components/ui/nav/menuLinks.tsx
// Las opciones del menú lateral, en secciones y con palabras para el buscador (Fran, 2026-10-03: con más de 30
// opciones en una sola lista no encontraba nada).
import { ReactNode } from "react";
import AttachMoneyRoundedIcon from "@mui/icons-material/AttachMoneyRounded";
import EngineeringRoundedIcon from "@mui/icons-material/EngineeringRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import DoNotDisturbAltRoundedIcon from "@mui/icons-material/DoNotDisturbAltRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import LocalMallRoundedIcon from "@mui/icons-material/LocalMallRounded";
import SavingsRoundedIcon from "@mui/icons-material/SavingsRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import {
    AccessTimeRounded, AccountBalanceRounded, FactCheckRounded, FileDownloadRounded, HistoryRounded,
    InsertDriveFileRounded, MapRounded, RouteRounded, PeopleAltRounded, PollRounded, ReceiptLongRounded,
    SettingsEthernetRounded, SettingsRounded, ShoppingBagRounded, StorefrontRounded, SyncAltRounded, WarehouseRounded,
    AssessmentRounded, Diversity3Rounded, PaymentsRounded, ImageSearchRounded, InsightsRounded, RequestQuoteRounded,
    AccountBalanceWalletRounded, CellTowerRounded,
} from "@mui/icons-material";

export type SectionId = "principal" | "ventas" | "inventario" | "dinero" | "reportes" | "config";

export type NavLink = {
    text: string;
    icon: ReactNode;
    link: string;
    section: SectionId;
    roles?: string[]; // descriptions: 'Admin' | 'Gerente' | 'Vendedor' | 'Repartidor' | 'Agencia' | 'Master'
    leaderOnly?: boolean; // solo si la usuaria lidera un grupo de venta
    keywords?: string; // otras palabras con las que se busca
    newTab?: boolean;
};

export const SECTIONS: { id: SectionId; title: string; icon: ReactNode }[] = [
    { id: "principal", title: "Principal", icon: <DashboardRoundedIcon /> },
    { id: "ventas", title: "Ventas y reparto", icon: <ShoppingBagRounded /> },
    { id: "inventario", title: "Inventario", icon: <Inventory2RoundedIcon /> },
    { id: "dinero", title: "Dinero", icon: <PaymentsRounded /> },
    { id: "reportes", title: "Reportes", icon: <AssessmentRounded /> },
    { id: "config", title: "Configuración", icon: <SettingsRounded /> },
];

export const MENU_LINKS: NavLink[] = [
    // Principal
    { section: "principal", text: "Dashboard", icon: <DashboardRoundedIcon />, link: "/dashboard", roles: ["Admin", "Gerente", "Vendedor", "Repartidor", "Agencia"], keywords: "inicio resumen home panel" },
    { section: "principal", text: "Órdenes", icon: <LocalShippingRoundedIcon />, link: "/orders", roles: ["Admin", "Gerente", "Vendedor", "Repartidor", "Agencia"], keywords: "pedidos ventas kanban" },
    { section: "principal", text: "WhatsApp CRM", icon: <WhatsAppIcon />, link: "/whatsapp", roles: ["Admin", "Gerente", "Vendedor"], keywords: "chat mensajes clientes conversaciones", newTab: true },
    { section: "principal", text: "Chat interno", icon: <ForumRoundedIcon />, link: "/internal-chat", roles: ["Admin", "Gerente", "Master", "Vendedor", "Agencia"], keywords: "mensajes equipo agencias", newTab: true },
    { section: "principal", text: "Mi grupo", icon: <GroupsRoundedIcon />, link: "/mi-grupo", roles: ["Vendedor"], leaderOnly: true, keywords: "lider equipo vendedoras" },

    // Ventas y reparto
    { section: "ventas", text: "Logística propia", icon: <CellTowerRounded />, link: "/logistica", roles: ["Admin", "Master", "Operador logístico"], keywords: "torre de control centro despacho riders motorizados rondas carabobo valencia operador turno" },
    { section: "ventas", text: "Reparto de órdenes", icon: <SyncAltRounded />, link: "/round-robin", roles: ["Admin", "Gerente", "Master"], keywords: "round robin asignar reasignar vendedoras porcentajes roster" },
    { section: "ventas", text: "Grupos de venta", icon: <Diversity3Rounded />, link: "/grupos-de-venta", roles: ["Admin", "Master"], keywords: "lider lideres equipos vendedoras" },
    { section: "ventas", text: "Órdenes canceladas", icon: <DoNotDisturbAltRoundedIcon />, link: "/orders/cancelled", roles: ["Admin", "Gerente"], keywords: "canceladas rechazadas" },
    { section: "ventas", text: "Tiendas", icon: <StorefrontRounded />, link: "/shops", roles: ["Admin", "Gerente"], keywords: "shopify nuviora solo brillo meloon" },

    // Inventario
    { section: "inventario", text: "Inventario", icon: <Inventory2RoundedIcon />, link: "/inventory", roles: ["Admin", "Agencia"], keywords: "stock almacen productos tallas conteo" },
    { section: "inventario", text: "Reabastecimiento", icon: <RouteRounded />, link: "/reabastecimiento", roles: ["Admin"], keywords: "plan compras traslados forecast proveedores rutas cobertura chofer modulo 5" },
    { section: "inventario", text: "Inventario por ciudad", icon: <MapRounded />, link: "/inventario-ciudades", roles: ["Admin", "Gerente", "Vendedor"], keywords: "stock agencias ciudades caracas valencia maracay" },
    { section: "inventario", text: "Stock repartidor", icon: <LocalMallRoundedIcon />, link: "/deliverers/stock", roles: ["Repartidor"], keywords: "inventario" },
    { section: "inventario", text: "Exportar Stock", icon: <WarehouseRounded />, link: "/admin/stock-export", roles: ["Admin", "Gerente"], keywords: "excel descargar inventario" },

    // Dinero
    { section: "dinero", text: "Finanzas", icon: <AccountBalanceWalletRounded />, link: "/finanzas", roles: ["Admin"], keywords: "gastos recurrentes editor shopify chatgpt rentabilidad contabilidad egresos comprobante" },
    { section: "dinero", text: "Comprobantes por revisar", icon: <ImageSearchRounded />, link: "/admin/comprobantes", roles: ["Admin", "Gerente", "Master"], keywords: "comprobante capture pago movil foto ia verificar validar billetes referencia" },
    { section: "dinero", text: "Vueltos por validar", icon: <FactCheckRounded />, link: "/admin/vueltos-por-validar", roles: ["Admin", "Gerente", "Master"], keywords: "vuelto cambio pago mixto aprobar agencia" },
    { section: "dinero", text: "Vueltos Pendientes", icon: <ReceiptLongRounded />, link: "/admin/pending-vueltos", roles: ["Admin", "Gerente"], keywords: "vuelto cambio pagar pago movil" },
    { section: "dinero", text: "Vueltos de mi grupo", icon: <ReceiptLongRounded />, link: "/mi-grupo/vueltos", roles: ["Vendedor"], leaderOnly: true, keywords: "vuelto cambio pagar" },
    { section: "dinero", text: "Cierres de agencias", icon: <RequestQuoteRounded />, link: "/admin/cierres-agencias", roles: ["Admin"], keywords: "cierre semanal agencias carreras excel discrepancias pagar delivery pyp dalgo rapi2" },
    { section: "dinero", text: "Cierres / Servicios", icon: <RequestQuoteRounded />, link: "/cierres", roles: ["Agencia"], keywords: "cierre semanal subir excel carreras pago" },
    { section: "dinero", text: "Ganancias globales", icon: <BarChartRoundedIcon />, link: "/earnings", roles: ["Admin"], keywords: "comisiones pagos liquidacion agencias vendedoras" },
    { section: "dinero", text: "Mis ganancias", icon: <SavingsRoundedIcon />, link: "/me/earnings", roles: ["Vendedor", "Repartidor", "Gerente"], keywords: "comisiones pagos" },

    // Reportes
    { section: "reportes", text: "Métricas", icon: <PollRounded />, link: "/metrics", roles: ["Admin", "Gerente"], keywords: "estadisticas reportes graficos" },
    { section: "reportes", text: "Meta Ads", icon: <InsightsRounded />, link: "/meta-ads", roles: ["Admin"], keywords: "facebook anuncios campañas publicidad cpa ctr cpm creativos" },
    { section: "reportes", text: "Métricas del negocio", icon: <PollRounded />, link: "/business-metrics", roles: ["Admin"], keywords: "ganancias ventas estadisticas" },
    { section: "reportes", text: "Tracking de Órdenes", icon: <HistoryRounded />, link: "/tracking-report", roles: ["Admin", "Gerente"], keywords: "historial seguimiento" },
    { section: "reportes", text: "Reporte Horas Entregas", icon: <AccessTimeRounded />, link: "/admin/delivered-hours-report", roles: ["Admin"], keywords: "tiempos entregas horas agencias" },
    { section: "reportes", text: "Exportar Órdenes", icon: <FileDownloadRounded />, link: "/admin/orders-export", roles: ["Admin", "Gerente"], keywords: "excel descargar" },

    // Configuración
    { section: "config", text: "Usuarios", icon: <PeopleAltRounded />, link: "/users", roles: ["Admin", "Gerente"], keywords: "vendedoras empleados roles contraseña agencias" },
    { section: "config", text: "Repartidores", icon: <EngineeringRoundedIcon />, link: "/deliverers", roles: ["Admin"], keywords: "motorizados delivery" },
    { section: "config", text: "Ciudades y Agencias", icon: <MapRounded />, link: "/cities", roles: ["Admin", "Gerente"], keywords: "agencias reparto porcentajes cupo" },
    { section: "config", text: "Tarifas de delivery", icon: <RouteRounded />, link: "/admin/tarifas-delivery", roles: ["Admin"], keywords: "agencias carreras tarifario kilometros distancia google routes almacenes coordenadas cierre" },
    { section: "config", text: "Tasa y pagos", icon: <AttachMoneyRoundedIcon />, link: "/admin/tasa-y-pagos", roles: ["Admin"], keywords: "tasa dolar bcv binance euro tasas cambio cuentas empresa banco pago movil zelle bancos codigos" },
    // El Gerente no ve la tasa: solo cuentas y bancos
    { section: "config", text: "Cuentas y bancos", icon: <AccountBalanceRounded />, link: "/admin/tasa-y-pagos", roles: ["Gerente"], keywords: "cuentas empresa banco pago movil zelle bancos codigos" },
    { section: "config", text: "Integraciones", icon: <SettingsEthernetRounded />, link: "/admin/integraciones", roles: ["Admin"], keywords: "plantillas whatsapp mensajes meta ads conexiones facebook business manager bm token cuentas publicitarias clasificar campañas objetivos cpa reglas webhooks n8n biblioteca medios imagenes archivos fotos videos" },
    // El Gerente solo tiene la pestaña de la biblioteca, así que la ve con su nombre de siempre
    { section: "config", text: "Biblioteca de Medios", icon: <InsertDriveFileRounded />, link: "/admin/integraciones", roles: ["Gerente"], keywords: "imagenes archivos fotos videos" },
];

/** Minúsculas y sin tildes, para que "metricas" encuentre "Métricas". */
export const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Las opciones que coinciden con lo escrito: primero las que empiezan por eso en el nombre. */
export const searchLinks = (links: NavLink[], query: string): NavLink[] => {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    if (!words.length) return links;
    const sectionTitle = (id: SectionId) => SECTIONS.find((s) => s.id === id)?.title ?? "";
    return links
        .map((l) => {
            const name = normalize(l.text);
            const haystack = `${name} ${normalize(l.keywords ?? "")} ${normalize(sectionTitle(l.section))}`;
            if (!words.every((w) => haystack.includes(w))) return null;
            const score = name.startsWith(words[0]) ? 0 : name.includes(words[0]) ? 1 : 2;
            return { l, score };
        })
        .filter((x): x is { l: NavLink; score: number } => x !== null)
        .sort((a, b) => a.score - b.score)
        .map((x) => x.l);
};
