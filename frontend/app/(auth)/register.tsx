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
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/theme/ThemeContext";
import { Feather } from "@expo/vector-icons";
import { api } from "../../src/services/api";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Location from "expo-location";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";

GoogleSignin.configure({
  webClientId:
    "466323878357-nr7s0ghh9bimc760b2dqhvsq5ta14bo9.apps.googleusercontent.com",
  iosClientId:
    "466323878357-l7a3rcma7e4dfeesk86fo0vghojetpd5.apps.googleusercontent.com",
  offlineAccess: true,
});

/* =====================================================
   TYPES
===================================================== */

type Step = 1 | 2 | 3;

/* =====================================================
   OPTIONS
===================================================== */

const EMPLOYMENT_OPTIONS = [
  { label: "Full-time", value: "full_time" },
  { label: "Part-time", value: "part_time" },
  { label: "Self-employed", value: "self_employed" },
  { label: "Freelance", value: "freelance" },
  { label: "Contract", value: "contract" },
  { label: "Student", value: "student" },
  { label: "Retired", value: "retired" },
  { label: "Unemployed", value: "unemployed" },
];

const RISK_OPTIONS = [
  {
    label: "Conservative",
    value: "conservative",
    desc: "Preserve capital, low risk",
  },
  {
    label: "Moderate",
    value: "moderate",
    desc: "Balanced growth and safety",
  },
  {
    label: "Aggressive",
    value: "aggressive",
    desc: "Maximum growth, high risk",
  },
];

const EXPERIENCE_OPTIONS = [
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
  { label: "Expert", value: "expert" },
];

/* =====================================================
   COMPONENT
===================================================== */

