import React from "react";
import { Tabs } from "expo-router";
import { useTheme } from "../../src/theme/ThemeContext";

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        // =================================================
        // 🔥 GLOBAL
        // =================================================

        headerShown: false,

        lazy: true,

        freezeOnBlur: true,

        // =================================================
        // 🔥 REMOVE DEFAULT EXPO TAB BAR
        // =================================================

        tabBarStyle: {
          display: "none",
          backgroundColor: theme.colors.background,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },

        sceneStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      {/* ============================================= */}
      {/* 🏠 DASHBOARD */}
      {/* ============================================= */}

      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
        }}
      />

      {/* ============================================= */}
      {/* 📊 ANALYTICS */}
      {/* ============================================= */}

      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
        }}
      />

      {/* ============================================= */}
      {/* ➕ ADD TRANSACTION */}
      {/* ============================================= */}

      <Tabs.Screen
        name="add"
        options={{
          title: "Add",
        }}
      />

      {/* ============================================= */}
      {/* 💰 INCOME */}
      {/* ============================================= */}

      <Tabs.Screen
        name="income"
        options={{
          title: "Income",
        }}
      />

      {/* ============================================= */}
      {/* 🧠 PROFILE */}
      {/* ============================================= */}

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
        }}
      />

      {/* ============================================= */}
      {/* 🧪 SIMULATE */}
      {/* ============================================= */}

      <Tabs.Screen
        name="simulate"
        options={{
          title: "Simulate",
        }}
      />

      <Tabs.Screen
        name="financial"
        options={{
          title: "Financial",
        }}
      />

      <Tabs.Screen
        name="peers"
        options={{
          title: "Peers",
        }}
      />

      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
        }}
      />
      
    </Tabs>
  );
}