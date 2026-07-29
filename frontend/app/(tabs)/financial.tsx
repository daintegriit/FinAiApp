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
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../src/theme/ThemeContext";
import { useFinanceStore } from "../../src/store/financeStore";
import { useFinancialAnalysis } from "../../src/hooks/useFinancialAnalysis";

/* =====================================================
   OPTIONS
===================================================== */

const GOAL_OPTIONS = [
  { label: "Emergency Fund", value: "emergency_fund" },
  { label: "Pay Off Debt", value: "pay_off_debt" },
  { label: "Save for Home", value: "save_for_home" },
  { label: "Grow Investments", value: "grow_investments" },
  { label: "Retirement", value: "retirement" },
];

const LIFESTYLE_OPTIONS = [
  { label: "Minimalist", value: "minimalist", desc: "Spend less, save more" },
  { label: "Balanced", value: "balanced", desc: "Mix of saving and living" },
  { label: "Comfortable", value: "comfortable", desc: "Prioritize quality of life" },
];

const STABILITY_OPTIONS = [
  { label: "Very Stable", value: "very_stable", desc: "Government/corporate job" },
  { label: "Stable", value: "stable", desc: "Permanent employment" },
  { label: "Variable", value: "variable", desc: "Commission/freelance" },
  { label: "Unpredictable", value: "unpredictable", desc: "Gig/seasonal" },
];

/* =====================================================
   COMPONENT
===================================================== */

