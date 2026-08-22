/**
 * Mock authentication service. With no real backend, it validates credentials
 * against an in-memory table and simulates network latency, returning the
 * shape a real `/auth/login` endpoint would. The auth store consumes it.
 */
import { MOCK_USERS } from '@/lib/constants/mock-users';
import type { AuthUser } from '@/store/useAuthStore';

/** Payload returned on a successful login: the user plus a session token. */
interface LoginResult {
  user: AuthUser;
  token: string;
}

// Simulated credential store — password matches company convention.
const CREDENTIALS: Record<string, string> = {
  'diego.salazar@constructoradelvalle.com': 'constructora123',
  'paula.restrepo@constructoradelvalle.com': 'constructora123',
  'tomas.beltran@constructoradelvalle.com': 'constructora123',
  'camilo.duarte@constructoradelvalle.com': 'constructora123',
  'isabela.nieto@constructoradelvalle.com': 'constructora123',
  'camila.rojas@flyworkflow.io': 'flyworkflow123',
  'andres.vargas@flyworkflow.io': 'flyworkflow123',
  'laura.mendez@flyworkflow.io': 'flyworkflow123',
  'santiago.ibarra@grupomeridiano.com': 'meridiano123',
  'valeria.cardenas@grupomeridiano.com': 'meridiano123',
};

/**
 * Validates credentials and resolves the matching user.
 * @throws Error with a user-facing message when credentials are invalid.
 */
export async function login(email: string, password: string): Promise<LoginResult> {
  await new Promise((r) => setTimeout(r, 450)); // simulate network round-trip

  const expected = CREDENTIALS[email.toLowerCase().trim()];
  if (!expected || expected !== password) {
    throw new Error('Credenciales inválidas. Verifica tu email y contraseña.');
  }

  const found = MOCK_USERS.find((u) => u.email === email.toLowerCase().trim());
  if (!found) throw new Error('Usuario no encontrado.');

  const user: AuthUser = {
    id: found.id,
    name: found.name,
    email: found.email,
    avatarUrl: found.avatarUrl,
    role: found.role ?? 'Usuario',
    company: found.company,
  };

  return { user, token: crypto.randomUUID() };
}

/** Simulated sign-out; the store clears the session once this resolves. */
export async function logout(): Promise<void> {
  await new Promise((r) => setTimeout(r, 100));
}
