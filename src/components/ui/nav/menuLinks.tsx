// src/components/ui/nav/menuLinks.tsx
// Las opciones del menú lateral, en secciones y con palabras para el buscador (Fran, 2026-10-03: con más de 30
// opciones en una sola lista no encontraba nada).
import { ReactNode } from "react";
import AttachMoneyRoundedIcon from "@mui/icons-material/AttachMoneyRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import LocalMallRoundedIcon from "@mui/icons-material/LocalMallRounded";
import SavingsRoundedIcon from "@mui/icons-material/SavingsRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import {
    AccessTimeRounded, AccountBalanceRounded, FactCheckRounded, FileDownloadRounded, HistoryRounded,
    InsertDriveFileRounded, MapRounded, PeopleAltRounded, PollRounded, ReceiptLongRounded,
    SettingsEthernetRounded, SettingsRounded, ShoppingBagRounded, StorefrontRounded, SyncAltRounded, WarehouseRounded,
    AssessmentRounded, PaymentsRounded, InsightsRounded, RequestQuoteRounded,
    AccountBalanceWalletRounded, CellTowerRounded, CompareArrowsRounded, CalendarMonthRounded, TodayRounded, MovieEdit,
    VideoLibraryRounded,
} from "@mui/icons-material";

export type SectionId = "principal" | "ventas" | "inventario" | "dinero" | "reportes" | "config";

