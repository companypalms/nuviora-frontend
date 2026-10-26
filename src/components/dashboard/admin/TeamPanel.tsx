// src/components/dashboard/admin/TeamPanel.tsx
// Las vendedoras y los repartidores con más órdenes de los últimos 7 días, en un solo panel con dos pestañas.
import React, { FC, useState } from "react";
import { Avatar, Box, Stack, Tab, Tabs, Typography } from "@mui/material";
import { EmojiEventsRounded } from "@mui/icons-material";
import { Panel, PanelHeader } from "../../ui/surface/Panel";
import { DashboardStats } from "./types";

type Person = { id: number; names: string; count: number };

const initials = (names: string) => names.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]).join("").toUpperCase();

const Ranking: FC<{ people: Person[]; unit: string; color: string }> = ({ people, unit, color }) => {
    if (people.length === 0) {
        return <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>Sin datos en los últimos 7 días.</Typography>;
    }
    const max = Math.max(...people.map((p) => p.count), 1);
    return (
        <Stack component="ol" spacing={1.25} sx={{ listStyle: "none", m: 0, p: 0 }}>
            {people.map((p, i) => (
                <Box component="li" key={p.id} sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ width: 14, textAlign: "right" }}>{i + 1}</Typography>
                    <Avatar sx={{ width: 30, height: 30, fontSize: 12, fontWeight: 700, bgcolor: color }}>{initials(p.names)}</Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" justifyContent="space-between" gap={1}>
                            <Typography variant="body2" noWrap>{p.names}</Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ flexShrink: 0 }}>{p.count} {unit}</Typography>
                        </Stack>
                        <Box sx={{ mt: 0.5, height: 4, borderRadius: 2, bgcolor: "action.hover" }}>
                            <Box sx={{ height: "100%", width: `${(p.count / max) * 100}%`, borderRadius: 2, bgcolor: color }} />
                        </Box>
                    </Box>
                </Box>
            ))}
        </Stack>
    );
};

export const TeamPanel: FC<{ stats: DashboardStats }> = ({ stats }) => {
    const [tab, setTab] = useState<"sellers" | "deliverers">("sellers");
    const sellers = (stats.top_sellers ?? []).map((s) => ({ id: s.id, names: s.names, count: s.agent_orders_count }));
    const deliverers = (stats.top_deliverers ?? []).map((s) => ({ id: s.id, names: s.names, count: s.deliverer_orders_count }));
    return (
        <Panel sx={{ height: "100%" }}>
            <PanelHeader icon={<EmojiEventsRounded />} title="Equipo" subtitle="Últimos 7 días" />
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 36, mb: 1.5, "& .MuiTab-root": { minHeight: 36, py: 0.5, px: 1.5 } }}>
                <Tab value="sellers" label="Vendedoras" />
                <Tab value="deliverers" label="Repartidores" />
            </Tabs>
            {tab === "sellers"
                ? <Ranking people={sellers} unit="órdenes" color="primary.main" />
                : <Ranking people={deliverers} unit="entregas" color="secondary.main" />}
        </Panel>
    );
};
