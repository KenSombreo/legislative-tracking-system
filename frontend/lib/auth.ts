export interface AuthUser {
  sub: string;
  username: string;
  email: string;
  role: "ADMIN" | "STAFF" | "VIEWER";
  fullName: string;
}

const TOKEN_KEY = "lts_token";
const USER_KEY = "lts_user";

// NOTE: localStorage is used here for development simplicity only.
// This is not safe for production (vulnerable to XSS token theft).
export function saveSession(token: string, user: AuthUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function hasRole(...roles: string[]): boolean {
  const user = getUser();
  return !!user && roles.includes(user.role);
}
