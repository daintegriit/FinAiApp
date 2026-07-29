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

export default function AmountInput({
  value,
  setValue,
}: any) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();

  // 3 Columns stretched elegantly to the screen edges with padding
  const keyWidth = (width - 48) / 3; 
  const keyHeight = 46; // Compact, clean hit target

  function handlePress(num: string) {
    setValue((prev: string) => {
      if (num === "." && prev.includes(".")) return prev;
      if (prev === "0" && num !== ".") return num;
      return prev + num;
    });
  }

  function handleDelete() {
    setValue((prev: string) => prev.slice(0, -1));
  }

  function handleClear() {
    setValue("");
  }

  function formatAmount(val: string) {
    if (!val) return "0.00";
    const num = parseFloat(val);
    if (isNaN(num)) return "0.00";
    return num.toFixed(2);
  }

  const numpadRows = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"]
  ];

  return (
    <View style={styles.container}>
      {/* ====================================== */}
      {/* 💰 PREMIUM HERO AMOUNT READOUT */}
      {/* ====================================== */}
      <Text style={[styles.amount, { color: theme.colors.text, fontFamily: theme.fonts.accent2 }]}>
        ${formatAmount(value)}
      </Text>

      {/* ====================================== */}
      {/* 🕹️ CLEAN, BORDERLESS 3-COLUMN KEYPAD */}
      {/* ====================================== */}
      <View style={styles.keyboardContainer}>
        {/* Core numbers 1 through 9 */}
        {numpadRows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((n) => (
              <TouchableOpacity 
                key={n} 
                style={[styles.key, { width: keyWidth, height: keyHeight }]} 
                onPress={() => handlePress(n)}
                activeOpacity={0.6}
              >
                <Text style={[styles.keyText, { color: theme.colors.text, fontFamily: theme.fonts.accent2 }]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Dynamic bottom row: Clear (C), Zero (0), Backspace (⌫) */}
        <View style={styles.row}>
          {/* C Key */}
          <TouchableOpacity 
            style={[styles.key, { width: keyWidth, height: keyHeight }]} 
            onPress={handleClear}
            activeOpacity={0.6}
          >
            <Text style={[styles.actionText, { color: theme.colors.textSecondary || "#666" }]}>C</Text>
          </TouchableOpacity>
          
          {/* 0 Key */}
          <TouchableOpacity 
            style={[styles.key, { width: keyWidth, height: keyHeight }]} 
            onPress={() => handlePress("0")}
            activeOpacity={0.6}
          >
            <Text style={[styles.keyText, { color: theme.colors.text, fontFamily: theme.fonts.accent2 }]}>0</Text>
          </TouchableOpacity>

          {/* Backspace Key integrated directly into the layout */}
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

/* =====================================================
   🎨 MINIMALIST FINTECH DESIGN STYLES
===================================================== */
const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 24, // Symmetrical, premium breathing room
  },
  amount: {
    fontSize: 48, // Large, confident hero font size
    fontWeight: "700",
    marginBottom: 24,
    textAlign: "center",
    letterSpacing: -1,
  },
  keyboardContainer: {
    width: "100%",
    gap: 4, // Tight gaps drop total component height
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  key: {
    justifyContent: "center",
    alignItems: "center",
    // Note: No background color, no borders, no cards. Clean glass look.
    backgroundColor: "transparent", 
  },
  keyText: {
    fontSize: 26, // Elegant typography scale
    fontWeight: "500",
  },
  actionText: {
    fontSize: 20,
    fontWeight: "400",
  }
});
