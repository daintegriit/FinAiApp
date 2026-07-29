import React, { useRef, useState, useEffect } from "react";
import {
  Alert,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Modal,
  Animated,
  useWindowDimensions,
  TextInput,
} from "react-native";

import Svg, { Circle } from "react-native-svg";

import * as IoniconGlyphs
from "@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json";

import { Ionicons }
from "@expo/vector-icons";

import { useTheme }
from "../../../src/theme/ThemeContext";

import {
  useFinanceStore,
  DEFAULT_CATEGORIES,
} from "../../../src/store/financeStore";

import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../../../src/services/categories";

import { useAuth } from "../../../src/context/AuthContext";

const COLS = 5;
const ROWS = 3;
const PAGE_SIZE = 15;
const SIDE_PADDING = 20;

const ALL_ICONS =
  Object.keys(IoniconGlyphs);

const ICON_KEYWORDS:
Record<string, string[]> = {

  "cafe-outline":
    ["coffee", "drink", "cafe"],

  "fast-food-outline":
    ["food", "burger", "meal"],

  "restaurant-outline":
    ["restaurant", "dinner", "eat"],

  "car-outline":
    ["car", "drive", "vehicle"],

  "airplane-outline":
    ["travel", "flight", "plane"],

  "home-outline":
    ["home", "house"],

  "business-outline":
    ["building", "office"],

  "wallet-outline":
    ["money", "wallet", "finance"],

  "cash-outline":
    ["cash", "money"],

  "card-outline":
    ["card", "payment"],

  "game-controller-outline":
    ["game", "gaming"],

  "barbell-outline":
    ["gym", "fitness"],

  "medkit-outline":
    ["health", "medical"],

  "school-outline":
    ["school", "education"],

  "cart-outline":
    ["shopping", "cart"],

  "happy-outline":
    ["kids", "fun", "smile"],
};

/* ===================================================== */
/* 🔥 CATEGORY RING */
/* ===================================================== */

function CategoryRing({
  progress,
  size,
  color,
  theme,
}: any) {

  const radius =
    size / 2 - 4;

  const strokeWidth = 5;

  const circumference =
    2 * Math.PI * radius;

  const clamped =
    Math.min(
      Math.max(progress || 0, 0),
      1
    );

  const offset =
    circumference * (1 - clamped);

  return (
    <Svg
      width={size}
      height={size}
      style={{
        position: "absolute",
      }}
    >
      {/* TRACK */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={
          theme.colors.border
        }
        strokeWidth={strokeWidth}
        fill="none"
      />

      {/* PROGRESS */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
        fill="none"
      />
    </Svg>
  );
}

/* ===================================================== */
/* 🔥 CATEGORY TILE */
/* ===================================================== */

function CategoryItem({
  cat,
  selected,
  setSelected,
  theme,
  size,
  onLongPress,
  onRequireBudget,
}: any) {

  const isSelected =
    selected === cat.name;

  const scale =
    useRef(
      new Animated.Value(1)
    ).current;

  useEffect(() => {

    Animated.spring(scale, {
      toValue:
        isSelected
          ? 1.05
          : 1,

      useNativeDriver: true,
    }).start();

  }, [isSelected]);

  const spent =
    cat.spent || 0;

  const budget =
    cat.budget || 0;

  const progress =
    budget > 0
      ? spent / budget
      : 0;

  let ringColor =
    theme.colors.border;

  // FIXED — matches breakdown + donut
  if (progress >= 0.9) ringColor = theme.colors.danger;
  else if (progress > 0.7) ringColor = theme.colors.warning;  // ← matches 70%
  else if (progress > 0) ringColor = theme.colors.success;

  return (
    <TouchableOpacity
      style={[
        styles.item,
        {
          width: size,
        },
      ]}
      activeOpacity={0.8}
      delayLongPress={400}
      onLongPress={onLongPress}
      onPress={() => {

        if (
          !cat.budget ||
          cat.budget === 0
        ) {

          onRequireBudget?.(cat);
          return;
        }

        setSelected(
          selected === cat.name
            ? null
            : cat.name
        );
      }}
    >
      <View
        style={{
          width: 52,
          height: 52,
          alignItems: "center",
          justifyContent: "center",
        }}
      >

        {/* RING */}
        {cat.budget > 0 && (

          <CategoryRing
            progress={progress}
            size={52}
            color={ringColor}
            theme={theme}
          />
        )}

        {/* ICON CIRCLE */}
        <Animated.View
          style={[
            styles.circle,

            {
              transform: [
                { scale }
              ],

              width: 38,
              height: 38,
              borderRadius: 19,

              backgroundColor:
                isSelected
                  ? theme.colors.primary
                  : theme.colors.surface,

              borderWidth: 1,

              borderColor:
                isSelected
                  ? theme.colors.primary
                  : theme.colors.border,
            },
          ]}
        >
          <Ionicons
            name={cat.icon}
            size={20}
            color={
              isSelected
                ? theme.colors.textInverse
                : theme.colors.textSecondary
            }
          />
        </Animated.View>
      </View>

      {/* LABEL */}
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          {
            color:
              isSelected
                ? theme.colors.text
                : theme.colors.textSecondary,

            fontFamily:
              theme.fonts.medium,
          },
        ]}
      >
        {cat.name}
      </Text>
    </TouchableOpacity>
  );
}