export type NavLink = {
    text: string;
    icon: ReactNode;
    link: string;
    section: SectionId;
    roles?: string[]; // descriptions: 'Admin' | 'Gerente' | 'Vendedor' | 'Repartidor' | 'Agencia' | 'Master' | 'Editor líder' | 'Editor de video'…
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
    // Etapa 5, paso 5a: los editores de video solo ven sus encargos (y el líder, los del equipo)
    { section: "principal", text: "Mis encargos", icon: <MovieEdit />, link: "/editor", roles: ["Editor líder", "Editor de video"], keywords: "videos batches creativos entregar drive cola pendientes" },
    { section: "principal", text: "Encargos del equipo", icon: <VideoLibraryRounded />, link: "/editor/equipo", roles: ["Editor líder"], keywords: "asignar revisar aprobar devolver editores videos banca" },
    { section: "principal", text: "Dashboard", icon: <DashboardRoundedIcon />, link: "/dashboard", roles: ["Admin", "Gerente", "Vendedor", "Repartidor", "Agencia"], keywords: "inicio resumen home panel" },
    // Etapa 4: lo que estaba en el Dashboard del Admin antes de que quedara con sus metas, lo de hoy y su asistente
    { section: "principal", text: "Resumen del día", icon: <TodayRounded />, link: "/resumen-del-dia", roles: ["Admin"], keywords: "numeros de hoy pendientes vueltos deficit stock bajo sin agencia asignar agencias ciudades sin registrar validaciones conciliacion equipo pagos por metodo kpi" },
    // Etapa 2: los números del negocio con las reglas de guias/DICCIONARIO-METRICAS.md
    { section: "principal", text: "Panel del dueño", icon: <InsightsRounded />, link: "/panel-dueno", roles: ["Admin"], keywords: "metricas kpi indicadores ventas efectividad entregados ticket tablero numeros graficos" },
    // Etapa 3: pagos, tareas, revisiones y notas de cada día
    { section: "principal", text: "Calendario", icon: <CalendarMonthRounded />, link: "/calendario", roles: ["Admin"], keywords: "agenda recordatorios tareas pagos pendientes notas fechas vencimientos anotar" },
    { section: "principal", text: "Órdenes", icon: <LocalShippingRoundedIcon />, link: "/orders", roles: ["Admin", "Gerente", "Vendedor", "Repartidor", "Agencia"], keywords: "pedidos ventas kanban" },
    { section: "principal", text: "WhatsApp CRM", icon: <WhatsAppIcon />, link: "/whatsapp", roles: ["Admin", "Gerente", "Vendedor"], keywords: "chat mensajes clientes conversaciones", newTab: true },
    { section: "principal", text: "Chat interno", icon: <ForumRoundedIcon />, link: "/internal-chat", roles: ["Admin", "Gerente", "Master", "Vendedor", "Agencia"], keywords: "mensajes equipo agencias", newTab: true },
    // Comprobantes, vueltos por validar y vueltos por pagar; el Master no ve "Vueltos por pagar"
    { section: "principal", text: "Por aprobar", icon: <FactCheckRounded />, link: "/por-aprobar", roles: ["Admin", "Gerente", "Master"], keywords: "comprobantes por revisar capture pago movil foto ia verificar validar billetes referencia vueltos por validar cambio pago mixto aprobar agencia vueltos pendientes pagar" },
    { section: "principal", text: "Mi grupo", icon: <GroupsRoundedIcon />, link: "/mi-grupo", roles: ["Vendedor"], leaderOnly: true, keywords: "lider equipo vendedoras" },

    // Ventas y reparto
    { section: "ventas", text: "Logística propia", icon: <CellTowerRounded />, link: "/logistica", roles: ["Admin", "Master", "Operador logístico"], keywords: "torre de control centro despacho riders motorizados rondas carabobo valencia operador turno" },
    // El Gerente ve solo la pestaña "Hoy"; "Grupos y %" es de Admin y Master
    { section: "ventas", text: "Reparto", icon: <SyncAltRounded />, link: "/round-robin", roles: ["Admin", "Gerente", "Master"], keywords: "reparto de ordenes round robin asignar reasignar vendedoras porcentajes roster grupos de venta lider lideres equipos" },

    // Inventario
    // Para el Admin, "Por ciudad", "Reabastecimiento" y "Exportar" son pestañas de Inventario
    { section: "inventario", text: "Inventario", icon: <Inventory2RoundedIcon />, link: "/inventory", roles: ["Admin", "Agencia"], keywords: "stock almacen productos tallas conteo reabastecimiento plan compras traslados forecast proveedores rutas cobertura chofer modulo 5 por ciudad agencias ciudades caracas valencia maracay exportar excel descargar lead time" },
    { section: "inventario", text: "Inventario por ciudad", icon: <MapRounded />, link: "/inventario-ciudades", roles: ["Gerente", "Vendedor"], keywords: "stock agencias ciudades caracas valencia maracay" },
    { section: "inventario", text: "Stock repartidor", icon: <LocalMallRoundedIcon />, link: "/deliverers/stock", roles: ["Repartidor"], keywords: "inventario" },
    { section: "inventario", text: "Exportar Stock", icon: <WarehouseRounded />, link: "/admin/stock-export", roles: ["Gerente"], keywords: "excel descargar inventario" },

    // Dinero
    { section: "dinero", text: "Finanzas", icon: <AccountBalanceWalletRounded />, link: "/finanzas", roles: ["Admin"], keywords: "gastos recurrentes editor shopify chatgpt rentabilidad contabilidad egresos comprobante" },
    // Antes solo se llegaba desde el widget del dashboard
    { section: "dinero", text: "Conciliación", icon: <CompareArrowsRounded />, link: "/conciliacion", roles: ["Admin"], keywords: "conciliaciones pagos digitales extracto banco estado de cuenta pago movil zelle binance cuadre diario incidencias" },
    { section: "dinero", text: "Vueltos de mi grupo", icon: <ReceiptLongRounded />, link: "/mi-grupo/vueltos", roles: ["Vendedor"], leaderOnly: true, keywords: "vuelto cambio pagar" },
    { section: "dinero", text: "Cierres de agencias", icon: <RequestQuoteRounded />, link: "/admin/cierres-agencias", roles: ["Admin"], keywords: "cierre semanal agencias carreras excel discrepancias pagar delivery pyp dalgo rapi2" },
    { section: "dinero", text: "Cierres / Servicios", icon: <RequestQuoteRounded />, link: "/cierres", roles: ["Agencia"], keywords: "cierre semanal subir excel carreras pago" },
    { section: "dinero", text: "Ganancias globales", icon: <BarChartRoundedIcon />, link: "/earnings", roles: ["Admin"], keywords: "comisiones pagos liquidacion agencias vendedoras" },
    { section: "dinero", text: "Mis ganancias", icon: <SavingsRoundedIcon />, link: "/me/earnings", roles: ["Vendedor", "Repartidor", "Gerente"], keywords: "comisiones pagos" },

    // Reportes
    { section: "reportes", text: "Métricas", icon: <PollRounded />, link: "/metrics", roles: ["Admin", "Gerente"], keywords: "estadisticas reportes graficos" },
    { section: "reportes", text: "Meta Ads", icon: <InsightsRounded />, link: "/meta-ads", roles: ["Admin"], keywords: "facebook anuncios campañas publicidad cpa ctr cpm creativos" },
    { section: "reportes", text: "Análisis de campañas", icon: <InsightsRounded />, link: "/meta-ads/analisis", roles: ["Admin"], keywords: "meta ads analisis del dia urgente escalar bajar pausar editores ia" },
    { section: "reportes", text: "Cola y banca de creativos", icon: <InsightsRounded />, link: "/meta-ads/cola", roles: ["Admin"], keywords: "meta ads cola produccion banca batches encargos editores creativos numeros" },
    { section: "reportes", text: "Métricas del negocio", icon: <PollRounded />, link: "/business-metrics", roles: ["Admin"], keywords: "ganancias ventas estadisticas" },
    { section: "reportes", text: "Tracking de Órdenes", icon: <HistoryRounded />, link: "/tracking-report", roles: ["Admin", "Gerente"], keywords: "historial seguimiento" },
    { section: "reportes", text: "Reporte Horas Entregas", icon: <AccessTimeRounded />, link: "/admin/delivered-hours-report", roles: ["Admin"], keywords: "tiempos entregas horas agencias" },
    { section: "reportes", text: "Exportar Órdenes", icon: <FileDownloadRounded />, link: "/admin/orders-export", roles: ["Admin", "Gerente"], keywords: "excel descargar" },

    // Configuración
    // La pestaña Repartidores es solo del Admin; el Gerente ve la lista de usuarios como siempre
    { section: "config", text: "Usuarios", icon: <PeopleAltRounded />, link: "/users", roles: ["Admin", "Gerente"], keywords: "vendedoras empleados roles contraseña agencias repartidores motorizados delivery" },
    // El Gerente ve las pestañas Tiendas y Ciudades; Tarifas es solo del Admin
    { section: "config", text: "Tiendas, ciudades y agencias", icon: <StorefrontRounded />, link: "/admin/tiendas-y-ciudades", roles: ["Admin", "Gerente"], keywords: "tiendas shopify nuviora solo brillo meloon vendedoras ciudades agencias reparto porcentajes cupo tarifas delivery carreras tarifario kilometros distancia google routes almacenes coordenadas cierre" },
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
