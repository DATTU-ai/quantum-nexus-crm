const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const TOKEN_STORAGE_KEY = "dattu.crm.token";
const RETURN_URL_KEY = "dattu.crm.returnUrl";
const AUTH_REDIRECT_EVENT = "crm:auth-required";
const DEBUG_API = import.meta.env.DEV || import.meta.env.VITE_DEBUG_API === "true";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  formData?: FormData;
  headers?: HeadersInit;
  skipAuth?: boolean;
};

type AuthTokenStorage = "local" | "session";

const getStoredToken = () =>
  window.sessionStorage.getItem(TOKEN_STORAGE_KEY) ??
  window.localStorage.getItem(TOKEN_STORAGE_KEY);

export const storeAuthToken = (token: string, storage: AuthTokenStorage = "local") => {
  if (storage === "session") {
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } else {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  }
};

export const clearAuthToken = () => {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
};

const maskToken = (value?: string | null) => {
  if (!value) return "missing";
  if (value.length <= 10) return `${value.slice(0, 4)}...`;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const redirectToLogin = () => {
  if (window.location.pathname === "/login") return;
  const returnUrl = `${window.location.pathname}${window.location.search}`;
  window.sessionStorage.setItem(RETURN_URL_KEY, returnUrl);
  window.dispatchEvent(new CustomEvent(AUTH_REDIRECT_EVENT));
};

const ensureToken = async () => {
  const existingToken = getStoredToken();
  if (existingToken) return existingToken;
  redirectToLogin();
  throw new Error("Authentication required. Redirecting to login.");
};

const headersToLog = (headers: Headers) => {
  const entries = Array.from(headers.entries());
  return entries.reduce<Record<string, string>>((accumulator, [key, value]) => {
    accumulator[key] = key.toLowerCase() === "authorization" ? maskToken(value) : value;
    return accumulator;
  }, {});
};

export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const headers = new Headers(options.headers);

  if (!options.skipAuth) {
    const token = await ensureToken();
    headers.set("Authorization", `Bearer ${token}`);
  }

  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  const url = `${API_BASE_URL}${path}`;
  if (DEBUG_API) {
    console.debug("[API] Request", {
      url,
      method: options.method || "GET",
      headers: headersToLog(headers),
    });
  }

  const response = await fetch(url, {
    method: options.method || "GET",
    headers,
    body,
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  let payload: unknown = undefined;

  if (response.status !== 204) {
    if (isJson) {
      try {
        payload = await response.json();
      } catch (error) {
        if (response.ok) {
          throw error;
        }
        payload = undefined;
      }
    } else {
      payload = await response.text().catch(() => undefined);
    }
  }

  if (DEBUG_API) {
    console.debug("[API] Response", {
      url,
      status: response.status,
      payload,
    });
  }

  if (response.status === 401 && !options.skipAuth) {
    clearAuthToken();
    redirectToLogin();
  }

  if (!response.ok) {
    const message =
      isJson && payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: string }).message)
        : `Request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return payload as T;
};
