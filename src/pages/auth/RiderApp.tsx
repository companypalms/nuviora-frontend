// src/pages/auth/RiderApp.tsx
// /app: la descarga de la app Nuviora Rider, sin iniciar sesión (el rider todavía no la tiene). El APK lo sirve el
// backend de cada servidor (RiderAppDownloadController).
import { useEffect, useState } from "react";
import { Alert, Box, Button, Link, Typography } from "@mui/material";
import AndroidRounded from "@mui/icons-material/AndroidRounded";
import { LoginHero } from "../../components/auth/LoginHero";

type Info = { available: boolean; version?: string | null; size_mb?: number };
const API = import.meta.env.VITE_BACKEND_API_URL;

const PASOS = [
    "Abre esta página desde tu teléfono Android y toca \"Descargar la app\".",
    "Abre el archivo descargado. Si el teléfono pide permiso para instalar apps de esta fuente, permítelo.",
    "Entra con el correo y la contraseña que te dio administración.",
    "Acepta la ubicación \"Permitir todo el tiempo\" y las notificaciones, y toca \"Quitar el ahorro de batería\": sin eso no te suena la alarma con la pantalla apagada.",
];

export const RiderApp = () => {
    const [info, setInfo] = useState<Info | null>(null);
    useEffect(() => {
        fetch(`${API}/apps/rider/info`).then((r) => r.json()).then(setInfo).catch(() => setInfo({ available: false }));
    }, []);

    return (
        <Box sx={{ width: "100%", minHeight: "100vh", display: "flex", flexDirection: { xs: "column", md: "row" } }}>
            <Box sx={{ width: { md: "50%" }, height: "100vh", position: "relative", display: { xs: "none", md: "block" } }}>
                <LoginHero />
            </Box>
            <Box sx={{ width: { xs: "100%", md: "50%" }, minHeight: "100vh", background: "white", display: "flex", alignItems: "center", justifyContent: "center", p: { xs: 2, md: 4 } }}>
                <Box sx={{ width: "100%", maxWidth: 450 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>Nuviora Rider</Typography>
                    <Typography color="text.secondary" sx={{ mb: 3 }}>La app de los riders de los centros de Nuviora. Solo para Android.</Typography>
                    {info === null ? <Typography color="text.secondary">Cargando…</Typography>
                        : !info.available ? <Alert severity="info">La app todavía no está disponible para descargar. Pídele el enlace a administración.</Alert>
                        : <>
                            <Button variant="contained" size="large" fullWidth startIcon={<AndroidRounded />} href={`${API}/apps/rider`}
                                sx={{ py: 1.5, fontWeight: 700, textTransform: "none", borderRadius: 2 }}>
                                Descargar la app{info.version ? ` (versión ${info.version})` : ""}
                            </Button>
                            {info.size_mb && <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, textAlign: "center" }}>{info.size_mb} MB: mejor con wifi.</Typography>}
                        </>}
                    <Box component="ol" sx={{ pl: 2.5, mt: 3, color: "text.secondary", "& li": { mb: 1 } }}>
                        {PASOS.map((p) => <li key={p}><Typography variant="body2">{p}</Typography></li>)}
                    </Box>
                    <Typography variant="body2" sx={{ mt: 3, textAlign: "center" }}>
                        <Link href="/" underline="hover">Volver a iniciar sesión</Link>
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};
