// src/components/dashboard/admin/ActionCenter.tsx
// "Pendientes": todo lo que pide una acción del Admin, en un solo panel con una pestaña por tipo y su cantidad. Se abre
// en la primera pestaña que tiene algo; las que están en cero quedan apagadas.
import React, { FC, ReactNode, useState } from "react";
import { Box, Tab, Tabs, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { AssignmentLateRounded, CheckCircleRounded } from "@mui/icons-material";
import { Panel, PanelHeader } from "../../ui/surface/Panel";
import { DashboardStats, PendingVuelto } from "./types";
import { DeficitList, LowStockList, NoAgencyList, NoCityList, ReviewsList, VueltosList } from "./PendingLists";

type Tone = "primary" | "error" | "warning" | "info";
type Section = { key: string; label: string; count: number; tone: Tone; content: () => ReactNode };

const Count: FC<{ n: number; tone: Tone }> = ({ n, tone }) => (
    <Box
        component="span"
        sx={(t) => ({
            ml: 1, px: 0.9, minWidth: 22, height: 20, borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700,
            color: n ? t.palette[tone].main : "text.disabled",
            bgcolor: n ? alpha(t.palette[tone].main, 0.16) : "action.hover",
        })}
    >
        {n > 999 ? "999+" : n}
    </Box>
);

export const ActionCenter: FC<{
    stats: DashboardStats;
    vueltos: PendingVuelto[];
    onOpenOrder: (id: number) => void;
    onAutoAssignAgency: () => void;
    assigningAgency: boolean;
    onAutoAssignCities: () => void;
    assigningCities: boolean;
}> = ({ stats, vueltos, onOpenOrder, onAutoAssignAgency, assigningAgency, onAutoAssignCities, assigningCities }) => {
    const deficit = stats.inventory_deficit ?? [];
    const lowStock = stats.low_stock_alerts ?? [];
    const reviews = stats.pending_reviews ?? { rejections: 0, locations: 0 };

    const sections: Section[] = [
        { key: "vueltos", label: "Vueltos", count: vueltos.length, tone: "primary", content: () => <VueltosList vueltos={vueltos} onOpen={onOpenOrder} /> },
        { key: "deficit", label: "Déficit de inventario", count: deficit.reduce((s, a) => s + a.products.length, 0), tone: "error", content: () => <DeficitList deficit={deficit} /> },
        { key: "stock", label: "Stock bajo", count: lowStock.reduce((s, g) => s + g.products.length, 0), tone: "warning", content: () => <LowStockList alerts={lowStock} /> },
        {
            key: "agencia", label: "Sin agencia", count: Number(stats.unassigned_agency_count || 0), tone: "warning",
            content: () => <NoAgencyList count={Number(stats.unassigned_agency_count || 0)} orders={stats.unassigned_agency_orders ?? []} onOpen={onOpenOrder} onAutoAssign={onAutoAssignAgency} busy={assigningAgency} />,
        },
        {
            key: "ciudades", label: "Ciudades sin registrar", count: Number(stats.unassigned_city_count || 0), tone: "error",
            content: () => <NoCityList count={Number(stats.unassigned_city_count || 0)} summary={stats.missing_cities_summary ?? {}} onAutoAssign={onAutoAssignCities} busy={assigningCities} />,
        },
        { key: "validaciones", label: "Validaciones", count: Number(reviews.rejections || 0) + Number(reviews.locations || 0), tone: "info", content: () => <ReviewsList rejections={reviews.rejections || 0} locations={reviews.locations || 0} /> },
    ];

    const total = sections.reduce((s, x) => s + x.count, 0);
    const [tab, setTab] = useState(() => sections.find((s) => s.count > 0)?.key ?? sections[0].key);
    const current = sections.find((s) => s.key === tab) ?? sections[0];

    return (
        <Panel sx={{ p: 0, height: "100%", display: "flex", flexDirection: "column" }}>
            <Box sx={{ px: 2, pt: 2 }}>
                <PanelHeader
                    icon={<AssignmentLateRounded />}
                    title="Pendientes"
                    subtitle={total ? "Lo que espera una acción tuya, lo más urgente primero." : undefined}
                />
            </Box>
            {total === 0 ? (
                <Box role="status" sx={{ px: 2, pb: 3, display: "flex", alignItems: "center", gap: 1, color: "success.main" }}>
                    <CheckCircleRounded />
                    <Typography variant="body2" color="text.secondary">Todo al día: no hay acciones pendientes.</Typography>
                </Box>
            ) : (
                <>
                    <Tabs
                        value={current.key}
                        onChange={(_, v) => setTab(v)}
                        variant="scrollable"
                        scrollButtons="auto"
                        allowScrollButtonsMobile
                        sx={{ px: 1, minHeight: 40, borderBottom: 1, borderColor: "divider", "& .MuiTab-root": { minHeight: 40, py: 0.5, px: 1.5 } }}
                    >
                        {sections.map((s) => (
                            <Tab
                                key={s.key}
                                value={s.key}
                                label={<span>{s.label}<Count n={s.count} tone={s.tone} /></span>}
                                sx={{ opacity: s.count ? 1 : 0.55 }}
                            />
                        ))}
                    </Tabs>
                    <Box role="tabpanel" aria-label={current.label} sx={{ p: 2, flex: 1, minHeight: 0 }}>
                        {current.content()}
                    </Box>
                </>
            )}
        </Panel>
    );
};
