// src/components/ui/nav/useMenuPrefs.ts
// Lo que cada persona fija arriba y las secciones que deja abiertas, guardado en este navegador.
// Si el navegador no deja guardar (modo privado), el menú funciona igual y solo no lo recuerda.
import { useCallback, useEffect, useState } from "react";
import { SectionId } from "./menuLinks";

type Prefs = { pinned: string[]; open: Partial<Record<SectionId, boolean>> };

const read = (key: string): Prefs => {
    try {
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : null;
        return {
            pinned: Array.isArray(parsed?.pinned) ? parsed.pinned.filter((x: unknown) => typeof x === "string") : [],
            open: parsed?.open && typeof parsed.open === "object" ? parsed.open : {},
        };
    } catch {
        return { pinned: [], open: {} };
    }
};

export const useMenuPrefs = (userId?: number | string) => {
    const key = `nuviora.menu.${userId ?? "anon"}`;
    const [prefs, setPrefs] = useState<Prefs>(() => read(key));

    useEffect(() => setPrefs(read(key)), [key]);

    const save = useCallback((update: (p: Prefs) => Prefs) => {
        setPrefs((prev) => {
            const next = update(prev);
            try {
                localStorage.setItem(key, JSON.stringify(next));
            } catch {
                /* sin almacenamiento: solo vale para esta visita */
            }
            return next;
        });
    }, [key]);

    const togglePin = useCallback((link: string) => save((p) => ({
        ...p,
        pinned: p.pinned.includes(link) ? p.pinned.filter((l) => l !== link) : [...p.pinned, link],
    })), [save]);

    const setSectionOpen = useCallback((id: SectionId, value: boolean) => save((p) => ({ ...p, open: { ...p.open, [id]: value } })), [save]);

    return { pinned: prefs.pinned, openSections: prefs.open, togglePin, setSectionOpen };
};
