// Varias páginas del menú agrupadas en una, cada una en su pestaña. La pestaña elegida va en ?seccion= (y no en ?tab=)
// porque algunas páginas embebidas ya usan ?tab= para sus propias pestañas internas.
import React, { ReactNode } from "react";
import { Box, Paper, Tab, Tabs } from "@mui/material";
import { Navigate, useLocation, useSearchParams } from "react-router-dom";
import { Layout } from "./Layout";
import { Loading } from "./content/Loading";
import { DescripcionDeVista } from "./content/DescripcionDeVista";
import { Forbidden } from "../auth/Forbidden";
import { useValidateSession } from "../../hooks/useValidateSession";

export type PageSection = {
    key: string;
    label: string;
    roles: string[];
    render: () => ReactNode;
};

type Props = {
    title: string;
    description: string;
    sections: PageSection[];
};

export const SectionTabsPage: React.FC<Props> = ({ title, description, sections }) => {
    const { loadingSession, isValid, user } = useValidateSession();
    const [params, setParams] = useSearchParams();

    if (loadingSession || !isValid) return <Loading />;

    const role = user?.role?.description ?? "";
    const visible = sections.filter((s) => s.roles.includes(role));
    if (!visible.length) return <Forbidden />;
    const current = visible.find((s) => s.key === params.get("seccion")) ?? visible[0];

    // Con una sola pestaña permitida, el rol ve esa página tal como la veía antes de agruparla
    if (visible.length === 1) return <Layout>{current.render()}</Layout>;

    return (
        <Layout>
            <Box sx={{ p: { xs: 1, sm: 2 } }}>
                <DescripcionDeVista title={title} description={description} />
                <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", mb: 2 }}>
                    <Tabs value={current.key} onChange={(_, v) => setParams({ seccion: v })} variant="scrollable" allowScrollButtonsMobile>
                        {visible.map((s) => <Tab key={s.key} value={s.key} label={s.label} />)}
                    </Tabs>
                </Paper>
                <Box key={current.key}>{current.render()}</Box>
            </Box>
        </Layout>
    );
};

/** Una dirección vieja del menú: lleva a la pestaña que la reemplaza, conservando lo que traía después del "?". */
export const RedirectToSection: React.FC<{ to: string; section: string }> = ({ to, section }) => {
    const { search } = useLocation();
    const params = new URLSearchParams(search);
    params.set("seccion", section);
    return <Navigate to={`${to}?${params.toString()}`} replace />;
};

/** Para las páginas que pueden ir solas (con su Layout) o dentro de una SectionTabsPage. */
export const PageLayout: React.FC<{ isEmbedded?: boolean; children: ReactNode }> = ({ isEmbedded, children }) =>
    isEmbedded ? <>{children}</> : <Layout>{children}</Layout>;
