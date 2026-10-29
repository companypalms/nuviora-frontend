// Configuración → Integraciones: las páginas técnicas que casi no se tocan, juntas en una.
import { SectionTabsPage, PageSection } from "../../components/ui/SectionTabsPage";
import { WhatsappTemplates } from "./WhatsappTemplates";
import { MetaAdsSettings } from "./MetaAdsSettings";
import { WebhooksPage } from "./WebhooksPage";
import { MediaExplorerPage } from "./MediaExplorerPage";

const SECTIONS: PageSection[] = [
    { key: "whatsapp", label: "Plantillas WhatsApp", roles: ["Admin"], render: () => <WhatsappTemplates isEmbedded /> },
    { key: "meta", label: "Meta Ads", roles: ["Admin"], render: () => <MetaAdsSettings isEmbedded /> },
    { key: "webhooks", label: "Webhooks (n8n)", roles: ["Admin"], render: () => <WebhooksPage isEmbedded /> },
    { key: "medios", label: "Biblioteca de medios", roles: ["Admin", "Gerente"], render: () => <MediaExplorerPage isEmbedded /> },
];

export const Integrations = () => (
    <SectionTabsPage
        title="Integraciones"
        description="Conexiones con WhatsApp, Meta Ads y n8n, y los archivos que usan. Se configuran una vez y casi no se tocan."
        sections={SECTIONS}
    />
);
