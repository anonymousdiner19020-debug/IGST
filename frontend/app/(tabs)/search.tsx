import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSearch } from "@/src/api";
import { shortDate } from "@/src/date-utils";
import { EmptyState, Icon } from "@/src/components/ui";
import { fonts, makeStyles, useTheme } from "@/src/theme";
import { useUser } from "@/src/user-context";

export default function SearchScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useUser();
  const [text, setText] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setQ(text), 300);
    return () => clearTimeout(t);
  }, [text]);

  const { data, isFetching } = useSearch(userId, q);
  const results = data?.results ?? [];

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Search</Text>
        <View style={styles.searchBar}>
          <Icon name="search" size={18} color={colors.muted} />
          <TextInput
            testID="search-input"
            value={text}
            onChangeText={setText}
            placeholder="Search your reflections..."
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
          />
          {text.length > 0 ? (
            <Pressable onPress={() => setText("")} hitSlop={8} testID="search-clear">
              <Icon name="x" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.date}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          q.trim().length === 0 ? (
            <EmptyState
              icon="search"
              title="Search your past reflections"
              subtitle="Find any blessing, goal, workout or journal entry you've written."
            />
          ) : isFetching ? (
            <EmptyState icon="loader" title="Searching..." />
          ) : (
            <EmptyState icon="inbox" title="No matches found" subtitle={`Nothing found for "${q}"`} />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            testID={`search-result-${item.date}`}
            onPress={() => router.push(`/day/${item.date}`)}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
          >
            <View style={styles.cardHead}>
              <Text style={styles.cardDate}>{shortDate(item.date)}</Text>
              <View style={styles.dayPill}>
                <Text style={styles.dayPillText}>Day {item.dayNumber}</Text>
              </View>
            </View>
            {item.matches.map((m, i) => (
              <View key={i} style={styles.match}>
                <Text style={styles.matchLabel}>{m.label}</Text>
                <Text style={styles.matchSnippet} numberOfLines={2}>
                  {m.snippet}
                </Text>
              </View>
            ))}
          </Pressable>
        )}
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: c.surface,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
    gap: 14,
  },
  title: { fontFamily: fonts.displayBold, fontSize: 28, color: c.onSurface },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: c.surfaceSecondary,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    borderColor: c.border,
  },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: c.onSurface },
  card: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: c.border,
    gap: 12,
  },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardDate: { fontFamily: fonts.semibold, fontSize: 16, color: c.onSurface },
  dayPill: { backgroundColor: c.brandTertiary, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  dayPillText: { fontFamily: fonts.medium, fontSize: 12, color: c.onBrandTertiary },
  match: { gap: 2 },
  matchLabel: { fontFamily: fonts.semibold, fontSize: 12, color: c.brand, textTransform: "uppercase", letterSpacing: 0.5 },
  matchSnippet: { fontFamily: fonts.regular, fontSize: 15, color: c.onSurfaceSecondary, lineHeight: 21 },
}));
