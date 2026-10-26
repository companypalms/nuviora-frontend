// src/pages/lite/LiteTopBar.tsx
// Barra de la vista simple. En pantallas grandes, todos los accesos a la vista; en el teléfono y la tablet,
// solo las comisiones, las campanas y un menú con el resto (antes eran ~15 botones en una fila y la página
// se salía de la pantalla, 2026-10-03).
import React, { useState } from "react";
import {
    AppBar, Box, Button, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Paper,
    Toolbar, Tooltip, Typography, alpha, useMediaQuery, useTheme,
} from "@mui/material";
import {
    AccountBalanceRounded, AddCircleOutline, CloseRounded, CurrencyExchange, GroupsRounded, Inventory2Rounded,
    LogoutRounded, MenuRounded, NotificationsRounded, PaymentsRounded, RefreshRounded, WhatsApp,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "../../store/user/UserStore";
import { fmtMoney } from "../../lib/money";
import { LiteNotificationBell } from "./LiteNotificationBell";
import { LiteWhatsAppBell } from "./LiteWhatsAppBell";
import { LiteSettingsMenu } from "./LiteSettingsMenu";
import { InternalChatBell } from "../../components/ui/notifications/InternalChatBell";

interface Props {
    commissions: number;
    loadingCommissions: boolean;
    onRefresh: () => void;
    onCreate: () => void;
    onBankAccounts: () => void;
    onRates: () => void;
    onToggleTestPanel: () => void;
    onLogout: () => void;
}

type Action = { key: string; label: string; short: string; icon: React.ReactNode; color: string; onClick: () => void };

const spin = {
    animation: "spin 1s linear infinite",
    "@keyframes spin": { "0%": { transform: "rotate(0deg)" }, "100%": { transform: "rotate(360deg)" } },
};

export const LiteTopBar: React.FC<Props> = ({
    commissions, loadingCommissions, onRefresh, onCreate, onBankAccounts, onRates, onToggleTestPanel, onLogout,
}) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const user = useUserStore((s) => s.user);
    const compact = useMediaQuery(theme.breakpoints.down("lg"));
    const [menuOpen, setMenuOpen] = useState(false);

    const actions: Action[] = [
        { key: "create", label: "Crear orden", short: "Crear", icon: <AddCircleOutline />, color: theme.palette.primary.main, onClick: onCreate },
        { key: "inventory", label: "Inventario por ciudad", short: "Inventario", icon: <Inventory2Rounded />, color: theme.palette.success.main, onClick: () => navigate("/inventario-ciudades") },
        ...(user.leader_group
            ? [
                { key: "group", label: `Mi grupo · ${user.leader_group.name}`, short: "Mi grupo", icon: <GroupsRounded />, color: theme.palette.warning.main, onClick: () => navigate("/mi-grupo") },
                { key: "change", label: "Vueltos de mi grupo", short: "Vueltos", icon: <PaymentsRounded />, color: theme.palette.warning.main, onClick: () => navigate("/mi-grupo/vueltos") },
            ]
            : []),
        { key: "accounts", label: "Cuentas bancarias", short: "Cuentas", icon: <AccountBalanceRounded />, color: theme.palette.info.main, onClick: onBankAccounts },
        { key: "rates", label: "Tasas del día", short: "Tasas", icon: <CurrencyExchange />, color: theme.palette.success.main, onClick: onRates },
        { key: "crm", label: "WhatsApp CRM", short: "CRM", icon: <WhatsApp />, color: "#25D366", onClick: () => window.open("/whatsapp", "_blank") },
    ];

    const run = (fn: () => void) => () => {
        setMenuOpen(false);
        fn();
    };

    const commissionsPill = (
        <Paper
            elevation={0}
            sx={{
                pl: 1.5, pr: 0.5, py: 0.25,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                border: "1px solid", borderColor: alpha(theme.palette.primary.main, 0.2),
                borderRadius: 4,
                display: "flex", alignItems: "center", gap: 0.75, minWidth: 0,
            }}
        >
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", fontWeight: "bold", fontSize: "0.65rem", lineHeight: 1.1, whiteSpace: "nowrap" }}>
                {compact ? "Hoy" : "Comisiones hoy"}
            </Typography>
            <Typography variant="subtitle2" fontWeight="black" color="primary" sx={{ whiteSpace: "nowrap" }}>
                {fmtMoney(commissions)}
            </Typography>
            <IconButton size="small" aria-label="Actualizar comisiones y contadores" onClick={onRefresh} disabled={loadingCommissions} sx={{ p: 0.5 }}>
                <RefreshRounded sx={{ fontSize: 16, ...(loadingCommissions ? spin : {}) }} />
            </IconButton>
        </Paper>
    );

    const brand = (
        <Box sx={{ display: { xs: "none", sm: "block" }, mr: 1 }}>
            <Typography variant="h6" fontWeight="black" color="primary" sx={{ lineHeight: 1 }}>Nuviora</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: "medium" }}>Panel de ventas</Typography>
        </Box>
    );

    const bells = (
        <>
            <LiteWhatsAppBell />
            <InternalChatBell />
            <LiteNotificationBell />
        </>
    );

    return (
        <AppBar position="sticky" elevation={0} sx={{ bgcolor: "background.paper", borderBottom: "1px solid", borderColor: "divider", color: "text.primary" }}>
            <Toolbar sx={{ minHeight: 60, gap: 1, px: { xs: 1, sm: 2 } }}>
                {brand}
                {/* Lo de una agencia son sus carreras, que solo ve el Admin */}
                {user.role?.description !== "Agencia" && commissionsPill}
                <Box sx={{ flex: 1 }} />

                {compact ? (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, flexShrink: 0 }}>
                        {bells}
                        <IconButton aria-label="Abrir menú" onClick={() => setMenuOpen(true)} sx={{ ml: 0.5, bgcolor: "action.hover" }}>
                            <MenuRounded />
                        </IconButton>
                    </Box>
                ) : (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        {actions.map((a) => (
                            <Button
                                key={a.key}
                                startIcon={a.icon}
                                size="small"
                                onClick={a.onClick}
                                sx={{ borderRadius: 4, textTransform: "none", whiteSpace: "nowrap", bgcolor: alpha(a.color, 0.1), color: a.color, "&:hover": { bgcolor: alpha(a.color, 0.2) } }}
                            >
                                {a.short}
                            </Button>
                        ))}
                        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                        {bells}
                        <LiteSettingsMenu />
                        <Tooltip title="Probar notificaciones">
                            <IconButton size="small" aria-label="Probar notificaciones" onClick={onToggleTestPanel} sx={{ color: "warning.main" }}>
                                <NotificationsRounded fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Cerrar sesión">
                            <IconButton size="small" aria-label="Cerrar sesión" onClick={onLogout} sx={{ color: "error.main", bgcolor: alpha(theme.palette.error.main, 0.1) }}>
                                <LogoutRounded fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                )}
            </Toolbar>

            <Drawer anchor="right" open={menuOpen} onClose={() => setMenuOpen(false)} PaperProps={{ sx: { width: 300, maxWidth: "85vw" } }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1.5 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography fontWeight="bold" noWrap>{user.names} {user.surnames && user.surnames !== "-" ? user.surnames : ""}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap display="block">
                            {user.leader_group ? `Líder · ${user.leader_group.name}` : user.role?.description}
                        </Typography>
                    </Box>
                    <LiteSettingsMenu />
                    <IconButton aria-label="Cerrar menú" onClick={() => setMenuOpen(false)}>
                        <CloseRounded />
                    </IconButton>
                </Box>
                <Divider />
                <List sx={{ py: 0.5 }}>
                    {actions.map((a) => (
                        <ListItemButton key={a.key} onClick={run(a.onClick)} sx={{ py: 1.25 }}>
                            <ListItemIcon sx={{ minWidth: 40, color: a.color }}>{a.icon}</ListItemIcon>
                            <ListItemText primary={a.label} primaryTypographyProps={{ fontWeight: a.key === "create" ? 700 : 500 }} />
                        </ListItemButton>
                    ))}
                </List>
                <Divider />
                <List sx={{ py: 0.5 }}>
                    <ListItemButton onClick={run(onToggleTestPanel)}>
                        <ListItemIcon sx={{ minWidth: 40, color: "warning.main" }}><NotificationsRounded /></ListItemIcon>
                        <ListItemText primary="Probar notificaciones" />
                    </ListItemButton>
                    <ListItemButton onClick={run(onLogout)}>
                        <ListItemIcon sx={{ minWidth: 40, color: "error.main" }}><LogoutRounded /></ListItemIcon>
                        <ListItemText primary="Cerrar sesión" primaryTypographyProps={{ color: "error.main", fontWeight: 600 }} />
                    </ListItemButton>
                </List>
            </Drawer>
        </AppBar>
    );
};
