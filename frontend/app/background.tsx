import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fileUrl, uploadPhoto, useDay } from "@/src/api";
import { useBackground } from "@/src/background-context";
import {
  APP_BACKGROUNDS,
  MOOD_BACKGROUNDS,
  resolveActive,
  type RotationMode,
  type RotationPool,
} from "@/src/backgrounds";
import { Chip, Icon } from "@/src/components/ui";
import { todayStr } from "@/src/date-utils";
import { MOODS } from "@/src/mood";
import { fonts, makeStyles, useTheme } from "@/src/theme";
import { useUser } from "@/src/user-context";

const MODES: { key: RotationMode; label: string; icon: React.ComponentProps<typeof Icon>["name"] }[] = [
  { key: "fixed", label: "Fixed", icon: "square" },
  { key: "mood", label: "By Mood", icon: "smile" },
  { key: "daily", label: "Daily", icon: "sunrise" },
  { key: "weekly", label: "Weekly", icon: "calendar" },
];

const POOLS: { key: RotationPool; label: string }[] = [
  { key: "app", label: "App" },
  { key: "mine", label: "My photos" },
  { key: "favorites", label: "Favorites" },
  { key: "all", label: "All" },
];

const MAX_CUSTOM = 12;

export default function BackgroundScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useUser();
  const { prefs, update } = useBackground();

  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const { data: todayData } = useDay(userId, todayStr());
  const todayMood = todayData?.entry?.mood;
  const active = resolveActive(prefs, todayStr(), todayMood);

  const toggleFav = (id: string) => {
    const favSet = new Set(prefs.favorites || []);
    if (favSet.has(id)) favSet.delete(id);
    else favSet.add(id);
    update({ favorites: Array.from(favSet) });
  };

  const addAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!userId) return;
    setBusy(true);
    try {
      const { path } = await uploadPhoto(userId, {
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
      });
      const id = `c_${Date.now().toString(36)}`;
      update({ custom: [...prefs.custom, { id, path }] });
    } catch {
      // silent — user can retry
    } finally {
      setBusy(false);
    }
  };

  const fromLibrary = async () => {
    setBlocked(false);
    const perm = await ImagePicker.getMediaLibraryPermissionsAsync();
    let status = perm;
    if (!perm.granted && perm.canAskAgain) status = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!status.granted) {
      if (!status.canAskAgain) setBlocked(true);
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (!res.canceled && res.assets?.[0]) await addAsset(res.assets[0]);
  };

  const fromCamera = async () => {
    setBlocked(false);
    const perm = await ImagePicker.getCameraPermissionsAsync();
    let status = perm;
    if (!perm.granted && perm.canAskAgain) status = await ImagePicker.requestCameraPermissionsAsync();
    if (!status.granted) {
      if (!status.canAskAgain) setBlocked(true);
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (!res.canceled && res.assets?.[0]) await addAsset(res.assets[0]);
  };

  const removeCustom = (id: string) => {
    const next = prefs.custom.filter((c) => c.id !== id);
    const patch: Partial<typeof prefs> = { custom: next };
    if (prefs.selectedId === id) patch.selectedId = "none";
    update(patch);
  };

  const isRotating = prefs.mode === "daily" || prefs.mode === "weekly";

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="bg-back">
          <Icon name="arrow-left" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Background</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 22 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Live preview */}
        <View style={styles.preview}>
          {active.kind === "gradient" ? (
            <LinearGradient colors={active.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.previewFill} />
          ) : active.kind === "photo" && userId ? (
            <Image source={{ uri: fileUrl(active.path, userId) }} style={styles.previewFill} contentFit="cover" />
          ) : (
            <View style={[styles.previewFill, { backgroundColor: colors.surface }]} />
          )}
          <View style={styles.previewLabelWrap}>
            <Text style={styles.previewTitle}>
              {active.kind === "gradient" ? active.name : active.kind === "photo" ? "Your photo" : "Default (theme)"}
            </Text>
            <Text style={styles.previewSub}>
              {prefs.mode === "mood"
                ? todayMood
                  ? "Matching today's mood"
                  : "Log today's mood to see it here"
                : isRotating
                ? `Rotates ${prefs.mode} · showing today`
                : "This is how your pages will look"}
            </Text>
          </View>
        </View>

        {/* Rotation mode */}
        <Text style={styles.sectionLabel}>Rotation</Text>
        <View style={styles.chipRow}>
          {MODES.map((m) => (
            <Chip
              key={m.key}
              testID={`bg-mode-${m.key}`}
              label={m.label}
              icon={m.icon}
              selected={prefs.mode === m.key}
              onPress={() => update({ mode: m.key })}
            />
          ))}
        </View>
        <Text style={styles.note}>
          {prefs.mode === "fixed"
            ? "Pick one background below to use on every page."
            : prefs.mode === "mood"
            ? "Your pages take on a color that matches the mood you log each day — days without a mood use your Fixed pick below."
            : prefs.mode === "daily"
            ? "A fresh background is chosen automatically each day."
            : "A fresh background is chosen automatically each week."}
        </Text>

        {/* Rotating: which pool + favorites */}
        {isRotating ? (
          <View style={{ gap: 12 }}>
            <Text style={styles.sectionLabel}>Rotate through</Text>
            <View style={styles.chipRow}>
              {POOLS.map((p) => {
                const disabled =
                  (p.key === "mine" && prefs.custom.length === 0) ||
                  (p.key === "favorites" && (prefs.favorites?.length ?? 0) === 0);
                return (
                  <Chip
                    key={p.key}
                    testID={`bg-pool-${p.key}`}
                    label={p.label}
                    selected={prefs.pool === p.key}
                    onPress={() => {
                      if (disabled) return;
                      update({ pool: p.key });
                    }}
                  />
                );
              })}
            </View>
            {prefs.pool === "mine" && prefs.custom.length === 0 ? (
              <Text style={styles.note}>Add your own photos below to rotate through them.</Text>
            ) : null}

            {/* Favorite themes (star to curate the Favorites pool) */}
            <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Favorite themes</Text>
            <Text style={styles.note}>Tap the star on any background to add it to your Favorites.</Text>
            <View style={styles.grid}>
              {APP_BACKGROUNDS.map((b) => (
                <Swatch
                  key={b.id}
                  testID={`bg-fav-${b.id}`}
                  starMode
                  selected={(prefs.favorites || []).includes(b.id)}
                  onPress={() => toggleFav(b.id)}
                  label={b.name}
                >
                  <LinearGradient colors={b.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.swatchFill} />
                </Swatch>
              ))}
              {prefs.custom.map((c) => (
                <Swatch
                  key={c.id}
                  testID={`bg-fav-${c.id}`}
                  starMode
                  selected={(prefs.favorites || []).includes(c.id)}
                  onPress={() => toggleFav(c.id)}
                  label="My photo"
                >
                  {userId ? (
                    <Image source={{ uri: fileUrl(c.path, userId) }} style={styles.swatchFill} contentFit="cover" />
                  ) : (
                    <View style={styles.swatchFill} />
                  )}
                </Swatch>
              ))}
            </View>
          </View>
        ) : prefs.mode === "mood" ? (
          /* By Mood: show the palette + fixed fallback picker */
          <View style={{ gap: 14 }}>
            <Text style={styles.sectionLabel}>Mood palette</Text>
            <View style={styles.grid}>
              {MOODS.map((m) => (
                <View key={m.key} style={styles.swatchWrap}>
                  <View style={styles.swatch}>
                    <LinearGradient
                      colors={MOOD_BACKGROUNDS[m.key].colors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.swatchFill}
                    >
                      <Text style={{ fontSize: 26 }}>{m.emoji}</Text>
                    </LinearGradient>
                  </View>
                  <Text style={styles.swatchLabel} numberOfLines={1}>{m.label}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Fallback (no mood logged)</Text>
            <View style={styles.grid}>
              <Swatch
                testID="bg-swatch-none"
                selected={prefs.selectedId === "none"}
                onPress={() => update({ selectedId: "none" })}
                label="Default"
              >
                <View style={[styles.swatchFill, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>
                  <Icon name="slash" size={20} color={colors.muted} />
                </View>
              </Swatch>
              {APP_BACKGROUNDS.map((b) => (
                <Swatch
                  key={b.id}
                  testID={`bg-swatch-${b.id}`}
                  selected={prefs.selectedId === b.id}
                  onPress={() => update({ selectedId: b.id })}
                  label={b.name}
                >
                  <LinearGradient colors={b.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.swatchFill} />
                </Swatch>
              ))}
            </View>
          </View>
        ) : (
          /* Fixed: choose a background */
          <View style={{ gap: 14 }}>
            <Text style={styles.sectionLabel}>Choose a background</Text>
            <View style={styles.grid}>
              {/* None / default */}
              <Swatch
                testID="bg-swatch-none"
                selected={prefs.selectedId === "none"}
                onPress={() => update({ selectedId: "none" })}
                label="Default"
              >
                <View style={[styles.swatchFill, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>
                  <Icon name="slash" size={20} color={colors.muted} />
                </View>
              </Swatch>

              {APP_BACKGROUNDS.map((b) => (
                <Swatch
                  key={b.id}
                  testID={`bg-swatch-${b.id}`}
                  selected={prefs.selectedId === b.id}
                  onPress={() => update({ selectedId: b.id })}
                  label={b.name}
                >
                  <LinearGradient colors={b.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.swatchFill} />
                </Swatch>
              ))}

              {prefs.custom.map((c) => (
                <Swatch
                  key={c.id}
                  testID={`bg-swatch-${c.id}`}
                  selected={prefs.selectedId === c.id}
                  onPress={() => update({ selectedId: c.id })}
                  label="My photo"
                >
                  {userId ? (
                    <Image source={{ uri: fileUrl(c.path, userId) }} style={styles.swatchFill} contentFit="cover" />
                  ) : (
                    <View style={styles.swatchFill} />
                  )}
                </Swatch>
              ))}
            </View>
          </View>
        )}

        {/* My backgrounds */}
        <View style={{ gap: 14 }}>
          <Text style={styles.sectionLabel}>My photos</Text>
          <View style={styles.grid}>
            {prefs.custom.map((c) => (
              <View key={c.id} style={styles.myThumb}>
                {userId ? (
                  <Image source={{ uri: fileUrl(c.path, userId) }} style={styles.swatchFill} contentFit="cover" />
                ) : null}
                <Pressable
                  testID={`bg-remove-${c.id}`}
                  onPress={() => removeCustom(c.id)}
                  style={styles.removeBtn}
                  hitSlop={6}
                >
                  <Icon name="x" size={14} color={colors.onError} />
                </Pressable>
              </View>
            ))}
            {busy ? (
              <View style={[styles.myThumb, styles.loadingThumb]}>
                <ActivityIndicator color={colors.brand} />
              </View>
            ) : null}
          </View>

          {prefs.custom.length < MAX_CUSTOM && !busy ? (
            <View style={styles.actions}>
              <Pressable testID="bg-camera" onPress={fromCamera} style={styles.actionBtn}>
                <Icon name="camera" size={18} color={colors.onSurface} />
                <Text style={styles.actionText}>Take photo</Text>
              </Pressable>
              <Pressable testID="bg-library" onPress={fromLibrary} style={styles.actionBtn}>
                <Icon name="image" size={18} color={colors.onSurface} />
                <Text style={styles.actionText}>Choose photo</Text>
              </Pressable>
            </View>
          ) : null}

          {blocked ? (
            <Pressable onPress={() => Linking.openSettings()} testID="bg-open-settings">
              <Text style={styles.blockedText}>Photo access is off. Tap to open Settings.</Text>
            </Pressable>
          ) : null}
          <Text style={styles.note}>Add up to {MAX_CUSTOM} of your own photos to use as backgrounds.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Swatch({
  children,
  selected,
  onPress,
  label,
  testID,
  starMode,
}: {
  children: React.ReactNode;
  selected: boolean;
  onPress: () => void;
  label: string;
  testID?: string;
  starMode?: boolean;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable testID={testID} onPress={onPress} style={styles.swatchWrap}>
      <View style={[styles.swatch, selected && styles.swatchSelected]}>
        {children}
        {starMode ? (
          <View style={[styles.checkBadge, !selected && styles.starBadgeIdle]}>
            <Icon name="star" size={13} color={selected ? colors.onBrandPrimary : colors.muted} />
          </View>
        ) : selected ? (
          <View style={styles.checkBadge}>
            <Icon name="check" size={14} color={colors.onBrandPrimary} />
          </View>
        ) : null}
      </View>
      <Text style={styles.swatchLabel} numberOfLines={1}>{label}</Text>
    </Pressable>
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
  sectionLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: c.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  note: { fontFamily: fonts.regular, fontSize: 13, color: c.muted, lineHeight: 19 },
  preview: {
    height: 150,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: c.border,
    justifyContent: "flex-end",
  },
  previewFill: { ...StyleSheet.absoluteFillObject },
  previewLabelWrap: { padding: 16 },
  previewTitle: { fontFamily: fonts.displayBold, fontSize: 20, color: c.onSurface },
  previewSub: { fontFamily: fonts.medium, fontSize: 13, color: c.onSurfaceSecondary, marginTop: 2 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  swatchWrap: { width: 96, gap: 6 },
  swatch: {
    width: 96,
    height: 68,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: c.border,
  },
  swatchSelected: { borderColor: c.brandPrimary, borderWidth: 3 },
  swatchFill: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  swatchLabel: { fontFamily: fonts.medium, fontSize: 12, color: c.onSurfaceTertiary, textAlign: "center" },
  checkBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: c.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  starBadgeIdle: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  myThumb: { width: 96, height: 68, borderRadius: 14, overflow: "hidden", position: "relative", borderWidth: 1, borderColor: c.border },
  loadingThumb: { alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceTertiary },
  removeBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: c.error,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: { flexDirection: "row", gap: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.border,
  },
  actionText: { fontFamily: fonts.semibold, fontSize: 14, color: c.onSurface },
  blockedText: { fontFamily: fonts.medium, fontSize: 13, color: c.error },
}));
