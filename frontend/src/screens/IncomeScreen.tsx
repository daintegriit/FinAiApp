import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useFinanceStore } from "../../src/store/financeStore";
import { useTheme } from "../../src/theme/ThemeContext";
import { useFinancialAnalysis } from "../../src/hooks/useFinancialAnalysis";


/* =====================================================
   FREQUENCY OPTIONS
===================================================== */

const FREQUENCIES = [
  { label: "Hourly", value: "hourly", multiplier: 40 * 52 / 12 },
  { label: "Daily", value: "daily", multiplier: 5 * 52 / 12 },
  { label: "Weekly", value: "weekly", multiplier: 52 / 12 },
  { label: "Fortnightly", value: "fortnightly", multiplier: 26 / 12 },
  { label: "Monthly", value: "monthly", multiplier: 1 },
  { label: "Yearly", value: "yearly", multiplier: 1 / 12 },
];

/* =====================================================
   COMPONENT
===================================================== */

export default function IncomeScreen() {

  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const setIncome = useFinanceStore((state) => state.setIncome);
  const currentIncome = useFinanceStore((state) => state.income);

  const [income, setLocalIncome] = useState(
    currentIncome ? String(currentIncome) : ""
  );
  const [frequency, setFrequency] = useState("monthly");
  const [error, setError] = useState<string | null>(null);

  // ===================================================
  // INPUT CLEANING
  // ===================================================

  function handleChange(text: string) {
    const cleaned = text.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) return;
    setLocalIncome(cleaned);
    setError(null);
  }

  // ===================================================
  // CALCULATIONS
  // ===================================================

  const selectedFreq = FREQUENCIES.find(
    (f) => f.value === frequency
  )!;

  const parsedAmount = useMemo(() => {
    const val = parseFloat(income);
    return isNaN(val) ? 0 : val;
  }, [income]);

  const monthlyIncome = useMemo(() => {
    return parsedAmount * selectedFreq.multiplier;
  }, [parsedAmount, selectedFreq]);

  const yearlyIncome = monthlyIncome * 12;
  const weeklyIncome = monthlyIncome / (52 / 12);

  // ===================================================
  // VALIDATION
  // ===================================================

  const isValid = monthlyIncome > 0;

  // ===================================================
  // SAVE
  // ===================================================

  const { runAnalysis } = useFinancialAnalysis();
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!isValid) {
      setError("Please enter a valid income amount");
      return;
    }
    if (monthlyIncome < 500) {
      setError("Income seems too low — double check");
      return;
    }
    if (monthlyIncome > 1000000) {
      setError("Income too large — check input");
      return;
    }

    setSaving(true);
    setIncome(monthlyIncome);

    // Run analysis in background
    runAnalysis().catch(() => {});

    setSaving(false);
    navigation.goBack();
  }

  // ===================================================
  // UI
  // ===================================================

  return (
    <SafeAreaView
      edges={["top"]}
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
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: 60,
          }}
        >

          {/* TOP BAR */}
          <View
            style={[
              styles.topBar,
              { borderBottomColor: theme.colors.divider },
            ]}
          >
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
              style={[
                styles.backButton,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
              ]}
            >
              <Feather
                name="chevron-left"
                size={22}
                color={theme.colors.text}
              />
            </TouchableOpacity>

            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text
                style={[
                  styles.brandTitle,
                  {
                    color: theme.colors.text,
                    fontFamily: theme.fonts.semibold,
                  },
                ]}
              >
                Income
              </Text>
              <Text
                style={[
                  styles.brandSubtitle,
                  {
                    color: theme.colors.textSecondary,
                    fontFamily: theme.fonts.primary,
                  },
                ]}
              >
                Used to power financial insights
              </Text>
            </View>
          </View>

          {/* FREQUENCY SELECTOR */}
          <Text
            style={[
              styles.sectionLabel,
              {
                color: theme.colors.textSecondary,
                fontFamily: theme.fonts.primary,
              },
            ]}
          >
            How often are you paid?
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.frequencyScroll}
            contentContainerStyle={{ gap: 8 }}
          >
            {FREQUENCIES.map((freq) => (
              <TouchableOpacity
                key={freq.value}
                onPress={() => setFrequency(freq.value)}
                style={[
                  styles.freqChip,
                  {
                    backgroundColor:
                      frequency === freq.value
                        ? theme.colors.text
                        : theme.colors.card,
                    borderColor:
                      frequency === freq.value
                        ? theme.colors.text
                        : theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.freqLabel,
                    {
                      color:
                        frequency === freq.value
                          ? theme.colors.background
                          : theme.colors.text,
                      fontFamily: theme.fonts.primary,
                    },
                  ]}
                >
                  {freq.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* AMOUNT INPUT */}
          <Text
            style={[
              styles.sectionLabel,
              {
                color: theme.colors.textSecondary,
                fontFamily: theme.fonts.primary,
                marginTop: 20,
              },
            ]}
          >
            {selectedFreq.label} amount
          </Text>

          <View
            style={[
              styles.inputWrapper,
              {
                borderColor: error
                  ? theme.colors.danger
                  : theme.colors.divider,
                backgroundColor: theme.colors.card,
              },
            ]}
          >
            <Text
              style={[
                styles.currency,
                {
                  color: theme.colors.text,
                  fontFamily: theme.fonts.primary,
                },
              ]}
            >
              $
            </Text>
            <TextInput
              value={income}
              onChangeText={handleChange}
              placeholder="0.00"
              placeholderTextColor={theme.colors.placeholder}
              keyboardType="decimal-pad"
              autoFocus
              style={[
                styles.input,
                {
                  color: theme.colors.text,
                  fontFamily: theme.fonts.primary,
                },
              ]}
            />
            <Text
              style={[
                styles.frequencyTag,
                {
                  color: theme.colors.textSecondary,
                  fontFamily: theme.fonts.primary,
                },
              ]}
            >
              /{frequency === "fortnightly" ? "fortnight" : frequency.replace("ly", "")}
            </Text>
          </View>

          {/* LIVE BREAKDOWN */}
          {monthlyIncome > 0 && (
            <View
              style={[
                styles.breakdown,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.breakdownTitle,
                  {
                    color: theme.colors.textSecondary,
                    fontFamily: theme.fonts.primary,
                  },
                ]}
              >
                Income breakdown
              </Text>

              <View style={styles.breakdownRow}>
                <Text
                  style={[
                    styles.breakdownLabel,
                    {
                      color: theme.colors.textSecondary,
                      fontFamily: theme.fonts.primary,
                    },
                  ]}
                >
                  Weekly
                </Text>
                <Text
                  style={[
                    styles.breakdownValue,
                    {
                      color: theme.colors.text,
                      fontFamily: theme.fonts.semibold,
                    },
                  ]}
                >
                  ${weeklyIncome.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })}
                </Text>
              </View>

              <View
                style={[
                  styles.breakdownDivider,
                  { backgroundColor: theme.colors.divider },
                ]}
              />

              <View style={styles.breakdownRow}>
                <Text
                  style={[
                    styles.breakdownLabel,
                    {
                      color: theme.colors.textSecondary,
                      fontFamily: theme.fonts.primary,
                    },
                  ]}
                >
                  Monthly
                </Text>
                <Text
                  style={[
                    styles.breakdownValue,
                    {
                      color: theme.colors.text,
                      fontFamily: theme.fonts.semibold,
                    },
                  ]}
                >
                  ${monthlyIncome.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })}
                </Text>
              </View>

              <View
                style={[
                  styles.breakdownDivider,
                  { backgroundColor: theme.colors.divider },
                ]}
              />

              <View style={styles.breakdownRow}>
                <Text
                  style={[
                    styles.breakdownLabel,
                    {
                      color: theme.colors.textSecondary,
                      fontFamily: theme.fonts.primary,
                    },
                  ]}
                >
                  Yearly
                </Text>
                <Text
                  style={[
                    styles.breakdownValue,
                    {
                      color: theme.colors.success,
                      fontFamily: theme.fonts.semibold,
                    },
                  ]}
                >
                  ${yearlyIncome.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })}
                </Text>
              </View>
            </View>
          )}

          {/* ERROR */}
          {error && (
            <Text
              style={[
                styles.errorText,
                {
                  color: theme.colors.danger,
                  fontFamily: theme.fonts.primary,
                },
              ]}
            >
              {error}
            </Text>
          )}

          {/* INFO CARD */}
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.divider,
              },
            ]}
          >
            <Text
              style={[
                styles.infoTitle,
                {
                  color: theme.colors.text,
                  fontFamily: theme.fonts.display,
                },
              ]}
            >
              Why this matters
            </Text>
            <Text
              style={[
                styles.infoText,
                {
                  color: theme.colors.textSecondary,
                  fontFamily: theme.fonts.primary,
                },
              ]}
            >
              Your income enables:
            </Text>
            {[
              "Cashflow tracking",
              "Savings rate analysis",
              "Risk evaluation",
              "AI financial scoring",
            ].map((item) => (
              <Text
                key={item}
                style={[
                  styles.infoBullet,
                  {
                    color: theme.colors.textSecondary,
                    fontFamily: theme.fonts.primary,
                  },
                ]}
              >
                • {item}
              </Text>
            ))}
          </View>

          {/* SAVE BUTTON */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              {
                backgroundColor: isValid && !saving
                  ? theme.colors.text
                  : theme.colors.textSecondary,
                opacity: isValid && !saving ? 1 : 0.5,
              },
            ]}
            onPress={handleSave}
            disabled={!isValid || saving}
          >
            <Text
              style={[
                styles.saveText,
                {
                  color: theme.colors.background,
                  fontFamily: theme.fonts.display,
                },
              ]}
            >
              {saving ? "Saving..." : "Save Income"}
            </Text>
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 18,
    marginBottom: 24,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  brandTitle: {
    fontSize: 22,
    letterSpacing: -0.4,
  },
  brandSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 13,
    marginBottom: 10,
  },
  frequencyScroll: {
    marginBottom: 4,
  },
  freqChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  freqLabel: {
    fontSize: 14,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  currency: {
    fontSize: 24,
    marginRight: 8,
    fontWeight: "600",
  },
  input: {
    flex: 1,
    fontSize: 24,
  },
  frequencyTag: {
    fontSize: 14,
    marginLeft: 8,
  },
  breakdown: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
  },
  breakdownTitle: {
    fontSize: 12,
    marginBottom: 14,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontSize: 15,
  },
  breakdownValue: {
    fontSize: 15,
  },
  breakdownDivider: {
    height: 1,
    marginVertical: 8,
    opacity: 0.4,
  },
  errorText: {
    fontSize: 15,
    marginTop: 10,
  },
  infoCard: {
    marginTop: 26,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: 24,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 15,
    marginBottom: 10,
  },
  infoBullet: {
    fontSize: 15,
    marginTop: 4,
  },
  saveButton: {
    marginTop: 32,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  saveText: {
    fontSize: 22,
    fontWeight: "bold",
  },
});