const TOKEN_KEY = "archlens_token";
const USER_KEY = "archlens_user";

export interface AuthUser {
  username: string;
  role: string;
  expiresAt: number;
}

export function getToken(): string | null {
  if (globalThis.window === undefined) return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  if (globalThis.window === undefined) return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    const user = JSON.parse(raw) as AuthUser;
    if (user.expiresAt < Date.now()) {
      logout();
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

export function setAuth(token: string, username: string, role: string, expiresInMinutes: number): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(
    USER_KEY,
    JSON.stringify({
      username,
      role,
      expiresAt: Date.now() + expiresInMinutes * 60 * 1000,
    })
  );
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return getUser() !== null;
}
