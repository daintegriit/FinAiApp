import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/theme/ThemeContext";
import { Feather } from "@expo/vector-icons";
import { api } from "../../src/services/api";
import * as LocalAuthentication from "expo-local-authentication";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";

// =====================================================
// 🔥 CONFIGURE GOOGLE SIGN IN
// =====================================================

GoogleSignin.configure({
  webClientId:
    "466323878357-nr7s0ghh9bimc760b2dqhvsq5ta14bo9.apps.googleusercontent.com",
  iosClientId:
    "466323878357-l7a3rcma7e4dfeesk86fo0vghojetpd5.apps.googleusercontent.com",
  offlineAccess: true,
});

export default function LoginScreen() {
  const { theme } = useTheme();
  const { login, loginWithGoogle, loginWithApple } =
    useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] =
    useState(false);
  const [appleAvailable, setAppleAvailable] =
    useState(false);

  // ===================================================
  // 🔐 CHECK BIOMETRIC + APPLE ON MOUNT
  // ===================================================

  useEffect(() => {
    async function checkCapabilities() {
      const compatible =
        await LocalAuthentication.hasHardwareAsync();
      const enrolled =
        await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);

      const appleSupported =
        await AppleAuthentication.isAvailableAsync();
      setAppleAvailable(appleSupported);
    }
    checkCapabilities();
  }, []);

  // ===================================================
  // 🔐 BIOMETRIC LOGIN
  // ===================================================

  async function handleBiometricLogin() {
    const result =
      await LocalAuthentication.authenticateAsync({
        promptMessage: "Sign in to FinBudgetAI",
        fallbackLabel: "Use Password",
        disableDeviceFallback: false,
      });

    if (result.success) {
      await checkProfileAndRoute("");
    }
  }

  async function checkProfileAndRoute(userId: string) {
    try {
      await api.get("/profile");
      router.replace("/(tabs)" as any);
    } catch {
      router.replace("/(auth)/onboarding" as any);
    }
  }

  // ===================================================
  // 🔥 GOOGLE LOGIN
  // ===================================================

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setError(null);
    try {
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      if (!idToken) {
        throw new Error("No ID token from Google");
      }
      const loggedInUser = await loginWithGoogle(idToken);
      await checkProfileAndRoute(loggedInUser?.id || "");

    } catch (err: any) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        // cancelled — no error shown
      } else if (err.code === statusCodes.IN_PROGRESS) {
        // already in progress
      } else {
        setError(
          err?.backendMessage ||
          "Google Sign-In failed. Try again."
        );
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  // ===================================================
  // 🍎 APPLE LOGIN
  // ===================================================

  async function handleAppleLogin() {
    setAppleLoading(true);
    setError(null);
    try {
      const loggedInUser = await loginWithApple();
      await checkProfileAndRoute(loggedInUser?.id || "");
    } catch (err: any) {
      if (err.code !== "ERR_REQUEST_CANCELED") {
        setError(
          err?.backendMessage ||
          "Apple Sign-In failed. Try again."
        );
      }
    } finally {
      setAppleLoading(false);
    }
  }

  // ===================================================
  // 🔥 EMAIL LOGIN
  // ===================================================

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      const loggedInUser = await login(email.trim().toLowerCase(), password);
      await checkProfileAndRoute(loggedInUser?.id || "");
    } catch (err: any) {
      setError(
        err?.backendMessage ||
        "Login failed. Check your credentials."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >

        {/* BRAND */}
        <View style={styles.brandBlock}>
          <View
            style={[
              styles.logoBox,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.logoText,
                {
                  color: theme.colors.text,
                  fontFamily: theme.fonts.semibold,
                },
              ]}
            >
              F
            </Text>
          </View>

          <Text
            style={[
              styles.title,
              {
                color: theme.colors.text,
                fontFamily: theme.fonts.semibold,
              },
            ]}
          >
            FinBudgetAI
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
            Your intelligent financial companion
          </Text>
        </View>

        {/* SOCIAL BUTTONS */}
        <View style={styles.socialRow}>

          {/* GOOGLE */}
          <TouchableOpacity
            style={[
              styles.socialButton,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
            activeOpacity={0.8}
            onPress={handleGoogleLogin}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator
                size="small"
                color={theme.colors.text}
              />
            ) : (
              <>
                <Text style={styles.socialIcon}>G</Text>
                <Text
                  style={[
                    styles.socialLabel,
                    {
                      color: theme.colors.text,
                      fontFamily: theme.fonts.primary,
                    },
                  ]}
                >
                  Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* APPLE */}
          <TouchableOpacity
            style={[
              styles.socialButton,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
            activeOpacity={0.8}
            onPress={handleAppleLogin}
            disabled={appleLoading || !appleAvailable}
          >
            {appleLoading ? (
              <ActivityIndicator
                size="small"
                color={theme.colors.text}
              />
            ) : (
              <>
                <Text
                  style={{
                    fontSize: 18,
                    color: theme.colors.text,
                    fontWeight: "600",
                  }}
                >
                  
                </Text>
                <Text
                  style={[
                    styles.socialLabel,
                    {
                      color: theme.colors.text,
                      fontFamily: theme.fonts.primary,
                    },
                  ]}
                >
                  Apple
                </Text>
              </>
            )}
          </TouchableOpacity>

        </View>

        {/* DIVIDER */}
        <View style={styles.dividerRow}>
          <View
            style={[
              styles.dividerLine,
              { backgroundColor: theme.colors.divider },
            ]}
          />
          <Text
            style={[
              styles.dividerText,
              {
                color: theme.colors.textSecondary,
                fontFamily: theme.fonts.primary,
              },
            ]}
          >
            or continue with email
          </Text>
          <View
            style={[
              styles.dividerLine,
              { backgroundColor: theme.colors.divider },
            ]}
          />
        </View>

        {/* FORM */}
        <View style={styles.form}>

          {/* EMAIL */}
          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Feather
              name="mail"
              size={18}
              color={theme.colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={theme.colors.placeholder}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[
                styles.input,
                {
                  color: theme.colors.text,
                  fontFamily: theme.fonts.primary,
                },
              ]}
            />
          </View>

          {/* PASSWORD */}
          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Feather
              name="lock"
              size={18}
              color={theme.colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={theme.colors.placeholder}
              secureTextEntry={!showPassword}
              style={[
                styles.input,
                {
                  color: theme.colors.text,
                  fontFamily: theme.fonts.primary,
                },
              ]}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              <Feather
                name={showPassword ? "eye-off" : "eye"}
                size={18}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* FORGOT PASSWORD */}
          <TouchableOpacity
            onPress={() => router.push("/(auth)/forgot-password" as any)}
            style={{ alignSelf: "flex-end" }}
          >
            <Text style={[{ color: theme.colors.textSecondary, fontSize: 13, fontFamily: theme.fonts.primary }]}>
              Forgot password?
            </Text>
          </TouchableOpacity>

          {/* ERROR */}
          {error && (
            <Text
              style={[
                styles.error,
                { color: theme.colors.danger },
              ]}
            >
              {error}
            </Text>
          )}

          {/* SIGN IN BUTTON */}
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor:
                  email && password
                    ? theme.colors.text
                    : theme.colors.textSecondary,
                opacity: email && password ? 1 : 0.5,
              },
            ]}
            onPress={handleLogin}
            disabled={loading || !email || !password}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator
                color={theme.colors.background}
              />
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
                Sign In
              </Text>
            )}
          </TouchableOpacity>

          {/* REGISTER LINK */}
          <TouchableOpacity
            onPress={() =>
              router.push("/(auth)/register" as any)
            }
          >
            <Text
              style={[
                styles.link,
                {
                  color: theme.colors.textSecondary,
                  fontFamily: theme.fonts.primary,
                },
              ]}
            >
              Don't have an account?{" "}
              <Text style={{ color: theme.colors.success }}>
                Sign Up
              </Text>
            </Text>
          </TouchableOpacity>

          {/* FACE ID BUTTON */}
          {biometricAvailable && (
            <TouchableOpacity
              style={[
                styles.biometricButton,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
              ]}
              onPress={handleBiometricLogin}
              activeOpacity={0.8}
            >
              <Text style={styles.biometricIcon}>
                􀎽
              </Text>
              <Text
                style={[
                  styles.biometricLabel,
                  {
                    color: theme.colors.textSecondary,
                    fontFamily: theme.fonts.primary,
                  },
                ]}
              >
                Sign in with Face ID
              </Text>
            </TouchableOpacity>
          )}

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    paddingVertical: 40,
  },
  brandBlock: {
    alignItems: "center",
    marginBottom: 36,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoText: {
    fontSize: 28,
  },
  title: {
    fontSize: 28,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
  },
  socialRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  socialIcon: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4285F4",
  },
  socialLabel: {
    fontSize: 15,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
  },
  form: {
    gap: 14,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
  },
  eyeButton: {
    padding: 4,
  },
  error: {
    fontSize: 14,
  },
  button: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 4,
  },
  buttonText: {
    fontSize: 18,
  },
  link: {
    textAlign: "center",
    fontSize: 14,
  },
  biometricButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  biometricIcon: {
    fontSize: 22,
  },
  biometricLabel: {
    fontSize: 15,
  },
});