// src/components/store-form/storeForm.ts
// .164: los datos de "Formulario de la tienda" (nuestro formulario de pedido en la landing, con Releasit de respaldo).

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
}

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
}

/** Los códigos del mensaje de WhatsApp (los mismos de Releasit). */
export const WA_CODES: [string, string][] = [
    ["{first_name}", "nombre"], ["{last_name}", "apellido"], ["{order_id}", "el pedido (WEB-12)"], ["{order_total}", "el total en $"],
    ["{product_title}", "el producto"], ["{product_quantity}", "las unidades"], ["{products_summary_with_quantity}", "producto × unidades"],
    ["{phone}", "su teléfono"], ["{address}", "su dirección"], ["{address2}", "puntos de referencia"], ["{province}", "su estado o ciudad"],
];

/** Para qué es cada texto del formulario (en el editor de diseño). */
export const TEXT_LABELS: Record<string, string> = {
    title: "Título", shipping_label: "Método de envío", shipping_option: "La opción de envío", shipping_price: "Precio del envío", size_label: "Talla",
    name_label: "Nombre (etiqueta)", name_placeholder: "Nombre (ejemplo)", phone_label: "WhatsApp (etiqueta)", phone_placeholder: "WhatsApp (ejemplo)",
    city_label: "Ciudad (etiqueta)", city_placeholder: "Ciudad (ejemplo)", address_label: "Dirección (etiqueta)", address_placeholder: "Dirección (ejemplo)",
    reference_placeholder: "Puntos de referencia (ejemplo)", subtotal: "Subtotal", delivery: "Delivery", total: "Total",
    express_title: "Delivery Express ({precio} = su precio)", express_note: "Delivery Express (debajo)", button: "Botón", button_note: "Botón (debajo)",
    footnote: "Nota al pie", saving: "Lo que ahorra ({ahorro})", thanks_title: "Gracias ({pedido} = WEB-12)", thanks_text: "Gracias (texto)",
    thanks_button: "Botón de WhatsApp", repeat_text: "Si lo vuelve a enviar ({pedido})", error_required: "Error: falta un dato", error_phone: "Error: el WhatsApp",
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
