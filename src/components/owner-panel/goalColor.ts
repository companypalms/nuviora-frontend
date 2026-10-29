// src/components/owner-panel/goalColor.ts
// El color de una meta en el panel del dueño (Metas y alertas): el mismo en las tarjetas, el ranking y las alertas.
import { useTheme } from "@mui/material";
import { AlertLevel, GoalStatus } from "./ownerPanel";

/** Verde si se cumple o va bien, amarillo si va atrasada, rojo si no llegó, gris si todavía no se sabe o todavía puede llegar. */
export const useGoalColor = () => {
    const t = useTheme();
    return (s: GoalStatus | "ok" | AlertLevel) =>
        s === "met" || s === "on_track" || s === "ok" ? t.palette.success.main
            : s === "behind" || s === "yellow" ? t.palette.warning.main
                : s === "below" || s === "red" ? t.palette.error.main : t.palette.text.secondary;
};
