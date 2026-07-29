import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Location from "expo-location";

import { useFinanceStore } from "../../src/store/financeStore";
import { useTheme } from "../../src/theme/ThemeContext";
import { useAuth } from "../../src/context/AuthContext";
import { api } from "../../src/services/api";
import DashboardHeader from "../../src/components/header/DashboardHeader";
import { useFinancialAnalysis } from "../../src/hooks/useFinancialAnalysis";

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
  { label: "Conservative", value: "conservative" },
  { label: "Moderate", value: "moderate" },
  { label: "Aggressive", value: "aggressive" },
];

const EXPERIENCE_OPTIONS = [
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
  { label: "Expert", value: "expert" },
];

const GOAL_OPTIONS = [
  { label: "Emergency Fund", value: "emergency_fund" },
  { label: "Pay Off Debt", value: "pay_off_debt" },
  { label: "Save for Home", value: "save_for_home" },
  { label: "Grow Investments", value: "grow_investments" },
  { label: "Retirement", value: "retirement" },
];

const LIFESTYLE_OPTIONS = [
  { label: "Minimalist", value: "minimalist" },
  { label: "Balanced", value: "balanced" },
  { label: "Comfortable", value: "comfortable" },
];

const STABILITY_OPTIONS = [
  { label: "Very Stable", value: "very_stable" },
  { label: "Stable", value: "stable" },
  { label: "Variable", value: "variable" },
  { label: "Unpredictable", value: "unpredictable" },
];

