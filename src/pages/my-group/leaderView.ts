// Qué órdenes ve la Líder en sus listas: las suyas, las de todo su grupo o las de una vendedora (spec §4.1).
// El servidor decide el grupo con ?scope=group y rechaza lo que no sea de su grupo.

export interface LeaderView {
    scope: "" | "group";
    sellerId: string;
}

export const MY_ORDERS: LeaderView = { scope: "", sellerId: "" };

/** Agrega ?scope= y ?seller_id= a una consulta de órdenes. */
export function appendLeaderView(params: URLSearchParams, view: LeaderView): void {
    if (view.scope) params.append("scope", view.scope);
    if (view.scope && view.sellerId) params.append("seller_id", view.sellerId);
}
