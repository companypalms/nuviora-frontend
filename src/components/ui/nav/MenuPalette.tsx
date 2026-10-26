// src/components/ui/nav/MenuPalette.tsx
// Ventana para buscar en el menú cuando está cerrado o en el teléfono (también con Ctrl K). Sin escribir nada,
// muestra todas las opciones por sección.
import { FC } from "react";
import { Box, Dialog, DialogContent, Divider, Typography } from "@mui/material";
import { useLocation } from "react-router-dom";
import { NavLink, SECTIONS } from "./menuLinks";
import { MenuSearchInput, MenuSearchResults } from "./MenuSearch";
import { useMenuSearch } from "./useMenuSearch";
import { SideBarItem } from "./SideBarItem";

interface Props {
    open: boolean;
    onClose: () => void;
    links: NavLink[];
    pinned: string[];
    onTogglePin: (link: string) => void;
}

export const MenuPalette: FC<Props> = ({ open, onClose, links, pinned, onTogglePin }) => {
    const search = useMenuSearch(links, onClose);
    const { pathname } = useLocation();
    const favorites = pinned.map((l) => links.find((x) => x.link === l)).filter((x): x is NavLink => !!x);

    const close = () => {
        search.setQuery("");
        onClose();
    };

    const group = (title: string, items: NavLink[]) =>
        items.length > 0 && (
            <Box key={title} sx={{ mb: 1 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", px: 1.25, py: 0.5, textTransform: "uppercase", letterSpacing: 0.6 }}>
                    {title}
                </Typography>
                {items.map((item) => (
                    <SideBarItem
                        key={item.link}
                        item={item}
                        expanded
                        active={pathname === item.link}
                        pinned={pinned.includes(item.link)}
                        onTogglePin={onTogglePin}
                        onNavigate={close}
                    />
                ))}
            </Box>
        );

    return (
        <Dialog
            open={open}
            onClose={close}
            fullWidth
            maxWidth="xs"
            aria-label="Buscar en el menú"
            sx={{ "& .MuiDialog-container": { alignItems: "flex-start" }, "& .MuiDialog-paper": { mt: { xs: 2, sm: "10vh" }, mx: 2, width: "calc(100% - 32px)", borderRadius: 3 } }}
        >
            <Box sx={{ p: 1.5, pb: 1 }}>
                <MenuSearchInput value={search.query} onChange={search.setQuery} onKeyDown={search.onKeyDown} autoFocus />
            </Box>
            <Divider />
            <DialogContent sx={{ p: 1, maxHeight: "65vh" }}>
                {search.query.trim() ? (
                    <MenuSearchResults query={search.query} results={search.results} active={search.active} onNavigate={search.onDone} />
                ) : (
                    <>
                        {group("Favoritos", favorites)}
                        {SECTIONS.map((s) => group(s.title, links.filter((l) => l.section === s.id && !favorites.includes(l))))}
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};
