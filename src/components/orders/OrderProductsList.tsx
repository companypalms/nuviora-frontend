import React from "react";
import { Box } from "@mui/material";
import { TypographyCustom } from "../custom";
import { OrderProductItem } from "./OrderProductItem";

interface OrderProductsListProps {
    products: any[];
    currency: string;
    onDeleteItem?: (id: number) => void;
    onEditQuantity?: (id: number, quantity: number, price: number) => void; // 🔥 Added price parameter
    onChangeVariant?: (id: number, variantId: number) => void; // tarea 4: cambiar la talla
}

export const OrderProductsList: React.FC<OrderProductsListProps> = ({ products, currency, onDeleteItem, onEditQuantity, onChangeVariant }) => {
    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {products?.length > 0 ? (
                products.map((p: any) => (
                    <OrderProductItem
                        key={p.id}
                        product={p}
                        currency={currency}
                        onDelete={onDeleteItem ? () => onDeleteItem(p.id) : undefined}
                        onEditQuantity={onEditQuantity ? (qty) => onEditQuantity(p.id, qty, p.price) : undefined}
                        onChangeVariant={onChangeVariant ? (variantId) => onChangeVariant(p.id, variantId) : undefined}
                    />
                ))
            ) : (
                <TypographyCustom variant="body2" color="text.secondary">
                    No hay productos en esta orden.
                </TypographyCustom>
            )}
        </Box>
    );
};
