import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from '../contexts/SnackbarContext'; // Asumiendo que SnackbarContext.tsx está en src/contexts
import { signIn as authSignIn, signOut as authSignOut } from '../services/AuthService';
import type { LoginFormInputs, User } from '../types/user.types';

interface UseAuthReturn {
  loading: boolean;
  login: (credentials: LoginFormInputs) => Promise<User | null>;
  logout: () => Promise<void>;
}

export const useAuth = (): UseAuthReturn => {
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();

  const login = useCallback(
    async (credentials: LoginFormInputs): Promise<User | null> => {
      if (!credentials.email || !credentials.password) {
        showSnackbar('Por favor, ingrese correo y contraseña.', 'error');
        return null;
      }
      // Validación básica de formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(credentials.email)) {
        showSnackbar('Por favor, ingrese un correo electrónico válido.', 'error');
        return null;
      }

      setLoading(true);
      try {
        const user = await authSignIn(credentials);
        showSnackbar('Inicio de sesión exitoso.', 'success');
        navigate('/service-orders', { replace: true });
        return user;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error al iniciar sesión.';
        showSnackbar(errorMessage, 'error');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [navigate, showSnackbar]
  );

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authSignOut();
      showSnackbar('Sesión cerrada exitosamente.', 'success');
      navigate('/login', { replace: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al cerrar sesión.';
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [navigate, showSnackbar]);

  return { loading, login, logout };
}; 