// Ventas y reparto → Reparto: cómo se reparten hoy las órdenes y los grupos y % que deciden ese reparto.
import { SectionTabsPage, PageSection } from "../../components/ui/SectionTabsPage";
import { RoundRobinControl } from "./RoundRobinControl";
import { SalesGroups } from "../sales-groups/SalesGroups";

const SECTIONS: PageSection[] = [
    { key: "hoy", label: "Hoy", roles: ["Admin", "Gerente", "Master"], render: () => <RoundRobinControl isEmbedded /> },
    { key: "grupos", label: "Grupos y %", roles: ["Admin", "Master"], render: () => <SalesGroups isEmbedded /> },
];

export const Distribution = () => (
    <SectionTabsPage
        title="Reparto"
        description="Cómo se reparten hoy las órdenes nuevas entre las vendedoras, y los grupos y % que deciden ese reparto."
        sections={SECTIONS}
    />
);