export default function EditProfileScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const setProfile = useFinanceStore((s) => s.setProfile);
  const setIncome = useFinanceStore((s) => s.setIncome);
  const { runAnalysis } = useFinancialAnalysis();

  // Core financials
  const [income, setIncomeInput] = useState("");
  const [age, setAge] = useState("");
  const [employmentType, setEmploymentType] = useState<string | null>(null);

  // Risk profile
  const [riskTolerance, setRiskTolerance] = useState<string | null>(null);
  const [investmentExperience, setInvestmentExperience] = useState<string | null>(null);

  // Financial snapshot
  const [savings, setSavings] = useState("");
  const [debt, setDebt] = useState("");
  const [emergencyFundMonths, setEmergencyFundMonths] = useState("");

  // Goals & lifestyle
  const [financialGoal, setFinancialGoal] = useState<string | null>(null);
  const [lifestyle, setLifestyle] = useState<string | null>(null);
  const [incomeStability, setIncomeStability] = useState<string | null>(null);

  // Location
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /* ===================================================
     LOAD EXISTING PROFILE
  =================================================== */

  useEffect(() => {
    if (!user?.id) return;

    async function loadProfile() {
      try {
        const res = await api.get(`/profile`);
        const p = res.data?.profile;

        if (p) {
          setIncomeInput(p.monthly_income != null ? String(p.monthly_income) : "");
          setAge(p.age != null ? String(p.age) : "");
          setEmploymentType(p.employment_type || null);
          setRiskTolerance(p.risk_tolerance || null);
          setInvestmentExperience(p.investment_experience || null);
          setSavings(p.savings_amount != null ? String(p.savings_amount) : "");
          setDebt(p.debt_amount != null ? String(p.debt_amount) : "");
          setEmergencyFundMonths(p.emergency_fund_months != null ? String(p.emergency_fund_months) : "");
          setFinancialGoal(p.financial_goal || null);
          setLifestyle(p.lifestyle || null);
          setIncomeStability(p.income_stability || null);
          setCity(p.city || "");
          setState(p.state || "");
          setZipCode(p.zip_code || "");
          setLatitude(p.latitude ?? null);
          setLongitude(p.longitude ?? null);
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setFetching(false);
      }
    }

    loadProfile();
  }, [user?.id]);

  /* ===================================================
     AUTO-DETECT LOCATION
  =================================================== */

  async function handleDetectLocation() {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
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
    } finally {
      setLocationLoading(false);
    }
  }

  /* ===================================================
     SAVE
  =================================================== */

  const isValid = income.length > 0 && employmentType !== null;

  async function handleSave() {
    if (!isValid) {
      setError("Income and employment type are required.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    const payload = {
      user_id: user?.id,
      monthly_income: parseFloat(income) || 0,
      age: age ? parseInt(age) : null,
      employment_type: employmentType,
      risk_tolerance: riskTolerance,
      investment_experience: investmentExperience,
      savings_amount: savings ? parseFloat(savings) : null,
      debt_amount: debt ? parseFloat(debt) : null,
      emergency_fund_months: emergencyFundMonths ? parseInt(emergencyFundMonths) : null,
      financial_goal: financialGoal,
      lifestyle: lifestyle,
      income_stability: incomeStability,
      city: city || null,
      state: state || null,
      zip_code: zipCode || null,
      latitude: latitude,
      longitude: longitude,
    };

    try {
      await api.put("/profile", payload);

      // Sync local store
      setIncome(parseFloat(income) || 0);
      setProfile({
        age: payload.age ?? undefined,
        employment_type: employmentType as any,
        risk_tolerance: riskTolerance as any,
        investment_experience: investmentExperience as any,
        savings_buffer: payload.savings_amount ?? undefined,
        existing_debt: payload.debt_amount ?? undefined,
        emergency_fund_months: payload.emergency_fund_months ?? undefined,
        financial_goal: financialGoal as any,
        lifestyle_priority: lifestyle as any,
        income_stability: incomeStability as any,
        city: city || undefined,
        state: state || undefined,
        zip_code: zipCode || undefined,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
      });


      // Saving the profile is also the moment to (re)run the AI analysis,
      // since every field here feeds the score. Don't block the save if
      // analysis fails (e.g. income not set yet or quota).
      try {
        await runAnalysis({ income: parseFloat(income) || 0, forceRefresh: true });
      } catch (analysisErr: any) {
        console.log("Analysis skipped:", analysisErr?.message);
      }

      setSuccess(true);
      setTimeout(() => router.replace("/(tabs)" as any), 900);
    } catch (err: any) {
      setError(err?.backendMessage || "Failed to save profile. Try again.");
    } finally {
      setSaving(false);
    }
  }

  /* ===================================================
     UI
  =================================================== */

  if (fetching) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={theme.colors.text} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>

        <DashboardHeader hideSettings showBackButton />

        <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.fonts.semibold }]}>
          Edit Profile
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
          Update your financial details and preferences
        </Text>

        {error && (
          <View style={[styles.banner, { borderColor: "#EF4444", backgroundColor: "#EF444420" }]}>
            <Feather name="alert-circle" size={14} color="#EF4444" />
            <Text style={{ flex: 1, color: "#EF4444", fontSize: 13, fontFamily: theme.fonts.primary }}>{error}</Text>
            <TouchableOpacity onPress={() => setError(null)}>
              <Feather name="x" size={14} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}

        {success && (
          <View style={[styles.banner, { borderColor: theme.colors.success, backgroundColor: `${theme.colors.success}20` }]}>
            <Feather name="check-circle" size={14} color={theme.colors.success} />
            <Text style={{ flex: 1, color: theme.colors.success, fontSize: 13, fontFamily: theme.fonts.primary }}>
              Profile saved
            </Text>
          </View>
        )}

        {/* INCOME & AGE */}
        <SectionLabel theme={theme} text="Financial Basics" />
        <MoneyInput label="Monthly Income" value={income} setValue={setIncomeInput} theme={theme} />
        <NumberInput label="Age" value={age} setValue={setAge} theme={theme} />

        {/* EMPLOYMENT */}
        <SectionLabel theme={theme} text="Employment Type" />
        <ChipGrid options={EMPLOYMENT_OPTIONS} selected={employmentType} onSelect={setEmploymentType} theme={theme} />

        {/* RISK */}
        <SectionLabel theme={theme} text="Risk Tolerance" />
        <ChipGrid options={RISK_OPTIONS} selected={riskTolerance} onSelect={setRiskTolerance} theme={theme} />

        <SectionLabel theme={theme} text="Investment Experience" />
        <ChipGrid options={EXPERIENCE_OPTIONS} selected={investmentExperience} onSelect={setInvestmentExperience} theme={theme} />

        {/* SNAPSHOT */}
        <SectionLabel theme={theme} text="Financial Snapshot" />
        <MoneyInput label="Savings" value={savings} setValue={setSavings} theme={theme} />
        <MoneyInput label="Existing Debt" value={debt} setValue={setDebt} theme={theme} />
        <NumberInput label="Emergency Fund (months)" value={emergencyFundMonths} setValue={setEmergencyFundMonths} theme={theme} />

        {/* GOALS */}
        <SectionLabel theme={theme} text="Financial Goal" />
        <ChipGrid options={GOAL_OPTIONS} selected={financialGoal} onSelect={setFinancialGoal} theme={theme} />

        <SectionLabel theme={theme} text="Lifestyle" />
        <ChipGrid options={LIFESTYLE_OPTIONS} selected={lifestyle} onSelect={setLifestyle} theme={theme} />

        <SectionLabel theme={theme} text="Income Stability" />
        <ChipGrid options={STABILITY_OPTIONS} selected={incomeStability} onSelect={setIncomeStability} theme={theme} />

        {/* LOCATION */}
        <SectionLabel theme={theme} text="Location" />

        <TouchableOpacity
          style={[
            styles.detectButton,
            {
              backgroundColor: latitude ? `${theme.colors.success}20` : theme.colors.card,
              borderColor: latitude ? theme.colors.success : theme.colors.border,
            },
          ]}
          onPress={handleDetectLocation}
          disabled={locationLoading}
        >
          {locationLoading ? (
            <ActivityIndicator size="small" color={theme.colors.text} />
          ) : (
            <>
              <Feather name={latitude ? "check-circle" : "map-pin"} size={16} color={latitude ? theme.colors.success : theme.colors.text} />
              <Text style={[styles.detectText, { color: latitude ? theme.colors.success : theme.colors.text, fontFamily: theme.fonts.primary }]}>
                {latitude ? "Location detected ✓" : "Auto-detect my location"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TextField label="City" value={city} setValue={setCity} theme={theme} />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <TextField label="State" value={state} setValue={setState} theme={theme} autoCapitalize="characters" maxLength={2} />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Zip Code" value={zipCode} setValue={setZipCode} theme={theme} keyboardType="number-pad" maxLength={10} />
          </View>
        </View>

        {/* SAVE */}
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: isValid ? theme.colors.text : theme.colors.card,
              opacity: saving ? 0.7 : isValid ? 1 : 0.5,
            },
          ]}
          onPress={handleSave}
          disabled={!isValid || saving}
        >
          {saving ? (
            <ActivityIndicator color={theme.colors.background} />
          ) : (
            <Text style={[styles.buttonText, { color: theme.colors.background, fontFamily: theme.fonts.semibold }]}>
              Save Profile
            </Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

/* =====================================================
   SMALL COMPONENTS
===================================================== */

function SectionLabel({ theme, text }: { theme: any; text: string }) {
  return (
    <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
      {text}
    </Text>
  );
}

function ChipGrid({
  options,
  selected,
  onSelect,
  theme,
}: {
  options: { label: string; value: string }[];
  selected: string | null;
  onSelect: (v: string) => void;
  theme: any;
}) {
  return (
    <View style={styles.chipGrid}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[
            styles.chip,
            {
              backgroundColor: selected === opt.value ? theme.colors.text : theme.colors.card,
              borderColor: selected === opt.value ? theme.colors.text : theme.colors.border,
            },
          ]}
          onPress={() => onSelect(opt.value)}
        >
          <Text
            style={[
              styles.chipText,
              {
                color: selected === opt.value ? theme.colors.background : theme.colors.text,
                fontFamily: theme.fonts.primary,
              },
            ]}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function MoneyInput({ label, value, setValue, theme }: any) {
  return (
    <View style={styles.inputWrap}>
      <Text style={[styles.inputLabel, { color: theme.colors.text, fontFamily: theme.fonts.primary }]}>{label}</Text>
      <View style={[styles.moneyInput, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
        <Text style={{ color: theme.colors.textSecondary, marginRight: 6 }}>$</Text>
        <TextInput
          value={value}
          onChangeText={(t) => setValue(t.replace(/[^0-9.]/g, ""))}
          placeholder="0"
          placeholderTextColor={theme.colors.placeholder}
          keyboardType="decimal-pad"
          style={{ flex: 1, color: theme.colors.text, fontFamily: theme.fonts.primary, fontSize: 16, paddingVertical: 14 }}
        />
      </View>
    </View>
  );
}

function NumberInput({ label, value, setValue, theme }: any) {
  return (
    <View style={styles.inputWrap}>
      <Text style={[styles.inputLabel, { color: theme.colors.text, fontFamily: theme.fonts.primary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={(t) => setValue(t.replace(/[^0-9]/g, ""))}
        placeholder="0"
        placeholderTextColor={theme.colors.placeholder}
        keyboardType="number-pad"
        style={[styles.input, { borderColor: theme.colors.border, backgroundColor: theme.colors.card, color: theme.colors.text, fontFamily: theme.fonts.primary }]}
      />
    </View>
  );
}

function TextField({ label, value, setValue, theme, autoCapitalize, maxLength, keyboardType }: any) {
  return (
    <View style={styles.inputWrap}>
      <Text style={[styles.inputLabel, { color: theme.colors.text, fontFamily: theme.fonts.primary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder={label}
        placeholderTextColor={theme.colors.placeholder}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
        keyboardType={keyboardType}
        style={[styles.input, { borderColor: theme.colors.border, backgroundColor: theme.colors.card, color: theme.colors.text, fontFamily: theme.fonts.primary }]}
      />
    </View>
  );
}

/* =====================================================
   STYLES
===================================================== */

const styles = StyleSheet.create({
  title: { fontSize: 28, letterSpacing: -0.5, marginTop: 8 },
  subtitle: { fontSize: 14, marginTop: 6, marginBottom: 20 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionLabel: { fontSize: 13, marginTop: 22, marginBottom: 10 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 14 },
  inputWrap: { marginTop: 14 },
  inputLabel: { marginBottom: 8, fontSize: 13 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
  moneyInput: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 14, paddingHorizontal: 16 },
  detectButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  detectText: { fontSize: 14 },
  row: { flexDirection: "row", gap: 10 },
  button: { marginTop: 32, paddingVertical: 18, borderRadius: 16, alignItems: "center" },
  buttonText: { fontSize: 17 },
});