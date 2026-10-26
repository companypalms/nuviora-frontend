import { useEffect, useMemo, useState } from "react";
import { useUserStore } from "../store/user/UserStore";
import { toast } from "react-toastify";

/**
 * Valida sesión y (opcionalmente) roles permitidos.
 * - allowedRoles: lista de descripciones de rol válidas (e.g. ["Admin","Gerente"])
 * Devuelve: loading, isValid, user, hasRole
 */
export const useValidateSession = (allowedRoles?: string[]) => {
    const user = useUserStore((s) => s.user);
    const validateToken = useUserStore((s) => s.validateToken);

    const [loadingSession, setLoadingSession] = useState(true);
    const [isValid, setIsValid] = useState(false);

    const roleDescription = user?.role?.description ?? null;

    const hasRole = useMemo(() => {
        if (!allowedRoles || allowedRoles.length === 0) return true; // no se exige rol
        return allowedRoles.includes(roleDescription as string);
    }, [allowedRoles, roleDescription]);

    useEffect(() => {
        const check = async () => {
            try {
                const result = await validateToken();
                if (!result.status) {
                    toast.error("Sesión expirada. Inicia sesión nuevamente.");
                    setTimeout(() => (window.location.href = "/"), 1300);
                    return;
                }
                setIsValid(true);
            } catch (e) {
                toast.error("Error validando sesión ⚠️");
            } finally {
                setLoadingSession(false);
            }
        };
        check();
    }, []);

    return { loadingSession, isValid, user, hasRole, roleDescription };
};
