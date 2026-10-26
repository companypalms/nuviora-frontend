import { create } from "zustand";
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { axios } from "../../lib/axios";
import { useUserStore } from "../user/UserStore";
import { getCookieValue } from "../../lib/functions";

window.Pusher = Pusher

interface State {
    echo: Echo<any> | null;
    setSocket: () => void;
}
export const useSocketStore = create<State>((set) => ({
    echo: null,
    setSocket: () => {
        try {
            const echo = new Echo({
                broadcaster: 'reverb',
                key: import.meta.env.VITE_REVERB_APP_KEY,
                authorizer: (channel: any) => {
                    return {
                        authorize: (socketId: any, callback: any) => {
                            // console.log({ socketId })
                            const token = useUserStore.getState().user.token ?? getCookieValue('token');

                            axios
                                .post('/broadcasting/auth', {
                                    socket_id: socketId,
                                    channel_name: channel.name,
                                }, {
                                    headers: {
                                        'Authorization': `Bearer ${token}`
                                    }
                                })
                                .then((response: any) => {
                                    callback(false, response.data)
                                })
                                .catch((error: any) => {
                                    callback(true, error)
                                })
                        },
                    }
                },
                wsHost: import.meta.env.VITE_REVERB_HOST,
                wsPort: import.meta.env.VITE_REVERB_PORT,
                wssPort: import.meta.env.VITE_REVERB_PORT,
                forceTLS:
                    (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
                enabledTransports: ['ws', 'wss'],
            })
            set({ echo })
        } catch (error) {
            console.log({ error })
        }
    },
}))