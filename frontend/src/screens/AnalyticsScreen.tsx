import React from "react";

import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
} from "react-native";

import { SafeAreaView }
from "react-native-safe-area-context";

import {
  MaterialIcons,
} from "@expo/vector-icons";

import DashboardHeader
from "../components/header/DashboardHeader";

import MonthlySummary
from "../components/dashboard/MonthlySummary";

import SpendingTrend
from "../components/dashboard/SpendingTrend";

import DonutSwitcher
from "../components/dashboard/DonutSwitcher";

import CategoryBreakdown
from "../components/dashboard/CategoryBreakdown";

import { useTheme }
from "../theme/ThemeContext";

export default function AnalyticsScreen() {

  const { theme } =
    useTheme();

  return (

    <SafeAreaView
      edges={["top"]}
      style={[

        styles.safeArea,

        {
          backgroundColor:
            theme.colors.background,
        },
      ]}
    >

      <StatusBar
        barStyle={
          theme.mode === "dark"
            ? "light-content"
            : "dark-content"
        }
        backgroundColor={
          theme.colors.background
        }
      />

      <ScrollView

        showsVerticalScrollIndicator={
          false
        }

        contentContainerStyle={
          styles.scrollContent
        }
      >

        {/* ====================================== */}
        {/* 🔥 DASHBOARD HEADER */}
        {/* ====================================== */}

        <DashboardHeader
          hideSettings
          showBackButton
        />

        {/* ====================================== */}
        {/* 🔥 SUMMARY */}
        {/* ====================================== */}

        <View
          style={
            styles.sectionSpacing
          }
        >

          <MonthlySummary />

        </View>

        {/* ====================================== */}
        {/* 🔥 DONUT ANALYTICS */}
        {/* ====================================== */}

        <View
          style={
            styles.sectionSpacing
          }
        >

          <DonutSwitcher />

        </View>

        {/* ====================================== */}
        {/* 🔥 TREND */}
        {/* ====================================== */}

        <View
          style={
            styles.sectionSpacing
          }
        >

          <SpendingTrend />

        </View>

        {/* ====================================== */}
        {/* 🔥 BREAKDOWN */}
        {/* ====================================== */}

        <View
          style={
            styles.sectionSpacing
          }
        >

          <View
            style={
              styles.sectionHeader
            }
          >

            <MaterialIcons
              name="insights"
              size={18}
              color={
                theme.colors.primary
              }
            />

          </View>

          <CategoryBreakdown />

        </View>

      </ScrollView>

    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({

    safeArea: {
      flex: 1,
    },

    scrollContent: {

      paddingBottom: 80,

      paddingHorizontal: 18,
    },

    sectionSpacing: {

      marginTop: 22,
    },

    sectionHeader: {

      flexDirection: "row",

      alignItems: "center",

      marginBottom: 16,
    },
  });