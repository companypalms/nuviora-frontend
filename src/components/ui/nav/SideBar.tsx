import { useState, useEffect, useMemo, useRef } from "react";
import { Box, Divider, IconButton, Tooltip, Typography, darken, useMediaQuery, useTheme } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import KeyboardArrowRightRounded from "@mui/icons-material/KeyboardArrowRightRounded";
import KeyboardArrowLeftRounded from "@mui/icons-material/KeyboardArrowLeftRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import { SearchRounded } from "@mui/icons-material";

import moment from "moment";
import { useUserStore } from "../../../store/user/UserStore";
import { NotificationBell } from "../notifications/NotificationBell";
import { WhatsAppBell } from "../notifications/WhatsAppBell";
import { InternalChatBell } from "../notifications/InternalChatBell";
import { MENU_LINKS, NavLink, SECTIONS } from "./menuLinks";
import { useMenuPrefs } from "./useMenuPrefs";
import { SideBarItem } from "./SideBarItem";
import { MenuSection } from "./MenuSection";
import { MenuSearchInput, MenuSearchResults } from "./MenuSearch";
import { SHORTCUT_LABEL, useMenuSearch } from "./useMenuSearch";
import { MenuPalette } from "./MenuPalette";

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** Hora y fecha en una línea (antes ocupaban medio menú). */
const Clock = () => {
    const [now, setNow] = useState(moment());

    useEffect(() => {
        const id = setInterval(() => setNow(moment()), 15000);
        return () => clearInterval(id);
    }, []);

    return (
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, px: 1.25, width: "100%" }}>
            <Typography variant="subtitle1" fontWeight={800} sx={{ whiteSpace: "nowrap", lineHeight: 1.2 }}>
                {now.format("h:mm A")}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
                {`${DAYS[now.day()]} ${now.date()} de ${MONTHS[now.month()]}`}
            </Typography>
        </Box>
    );
};

/** Con más opciones que esto, las secciones se pliegan para que el menú no abrume. */
const COLLAPSE_FROM = 12;

/**
 * Este componente se encarga del menu lateral izquierdo.
 * Fran (2026-10-03): con más de 30 opciones en una sola lista se sentía abrumado. Ahora: buscador arriba
 * (Ctrl K), favoritos que cada quien fija con la estrella, y las demás opciones en secciones plegables.
 * Cerrado (y en el teléfono) muestra solo la lupa, los favoritos y lo principal.
 */
