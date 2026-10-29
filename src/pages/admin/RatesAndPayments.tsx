// Configuración → Tasa y pagos: la tasa del día y los datos de pago que casi no cambian (cuentas de la empresa y bancos).
import { SectionTabsPage, PageSection } from "../../components/ui/SectionTabsPage";
import { Currency } from "../currency/Currency";
import { CompanyAccounts } from "./CompanyAccounts";
import { Banks } from "./Banks";

const SECTIONS: PageSection[] = [
    { key: "tasa", label: "Tasa del dólar", roles: ["Admin"], render: () => <Currency isEmbedded /> },
    { key: "cuentas", label: "Cuentas de la empresa", roles: ["Admin", "Gerente"], render: () => <CompanyAccounts isEmbedded /> },
    { key: "bancos", label: "Bancos", roles: ["Admin", "Gerente"], render: () => <Banks isEmbedded /> },
];

export const RatesAndPayments = () => (
    <SectionTabsPage
        title="Tasa y pagos"
        description="La tasa del día y las cuentas y bancos con que la empresa cobra y paga vueltos."
        sections={SECTIONS}
    />
);
