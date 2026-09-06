import { useRouter } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGratitudeWall } from "@/src/api";
import { prettyDate } from "@/src/date-utils";
import { EmptyState, Icon } from "@/src/components/ui";
import { fonts, makeStyles, useTheme } from "@/src/theme";
import { useUser } from "@/src/user-context";

export default function GratitudeWallScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useUser();
  const { data, isLoading } = useGratitudeWall(userId);
  const items = data?.items ?? [];

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="wall-back">
          <Icon name="arrow-left" size={24} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Gratitude Wall</Text>
          {data && data.total > 0 ? (
            <Text style={styles.headerSub}>{data.total} moments of gratitude</Text>
          ) : null}
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24, gap: 12, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isLoading ? (
            <EmptyState icon="loader" title="Gathering your gratitude..." />
          ) : (
            <EmptyState
              icon="heart"
              title="Your gratitude wall is waiting"
              subtitle="Add blessings in your daily check-in and they'll gather here over time."
            />
          )
        }
        renderItem={({ item, index }) => (
          <Pressable
            testID={`wall-item-${index}`}
            onPress={() => router.push(`/day/${item.date}`)}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
          >
            <View style={styles.quoteMark}>
              <Icon name="heart" size={16} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.text}>{item.text}</Text>
              <Text style={styles.date}>{prettyDate(item.date)}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: c.surface,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
  },
  headerTitle: { fontFamily: fonts.displayBold, fontSize: 22, color: c.onSurface },
  headerSub: { fontFamily: fonts.regular, fontSize: 13, color: c.muted, marginTop: 2 },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    backgroundColor: c.surfaceSecondary,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: c.border,
  },
  quoteMark: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: c.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { fontFamily: fonts.display, fontSize: 18, lineHeight: 26, color: c.onSurface },
  date: { fontFamily: fonts.medium, fontSize: 13, color: c.muted, marginTop: 6 },
}));
