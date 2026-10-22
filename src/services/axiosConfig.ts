// src/services/axiosConfig.ts
import axios, { type AxiosResponse, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { supabase } from './supabaseClient';

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

// Keep the stored token in step with Supabase, which refreshes the session on its own.
supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.access_token) localStorage.setItem('token', session.access_token);
});

/** Current access token: the live Supabase session (refreshed before it expires), else the stored one. */
const currentAccessToken = async (): Promise<string | null> => {
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) return data.session.access_token;
  } catch {
    /* Fall back to the token stored at sign in. */
  }
  return localStorage.getItem('token');
};

type RetriableConfig = InternalAxiosRequestConfig & { _sessionRetried?: boolean };

// --- Interceptor de Solicitud (Request) ---
axiosInstance.interceptors.request.use(
  async (config) => {
    // A retry after refreshing already carries the new token.
    if ((config as RetriableConfig)._sessionRetried && config.headers.Authorization) return config;
    const token = await currentAccessToken();
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

const SESSION_CLOSED = Symbol('session-closed');

/**
 * One refresh attempt before treating a 401 as a closed session. Errors of the
 * retried request itself propagate as usual instead of signing the user out.
 */
const retryWithRefreshedSession = async (error: AxiosError): Promise<unknown> => {
  const config = error.config as RetriableConfig | undefined;
  if (!config || config._sessionRetried) return SESSION_CLOSED;
  config._sessionRetried = true;
  let token: string | undefined;
  try {
    const { data } = await supabase.auth.refreshSession();
    token = data.session?.access_token;
  } catch {
    return SESSION_CLOSED;
  }
  if (!token) return SESSION_CLOSED;
  localStorage.setItem('token', token);
  config.headers.Authorization = `Bearer ${token}`;
  return axiosInstance.request(config);
};

// --- Interceptor de Respuesta (Response) ---
axiosInstance.interceptors.response.use(
  // Esta función se dispara para cualquier código de estado en el rango de 2xx
  (response: AxiosResponse) => {
    // Devuelve directamente la data de la respuesta, simplificando el manejo en los servicios
    return response.data;
  },
  // Esta función se dispara para cualquier código de estado fuera del rango de 2xx
  async (error: AxiosError) => {
    let formattedMessage = 'Ocurrió un error inesperado.';
    const statusCode = error.response?.status || 0;
    const errorData = error.response?.data as { message?: string; error?: string };

    if (statusCode === 401) {
      // An expired access token is renewed transparently; only a dead session signs out.
      const retried = await retryWithRefreshedSession(error);
      if (retried !== SESSION_CLOSED) return retried;

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
