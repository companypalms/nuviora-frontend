// src/components/ui/notifications/LandingEditorBell.tsx
// El número del editor de landings arriba en el menú (Etapa 5, paso 6b), como el de los editores de video: lo que tiene
// por hacer y por publicar. Se pide al abrir cada pantalla, cada 5 minutos y cuando cambia algo.
import { useCallback, useEffect, useState } from "react";
import { Badge, IconButton, Tooltip } from "@mui/material";
import WebRoundedIcon from "@mui/icons-material/WebRounded";
import { useLocation, useNavigate } from "react-router-dom";
import { useUserStore } from "../../../store/user/UserStore";
import { api } from "../../meta-ads/metaAds";
import { LANDING_EDITOR_ROLE, onLandingChanged } from "../../meta-ads/landingTasksShared";

const REFRESH_MS = 5 * 60_000;

type Pending = { todo: number; to_publish: number; to_review: number; total: number };

/** "Landings: 2 por hacer y 1 para publicar". */
const tooltip = (p: Pending | null) => {
    if (!p) return "Mis encargos de landing";
    if (p.total === 0) return "Landings: todo al día";
    const parts = [];
    if (p.todo > 0) parts.push(`${p.todo} por hacer`);
    if (p.to_publish > 0) parts.push(`${p.to_publish} para publicar`);
    return `Landings: ${parts.join(" y ")}`;
};

export const LandingEditorBell = () => {
    const user = useUserStore((s) => s.user);
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const isLandingEditor = user.role?.description === LANDING_EDITOR_ROLE;
    const [pending, setPending] = useState<Pending | null>(null);

    const load = useCallback(() => {
        api<{ pending: Pending }>("/landing-editor/summary").then((r) => setPending(r.pending)).catch(() => undefined);
    }, []);

    useEffect(() => {
        if (!isLandingEditor) return;
        load();
        const id = window.setInterval(load, REFRESH_MS);
        const off = onLandingChanged(load);
        return () => { window.clearInterval(id); off(); };
    }, [isLandingEditor, load, pathname]);

    if (!isLandingEditor) return null;

    return (
        <Tooltip title={tooltip(pending)}>
            <IconButton
                aria-label={tooltip(pending)}
                onClick={() => navigate("/editor-landings")}
                sx={{ color: "inherit", bgcolor: pathname.startsWith("/editor-landings") ? "rgba(100,100,100,0.12)" : "transparent", "&:hover": { bgcolor: "rgba(255,255,255,0.15)" } }}
            >
                <Badge badgeContent={pending?.total ?? 0} color="primary" max={99}>
                    <WebRoundedIcon />
                </Badge>
            </IconButton>
        </Tooltip>
    );
};