export default function FinancialProfileScreen() {

  const { theme } = useTheme();
  const router = useRouter();
  const setProfile = useFinanceStore((s) => s.setProfile);
  const { runAnalysis } = useFinancialAnalysis();

  // ===================================================
  // STATE
  // ===================================================

  const [savings, setSavings] = useState("");
  const [debt, setDebt] = useState("");
  const [emergencyMonths, setEmergencyMonths] = useState("");
  const [financialGoal, setFinancialGoal] = useState<string | null>(null);
  const [lifestyle, setLifestyle] = useState<string | null>(null);
  const [incomeStability, setIncomeStability] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ===================================================
  // VALIDATION
  // ===================================================

  const isValid =
    financialGoal !== null &&
    lifestyle !== null &&
    incomeStability !== null;

  // ===================================================
  // SUBMIT
  // ===================================================
  async function handleSubmit() {
    if (!isValid) return;
    setLoading(true);

    try {
      const profile = {
            savings_buffer: savings ? parseFloat(savings) : 0,
            existing_debt: debt ? parseFloat(debt) : 0,
            emergency_fund_months: emergencyMonths ? parseInt(emergencyMonths) : 0,
            financial_goal: financialGoal as any,
            lifestyle_priority: lifestyle as any,
            income_stability: incomeStability as any,
            family_value: 5,
            personal_satisfaction: 5,
          };

      setProfile(profile);

      // Try to run analysis but don't block if income not set yet
      try {
        await runAnalysis();
      } catch (analysisErr: any) {
        console.log("Analysis skipped:", analysisErr?.message);
        // Income not set yet — that's ok, go to income screen first
      }

      router.replace("/(tabs)");

    } catch (err) {
      console.error("Profile setup failed:", err);
      Alert.alert("Error", "Failed to save profile. Try again.");
    } finally {
      setLoading(false);
    }
  }

  // ===================================================
  // UI
  // ===================================================

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
      }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 60,
            paddingBottom: 60,
          }}
          keyboardShouldPersistTaps="handled"
        >

          {/* HEADER */}
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Feather name="chevron-left" size={22} color={theme.colors.text} />
          </TouchableOpacity>

          <Text
            style={[
              styles.title,
              {
                color: theme.colors.text,
                fontFamily: theme.fonts.semibold,
              },
            ]}
          >
            Financial Snapshot
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
            Powers your AI financial score
          </Text>

          {/* ========================================= */}
          {/* SAVINGS */}
          {/* ========================================= */}

          <Text style={[styles.label, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
            Current Savings
          </Text>

          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.prefix, { color: theme.colors.textSecondary }]}>$</Text>
            <TextInput
              value={savings}
              onChangeText={setSavings}
              placeholder="0"
              placeholderTextColor={theme.colors.placeholder}
              keyboardType="decimal-pad"
              style={[styles.input, { color: theme.colors.text, fontFamily: theme.fonts.primary }]}
            />
          </View>

          {/* ========================================= */}
          {/* DEBT */}
          {/* ========================================= */}

          <Text style={[styles.label, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
            Existing Debt
          </Text>

          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.prefix, { color: theme.colors.textSecondary }]}>$</Text>
            <TextInput
              value={debt}
              onChangeText={setDebt}
              placeholder="0"
              placeholderTextColor={theme.colors.placeholder}
              keyboardType="decimal-pad"
              style={[styles.input, { color: theme.colors.text, fontFamily: theme.fonts.primary }]}
            />
          </View>

          {/* ========================================= */}
          {/* EMERGENCY FUND */}
          {/* ========================================= */}

          <Text style={[styles.label, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
            Emergency Fund (months of expenses covered)
          </Text>

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
              name="shield"
              size={18}
              color={theme.colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              value={emergencyMonths}
              onChangeText={setEmergencyMonths}
              placeholder="0"
              placeholderTextColor={theme.colors.placeholder}
              keyboardType="number-pad"
              style={[styles.input, { color: theme.colors.text, fontFamily: theme.fonts.primary }]}
            />
            <Text style={[styles.suffix, { color: theme.colors.textSecondary }]}>months</Text>
          </View>

          {/* ========================================= */}
          {/* FINANCIAL GOAL */}
          {/* ========================================= */}

          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
            Primary Financial Goal
          </Text>

          <View style={styles.chipGrid}>
            {GOAL_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      financialGoal === opt.value
                        ? theme.colors.text
                        : theme.colors.card,
                    borderColor:
                      financialGoal === opt.value
                        ? theme.colors.text
                        : theme.colors.border,
                  },
                ]}
                onPress={() => setFinancialGoal(opt.value)}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color:
                        financialGoal === opt.value
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

          {/* ========================================= */}
          {/* LIFESTYLE */}
          {/* ========================================= */}

          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
            Lifestyle Priority
          </Text>

          {LIFESTYLE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.card,
                {
                  backgroundColor:
                    lifestyle === opt.value
                      ? theme.colors.text
                      : theme.colors.card,
                  borderColor:
                    lifestyle === opt.value
                      ? theme.colors.text
                      : theme.colors.border,
                },
              ]}
              onPress={() => setLifestyle(opt.value)}
            >
              <Text
                style={[
                  styles.cardLabel,
                  {
                    color:
                      lifestyle === opt.value
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
                  styles.cardDesc,
                  {
                    color:
                      lifestyle === opt.value
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

          {/* ========================================= */}
          {/* INCOME STABILITY */}
          {/* ========================================= */}

          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
            Income Stability
          </Text>

          {STABILITY_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.card,
                {
                  backgroundColor:
                    incomeStability === opt.value
                      ? theme.colors.text
                      : theme.colors.card,
                  borderColor:
                    incomeStability === opt.value
                      ? theme.colors.text
                      : theme.colors.border,
                },
              ]}
              onPress={() => setIncomeStability(opt.value)}
            >
              <Text
                style={[
                  styles.cardLabel,
                  {
                    color:
                      incomeStability === opt.value
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
                  styles.cardDesc,
                  {
                    color:
                      incomeStability === opt.value
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

          {/* ========================================= */}
          {/* SUBMIT */}
          {/* ========================================= */}

          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: isValid
                  ? theme.colors.text
                  : theme.colors.textSecondary,
                opacity: isValid ? 1 : 0.5,
              },
            ]}
            onPress={handleSubmit}
            disabled={loading || !isValid}
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
                Run AI Analysis
              </Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* =====================================================
   STYLES
===================================================== */

const styles = StyleSheet.create({
  title: {
    fontSize: 32,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 32,
  },
  label: {
    fontSize: 13,
    marginBottom: 8,
    marginTop: 20,
  },
  sectionLabel: {
    fontSize: 13,
    marginBottom: 10,
    marginTop: 24,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  prefix: {
    fontSize: 18,
    fontWeight: "600",
    marginRight: 8,
  },
  suffix: {
    fontSize: 14,
    marginLeft: 8,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
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
  chipText: {
    fontSize: 14,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 16,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
  },
  button: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 32,
  },
  buttonText: {
    fontSize: 18,
  },
});