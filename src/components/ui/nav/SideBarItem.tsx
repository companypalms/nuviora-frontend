// src/components/ui/nav/SideBarItem.tsx
// Una opción del menú lateral. Abierto: icono, nombre y estrella para fijarla arriba. Cerrado: solo el icono,
// con el nombre al pasar el mouse.
import { FC, MouseEvent } from "react";
import { Box, ButtonBase, IconButton, Tooltip, Typography, alpha } from "@mui/material";
import { StarBorderRounded, StarRounded } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "../../../store/user/UserStore";
import { NavLink } from "./menuLinks";

interface Props {
    item: NavLink;
    active: boolean;
    expanded: boolean;
    pinned?: boolean;
    onTogglePin?: (link: string) => void;
    /** Resaltada con las flechas mientras se busca. */
    highlighted?: boolean;
    /** En los resultados de búsqueda, la sección de donde viene. */
    hint?: string;
    onNavigate?: () => void;
}

export const SideBarItem: FC<Props> = ({ item, active, expanded, pinned, onTogglePin, highlighted, hint, onNavigate }) => {
    const navigate = useNavigate();
    const color = useUserStore((s) => s.user.color) || "#1976d2";

    const go = (e: MouseEvent) => {
        // Ctrl/Cmd + clic o el botón del medio: que el navegador lo abra en otra pestaña
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
        e.preventDefault();
        onNavigate?.();
        if (item.newTab) window.open(item.link, "_blank");
        else navigate(item.link);
    };

    const button = (
        <ButtonBase
            component="a"
            href={item.link}
            target={item.newTab ? "_blank" : undefined}
            onClick={go}
            aria-current={active ? "page" : undefined}
            aria-label={expanded ? undefined : item.text}
            sx={{
                flex: expanded ? 1 : "none",
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: expanded ? "flex-start" : "center",
                gap: 1.25,
                height: expanded ? 36 : 40,
                width: expanded ? "auto" : 40,
                px: expanded ? 1.25 : 0,
                borderRadius: 2,
                color: "text.primary",
                textDecoration: "none",
                bgcolor: active || highlighted ? alpha(color, active ? 0.18 : 0.1) : "transparent",
                boxShadow: active && expanded ? `inset 3px 0 0 ${color}` : "none",
                transition: "background-color 0.15s",
                "&:hover": { bgcolor: alpha(color, 0.12) },
                "&.Mui-focusVisible": { outline: `2px solid ${color}`, outlineOffset: -2 },
                "& .MuiSvgIcon-root": { fontSize: 20, color: active ? color : "text.secondary", flexShrink: 0 },
            }}
        >
            {item.icon}
            {expanded && (
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" fontWeight={active ? 700 : 500} noWrap sx={{ lineHeight: 1.2 }}>
                        {item.text}
                    </Typography>
                    {hint && (
                        <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ lineHeight: 1.1 }}>
                            {hint}
                        </Typography>
                    )}
                </Box>
            )}
        </ButtonBase>
    );

    if (!expanded) {
        return (
            <Tooltip title={item.text} placement="right" arrow>
                {button}
            </Tooltip>
        );
    }

    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                // La estrella aparece al pasar el mouse; si ya está fijada, siempre
                "& .pin": { opacity: pinned ? 1 : 0 },
                "&:hover .pin, & .pin:focus-visible": { opacity: 1 },
                // En pantallas táctiles no hay "pasar el mouse": la estrella se ve siempre, más suave
                "@media (hover: none)": { "& .pin": { opacity: pinned ? 1 : 0.5 } },
            }}
        >
            {button}
            {onTogglePin && (
                <Tooltip title={pinned ? "Quitar de favoritos" : "Fijar en favoritos"} placement="right">
                    <IconButton
                        className="pin"
                        size="small"
                        aria-label={pinned ? `Quitar ${item.text} de favoritos` : `Fijar ${item.text} en favoritos`}
                        aria-pressed={!!pinned}
                        onClick={() => onTogglePin(item.link)}
                        sx={{ ml: 0.25, color: pinned ? "warning.main" : "text.disabled", transition: "opacity 0.15s" }}
                    >
                        {pinned ? <StarRounded fontSize="small" /> : <StarBorderRounded fontSize="small" />}
                    </IconButton>
                </Tooltip>
            )}
        </Box>
    );
};
