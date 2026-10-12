// src/services/axiosConfig.ts
import axios, { type AxiosResponse, type AxiosError } from 'axios';

interface CustomError extends Error {
  originalError?: unknown;
  statusCode?: number;
}

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_REFA_BASE_PATH,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    ...(import.meta.env.VITE_SUPABASE_KEY
      ? { apikey: import.meta.env.VITE_SUPABASE_KEY }
      : {}),
  },
});

// --- Interceptor de Solicitud (Request) ---
axiosInstance.interceptors.request.use(
  (config) => {
    // CORRECCIÓN: Se usa 'token' en lugar de 'authToken' para que coincida con AuthService.ts
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    // Esto se dispara si hay un error al construir la solicitud
    return Promise.reject(error);
  }
);

// --- Interceptor de Respuesta (Response) ---
axiosInstance.interceptors.response.use(
  // Esta función se dispara para cualquier código de estado en el rango de 2xx
  (response: AxiosResponse) => {
    // Devuelve directamente la data de la respuesta, simplificando el manejo en los servicios
    return response.data;
  },
  // Esta función se dispara para cualquier código de estado fuera del rango de 2xx
  (error: AxiosError) => {
    let formattedMessage = 'Ocurrió un error inesperado.';
    const statusCode = error.response?.status || 0;
    const errorData = error.response?.data as { message?: string; error?: string };

    if (statusCode === 401) {
      // CORRECCIÓN: Se usa 'token' en lugar de 'authToken' para limpiar el storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Redirige a la página de login si no estamos ya en ella
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      formattedMessage = 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.';

    } else if (errorData?.message) {
      formattedMessage = errorData.message;
    } else if (errorData?.error) {
      formattedMessage = errorData.error;
    } else if (error.request) {
      formattedMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
    } else if (error.message) {
      formattedMessage = error.message;
    }

    // Creamos un nuevo objeto de error con el mensaje formateado para ser usado en la UI
    const customError = new Error(formattedMessage) as CustomError;
    // Podemos adjuntar información extra si es necesario
    customError.originalError = error;
    customError.statusCode = statusCode;
    
    return Promise.reject(customError);
  }
);

export default axiosInstance;
