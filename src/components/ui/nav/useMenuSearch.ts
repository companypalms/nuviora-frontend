// src/components/ui/nav/useMenuSearch.ts
// Lo que se escribe en el buscador del menú y las teclas: flechas para moverse, Enter para abrir, Esc para borrar.
import { KeyboardEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NavLink, searchLinks } from "./menuLinks";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
export const SHORTCUT_LABEL = isMac ? "⌘K" : "Ctrl K";

export const useMenuSearch = (links: NavLink[], onDone?: () => void) => {
    const navigate = useNavigate();
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(0);
    const results = useMemo(() => (query.trim() ? searchLinks(links, query) : []), [links, query]);

    useEffect(() => setActive(0), [query]);

    const open = (item: NavLink) => {
        setQuery("");
        onDone?.();
        if (item.newTab) window.open(item.link, "_blank");
        else navigate(item.link);
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown" && results.length) {
            e.preventDefault();
            setActive((i) => (i + 1) % results.length);
        } else if (e.key === "ArrowUp" && results.length) {
            e.preventDefault();
            setActive((i) => (i - 1 + results.length) % results.length);
        } else if (e.key === "Enter" && results[active]) {
            e.preventDefault();
            open(results[active]);
        } else if (e.key === "Escape") {
            if (query) setQuery("");
            else (e.target as HTMLInputElement).blur();
        }
    };

    return { query, setQuery, results, active, onKeyDown, onDone: () => { setQuery(""); onDone?.(); } };
};
