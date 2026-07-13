import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
  timestamp: string;
};

/** Field path → messages. Matches BE `common/validation.ts`. */
export type FieldErrors = Record<string, string[]>;

export type ApiFailure = {
  success: false;
  message: string;
  code?: string;
  errors?: FieldErrors | null;
  timestamp: string;
  path?: string;
};

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let accessTokenMemory: string | null = null;

export function setAccessToken(token: string | null) {
  accessTokenMemory = token;
}

export function getAccessToken() {
  return accessTokenMemory;
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessTokenMemory) {
    config.headers.Authorization = `Bearer ${accessTokenMemory}`;
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken() {
  const { data } = await api.post<
    ApiSuccess<{ accessToken: string; refreshToken: string }>
  >("/auth/refresh-token", {});
  setAccessToken(data.data.accessToken);
  return data.data.accessToken;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiFailure>) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !original.url?.includes("/auth/login") &&
      !original.url?.includes("/auth/refresh-token")
    ) {
      original._retry = true;
      try {
        refreshing = refreshing ?? refreshAccessToken();
        const token = await refreshing;
        refreshing = null;
        if (token) {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        }
      } catch {
        refreshing = null;
        setAccessToken(null);
      }
    }

    return Promise.reject(error);
  },
);

/**
 * Flatten API `errors` into one readable sentence for toasts / UI.
 * Prefer this over the generic top-level message when field errors exist.
 */
export function formatFieldErrors(errors: unknown): string | null {
  if (!errors || typeof errors !== "object") return null;

  const record = errors as Record<string, unknown>;

  // Legacy Zod flatten shape
  if ("fieldErrors" in record || "formErrors" in record) {
    return formatFieldErrors({
      ...(record.fieldErrors as FieldErrors),
      ...((record.formErrors as string[] | undefined)?.length
        ? { _form: record.formErrors as string[] }
        : {}),
    });
  }

  const parts: string[] = [];
  for (const value of Object.values(record)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string" && item.trim()) {
          parts.push(item.trim());
        }
      }
    } else if (typeof value === "string" && value.trim()) {
      parts.push(value.trim());
    }
  }

  if (!parts.length) return null;
  return [...new Set(parts)].join(". ");
}

const GENERIC_MESSAGES = new Set([
  "Validation failed",
  "Bad Request",
  "Request failed with status code 400",
]);

/**
 * Human-readable API/unknown error for Sonner and inline UI.
 * Always prefer field-level Zod messages over generic titles.
 */
export function getErrorMessage(error: unknown) {
  if (axios.isAxiosError<ApiFailure>(error)) {
    const data = error.response?.data;
    const fromFields = formatFieldErrors(data?.errors);
    const top = data?.message?.trim();

    if (fromFields) {
      if (!top || GENERIC_MESSAGES.has(top)) return fromFields;
      // Same content already covered by fields
      if (fromFields.includes(top) || top.includes(fromFields)) return fromFields;
      return fromFields;
    }

    if (top) return top;
    return error.message || "Something went wrong";
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

export function getFieldErrors(error: unknown): FieldErrors | null {
  if (!axios.isAxiosError<ApiFailure>(error)) return null;
  const errors = error.response?.data?.errors;
  if (!errors || typeof errors !== "object") return null;
  if ("fieldErrors" in errors) {
    const nested = (errors as { fieldErrors?: FieldErrors }).fieldErrors;
    return nested ?? null;
  }
  return errors as FieldErrors;
}
