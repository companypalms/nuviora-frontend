// src/components/calendar/useCalendarActions.tsx
// Lo que se puede hacer con una cosa del calendario, igual en el Calendario y en el cuadro "Hoy" del Dashboard: tildar,
// descartar, deshacer y "Registrar pago" de un gasto fijo (la misma ventana de Finanzas, con el vencimiento de ese día).
// Después de cada cambio avisa (notifyCalendarChanged) para que el número de arriba se actualice.
import { useCallback, useState } from "react";
import { toast } from "react-toastify";
import { RecurringPayDialog } from "../finance/RecurringPayDialog";
import { FinanceOptions, RecurringExpense, api } from "../finance/finance";
import { CalendarItem, markItem, notifyCalendarChanged, unmarkItem } from "./calendar";

export const itemKey = (i: CalendarItem) => `${i.item_key}-${i.due_date}`;

export function useCalendarActions(onChanged: () => void) {
    const [busy, setBusy] = useState<string | null>(null);
    const [paying, setPaying] = useState<{ recurring: RecurringExpense; options: FinanceOptions; due: string } | null>(null);

    const changed = useCallback(() => {
        onChanged();
        notifyCalendarChanged();
    }, [onChanged]);

    const run = useCallback(async (item: CalendarItem, action: () => Promise<{ message: string }>) => {
        setBusy(itemKey(item));
        try {
            toast.success((await action()).message, { autoClose: 1500 });
            changed();
        } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
    }, [changed]);

    const actions = {
        onToggle: (i: CalendarItem) => run(i, () => (i.status === "done" ? unmarkItem(i) : markItem(i, "done"))),
        onDismiss: (i: CalendarItem) => run(i, () => markItem(i, "dismissed")),
        onUndo: (i: CalendarItem) => run(i, () => unmarkItem(i)),
        onPay: async (i: CalendarItem, recurringId: number) => {
            setBusy(itemKey(i));
            try {
                const [options, list] = await Promise.all([
                    api<FinanceOptions>("/finance/options"),
                    api<{ recurring: RecurringExpense[] }>("/finance/recurring-expenses"),
                ]);
                const recurring = list.recurring.find((r) => r.id === recurringId);
                if (!recurring) throw new Error("Ese gasto ya no está en Finanzas. Actualiza la página.");
                setPaying({ recurring, options, due: i.due_date });
            } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
        },
    };

    const payDialog = paying && (
        <RecurringPayDialog
            recurring={paying.recurring}
            options={paying.options}
            due={paying.due}
            onClose={() => setPaying(null)}
            onSaved={() => { setPaying(null); changed(); }}
        />
    );

    return { busy, actions, payDialog, changed };
}
