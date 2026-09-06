import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import dayjs from "dayjs";
import { useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from "react-native";
import ViewShot, { captureRef } from "react-native-view-shot";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWeeklyRecap } from "@/src/api";
import { shortDate } from "@/src/date-utils";
import { Icon } from "@/src/components/ui";
import { moodEmoji } from "@/src/mood";
import { fonts, makeStyles, useTheme } from "@/src/theme";
import { useUser } from "@/src/user-context";

export default function RecapScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useUser();
  const [offset, setOffset] = useState(0);
  const { data, isLoading } = useWeeklyRecap(userId, offset);
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const onShare = async () => {
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, { format: "png", quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "My Weekly Recap" });
      }
    } catch {
      // sharing unavailable (e.g. web)
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="recap-back">
          <Icon name="arrow-left" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Weekly Recap</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.weekNav}>
          <Pressable onPress={() => setOffset((o) => o + 1)} hitSlop={8} testID="recap-prev" style={styles.navBtn}>
            <Icon name="chevron-left" size={20} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.weekLabel}>
            {data ? `${shortDate(data.startDate)} – ${shortDate(data.endDate)}` : "This week"}
          </Text>
          <Pressable
            onPress={() => setOffset((o) => Math.max(0, o - 1))}
            hitSlop={8}
            disabled={offset === 0}
            testID="recap-next"
            style={[styles.navBtn, offset === 0 && { opacity: 0.4 }]}
          >
            <Icon name="chevron-right" size={20} color={colors.onSurface} />
          </Pressable>
        </View>

        {isLoading || !data ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.brand} size="large" />
          </View>
        ) : (
          <ViewShot ref={cardRef} style={styles.shot}>
            <LinearGradient
              colors={[colors.brand, colors.brandPrimary, colors.surfaceInverse]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              <View style={styles.cardHeader}>
                <Icon name="sunrise" size={22} color={colors.onBrandPrimary} />
                <Text style={styles.brandName}>Aura · Weekly Recap</Text>
              </View>

              <View style={styles.bigRow}>
                <View>
                  <Text style={styles.bigNum}>{data.currentStreak}</Text>
                  <Text style={styles.bigLabel}>day streak</Text>
                </View>
                <View>
                  <Text style={styles.bigNum}>{data.entriesCount}</Text>
                  <Text style={styles.bigLabel}>entries this week</Text>
                </View>
              </View>

              {data.bestDay ? (
                <View style={styles.bestBox}>
                  <Text style={styles.bestEmoji}>{moodEmoji(data.bestDay.mood)}</Text>
                  <View>
                    <Text style={styles.winsTitle}>Best day</Text>
                    <Text style={styles.bestText}>{dayjs(data.bestDay.date).format("dddd")}</Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.trendBox}>
                <Text style={styles.winsTitle}>Mood trend</Text>
                <View style={styles.trendRow}>
                  {data.moodsByDay.map((m) => {
                    const v = m.mood ? Number(m.mood) : 0;
                    return (
                      <View key={m.date} style={styles.trendCol}>
                        <View style={styles.trendTrack}>
                          <View style={[styles.trendFill, { height: `${v ? (v / 5) * 100 : 5}%` }]} />
                        </View>
                        <Text style={styles.trendDay}>{dayjs(m.date).format("dd")[0]}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {data.wins.length > 0 ? (
                <View style={styles.winsBox}>
                  <Text style={styles.winsTitle}>Wins & highlights</Text>
                  {data.wins.map((w, i) => (
                    <View key={i} style={styles.winRow}>
                      <Icon name="check-circle" size={16} color={colors.onBrandPrimary} />
                      <Text style={styles.winText} numberOfLines={1}>{w}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.winText}>Journal this week to fill your recap with wins.</Text>
              )}

              {data.highlightQuote ? (
                <View style={styles.quoteBox}>
                  <Text style={styles.quoteText}>“{data.highlightQuote.text}”</Text>
                  {data.highlightQuote.author ? (
                    <Text style={styles.quoteAuthor}>— {data.highlightQuote.author}</Text>
                  ) : null}
                </View>
              ) : null}
            </LinearGradient>
          </ViewShot>
        )}

        <Pressable
          testID="recap-share"
          onPress={onShare}
          disabled={sharing || !data}
          style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.9 }]}
        >
          {sharing ? (
            <ActivityIndicator color={colors.onBrandPrimary} />
          ) : (
            <>
              <Icon name="share-2" size={20} color={colors.onBrandPrimary} />
              <Text style={styles.shareText}>Share my week</Text>
            </>
          )}
        </Pressable>
        {Platform.OS === "web" ? (
          <Text style={styles.webNote}>Sharing as an image works best on the mobile app.</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: c.surface,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
  },
  headerTitle: { fontFamily: fonts.displayBold, fontSize: 20, color: c.onSurface },
  weekNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: c.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.border,
  },
  weekLabel: { fontFamily: fonts.semibold, fontSize: 15, color: c.onSurface },
  loading: { paddingVertical: 60, alignItems: "center" },
  shot: { borderRadius: 24, overflow: "hidden" },
  card: { padding: 26, gap: 22 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandName: { fontFamily: fonts.semibold, fontSize: 15, color: c.onBrandPrimary },
  bigRow: { flexDirection: "row", gap: 32 },
  bigNum: { fontFamily: fonts.displayBold, fontSize: 44, color: c.onBrandPrimary },
  bigLabel: { fontFamily: fonts.medium, fontSize: 13, color: c.onBrandPrimary, opacity: 0.9 },
  moodRow: { flexDirection: "row", justifyContent: "space-between" },
  moodEmoji: { fontSize: 24 },
  bestBox: { flexDirection: "row", alignItems: "center", gap: 12 },
  bestEmoji: { fontSize: 34 },
  bestText: { fontFamily: fonts.displayBold, fontSize: 20, color: c.onBrandPrimary },
  trendBox: { gap: 10 },
  trendRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", height: 80 },
  trendCol: { alignItems: "center", gap: 6, flex: 1 },
  trendTrack: {
    width: 14,
    height: 56,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.22)",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  trendFill: { width: "100%", borderRadius: 999, backgroundColor: c.onBrandPrimary },
  trendDay: { fontFamily: fonts.medium, fontSize: 11, color: c.onBrandPrimary, opacity: 0.9 },
  winsBox: { gap: 10 },
  winsTitle: { fontFamily: fonts.semibold, fontSize: 14, color: c.onBrandPrimary, opacity: 0.9 },
  winRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  winText: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: c.onBrandPrimary },
  quoteBox: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.25)",
    paddingTop: 16,
    gap: 6,
  },
  quoteText: { fontFamily: fonts.display, fontSize: 18, lineHeight: 26, color: c.onBrandPrimary },
  quoteAuthor: { fontFamily: fonts.medium, fontSize: 13, color: c.onBrandPrimary, opacity: 0.85 },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: c.brandPrimary,
  },
  shareText: { fontFamily: fonts.semibold, fontSize: 16, color: c.onBrandPrimary },
  webNote: { fontFamily: fonts.regular, fontSize: 12, color: c.muted, textAlign: "center" },
}));
