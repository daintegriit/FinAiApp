// =====================================================
// FINAI — GLOBAL API LAYER
// src/services/api.ts
// =====================================================

import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import NetInfo from "@react-native-community/netinfo";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

import type {
  FinancialAnalysisRequest,
  FinancialAnalysisResponse,
} from "../types/financial";

/* =====================================================
   BASE URL
===================================================== */
// Read from app config so local development doesn't require editing
// this file. Falls back to production.

export const BASE_URL: string =
  (Constants.expoConfig?.extra?.apiBaseUrl as string) ||
  "https://finai-backend-466323878357.us-east1.run.app/api";

/* =====================================================
   TOKEN STORAGE
===================================================== */
// SecureStore, not AsyncStorage. AsyncStorage is unencrypted plaintext
// on disk; on a rooted or jailbroken device that is a readable file.

// These match the keys the previous AuthContext build already wrote to
// SecureStore, so shipping the interceptor doesn't invalidate existing
// sessions and log everyone out on update.
const ACCESS_TOKEN_KEY = "finai_access_token";
const REFRESH_TOKEN_KEY = "finai_refresh_token";

export async function setTokens(
  accessToken: string,
  refreshToken: string
): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY).catch(() => {}),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {}),
  ]);
}

/* =====================================================
   LOGOUT CALLBACK
===================================================== */
// AuthContext registers a handler here so a failed refresh can drop
// the user to the login screen without this module importing React.

type LogoutHandler = () => void;

let onAuthFailure: LogoutHandler | null = null;

export function registerLogoutHandler(handler: LogoutHandler): void {
  onAuthFailure = handler;
}

/* =====================================================
   AXIOS INSTANCE
===================================================== */

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 45000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

/* =====================================================
   PUBLIC ROUTES
===================================================== */
// These must never carry a token and must never trigger a refresh
// retry, or a failed login would recurse.

const PUBLIC_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/google",
  "/auth/apple",
  "/auth/refresh",
  "/auth/forgot-password",
  "/auth/reset-password",
];

function isPublicPath(url?: string): boolean {
  if (!url) return false;
  return PUBLIC_PATHS.some((p) => url.startsWith(p));
}

/* =====================================================
   REQUEST INTERCEPTOR
===================================================== */

api.interceptors.request.use(
  async (request: InternalAxiosRequestConfig) => {
    const netState = await NetInfo.fetch();
    if (netState.isConnected === false) {
      return Promise.reject({
        backendMessage:
          "No internet connection. Please check your network and try again.",
        isOffline: true,
      });
    }

    if (!isPublicPath(request.url)) {
      const token = await getAccessToken();
      if (token) {
        request.headers.set("Authorization", `Bearer ${token}`);
      }
    }

    // Request bodies contain income, debt, and savings figures, and
    // headers now contain a bearer token. Never log either in release.
    if (__DEV__) {
      console.log("API REQUEST", {
        method: request.method,
        url: `${request.baseURL}${request.url}`,
      });
    }

    return request;
  },
  (error) => {
    if (__DEV__) console.error("REQUEST ERROR", error);
    return Promise.reject(error);
  }
);

/* =====================================================
   REFRESH MUTEX
===================================================== */
// Ten parallel calls hitting a stale token would otherwise fire ten
// refreshes, nine of which race and lose. Queue them behind one.

let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function flushQueue(error: unknown, token: string | null): void {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (token) resolve(token);
    else reject(error);
  });
  refreshQueue = [];
}

async function performRefresh(): Promise<string> {
  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  // Bare axios, not `api` — going through the instance would re-enter
  // these interceptors.
  const response = await axios.post(
    `${BASE_URL}/auth/refresh`,
    { refresh_token: refreshToken },
    { headers: { "Content-Type": "application/json" }, timeout: 15000 }
  );

  const accessToken = response.data?.access_token;
  const newRefreshToken = response.data?.refresh_token;

  if (!accessToken) {
    throw new Error("Refresh response missing access token");
  }

  await setTokens(accessToken, newRefreshToken || refreshToken);

  return accessToken;
}

/* =====================================================
   RESPONSE INTERCEPTOR
===================================================== */

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