/* ===================================================== */
/* 🔥 CREATE TILE */
/* ===================================================== */

function CreateTile({
  theme,
  size,
  onPress,
}: any) {

  const scale =
    useRef(
      new Animated.Value(1)
    ).current;

  useEffect(() => {

    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.05,
          duration: 800,
          useNativeDriver: true,
        }),

        Animated.timing(scale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

  }, []);

  return (
    <TouchableOpacity
      style={[
        styles.item,
        { width: size },
      ]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <Animated.View
        style={[
          styles.circle,

          {
            transform: [
              { scale }
            ],

            backgroundColor:
              theme.colors.surface,

            borderColor:
              theme.colors.border,
          },
        ]}
      >
        <Ionicons
          name="add"
          size={22}
          color={
            theme.colors.text
          }
        />
      </Animated.View>

      <Text
        style={[
          styles.label,
          {
            color:
              theme.colors.text,

            fontFamily:
              theme.fonts.medium,
          },
        ]}
      >
        Create
      </Text>
    </TouchableOpacity>
  );
}

/* ===================================================== */
/* 🔒 LOCKED TILE */
/* ===================================================== */

function LockedTile({
  theme,
  size,
}: any) {

  return (
    <View
      style={[
        styles.item,
        { width: size },
      ]}
    >
      <View
        style={[
          styles.circle,

          {
            backgroundColor:
              theme.colors.surface,

            borderColor:
              theme.colors.border,

            opacity: 0.35,
          },
        ]}
      >
        <Ionicons
          name="lock-closed"
          size={18}
          color={
            theme.colors.textMuted
          }
        />
      </View>

      <Text
        style={[
          styles.label,

          {
            color:
              theme.colors.textMuted,

            opacity: 0.5,

            fontFamily:
              theme.fonts.medium,
          },
        ]}
      >
        Locked
      </Text>
    </View>
  );
}

/* ===================================================== */
/* 💎 MAIN GRID */
/* ===================================================== */

