import { getCookieValue } from "../lib/functions";
import { useUserStore } from "../store/user/UserStore";

type Method = "POST" | "GET" | "PUT" | "DELETE";
type BodyType = URLSearchParams | FormData | string | any | undefined;

export const request = async (
    _url: string,
    method: Method,
    body?: BodyType,
    multipartOrSignal: boolean | AbortSignal = false
) => {
    // Handle overloaded parameter: multipart boolean OR AbortSignal
    let multipart = false;
    let signal: AbortSignal | undefined = undefined;

    if (typeof multipartOrSignal === 'boolean') {
        multipart = multipartOrSignal;
    } else if (multipartOrSignal) {
        signal = multipartOrSignal;
    }

    const url = `${import.meta.env.VITE_BACKEND_API_URL}${_url}`;
    const token =
        useUserStore.getState().user.token ?? getCookieValue("token");

    const headers: Record<string, string> = {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
    };

    // Auto-detect Content-Type if not multipart and there's a body
    if (!multipart && body && method !== "GET") {
        if (typeof body === 'string') {
            headers["Content-Type"] = "application/json";
        } else if (!(body instanceof URLSearchParams) && !(body instanceof FormData)) {
            headers["Content-Type"] = "application/json";
        } else if (body instanceof URLSearchParams) {
            headers["Content-Type"] = "application/x-www-form-urlencoded";
        }
    }

    const options: RequestInit = {
        method,
        headers,
        signal, // Add signal for abort support
    };

    let finalBody = body;
    if (method !== "GET" && body) {
        if (!(body instanceof URLSearchParams) && !(body instanceof FormData) && typeof body !== "string") {
            finalBody = JSON.stringify(body);
            headers["Content-Type"] = "application/json";
        }
        options.body = finalBody as any;
    }

    try {
        const response = await fetch(url, options);
        return { ok: response.ok, status: response.status, response, err: [] };
    } catch (err) {
        return { ok: false, status: 500, response: {} as any, err };
    }
};
