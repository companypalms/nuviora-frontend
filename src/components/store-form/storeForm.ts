// src/components/store-form/storeForm.ts
// .164: los datos de "Formulario de la tienda" (nuestro formulario de pedido en la landing, con Releasit de respaldo).
// .168: el pago anticipado, la asesora, las encomiendas (MRW y Zoom) y las campañas "Purchase al entregar".

export interface StoreFormSettings {
    enabled: boolean;
    shop_id: number | null;
    product_ids: number[];
    express_usd: number;
    whatsapp_number: string;
    whatsapp_message: string;
    allowed_origins: string[];
    releasit_selector: string;
    pixel_id: string;
    /** La clave de la API de conversiones está puesta (nunca llega a la pantalla). */
    capi_set: boolean;
    capi_test_code: string;
    content_id_format: string;
    content_region: string;
    send_initiate: boolean;
    send_pageview: boolean;
    daily_max: number;
    // .168
    prepaid_enabled: boolean;
    advisor_enabled: boolean;
    courier_enabled: boolean;
    courier_companies: string[];
    courier_origin_city_id: number | null;
    courier_dropoff: Record<string, string>;
    whatsapp_message_prepaid: string;
    whatsapp_message_advisor: string;
    whatsapp_message_courier: string;
    confirm_message: string;
    confirm_message_courier: string;
    ack_message: string;
    /** .174: lo que cobra MRW o Zoom por envío, en promedio (null = falta): un costo de cada encomienda en «Resto de Venezuela» */
    courier_fee_usd: number | null;
}

/** Lo que se guarda: la clave solo si se escribe una nueva. */
export type StoreFormSettingsInput = Omit<StoreFormSettings, "capi_set"> & { capi_token?: string; capi_token_clear?: boolean };

export interface StoreFormOffer {
    id?: number;
    units: number;
    discount_pct: number;
    title: string | null;
    badge: string | null;
    is_default: boolean;
    is_active: boolean;
}

export interface StoreFormDesign {
    texts: Record<string, string>;
    colors: Record<string, string>;
    font: string | null;
    radius: number | null;
    custom_css: string | null;
}

export interface StoreFormProduct {
    id: number;
    name: string;
    shopify_id: string;
    price: number;
    image: string | null;
    page_price: number | null;
    warnings: string[];
    offers: StoreFormOffer[];
    design: StoreFormDesign;
    cities: { id: number; name: string }[];
    /** .171: desde cuándo manda el Purchase según cómo paga el cliente (null = apagado) */
    purchase_by_payment: string | null;
    /** .172: qué sale hoy en el formulario: cada ciudad y la de las encomiendas, con lo que puede entregar (ok = sale) */
    stock: { cities: StockPlace[]; courier: StockPlace | null };
}

export interface StockPlace {
    name: string;
    ok: boolean;
    units: number;
}

/** .168: una oficina de MRW o Zoom donde el cliente retira su encomienda. */
export interface CourierOffice {
    id: number;
    company: string;
    state: string;
    city: string | null;
    name: string;
    address: string | null;
    code: string;
    is_active: boolean;
    source: string;
}

/** .171: un lado del experimento (antes o ahora), con días ya cerrados. */
export interface ExperimentArm {
    spend: number;
    orders: number;
    delivered: number;
    closed: number;
    revenue: number;
    effectiveness: number | null;
    /** cuánto de lo vendido (los entregados) se fue en publicidad, en % */
    ad_share: number | null;
    cost_per_delivered: number | null;
    profit_per_day: number | null;
}

/** .171: lo de ahora, con lo que solo se sabe del formulario */
export interface ExperimentNow extends ExperimentArm {
    meta_sees: number | null;
    prepaid: number;
    courier: number;
    advisor: number;
    /** [Purchase que llegaron a Meta al entregar, entregados que no habían pagado antes] */
    purchase_on_delivery: [number, number];
}

export type StoreFormExperiment = { active: false }
    | { active: true; product: string; from: string; to: string; days: number; after: ExperimentNow; verdict: { key: string; text: string };
        basis: "own" | "launches" | null; before: (ExperimentArm & { from?: string; to?: string; products?: number }) | null };

