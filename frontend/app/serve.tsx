import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import {
  CUSTOMER_AVATARS,
  Dish,
  FALLBACK_DISHES,
  generateCustomerOrder,
  INGREDIENTS,
  serveOptions,
} from "@/src/constants/dishes";
import { playerStorage } from "@/src/storage";
import { sound } from "@/src/sound";
import { colors, radius, shadow, spacing } from "@/src/theme";
import LibertyBell from "@/src/components/LibertyBell";
import DishIcon from "@/src/components/DishIcon";
import IngredientIcon from "@/src/components/IngredientIcon";
import SparkleBurst from "@/src/components/SparkleBurst";
import TeamLogo from "@/src/components/TeamLogo";

// Jackpot slot badges — alternate between Philadelphia team logos.
const JACKPOT_TEAMS: { code: string; name: string }[] = [
  { code: "eagles", name: "EAGLES" },
  { code: "phillies", name: "PHILLIES" },
  { code: "flyers", name: "FLYERS" },
];

type Customer = {
  avatar: string;
  wanted: string[];
  forbidden: string[];
  fan?: string; // Philly team emoji if this is a sports fan
  tag?: string; // fan flavor text
  rivalry?: string; // "whiz" or "provolone" cheesesteak mini-challenge
  special?: boolean; // surprise "special order" with a rare extra topping
  specialItem?: string; // the rare topping requested
  vip?: boolean; // rare big-tipper: double tip but shorter patience
};

const PATIENCE_MS = 20000;

// Philly sports teams — fans occasionally show up repping their colors.
const PHILLY_TEAMS = ["🦅", "⚾", "🏀", "🏒"];
const TEAM_CHANTS: Record<string, string[]> = {
  "🦅": ["Go Birds! 🦅", "Bleed green! 💚", "E-A-G-L-E-S! 🦅", "Dawg mentality! 🐶"],
  "⚾": ["Go Phils! ⚾", "Ring the bell! 🔔", "Red October! 🍁", "Phandom forever! ⚾"],
  "🏀": ["Trust the Process! 🏀", "Go Sixers! 🏀", "Philly hoops! 🏀", "Bell ringer! 🔔"],
  "🏒": ["Let's Go Flyers! 🏒", "Orange & black! 🟠", "Drop the puck! 🏒", "Broad Street brawlers! 🏒"],
};

function pickChant(team: string): string {
  const list = TEAM_CHANTS[team] || ["Go Philly! 🔔"];
  return list[Math.floor(Math.random() * list.length)];
}

const FAN_TAGS = ["Philly fan!", "It's a Philly thing!", "Philly proud!", "Repping Philly!"];

// Official team colors + a jersey number for each Philly team.
const TEAM_STYLE: Record<string, { color: string; number: string; code: string; name: string }> = {
  "🦅": { color: "#004C54", number: "9", code: "eagles", name: "Eagles" },
  "⚾": { color: "#E81828", number: "3", code: "phillies", name: "Phillies" },
  "🏀": { color: "#006BB6", number: "21", code: "sixers", name: "Sixers" },
  "🏒": { color: "#F74902", number: "88", code: "flyers", name: "Flyers" },
};

function buildCustomers(dish: Dish, toppings: string[], count: number, allFans = false): Customer[] {
  // Keep special-order extras out of the everyday topping pool so they only
  // appear as surprise requests.
  const specialSet = new Set(dish.special_options || []);
  const normalToppings = toppings.filter((t) => !specialSet.has(t));
  const filteredDish = { ...dish, topping_options: normalToppings };
  const list: Customer[] = [];
  for (let i = 0; i < count; i++) {
    // ~10% of customers are rare VIP big-tippers (double tip, less patience).
    const isVip = Math.random() < 0.1;
    // ~22% of customers place a surprise special order for a rare extra.
    const wantSpecial = !isVip && Math.random() < 0.22 && (dish.special_options || []).length > 0;
    const order = generateCustomerOrder(filteredDish, Math.random, wantSpecial);
    const isFan = !isVip && (allFans || Math.random() < 0.25);
    // Cheesesteak rivalry: some customers demand exactly Whiz or Provolone
    // (and refuse the other) as a mini-challenge.
    let wanted = order.wanted;
    let forbidden = order.forbidden;
    let specialItem = order.specialItem;
    let rivalry: string | undefined;
    if (dish.id === "cheesesteak" && Math.random() < 0.4) {
      rivalry = Math.random() < 0.5 ? "whiz" : "provolone";
      const other = rivalry === "whiz" ? "provolone" : "whiz";
      wanted = [rivalry, ...order.wanted.filter((w) => w !== rivalry && w !== other)].slice(0, 2);
      forbidden = [other];
      specialItem = undefined; // rivalry is its own challenge
    }
    list.push({
      avatar: CUSTOMER_AVATARS[Math.floor(Math.random() * CUSTOMER_AVATARS.length)],
      wanted,
      forbidden,
      fan: isFan ? PHILLY_TEAMS[Math.floor(Math.random() * PHILLY_TEAMS.length)] : undefined,
      tag: isFan ? FAN_TAGS[Math.floor(Math.random() * FAN_TAGS.length)] : undefined,
      rivalry,
      special: !!specialItem,
      specialItem,
      vip: isVip,
    });
  }
  return list;
}