export const SideBar = () => {
    const theme = useTheme();
    const matches = useMediaQuery(theme.breakpoints.up("md"));
    const [open, setOpen] = useState<boolean>(matches);
    const [paletteOpen, setPaletteOpen] = useState(false);
    const user = useUserStore((state) => state.user);
    const userLogout = useUserStore((state) => state.logout);
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const searchRef = useRef<HTMLInputElement>(null);

    const roleDesc = user.role?.description ?? "Vendedor";
    const expanded = matches && open;

    const allowedLinks = useMemo(
        () => MENU_LINKS.filter((l) => (!l.roles || l.roles.includes(roleDesc)) && (!l.leaderOnly || !!user.leader_group)),
        [roleDesc, user.leader_group]
    );
    const { pinned, openSections, togglePin, setSectionOpen } = useMenuPrefs(user.id);
    const favorites = pinned.map((l) => allowedLinks.find((x) => x.link === l)).filter((x): x is NavLink => !!x);
    const search = useMenuSearch(allowedLinks, () => searchRef.current?.blur());
    const collapsible = allowedLinks.length > COLLAPSE_FROM;

    // Ctrl K (⌘K en Mac): busca en el menú desde cualquier pantalla
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                if (expanded) searchRef.current?.focus();
                else setPaletteOpen(true);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [expanded]);

    const logout = async () => {
        const result = await userLogout();
        if (result) return (window.location.href = "/");
    };

    if (user.is_lite_view) return null;

    const item = (l: NavLink) => (
        <SideBarItem
            key={l.link}
            item={l}
            expanded={expanded}
            active={pathname === l.link}
            pinned={pinned.includes(l.link)}
            onTogglePin={togglePin}
        />
    );

    const principal = allowedLinks.filter((l) => l.section === "principal");
    const currentLink = allowedLinks.find((l) => l.link === pathname);
    const railExtra = currentLink && !principal.includes(currentLink) && !favorites.includes(currentLink) ? currentLink : null;

    return (
        <Box
            component="aside"
            aria-label="Menú"
            sx={{
                display: "flex",
                flexDirection: "column",
                height: "100vh",
                minWidth: { xs: 56, md: open ? 264 : 56 },
                width: { xs: 56, md: open ? 264 : 56 },
                background: (theme) => (theme.palette.mode === "dark" ? darken(user.color, 0.9) : `${user.color}05`),
                position: "sticky",
                top: 0,
                left: 0,
                borderRight: `2px solid ${user.color}30`,
                transition: "width 0.2s, min-width 0.2s",
            }}
        >
            {/* Arriba, fijo: accesos de la cuenta, hora y buscador */}
            <Box sx={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 1, pt: 1, px: expanded ? 1 : 0.5 }}>
                <Box sx={{ display: "flex", flexFlow: "row-reverse wrap", justifyContent: "center", alignItems: "center", width: "100%", gap: expanded ? 0.5 : 0.25 }}>
                    {matches && (
                        <Tooltip title={open ? "Cerrar menú" : "Abrir menú"} placement="right">
                            <IconButton aria-label={open ? "Cerrar menú" : "Abrir menú"} onClick={() => setOpen(!open)}>
                                {open ? <KeyboardArrowLeftRounded /> : <KeyboardArrowRightRounded />}
                            </IconButton>
                        </Tooltip>
                    )}
                    <Tooltip title="Mi perfil" placement="right">
                        <IconButton
                            aria-label="Mi perfil"
                            sx={{ background: pathname === "/profile" ? `${user.color}30` : "transparent", color: "text.primary" }}
                            onClick={() => navigate("/profile")}
                        >
                            <ManageAccountsRoundedIcon />
                        </IconButton>
                    </Tooltip>
                    <WhatsAppBell />
                    <InternalChatBell />
                    <NotificationBell />
                    <Tooltip title="Cerrar sesión" placement="right">
                        <IconButton aria-label="Cerrar sesión" onClick={logout}>
                            <LogoutRoundedIcon color="error" />
                        </IconButton>
                    </Tooltip>
                </Box>

                {expanded ? (
                    <>
                        <Clock />
                        <Box sx={{ width: "100%" }}>
                            <MenuSearchInput value={search.query} onChange={search.setQuery} onKeyDown={search.onKeyDown} inputRef={searchRef} />
                        </Box>
                    </>
                ) : (
                    <Tooltip title={`Buscar y ver todas las opciones (${SHORTCUT_LABEL})`} placement="right">
                        <IconButton aria-label="Buscar y ver todas las opciones" onClick={() => setPaletteOpen(true)} sx={{ bgcolor: "action.hover" }}>
                            <SearchRounded />
                        </IconButton>
                    </Tooltip>
                )}
            </Box>

            {/* Las opciones, con su propio scroll */}
            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 0.5,
                    px: expanded ? 1 : 0.5,
                    pt: 1.5,
                    pb: 2,
                    "&::-webkit-scrollbar": { width: 6 },
                    "&::-webkit-scrollbar-thumb": { backgroundColor: "rgba(128,128,128,.25)", borderRadius: 3 },
                }}
            >
                {expanded ? (
                    search.query.trim() ? (
                        <Box sx={{ width: "100%" }}>
                            <MenuSearchResults query={search.query} results={search.results} active={search.active} onNavigate={search.onDone} />
                        </Box>
                    ) : (
                        <>
                            {favorites.length > 0 && (
                                <MenuSection title="Favoritos" count={favorites.length} open>
                                    {favorites.map(item)}
                                </MenuSection>
                            )}
                            {SECTIONS.map((s) => {
                                // Lo fijado se ve en Favoritos y no se repite en su sección
                                const links = allowedLinks.filter((l) => l.section === s.id && !favorites.includes(l));
                                if (!links.length) return null;
                                const isPrincipal = s.id === "principal";
                                const current = links.some((l) => l.link === pathname);
                                const isOpen = isPrincipal || !collapsible || (openSections[s.id] ?? current);
                                return (
                                    <MenuSection
                                        key={s.id}
                                        title={s.title}
                                        count={links.length}
                                        open={isOpen}
                                        current={current}
                                        onToggle={isPrincipal || !collapsible ? undefined : () => setSectionOpen(s.id, !isOpen)}
                                    >
                                        {links.map(item)}
                                    </MenuSection>
                                );
                            })}
                            {favorites.length === 0 && collapsible && (
                                <Typography variant="caption" color="text.secondary" sx={{ px: 1.25, pt: 1, width: "100%" }}>
                                    Consejo: pasa el mouse por una opción y toca la ☆ para fijarla arriba.
                                </Typography>
                            )}
                        </>
                    )
                ) : !collapsible ? (
                    allowedLinks.map(item)
                ) : (
                    <>
                        {favorites.map(item)}
                        {favorites.length > 0 && <Divider flexItem sx={{ my: 0.5 }} />}
                        {principal.filter((l) => !favorites.includes(l)).map(item)}
                        {railExtra && (
                            <>
                                <Divider flexItem sx={{ my: 0.5 }} />
                                {item(railExtra)}
                            </>
                        )}
                    </>
                )}
            </Box>

            <MenuPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} links={allowedLinks} pinned={pinned} onTogglePin={togglePin} />
        </Box>
    );
};
