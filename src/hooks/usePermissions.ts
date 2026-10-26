import { useUserStore } from "../store/user/UserStore";

export const ROLES = {
    ADMIN: "Admin",
    GERENTE: "Gerente",
    MASTER: "Master",
    VENDEDOR: "Vendedor",
    AGENCIA: "Agencia",
    REPARTIDOR: "Repartidor",
};

export const usePermissions = () => {
    const userRole = useUserStore((state) => state.user?.role?.description || "");

    const isAdmin = userRole === ROLES.ADMIN;
    const isGerente = userRole === ROLES.GERENTE;
    const isMaster = userRole === ROLES.MASTER;
    const isAgent = userRole === ROLES.VENDEDOR;
    const isAgency = userRole === ROLES.AGENCIA;
    const isDeliverer = userRole === ROLES.REPARTIDOR;

    const isSupervisor = [ROLES.ADMIN, ROLES.GERENTE, ROLES.MASTER].includes(userRole);
    const hasAuditAccess = [ROLES.ADMIN, ROLES.GERENTE, ROLES.MASTER].includes(userRole);
    const canCreateOrders = userRole !== ROLES.AGENCIA && userRole !== ROLES.REPARTIDOR;

    return {
        userRole,
        isAdmin,
        isGerente,
        isMaster,
        isAgent,
        isAgency,
        isDeliverer,
        isSupervisor,
        hasAuditAccess,
        canCreateOrders,
    };
};
