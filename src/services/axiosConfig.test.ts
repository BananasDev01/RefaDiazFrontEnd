import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '../mocks/server';

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  refreshSession: vi.fn(),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
}));
vi.mock('./supabaseClient', () => ({ supabase: { auth }, default: { auth } }));

const { default: api } = await import('./axiosConfig');
const apiBaseUrl = import.meta.env.VITE_API_REFA_BASE_PATH || '/api';
const session = (token: string) => ({ data: { session: { access_token: token } }, error: null });

describe('sesión en las llamadas al API', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'token-del-login');
    localStorage.setItem('user', JSON.stringify({ id: 'u1' }));
    vi.clearAllMocks();
  });

  it('usa el token vigente de la sesión de Supabase en lugar del guardado al iniciar sesión', async () => {
    auth.getSession.mockResolvedValue(session('token-renovado'));
    let header: string | null = null;
    server.use(http.get(`${apiBaseUrl}/ping`, ({ request }) => { header = request.headers.get('Authorization'); return HttpResponse.json({ ok: true }); }));
    await expect(api.get('/ping')).resolves.toEqual({ ok: true });
    expect(header).toBe('Bearer token-renovado');
  });

  it('ante un 401 renueva la sesión y repite la llamada sin sacar al usuario', async () => {
    auth.getSession.mockResolvedValue(session('token-vencido'));
    auth.refreshSession.mockResolvedValue(session('token-nuevo'));
    server.use(http.get(`${apiBaseUrl}/ping`, ({ request }) => (
      request.headers.get('Authorization') === 'Bearer token-nuevo'
        ? HttpResponse.json({ ok: true })
        : HttpResponse.json({ error: 'Token inválido o expirado' }, { status: 401 })
    )));
    await expect(api.get('/ping')).resolves.toEqual({ ok: true });
    expect(auth.refreshSession).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('token')).toBe('token-nuevo');
    expect(localStorage.getItem('user')).not.toBeNull();
  });

  it('si la sesión ya no se puede renovar, la cierra', async () => {
    auth.getSession.mockResolvedValue(session('token-vencido'));
    auth.refreshSession.mockResolvedValue({ data: { session: null }, error: new Error('Refresh Token Not Found') });
    server.use(http.get(`${apiBaseUrl}/ping`, () => HttpResponse.json({ error: 'Token inválido' }, { status: 401 })));
    await expect(api.get('/ping')).rejects.toThrow('Tu sesión ha expirado');
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('un error del reintento llega a la pantalla sin cerrar la sesión', async () => {
    auth.getSession.mockResolvedValue(session('token-vencido'));
    auth.refreshSession.mockResolvedValue(session('token-nuevo'));
    server.use(http.get(`${apiBaseUrl}/ping`, ({ request }) => (
      request.headers.get('Authorization') === 'Bearer token-nuevo'
        ? HttpResponse.json({ error: 'Falla del servidor' }, { status: 500 })
        : HttpResponse.json({ error: 'Token inválido' }, { status: 401 })
    )));
    await expect(api.get('/ping')).rejects.toThrow('Falla del servidor');
    expect(localStorage.getItem('user')).not.toBeNull();
  });
});
