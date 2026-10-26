// src/components/ui/notifications/AppToasts.tsx
// Los avisos (toasts) de las pantallas con menú. Los de WhatsApp y los de las órdenes no se cierran solos y se
// acumulan, así que con dos o más abiertos aparece arriba "Cerrar todas". Solo los quita de la pantalla: la campana
// los sigue guardando.
import React, { useEffect, useState } from "react";
import { Button, Fade, GlobalStyles } from "@mui/material";
import { ClearAllRounded } from "@mui/icons-material";
import { Bounce, Id, ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useUserStore } from "../../../store/user/UserStore";

/** Desde cuántos avisos abiertos aparece el botón. */
const MIN_TOASTS = 2;
/** Lo que bajan los avisos para dejarle lugar al botón. */
const BUTTON_SPACE = 44;
const WITH_BUTTON = "app-toasts--with-clear";

/** Cuántos avisos hay abiertos (cada id una vez, aunque una pantalla tenga otro contenedor). */
const useOpenToastCount = () => {
    const [ids, setIds] = useState<Set<Id>>(() => new Set());
    useEffect(() => toast.onChange((t) => {
        setIds((prev) => {
            const removed = t.status === "removed";
            if (removed !== prev.has(t.id)) return prev;
            const next = new Set(prev);
            if (removed) next.delete(t.id);
            else next.add(t.id);
            return next;
        });
    }), []);
    return ids.size;
};

export const AppToasts: React.FC = () => {
    const count = useOpenToastCount();
    const theme = useUserStore((s) => s.user.theme);
    const showButton = count >= MIN_TOASTS;

    return (
        <>
            <GlobalStyles styles={{
                ".Toastify__toast-container": { transition: "top 0.2s" },
                [`.Toastify__toast-container.${WITH_BUTTON}`]: { top: `calc(var(--toastify-toast-top) + ${BUTTON_SPACE}px)` },
                "@media only screen and (max-width: 480px)": {
                    [`.Toastify__toast-container.${WITH_BUTTON}`]: { top: `calc(env(safe-area-inset-top) + ${BUTTON_SPACE}px)` },
                },
            }} />
            <Fade in={showButton} unmountOnExit>
                <Button
                    size="small"
                    startIcon={<ClearAllRounded />}
                    onClick={() => toast.dismiss()}
                    aria-label={`Cerrar las ${count} notificaciones`}
                    sx={{
                        position: "fixed",
                        // Encima de los avisos (9999): el montón tiene un área invisible arriba que se comería el clic
                        zIndex: 10000,
                        top: "var(--toastify-toast-top)",
                        right: "var(--toastify-toast-right)",
                        px: 1.5,
                        bgcolor: "background.paper",
                        color: "text.primary",
                        border: 1,
                        borderColor: "divider",
                        boxShadow: 3,
                        "&:hover": { bgcolor: "background.paper", borderColor: "text.secondary" },
                        "@media only screen and (max-width: 480px)": { top: "calc(env(safe-area-inset-top) + 6px)", right: 8 },
                    }}
                >
                    Cerrar todas ({count})
                </Button>
            </Fade>
            <ToastContainer
                className={showButton ? WITH_BUTTON : undefined}
                stacked
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme={theme}
                transition={Bounce}
            />
        </>
    );
};
