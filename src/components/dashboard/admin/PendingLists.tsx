// src/components/dashboard/admin/PendingLists.tsx
// El contenido de cada pestaña del panel de pendientes. Antes eran tarjetas con una fila por producto, una debajo de la
// otra, y con el inventario acumulado la página llegaba a más de 9.000 px; ahora son tablas compactas con alto máximo,
// lo más urgente primero, y se filtran por agencia, almacén o ciudad.
import React, { FC, useMemo, useState } from "react";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import { orderNo } from "../../../lib/functions";
import { DashboardStats, OrderRef, PendingVuelto } from "./types";
import { GroupChips, PendingTable } from "./PendingTable";

const money = (v: number | string | undefined) => `$${Number(v || 0).toFixed(2)}`;

/** Los mismos nombres que en la sección de vuelto de la orden (OrderChangeSection). */
const CHANGE_METHOD_LABEL: Record<string, string> = {
    BOLIVARES_PAGOMOVIL: "Pago Móvil (Bs)",
    BOLIVARES_TRANSFERENCIA: "Transferencia (Bs)",
    ZELLE_DOLARES: "Zelle",
    BINANCE_DOLARES: "Binance Pay",
    PAYPAL_DOLARES: "PayPal",
    ZINLI_DOLARES: "Zinli",
    DOLARES_EFECTIVO: "Dólares en efectivo",
};
const methodLabel = (m?: string) => (m ? CHANGE_METHOD_LABEL[m] ?? m.replace(/_/g, " ").toLowerCase() : "Por definir");
const strong = (text: string) => <Typography variant="body2" fontWeight={600}>{text}</Typography>;

export const VueltosList: FC<{ vueltos: PendingVuelto[]; onOpen: (id: number) => void }> = ({ vueltos, onOpen }) => (
    <PendingTable
        rows={vueltos}
        rowKey={(v) => v.id}
        onRowClick={(v) => onOpen(v.id)}
        rowLabel={(v) => `Gestionar el vuelto de la orden ${orderNo(v.name)}`}
        empty="No hay vueltos pendientes."
        columns={[
            { key: "orden", label: "Orden", render: (v) => strong(orderNo(v.name)) },
            { key: "cliente", label: "Cliente", render: (v) => `${v.client?.first_name ?? ""} ${v.client?.last_name ?? ""}` },
            { key: "metodo", label: "Método", hideOnMobile: true, render: (v) => methodLabel(v.change_method_company) },
            { key: "agencia", label: "Agencia", hideOnMobile: true, render: (v) => v.agency?.names ?? "—" },
            { key: "monto", label: "Vuelto", align: "right", render: (v) => <Chip size="small" color="primary" label={money(v.change_amount)} /> },
        ]}
    />
);

type DeficitRow = { agency: string; name: string; stock: number; missing: number };

export const DeficitList: FC<{ deficit: NonNullable<DashboardStats["inventory_deficit"]> }> = ({ deficit }) => {
    const [agency, setAgency] = useState("");
    const rows = useMemo(() => deficit
        .flatMap((a) => a.products.map((p): DeficitRow => ({ agency: a.agency_name, name: p.name, stock: p.current_stock, missing: p.total_required - p.current_stock })))
        .filter((r) => !agency || r.agency === agency)
        .sort((a, b) => b.missing - a.missing), [deficit, agency]);
    return (
        <>
            <GroupChips value={agency} onChange={setAgency} groups={deficit.map((a) => ({ key: a.agency_name, label: a.agency_name, count: a.products.length }))} />
            <PendingTable
                rows={rows}
                rowKey={(r, i) => `${r.agency}-${r.name}-${i}`}
                columns={[
                    { key: "producto", label: "Producto", render: (r) => strong(r.name) },
                    ...(agency ? [] : [{ key: "agencia", label: "Agencia", hideOnMobile: true, render: (r: DeficitRow) => r.agency }]),
                    { key: "stock", label: "Stock", align: "right", width: 80, render: (r) => <Typography variant="body2" color={r.stock === 0 ? "error.main" : "warning.main"}>{r.stock}</Typography> },
                    { key: "faltan", label: "Faltan", align: "right", width: 90, render: (r) => <Chip size="small" color="error" label={`${r.missing} un.`} /> },
                ]}
            />
        </>
    );
};

type LowStockRow = { warehouse: string; name: string; quantity: number };

