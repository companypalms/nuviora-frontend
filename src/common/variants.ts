// Tarea 4: ayudas para las cantidades por talla o variante ({variant_id: cantidad}).

/** Suma de lo repartido por variante. */
export const variantSum = (value: Record<number, number>) =>
    Object.values(value).reduce((a, b) => a + (Number(b) || 0), 0);

/** Para enviar: en un reparto, solo las mayores que 0; en un ajuste, todas las que se tocaron. */
export const variantPayload = (value: Record<number, number>, mode: 'split' | 'absolute' = 'split') =>
    Object.fromEntries(Object.entries(value).filter(([, q]) => mode === 'absolute' || (Number(q) || 0) > 0));