export default function RegisterScreen() {
  const { theme } = useTheme();
  const { register, user, loginWithGoogle, loginWithApple } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 2
  const [income, setIncome] = useState("");
  const [employmentType, setEmploymentType] = useState<string | null>(null);
  const [age, setAge] = useState("");
  const [country] = useState("US");

  // Location
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Step 3
  const [riskTolerance, setRiskTolerance] = useState<string | null>(null);
  const [investmentExperience, setInvestmentExperience] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkApple() {
      const available = await AppleAuthentication.isAvailableAsync();
      setAppleAvailable(available);
    }
    checkApple();
  }, []);

  // ===================================================
  // LOCATION
  // ===================================================

  async function handleDetectLocation() {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Enable location access to auto-fill your location.");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);

      const [address] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (address) {
        setCity(address.city || "");
        setState(address.region || "");
        setZipCode(address.postalCode || "");
      }
    } catch (err) {
      console.error("Location error:", err);
      Alert.alert("Error", "Could not detect location. Enter manually.");
    } finally {
      setLocationLoading(false);
    }
  }

  // ===================================================
  // GOOGLE
  // ===================================================

  async function handleGoogleSignUp() {
    setGoogleLoading(true);
    setError(null);
    try {
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      if (!idToken) throw new Error("No ID token");
      await loginWithGoogle(idToken);
      console.log("✅ Google signup success, going to onboarding");
      setTimeout(() => {
        router.replace("/(auth)/onboarding" as any);
      }, 500);
    } catch (err: any) {
      console.log("❌ Google signup error:", JSON.stringify(err));
      if (err.code !== statusCodes.SIGN_IN_CANCELLED) {
        setError(
          err?.backendMessage ||
          err?.message ||
          JSON.stringify(err) ||
          "Google Sign-Up failed."
        );
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  // ===================================================
  // APPLE
  // ===================================================

  async function handleAppleSignUp() {
    setAppleLoading(true);
    setError(null);
    try {
      await loginWithApple();
      console.log("✅ Apple signup success, going to onboarding");
      setTimeout(() => {
        router.replace("/(auth)/onboarding" as any);
      }, 500);
    } catch (err: any) {
      if (err.code !== "ERR_REQUEST_CANCELED") {
        setError(err?.backendMessage || "Apple Sign-Up failed.");
      }
    } finally {
      setAppleLoading(false);
    }
  }

  // ===================================================
  // VALIDATION
  // ===================================================

  const step1Valid =
    email.includes("@") &&
    username.length >= 3 &&
    password.length >= 8;

  const step2Valid =
    income.length > 0 &&
    employmentType !== null;

  const step3Valid =
    riskTolerance !== null &&
    investmentExperience !== null;

  const progress = (step / 3) * 100;

  // ===================================================
  // SUBMIT
  // ===================================================

  async function handleRegister() {
    if (!step3Valid) return;
    setLoading(true);
    setError(null);

    try {
      await register(
        email.trim().toLowerCase(),
        username.trim(),
        password
      );

      await api.post("/profile/create", {
        monthly_income: parseFloat(income),
        employment_type: employmentType,
        age: age ? parseInt(age) : null,
        country,
        risk_tolerance: riskTolerance,
        investment_experience: investmentExperience,
        city: city || null,
        state: state || null,
        zip_code: zipCode || null,
        latitude: latitude || null,
        longitude: longitude || null,
      });

      router.replace("/(tabs)/profile" as any);

    } catch (err: any) {
      setError(err?.backendMessage || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  // ===================================================
  // UI
  // ===================================================

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >

      {/* HEADER */}
      <View style={styles.header}>
        {step > 1 && (
          <TouchableOpacity
            onPress={() => setStep((s) => (s - 1) as Step)}
            style={[
              styles.backButton,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            ]}
          >
            <Feather name="chevron-left" size={22} color={theme.colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.headerText}>
          <Text
            style={[
              styles.stepLabel,
              { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary },
            ]}
          >
            Step {step} of 3
          </Text>
        </View>
      </View>

      {/* PROGRESS BAR */}
      <View style={[styles.progressTrack, { backgroundColor: theme.colors.divider }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${progress}%` as any, backgroundColor: theme.colors.success },
          ]}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >

        {/* ============================================ */}
        {/* STEP 1 — ACCOUNT */}
        {/* ============================================ */}

        {step === 1 && (
          <View>
            <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.fonts.semibold }]}>
              Create Account
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
              Start your financial journey
            </Text>

            {/* SOCIAL */}
            <View style={styles.socialRow}>
              <TouchableOpacity
                style={[styles.socialButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={handleGoogleSignUp}
                disabled={googleLoading}
              >
                {googleLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.text} />
                ) : (
                  <>
                    <Text style={styles.socialIcon}>G</Text>
                    <Text style={[styles.socialLabel, { color: theme.colors.text, fontFamily: theme.fonts.primary }]}>
                      Google
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={handleAppleSignUp}
                disabled={appleLoading || !appleAvailable}
              >
                {appleLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.text} />
                ) : (
                  <>
                    <Text style={{ fontSize: 18, color: theme.colors.text, fontWeight: "600" }}>
                      
                    </Text>
                    <Text style={[styles.socialLabel, { color: theme.colors.text, fontFamily: theme.fonts.primary }]}>
                      Apple
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* DIVIDER */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: theme.colors.divider }]} />
              <Text style={[styles.dividerText, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
                or sign up with email
              </Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.colors.divider }]} />
            </View>

            <View style={styles.form}>
              <View style={[styles.inputWrapper, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Feather name="mail" size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email address"
                  placeholderTextColor={theme.colors.placeholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[styles.input, { color: theme.colors.text, fontFamily: theme.fonts.primary }]}
                />
              </View>

              <View style={[styles.inputWrapper, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Feather name="user" size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Username"
                  placeholderTextColor={theme.colors.placeholder}
                  autoCapitalize="none"
                  style={[styles.input, { color: theme.colors.text, fontFamily: theme.fonts.primary }]}
                />
              </View>

              <View style={[styles.inputWrapper, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Feather name="lock" size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password (min 6 characters)"
                  placeholderTextColor={theme.colors.placeholder}
                  secureTextEntry={!showPassword}
                  style={[styles.input, { color: theme.colors.text, fontFamily: theme.fonts.primary }]}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {error && <Text style={[styles.error, { color: theme.colors.danger }]}>{error}</Text>}

              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: step1Valid ? theme.colors.text : theme.colors.textSecondary, opacity: step1Valid ? 1 : 0.5 },
                ]}
                onPress={() => { setError(null); setStep(2); }}
                disabled={!step1Valid}
              >
                <Text style={[styles.buttonText, { color: theme.colors.background, fontFamily: theme.fonts.semibold }]}>
                  Continue
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push("/(auth)/login" as any)}>
                <Text style={[styles.link, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
                  Already have an account?{" "}
                  <Text style={{ color: theme.colors.success }}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ============================================ */}
        {/* STEP 2 — FINANCIAL BASICS + LOCATION */}
        {/* ============================================ */}

        {step === 2 && (
          <View>
            <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.fonts.semibold }]}>
              Financial Profile
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
              Helps us personalize your AI insights
            </Text>

            <View style={styles.form}>

              {/* INCOME */}
              <View style={[styles.inputWrapper, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Text style={[styles.currencyPrefix, { color: theme.colors.textSecondary }]}>$</Text>
                <TextInput
                  value={income}
                  onChangeText={setIncome}
                  placeholder="Monthly income"
                  placeholderTextColor={theme.colors.placeholder}
                  keyboardType="decimal-pad"
                  style={[styles.input, { color: theme.colors.text, fontFamily: theme.fonts.primary }]}
                />
              </View>

              {/* AGE */}
              <View style={[styles.inputWrapper, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Feather name="calendar" size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  value={age}
                  onChangeText={setAge}
                  placeholder="Age (optional)"
                  placeholderTextColor={theme.colors.placeholder}
                  keyboardType="number-pad"
                  style={[styles.input, { color: theme.colors.text, fontFamily: theme.fonts.primary }]}
                />
              </View>

              {/* EMPLOYMENT */}
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
                Employment Type
              </Text>

              <View style={styles.chipGrid}>
                {EMPLOYMENT_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: employmentType === opt.value ? theme.colors.text : theme.colors.card,
                        borderColor: employmentType === opt.value ? theme.colors.text : theme.colors.border,
                      },
                    ]}
                    onPress={() => setEmploymentType(opt.value)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: employmentType === opt.value ? theme.colors.background : theme.colors.text,
                          fontFamily: theme.fonts.primary,
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* ======================================= */}
              {/* LOCATION */}
              {/* ======================================= */}

              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
                Location (for local peer benchmarks)
              </Text>

              <TouchableOpacity
                style={[styles.detectButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={handleDetectLocation}
                disabled={locationLoading}
              >
                {locationLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.text} />
                ) : (
                  <>
                    <Feather name="map-pin" size={16} color={theme.colors.text} />
                    <Text style={[styles.detectText, { color: theme.colors.text, fontFamily: theme.fonts.primary }]}>
                      {latitude ? "Location detected ✓" : "Auto-detect my location"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={[styles.inputWrapper, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Feather name="map" size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  value={city}
                  onChangeText={setCity}
                  placeholder="City"
                  placeholderTextColor={theme.colors.placeholder}
                  style={[styles.input, { color: theme.colors.text, fontFamily: theme.fonts.primary }]}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputWrapper, styles.rowInput, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <TextInput
                    value={state}
                    onChangeText={setState}
                    placeholder="State"
                    placeholderTextColor={theme.colors.placeholder}
                    autoCapitalize="characters"
                    maxLength={2}
                    style={[styles.input, { color: theme.colors.text, fontFamily: theme.fonts.primary }]}
                  />
                </View>

                <View style={[styles.inputWrapper, styles.rowInput, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <TextInput
                    value={zipCode}
                    onChangeText={setZipCode}
                    placeholder="Zip code"
                    placeholderTextColor={theme.colors.placeholder}
                    keyboardType="number-pad"
                    maxLength={10}
                    style={[styles.input, { color: theme.colors.text, fontFamily: theme.fonts.primary }]}
                  />
                </View>
              </View>

              {error && <Text style={[styles.error, { color: theme.colors.danger }]}>{error}</Text>}

              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: step2Valid ? theme.colors.text : theme.colors.textSecondary, opacity: step2Valid ? 1 : 0.5 },
                ]}
                onPress={() => { setError(null); setStep(3); }}
                disabled={!step2Valid}
              >
                <Text style={[styles.buttonText, { color: theme.colors.background, fontFamily: theme.fonts.semibold }]}>
                  Continue
                </Text>
              </TouchableOpacity>

            </View>
          </View>
        )}

        {/* ============================================ */}
        {/* STEP 3 — RISK PROFILE */}
        {/* ============================================ */}

        {step === 3 && (
          <View>
            <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.fonts.semibold }]}>
              Risk Profile
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
              Powers your AI financial scoring
            </Text>

            <View style={styles.form}>

              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
                Risk Tolerance
              </Text>

              {RISK_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.riskCard,
                    {
                      backgroundColor: riskTolerance === opt.value ? theme.colors.text : theme.colors.card,
                      borderColor: riskTolerance === opt.value ? theme.colors.text : theme.colors.border,
                    },
                  ]}
                  onPress={() => setRiskTolerance(opt.value)}
                >
                  <Text
                    style={[
                      styles.riskLabel,
                      {
                        color: riskTolerance === opt.value ? theme.colors.background : theme.colors.text,
                        fontFamily: theme.fonts.semibold,
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <Text
                    style={[
                      styles.riskDesc,
                      {
                        color: riskTolerance === opt.value ? theme.colors.background : theme.colors.textSecondary,
                        fontFamily: theme.fonts.primary,
                      },
                    ]}
                  >
                    {opt.desc}
                  </Text>
                </TouchableOpacity>
              ))}

              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary, marginTop: 8 }]}>
                Investment Experience
              </Text>

              <View style={styles.chipGrid}>
                {EXPERIENCE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: investmentExperience === opt.value ? theme.colors.text : theme.colors.card,
                        borderColor: investmentExperience === opt.value ? theme.colors.text : theme.colors.border,
                      },
                    ]}
                    onPress={() => setInvestmentExperience(opt.value)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: investmentExperience === opt.value ? theme.colors.background : theme.colors.text,
                          fontFamily: theme.fonts.primary,
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {error && <Text style={[styles.error, { color: theme.colors.danger }]}>{error}</Text>}

              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: step3Valid ? theme.colors.text : theme.colors.textSecondary, opacity: step3Valid ? 1 : 0.5 },
                ]}
                onPress={handleRegister}
                disabled={loading || !step3Valid}
              >
                {loading ? (
                  <ActivityIndicator color={theme.colors.background} />
                ) : (
                  <Text style={[styles.buttonText, { color: theme.colors.background, fontFamily: theme.fonts.semibold }]}>
                    Launch FinBudgetAI
                  </Text>
                )}
              </TouchableOpacity>

            </View>
          </View>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* =====================================================
   STYLES
===================================================== */

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
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
    marginRight: 12,
  },
  headerText: { flex: 1 },
  stepLabel: { fontSize: 13 },
  progressTrack: {
    height: 3,
    marginHorizontal: 24,
    borderRadius: 999,
    marginBottom: 8,
  },
  progressFill: { height: "100%", borderRadius: 999 },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 60,
  },
  title: {
    fontSize: 32,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 24,
  },
  socialRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
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
  socialLabel: { fontSize: 15 },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 10,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13 },
  form: { gap: 14 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: "600",
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
  },
  eyeButton: { padding: 4 },
  sectionLabel: {
    fontSize: 13,
    marginBottom: 4,
    marginTop: 4,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 14 },
  detectButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  detectText: { fontSize: 14 },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  rowInput: { flex: 1 },
  riskCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  riskLabel: {
    fontSize: 16,
    marginBottom: 4,
  },
  riskDesc: { fontSize: 13 },
  error: { fontSize: 14 },
  button: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { fontSize: 18 },
  link: {
    textAlign: "center",
    fontSize: 14,
    marginTop: 4,
  },
});