/**
 * .112: el envío por agencia de encomiendas (MRW, Tealca, Zoom…) bien claro para la agencia. Con el check, el link de la
 * orden es el de la oficina a donde el motorizado lleva el paquete, y los datos de la guía son los de quien lo recibe
 * (los llena la vendedora). La casa del cliente no es a donde va el motorizado.
 * .168: también la empresa (MRW o Zoom) y la oficina donde retira el cliente (las elige en el formulario de la tienda).
 * .173: el número de guía de MRW o Zoom (lo escribe la vendedora cuando el motorizado deja el paquete en la oficina).
 */

/** Lo que se usa de una orden (GET /orders/{id}). */
export interface CourierInfo {
    id?: number;
    courier_shipment?: boolean | null;
    courier_recipient_name?: string | null;
    courier_recipient_id_number?: string | null;
    courier_recipient_phone?: string | null;
    courier_company?: string | null;
    courier_office?: string | null;
    courier_guide?: string | null;
    courier_guide_at?: string | null;
    location?: string | null;
}

/** Quienes escriben los datos de la encomienda y su número de guía (la agencia solo los ve). */
export const COURIER_EDITORS = ["Vendedor", "Gerente", "Admin"];

/** .168: las empresas de encomiendas del formulario. */
export const COURIER_COMPANIES = ["MRW", "Zoom"];

export const COURIER_TITLE = "ENVÍO POR ENCOMIENDA (MRW, Tealca, Zoom…)";

/** Los datos para la guía, en orden; null si falta. */
export const courierGuide = (order: CourierInfo): [string, string | null][] => [
    ["Nombre", order.courier_recipient_name?.trim() || null],
    ["Cédula", order.courier_recipient_id_number?.trim() || null],
    ["Teléfono", order.courier_recipient_phone?.trim() || null],
    // .168: solo si están (las encomiendas de antes no las tienen)
    ...(order.courier_company ? [["Empresa", order.courier_company] as [string, string]] : []),
    ...(order.courier_office ? [["Oficina donde retira", order.courier_office] as [string, string]] : []),
];

/** Lo que copia "Copiar datos para la guía": una línea por dato. */
export const courierGuideText = (order: CourierInfo): string =>
    courierGuide(order).map(([label, value]) => `${label}: ${value ?? "Falta"}`).join("\n")
    + (order.courier_guide ? `\nNúmero de guía: ${order.courier_guide}` : "");

/** Lo que va arriba en "Copiar resumen" de una encomienda, en lugar de la casa del cliente, el cliente y "Link Maps". */
export const courierSummaryBlock = (order: CourierInfo): string =>
    `\n📦 *${COURIER_TITLE}*`
    + `\n📍 *Llevar a la oficina:* ${order.location || "Falta el link de la oficina"}`
    + `\n🧾 *Datos para la guía (quien recibe):*\n`
    + courierGuide(order).map(([label, value]) => `   • ${label}: ${value ?? "Falta"}`).join("\n")
    + (order.courier_guide ? `\n🔢 *Número de guía:* ${order.courier_guide}` : "");
