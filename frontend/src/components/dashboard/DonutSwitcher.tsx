// =====================================================
// 💎 FINAI — DONUT SWITCHER
// =====================================================

import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  View,
  FlatList,
  Dimensions,
  StyleSheet,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Text,
  ViewToken,
} from "react-native";

import CategoryDonut
from "../../../src/components/dashboard/CategoryDonut";

import {
  useTheme,
} from "../../../src/theme/ThemeContext";

/* =====================================================
   CONSTANTS
===================================================== */

const SCREEN_WIDTH =
  Dimensions.get(
    "window"
  ).width;

/* =====================================================
   TYPES
===================================================== */

type DonutMode =
  | "budget"
  | "spending";

type DonutPage = {
  id: string;
  mode: DonutMode;
  title: string;
  subtitle: string;
};

type RenderItemProps = {
  item: DonutPage;
};

/* =====================================================
   COMPONENT
===================================================== */

export default function DonutSwitcher() {

  const { theme } =
    useTheme();

  const flatListRef =
    useRef<
      FlatList<DonutPage>
    >(null);

  const [pageIndex, setPageIndex] =
    useState(0);

  /* ===================================================
     PAGES
  =================================================== */

  const pages =
    useMemo<
      DonutPage[]
    >(
      () => [
        {
          id: "budget",

          mode:
            "budget",

          title:
            "Budget Allocation",

          subtitle:
            "Compare category budgets",
        },

        {
          id: "spending",

          mode:
            "spending",

          title:
            "Spending Distribution",

          subtitle:
            "Track actual spending",
        },
      ],
      []
    );

  /* ===================================================
     SCROLL
  =================================================== */

  const handleMomentumScrollEnd =
    useCallback(

      (
        e:
          NativeSyntheticEvent<NativeScrollEvent>
      ) => {

        const offsetX =
          e.nativeEvent
            .contentOffset.x;

        const index =
          Math.round(
            offsetX /
              SCREEN_WIDTH
          );

        setPageIndex(

          Math.max(
            0,

            Math.min(
              index,
              pages.length - 1
            )
          )
        );
      },

      [pages.length]
    );

  /* ===================================================
     VIEWABILITY
  =================================================== */

  const onViewableItemsChanged =
    useRef(
      ({
        viewableItems,
      }: {
        viewableItems:
          ViewToken<DonutPage>[];
      }) => {

        const first =
          viewableItems?.[0];

        if (
          first?.index !==
            undefined &&
          first.index !== null
        ) {

          setPageIndex(
            first.index
          );
        }
      }
    ).current;

  /* ===================================================
     VIEW CONFIG
  =================================================== */

  const viewabilityConfig =
    useMemo(
      () => ({
        itemVisiblePercentThreshold:
          70,
      }),
      []
    );

  /* ===================================================
     RENDER ITEM
  =================================================== */

  const renderItem =
    useCallback(

      ({
        item,
      }: RenderItemProps) => {

        return (

          <View
            style={[
              styles.page,
              {
                backgroundColor:
                  theme.colors
                    .background,
              },
            ]}
          >

            {/* ===================================== */}
            {/* HEADER */}
            {/* ===================================== */}

            <View
              style={
                styles.header
              }
            >

              <Text
                style={[
                  styles.title,
                  {
                    color:
                      theme.colors
                        .text,

                    fontFamily:
                      theme.fonts
                        .display,
                  },
                ]}
              >

                {item.title}

              </Text>

              <Text
                style={[
                  styles.subtitle,
                  {
                    color:
                      theme.colors
                        .textSecondary,

                    fontFamily:
                      theme.fonts
                        .primary,
                  },
                ]}
              >

                {item.subtitle}

              </Text>

            </View>

            {/* ===================================== */}
            {/* DONUT */}
            {/* ===================================== */}

            <CategoryDonut
              mode={
                item.mode
              }
            />

          </View>
        );
      },

      [theme]
    );

  /* ===================================================
     KEY EXTRACTOR
  =================================================== */

  const keyExtractor =
    useCallback(
      (
        item: DonutPage
      ) => item.id,
      []
    );

  /* ===================================================
     LAYOUT
  =================================================== */

  const getItemLayout =
    useCallback(
      (
        _data:
          ArrayLike<DonutPage> | null | undefined,
        index: number
      ) => ({
        length:
          SCREEN_WIDTH,

        offset:
          SCREEN_WIDTH *
          index,

        index,
      }),
      []
    );

  /* ===================================================
     UI
  =================================================== */

  return (

    <View
      style={[
        styles.container,
        {
          backgroundColor:
            theme.colors
              .background,
        },
      ]}
    >

      {/* ========================================== */}
      {/* PAGER */}
      {/* ========================================== */}

      <FlatList
        ref={flatListRef}
        data={pages}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={
          false
        }
        snapToInterval={
          SCREEN_WIDTH
        }
        snapToAlignment="center"
        decelerationRate="fast"
        removeClippedSubviews
        initialNumToRender={
          2
        }
        maxToRenderPerBatch={
          2
        }
        windowSize={3}
        keyExtractor={
          keyExtractor
        }
        renderItem={
          renderItem
        }
        getItemLayout={
          getItemLayout
        }
        contentContainerStyle={{
          backgroundColor:
            theme.colors
              .background,
        }}
        onMomentumScrollEnd={
          handleMomentumScrollEnd
        }
        onViewableItemsChanged={
          onViewableItemsChanged
        }
        viewabilityConfig={
          viewabilityConfig
        }
      />

      {/* ========================================== */}
      {/* PAGINATION */}
      {/* ========================================== */}

      <View
        style={
          styles.paginationContainer
        }
      >

        {pages.map(
          (
            item,
            index
          ) => {

            const active =
              pageIndex ===
              index;

            return (

              <View
                key={item.id}
                style={[
                  styles.dot,
                  {
                    backgroundColor:

                      active

                        ? theme
                            .colors
                            .primary

                        : theme
                            .colors
                            .border,

                    opacity:
                      active
                        ? 1
                        : 0.4,

                    width:
                      active
                        ? 20
                        : 7,
                  },
                ]}
              />
            );
          }
        )}

      </View>

    </View>
  );
}

/* =====================================================
   STYLES
===================================================== */

const styles =
  StyleSheet.create({

    container: {
      width: "100%",
    },

    page: {

      width:
        SCREEN_WIDTH,

      alignItems:
        "center",

      justifyContent:
        "center",

      paddingBottom: 8,
    },

    header: {

      alignItems:
        "center",

      marginBottom: 10,

      paddingHorizontal: 20,
    },

    title: {
      fontSize: 18,
    },

    subtitle: {

      fontSize: 13,

      marginTop: 4,

      textAlign:
        "center",
    },

    paginationContainer: {

      flexDirection:
        "row",

      justifyContent:
        "center",

      alignItems:
        "center",

      marginTop: 10,

      marginBottom: 4,
    },

    dot: {

      height: 7,

      borderRadius: 999,

      marginHorizontal: 5,
    },
  });