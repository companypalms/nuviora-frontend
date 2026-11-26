// src/components/meta-ads/productSheetShared.ts
// .180: lo que comparten la hoja de un producto (productSheet.tsx), "Ver el producto" del encargo y "Productos" del líder.
import type { StoredFile } from "./fileUpload";
import type { AngleInfo, PersonaInfo, ProductInfo } from "./productProfile";

/** Lo que tiene la hoja de un producto (ProductCatalog::sheets del servidor; en un encargo, lo del encargo). */
export type ProductSheetData = {
    product: string; info?: ProductInfo | null; personas?: PersonaInfo[]; angles?: AngleInfo[]; photos?: StoredFile[]; strategy?: StoredFile[];
};

/** "La ficha completa, 2 fotos y 1 PDF de estrategia". */
export const sheetSummary = (d: ProductSheetData) => {
    const photos = d.photos?.length ?? 0;
    const docs = d.strategy?.length ?? 0;
    const parts = [d.info ? "la ficha completa" : null, photos ? `${photos} ${photos === 1 ? "foto" : "fotos"}` : null,
        docs ? `${docs} PDF de estrategia` : null].filter(Boolean) as string[];
    const text = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}` : parts[0] ?? "";
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
};

/** La foto principal (la primera que se pueda ver). */
export const coverOf = (d: ProductSheetData) => d.photos?.find((f) => f.url)?.url ?? null;
