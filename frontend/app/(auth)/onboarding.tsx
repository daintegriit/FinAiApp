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
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/theme/ThemeContext";
import { Feather } from "@expo/vector-icons";
import { api } from "../../src/services/api";
import * as Location from "expo-location";
import { useFinanceStore } from "../../src/store/financeStore";


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

type Step = 1 | 2;

/* =====================================================
   COMPONENT
===================================================== */

export default function OnboardingScreen() {

  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const setIncome = useFinanceStore((s) => s.setIncome);
  const setProfile = useFinanceStore((s) => s.setProfile);

  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [income, setIncomeInput] = useState("");
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

  // Step 2
  const [riskTolerance, setRiskTolerance] = useState<string | null>(null);
  const [investmentExperience, setInvestmentExperience] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step1Valid = income.length > 0 && employmentType !== null;
  const step2Valid = riskTolerance !== null && investmentExperience !== null;
  const progress = (step / 2) * 100;

  // ===================================================
  // AUTO-DETECT LOCATION
  // ===================================================

  const [locationDenied, setLocationDenied] = useState(false);

  async function handleDetectLocation() {
    setLocationLoading(true);
    setLocationDenied(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationDenied(true);
        setLocationLoading(false);
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
      setLocationDenied(true);
    } finally {
      setLocationLoading(false);
    }
  }

  // ===================================================
  // SUBMIT
  // ===================================================

  async function handleFinish() {
    if (!step2Valid) return;
    setLoading(true);
    setError(null);

    // Geocode a manually-entered zip/city when GPS gave no coordinates,
    // so the user still appears on the proximity globe. Zip is the source
    // of truth for placement; city is just a display label.
    let finalLat = latitude;
    let finalLng = longitude;
    if ((finalLat == null || finalLng == null) && (zipCode || city)) {
      try {
        const q = zipCode && zipCode.length >= 5 ? `${zipCode}, USA` : `${city}, ${state}, USA`;
        const geo = await Location.geocodeAsync(q);
        if (geo && geo.length > 0) {
          finalLat = geo[0].latitude;
          finalLng = geo[0].longitude;
        }
      } catch (e) {}
    }

    try {
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
        latitude: finalLat || null,
        longitude: finalLng || null,
      });

      // Save to frontend store
      setIncome(parseFloat(income));
      setProfile({
        age: age ? parseInt(age) : undefined,
        employment_type: employmentType as any,
        risk_tolerance: riskTolerance as any,
        investment_experience: investmentExperience as any,
        city: city || undefined,
        state: state || undefined,
        zip_code: zipCode || undefined,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
      });

      router.replace("/(tabs)/profile" as any);

    } catch (err: any) {
      setError(
        err?.backendMessage ||
        "Failed to save profile. Try again."
      );
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
        {step > 1 && (
          <TouchableOpacity
            onPress={() => setStep(1)}
            style={[
              styles.backButton,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Feather name="chevron-left" size={22} color={theme.colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.headerText}>
          <Text
            style={[
              styles.stepLabel,
              {
                color: theme.colors.textSecondary,
                fontFamily: theme.fonts.primary,
              },
            ]}
          >
            Step {step} of 2
          </Text>
        </View>
      </View>

      {/* PROGRESS BAR */}
      <View style={[styles.progressTrack, { backgroundColor: theme.colors.divider }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progress}%` as any,
              backgroundColor: theme.colors.success,
            },
          ]}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >

        {/* ============================================ */}
        {/* STEP 1 — FINANCIAL BASICS + LOCATION */}
        {/* ============================================ */}

        {step === 1 && (
          <View>
            <Text
              style={[
                styles.title,
                { color: theme.colors.text, fontFamily: theme.fonts.semibold },
              ]}
            >
              Financial Profile
            </Text>

            <Text
              style={[
                styles.subtitle,
                { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary },
              ]}
            >
              Helps us personalize your AI insights
            </Text>

            <View style={styles.form}>

              {/* INCOME */}
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                ]}
              >
                <Text style={[styles.currencyPrefix, { color: theme.colors.textSecondary }]}>
                  $
                </Text>
                <TextInput
                  value={income}
                  onChangeText={setIncomeInput}
                  placeholder="Monthly income"
                  placeholderTextColor={theme.colors.placeholder}
                  keyboardType="decimal-pad"
                  style={[styles.input, { color: theme.colors.text, fontFamily: theme.fonts.primary }]}
                />
              </View>

              {/* AGE */}
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                ]}
              >
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
              <Text
                style={[
                  styles.sectionLabel,
                  { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary },
                ]}
              >
                Employment Type
              </Text>

              <View style={styles.chipGrid}>
                {EMPLOYMENT_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          employmentType === opt.value
                            ? theme.colors.text
                            : theme.colors.card,
                        borderColor:
                          employmentType === opt.value
                            ? theme.colors.text
                            : theme.colors.border,
                      },
                    ]}
                    onPress={() => setEmploymentType(opt.value)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color:
                            employmentType === opt.value
                              ? theme.colors.background
                              : theme.colors.text,
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

              <Text
                style={[
                  styles.sectionLabel,
                  { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary },
                ]}
              >
                Location (for local peer benchmarks)
              </Text>

              {/* AUTO-DETECT */}
              <TouchableOpacity
                style={[
                  styles.detectButton,
                  {
                    backgroundColor: latitude
                      ? `${theme.colors.success}20`
                      : theme.colors.card,
                    borderColor: latitude
                      ? theme.colors.success
                      : theme.colors.border,
                  },
                ]}
                onPress={handleDetectLocation}
                disabled={locationLoading}
              >
                {locationLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.text} />
                ) : (
                  <>
                    <Feather
                      name={latitude ? "check-circle" : "map-pin"}
                      size={16}
                      color={latitude ? theme.colors.success : theme.colors.text}
                    />
                    <Text
                      style={[
                        styles.detectText,
                        {
                          color: latitude ? theme.colors.success : theme.colors.text,
                          fontFamily: theme.fonts.primary,
                        },
                      ]}
                    >
                      {latitude ? "Location detected ✓" : "Auto-detect my location"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* LOCATION DENIED MESSAGE */}
              {locationDenied && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 8,
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.card,
                  }}
                >
                  <Feather name="info" size={14} color={theme.colors.textSecondary} style={{ marginTop: 1 }} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: theme.colors.textSecondary,
                        fontSize: 13,
                        fontFamily: theme.fonts.primary,
                        lineHeight: 20,
                      }}
                    >
                      Location permission denied. You can enter your city manually below, or skip — you can always add it later in settings.
                    </Text>
                    <TouchableOpacity
                      onPress={() => setLocationDenied(false)}
                      style={{ marginTop: 8 }}
                    >
                      <Text
                        style={{
                          color: theme.colors.text,
                          fontSize: 13,
                          fontFamily: theme.fonts.semibold,
                        }}
                      >
                        Enter manually →
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* CITY */}
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                ]}
              >
                <Feather name="map" size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  value={city}
                  onChangeText={setCity}
                  placeholder="City"
                  placeholderTextColor={theme.colors.placeholder}
                  style={[styles.input, { color: theme.colors.text, fontFamily: theme.fonts.primary }]}
                />
              </View>

              {/* STATE + ZIP ROW */}
              <View style={styles.row}>
                <View
                  style={[
                    styles.inputWrapper,
                    styles.rowInput,
                    { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                  ]}
                >
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

                <View
                  style={[
                    styles.inputWrapper,
                    styles.rowInput,
                    { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                  ]}
                >
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

              {error && (
                <Text style={[styles.error, { color: theme.colors.danger }]}>
                  {error}
                </Text>
              )}

              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: step1Valid ? theme.colors.text : theme.colors.textSecondary,
                    opacity: step1Valid ? 1 : 0.5,
                  },
                ]}
                onPress={() => setStep(2)}
                disabled={!step1Valid}
              >
                <Text
                  style={[
                    styles.buttonText,
                    { color: theme.colors.background, fontFamily: theme.fonts.semibold },
                  ]}
                >
                  Continue
                </Text>
              </TouchableOpacity>

            </View>
          </View>
        )}

        {/* ============================================ */}
        {/* STEP 2 — RISK PROFILE */}
        {/* ============================================ */}

        {step === 2 && (
          <View>
            <Text
              style={[
                styles.title,
                { color: theme.colors.text, fontFamily: theme.fonts.semibold },
              ]}
            >
              Risk Profile
            </Text>

            <Text
              style={[
                styles.subtitle,
                { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary },
              ]}
            >
              Powers your AI financial scoring
            </Text>

            <View style={styles.form}>

              <Text
                style={[
                  styles.sectionLabel,
                  { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary },
                ]}
              >
                Risk Tolerance
              </Text>

              {RISK_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.riskCard,
                    {
                      backgroundColor:
                        riskTolerance === opt.value
                          ? theme.colors.text
                          : theme.colors.card,
                      borderColor:
                        riskTolerance === opt.value
                          ? theme.colors.text
                          : theme.colors.border,
                    },
                  ]}
                  onPress={() => setRiskTolerance(opt.value)}
                >
                  <Text
                    style={[
                      styles.riskLabel,
                      {
                        color:
                          riskTolerance === opt.value
                            ? theme.colors.background
                            : theme.colors.text,
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
                        color:
                          riskTolerance === opt.value
                            ? theme.colors.background
                            : theme.colors.textSecondary,
                        fontFamily: theme.fonts.primary,
                      },
                    ]}
                  >
                    {opt.desc}
                  </Text>
                </TouchableOpacity>
              ))}

              <Text
                style={[
                  styles.sectionLabel,
                  {
                    color: theme.colors.textSecondary,
                    fontFamily: theme.fonts.primary,
                    marginTop: 8,
                  },
                ]}
              >
                Investment Experience
              </Text>

              <View style={styles.chipGrid}>
                {EXPERIENCE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          investmentExperience === opt.value
                            ? theme.colors.text
                            : theme.colors.card,
                        borderColor:
                          investmentExperience === opt.value
                            ? theme.colors.text
                            : theme.colors.border,
                      },
                    ]}
                    onPress={() => setInvestmentExperience(opt.value)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color:
                            investmentExperience === opt.value
                              ? theme.colors.background
                              : theme.colors.text,
                          fontFamily: theme.fonts.primary,
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {error && (
                <Text style={[styles.error, { color: theme.colors.danger }]}>
                  {error}
                </Text>
              )}

              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: step2Valid
                      ? theme.colors.text
                      : theme.colors.textSecondary,
                    opacity: step2Valid ? 1 : 0.5,
                  },
                ]}
                onPress={handleFinish}
                disabled={loading || !step2Valid}
              >
                {loading ? (
                  <ActivityIndicator color={theme.colors.background} />
                ) : (
                  <Text
                    style={[
                      styles.buttonText,
                      { color: theme.colors.background, fontFamily: theme.fonts.semibold },
                    ]}
                  >
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
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
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
    marginBottom: 32,
  },
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
});