export default function CategoryGrid({
  selected,
  setSelected,
}: any) {

  const { theme } =
    useTheme();

  const { user } =
    useAuth();

  const { width } =
    useWindowDimensions();

  const setCategoryBudget =
    useFinanceStore(
      (s) => s.setCategoryBudget
    );

  const transactions =
    useFinanceStore(
      (s) => s.transactions
    );

  const [pageIndex, setPageIndex] =
    useState(0);

  const userGrid =
    useFinanceStore(
      (s) => s.userCategoryGrid
    );

  const addUserCategory =
    useFinanceStore(
      (s) => s.addUserCategory
    );

  const removeUserCategory =
    useFinanceStore(
      (s) => s.removeUserCategory
    );

  const setUserCategoryGrid =
    useFinanceStore(
      (s) => s.setUserCategoryGrid
    );

  const [budgetModal, setBudgetModal] =
    useState<any>(null);

  const [budgetInput, setBudgetInput] =
    useState("");

  const [creating, setCreating] =
    useState(false);

  const [newName, setNewName] =
    useState("");

  const [selectedIcon, setSelectedIcon] =
    useState<string | null>(null);

  const [iconSearch, setIconSearch] =
    useState("");

  useEffect(() => {

    if (!user?.id) return;

    async function loadCategories() {

      try {

        const categories =
          await fetchCategories(user!.id);

        setUserCategoryGrid(
          categories
        );

        console.log(
          "✅ Loaded categories:",
          categories
        );

      } catch (err) {

        console.error(
          "❌ Failed loading categories",
          err
        );
      }
    }

    loadCategories();

  }, [user?.id]);

  const activeQuery =
    iconSearch || newName;

  const filteredIcons =
    ALL_ICONS.filter((icon) =>
      icon
        .toLowerCase()
        .includes(
          activeQuery.toLowerCase()
        )
    );

  const suggestedIcons =
    ALL_ICONS.filter((icon) => {

      const keywords =
        ICON_KEYWORDS[icon];

      if (!keywords)
        return false;

      return keywords.some((k) =>
        k.includes(
          activeQuery.toLowerCase()
        )
      );
    });

  const topMatch =
    suggestedIcons[0];

  const pageWidth = width;

  const gridWidth =
    pageWidth - SIDE_PADDING * 2;

  const itemSize =
    gridWidth / COLS;

  const defaultNames =
    DEFAULT_CATEGORIES.map((c) =>
      c.name
        .trim()
        .toLowerCase()
    );

  const filteredUserGrid =
    userGrid.filter(
      (c) =>
        !defaultNames.includes(
          c.name
            .trim()
            .toLowerCase()
        )
    );

  const userPage: any[] = [];

  for (let i = 0; i < PAGE_SIZE; i++) {

    if (i < filteredUserGrid.length) {
      userPage.push(
        filteredUserGrid[i]
      );
    }

    else if (
      i === filteredUserGrid.length
    ) {

      userPage.push({
        type: "create",
      });
    }

    else {

      userPage.push({
        type: "locked",
      });
    }
  }

  const categoriesWithState =
    DEFAULT_CATEGORIES.map((cat) => {

      const normalized =
        cat.name
          .trim()
          .toLowerCase();

      const match =
        userGrid.find(
          (c) =>
            c.name
              .trim()
              .toLowerCase() === normalized
        );

      // =====================================
      // LIVE SPENDING FROM TRANSACTIONS
      // =====================================

      const spent =
        transactions.reduce(
          (sum, tx) => {

            const txCategory =
              tx.category
                ?.trim()
                .toLowerCase();

            return txCategory === normalized
              ? sum + Number(tx.amount || 0)
              : sum;
          },
          0
        );

      return {

        ...cat,

        id:
          match?.id,

        icon:
          match?.icon || cat.icon,

        budget:
          Number(match?.budget || 0),

        spent,

        is_default:
          match?.is_default ?? true,
      };
    });

  const pages = [
    categoriesWithState,
    userPage,
  ];

  const openBudgetModal = (
    cat: any
  ) => {

    setBudgetModal(cat);
    setBudgetInput("");
  };

  return (
    <View
      style={{
        flex: 1,
      }}
    >
      <FlatList
        data={pages}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={pageWidth}
        keyExtractor={(_, i) =>
          i.toString()
        }
        onMomentumScrollEnd={(e) => {

          const index =
            Math.round(
              e.nativeEvent.contentOffset.x /
              pageWidth
            );

          setPageIndex(index);
        }}
        renderItem={({ item, index }) => (
          <View
            style={{
              width: pageWidth,
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: gridWidth,
                paddingTop: 10,
              }}
            >
              {Array.from({
                length: ROWS,
              }).map((_, row) => (

                <View
                  key={row}
                  style={styles.row}
                >
                  {item
                    .slice(
                      row * COLS,
                      row * COLS + COLS
                    )
                    .map((cat: any, i: number) => {

                      if (index === 1) {

                        if (cat.type === "create") {

                          return (
                            <CreateTile
                              key={i}
                              theme={theme}
                              size={itemSize}
                              onPress={() =>
                                setCreating(true)
                              }
                            />
                          );
                        }

                        if (cat.type === "locked") {

                          return (
                            <LockedTile
                              key={i}
                              theme={theme}
                              size={itemSize}
                            />
                          );
                        }
                      }

                      return (
                        <CategoryItem
                          key={cat.name || i}
                          cat={cat}
                          selected={selected}
                          setSelected={setSelected}
                          theme={theme}
                          size={itemSize}
                          onRequireBudget={openBudgetModal}
                          onLongPress={() => {

                            // =====================================
                            // DEFAULT CATEGORY OPTIONS
                            // =====================================

                            if (cat.is_default || cat.isDefault) {

                              Alert.alert(
                                cat.name,
                                "Manage category",
                                [

                                  // =====================================
                                  // RESET BUDGET
                                  // =====================================

                                  {
                                    text: "Reset Budget",

                                    onPress: async () => {

                                      try {

                                        if (cat.id && user?.id) {

                                          await updateCategory(
                                            cat.id,
                                            user.id,
                                            {
                                              budget: 0,
                                            }
                                          );
                                        }

                                        setCategoryBudget(
                                          cat.name,
                                          0
                                        );

                                      } catch (err) {

                                        console.error(
                                          "❌ Failed resetting budget",
                                          err
                                        );
                                      }
                                    },
                                  },

                                  // =====================================
                                  // CLEAR SPENDING
                                  // =====================================

                                  {
                                    text: "Clear Spending",

                                    style: "destructive",

                                    onPress: async () => {
                                      try {
                                        const currentTransactions =
                                          useFinanceStore
                                            .getState()
                                            .transactions;

                                        const filtered =
                                          currentTransactions.filter(
                                            (tx: any) =>
                                              tx.category
                                                ?.trim()
                                                .toLowerCase() !==
                                              cat.name
                                                .trim()
                                                .toLowerCase()
                                          );

                                        useFinanceStore
                                          .getState()
                                          .setTransactions(filtered);

                                        console.log(
                                          `✅ Cleared spending for ${cat.name}`
                                        );

                                      } catch (err) {
                                        console.error(
                                          "❌ Failed clearing spending",
                                          err
                                        );
                                      }
                                    },
                                  },

                                  {
                                    text: "Delete Budget Category",
                                    style: "destructive",
                                    onPress: async () => {
                                      try {
                                        if (cat.id && user?.id) {
                                          await deleteCategory(cat.id, user.id);
                                        }

                                        removeUserCategory(cat.name);

                                        // ✅ Also clear all spending for this category
                                        const filtered =
                                          useFinanceStore
                                            .getState()
                                            .transactions
                                            .filter(
                                              (tx: any) =>
                                                tx.category?.trim().toLowerCase() !==
                                                cat.name.trim().toLowerCase()
                                            );

                                        useFinanceStore
                                          .getState()
                                          .setTransactions(filtered);

                                        if (selected === cat.name) {
                                          setSelected(null);
                                        }

                                        console.log(
                                          `🗑️ Deleted budget category: ${cat.name}`
                                        );

                                      } catch (err) {

                                        console.error(
                                          "❌ Failed deleting category",
                                          err
                                        );
                                      }
                                    },
                                  },

                                  {
                                    text: "Cancel",
                                    style: "cancel",
                                  },
                                ]
                              );

                              return;
                            }

                            // =====================================
                            // CUSTOM CATEGORY DELETE
                            // =====================================

                            Alert.alert(
                              "Delete Category",
                              `Delete "${cat.name}"?`,
                              [
                                {
                                  text: "Cancel",
                                  style: "cancel",
                                },

                                {
                                  text: "Delete",
                                  style: "destructive",

                                  onPress: async () => {

                                    try {

                                      if (cat.id && user?.id) {

                                        await deleteCategory(
                                          cat.id,
                                          user.id
                                        );
                                      }

                                      removeUserCategory(
                                        cat.name
                                      );

                                    } catch (err) {

                                      console.error(
                                        "❌ DELETE FAILED",
                                        err
                                      );
                                    }
                                  },
                                },
                              ]
                            );
                          }}
                        />
                      );
                    })}
                </View>
              ))}
            </View>
          </View>
        )}
      />

      {/* DOTS */}
      <View style={styles.dots}>
        {pages.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,

              {
                opacity:
                  pageIndex === i
                    ? 1
                    : 0.3,

                backgroundColor:
                  theme.colors.text,
              },
            ]}
          />
        ))}
      </View>

      {/* ================================================= */}
      {/* 🔥 CREATE MODAL */}
      {/* ================================================= */}

      <Modal
        visible={creating}
        transparent
        animationType="fade"
        onRequestClose={() => setCreating(false)}
      >
        {creating && (
        <View
          style={[
            styles.modalOverlay,
            { backgroundColor: theme.colors.overlay },
          ]}
        >
          <View
            style={[
              styles.modal,

              {
                backgroundColor:
                  theme.colors.card,

                borderColor:
                  theme.colors.border,
              },
            ]}
          >

            <Text
              style={[
                styles.modalTitle,

                {
                  color:
                    theme.colors.text,

                  fontFamily:
                    theme.fonts.semibold,
                },
              ]}
            >
              New Category
            </Text>

            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Coffee"
              placeholderTextColor={
                theme.colors.placeholder
              }
              style={[
                styles.input,

                {
                  backgroundColor:
                    theme.colors.input,

                  borderColor:
                    theme.colors.border,

                  color:
                    theme.colors.text,

                  fontFamily:
                    theme.fonts.primary,
                },
              ]}
            />

            <Text
              style={[
                styles.iconLabel,

                {
                  color:
                    theme.colors.textSecondary,

                  fontFamily:
                    theme.fonts.primary,
                },
              ]}
            >
              Select Icon
            </Text>

            <TextInput
              value={iconSearch}
              onChangeText={setIconSearch}
              placeholder="Search icon"
              placeholderTextColor={
                theme.colors.placeholder
              }
              style={[
                styles.input,

                {
                  backgroundColor:
                    theme.colors.input,

                  borderColor:
                    theme.colors.border,

                  color:
                    theme.colors.text,

                  fontFamily:
                    theme.fonts.primary,
                },
              ]}
            />

            {topMatch && (

              <View style={styles.section}>

                <Text
                  style={[
                    styles.sectionTitle,

                    {
                      color:
                        theme.colors.textSecondary,

                      fontFamily:
                        theme.fonts.medium,
                    },
                  ]}
                >
                  Top Match
                </Text>

                <TouchableOpacity
                  style={[
                    styles.iconOption,

                    styles.iconSelected,

                    {
                      backgroundColor:
                        theme.colors.primary,
                    },
                  ]}
                  onPress={() =>
                    setSelectedIcon(
                      topMatch
                    )
                  }
                >
                  <Ionicons
                    name={topMatch as any}
                    size={22}
                    color={
                      theme.colors.textInverse
                    }
                  />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.section}>

              <Text
                style={[
                  styles.sectionTitle,

                  {
                    color:
                      theme.colors.textSecondary,

                    fontFamily:
                      theme.fonts.medium,
                  },
                ]}
              >
                All Icons
              </Text>

              <ScrollView
                style={{ maxHeight: 200 }}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    justifyContent: "flex-start",
                  }}
                >
                  {filteredIcons.map((icon) => {
                    const isSelected = selectedIcon === icon;
                    return (
                      <TouchableOpacity
                        key={icon}
                        style={[
                          styles.iconOption,
                          {
                            backgroundColor: isSelected
                              ? theme.colors.primary
                              : theme.colors.surface,
                            borderColor: isSelected
                              ? theme.colors.primary
                              : theme.colors.border,
                          },
                        ]}
                        onPress={() =>
                          setSelectedIcon(
                            selectedIcon === icon ? null : icon
                          )
                        }
                      >
                        <Ionicons
                          name={icon as any}
                          size={20}
                          color={
                            isSelected
                              ? theme.colors.textInverse
                              : theme.colors.text
                          }
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            <View style={styles.modalActions}>

              <TouchableOpacity
                onPress={() =>
                  setCreating(false)
                }
              >
                <Text
                  style={[
                    styles.cancel,

                    {
                      color:
                        theme.colors.textMuted,

                      fontFamily:
                        theme.fonts.medium,
                    },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {

                  if (!newName.trim())
                    return;

                  if (!user?.id) return;

                  try {

                    const created =
                      await createCategory({

                        user_id: user.id,

                        name:
                          newName.trim(),

                        icon:
                          selectedIcon ||
                          "ellipse-outline",

                        budget: 0,

                        spent: 0,

                        is_default: false,
                      });

                    addUserCategory(
                      created
                    );

                    setNewName("");
                    setSelectedIcon(null);
                    setIconSearch("");
                    setCreating(false);

                  } catch (err) {

                    console.error(
                      "❌ CREATE CATEGORY FAILED",
                      err
                    );
                  }
                }}
              >
                <Text
                  style={[
                    styles.save,

                    {
                      color:
                        theme.colors.primary,

                      fontFamily:
                        theme.fonts.semibold,
                    },
                  ]}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        )}
      </Modal>

      {/* ================================================= */}
      {/* 🔥 BUDGET MODAL */}
      {/* ================================================= */}

      <Modal
        visible={!!budgetModal}
        transparent
        animationType="fade"
        onRequestClose={() => setBudgetModal(null)}
      >
        {budgetModal && (
        <View
          style={[
            styles.modalOverlay,
            { backgroundColor: theme.colors.overlay },
          ]}
        >
          <View
            style={[
              styles.modal,

              {
                backgroundColor:
                  theme.colors.card,

                borderColor:
                  theme.colors.border,
              },
            ]}
          >

            <Text
              style={[
                styles.modalTitle,
                {
                  color: theme.colors.text,
                  fontFamily: theme.fonts.semibold,
                  marginBottom: 4,
                },
              ]}
            >
              Monthly budget for {budgetModal.name}
            </Text>

            <Text
              style={{
                color: theme.colors.textSecondary,
                fontFamily: theme.fonts.primary,
                fontSize: 13,
                lineHeight: 18,
                marginBottom: 16,
              }}
            >
              Set how much you plan to spend on {budgetModal.name} each month.
              We'll track your spending against it and warn you as you get close.
            </Text>

            <View
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.input,
                  borderColor: theme.colors.border,
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 0,
                },
              ]}
            >
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontFamily: theme.fonts.semibold,
                  fontSize: 18,
                  marginRight: 6,
                }}
              >
                $
              </Text>
              <TextInput
                keyboardType="numeric"
                value={budgetInput}
                onChangeText={setBudgetInput}
                placeholder="0"
                placeholderTextColor={theme.colors.placeholder}
                autoFocus
                style={{
                  flex: 1,
                  color: theme.colors.text,
                  fontFamily: theme.fonts.primary,
                  fontSize: 18,
                  paddingVertical: 14,
                }}
              />
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontFamily: theme.fonts.primary,
                  fontSize: 14,
                  marginLeft: 6,
                }}
              >
                / month
              </Text>
            </View>

            {Number(budgetInput) > 0 && (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 18,
                  marginTop: 2,
                  paddingHorizontal: 4,
                }}
              >
                <View style={{ alignItems: "center", flex: 1 }}>
                  <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.primary, fontSize: 11 }}>
                    Daily
                  </Text>
                  <Text style={{ color: theme.colors.text, fontFamily: theme.fonts.semibold, fontSize: 14, marginTop: 2 }}>
                    ${(Number(budgetInput) / 30).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </Text>
                </View>
                <View style={{ alignItems: "center", flex: 1 }}>
                  <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.primary, fontSize: 11 }}>
                    Weekly
                  </Text>
                  <Text style={{ color: theme.colors.text, fontFamily: theme.fonts.semibold, fontSize: 14, marginTop: 2 }}>
                    ${(Number(budgetInput) / 4.33).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </Text>
                </View>
                <View style={{ alignItems: "center", flex: 1 }}>
                  <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.primary, fontSize: 11 }}>
                    Yearly
                  </Text>
                  <Text style={{ color: theme.colors.text, fontFamily: theme.fonts.semibold, fontSize: 14, marginTop: 2 }}>
                    ${(Number(budgetInput) * 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.modalActions}>

              <TouchableOpacity
                onPress={() =>
                  setBudgetModal(null)
                }
              >
                <Text
                  style={[
                    styles.cancel,

                    {
                      color:
                        theme.colors.textMuted,

                      fontFamily:
                        theme.fonts.medium,
                    },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {

                  if (!budgetInput) return;

                  try {

                    const numericBudget =
                      Number(budgetInput);

                    if (!user?.id) return;

                    const existingCategory =
                      userGrid.find(
                        (c) =>
                          c.name.trim().toLowerCase() ===
                          budgetModal.name.trim().toLowerCase()
                      );

                    if (existingCategory?.id) {

                      await updateCategory(
                        existingCategory.id,
                        user.id,
                        {
                          budget: numericBudget,
                        }
                      );

                    } else {

                      const created =
                        await createCategory({
                          user_id: user.id,
                          name: budgetModal.name,
                          icon: budgetModal.icon,
                          budget: numericBudget,
                          spent: 0,
                          is_default: true,
                        });

                      addUserCategory(created);
                    }

                    setCategoryBudget(
                      budgetModal.name,
                      numericBudget
                    );

                    setSelected?.(
                      budgetModal.name
                    );

                    setBudgetModal(null);

                  } catch (err) {

                    console.error(
                      "❌ Failed saving budget",
                      err
                    );
                  }
                }}
              >
                <Text
                  style={[
                    styles.save,

                    {
                      color:
                        theme.colors.primary,

                      fontFamily:
                        theme.fonts.semibold,
                    },
                  ]}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        )}
      </Modal>
    </View>
  );
}

