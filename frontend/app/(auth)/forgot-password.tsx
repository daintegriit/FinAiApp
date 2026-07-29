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
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../src/theme/ThemeContext";
import { api } from "../../src/services/api";

export default function ForgotPasswordScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.post(`/auth/forgot-password?email=${encodeURIComponent(email.trim().toLowerCase())}`);
      setSent(true);
    } catch (err: any) {
      if (err?.isOffline) {
        setError("No internet connection. Please check your network.");
      } else {
        setError(err?.backendMessage || "Something went wrong. Try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        >
          <Feather name="chevron-left" size={22} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>

        {sent ? (

          /* ============================================ */
          /* SUCCESS STATE */
          /* ============================================ */

          <View style={styles.successContainer}>
            <View style={[styles.successIcon, { backgroundColor: `${theme.colors.success}20`, borderColor: theme.colors.success }]}>
              <Feather name="mail" size={32} color={theme.colors.success} />
            </View>
            <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.fonts.semibold }]}>
              Check your email
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
              If an account exists for {email}, we've sent a password reset link. Check your inbox and spam folder.
            </Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.colors.text }]}
              onPress={() => router.replace("/(auth)/login" as any)}
            >
              <Text style={[styles.buttonText, { color: theme.colors.background, fontFamily: theme.fonts.semibold }]}>
                Back to Sign In
              </Text>
            </TouchableOpacity>
          </View>

        ) : (

          /* ============================================ */
          /* FORM */
          /* ============================================ */

          <>
            <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.fonts.semibold }]}>
              Forgot Password?
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
              Enter your email and we'll send you a link to reset your password.
            </Text>

            <View style={[styles.inputWrapper, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Feather name="mail" size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                value={email}
                onChangeText={(t) => { setEmail(t); setError(null); }}
                placeholder="Email address"
                placeholderTextColor={theme.colors.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
                style={[styles.input, { color: theme.colors.text, fontFamily: theme.fonts.primary }]}
              />
            </View>

            {error && (
              <View style={[styles.errorBanner, { backgroundColor: "#EF444420", borderColor: "#EF4444" }]}>
                <Feather name="alert-circle" size={14} color="#EF4444" />
                <Text style={[styles.errorText, { color: "#EF4444", fontFamily: theme.fonts.primary }]}>
                  {error}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor: email.includes("@") ? theme.colors.text : theme.colors.textSecondary,
                  opacity: email.includes("@") ? 1 : 0.5,
                },
              ]}
              onPress={handleSubmit}
              disabled={loading || !email.includes("@")}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.background} />
              ) : (
                <Text style={[styles.buttonText, { color: theme.colors.background, fontFamily: theme.fonts.semibold }]}>
                  Send Reset Link
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()}>
              <Text style={[styles.link, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
                Remember your password?{" "}
                <Text style={{ color: theme.colors.success }}>Sign In</Text>
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
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 60,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 32,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  errorText: { flex: 1, fontSize: 13 },
  button: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 14,
  },
  buttonText: { fontSize: 18 },
  link: { textAlign: "center", fontSize: 14 },
});