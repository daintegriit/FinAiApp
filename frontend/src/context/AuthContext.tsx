import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  api,
  setTokens,
  clearTokens,
  getAccessToken,
  registerLogoutHandler,
} from "../services/api";
import { useFinanceStore } from "../store/financeStore";
import {
  identifyUser,
  resetBillingIdentity,
} from "../services/billing";

/* =====================================================
   TYPES
===================================================== */

interface User {
  id: string;
  email: string;
  username: string;
  is_active: boolean;
  is_admin: boolean;
  is_verified: boolean;
  created_at: string;
  terms_accepted_at?: string | null;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<User>;
  loginWithApple: () => Promise<User>;
  refreshUser: () => Promise<User>;
  signInWithBiometrics: () => Promise<User | null>;
  enableBiometrics: () => Promise<boolean>;
  disableBiometrics: () => Promise<void>;
  isBiometricEnabled: () => Promise<boolean>;
}

/* =====================================================
   KEYS
===================================================== */
// Token keys live in api.ts now — it owns storage so the request
// interceptor can read the current token on every call. This file
// only keeps keys that are auth-flow specific.

const BIOMETRIC_ENABLED_KEY = "finai_biometric_enabled";
const LAST_USER_ID_KEY = "finai_last_user_id";

/* =====================================================
   BIOMETRIC HELPERS
===================================================== */

async function isBiometricAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return compatible && enrolled;
}

async function authenticateWithBiometrics(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Sign in to FinBudgetAI",
    fallbackLabel: "Use Password",
    disableDeviceFallback: false,
  });
  return result.success;
}

/* =====================================================
   CONTEXT
===================================================== */

const AuthContext = createContext<AuthContextValue | null>(null);

