import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../src/theme/ThemeContext";

// Cents-first money entry. Each digit fills from the cents up:
//   "4"   -> $0.04
//   "49"  -> $0.49
//   "499" -> $4.99
// The parent `value` is kept as a normal dollar string (e.g. "4.99")
// so existing validation/submit (parseFloat(amount)) works unchanged.
export default function AmountInput({
  value,
  setValue,
}: any) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();

  const keyWidth = (width - 48) / 3;
  const keyHeight = 46;

  const MAX_CENTS = 9999999; // up to $99,999.99

  // Derive the current cents integer from the dollar-string value.
  function currentCents(): number {
    const n = parseFloat(value);
    if (!Number.isFinite(n)) return 0;
    return Math.round(n * 100);
  }

  // Write cents back to the parent as a clean dollar string.
  function commitCents(cents: number) {
    const clamped = Math.min(Math.max(cents, 0), MAX_CENTS);
    setValue((clamped / 100).toFixed(2));
  }

  function handleDigit(d: string) {
    const digit = Number(d);
    if (!Number.isFinite(digit)) return;
    const next = currentCents() * 10 + digit;
    commitCents(next);
  }

  function handleDelete() {
    const next = Math.floor(currentCents() / 10);
    commitCents(next);
  }

  function handleClear() {
    setValue("");
  }

  // Display: always two decimals, from the cents integer.
  function displayAmount(): string {
    const cents = currentCents();
    return (cents / 100).toFixed(2);
  }

  const numpadRows = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
  ];

  return (
    <View style={styles.container}>
      {/* HERO AMOUNT */}
      <Text
        style={[
          styles.amount,
          { color: theme.colors.text, fontFamily: theme.fonts.accent2 },
        ]}
      >
        ${displayAmount()}
      </Text>

      {/* KEYPAD */}
      <View style={styles.keyboardContainer}>
        {numpadRows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.key, { width: keyWidth, height: keyHeight }]}
                onPress={() => handleDigit(n)}
                activeOpacity={0.6}
              >
                <Text
                  style={[
                    styles.keyText,
                    { color: theme.colors.text, fontFamily: theme.fonts.accent2 },
                  ]}
                >
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Bottom row: Clear, 0, Backspace */}
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.key, { width: keyWidth, height: keyHeight }]}
            onPress={handleClear}
            activeOpacity={0.6}
          >
            <Text
              style={[
                styles.actionText,
                { color: theme.colors.textSecondary || "#666" },
              ]}
            >
              C
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.key, { width: keyWidth, height: keyHeight }]}
            onPress={() => handleDigit("0")}
            activeOpacity={0.6}
          >
            <Text
              style={[
                styles.keyText,
                { color: theme.colors.text, fontFamily: theme.fonts.accent2 },
              ]}
            >
              0
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.key, { width: keyWidth, height: keyHeight }]}
            onPress={handleDelete}
            activeOpacity={0.6}
          >
            <Ionicons name="backspace-outline" size={22} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  amount: {
    fontSize: 48,
    fontWeight: "700",
    marginBottom: 24,
    textAlign: "center",
    letterSpacing: -1,
  },
  keyboardContainer: {
    width: "100%",
    gap: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  key: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  keyText: {
    fontSize: 26,
    fontWeight: "500",
  },
  actionText: {
    fontSize: 20,
    fontWeight: "400",
  },
});
