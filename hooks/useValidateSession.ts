import { useEffect, useState } from "react";
import { useUserStore } from "../src/store/user/UserStore";
import { toast } from "react-toastify";

/**
 * ✅ Hook para validar sesión antes de mostrar vistas protegidas
 * Devuelve: { loading, isValid }
 * - loading: true mientras se valida el token
 * - isValid: true si la sesión es válida
 */
export const useValidateSession = () => {
    const user = useUserStore((state: any) => state.user);
    const validateToken = useUserStore((state: any) => state.validateToken);
    const [loadingSession, setLoadingSession] = useState(true);
    const [isValid, setIsValid] = useState(false);

    useEffect(() => {
        const checkSession = async () => {
            try {
                const result = await validateToken();
                if (!result.status) {
                    toast.error("Sesión expirada. Inicia sesión nuevamente.");
                    setTimeout(() => (window.location.href = "/"), 1500);
                    return;
                }
                setIsValid(true);
            } catch (e) {
                console.error("Error validando sesión", e);
                toast.error("Error validando sesión ⚠️");
            } finally {
                setLoadingSession(false);
            }
        };

        checkSession();
    }, []);

    return { loading: loadingSession, isValid, user };
};
