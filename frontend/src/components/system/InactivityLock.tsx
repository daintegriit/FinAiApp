// =====================================================
// FINAI — INACTIVITY AUTO-LOCK
// src/components/system/InactivityLock.tsx
// =====================================================
// Banking-style auto-lock. When the app is backgrounded and later
// returns after the threshold, it shows a lock overlay and requires
// Face ID / Touch ID (or a "Use password" fallback that logs out) to
// resume. Only active for authenticated users who have enabled
// biometrics — otherwise it stays out of the way entirely.
//
// Deliberately self-contained: it doesn't modify AuthContext's session
// logic. It overlays the app and gates access behind a biometric check,
// reusing the same LocalAuthentication prompt used elsewhere.

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AppState,
  AppStateStatus,
} from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { Feather } from "@expo/vector-icons";

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../theme/ThemeContext";

// Lock if the app was backgrounded for at least this long. Kept modest
// for a finance app; make it a user setting later if desired.
const LOCK_AFTER_MS = 2 * 60 * 1000; // 2 minutes

export default function InactivityLock() {
  const { isAuthenticated, isBiometricEnabled, logout } = useAuth();
  const { theme } = useTheme();

  const [locked, setLocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  // When the app last went to background. Ref (not state) so the
  // AppState handler always reads the latest value without re-subscribing.
  const backgroundedAt = useRef<number | null>(null);
  const biometricEnabledRef = useRef(false);

  // Keep a live copy of whether biometrics are enabled, so the AppState
  // handler can decide without an async call in the hot path.
  useEffect(() => {
    let active = true;
    if (isAuthenticated) {
      isBiometricEnabled()
        .then((v) => {
          if (active) biometricEnabledRef.current = v;
        })
        .catch(() => {
          if (active) biometricEnabledRef.current = false;
        });
    } else {
      biometricEnabledRef.current = false;
    }
    return () => {
      active = false;
    };
  }, [isAuthenticated, isBiometricEnabled]);

  const attemptUnlock = useCallback(async () => {
    setUnlocking(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock FinBudgetAI",
        fallbackLabel: "Use Password",
        disableDeviceFallback: false,
      });
      if (result.success) {
        setLocked(false);
      }
    } catch {
      // stay locked; user can retry or use password
    } finally {
      setUnlocking(false);
    }
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener(
      "change",
      (next: AppStateStatus) => {
        // Only relevant for authenticated users with biometrics on.
        if (next === "background" || next === "inactive") {
          backgroundedAt.current = Date.now();
        } else if (next === "active") {
          const since = backgroundedAt.current;
          backgroundedAt.current = null;
          if (
            since &&
            isAuthenticated &&
            biometricEnabledRef.current &&
            Date.now() - since >= LOCK_AFTER_MS
          ) {
            setLocked(true);
          }
        }
      }
    );
    return () => sub.remove();
  }, [isAuthenticated]);

  // Auto-prompt Face ID as soon as the lock appears.
  useEffect(() => {
    if (locked) {
      attemptUnlock();
    }
  }, [locked, attemptUnlock]);

  // If the user logs out while locked, clear the lock.
  useEffect(() => {
    if (!isAuthenticated && locked) setLocked(false);
  }, [isAuthenticated, locked]);

  if (!locked) return null;

  return (
    <View
      style={[
        styles.overlay,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
        ]}
      >
        <Feather name="lock" size={30} color={theme.colors.text} />
      </View>

      <Text
        style={[
          styles.title,
          { color: theme.colors.text, fontFamily: theme.fonts.semibold },
        ]}
      >
        FinBudgetAI is locked
      </Text>
      <Text
        style={[
          styles.subtitle,
          { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary },
        ]}
      >
        Use Face ID to unlock and continue.
      </Text>

      <TouchableOpacity
        style={[styles.unlockButton, { backgroundColor: theme.colors.primary }]}
        onPress={attemptUnlock}
        disabled={unlocking}
        activeOpacity={0.85}
      >
        <Feather name="unlock" size={18} color={theme.colors.background} />
        <Text
          style={[
            styles.unlockText,
            { color: theme.colors.background, fontFamily: theme.fonts.semibold },
          ]}
        >
          {unlocking ? "Unlocking…" : "Unlock with Face ID"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={async () => {
          setLocked(false);
          await logout();
        }}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.logoutText,
            { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary },
          ]}
        >
          Sign in with password instead
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 32,
  },
  unlockButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 16,
  },
  unlockText: {
    fontSize: 16,
  },
  logoutButton: {
    marginTop: 20,
    paddingVertical: 8,
  },
  logoutText: {
    fontSize: 14,
  },
});