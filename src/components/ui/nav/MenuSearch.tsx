// src/components/ui/nav/MenuSearch.tsx
// El buscador del menú: escribe y salen las opciones que coinciden (también por palabras como "vuelto",
// "stock" o "excel"). Flechas para moverse, Enter para abrir, Esc para borrar.
import { FC, KeyboardEvent, RefObject } from "react";
import { Box, IconButton, InputBase, Typography, alpha } from "@mui/material";
import { CloseRounded, SearchRounded } from "@mui/icons-material";
import { useLocation } from "react-router-dom";
import { useUserStore } from "../../../store/user/UserStore";
import { NavLink, SECTIONS } from "./menuLinks";
import { SHORTCUT_LABEL } from "./useMenuSearch";
import { SideBarItem } from "./SideBarItem";

interface InputProps {
    value: string;
    onChange: (v: string) => void;
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
    inputRef?: RefObject<HTMLInputElement | null>;
    autoFocus?: boolean;
}

export const MenuSearchInput: FC<InputProps> = ({ value, onChange, onKeyDown, inputRef, autoFocus }) => {
    const color = useUserStore((s) => s.user.color) || "#1976d2";
    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                px: 1.25,
                height: 38,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                "&:focus-within": { borderColor: color, boxShadow: `0 0 0 3px ${alpha(color, 0.15)}` },
            }}
        >
            <SearchRounded fontSize="small" sx={{ color: "text.secondary" }} />
            <InputBase
                inputRef={inputRef}
                autoFocus={autoFocus}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Buscar en el menú…"
                inputProps={{ "aria-label": "Buscar en el menú", role: "searchbox" }}
                sx={{ flex: 1, fontSize: "0.875rem" }}
            />
            {value ? (
                <IconButton size="small" aria-label="Borrar búsqueda" onClick={() => onChange("")} sx={{ p: 0.25 }}>
                    <CloseRounded fontSize="small" />
                </IconButton>
            ) : (
                <Typography
                    component="kbd"
                    variant="caption"
                    color="text.secondary"
                    sx={{ px: 0.5, border: "1px solid", borderColor: "divider", borderRadius: 1, fontFamily: "inherit", whiteSpace: "nowrap", "@media (hover: none)": { display: "none" } }}
                >
                    {SHORTCUT_LABEL}
                </Typography>
            )}
        </Box>
    );
};

interface ResultsProps {
    query: string;
    results: NavLink[];
    active: number;
    onNavigate: () => void;
}

const sectionTitle = (id: string) => SECTIONS.find((s) => s.id === id)?.title;

export const MenuSearchResults: FC<ResultsProps> = ({ query, results, active, onNavigate }) => {
    const { pathname } = useLocation();
    if (!results.length) {
        return (
            <Box role="status" sx={{ px: 1.5, py: 3, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                    No hay nada con «{query.trim()}».
                </Typography>
                <Typography variant="caption" color="text.secondary">Prueba con otra palabra.</Typography>
            </Box>
        );
    }
    return (
        <Box role="list" aria-label="Resultados del menú" sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
            <Typography variant="caption" color="text.secondary" sx={{ px: 1.25, pb: 0.5 }} aria-live="polite">
                {results.length === 1 ? "1 opción · Enter para abrir" : `${results.length} opciones · ↑↓ para elegir, Enter para abrir`}
            </Typography>
            {results.map((item, i) => (
                <Box role="listitem" key={item.link}>
                    <SideBarItem
                        item={item}
                        expanded
                        active={pathname === item.link}
                        highlighted={i === active}
                        hint={sectionTitle(item.section)}
                        onNavigate={onNavigate}
                    />
                </Box>
            ))}
        </Box>
    );
};
