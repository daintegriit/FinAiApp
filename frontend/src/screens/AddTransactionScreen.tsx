import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import AmountInput from "../components/transaction/AmountInput";
import CategoryGrid from "../components/transaction/CategoryGrid";
import { createTransaction } from "../services/transactions";
import { useFinanceStore } from "../store/financeStore";
import { useTheme } from "../theme/ThemeContext";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useFinancialAnalysis } from "../../src/hooks/useFinancialAnalysis";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import FinancialMirror from "../components/transaction/FinancialMirror";

export default function AddTransactionScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [merchant, setMerchant] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMirror, setShowMirror] = useState(false);
  const [savedAmount, setSavedAmount] = useState(0);
  const [savedCategory, setSavedCategory] = useState("");
  const [savedMerchant, setSavedMerchant] = useState("");
  const [savedIsRecurring, setSavedIsRecurring] = useState(false);
  const [savedRecurringTermMonths, setSavedRecurringTermMonths] = useState<number | null>(null);

  // Recurring transaction state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringTermMonths, setRecurringTermMonths] = useState("12");
  const [recurringTouched, setRecurringTouched] = useState(false);

  // Categories that are almost always recurring commitments —
  // used to auto-suggest the toggle state, never to force it.
  const RECURRING_DEFAULT_CATEGORIES = [
    "Subscriptions",
    "Housing",
    "Phone",
    "Gym",
  ];

  // AI categorization state
  const [aiSuggested, setAiSuggested] = useState<string | null>(null);
  const [aiConfidence, setAiConfidence] = useState<number>(0);
  const [aiLoading, setAiLoading] = useState(false);
  const [userOverrode, setUserOverrode] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addTransaction = useFinanceStore((state) => state.addTransaction);
  const { runAnalysis } = useFinancialAnalysis();

  const isValid = !!amount && !!category && parseFloat(amount) > 0;

  // ===================================================
  // AI AUTO-CATEGORIZATION
  // ===================================================

  useEffect(() => {
    const trimmedMerchant = merchant.trim();

    // Reject too-short input, and reject pure numbers (likely a misplaced
    // amount, not a merchant name — e.g. someone typing "150" by mistake)
    if (!trimmedMerchant || trimmedMerchant.length < 3 || /^[\d.,$\s]+$/.test(trimmedMerchant)) {
      setAiSuggested(null);
      setAiConfidence(0);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setAiLoading(true);
      try {
        const res = await api.post("/ai/categorize", {
          merchant: merchant.trim(),
          amount: amount ? parseFloat(amount) : undefined,
        });

        const { category: suggested, confidence } = res.data;

        setAiSuggested(suggested);
        setAiConfidence(confidence);

        // Auto-select only if user hasn't manually overridden
        if (!userOverrode && confidence >= 0.75) {
          setCategory(suggested);
        }

      } catch (err) {
        console.error("❌ AI categorize failed:", err);
      } finally {
        setAiLoading(false);
      }
    }, 900);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [merchant, amount]);

  // Track manual category selection
  function handleCategorySelect(cat: string | null) {
    setCategory(cat);
    if (cat && cat !== aiSuggested) {
      setUserOverrode(true);
    } else {
      setUserOverrode(false);
    }

    // Only auto-suggest if the user hasn't manually touched the toggle
    if (cat && !recurringTouched) {
      setIsRecurring(RECURRING_DEFAULT_CATEGORIES.includes(cat));
    }
  }

  function handleRecurringToggle() {
    setRecurringTouched(true);
    setIsRecurring((prev) => !prev);
  }

  // ===================================================
  // SUBMIT
  // ===================================================

  async function handleSubmit() {
    if (!isValid) return;

    const numericAmount = parseFloat(amount);

    if (numericAmount <= 0) {
      setError("Please enter a valid amount greater than $0.");
      return;
    }

    if (numericAmount > 100000) {
      setError("Amount seems too large. Please double check.");
      return;
    }

    if (!user?.id) {
      setError("You must be signed in to add a transaction.");
      return;
    }

    let parsedTermMonths: number | null = null;
    if (isRecurring) {
      parsedTermMonths = parseFloat(recurringTermMonths);
      if (!parsedTermMonths || parsedTermMonths <= 0 || parsedTermMonths > 600) {
        setError("Please enter a valid term length in months (1–600).");
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const res = await createTransaction({
        user_id: user.id,
        amount: numericAmount,
        category: category!,
        merchant: merchant.trim() || undefined,
        is_recurring: isRecurring,
        recurring_term_months: parsedTermMonths,
      });

      addTransaction(res);

      runAnalysis({ amount: numericAmount, category: category! }).catch(() => {});

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Save for Financial Mirror before clearing
      setSavedAmount(numericAmount);
      setSavedCategory(category!);
      setSavedMerchant(merchant.trim());
      setSavedIsRecurring(isRecurring);
      setSavedRecurringTermMonths(parsedTermMonths);

      setAmount("");
      setCategory(null);
      setMerchant("");
      setAiSuggested(null);
      setUserOverrode(false);
      setIsRecurring(false);
      setRecurringTermMonths("12");
      setRecurringTouched(false);

      // Show Financial Mirror instead of navigating back
      setShowMirror(true);

    } catch (err: any) {
      if (err?.isOffline) {
        setError("No internet connection. Transaction not saved.");
      } else if (err?.response?.status === 401) {
        setError("Session expired. Please sign in again.");
      } else {
        setError(
          err?.backendMessage ||
          "Failed to save transaction. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  // ===================================================
  // UI
  // ===================================================

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 10,
              paddingBottom: 120,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >

            {/* HEADER */}
            <View style={[styles.topBar, { borderBottomColor: theme.colors.divider, backgroundColor: theme.colors.background }]}>
              <TouchableOpacity
                onPress={() => router.back()}
                activeOpacity={0.7}
                style={[styles.backButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
              >
                <Feather name="chevron-left" size={22} color={theme.colors.text} />
              </TouchableOpacity>

              <View style={styles.brandWrapper}>
                <Text style={[styles.brandTitle, { color: theme.colors.text, fontFamily: theme.fonts.semibold }]}>
                  Add Transaction
                </Text>
                <Text style={[styles.brandSubtitle, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
                  Track spending intelligently
                </Text>
              </View>
            </View>

            {/* ERROR BANNER */}
            {error && (
              <View style={[styles.errorBanner, { backgroundColor: "#EF444420", borderColor: "#EF4444" }]}>
                <Feather name="alert-circle" size={14} color="#EF4444" />
                <Text style={[styles.errorText, { color: "#EF4444", fontFamily: theme.fonts.primary }]}>
                  {error}
                </Text>
                <TouchableOpacity onPress={() => setError(null)}>
                  <Feather name="x" size={14} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}

            {/* =========================================== */}
            {/* MERCHANT INPUT + AI BADGE                   */}
            {/* =========================================== */}

            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 13, fontFamily: theme.fonts.primary, color: theme.colors.textSecondary, marginBottom: 8 }}>
                Merchant / Store
              </Text>

              <View style={[styles.merchantRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Feather name="shopping-bag" size={16} color={theme.colors.textSecondary} style={{ marginRight: 10 }} />

                <TextInput
                  value={merchant}
                  onChangeText={(text) => {
                    setMerchant(text);
                    setUserOverrode(false);
                  }}
                  placeholder="e.g. Whole Foods, Netflix, Shell"
                  placeholderTextColor={theme.colors.placeholder}
                  style={{
                    flex: 1,
                    fontSize: 15,
                    color: theme.colors.text,
                    fontFamily: theme.fonts.primary,
                    paddingVertical: 14,
                  }}
                  autoCapitalize="words"
                  returnKeyType="done"
                />

                {aiLoading && (
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                )}
              </View>

              {/* AI SUGGESTION BADGE */}
              {aiSuggested && !aiLoading && (
                <View style={[styles.aiBadge, { backgroundColor: `${theme.colors.accent}15`, borderColor: `${theme.colors.accent}40` }]}>
                  <Text style={{ fontSize: 11, color: theme.colors.accent, fontFamily: theme.fonts.semibold }}>
                    ✦ AI
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.colors.accent, fontFamily: theme.fonts.primary, marginLeft: 4 }}>
                    Suggested {aiSuggested}
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.colors.accent, fontFamily: theme.fonts.primary, marginLeft: 4, opacity: 0.7 }}>
                    ({Math.round(aiConfidence * 100)}% confident)
                  </Text>
                  {userOverrode && (
                    <Text style={{ fontSize: 11, color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginLeft: 6 }}>
                      · overridden
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* CATEGORY GRID */}
            <View style={styles.middleSummaryBox}>
              <CategoryGrid selected={category} setSelected={handleCategorySelect} />
            </View>

            {/* =========================================== */}
            {/* RECURRING TOGGLE                            */}
            {/* =========================================== */}

            <View style={{ marginTop: 16, marginBottom: 8 }}>
              <TouchableOpacity
                onPress={handleRecurringToggle}
                activeOpacity={0.8}
                style={[
                  styles.recurringRow,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: isRecurring ? theme.colors.accent : theme.colors.border,
                  },
                ]}
              >
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <Feather name="repeat" size={16} color={isRecurring ? theme.colors.accent : theme.colors.textSecondary} style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontFamily: theme.fonts.semibold, color: theme.colors.text }}>
                      Recurring transaction
                    </Text>
                    <Text style={{ fontSize: 11, fontFamily: theme.fonts.primary, color: theme.colors.textSecondary, marginTop: 1 }}>
                      Subscriptions, rent, loan payments, etc.
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.toggleTrack,
                    { backgroundColor: isRecurring ? theme.colors.accent : theme.colors.border },
                  ]}
                >
                  <View
                    style={[
                      styles.toggleThumb,
                      {
                        backgroundColor: theme.colors.background,
                        alignSelf: isRecurring ? "flex-end" : "flex-start",
                      },
                    ]}
                  />
                </View>
              </TouchableOpacity>

              {isRecurring && (
                <View style={[styles.termRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <Text style={{ fontSize: 13, fontFamily: theme.fonts.primary, color: theme.colors.textSecondary, marginRight: 10 }}>
                    Term length
                  </Text>
                  <TextInput
                    value={recurringTermMonths}
                    onChangeText={(t) => setRecurringTermMonths(t.replace(/[^0-9]/g, ""))}
                    keyboardType="number-pad"
                    style={{
                      flex: 1,
                      fontSize: 15,
                      color: theme.colors.text,
                      fontFamily: theme.fonts.primary,
                      textAlign: "right",
                    }}
                  />
                  <Text style={{ fontSize: 13, fontFamily: theme.fonts.primary, color: theme.colors.textSecondary, marginLeft: 6 }}>
                    months
                  </Text>
                </View>
              )}
            </View>

            {/* AMOUNT INPUT */}
            <View style={{ marginTop: 8 }}>
              <AmountInput value={amount} setValue={setAmount} />
            </View>

          </ScrollView>

          {/* CONFIRM BUTTON */}
          <View style={[styles.buttonWrapper, { paddingBottom: Math.max(insets.bottom, 16), paddingTop: 12, backgroundColor: theme.colors.background }]}>
            <TouchableOpacity
              style={[
                styles.confirm,
                {
                  backgroundColor: isValid && !loading ? theme.colors.text : theme.colors.textSecondary,
                  opacity: isValid && !loading ? 1 : 0.5,
                },
              ]}
              onPress={handleSubmit}
              disabled={!isValid || loading}
              activeOpacity={0.85}
            >
              <Text style={[styles.confirmText, { color: theme.colors.background, fontFamily: theme.fonts.display || theme.fonts.primary }]}>
                {loading ? "Saving..." : "Confirm"}
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
      <FinancialMirror
          visible={showMirror}
          onClose={() => {
            setShowMirror(false);
            router.back();
          }}
          originalAmount={savedAmount}
          category={savedCategory}
          merchant={savedMerchant}
          isRecurring={savedIsRecurring}
          recurringTermMonths={savedRecurringTermMonths}
        />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 18,
    marginBottom: 24,
    borderBottomWidth: 1,
  },
  brandWrapper: { marginLeft: 14, flex: 1 },
  brandTitle: { fontSize: 22, letterSpacing: -0.4 },
  brandSubtitle: { fontSize: 11, marginTop: 2 },
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 13 },
  merchantRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  buttonWrapper: {
    width: "100%",
    paddingHorizontal: 20,
    zIndex: 999,
  },
  confirm: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  confirmText: { fontSize: 22, fontWeight: "bold" },
  middleSummaryBox: { transform: [{ translateX: -14 }] },
  recurringRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 3,
    justifyContent: "center",
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  termRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 8,
  },
});