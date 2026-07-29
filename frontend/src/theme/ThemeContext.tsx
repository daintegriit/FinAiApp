// src/theme/ThemeContext.tsx

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";

import AsyncStorage
from "@react-native-async-storage/async-storage";

import {
  baseThemes,
} from "./baseThemes";

import type {
  ThemeContextType,
  ThemeMode,
  Theme,
} from "./types";

// =====================================================
// 🔥 STORAGE KEY
// =====================================================

const STORAGE_KEY =
  "@finai_theme";

// =====================================================
// 🔥 DEFAULT THEME
// =====================================================

const defaultTheme: Theme =
  baseThemes.light;

// =====================================================
// 🔥 DEFAULT CONTEXT
// =====================================================

const ThemeContext =
  createContext<ThemeContextType>({

    theme:
      defaultTheme,

    mode:
      "light",

    isDark:
      true,

    setThemeMode:
      () => {},

    toggleTheme:
      () => {},
  });

// =====================================================
// 🔥 PROVIDER TYPES
// =====================================================

type Props = {

  children:
    ReactNode;
};

// =====================================================
// 🔥 PROVIDER
// =====================================================

export function ThemeProvider({
  children,
}: Props) {

  // ===================================================
  // 🔥 MODE
  // ===================================================

  const [mode, setMode] =
    useState<ThemeMode>(
      "light"
    );

  // ===================================================
  // 🔥 LOAD SAVED THEME
  // ===================================================

  useEffect(() => {

    async function loadTheme() {

      try {

        const savedTheme =
          await AsyncStorage.getItem(
            STORAGE_KEY
          );

        if (

          savedTheme &&

          savedTheme in
            baseThemes

        ) {

          setMode(
            savedTheme as ThemeMode
          );
        }

      } catch (err) {

        console.log(
          "Theme load error",
          err
        );
      }
    }

    loadTheme();

  }, []);

  // ===================================================
  // 🔥 SET THEME
  // ===================================================

  async function setThemeMode(
    newMode: ThemeMode
  ) {

    try {

      await AsyncStorage.setItem(
        STORAGE_KEY,
        newMode
      );

      setMode(
        newMode
      );

    } catch (err) {

      console.log(
        "Theme save error",
        err
      );
    }
  }

  // ===================================================
  // 🔥 TOGGLE
  // ===================================================

  function toggleTheme() {

    if (
      mode === "light"
    ) {

      setThemeMode(
        "night"
      );

    } else {

      setThemeMode(
        "light"
      );
    }
  }

  // ===================================================
  // 🔥 ACTIVE THEME
  // ===================================================

  const theme =
    useMemo<Theme>(
      () => {

        return (
          baseThemes[
            mode
          ] as Theme
        );
      },
      [mode]
    );

  // ===================================================
  // 🔥 DARK MODE
  // ===================================================

  const isDark =
    theme.mode ===
    "dark";

  // ===================================================
  // 🔥 CONTEXT VALUE
  // ===================================================

  const contextValue =
    useMemo<ThemeContextType>(
      () => ({

        theme,

        mode,

        isDark,

        setThemeMode,

        toggleTheme,
      }),

      [
        theme,
        mode,
        isDark,
      ]
    );

  // ===================================================
  // 🔥 PROVIDER
  // ===================================================

  return (

    <ThemeContext.Provider
      value={
        contextValue
      }
    >

      {children}

    </ThemeContext.Provider>
  );
}

// =====================================================
// 🔥 HOOK
// =====================================================

export function useTheme() {

  return useContext(
    ThemeContext
  );
}