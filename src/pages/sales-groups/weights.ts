// Reglas y cuentas de la lista de % de un grupo, iguales a las del backend (GroupWeights y EffectiveWeights).
// Las usan "Grupos de venta" (Admin) y "Mi grupo" (Líder).

export interface PctEntry {
    id: number;
    name: string;
    pct: number | null;
}

export const fmtPct = (n: number) => `${Number(n.toFixed(2)).toLocaleString("es-VE")} %`;

/** Lo que recibiría cada una del total del grupo si hoy vinieran todas (de 0 a 1). */
export function groupShares(leader: PctEntry | null, sellers: PctEntry[]): Record<number, number> {
    const set = sellers.filter((s) => s.pct !== null).map((s) => s.pct as number);
    const average = set.length ? set.reduce((a, v) => a + v, 0) / set.length : 1;
    const shares = sellers.map((s) => ({ id: s.id, share: s.pct ?? average }));
    const sum = shares.reduce((a, s) => a + s.share, 0);
    const n = sellers.length;
    const weights: Record<number, number> = {};
    shares.forEach((s) => (weights[s.id] = sum > 0 ? (n * s.share) / sum : 0));
    if (leader) {
        const p = leader.pct;
        weights[leader.id] = p === null ? 1 : p <= 0 ? 0 : sum <= 0 || p >= 100 ? Math.max(n, 1) : (n * p) / (100 - p);
    }
    const total = Object.values(weights).reduce((a, v) => a + v, 0);
    return Object.fromEntries(Object.entries(weights).map(([id, w]) => [id, total > 0 ? w / total : 0]));
}

/** Mismas reglas que GroupWeights::validate en el backend. null si la lista es válida. */
export function weightsError(leader: PctEntry | null, sellers: PctEntry[], leaderMissing?: string): string | null {
    const all = [...(leader ? [leader] : []), ...sellers];
    if (all.some((e) => e.pct !== null && (Number.isNaN(e.pct) || e.pct < 0 || e.pct > 100))) {
        return "Cada % tiene que estar entre 0 y 100.";
    }
    const missing = sellers.filter((s) => s.pct === null);
    const filled = sellers.length - missing.length;
    const total = sellers.reduce((a, s) => a + (s.pct ?? 0), 0) + (leader?.pct ?? 0);

    if (filled > 0 && missing.length > 0) {
        return `Falta el % de ${missing.map((s) => s.name).join(", ")}. Ponlo, o deja vacías a todas las vendedoras para que se repartan parejo.`;
    }
    if (filled > 0 && leader && leader.pct === null) return leaderMissing ?? `Falta el % de la Líder, ${leader.name}.`;
    if (filled > 0 && Math.abs(total - 100) > 0.01) {
        return `Suman ${fmtPct(total)}: ${total > 100 ? "sobran" : "faltan"} ${fmtPct(Math.abs(100 - total))}. Tienen que sumar 100 %.`;
    }
    if (filled === 0 && sellers.length > 0 && leader?.pct != null && leader.pct >= 100) {
        return "Si la Líder recibe el 100 %, pon 0 % a las vendedoras.";
    }
    return null;
}

/** Texto bajo una lista válida. */
export function weightsSummary(leader: PctEntry | null, sellers: PctEntry[]): { text: string; ok: boolean } | null {
    if (sellers.length === 0) return null;
    if (sellers.some((s) => s.pct !== null)) return { text: "Total: 100 %", ok: true };
    if (leader?.pct != null) return { text: `Las vendedoras se reparten parejo el ${fmtPct(100 - leader.pct)} que no recibe la Líder.`, ok: false };
    return { text: leader ? "Todo vacío: parejo, la Líder recibe igual que una vendedora." : "Todo vacío: parejo.", ok: false };
}