/* ===================================================== */
/* 🎨 STYLES */
/* ===================================================== */

const styles =
  StyleSheet.create({

    row: {

      flexDirection: "row",

      justifyContent: "space-between",

      marginBottom: 18,
    },

    item: {

      alignItems: "center",
    },

    circle: {

      width: 52,

      height: 52,

      borderRadius: 26,

      borderWidth: 1,

      alignItems: "center",

      justifyContent: "center",
    },

    label: {

      fontSize: 11,

      marginTop: 6,

      textAlign: "center",
    },

    dots: {

      flexDirection: "row",

      justifyContent: "center",

      marginTop: 6,
    },

    dot: {

      width: 6,

      height: 6,

      borderRadius: 3,

      marginHorizontal: 4,
    },

    modalOverlay: {

      position: "absolute",

      top: 0,

      left: 0,

      right: 0,

      bottom: 0,

      justifyContent: "center",

      alignItems: "center",

      paddingHorizontal: 16,

      zIndex: 999,
    },

    modal: {

      width: "88%",

      borderRadius: 18,

      padding: 20,

      borderWidth: 1,
    },

    modalTitle: {

      fontSize: 18,

      marginBottom: 14,
    },

    input: {

      borderWidth: 1,

      borderRadius: 12,

      padding: 14,

      marginBottom: 18,
    },

    iconLabel: {

      fontSize: 14,

      marginBottom: 10,
    },

    iconGrid: {

      flexDirection: "row",

      flexWrap: "wrap",

      justifyContent: "space-between",

      marginBottom: 20,
    },

    iconOption: {

      width: "18%",

      aspectRatio: 1,

      borderRadius: 12,

      borderWidth: 1,

      alignItems: "center",

      justifyContent: "center",

      marginBottom: 10,
    },

    iconSelected: {

      borderWidth: 0,
    },

    modalActions: {

      flexDirection: "row",

      justifyContent: "space-between",
    },

    cancel: {

      fontSize: 14,
    },

    save: {

      fontSize: 14,
    },

    section: {

      marginBottom: 18,
    },

    sectionTitle: {

      fontSize: 13,

      marginBottom: 10,
    },
  });