export interface StoreFormKpi {
    key: string;
    label: string;
    value: number | null;
    base: number | null;
    goal: string;
    state: "ok" | "bad" | "wait" | "info";
    unit: string;
    note: string | null;
}

export interface StoreFormOrder {
    id: number;
    order_id: number;
    name: string | null;
    at: string | null;
    product: string | null;
    units: number;
    total_bs: number | null;
    total_usd: number;
    express: boolean;
    city: string | null;
    status: string | null;
    capi: string | null;
    whatsapp: boolean;
    // .168
    payment: "cod" | "pago_movil" | "asesora";
    purchase_mode: "order" | "delivery";
    placed: string | null;
    purchase_sent_at: string | null;
    courier: string | null;
    confirm: string | null;
    after_hours: boolean;
}

export interface StoreFormData {
    settings: StoreFormSettings;
    shops: { id: number; name: string; shopify_domain: string | null }[];
    products: { id: number; name: string; shopify_id: string; price: number; image: string | null }[];
    selected: StoreFormProduct[];
    orders: StoreFormOrder[];
    kpis: { kpis: StoreFormKpi[]; verdict: { key: string; text: string }; window: { days: number; orders: number } };
    base_url: string;
    texts: Record<string, string>;
    colors: Record<string, string>;
    formats: Record<string, string>;
    rate: number;
    // .168
    cod_cities: { id: number; name: string }[];
    couriers: string[];
    offices: { company: string; total: number; active: number }[];
    messages: Record<string, string>;
    experiment: StoreFormExperiment;
}

/** Los códigos del mensaje de WhatsApp (los mismos de Releasit). */
export const WA_CODES: [string, string][] = [
    ["{first_name}", "nombre"], ["{last_name}", "apellido"], ["{order_id}", "el pedido (WEB-12)"], ["{order_total}", "el total en $"],
    ["{product_title}", "el producto"], ["{product_quantity}", "las unidades"], ["{products_summary_with_quantity}", "producto × unidades"],
    ["{phone}", "su teléfono"], ["{address}", "su dirección"], ["{address2}", "puntos de referencia"], ["{province}", "su estado o ciudad"],
];

/** .168: los códigos de los mensajes que le escribe el sistema al cliente que pagó por adelantado. */
export const SYSTEM_CODES: [string, string][] = [
    ["{first_name}", "nombre"], ["{order_id}", "el pedido (WEB-12)"], ["{courier}", "MRW o Zoom"], ["{horario}", "tu horario de atención"],
    ["{cuando}", "cuándo vuelves a atender (\"Mañana a partir de las 8:00 a. m.\")"],
];