export default function Serve() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    dishId: string;
    level: string;
    score: string;
    inventory: string;
    toppings: string;
    movesLeft: string;
    daily: string;
  }>();

  const dish = useMemo(
    () => FALLBACK_DISHES.find((d) => d.id === params.dishId) || FALLBACK_DISHES[0],
    [params.dishId]
  );
  const levelNum = parseInt(params.level || "1", 10);
  const baseScore = parseInt(params.score || "0", 10);
  const toppings: string[] = useMemo(() => {
    try {
      const parsed = JSON.parse(params.toppings || "[]");
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : serveOptions(dish);
    } catch {
      return serveOptions(dish);
    }
  }, [params.toppings, dish]);

  // Leftover toppings collected during the match-3 phase (fuel for the pantry).
  const invToppings: Record<string, number> = useMemo(() => {
    try {
      const inv = JSON.parse(params.inventory || "{}") as Record<string, number>;
      const out: Record<string, number> = {};
      for (const t of toppings) if (inv[t] > 0) out[t] = inv[t];
      return out;
    } catch {
      return {};
    }
  }, [params.inventory, toppings]);

  const [extraServings, setExtraServings] = useState(0);

  // ~20% of rounds are a "Fan Rush" — a whole wave of Philly fans, double tips.
  const fanRush = useMemo(() => Math.random() < 0.2, []);

  const customers = useMemo(
    () => buildCustomers(dish, toppings, dish.customers_per_level + extraServings, fanRush),
    [dish, toppings, extraServings, fanRush]
  );

  const [idx, setIdx] = useState(0);
  const [plate, setPlate] = useState<string[]>([]);
  const [coins, setCoins] = useState(0);
  const [bells, setBells] = useState(0);
  const [servedCount, setServedCount] = useState(0);
  const [score, setScore] = useState(baseScore);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [patience, setPatience] = useState(1);
  const [finished, setFinished] = useState(false);
  const [streak, setStreak] = useState(0);
  const [pantry, setPantry] = useState<Record<string, number>>({});
  const [pantryLevel, setPantryLevel] = useState(0);
  const [jackpot, setJackpot] = useState<number | null>(null);
  const [jackpotTeam, setJackpotTeam] = useState(0);
  const [sparkle, setSparkle] = useState(0);
  const [milestone, setMilestone] = useState<string | null>(null);
  const [chant, setChant] = useState<string | null>(null);
  const missedRef = useRef(0);
  const fanStreakRef = useRef(0);
  const perfectServesRef = useRef(0);
  const specialServedRef = useRef(0);
  const fansServedRef = useRef(0);
  const celebFlipRef = useRef(false); // alternate PERFECT! vs HOT STREAK celebration
  const jackpotTeamRef = useRef(0); // cycles Eagles -> Phillies -> Flyers badge
  const patienceRef = useRef<any>(null);
  const startRef = useRef<number>(Date.now());

  const isDaily = params.daily === "1";
  const current = customers[idx];
  const pantryMaxed = pantryLevel >= 3;

  // Later levels give customers less patience so 10 orders stays challenging.
  const patienceMs = PATIENCE_MS;
  // Customer mood reacts to how long they've been waiting.
  const mood = patience > 0.6 ? "😀" : patience > 0.3 ? "😐" : "😠";

  // combo multiplier grows with consecutive perfect serves: 1x, 1.5x, 2x, 2.5x...
  const comboMult = 1 + streak * 0.5;

  useEffect(() => {
    (async () => {
      const id = await playerStorage.get();
      if (!id) return;
      try {
        const info = await api.getPantryInfo(id);
        setPantry(info.pantry || {});
        setPantryLevel(info.pantry_level || 0);
      } catch {}
      try {
        const p = await api.getPlayer(id);
        setExtraServings(p.plates_level || 0);
      } catch {}
    })();
  }, []);

  // Maxed pantry auto-places one wanted topping for each new customer.
  useEffect(() => {
    if (finished || !current) return;
    if (pantryMaxed && current.wanted.length > 0) {
      setPlate([current.wanted[0]]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, pantryMaxed, finished]);

  // patience timer per customer
  useEffect(() => {
    if (finished || !current) return;
    startRef.current = Date.now();
    setPatience(1);
    // VIP big-tippers are impatient — they give ~40% less time.
    const pMs = current.vip ? Math.round(patienceMs * 0.6) : patienceMs;
    patienceRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, 1 - elapsed / pMs);
      setPatience(remaining);
      if (remaining <= 0) {
        clearInterval(patienceRef.current);
        handleTimeout();
      }
    }, 100);
    return () => clearInterval(patienceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, finished]);

  const toggleTopping = (t: string) => {
    if (finished) return;
    sound.play("pop");
    try {
      Haptics.selectionAsync();
    } catch {}
    setPlate((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
  };

  // Tap a stored pantry item: instantly place it and consume one from storage.
  const takeFromPantry = (t: string) => {
    if (finished) return;
    if ((pantry[t] || 0) <= 0) return;
    sound.play("pop");
    try {
      Haptics.selectionAsync();
    } catch {}
    setPantry((p) => ({ ...p, [t]: Math.max(0, (p[t] || 0) - 1) }));
    setPlate((p) => (p.includes(t) ? p : [...p, t]));
  };

  const nextCustomer = useCallback(
    (earnedCoins: number, earnedScore: number, ok: boolean, earnedBells: number = 0) => {
      setCoins((c) => c + earnedCoins);
      setBells((b) => b + earnedBells);
      setScore((s) => s + earnedScore);
      if (ok) setServedCount((c) => c + 1);
      else missedRef.current += 1;
      // Halfway cheer to keep momentum going.
      const total = customers.length;
      const half = Math.ceil(total / 2);
      const newServed = servedCount + (ok ? 1 : 0);
      if (ok && total >= 4 && newServed === half) {
        setMilestone(`${newServed} of ${total} served!`);
        sound.play("ding");
        setTimeout(() => setMilestone(null), 1500);
      }
      setPlate([]);
      if (patienceRef.current) clearInterval(patienceRef.current);
      setTimeout(() => {
        setFeedback(null);
        if (idx + 1 >= customers.length) {
          finishLevel(
            coins + earnedCoins,
            servedCount + (ok ? 1 : 0),
            score + earnedScore,
            bells + earnedBells
          );
        } else {
          setIdx((i) => i + 1);
        }
      }, 3500);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idx, customers.length, coins, servedCount, score, bells]
  );

  const handleServe = () => {
    if (finished || !current) return;
    const wantedSet = new Set(current.wanted);
    const plateSet = new Set(plate);
    // correct if plate matches wanted exactly and contains no forbidden
    const missing = current.wanted.filter((w) => !plateSet.has(w));
    const extra = plate.filter((p) => !wantedSet.has(p));
    const hasForbidden = plate.some((p) => current.forbidden.includes(p));
    const perfect = missing.length === 0 && extra.length === 0 && !hasForbidden;

    if (perfect) {
      perfectServesRef.current += 1;
      if (current.special) specialServedRef.current += 1;
      if (current.fan) fansServedRef.current += 1;
      const speedBonus = Math.round(patience * 20);
      const base = dish.reward_coins + speedBonus;
      const newStreak = streak + 1;
      const mult = 1 + streak * 0.5; // multiplier from CURRENT streak before increment
      const dailyMult = isDaily ? 2 : 1;
      const rushMult = fanRush ? 2 : 1; // Fan Rush doubles all tips
      const vipMult = current.vip ? 2 : 1; // VIP big-tipper pays double
      const tip = Math.round(base * mult * dailyMult * rushMult * vipMult);
      setStreak(newStreak);
      // Alternate celebrations: when a jackpot is eligible, show either the
      // PERFECT! burst OR the HOT STREAK box (flip each time), never both.
      const jackpotEligible = mult >= 2.5;
      let showPerfect = true;
      if (jackpotEligible) {
        celebFlipRef.current = !celebFlipRef.current;
        showPerfect = celebFlipRef.current;
      }
      if (showPerfect) setSparkle((s) => s + 1);
      sound.play("serve");
      sound.play("coin");
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      const comboLabel = mult > 1 ? ` 🔥x${mult}` : "";
      const dailyLabel = isDaily ? " ⭐2×" : "";
      // Liberty Bell tip: faster serve = more bells (1-3), doubled for VIPs.
      const bellTip = (patience > 0.66 ? 3 : patience > 0.33 ? 2 : 1) * vipMult;
      const vipLabel = current.vip ? " 💎 VIP double tip!" : "";
      // Bonus coin tip + chant for perfectly serving Philly sports fans.
      // Consecutive perfect fan serves stack a growing streak bonus.
      let fanBonus = 0;
      if (current.fan) {
        fanStreakRef.current += 1;
        const fs = fanStreakRef.current;
        fanBonus = 25 * fs;
        const streakTag = fs >= 2 ? `  🔥 ${fs} fans!` : "";
        setChant(pickChant(current.fan) + streakTag);
        sound.play("cheer");
        const code = TEAM_STYLE[current.fan]?.code;
        if (code) {
          playerStorage.get().then((id) => id && api.servedFan(id, code).catch(() => {}));
        }
        setTimeout(() => setChant(null), 1500);
      } else {
        fanStreakRef.current = 0;
      }
      const fanLabel = fanBonus > 0 ? ` +${fanBonus} 🪙 fan tip` : "";
      // Special order bonus for nailing a surprise request.
      let specialBonus = 0;
      if (current.special) {
        specialBonus = 50;
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }
      const specialLabel = specialBonus > 0 ? ` ⭐ +${specialBonus} 🪙 special!` : "";
      setFeedback({ ok: true, text: `Perfect! +${tip} 🪙 +${bellTip} 🔔${comboLabel}${dailyLabel}${fanLabel}${specialLabel}${vipLabel}` });
      // Streak jackpot at 2.5x multiplier or higher (4+ consecutive perfects)
      let jackpotBonus = 0;
      if (jackpotEligible) {
        jackpotBonus = 40 * streak;
        // Only show the HOT STREAK box on the turns we're not showing PERFECT!
        if (!showPerfect) {
          setJackpotTeam(jackpotTeamRef.current % 3);
          jackpotTeamRef.current += 1;
          setJackpot(jackpotBonus);
          setTimeout(() => setJackpot(null), 1400);
        }
        sound.play("coin");
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }
      nextCustomer(tip + jackpotBonus + fanBonus + specialBonus, Math.round((100 + speedBonus) * mult), true, bellTip);
    } else {
      const partial = Math.max(0, current.wanted.length - missing.length - extra.length);
      const dailyMult = isDaily ? 2 : 1;
      const coinsGot = partial * 8 * dailyMult;
      setStreak(0); // combo broken
      sound.play("error");
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      setFeedback({ ok: false, text: coinsGot > 0 ? `Close! +${coinsGot} 🪙` : "Wrong order!" });
      fanStreakRef.current = 0;
      nextCustomer(coinsGot, partial * 15, false);
    }
  };

  const handleTimeout = () => {
    setStreak(0);
    fanStreakRef.current = 0;
    sound.play("error");
    setFeedback({ ok: false, text: "Too slow! Customer left 😤" });
    nextCustomer(0, 0, false);
  };

  const finishLevel = async (totalCoins: number, served: number, totalScore: number, totalBells: number) => {
    if (finished) return;
    setFinished(true);
    const total = customers.length;
    // Perfect run bonus: served every customer with no misses.
    const perfectRun = served >= total && missedRef.current === 0;
    const perfectBonus = perfectRun ? total * 20 : 0;
    const finalCoins = totalCoins + perfectBonus;
    const completed = served > 0;
    // Stars reward speed + combos: all-perfect = 3, most-perfect = 2, any win = 1.
    const stars = served >= total ? 3 : served >= Math.ceil(total * 0.6) ? 2 : served >= 1 ? 1 : 0;
    const id = await playerStorage.get();
    if (id) {
      // Carry leftover toppings into the pantry (backend caps by pantry level).
      if (pantryLevel > 0) {
        const merged: Record<string, number> = { ...pantry };
        for (const [k, v] of Object.entries(invToppings)) {
          merged[k] = (merged[k] || 0) + (v as number);
        }
        try {
          await api.savePantry(id, merged);
        } catch {}
      }
      try {
        await api.completeLevel(id, {
          level: levelNum,
          dish_id: dish.id,
          score: totalScore,
          coins_earned: finalCoins,
          bells_earned: totalBells,
          completed: served >= Math.ceil(customers.length / 2),
          stars,
        });
      } catch {}
      // Report progress toward today's daily challenge.
      try {
        await api.reportDailyGoal(id, {
          special_served: specialServedRef.current,
          customers_served: served,
          perfect_serves: perfectServesRef.current,
          levels_completed: completed ? 1 : 0,
          fans_served: fansServedRef.current,
        });
      } catch {}
    }
    router.replace({
      pathname: "/cooking-result",
      params: {
        completed: completed ? "1" : "0",
        coins: String(finalCoins),
        bells: String(totalBells),
        score: String(totalScore),
        dishId: dish.id,
        level: String(levelNum),
        served: String(served),
        total: String(customers.length),
        stars: String(stars),
        perfectBonus: String(perfectBonus),
        nextLevel: String(levelNum + 1),
      },
    });
  };

  if (!current) return <View style={styles.container} />;

  return (
    <View style={styles.container} testID="serve-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>
            Customer {idx + 1}/{customers.length}
          </Text>
        </View>
        {streak >= 1 && (
          <View style={styles.streakBadge} testID="combo-streak">
            <Text style={styles.streakText}>🔥 x{(1 + streak * 0.5).toFixed(1)}</Text>
          </View>
        )}
        <View style={styles.coinChip} testID="serve-coins">
          <Text style={styles.coinEmoji}>🪙</Text>
          <Text style={styles.coinText}>{coins}</Text>
        </View>
        <View style={styles.bellChip} testID="serve-bells">
          <LibertyBell size={16} />
          <Text style={styles.bellText}>{bells}</Text>
        </View>
      </View>

      {fanRush && (
        <View style={styles.rushBanner} testID="fan-rush-banner">
          <Text style={styles.rushText}>🎉 FAN RUSH — DOUBLE TIPS! 🎉</Text>
        </View>
      )}

      {/* Customer + order ticket */}
      <View style={styles.customerZone}>
        <View style={styles.patienceTrack}>
          <View
            style={[
              styles.patienceFill,
              {
                width: `${Math.round(patience * 100)}%`,
                backgroundColor:
                  patience > 0.5 ? colors.success : patience > 0.25 ? colors.warning : colors.error,
              },
            ]}
            testID="patience-bar"
          />
        </View>
        <View style={styles.avatarWrap}>
          <Text style={styles.customerAvatar}>{current.avatar}</Text>
          <Text style={styles.moodBubble} testID="customer-mood">{mood}</Text>
          {current.fan && (
            <View style={styles.fanBadge} testID="fan-badge">
              <TeamLogo code={TEAM_STYLE[current.fan]?.code} size={34} fallback={current.fan} />
            </View>
          )}
        </View>
        {current.fan && (
          <View
            style={[styles.fanTag, { backgroundColor: TEAM_STYLE[current.fan]?.color || colors.brand }]}
            testID="fan-tag"
          >
            <Text style={styles.fanTagText}>{current.fan} {current.tag || "Philly fan!"}</Text>
          </View>
        )}
        <View style={styles.ticket} testID="order-ticket">
          {current.rivalry && (
            <View style={styles.rivalryTag} testID="rivalry-tag">
              <Text style={styles.rivalryText}>
                🧀 {current.rivalry === "whiz" ? "WHIZ" : "PROVOLONE"} ONLY!
              </Text>
            </View>
          )}
          {current.special && (
            <View style={styles.specialTag} testID="special-tag">
              <Text style={styles.specialText}>⭐ SPECIAL ORDER • BONUS TIP!</Text>
            </View>
          )}
          {current.vip && (
            <View style={styles.vipTag} testID="vip-tag">
              <Text style={styles.vipText}>💎 VIP • DOUBLE TIP • HURRY!</Text>
            </View>
          )}
          <View style={styles.ticketTitleRow}>
            <DishIcon id={dish.id} emoji={dish.emoji} size={24} />
            <Text style={styles.ticketTitle}>{dish.name}</Text>
          </View>
          <View style={styles.ticketDivider} />
          {current.wanted.map((w) => {
            const isSpecial = current.special && w === current.specialItem;
            return (
              <View
                key={w}
                style={[styles.ticketRow, isSpecial && styles.ticketRowSpecial]}
                testID={`want-${w}`}
              >
                <Text style={[styles.ticketPlus, isSpecial && { color: "#B7791F" }]}>
                  {isSpecial ? "⭐" : "＋"}
                </Text>
                <Text style={[styles.ticketItem, isSpecial && styles.ticketItemSpecial]}>
                  {INGREDIENTS[w]?.label || w}
                </Text>
                <IngredientIcon id={w} emoji={INGREDIENTS[w]?.emoji} size={34} />
              </View>
            );
          })}
          {current.forbidden.map((f) => (
            <View key={f} style={styles.ticketRow} testID={`no-${f}`}>
              <Text style={styles.ticketNo}>NO</Text>
              <Text style={[styles.ticketItem, { color: colors.error }]}>
                {INGREDIENTS[f]?.label || f}
              </Text>
              <IngredientIcon id={f} emoji={INGREDIENTS[f]?.emoji} size={34} />
            </View>
          ))}
        </View>
      </View>

      {feedback && (
        <View
          style={[styles.feedback, { backgroundColor: feedback.ok ? colors.success : colors.error }]}
          testID="serve-feedback"
        >
          <Text style={styles.feedbackText}>{feedback.text}</Text>
        </View>
      )}

      {/* Combo meter */}
      <View style={styles.comboMeter} testID="combo-meter">
        <View style={styles.comboSegments}>
          {[1.5, 2.0, 2.5, 3.0, 3.5].map((tier, i) => (
            <View
              key={tier}
              style={[styles.comboSeg, i < streak && styles.comboSegOn]}
            />
          ))}
        </View>
        <Text style={styles.comboMeterLabel}>
          {streak === 0
            ? "Serve perfect to start a 🔥 combo"
            : `Combo x${comboMult.toFixed(1)} • next x${(1 + (streak + 1) * 0.5).toFixed(1)}`}
        </Text>
      </View>

      {/* Plate builder */}
      <View style={styles.plateZone}>
        <Text style={styles.plateLabel}>YOUR PLATE</Text>
        <View style={styles.plate} testID="plate">
          <DishIcon id={dish.id} emoji={dish.emoji} size={40} />
          {plate.length === 0 ? (
            <Text style={styles.plateHint}>Tap toppings below to build the order</Text>
          ) : (
            <View style={styles.plateItems}>
              {plate.map((p) => (
                <View key={p} style={styles.plateChip} testID={`plate-${p}`}>
                  <IngredientIcon id={p} emoji={INGREDIENTS[p]?.emoji} size={40} />
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Pantry shelf — stored leftover toppings from previous levels */}
      {pantryLevel > 0 && Object.values(pantry).some((n) => n > 0) && (
        <View style={styles.pantryZone} testID="pantry-shelf">
          <Text style={styles.pantryLabel}>🥫 PANTRY (tap to use)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pantryRow}>
            {Object.entries(pantry)
              .filter(([, n]) => n > 0)
              .map(([t, n]) => (
                <Pressable
                  key={t}
                  testID={`pantry-${t}`}
                  onPress={() => takeFromPantry(t)}
                  style={({ pressed }) => [styles.pantryChip, pressed && { transform: [{ scale: 0.93 }] }]}
                >
                  <IngredientIcon id={t} emoji={INGREDIENTS[t]?.emoji} size={30} />
                  <View style={styles.pantryCount}>
                    <Text style={styles.pantryCountText}>{n}</Text>
                  </View>
                </Pressable>
              ))}
          </ScrollView>
        </View>
      )}

      {/* Topping tray */}
      <View style={[styles.tray, { paddingBottom: insets.bottom + spacing.md }]}>
        <ScrollView
          contentContainerStyle={styles.trayGrid}
          showsVerticalScrollIndicator={false}
        >
          {toppings.map((t) => {
            const active = plate.includes(t);
            const info = INGREDIENTS[t];
            return (
              <Pressable
                key={t}
                testID={`tray-${t}`}
                onPress={() => toggleTopping(t)}
                style={({ pressed }) => [
                  styles.trayItem,
                  active && styles.trayItemActive,
                  pressed && { transform: [{ scale: 0.93 }] },
                ]}
              >
                <IngredientIcon id={t} emoji={info?.emoji} size={54} />
                <Text style={styles.trayLabel} numberOfLines={2}>
                  {info?.label || t}
                </Text>
                {active && (
                  <View style={styles.trayCheck}>
                    <Text style={styles.trayCheckText}>✓</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          testID="serve-button"
          onPress={handleServe}
          style={({ pressed }) => [styles.serveBtn, pressed && { transform: [{ scale: 0.96 }] }]}
        >
          <Text style={styles.serveBtnText}>SERVE 🍽</Text>
        </Pressable>
      </View>

      <SparkleBurst trigger={sparkle} />

      {chant && (
        <View style={styles.chantBubble} pointerEvents="none" testID="fan-chant">
          <Text style={styles.chantText}>{chant}</Text>
        </View>
      )}

      {milestone && (
        <View style={styles.milestoneOverlay} pointerEvents="none" testID="milestone-cheer">
          <View style={styles.milestoneCard}>
            <Text style={styles.milestoneEmoji}>🎉</Text>
            <Text style={styles.milestoneText}>{milestone}</Text>
            <Text style={styles.milestoneSub}>Keep it up!</Text>
          </View>
        </View>
      )}

      {jackpot != null && (
        <View style={styles.jackpotOverlay} pointerEvents="none" testID="jackpot-popup">
          <View style={styles.jackpotCard}>
            <View style={styles.jackpotSlots}>
              {[0, 1, 2].map((i) => {
                const team = JACKPOT_TEAMS[(jackpotTeam + i) % 3];
                return (
                  <View key={i} style={styles.jackpotBadge}>
                    <TeamLogo code={team.code} size={44} />
                  </View>
                );
              })}
            </View>
            <Text style={styles.jackpotTitle}>HOT STREAK JACKPOT!</Text>
            <Text style={styles.jackpotAmount}>+{jackpot} 🪙</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceSecondary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surfaceInverse,
  },
  counterBadge: {
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  counterText: { fontWeight: "900", color: colors.onBrand, fontSize: 13 },
  streakBadge: {
    backgroundColor: colors.brandSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  streakText: { fontWeight: "900", color: "#FFFFFF", fontSize: 13 },
  coinChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  coinEmoji: { fontSize: 16 },
  coinText: { fontSize: 15, fontWeight: "900", color: colors.surfaceInverse },
  bellChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  bellText: { fontSize: 15, fontWeight: "900", color: colors.onBrandTertiary },
  customerZone: { alignItems: "center", paddingTop: spacing.md, paddingHorizontal: spacing.lg },
  patienceTrack: {
    width: "70%",
    height: 10,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.pill,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  patienceFill: { height: "100%", borderRadius: radius.pill },
  customerAvatar: { fontSize: 56 },
  avatarWrap: { alignItems: "center", justifyContent: "center" },
  moodBubble: {
    position: "absolute",
    top: -6,
    right: -14,
    fontSize: 26,
  },
  fanBadge: {
    position: "absolute",
    bottom: -6,
    left: -16,
    alignItems: "center",
    justifyContent: "center",
  },
  fanJersey: { fontSize: 26 },
  fanTeam: { position: "absolute", fontSize: 13, top: 5 },
  fanTag: {
    marginTop: spacing.xs,
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderWidth: 2,
    borderColor: colors.surfaceInverse,
  },
  fanTagText: { fontSize: 12, fontWeight: "900", color: colors.onBrand },
  rushBanner: {
    backgroundColor: "#E4002B",
    paddingVertical: spacing.xs,
    alignItems: "center",
  },
  rushText: { fontSize: 14, fontWeight: "900", color: "#FFFFFF", letterSpacing: 0.5 },
  chantBubble: {
    position: "absolute",
    top: "26%",
    alignSelf: "center",
    backgroundColor: "#004C54",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: "#A5ACAF",
    zIndex: 70,
    ...shadow.tier3,
  },
  chantText: { fontSize: 20, fontWeight: "900", color: "#FFFFFF" },
  milestoneOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 60,
  },
  milestoneCard: {
    backgroundColor: colors.success,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxxl,
    borderRadius: radius.lg,
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    ...shadow.tier3,
  },
  milestoneEmoji: { fontSize: 40 },
  milestoneText: { fontSize: 22, fontWeight: "900", color: "#FFFFFF", marginTop: 4 },
  milestoneSub: { fontSize: 13, fontWeight: "700", color: "#FFFFFF", opacity: 0.9, marginTop: 2 },
  ticket: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.sm,
    minWidth: 220,
    ...shadow.tier2,
    borderWidth: 3,
    borderColor: colors.borderStrong,
    borderStyle: "dashed",
  },
  ticketTitle: { fontSize: 18, fontWeight: "900", color: colors.surfaceInverse, textAlign: "center" },
  ticketTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs },
  rivalryTag: {
    alignSelf: "center",
    backgroundColor: "#F0B429",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    marginBottom: spacing.xs,
    borderWidth: 2,
    borderColor: colors.surfaceInverse,
  },
  rivalryText: { fontSize: 12, fontWeight: "900", color: "#5A3E00" },
  specialTag: {
    alignSelf: "center",
    backgroundColor: "#FFF3C4",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    marginBottom: spacing.xs,
    borderWidth: 2,
    borderColor: "#F0B429",
  },
  specialText: { fontSize: 11, fontWeight: "900", color: "#B7791F", letterSpacing: 0.3 },
  vipTag: {
    alignSelf: "center",
    backgroundColor: "#EDE7FF",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    marginBottom: spacing.xs,
    borderWidth: 2,
    borderColor: "#7C5CFF",
  },
  vipText: { fontSize: 11, fontWeight: "900", color: "#5B3FD1", letterSpacing: 0.3 },
  ticketRowSpecial: {
    backgroundColor: "#FFF8E1",
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    marginVertical: 1,
  },
  ticketItemSpecial: { color: "#B7791F", fontWeight: "900" },
  ticketDivider: { height: 2, backgroundColor: colors.divider, marginVertical: spacing.sm },
  ticketRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 3 },
  ticketPlus: { fontSize: 14, fontWeight: "900", color: colors.success, width: 24 },
  ticketNo: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.error,
    width: 24,
  },
  ticketItem: { flex: 1, fontSize: 15, fontWeight: "800", color: colors.surfaceInverse },
  ticketEmoji: { fontSize: 20 },
  feedback: {
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    marginTop: spacing.sm,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  feedbackText: { color: "#FFFFFF", fontWeight: "900", fontSize: 15 },
  comboMeter: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, alignItems: "center", gap: spacing.xs },
  comboSegments: { flexDirection: "row", gap: spacing.xs, width: "100%" },
  comboSeg: {
    flex: 1,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
  },
  comboSegOn: { backgroundColor: colors.brand },
  comboMeterLabel: { fontSize: 11, fontWeight: "800", color: colors.surfaceInverse, opacity: 0.7 },
  plateZone: { alignItems: "center", paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  plateLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.surfaceInverse,
    opacity: 0.5,
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  plate: {
    width: "100%",
    minHeight: 84,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  plateBase: { fontSize: 40 },
  plateHint: { fontSize: 13, color: colors.surfaceInverse, opacity: 0.4, fontWeight: "700" },
  plateItems: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, alignItems: "center" },
  plateChip: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  plateChipEmoji: { fontSize: 22 },
  pantryZone: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  pantryLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.surfaceInverse,
    opacity: 0.55,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  pantryRow: { gap: spacing.sm, paddingRight: spacing.md, paddingVertical: spacing.xs },
  pantryChip: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceInverse,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.brand,
    flexShrink: 0,
  },
  pantryEmoji: { fontSize: 24 },
  pantryCount: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surfaceInverse,
  },
  pantryCountText: { fontSize: 11, fontWeight: "900", color: colors.onBrand },
  jackpotOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  jackpotCard: {
    backgroundColor: colors.brandSecondary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xl,
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 4,
    borderColor: colors.brand,
    ...shadow.tier3,
  },
  jackpotSlots: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.xs },
  jackpotBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  jackpotBadgeIcon: { fontSize: 24 },
  jackpotBadgeImg: { width: 32, height: 32 },
  jackpotTitle: { fontSize: 18, fontWeight: "900", color: "#FFFFFF", letterSpacing: 1 },
  jackpotAmount: { fontSize: 30, fontWeight: "900", color: colors.brand },
  tray: {
    marginTop: "auto",
    backgroundColor: colors.surface,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    ...shadow.tier2,
  },
  trayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "center",
    paddingBottom: spacing.md,
  },
  trayItem: {
    width: 104,
    height: 104,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.10)",
    paddingHorizontal: 4,
    gap: 4,
  },
  trayItemActive: { borderColor: colors.brand, borderWidth: 3, transform: [{ scale: 1.06 }] },
  trayEmoji: { fontSize: 26 },
  trayLabel: { fontSize: 11, fontWeight: "900", color: colors.surfaceInverse, textAlign: "center" },
  trayCheck: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  trayCheckText: { color: "#FFFFFF", fontWeight: "900", fontSize: 12 },
  serveBtn: {
    backgroundColor: colors.brandSecondary,
    paddingVertical: spacing.lg,
    borderRadius: radius.pill,
    alignItems: "center",
    ...shadow.tier2,
    borderWidth: 3,
    borderColor: colors.surfaceInverse,
  },
  serveBtnText: { fontSize: 20, fontWeight: "900", color: colors.onBrandSecondary, letterSpacing: 2 },
});
