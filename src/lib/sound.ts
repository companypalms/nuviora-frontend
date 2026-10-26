// Sonido de notificación para el chat interno.
// Generado con Web Audio API (un "ding-dong" corto) para no depender de
// ningún archivo de audio. Se crea/reanuda el contexto de forma perezosa;
// los navegadores permiten reproducir tras la primera interacción del usuario.

let audioCtx: AudioContext | null = null;

export function playNotificationSound() {
    try {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) return;

        if (!audioCtx) audioCtx = new Ctx();
        if (audioCtx.state === "suspended") {
            // Reanudar si el navegador lo suspendió (política de autoplay).
            audioCtx.resume().catch(() => {});
        }

        const ctx = audioCtx;
        const now = ctx.currentTime;

        // Dos tonos cortos ascendentes (campanita agradable).
        const notes = [
            { freq: 880, start: 0 },     // A5
            { freq: 1174.66, start: 0.12 }, // D6
        ];

        notes.forEach(({ freq, start }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.value = freq;

            const t0 = now + start;
            gain.gain.setValueAtTime(0.0001, t0);
            gain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t0);
            osc.stop(t0 + 0.22);
        });
    } catch {
        // Silenciar cualquier error de audio: nunca debe romper el chat.
    }
}
