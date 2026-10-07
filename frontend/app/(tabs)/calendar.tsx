import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../src/theme/ThemeContext";
import { useFinanceStore } from "../../src/store/financeStore";
import DashboardHeader from "../../src/components/header/DashboardHeader";

const SCREEN_WIDTH = Dimensions.get("window").width;

/* =====================================================
   CATEGORY COLORS
===================================================== */

const CATEGORY_COLORS = [
  "#6366F1", "#F59E0B", "#10B981", "#EF4444",
  "#3B82F6", "#EC4899", "#8B5CF6", "#14B8A6",
  "#F97316", "#84CC16",
];

/* =====================================================
   HELPERS
===================================================== */

// Parses a server timestamp defensively. If the string carries an
// explicit timezone marker (Z or ±HH:MM), trust it. If not, assume
// UTC explicitly rather than letting JS silently treat it as local
// time — the latter is what caused transactions to shift onto the
// wrong calendar day for users outside UTC.
function parseServerDate(iso: string): Date {
  const hasTz = /Z$|[+-]\d{2}:\d{2}$/.test(iso);
  return new Date(hasTz ? iso : `${iso}Z`);
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function getMonthRange(year: number, month: number): [string, string] {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return [formatDate(start), formatDate(end)];
}

/* =====================================================
   COMPONENT
===================================================== */

export default function CalendarScreen() {
  const { theme } = useTheme();
  const transactions = useFinanceStore((s) => s.transactions);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // ===================================================
  // GROUP TRANSACTIONS BY DAY + CATEGORY
  // ===================================================

  const dailyData = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};

    transactions.forEach((tx) => {
      if (!tx.created_at) return;
      const date = parseServerDate(tx.created_at);
      if (date.getFullYear() !== year || date.getMonth() !== month) return;
      const day = formatDate(date);
      const cat = tx.category || "Other";

      if (!map[day]) map[day] = {};
      map[day][cat] = (map[day][cat] || 0) + Math.abs(tx.amount);
    });

    return map;
  }, [transactions, year, month]);

  // ===================================================
  // ALL CATEGORIES
  // ===================================================

  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    Object.values(dailyData).forEach((day) => {
      Object.keys(day).forEach((cat) => cats.add(cat));
    });
    return Array.from(cats);
  }, [dailyData]);

  // ===================================================
  // SELECTED DAY TRANSACTIONS
  // ===================================================

  const selectedDayTxs = useMemo(() => {
    if (!selectedDay) return [];
    return transactions.filter((tx) => {
      if (!tx.created_at) return false;
      return formatDate(parseServerDate(tx.created_at)) === selectedDay;
    });
  }, [selectedDay, transactions]);

  const selectedDayTotal = useMemo(() => {
    return selectedDayTxs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  }, [selectedDayTxs]);

  // Month summary: total spent, transaction count, top category.
  const monthSummary = useMemo(() => {
    let total = 0;
    let count = 0;
    const byCat: Record<string, number> = {};
    Object.values(dailyData).forEach((cats) => {
      Object.entries(cats).forEach(([cat, val]) => {
        total += val;
        byCat[cat] = (byCat[cat] || 0) + val;
      });
    });
    Object.keys(dailyData).forEach((day) => {
      // count transactions for days in this month
    });
    transactions.forEach((tx) => {
      if (!tx.created_at) return;
      const d = parseServerDate(tx.created_at);
      if (d.getFullYear() === year && d.getMonth() === month) count += 1;
    });
    let topCat = "—";
    let topVal = 0;
    Object.entries(byCat).forEach(([cat, val]) => {
      if (val > topVal) { topVal = val; topCat = cat; }
    });
    return { total, count, topCat };
  }, [dailyData, transactions, year, month]);

  // ===================================================
  // NAVIGATION
  // ===================================================

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
    setSelectedDay(null);
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
    setSelectedDay(null);
  }

  const monthNames = [
    "January", "February", "March", "April",
    "May", "June", "July", "August",
    "September", "October", "November", "December",
  ];

  // ===================================================
  // BUILD ECHARTS DATA
  // ===================================================

  const [rangeStart, rangeEnd] = getMonthRange(year, month);

  const pieSeries = useMemo(() => {
    return Object.entries(dailyData).map(([day, cats], index) => {
      const pieData = Object.entries(cats).map(([name, value], i) => ({
        name,
        value: Math.round(value),
        itemStyle: { color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] },
      }));

      return {
        type: "pie",
        id: `pie-${index}`,
        center: day,
        radius: 22,
        coordinateSystem: "calendar",
        label: { show: false },
        data: pieData,
      };
    });
  }, [dailyData]);

  const scatterData = useMemo(() => {
    const days: string[] = [];
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(formatDate(new Date(d)));
    }
    return days.map((day) => [day, 0]);
  }, [year, month]);

  const echartsOption = JSON.stringify({
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      formatter: "{b}: ${c}",
    },
    calendar: {
      top: 50,
      left: 20,
      right: 20,
      orient: "vertical",
      cellSize: [SCREEN_WIDTH / 8, SCREEN_WIDTH / 8],
      yearLabel: { show: false },
      dayLabel: {
        firstDay: 0,
        position: "start",
        nameMap: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        color: theme.colors.textSecondary,
        fontSize: 11,
      },
      monthLabel: { show: false },
      itemStyle: {
        borderColor: theme.colors.divider,
        borderWidth: 1,
        color: theme.colors.card,
      },
      splitLine: {
        lineStyle: {
          color: theme.colors.divider,
        },
      },
      range: [rangeStart, rangeEnd],
    },
    series: [
      {
        id: "label",
        type: "scatter",
        coordinateSystem: "calendar",
        symbolSize: 0,
        label: {
          show: true,
          // formatter intentionally omitted here — JSON.stringify
          // cannot serialize functions, so it's attached as real JS
          // after the option is parsed inside the WebView instead
          // (see the setOption block in the injected <script> below).
          offset: [-(SCREEN_WIDTH / 16) + 8, -(SCREEN_WIDTH / 16) + 8],
          fontSize: 10,
          color: theme.colors.textSecondary,
        },
        data: scatterData,
      },
      ...pieSeries,
    ],
  });

  const calendarHeight = Math.ceil(
    new Date(year, month + 1, 0).getDate() / 7 + 1
  ) * (SCREEN_WIDTH / 8) + 110;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; background: transparent; }
        #chart { width: 100%; height: 100%; }
      </style>
      <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.0/dist/echarts.min.js"></script>
    </head>
    <body>
      <div id="chart"></div>
      <script>
        const chart = echarts.init(document.getElementById('chart'), null, {
          renderer: 'svg',
          backgroundColor: 'transparent',
        });

        const option = ${echartsOption};

        // Attached here (not inside the JSON.stringify'd object above)
        // because functions can't survive JSON serialization — this
        // is the actual formatter that renders each day's number.
        // Date strings are parsed as UTC explicitly (appending 'T00:00:00Z')
        // and read back with getUTCDate(), so the day number displayed
        // never shifts due to the device's local timezone.
        option.series[0].label.formatter = function(params) {
          var d = new Date(params.value[0] + 'T00:00:00Z');
          return String(d.getUTCDate());
        };

        chart.setOption(option);

        chart.on('click', function(params) {
          if (params.componentType === 'series') {
            const day = Array.isArray(params.value)
              ? params.value[0]
              : params.data?.center;
            if (day) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'dayClick', day }));
            }
          }
        });

        window.addEventListener('resize', function() {
          chart.resize();
        });
      </script>
    </body>
    </html>
  `;

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        <View style={{ paddingHorizontal: 20 }}>
          <DashboardHeader hideSettings showBackButton />

          {/* TITLE */}
          <Text
            style={[
              styles.title,
              { color: theme.colors.text, fontFamily: theme.fonts.display },
            ]}
          >
            Spending Calendar
          </Text>

          {/* MONTH NAV */}
          <View style={styles.monthNav}>
            <TouchableOpacity
              onPress={prevMonth}
              style={[
                styles.navButton,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
              ]}
            >
              <Feather name="chevron-left" size={20} color={theme.colors.text} />
            </TouchableOpacity>

            <Text
              style={[
                styles.monthLabel,
                { color: theme.colors.text, fontFamily: theme.fonts.display },
              ]}
            >
              {monthNames[month]} {year}
            </Text>

            <TouchableOpacity
              onPress={nextMonth}
              style={[
                styles.navButton,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
              ]}
            >
              <Feather name="chevron-right" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* MONTH SUMMARY */}
        {monthSummary.count > 0 && (
          <View style={{ paddingHorizontal: 20, marginBottom: 4 }}>
            <View style={[styles.monthSummaryCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: theme.colors.text, fontFamily: theme.fonts.display }]}>
                  ${monthSummary.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </Text>
                <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
                  Spent
                </Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: theme.colors.divider }]} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: theme.colors.text, fontFamily: theme.fonts.display }]}>
                  {monthSummary.count}
                </Text>
                <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
                  Transactions
                </Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: theme.colors.divider }]} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: theme.colors.text, fontFamily: theme.fonts.semibold, fontSize: 15 }]} numberOfLines={1}>
                  {monthSummary.topCat}
                </Text>
                <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
                  Top category
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ============================================= */}
        {/* ECHARTS CALENDAR */}
        {/* ============================================= */}

        <WebView
          originWhitelist={["*"]}
          source={{ html }}
          javaScriptEnabled
          scrollEnabled={false}
          style={{
            width: SCREEN_WIDTH,
            height: calendarHeight,
            backgroundColor: "transparent",
          }}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === "dayClick") {
                setSelectedDay(data.day);
              }
            } catch (e) {}
          }}
        />

        {/* ============================================= */}
        {/* LEGEND */}
        {/* ============================================= */}

        {allCategories.length > 0 && (
          <View style={{ paddingHorizontal: 20 }}>
            <Text
              style={[
                styles.sectionLabel,
                { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary },
              ]}
            >
              Categories
            </Text>
            <View style={styles.legendRow}>
              {allCategories.map((cat, i) => (
                <View key={cat} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] },
                    ]}
                  />
                  <Text
                    style={[
                      styles.legendText,
                      { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary },
                    ]}
                  >
                    {cat}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ============================================= */}
        {/* SELECTED DAY BREAKDOWN */}
        {/* ============================================= */}

        {selectedDay && (
          <View style={{ paddingHorizontal: 20 }}>
            <Text
              style={[
                styles.sectionLabel,
                { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary },
              ]}
            >
              {selectedDay}
            </Text>

            {selectedDayTxs.length === 0 ? (
              <View
                style={[
                  styles.emptyDay,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.emptyDayText,
                    { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary },
                  ]}
                >
                  No transactions on this day
                </Text>
              </View>
            ) : (
              <>
                {selectedDayTxs.map((tx, i) => (
                  <View
                    key={i}
                    style={[
                      styles.txRow,
                      { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.txDot,
                        {
                          backgroundColor:
                            CATEGORY_COLORS[
                              allCategories.indexOf(tx.category) %
                                CATEGORY_COLORS.length
                            ],
                        },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.txCategory,
                          { color: theme.colors.text, fontFamily: theme.fonts.semibold },
                        ]}
                      >
                        {tx.category}
                      </Text>
                      {tx.merchant ? (
                        <Text
                          style={[
                            styles.txMerchant,
                            { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary },
                          ]}
                        >
                          {tx.merchant}
                        </Text>
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.txAmount,
                        { color: theme.colors.text, fontFamily: theme.fonts.display },
                      ]}
                    >
                      ${Math.abs(tx.amount).toFixed(2)}
                    </Text>
                  </View>
                ))}

                <View
                  style={[
                    styles.totalRow,
                    { borderColor: theme.colors.divider },
                  ]}
                >
                  <Text
                    style={[
                      styles.totalLabel,
                      { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary },
                    ]}
                  >
                    Total
                  </Text>
                  <Text
                    style={[
                      styles.totalAmount,
                      { color: theme.colors.text, fontFamily: theme.fonts.display },
                    ]}
                  >
                    ${selectedDayTotal.toFixed(2)}
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

/* =====================================================
   STYLES
===================================================== */

const styles = StyleSheet.create({
  monthSummaryCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 8,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryValue: { fontSize: 18, letterSpacing: -0.5 },
  summaryLabel: { fontSize: 11, marginTop: 4 },
  summaryDivider: { width: 1, height: 32 },
  title: {
    fontSize: 32,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  monthLabel: {
    fontSize: 18,
    letterSpacing: -0.3,
  },
  sectionLabel: {
    fontSize: 13,
    marginTop: 16,
    marginBottom: 10,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 13,
  },
  emptyDay: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  emptyDayText: {
    fontSize: 14,
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  txDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  txCategory: {
    fontSize: 15,
  },
  txMerchant: {
    fontSize: 12,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 16,
    letterSpacing: -0.5,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 14,
  },
  totalAmount: {
    fontSize: 20,
    letterSpacing: -0.5,
  },
});