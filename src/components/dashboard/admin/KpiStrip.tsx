// src/components/dashboard/admin/KpiStrip.tsx
// La fila de arriba del dashboard: cuatro números del día, todos del mismo tamaño.
import React, { FC, ReactNode } from "react";
import { Box, Grid, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { AttachMoneyRounded, CancelRounded, LocalShippingRounded, ShoppingCartRounded } from "@mui/icons-material";
import { Panel } from "../../ui/surface/Panel";
import { DashboardStats } from "./types";

const StatCard: FC<{ label: string; value: ReactNode; icon: ReactNode; color: "primary" | "info" | "success" | "error"; hint?: string }> = ({ label, value, icon, color, hint }) => (
    <Panel sx={{ display: "flex", alignItems: "center", gap: 1.75, height: "100%", p: { xs: 1.5, sm: 2 } }}>
        <Box
            sx={(t) => ({
                width: 44, height: 44, borderRadius: 2.5, flexShrink: 0, display: { xs: "none", sm: "flex" }, alignItems: "center", justifyContent: "center",
                color: `${color}.main`, bgcolor: alpha(t.palette[color].main, 0.14),
            })}
        >
            {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" component="p" sx={{ fontWeight: 700, lineHeight: 1.2, color: color === "primary" ? "primary.main" : "text.primary" }}>
                {value}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: { sm: "nowrap" }, overflow: "hidden", textOverflow: "ellipsis" }}>
                {label}{hint ? ` · ${hint}` : ""}
            </Typography>
        </Box>
    </Panel>
);

export const KpiStrip: FC<{ stats: DashboardStats }> = ({ stats }) => (
    <Grid container spacing={2}>
        <Grid size={{ xs: 6, lg: 3 }}>
            <StatCard label="Ventas entregadas hoy" value={`$${Number(stats.total_sales || 0).toFixed(2)}`} icon={<AttachMoneyRounded />} color="primary" />
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }}>
            <StatCard label="Nuevas hoy" value={stats.orders_today?.created ?? 0} icon={<ShoppingCartRounded />} color="info" />
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }}>
            <StatCard label="Entregadas hoy" value={stats.orders_today?.delivered ?? 0} icon={<LocalShippingRounded />} color="success" />
        </Grid>
        <Grid size={{ xs: 6, lg: 3 }}>
            <StatCard label="Canceladas hoy" value={stats.orders_today?.cancelled ?? 0} icon={<CancelRounded />} color="error" />
        </Grid>
    </Grid>
);