/* =====================================================
   PROVIDER
===================================================== */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /* ===================================================
     LOGOUT (defined early so boot + interceptor can use it)
  =================================================== */

  const logout = useCallback(async () => {
    await clearTokens();
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY).catch(() => {});
    await resetBillingIdentity();
    useFinanceStore.getState().resetStore();
    setUser(null);
  }, []);

  /* ===================================================
     INTERCEPTOR WIRING
  =================================================== */
  // When api.ts exhausts a refresh (refresh token expired or revoked),
  // it calls this to drop the user to the login screen. Without it the
  // app would sit on a dead session showing spinners.

  useEffect(() => {
    registerLogoutHandler(() => {
      useFinanceStore.getState().resetStore();
      setUser(null);
    });
  }, []);

  /* ===================================================
     BOOT
  =================================================== */

  useEffect(() => {
    async function boot() {
      try {
        const stored = await getAccessToken();

        if (stored) {
          const biometricEnabled = await SecureStore.getItemAsync(
            BIOMETRIC_ENABLED_KEY
          );
          const biometricAvailable = await isBiometricAvailable();

          if (biometricEnabled === "true" && biometricAvailable) {
            const passed = await authenticateWithBiometrics();
            if (!passed) {
              setIsLoading(false);
              return;
            }
          }

          // No manual header — the interceptor attaches the token, and
          // if it's expired the interceptor refreshes transparently.
          const res = await api.get("/auth/me");
          setUser(res.data);

          // Returning session skips the login path, so re-establish the
          // RevenueCat identity here.
          identifyUser(res.data.id).catch(() => {});
        }
      } catch {
        // A hard failure here means the stored session is unusable.
        await clearTokens();
      } finally {
        setIsLoading(false);
      }
    }

    boot();
  }, []);

  /* ===================================================
     SAVE TOKENS + LOAD USER
  =================================================== */

  const saveTokensAndLoadUser = useCallback(
    async (accessToken: string, refreshToken: string): Promise<User> => {
      await setTokens(accessToken, refreshToken);

      const meRes = await api.get("/auth/me");
      const userData: User = meRes.data;

      // Switching accounts on a shared device must not leak the prior
      // user's cached financial data into the new session.
      const previousUserId = await SecureStore.getItemAsync(LAST_USER_ID_KEY);
      if (previousUserId && previousUserId !== userData.id) {
        useFinanceStore.getState().resetStore();
      }
      await SecureStore.setItemAsync(LAST_USER_ID_KEY, userData.id);

      setUser(userData);

      // Tie RevenueCat's identity to our user UUID. The app_user_id it
      // sends in purchase webhooks becomes userData.id, which is how
      // the backend maps a purchase to a User row. Fire-and-forget —
      // billing identity must not block login.
      identifyUser(userData.id).catch(() => {});

      // Push registration no longer takes a user_id — the endpoint
      // derives it from the token.
      import("../services/notifications").then(
        ({ registerForPushNotifications }) => {
          registerForPushNotifications().catch(() => {});
        }
      );

      return userData;
    },
    []
  );

  /* ===================================================
     BIOMETRIC SESSION
  =================================================== */

  // Resume an existing session behind Face ID / Touch ID. Requires a
  // prior login (tokens in SecureStore). Returns null when there's
  // nothing stored to unlock, so the caller can prompt for a password.
  const signInWithBiometrics = useCallback(async (): Promise<User | null> => {
    const stored = await getAccessToken();
    if (!stored) return null;

    const available = await isBiometricAvailable();
    if (!available) return null;

    const passed = await authenticateWithBiometrics();
    if (!passed) return null;

    // Interceptor attaches the stored token; refreshes transparently if expired.
    const res = await api.get("/auth/me");
    setUser(res.data);
    identifyUser(res.data.id).catch(() => {});
    return res.data;
  }, []);

  // Opt in from Settings (or right after a login). Verifies the user's
  // face once before enabling, so it never gets enabled for the wrong
  // person on a shared device.
  const enableBiometrics = useCallback(async (): Promise<boolean> => {
    const available = await isBiometricAvailable();
    if (!available) return false;
    const passed = await authenticateWithBiometrics();
    if (!passed) return false;
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, "true");
    return true;
  }, []);

  const disableBiometrics = useCallback(async (): Promise<void> => {
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY).catch(() => {});
  }, []);

  const isBiometricEnabled = useCallback(async (): Promise<boolean> => {
    const v = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    const available = await isBiometricAvailable();
    return v === "true" && available;
  }, []);

  /* ===================================================
     LOGIN
  =================================================== */

  const login = useCallback(
    async (email: string, password: string): Promise<User> => {
      const res = await api.post("/auth/login", { email, password });
      const { access_token, refresh_token } = res.data;
      return saveTokensAndLoadUser(access_token, refresh_token);
    },
    [saveTokensAndLoadUser]
  );

  /* ===================================================
     GOOGLE LOGIN
  =================================================== */

  const loginWithGoogle = useCallback(
    async (idToken: string): Promise<User> => {
      const res = await api.post("/auth/google", { id_token: idToken });
      const { access_token, refresh_token } = res.data;
      return saveTokensAndLoadUser(access_token, refresh_token);
    },
    [saveTokensAndLoadUser]
  );

  /* ===================================================
     APPLE LOGIN
  =================================================== */

  const loginWithApple = useCallback(async (): Promise<User> => {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    const res = await api.post("/auth/apple", {
      identity_token: credential.identityToken,
      full_name: credential.fullName
        ? `${credential.fullName.givenName || ""} ${
            credential.fullName.familyName || ""
          }`.trim()
        : null,
      email: credential.email,
    });

    const { access_token, refresh_token } = res.data;
    return saveTokensAndLoadUser(access_token, refresh_token);
  }, [saveTokensAndLoadUser]);

  /* ===================================================
     REGISTER
  =================================================== */

  const register = useCallback(
    async (email: string, username: string, password: string) => {
      await api.post("/auth/register", { email, username, password });
      await login(email, password);
    },
    [login]
  );

  /* ===================================================
     REFRESH USER
  =================================================== */

  const refreshUser = useCallback(async (): Promise<User> => {
    const res = await api.get("/auth/me");
    setUser(res.data);
    return res.data;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        loginWithGoogle,
        loginWithApple,
        refreshUser,
        signInWithBiometrics,
        enableBiometrics,
        disableBiometrics,
        isBiometricEnabled,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* =====================================================
   HOOK
===================================================== */

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}