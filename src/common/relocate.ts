/**
 * .149 "Cambiar ciudad o agencia": quién ve la opción. El dueño, el Gerente y la líder de vendedoras; las demás vendedoras,
 * en Sin Stock. El servidor revisa lo demás (OrderRelocation: el estado, los pedidos de su grupo, un pedido sin agencia).
 */
type Who = { role?: { description?: string | null } | null; leader_group?: unknown } | null | undefined;

export const canRelocate = (user: Who, status?: string | null) =>
    ["Admin", "Gerente", "Master"].includes(user?.role?.description ?? "") || !!user?.leader_group
    || (user?.role?.description === "Vendedor" && status === "Sin Stock");
