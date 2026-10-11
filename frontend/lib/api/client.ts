import { getToken, clearSession } from "../auth";

// Defaults to this site's /api, which next.config.js forwards to the backend.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  body?: any;
  isFormData?: boolean;
  skipAuth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, isFormData = false, skipAuth = false } = options;

  const headers: Record<string, string> = {};
  if (!isFormData) headers["Content-Type"] = "application/json";

  if (!skipAuth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    cache: "no-store",
  });

  if (res.status === 401 && !skipAuth) {
    clearSession();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
  }

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message = data?.message
      ? Array.isArray(data.message)
        ? data.message.join(", ")
        : data.message
      : `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message);
  }

  return data as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: any) => request<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: any) => request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: "POST", body: formData, isFormData: true }),
  fileUrl: (path: string) => {
    const token = getToken();
    const separator = path.includes("?") ? "&" : "?";
    return token ? `${API_URL}${path}${separator}token=${encodeURIComponent(token)}` : `${API_URL}${path}`;
  },
};

// The public portal (kiosk and QR pages): never sends the staff login, never redirects to /login.
export const publicApi = {
  get: <T>(path: string) => request<T>(`/public${path}`, { method: "GET", skipAuth: true }),
  post: <T>(path: string, body?: any) => request<T>(`/public${path}`, { method: "POST", body, skipAuth: true }),
  fileUrl: (path: string) => `${API_URL}/public${path}`,
};

// Absolute link to a public-portal page, for QR codes. NEXT_PUBLIC_SITE_URL is the address phones
// can reach (the kiosk itself may be browsing via localhost or an internal IP).
export function publicPageUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base.replace(/\/$/, "")}${path}`;
}
