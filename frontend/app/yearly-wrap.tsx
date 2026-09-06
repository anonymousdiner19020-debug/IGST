import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import dayjs from "dayjs";
import { useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from "react-native";
import ViewShot, { captureRef } from "react-native-view-shot";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useYearlyWrap } from "@/src/api";
import { Icon } from "@/src/components/ui";
import { moodEmoji } from "@/src/mood";
import { fonts, makeStyles, useTheme } from "@/src/theme";
import { useUser } from "@/src/user-context";

export default function YearlyWrapScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useUser();
  const [year, setYear] = useState(new Date().getFullYear());
  const { data, isLoading } = useYearlyWrap(userId, year);
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const onShare = async () => {
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, { format: "png", quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: `My ${year} in review` });
      }
    } catch {
      // unavailable on web
    } finally {
      setSharing(false);
    }
  };

  const stat = (v: number | string, l: string) => (
    <View style={styles.stat}>
      <Text style={styles.statNum}>{v}</Text>
      <Text style={styles.statLabel}>{l}</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="wrap-back">
          <Icon name="arrow-left" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Year in Review</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.yearNav}>
          <Pressable onPress={() => setYear((y) => y - 1)} hitSlop={8} testID="wrap-prev" style={styles.navBtn}>
            <Icon name="chevron-left" size={20} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.yearLabel}>{year}</Text>
          <Pressable
            onPress={() => setYear((y) => Math.min(new Date().getFullYear(), y + 1))}
            hitSlop={8}
            disabled={year >= new Date().getFullYear()}
            testID="wrap-next"
            style={[styles.navBtn, year >= new Date().getFullYear() && { opacity: 0.4 }]}
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
              colors={[colors.surfaceInverse, colors.brandPrimary, colors.brand]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              <View style={styles.cardHeader}>
                <Icon name="gift" size={22} color={colors.onBrandPrimary} />
                <Text style={styles.brandName}>Aura · {year}</Text>
              </View>

              <Text style={styles.headline}>Your year of growth</Text>

              <View style={styles.statsGrid}>
                {stat(data.entriesCount, "entries")}
                {stat(data.daysLoggedIn, "days logged")}
                {stat(data.longestStreak, "longest streak")}
                {stat(`${moodEmoji(String(Math.max(1, Math.round(data.avgMood))))}`, `avg mood ${data.avgMood || "–"}`)}
                {stat(data.photos, "photos")}
                {stat(data.bestMonth ? dayjs(data.bestMonth + "-01").format("MMM") : "–", "best month")}
              </View>

              {data.topWins.length > 0 ? (
                <View style={styles.winsBox}>
                  <Text style={styles.winsTitle}>Highlights of the year</Text>
                  {data.topWins.map((w, i) => (
                    <View key={i} style={styles.winRow}>
                      <Icon name="star" size={16} color={colors.onBrandPrimary} />
                      <Text style={styles.winText} numberOfLines={1}>{w}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.winText}>Keep journaling to fill your {year} story.</Text>
              )}
            </LinearGradient>
          </ViewShot>
        )}

        <Pressable
          testID="wrap-share"
          onPress={onShare}
          disabled={sharing || !data}
          style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.9 }]}
        >
          {sharing ? (
            <ActivityIndicator color={colors.onBrandPrimary} />
          ) : (
            <>
              <Icon name="share-2" size={20} color={colors.onBrandPrimary} />
              <Text style={styles.shareText}>Share my year</Text>
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
  yearNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
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
  yearLabel: { fontFamily: fonts.displayBold, fontSize: 20, color: c.onSurface },
  loading: { paddingVertical: 60, alignItems: "center" },
  shot: { borderRadius: 24, overflow: "hidden" },
  card: { padding: 26, gap: 22 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandName: { fontFamily: fonts.semibold, fontSize: 15, color: c.onBrandPrimary },
  headline: { fontFamily: fonts.displayBold, fontSize: 30, color: c.onBrandPrimary, lineHeight: 36 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap" },
  stat: { width: "33.3%", paddingVertical: 10 },
  statNum: { fontFamily: fonts.displayBold, fontSize: 26, color: c.onBrandPrimary },
  statLabel: { fontFamily: fonts.medium, fontSize: 12, color: c.onBrandPrimary, opacity: 0.9 },
  winsBox: { gap: 10, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.25)", paddingTop: 18 },
  winsTitle: { fontFamily: fonts.semibold, fontSize: 14, color: c.onBrandPrimary, opacity: 0.9 },
  winRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  winText: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: c.onBrandPrimary },
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
