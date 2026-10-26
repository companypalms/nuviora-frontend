// src/pages/admin/Finance.tsx
// Finanzas (documento de Fran del 2026-10-12, Módulo 4). Solo el Admin (§81): el backend tampoco le entrega nada de esto
// a otro rol. Resumen (§48) y rentabilidad por niveles con su detalle hasta el pedido (§47 a §52), y los gastos
// manuales y recurrentes (§24 a §33), cohortes y efectividad (§59), CPA financiero (§60 a §74), configuración (§22, §66) y
// proveedores con sus compras y deudas (§10, §16, §17, §44), el inventario por lotes a costo FIFO (§9 a §17) y la caja
// (§34 a §46).
import React, { useCallback, useEffect, useState } from "react";
import { Box, Paper, Tab, Tabs, Typography } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { Loading } from "../../components/ui/content/Loading";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { useValidateSession } from "../../hooks/useValidateSession";
import { ExpensesTab } from "../../components/finance/ExpensesTab";
import { RecurringExpensesTab } from "../../components/finance/RecurringExpensesTab";
import { SummaryTab } from "../../components/finance/SummaryTab";
import { ProfitabilityTab } from "../../components/finance/ProfitabilityTab";
import { CohortsTab } from "../../components/finance/CohortsTab";
import { CpaTab } from "../../components/finance/CpaTab";
import { SettingsTab } from "../../components/finance/SettingsTab";
import { SuppliersTab } from "../../components/finance/SuppliersTab";
import { InventoryTab } from "../../components/finance/InventoryTab";
import { CashTab } from "../../components/finance/CashTab";
import { AgenciesTab } from "../../components/finance/AgenciesTab";
import { ReportsTab } from "../../components/finance/ReportsTab";
import { FinanceOptions, api, errorMessage } from "../../components/finance/finance";

const TABS = [
    { key: "summary", label: "Resumen" },
    { key: "cash", label: "Caja" },
    { key: "agencies", label: "Agencias" },
    { key: "profitability", label: "Rentabilidad" },
    { key: "cohorts", label: "Cohortes" },
    { key: "cpa", label: "CPA" },
    { key: "reports", label: "Reportes" },
    { key: "expenses", label: "Gastos" },
    { key: "recurring", label: "Gastos recurrentes" },
    { key: "inventory", label: "Inventario" },
    { key: "suppliers", label: "Proveedores" },
    { key: "settings", label: "Configuración" },
];

export const Finance: React.FC = () => {
    const { loadingSession, isValid } = useValidateSession();
    const [params, setParams] = useSearchParams();
    const tab = TABS.some((t) => t.key === params.get("tab")) ? params.get("tab")! : "summary";
    const [options, setOptions] = useState<FinanceOptions | null>(null);

    useEffect(() => { api<FinanceOptions>("/finance/options").then(setOptions).catch((e) => toast.error(errorMessage(e))); }, []);
    // Una categoría creada desde un formulario aparece enseguida en todos
    const addCategory = useCallback((c: { id: number; name: string; is_active: boolean }) => {
        setOptions((o) => (o ? { ...o, categories: [...o.categories, c].sort((a, b) => a.name.localeCompare(b.name, "es")) } : o));
    }, []);

    if (loadingSession || !isValid) return <Loading />;

    return (
        <Layout>
            <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: 1200, mx: "auto" }}>
                <DescripcionDeVista title="Finanzas" description="Cuánto vende y cuánto gana realmente el negocio, en dólares, y sus gastos. Nada se borra: un gasto se corrige con su motivo o se anula, y todo queda en el historial. Solo administración." />
                <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", my: 2 }}>
                    <Tabs value={tab} onChange={(_, v) => setParams({ tab: v })} variant="scrollable" allowScrollButtonsMobile>
                        {TABS.map((t) => <Tab key={t.key} value={t.key} label={t.label} />)}
                    </Tabs>
                </Paper>
                {tab === "summary" && <SummaryTab onOpenCash={() => setParams({ tab: "cash" })} />}
                {tab === "profitability" && <ProfitabilityTab />}
                {tab === "cpa" && <CpaTab />}
                {tab === "settings" && <SettingsTab />}
                {tab === "reports" && <ReportsTab />}
                {tab === "inventory" && <InventoryTab />}
                {(tab === "expenses" || tab === "recurring" || tab === "cohorts" || tab === "suppliers" || tab === "agencies" || tab === "cash") && (!options ? <Typography color="text.secondary" sx={{ p: 2 }}>Cargando…</Typography> : (
                    <>
                        {tab === "expenses" && <ExpensesTab options={options} onCategory={addCategory} />}
                        {tab === "recurring" && <RecurringExpensesTab options={options} onCategory={addCategory} />}
                        {tab === "cohorts" && <CohortsTab options={options} />}
                        {tab === "suppliers" && <SuppliersTab options={options} />}
                        {tab === "agencies" && <AgenciesTab options={options} />}
                        {tab === "cash" && <CashTab options={options} />}
                    </>
                ))}
            </Box>
        </Layout>
    );
};
