// Configuración → Usuarios: todas las cuentas del sistema y, aparte, los repartidores (solo Admin).
import { SectionTabsPage, PageSection } from "../../components/ui/SectionTabsPage";
import { Users } from "./Users";
import { DeliverersPage } from "../deliverers/Deliverers";

const SECTIONS: PageSection[] = [
    { key: "todos", label: "Todos los usuarios", roles: ["Admin", "Gerente"], render: () => <Users isEmbedded /> },
    { key: "repartidores", label: "Repartidores", roles: ["Admin"], render: () => <DeliverersPage isEmbedded /> },
];

export const UsersAndDeliverers = () => (
    <SectionTabsPage
        title="Usuarios"
        description="Las cuentas de quienes usan el sistema y los repartidores."
        sections={SECTIONS}
    />
);
