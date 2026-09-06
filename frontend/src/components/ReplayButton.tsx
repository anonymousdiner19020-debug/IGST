import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { api } from "@/src/api";
import { playerStorage } from "@/src/storage";
import { sound } from "@/src/sound";
import { colors, radius, shadow, spacing } from "@/src/theme";

const REPLAY_COST = 25;

// Shown on a mini-game's result screen: pay 25 coins to play again instantly.
export default function ReplayButton({
  onReplay,
  color = colors.brand,
}: {
  onReplay: () => void;
  color?: string;
}) {
  const [coins, setCoins] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadCoins = useCallback(async () => {
    const id = await playerStorage.get();
    if (!id) {
      setCoins(0);
      return;
    }
    try {
      const p = await api.getPlayer(id);
      setCoins(p.coins);
    } catch {
      setCoins(0);
    }
  }, []);

  useEffect(() => {
    loadCoins();
  }, [loadCoins]);

  const handlePress = async () => {
    if (busy) return;
    setErr(null);
    const id = await playerStorage.get();
    if (!id) return;
    if ((coins ?? 0) < REPLAY_COST) {
      setErr("Not enough coins — you need 25 🪙.");
      return;
    }
    setBusy(true);
    try {
      const res = await api.replayMini(id);
      setCoins(res.player.coins);
      sound.play("coin");
      onReplay();
    } catch (e: any) {
      setErr("Not enough coins — you need 25 🪙.");
    } finally {
      setBusy(false);
    }
  };

  const affordable = (coins ?? 0) >= REPLAY_COST;

  return (
    <View style={styles.wrap}>
      <Pressable
        testID="replay-button"
        disabled={busy || !affordable}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.btn,
          { borderColor: color },
          (!affordable || busy) && styles.dim,
          pressed && { transform: [{ scale: 0.96 }] },
        ]}
      >
        <Text style={[styles.text, { color }]}>{busy ? "…" : "Play Again"}</Text>
        <Text style={[styles.cost, { color }]}>25 🪙</Text>
      </Pressable>
      {err && <Text style={styles.err}>{err}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: spacing.xs },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.pill,
    borderWidth: 3,
    ...shadow.tier1,
  },
  dim: { opacity: 0.45 },
  text: { fontSize: 18, fontWeight: "900", letterSpacing: 0.5 },
  cost: { fontSize: 15, fontWeight: "800" },
  err: { fontSize: 13, fontWeight: "800", color: colors.error },
});
