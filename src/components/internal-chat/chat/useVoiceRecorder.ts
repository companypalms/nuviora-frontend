// Nota de voz para el chat interno: graba con el micrófono y entrega un archivo de audio al terminar.
import { useCallback, useEffect, useRef, useState } from "react";
import dayjs from "dayjs";

/** A los 5 minutos se corta y se envía sola (unos 2 MB). */
const MAX_SECONDS = 300;

/** El primer formato que el navegador sabe grabar (Chrome: webm, Firefox: ogg, Safari: mp4). */
const pickMimeType = () =>
    ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported?.(t));

const extensionFor = (mime: string) => (mime.includes("ogg") ? "ogg" : mime.includes("mp4") ? "m4a" : "webm");

export const useVoiceRecorder = (onRecorded: (file: File) => void) => {
    const [recording, setRecording] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const sendRef = useRef(true);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const onRecordedRef = useRef(onRecorded);
    onRecordedRef.current = onRecorded;

    const supported = typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";

    const clearTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
    };

    const stop = useCallback((send: boolean) => {
        const recorder = recorderRef.current;
        if (!recorder || recorder.state === "inactive") return;
        sendRef.current = send;
        recorder.stop();
        clearTimer();
        setRecording(false);
    }, []);

    /** Pide el micrófono y empieza a grabar. Lanza un Error si no hay permiso. */
    const start = useCallback(async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = pickMimeType();
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        recorderRef.current = recorder;
        chunksRef.current = [];
        sendRef.current = true;
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
            stream.getTracks().forEach((t) => t.stop());
            if (!sendRef.current || chunksRef.current.length === 0) return;
            const type = (recorder.mimeType || mimeType || "audio/webm").split(";")[0];
            const blob = new Blob(chunksRef.current, { type });
            onRecordedRef.current(new File([blob], `nota-de-voz-${dayjs().format("YYYYMMDD-HHmmss")}.${extensionFor(type)}`, { type }));
        };
        recorder.start();
        setSeconds(0);
        setRecording(true);
        timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    }, []);

    useEffect(() => {
        if (recording && seconds >= MAX_SECONDS) stop(true);
    }, [recording, seconds, stop]);

    // Al salir de la pantalla se suelta el micrófono sin enviar
    useEffect(() => () => {
        clearTimer();
        const recorder = recorderRef.current;
        if (recorder && recorder.state !== "inactive") {
            sendRef.current = false;
            recorder.stop();
        }
    }, []);

    return { supported, recording, seconds, start, stop };
};