/** Para qué es cada texto del formulario (en el editor de diseño). */
export const TEXT_LABELS: Record<string, string> = {
    title: "Título", step_offer: "Paso: la oferta", step_data: "Paso: tus datos", step_delivery: "Paso: entrega y pago", step_confirm: "Paso: confirmar",
    size_label: "Talla", size_sold_out: "Talla sin stock (al lado de su nombre)", name_label: "Nombre (etiqueta)", name_placeholder: "Nombre (ejemplo)", phone_label: "WhatsApp (etiqueta)", phone_placeholder: "WhatsApp (ejemplo)",
    where_label: "Estado o ciudad (etiqueta)", where_placeholder: "Estado o ciudad (ejemplo)", where_group_cod: "Grupo: delivery a domicilio",
    where_group_courier: "Grupo: resto del país", delivery_wait: "Antes de elegir el estado", cod_notice: "Aviso a domicilio ({ciudad})",
    address_label: "Dirección (etiqueta)", address_placeholder: "Dirección (ejemplo)", reference_placeholder: "Puntos de referencia (ejemplo)",
    pay_label: "Pago: pregunta", pay_cod: "Pago: al recibir", pay_cod_note: "Pago: al recibir (debajo)", pay_now: "Pago: ahora", pay_now_note: "Pago: ahora (debajo)",
    courier_notice: "Aviso de encomienda ({estado}, {ciudades})", courier_company_label: "Encomienda: empresa", courier_free: "Encomienda: precio del envío",
    courier_office_label: "Encomienda: agencia ({empresa})", courier_office_placeholder: "Encomienda: agencia (ejemplo)", courier_office_hint: "Encomienda: ayuda de la agencia",
    courier_office_none: "Encomienda: sin agencias en su estado", courier_office_all: "Encomienda: ver otros estados", courier_office_missing: "Encomienda: no encuentro mi agencia",
    courier_office_text_placeholder: "Encomienda: agencia escrita (ejemplo)", courier_id_label: "Encomienda: cédula", courier_id_placeholder: "Encomienda: cédula (ejemplo)",
    courier_other: "Encomienda: ¿retira otra persona?", courier_name_label: "Encomienda: nombre de quien retira", courier_phone_label: "Encomienda: teléfono de quien retira",
    pay_courier_now: "Encomienda: pagar ahora", pay_courier_now_note: "Encomienda: pagar ahora (debajo)", pay_advisor: "Encomienda: con asesora",
    pay_advisor_note: "Encomienda: con asesora (debajo)", pm_title: "Pago móvil: título", pm_amount: "Pago móvil: monto", pm_copy: "Pago móvil: copiar",
    pm_copied: "Pago móvil: copiado", pm_loading: "Pago móvil: cargando", pm_error: "Pago móvil: error", receipt_label: "Comprobante: nombre",
    receipt_button: "Comprobante: botón", receipt_change: "Comprobante: cambiar foto", receipt_note: "Comprobante: nota", subtotal: "Subtotal", delivery: "Delivery",
    courier_shipping: "Envío por encomienda", shipping_price: "Precio del envío", total: "Total", express_title: "Delivery Express ({precio} = su precio)",
    express_note: "Delivery Express (debajo)", button: "Botón", button_note: "Botón (debajo) al recibir", button_note_prepaid: "Botón (debajo) si pagó",
    button_note_advisor: "Botón (debajo) con asesora", footnote: "Nota al pie", saving: "Lo que ahorra ({ahorro})", thanks_title: "Gracias ({pedido} = WEB-12)",
    thanks_text: "Gracias (texto)", thanks_prepaid_title: "Gracias si pagó ({pedido})", thanks_prepaid_open: "Gracias si pagó (tienda abierta)",
    thanks_prepaid_closed: "Gracias si pagó (tienda cerrada: {horario} y {cuando})", thanks_advisor: "Gracias con asesora", thanks_go_whatsapp: "Gracias: pasa a WhatsApp",
    thanks_button: "Botón de WhatsApp", repeat_text: "Si lo vuelve a enviar ({pedido})", error_required: "Error: falta un dato", error_phone: "Error: el WhatsApp",
    error_where: "Error: el estado o ciudad", error_receipt: "Error: falta el comprobante", error_id: "Error: la cédula", error_office: "Error: la agencia", error_stock: "Error: se agotó en su ciudad ({ciudad})",
};

export const COLOR_LABELS: Record<string, string> = {
    title: "Título", button: "Botón", button_text: "Letra del botón", background: "Fondo", text: "Texto", label: "Etiquetas", border: "Bordes",
    field_icon_bg: "Fondo de los íconos", offer_selected: "Oferta marcada (borde)", offer_selected_bg: "Oferta marcada (fondo)", badge: "Etiqueta de la oferta",
    badge_text: "Letra de la etiqueta", summary_bg: "Fondo del resumen", express_bg: "Fondo del express", express_border: "Borde del express", error: "Errores",
};

/** "Bs 12.345", como en la landing. */
export const bsText = (n: number | null | undefined) => (n === null || n === undefined ? "Bs --" : `Bs ${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`);

/** "$66,33". */
export const usdText = (n: number) => `$${n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** El precio de una oferta, como lo calcula el formulario: unidades × precio × (1 − %). */
export const offerUsd = (price: number, units: number, pct: number) => Math.round(units * price * (1 - Math.min(90, Math.max(0, pct)) / 100) * 100) / 100;

/** El bloque que el dueño pega en su landing (con su Liquid de la tasa). */
export const snippet = (base: string) => [
    '<div id="nuviora-pedido"></div>',
    `<script src="${base}/tienda/cargador.js?p={{ product.id }}"`,
    '  data-tasa="{{ shop.metafields.pricing.binance_rate.value | default: 0 }}"',
    '  data-precio="{{ product.selected_or_first_available_variant.price | divided_by: 100.0 }}" defer></script>',
].join("\n");
