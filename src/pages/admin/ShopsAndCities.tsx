// Configuración → Tiendas, ciudades y agencias: dónde se vende (tiendas) y quién entrega en cada ciudad y a qué costo.
import { SectionTabsPage, PageSection } from "../../components/ui/SectionTabsPage";
import { Shops } from "../shops/Shops";
import { Cities } from "../Cities";
import { DeliveryTariffs } from "./DeliveryTariffs";

const SECTIONS: PageSection[] = [
    { key: "tiendas", label: "Tiendas", roles: ["Admin", "Gerente"], render: () => <Shops isEmbedded /> },
    { key: "ciudades", label: "Ciudades y agencias", roles: ["Admin", "Gerente", "Master"], render: () => <Cities isEmbedded /> },
    { key: "tarifas", label: "Tarifas de delivery", roles: ["Admin"], render: () => <DeliveryTariffs isEmbedded /> },
];

export const ShopsAndCities = () => (
    <SectionTabsPage
        title="Tiendas, ciudades y agencias"
        description="Las tiendas y sus vendedoras, qué agencias entregan en cada ciudad y cuánto cuesta cada carrera."
        sections={SECTIONS}
    />
);
