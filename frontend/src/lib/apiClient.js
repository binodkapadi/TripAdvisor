import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export function createApiClient({ token } = {}) {
  const instance = axios.create({
    baseURL: apiBaseUrl,
    timeout: 120000,
    withCredentials: true,
  })

  instance.interceptors.request.use((config) => {
    let currentToken = token
    if (!currentToken) {
      currentToken = localStorage.getItem('authToken')
    }
    if (currentToken) {
      config.headers.Authorization = `Bearer ${currentToken}`
    }
    return config
  })

  return instance
}

