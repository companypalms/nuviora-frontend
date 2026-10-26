import Axios from 'axios'

const axios = Axios.create({
    baseURL: import.meta.env.VITE_BACKEND_API_URL,
    headers: {
        'X-Requested-With': 'XMLHttpRequest',
    },
    withCredentials: true,
    withXSRFToken: true,
})

// Set the Bearer auth token.
const setBearerToken = (token: string) => {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
}

export { axios, setBearerToken }