api.interceptors.response.use(
  (response: AxiosResponse) => {
    if (__DEV__) {
      console.log("API RESPONSE", {
        status: response.status,
        url: response.config.url,
      });
    }
    return response;
  },

  async (error: AxiosError<any>) => {
    const originalRequest = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    // ----- 401: try refresh once, then log out -----
    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isPublicPath(originalRequest.url)
    ) {
      if (isRefreshing) {
        // Wait for the in-flight refresh rather than starting another.
        return new Promise((resolve, reject) => {
          refreshQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.set("Authorization", `Bearer ${token}`);
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await performRefresh();
        flushQueue(null, newToken);
        originalRequest.headers.set("Authorization", `Bearer ${newToken}`);
        return api(originalRequest);
      } catch (refreshError) {
        flushQueue(refreshError, null);
        await clearTokens();
        if (onAuthFailure) onAuthFailure();
        return Promise.reject({
          ...error,
          isAuthFailure: true,
          backendMessage: "Your session has expired. Please sign in again.",
        });
      } finally {
        isRefreshing = false;
      }
    }

    // ----- Message extraction -----
    const detail = (error.response?.data as any)?.detail;

    let backendMessage: string;

    if (typeof detail === "string") {
      backendMessage = detail;
    } else if (Array.isArray(detail)) {
      backendMessage = detail
        .map((d: any) => {
          const field = Array.isArray(d?.loc) ? d.loc.join(".") : "field";
          return `${field}: ${d?.msg || "invalid value"}`;
        })
        .join(" | ");
    } else {
      backendMessage =
        detail?.message ||
        (error.response?.data as any)?.message ||
        (error.response?.data as any)?.error ||
        error.message ||
        "Unknown API error";
    }

    // ----- 402: quota exhausted -----
    // Flagged explicitly so screens can open the paywall instead of
    // showing a generic red error banner.
    if (status === 402) {
      return Promise.reject({
        ...error,
        isQuotaExceeded: true,
        quota: {
          limit: detail?.limit ?? null,
          used: detail?.used ?? null,
          remaining: detail?.remaining ?? 0,
          period: detail?.period ?? null,
        },
        backendMessage,
      });
    }

    // ----- 403: banned or insufficient privileges -----
    if (status === 403) {
      return Promise.reject({
        ...error,
        isForbidden: true,
        backendMessage,
      });
    }

    if (__DEV__) {
      console.error("API ERROR", {
        url: error.config?.url,
        status,
        message: backendMessage,
      });
    }

    return Promise.reject({ ...error, backendMessage });
  }
);

/* =====================================================
   SAFE NUMBER
===================================================== */

function safeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/* =====================================================
   NORMALIZE ANALYSIS
===================================================== */

function normalizeFinancialAnalysis(data: any): FinancialAnalysisResponse {
  return {
    ...data,
    global_financial_score: safeNumber(data?.global_financial_score),
    risk_level: data?.risk_level || "moderate",
    summary: data?.summary || "",
    explanation: data?.explanation || "",
    generated_at: data?.generated_at || new Date().toISOString(),
    financial_health: {
      income: safeNumber(data?.financial_health?.income),
      expenses: safeNumber(data?.financial_health?.expenses),
      savings_rate: safeNumber(data?.financial_health?.savings_rate),
      cashflow: safeNumber(data?.financial_health?.cashflow),
    },
    engines: data?.engines || {},
    engine_timings: data?.engine_timings || {},
  };
}

/* =====================================================
   FINANCIAL ANALYSIS
===================================================== */

export async function analyzeFinancial(
  payload: FinancialAnalysisRequest
): Promise<FinancialAnalysisResponse> {
  const response = await api.post("/financial/analyze", payload);
  return normalizeFinancialAnalysis(response.data);
}

/* =====================================================
   QUOTA
===================================================== */

export interface QuotaState {
  limit: number | null;
  used: number;
  remaining: number | null;
  unlimited: boolean;
  period: string;
}

export async function fetchQuota(): Promise<QuotaState> {
  const response = await api.get("/simulations/quota");
  return response.data;
}

/* =====================================================
   SIMULATIONS
===================================================== */
// No user_id anywhere. The server derives identity from the token.

export async function fetchSimulations(): Promise<any[]> {
  const response = await api.get("/simulations");
  return Array.isArray(response.data) ? response.data : [];
}

export async function createSimulation(payload: {
  name: string;
  amount: number;
  term: number;
  category?: string | null;
  // Accepts the engine response as-is. The server stores this as
  // opaque JSON, so the exact shape doesn't need narrowing here —
  // this also lets a FinancialAnalysisResponse be passed directly
  // without a cast at the call site.
  result: Record<string, unknown> | FinancialAnalysisResponse;
}): Promise<any> {
  const response = await api.post("/simulations", payload);
  return response.data;
}

export async function deleteSimulation(simulationId: string): Promise<void> {
  await api.delete(`/simulations/${simulationId}`);
}

/* =====================================================
   HEALTH CHECK
===================================================== */

export async function pingBackend(): Promise<boolean> {
  try {
    const response = await axios.get(
      `${BASE_URL.replace(/\/api$/, "")}/health`,
      { timeout: 8000 }
    );
    return response.status === 200;
  } catch {
    return false;
  }
}

/* =====================================================
   GENERIC HELPERS
===================================================== */

export async function apiGet<T>(endpoint: string): Promise<T> {
  const response = await api.get(endpoint);
  return response.data as T;
}

export async function apiPost<TResponse, TPayload = unknown>(
  endpoint: string,
  payload?: TPayload
): Promise<TResponse> {
  const response = await api.post(endpoint, payload);
  return response.data as TResponse;
}

export async function apiPatch<TResponse, TPayload = unknown>(
  endpoint: string,
  payload?: TPayload
): Promise<TResponse> {
  const response = await api.patch(endpoint, payload);
  return response.data as TResponse;
}

export async function apiDelete<T>(endpoint: string): Promise<T> {
  const response = await api.delete(endpoint);
  return response.data as T;
}