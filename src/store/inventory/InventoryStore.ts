import { create } from 'zustand';

interface Product {
    id: number;
    sku?: string | null;
    title?: string | null;
    name?: string | null;
    price: number;
    cost: number;
    currency: string;
    stock: number;
    image?: string | null;
}

interface InventoryState {
    products: Product[];
    loading: boolean;
    setProducts: (p: Product[]) => void;
    addOrUpdate: (p: Product) => void;
    setLoading: (v: boolean) => void;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
    products: [],
    loading: false,
    setProducts: (p) => set({ products: p }),
    addOrUpdate: (p) => {
        const items = get().products;
        const idx = items.findIndex(i => i.id === p.id);
        if (idx >= 0) {
            const clone = [...items];
            clone[idx] = p;
            set({ products: clone });
        } else {
            set({ products: [p, ...items] });
        }
    },
    setLoading: (v) => set({ loading: v }),
}));