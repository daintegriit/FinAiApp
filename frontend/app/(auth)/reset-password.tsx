import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../src/theme/ThemeContext";
import { api } from "../../src/services/api";

export default function ResetPasswordScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === "string" ? params.token : "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!token) {
      setError("This reset link is invalid or has expired. Please request a new one.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.post("/reset-password", {
        token,
        new_password: password,
      });
      setDone(true);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        "We couldn't reset your password. The link may have expired — request a new one.";
      setError(typeof msg === "string" ? msg : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inner}>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: `${theme.colors.primary}18` },
          ]}
        >
          <Feather
            name={done ? "check-circle" : "lock"}
            size={28}
            color={theme.colors.primary}
          />
        </View>

        {done ? (
          <>
            <Text
              style={[
                styles.title,
                { color: theme.colors.text, fontFamily: theme.fonts.semibold },
              ]}
            >
              Password reset
            </Text>
            <Text
              style={[
                styles.subtitle,
                {
                  color: theme.colors.textSecondary,
                  fontFamily: theme.fonts.primary,
                },
              ]}
            >
              Your password has been updated. You can now sign in with your new
              password.
            </Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.colors.primary }]}
              onPress={() => router.replace("/(auth)/login")}
              activeOpacity={0.9}
            >
              <Text
                style={[
                  styles.buttonText,
                  {
                    color: theme.colors.background,
                    fontFamily: theme.fonts.semibold,
                  },
                ]}
              >
                Back to Sign In
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text
              style={[
                styles.title,
                { color: theme.colors.text, fontFamily: theme.fonts.semibold },
              ]}
            >
              Set a new password
            </Text>
            <Text
              style={[
                styles.subtitle,
                {
                  color: theme.colors.textSecondary,
                  fontFamily: theme.fonts.primary,
                },
              ]}
            >
              Enter a new password for your account.
            </Text>

            {/* New password */}
            <View
              style={[
                styles.inputWrap,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Feather name="lock" size={18} color={theme.colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                placeholder="New password"
                placeholderTextColor={theme.colors.textSecondary}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
                <Feather
                  name={showPassword ? "eye-off" : "eye"}
                  size={18}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Confirm password */}
            <View
              style={[
                styles.inputWrap,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Feather name="lock" size={18} color={theme.colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                placeholder="Confirm new password"
                placeholderTextColor={theme.colors.textSecondary}
                secureTextEntry={!showPassword}
                value={confirm}
                onChangeText={setConfirm}
                autoCapitalize="none"
              />
            </View>

            {error ? (
              <Text
                style={[
                  styles.error,
                  { color: theme.colors.danger ?? "#E5484D", fontFamily: theme.fonts.primary },
                ]}
              >
                {error}
              </Text>
            ) : null}

            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor: theme.colors.primary,
                  opacity: loading ? 0.7 : 1,
                },
              ]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.background} />
              ) : (
                <Text
                  style={[
                    styles.buttonText,
                    {
                      color: theme.colors.background,
                      fontFamily: theme.fonts.semibold,
                    },
                  ]}
                >
                  Reset Password
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.replace("/(auth)/login")}
              style={styles.backLink}
            >
              <Text
                style={[
                  styles.backLinkText,
                  {
                    color: theme.colors.textSecondary,
                    fontFamily: theme.fonts.primary,
                  },
                ]}
              >
                Back to Sign In
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 28 },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 20,
  },
  title: { fontSize: 24, textAlign: "center", marginBottom: 8 },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 14,
  },
  input: { flex: 1, fontSize: 16 },
  error: { fontSize: 13, marginBottom: 14, textAlign: "center" },
  button: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  buttonText: { fontSize: 17 },
  backLink: { alignItems: "center", paddingVertical: 14 },
  backLinkText: { fontSize: 14 },
});