export const LowStockList: FC<{ alerts: NonNullable<DashboardStats["low_stock_alerts"]> }> = ({ alerts }) => {
    const [warehouse, setWarehouse] = useState("");
    const rows = useMemo(() => alerts
        .flatMap((g) => g.products.map((p): LowStockRow => ({ warehouse: g.warehouse_name, name: p.name, quantity: p.quantity })))
        .filter((r) => !warehouse || r.warehouse === warehouse)
        .sort((a, b) => a.quantity - b.quantity), [alerts, warehouse]);
    return (
        <>
            <GroupChips value={warehouse} onChange={setWarehouse} allLabel="Todos" groups={alerts.map((g) => ({ key: g.warehouse_name, label: g.warehouse_name, count: g.products.length }))} />
            <PendingTable
                rows={rows}
                rowKey={(r, i) => `${r.warehouse}-${r.name}-${i}`}
                columns={[
                    { key: "producto", label: "Producto", render: (r) => strong(r.name) },
                    ...(warehouse ? [] : [{ key: "almacen", label: "Almacén", hideOnMobile: true, render: (r: LowStockRow) => r.warehouse }]),
                    { key: "unidades", label: "Unidades", align: "right", width: 100, render: (r) => <Chip size="small" variant="outlined" color="warning" label={`${r.quantity} u.`} /> },
                ]}
            />
        </>
    );
};

/** Una acción del sistema arriba de la tabla (Auto-asignar, Asignar automáticamente). */
const ActionBar: FC<{ text: string; action: string; onAction: () => void; busy: boolean; color: "warning" | "error" }> = ({ text, action, onAction, busy, color }) => (
    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} sx={{ mb: 1, flexWrap: "wrap" }}>
        <Typography variant="body2" color="text.secondary">{text}</Typography>
        <Button size="small" variant="contained" disableElevation color={color} onClick={onAction} disabled={busy}>
            {busy ? "Asignando…" : action}
        </Button>
    </Stack>
);

export const NoAgencyList: FC<{ count: number; orders: OrderRef[]; onOpen: (id: number) => void; onAutoAssign: () => void; busy: boolean }> = ({ count, orders, onOpen, onAutoAssign, busy }) => (
    <>
        <ActionBar
            text={`${count} órdenes pendientes de ruta, sin agencia.${orders.length < count ? ` Estas son las ${orders.length} más recientes.` : ""}`}
            action="Auto-asignar" onAction={onAutoAssign} busy={busy} color="warning"
        />
        <PendingTable
            rows={orders}
            rowKey={(o) => o.id}
            onRowClick={(o) => onOpen(o.id)}
            rowLabel={(o) => `Abrir la orden ${orderNo(o.name)}`}
            columns={[
                { key: "orden", label: "Orden", render: (o) => strong(orderNo(o.name)) },
                { key: "monto", label: "Total", align: "right", render: (o) => money(o.current_total_price) },
            ]}
        />
    </>
);

/** El backend manda cuántas órdenes hay por cada ciudad escrita que no está registrada (no la lista de órdenes). */
export const NoCityList: FC<{ count: number; summary: Record<string, number>; onAutoAssign: () => void; busy: boolean }> = ({ count, summary, onAutoAssign, busy }) => (
    <>
        <ActionBar text={`${count} órdenes con una ciudad que no está registrada.`} action="Asignar automáticamente" onAction={onAutoAssign} busy={busy} color="error" />
        <PendingTable
            rows={Object.entries(summary).map(([city, n]) => ({ city, n }))}
            rowKey={(r) => r.city}
            columns={[
                { key: "ciudad", label: "Ciudad escrita por el cliente", render: (r) => strong(r.city) },
                { key: "ordenes", label: "Órdenes", align: "right", render: (r) => <Chip size="small" color="error" label={r.n} /> },
            ]}
        />
    </>
);

export const ReviewsList: FC<{ rejections: number; locations: number }> = ({ rejections, locations }) => (
    <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
        {[{ n: rejections, label: "Rechazos por revisar" }, { n: locations, label: "Ubicaciones por revisar" }].map((r) => (
            <Box key={r.label} sx={{ flex: 1, p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                <Typography variant="h5" component="p" fontWeight={700}>{r.n}</Typography>
                <Typography variant="body2" color="text.secondary">{r.label}</Typography>
            </Box>
        ))}
    </Stack>
);
