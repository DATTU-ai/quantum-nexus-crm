const BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "https://dattu-crm-backend.onrender.com"
)
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");
const TOKEN_STORAGE_KEY = "token";
const RETURN_URL_KEY = "dattu.crm.returnUrl";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  formData?: FormData;
  headers?: HeadersInit;
  skipAuth?: boolean;
};

type AuthTokenStorage = "local" | "session";

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

const buildApiUrl = (path: string) => {
  if (isAbsoluteUrl(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_URL}${normalizedPath}`;
};

const redirectToLogin = () => {
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/login") return;

  const returnUrl = `${window.location.pathname}${window.location.search}`;
  window.sessionStorage.setItem(RETURN_URL_KEY, returnUrl);
  window.location.assign("/login");
};

export const getStoredAuthToken = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
};

export const hasStoredAuthToken = () => Boolean(getStoredAuthToken());

export const storeAuthToken = (token: string, _storage: AuthTokenStorage = "local") => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
};

export const clearAuthToken = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
};

export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  try {
    const token =
      typeof window === "undefined" ? null : window.localStorage.getItem("token");
    const headers = new Headers(options.headers);

    if (!options.formData && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    headers.set("Authorization", token ? `Bearer ${token}` : "");

    let body: BodyInit | undefined;
    if (options.formData) {
      body = options.formData;
    } else if (options.body !== undefined) {
      body = JSON.stringify(options.body);
    }

    const response = await fetch(buildApiUrl(path), {
      method: options.method || "GET",
      headers,
      body,
    });

    if (response.status === 401) {
      clearAuthToken();
      redirectToLogin();
    }

    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const payload =
      response.status === 204
        ? undefined
        : isJson
          ? await response.json().catch(() => undefined)
          : await response.text().catch(() => undefined);

    if (!response.ok) {
      const message =
        isJson && payload && typeof payload === "object" && "message" in payload
          ? String((payload as { message?: string }).message)
          : `Request failed with status ${response.status}.`;
      throw new Error(message);
    }

    return payload as T;
  } catch (err) {
    console.error("API ERROR:", err);
    throw err;
  }
};

