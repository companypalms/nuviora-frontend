// src/components/ui/notifications/EditorBell.tsx
// El número de los editores arriba en el menú (Etapa 5, paso 5a), como el del calendario del Admin: lo que tienen por hacer
// y, el editor líder, lo que falta asignar y revisar. Se pide al abrir cada pantalla, cada 5 minutos y cuando cambia algo.
import { useCallback, useEffect, useState } from "react";
import { Badge, IconButton, Tooltip } from "@mui/material";
import MovieEditIcon from "@mui/icons-material/MovieEdit";
import { useLocation, useNavigate } from "react-router-dom";
import { useUserStore } from "../../../store/user/UserStore";
import { api } from "../../meta-ads/metaAds";
import { EDITOR_ROLES, onEditorChanged } from "../../meta-ads/editorShared";

const REFRESH_MS = 5 * 60_000;

type Pending = { todo: number; to_assign: number; to_review: number; total: number };

/** "Encargos: 2 por hacer, 1 para asignar y 1 para revisar". */
const tooltip = (p: Pending | null) => {
    if (!p) return "Mis encargos";
    if (p.total === 0) return "Encargos: todo al día";
    const parts = [];
    if (p.todo > 0) parts.push(`${p.todo} por hacer`);
    if (p.to_assign > 0) parts.push(`${p.to_assign} para asignar`);
    if (p.to_review > 0) parts.push(`${p.to_review} para revisar`);
    return `Encargos: ${parts.join(", ").replace(/, ([^,]*)$/, " y $1")}`;
};

export const EditorBell = () => {
    const user = useUserStore((s) => s.user);
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const isEditor = EDITOR_ROLES.includes(user.role?.description ?? "");
    const [pending, setPending] = useState<Pending | null>(null);

    const load = useCallback(() => {
        api<{ pending: Pending }>("/editor/summary").then((r) => setPending(r.pending)).catch(() => undefined);
    }, []);

    useEffect(() => {
        if (!isEditor) return;
        load();
        const id = window.setInterval(load, REFRESH_MS);
        const off = onEditorChanged(load);
        return () => { window.clearInterval(id); off(); };
    }, [isEditor, load, pathname]);

    if (!isEditor) return null;
    // El líder va a lo del equipo si ahí hay algo y él no tiene nada propio por hacer
    const target = pending && pending.todo === 0 && pending.to_assign + pending.to_review > 0 ? "/editor/equipo" : "/editor";

    return (
        <Tooltip title={tooltip(pending)}>
            <IconButton
                aria-label={tooltip(pending)}
                onClick={() => navigate(target)}
                sx={{ color: "inherit", bgcolor: pathname.startsWith("/editor") ? "rgba(100,100,100,0.12)" : "transparent", "&:hover": { bgcolor: "rgba(255,255,255,0.15)" } }}
            >
                <Badge badgeContent={pending?.total ?? 0} color="primary" max={99}>
                    <MovieEditIcon />
                </Badge>
            </IconButton>
        </Tooltip>
    );
};
