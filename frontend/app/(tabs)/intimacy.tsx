import dayjs from "dayjs";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  fileUrl,
  uploadPhoto,
  useCreateIntimacy,
  useDeleteIntimacy,
  useIntimacy,
  useIntimacySettings,
  useIntimacyStats,
  useSaveIntimacySettings,
  useUpdateIntimacy,
  type IntimacyEntry,
  type IntimacyInput,
  type IntimacySettings,
  type PartnerOption,
} from "@/src/api";
import { Icon, PrimaryButton, TextField } from "@/src/components/ui";
import { prettyDate, shortDate, todayStr } from "@/src/date-utils";
import { fonts, makeStyles, useTheme } from "@/src/theme";
import { useUser } from "@/src/user-context";
import { storage } from "@/src/utils/storage";

const PIN_KEY = "aura.intimacy.pin";
const ICON_CHOICES = ["❤️", "🔥", "💦", "🌙", "⭐", "😈", "🥵", "💫", "🍑", "🌹", "💋", "✨"];

type Segment = "calendar" | "log" | "stats";

function emptyInput(): IntimacyInput {
  return {
    date: todayStr(),
    partner: "",
    duration: "",
    type: [],
    place: "",
    position: "",
    orgasms: 0,
    partnerOrgasms: 0,
    icon: "❤️",
    notes: "",
  };
}

export default function IntimacyScreen() {
  const [unlocked, setUnlocked] = useState(false);

  // Require the PIN again any time this screen is not active — whether the user
  // switches tabs or sends the app to the background.
  useFocusEffect(
    useCallback(() => {
      const sub = AppState.addEventListener("change", (state) => {
        if (state !== "active") setUnlocked(false);
      });
      return () => {
        sub.remove();
        setUnlocked(false);
      };
    }, []),
  );

  if (!unlocked) return <PinGate onUnlock={() => setUnlocked(true)} />;
  return <Tracker onLock={() => setUnlocked(false)} />;
}

// --------------------------------------------------------------------------
// PIN lock
// --------------------------------------------------------------------------
function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [stored, setStored] = useState<string | null | undefined>(undefined);
  const [stage, setStage] = useState<"len" | "enter" | "confirm" | "unlock">("len");
  const [len, setLen] = useState(4);
  const [first, setFirst] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const pin = await storage.secureGet<string>(PIN_KEY, "");
      if (pin) {
        setStored(pin);
        setLen(pin.length);
        setStage("unlock");
      } else {
        setStored(null);
        setStage("len");
      }
    })();
  }, []);

  const onDigit = (d: string) => {
    if (value.length >= len) return;
    Haptics.selectionAsync().catch(() => {});
    const next = value + d;
    setValue(next);
    setError("");
    if (next.length === len) setTimeout(() => complete(next), 120);
  };

  const onBack = () => {
    setValue((v) => v.slice(0, -1));
    setError("");
  };

  const complete = async (pin: string) => {
    if (stage === "unlock") {
      if (pin === stored) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        onUnlock();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        setError("Incorrect PIN. Try again.");
        setValue("");
      }
      return;
    }
    if (stage === "enter") {
      setFirst(pin);
      setValue("");
      setStage("confirm");
      return;
    }
    if (stage === "confirm") {
      if (pin === first) {
        await storage.secureSet(PIN_KEY, pin);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        onUnlock();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        setError("PINs did not match. Start over.");
        setFirst("");
        setValue("");
        setStage("enter");
      }
    }
  };

  if (stored === undefined) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  const title =
    stage === "unlock"
      ? "Enter your PIN"
      : stage === "len"
        ? "Set up a PIN"
        : stage === "enter"
          ? "Create your PIN"
          : "Confirm your PIN";

  const subtitle =
    stage === "unlock"
      ? "This space is private and PIN-protected."
      : stage === "len"
        ? "Choose how many digits your PIN should have."
        : stage === "enter"
          ? `Enter a ${len}-digit PIN you'll remember.`
          : "Re-enter the same PIN to confirm.";

  return (
    <View style={[styles.root, { paddingTop: insets.top + 40 }]}>
      <View style={styles.lockIconWrap}>
        <Icon name="lock" size={30} color={colors.brand} />
      </View>
      <Text style={styles.gateTitle}>{title}</Text>
      <Text style={styles.gateSub}>{subtitle}</Text>

      {stage === "len" ? (
        <View style={styles.lenRow}>
          {[4, 6, 8].map((n) => (
            <Pressable
              key={n}
              testID={`pin-len-${n}`}
              style={[styles.lenBtn, len === n && styles.lenBtnActive]}
              onPress={() => {
                setLen(n);
                Haptics.selectionAsync().catch(() => {});
              }}
            >
              <Text style={[styles.lenText, len === n && styles.lenTextActive]}>{n}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.dotsRow}>
          {Array.from({ length: len }).map((_, i) => (
            <View key={i} style={[styles.dot, i < value.length && styles.dotFilled]} />
          ))}
        </View>
      )}

      {error ? <Text style={styles.gateError}>{error}</Text> : <View style={{ height: 20 }} />}

      {stage === "len" ? (
        <View style={{ width: "100%", maxWidth: 320, marginTop: 8 }}>
          <PrimaryButton
            label="Continue"
            icon="arrow-right"
            testID="pin-len-continue"
            onPress={() => {
              setValue("");
              setStage("enter");
            }}
          />
        </View>
      ) : (
        <Keypad onDigit={onDigit} onBack={onBack} />
      )}
    </View>
  );
}

function Keypad({ onDigit, onBack }: { onDigit: (d: string) => void; onBack: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];
  return (
    <View style={styles.keypad}>
      {keys.map((k, i) => {
        if (k === "") return <View key={i} style={styles.key} />;
        if (k === "back") {
          return (
            <Pressable key={i} style={styles.key} onPress={onBack} testID="pin-back" hitSlop={4}>
              <Icon name="delete" size={24} color={colors.onSurface} />
            </Pressable>
          );
        }
        return (
          <Pressable
            key={i}
            style={({ pressed }) => [styles.key, styles.keyNum, pressed && styles.keyPressed]}
            onPress={() => onDigit(k)}
            testID={`pin-key-${k}`}
          >
            <Text style={styles.keyText}>{k}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// --------------------------------------------------------------------------
// Tracker
// --------------------------------------------------------------------------
function Tracker({ onLock }: { onLock: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { userId } = useUser();

  const { data, isLoading } = useIntimacy(userId);
  const { data: stats } = useIntimacyStats(userId);
  const { data: settings } = useIntimacySettings(userId);
  const createM = useCreateIntimacy(userId);
  const updateM = useUpdateIntimacy(userId);
  const deleteM = useDeleteIntimacy(userId);

  const [segment, setSegment] = useState<Segment>("calendar");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<IntimacyEntry | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const entries = data?.entries ?? [];
  const partners = settings?.partners ?? [];
  const photoFor = (name: string) => partners.find((p) => p.name === name)?.photo ?? "";

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (e: IntimacyEntry) => {
    setEditing(e);
    setFormOpen(true);
  };

  const save = (input: IntimacyInput) => {
    if (editing) {
      updateM.mutate({ id: editing.id, input }, { onSuccess: () => setFormOpen(false) });
    } else {
      createM.mutate(input, { onSuccess: () => setFormOpen(false) });
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View>
          <Text style={styles.headerTitle}>Private</Text>
          <Text style={styles.headerSub}>Your intimacy log</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={() => setSettingsOpen(true)} style={styles.iconBtn} hitSlop={8} testID="intimacy-settings-btn">
            <Icon name="sliders" size={20} color={colors.onSurface} />
          </Pressable>
          <Pressable onPress={onLock} style={styles.iconBtn} hitSlop={8} testID="intimacy-lock-btn">
            <Icon name="lock" size={20} color={colors.onSurface} />
          </Pressable>
          <Pressable onPress={openAdd} style={styles.addBtn} hitSlop={8} testID="intimacy-add-btn">
            <Icon name="plus" size={22} color={colors.onBrandPrimary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.segmentRow}>
        {(["calendar", "log", "stats"] as Segment[]).map((s) => (
          <Pressable
            key={s}
            testID={`segment-${s}`}
            style={[styles.segment, segment === s && styles.segmentActive]}
            onPress={() => setSegment(s)}
          >
            <Text style={[styles.segmentText, segment === s && styles.segmentTextActive]}>
              {s === "calendar" ? "Calendar" : s === "log" ? "Log" : "Stats"}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40, gap: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {segment === "calendar" ? (
            <CalendarView entries={entries} userId={userId} photoFor={photoFor} onEdit={openEdit} onDelete={(id) => deleteM.mutate(id)} onAdd={openAdd} />
          ) : segment === "log" ? (
            <LogView entries={entries} userId={userId} photoFor={photoFor} onEdit={openEdit} onDelete={(id) => deleteM.mutate(id)} onAdd={openAdd} />
          ) : (
            <StatsView stats={stats} userId={userId} photoFor={photoFor} />
          )}
        </ScrollView>
      )}

      {formOpen ? (
        <EntryForm
          initial={editing ?? emptyInput()}
          settings={settings}
          userId={userId}
          saving={createM.isPending || updateM.isPending}
          isEdit={!!editing}
          onManage={() => {
            setFormOpen(false);
            setSettingsOpen(true);
          }}
          onSave={save}
          onCancel={() => setFormOpen(false)}
        />
      ) : null}

      {settingsOpen ? (
        <SettingsModal
          settings={settings}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
    </View>
  );
}

// --------------------------------------------------------------------------
// Calendar segment
// --------------------------------------------------------------------------
function CalendarView({
  entries,
  userId,
  photoFor,
  onEdit,
  onDelete,
  onAdd,
}: {
  entries: IntimacyEntry[];
  userId: string | null;
  photoFor: (name: string) => string;
  onEdit: (e: IntimacyEntry) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [month, setMonth] = useState(() => dayjs().startOf("month"));
  const [selected, setSelected] = useState(todayStr());

  const byDate = useMemo(() => {
    const map: Record<string, IntimacyEntry[]> = {};
    for (const e of entries) (map[e.date] = map[e.date] || []).push(e);
    return map;
  }, [entries]);

  const cells = useMemo(() => {
    const start = month.startOf("month");
    const lead = start.day();
    const total = month.daysInMonth();
    const arr: (string | null)[] = [];
    for (let i = 0; i < lead; i++) arr.push(null);
    for (let d = 1; d <= total; d++) arr.push(start.date(d).format("YYYY-MM-DD"));
    return arr;
  }, [month]);

  const dayEntries = byDate[selected] ?? [];

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.calCard}>
        <View style={styles.pickerHead}>
          <Pressable onPress={() => setMonth((m) => m.subtract(1, "month"))} hitSlop={8} testID="cal-prev">
            <Icon name="chevron-left" size={22} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.pickerMonth}>{month.format("MMMM YYYY")}</Text>
          <Pressable
            onPress={() => setMonth((m) => m.add(1, "month"))}
            hitSlop={8}
            testID="cal-next"
            disabled={month.endOf("month").isAfter(dayjs())}
          >
            <Icon
              name="chevron-right"
              size={22}
              color={month.endOf("month").isAfter(dayjs()) ? colors.border : colors.onSurface}
            />
          </Pressable>
        </View>
        <View style={styles.dowRow}>
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <Text key={i} style={styles.dow}>{d}</Text>
          ))}
        </View>
        <View style={styles.grid}>
          {cells.map((c, i) => {
            if (!c) return <View key={i} style={styles.dayCell} />;
            const list = byDate[c];
            const isFuture = dayjs(c).isAfter(dayjs());
            const isSel = c === selected;
            return (
              <Pressable
                key={i}
                style={styles.dayCell}
                disabled={isFuture}
                onPress={() => setSelected(c)}
                testID={`cal-day-${c}`}
              >
                <View style={[styles.dayInner, isSel && styles.daySelected]}>
                  {list?.length ? (
                    <Text style={styles.dayIcon}>{list[0].icon || "❤️"}</Text>
                  ) : (
                    <Text style={[styles.dayNum, isSel && { color: colors.onBrandPrimary }, isFuture && { color: colors.border }]}>
                      {dayjs(c).date()}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Text style={styles.sectionLabel}>{prettyDate(selected)}</Text>
      {dayEntries.length === 0 ? (
        <Pressable style={styles.emptyDay} onPress={onAdd} testID="cal-empty-add">
          <Icon name="plus-circle" size={20} color={colors.brand} />
          <Text style={styles.emptyDayText}>No entry for this day. Tap to add one.</Text>
        </Pressable>
      ) : (
        dayEntries.map((e) => (
          <EntryCard key={e.id} e={e} userId={userId} photo={photoFor(e.partner)} onEdit={onEdit} onDelete={onDelete} />
        ))
      )}
    </View>
  );
}

// --------------------------------------------------------------------------
// Log segment
// --------------------------------------------------------------------------
function LogView({
  entries,
  userId,
  photoFor,
  onEdit,
  onDelete,
  onAdd,
}: {
  entries: IntimacyEntry[];
  userId: string | null;
  photoFor: (name: string) => string;
  onEdit: (e: IntimacyEntry) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();

  if (entries.length === 0) {
    return (
      <View style={styles.center}>
        <View style={styles.emptyIcon}>
          <Icon name="heart" size={30} color={colors.brand} />
        </View>
        <Text style={styles.emptyTitle}>Nothing logged yet</Text>
        <Text style={styles.emptyText}>Add your first entry to start tracking privately.</Text>
        <View style={{ marginTop: 8 }}>
          <PrimaryButton label="Add an entry" icon="plus" onPress={onAdd} testID="log-empty-add" />
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {entries.map((e) => (
        <EntryCard key={e.id} e={e} userId={userId} photo={photoFor(e.partner)} onEdit={onEdit} onDelete={onDelete} showDate />
      ))}
    </View>
  );
}

function EntryCard({
  e,
  userId,
  photo,
  onEdit,
  onDelete,
  showDate,
}: {
  e: IntimacyEntry;
  userId: string | null;
  photo?: string;
  onEdit: (e: IntimacyEntry) => void;
  onDelete: (id: string) => void;
  showDate?: boolean;
}) {
  const styles = useStyles();
  const { colors } = useTheme();

  const chips: string[] = [];
  for (const t of e.type ?? []) chips.push(t);
  if (e.place) chips.push(e.place);
  if (e.position) chips.push(e.position);
  if (e.duration) chips.push(e.duration);

  return (
    <View style={styles.entryCard}>
      <View style={styles.entryTop}>
        {photo && userId ? (
          <Image source={{ uri: fileUrl(photo, userId) }} style={styles.entryAvatar} contentFit="cover" transition={150} />
        ) : (
          <Text style={styles.entryIcon}>{e.icon || "❤️"}</Text>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.entryPartner}>{e.partner || "Unspecified"}</Text>
          {showDate ? <Text style={styles.entryDate}>{shortDate(e.date)}</Text> : null}
        </View>
        {photo && userId ? <Text style={styles.entryIconSmall}>{e.icon || "❤️"}</Text> : null}
        <Pressable onPress={() => onEdit(e)} hitSlop={8} style={styles.entryAction} testID={`entry-edit-${e.id}`}>
          <Icon name="edit-2" size={17} color={colors.muted} />
        </Pressable>
        <Pressable onPress={() => onDelete(e.id)} hitSlop={8} style={styles.entryAction} testID={`entry-delete-${e.id}`}>
          <Icon name="trash-2" size={17} color={colors.muted} />
        </Pressable>
      </View>

      {chips.length ? (
        <View style={styles.chipWrap}>
          {chips.map((c, i) => (
            <View key={i} style={styles.tag}>
              <Text style={styles.tagText}>{c}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {(e.orgasms > 0 || e.partnerOrgasms > 0) ? (
        <View style={styles.oRow}>
          <Text style={styles.oText}>You: {e.orgasms}</Text>
          <Text style={styles.oDot}>·</Text>
          <Text style={styles.oText}>Partner: {e.partnerOrgasms}</Text>
        </View>
      ) : null}

      {e.notes ? <Text style={styles.entryNotes}>{e.notes}</Text> : null}
    </View>
  );
}

// --------------------------------------------------------------------------
// Stats segment
// --------------------------------------------------------------------------
function StatsView({
  stats,
  userId,
  photoFor,
}: {
  stats?: import("@/src/api").IntimacyStats;
  userId: string | null;
  photoFor: (name: string) => string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();

  if (!stats || stats.totalActivity === 0) {
    return (
      <View style={styles.center}>
        <View style={styles.emptyIcon}>
          <Icon name="bar-chart-2" size={30} color={colors.brand} />
        </View>
        <Text style={styles.emptyTitle}>No stats yet</Text>
        <Text style={styles.emptyText}>Log a few entries and your stats will appear here.</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.statGrid}>
        <StatCard label="Total activity" value={stats.totalActivity} />
        <StatCard label="Partners" value={stats.partnerCount} />
        <StatCard label="Your orgasms" value={stats.totalOrgasms} />
        <StatCard label="Partner orgasms" value={stats.totalPartnerOrgasms} />
      </View>

      <Text style={styles.sectionLabel}>By partner</Text>
      {stats.byPartner.map((p) => {
        const photo = photoFor(p.partner);
        return (
          <View key={p.partner} style={styles.partnerCard}>
            <View style={styles.partnerHead}>
              {photo && userId ? (
                <Image source={{ uri: fileUrl(photo, userId) }} style={styles.partnerAvatar} contentFit="cover" transition={150} />
              ) : (
                <View style={styles.partnerAvatar}>
                  <Icon name="user" size={18} color={colors.brand} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.partnerName}>{p.partner}</Text>
                <Text style={styles.partnerMeta}>
                  {p.count} {p.count === 1 ? "time" : "times"}
                  {p.lastDate ? ` · last ${shortDate(p.lastDate)}` : ""}
                </Text>
              </View>
            </View>
            <View style={styles.partnerStats}>
              <Text style={styles.partnerStat}>You: {p.orgasms}</Text>
              <Text style={styles.oDot}>·</Text>
              <Text style={styles.partnerStat}>Partner: {p.partnerOrgasms}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  const styles = useStyles();
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// --------------------------------------------------------------------------
// Entry form
// --------------------------------------------------------------------------
function EntryForm({
  initial,
  settings,
  userId,
  saving,
  isEdit,
  onSave,
  onCancel,
  onManage,
}: {
  initial: IntimacyInput | IntimacyEntry;
  settings?: IntimacySettings;
  userId: string | null;
  saving: boolean;
  isEdit: boolean;
  onSave: (input: IntimacyInput) => void;
  onCancel: () => void;
  onManage: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState<IntimacyInput>({
    date: initial.date,
    partner: initial.partner,
    duration: initial.duration,
    type: initial.type,
    place: initial.place,
    position: initial.position,
    orgasms: initial.orgasms,
    partnerOrgasms: initial.partnerOrgasms,
    icon: initial.icon || "❤️",
    notes: initial.notes,
  });
  const [pickerOpen, setPickerOpen] = useState(false);

  const set = <K extends keyof IntimacyInput>(k: K, v: IntimacyInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.sheetBackdrop}>
        <View style={[styles.sheet, { maxHeight: "92%", paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{isEdit ? "Edit entry" : "New entry"}</Text>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 8 }}>
            <Text style={styles.fieldLabel}>Date</Text>
            <Pressable onPress={() => setPickerOpen(true)} style={styles.dateRow} testID="entry-date">
              <Icon name="calendar" size={18} color={colors.onSurface} />
              <Text style={styles.dateText}>{prettyDate(form.date)}</Text>
              <Icon name="chevron-down" size={18} color={colors.muted} />
            </Pressable>

            <Text style={styles.fieldLabel}>Icon</Text>
            <View style={styles.iconGrid}>
              {ICON_CHOICES.map((ic) => (
                <Pressable
                  key={ic}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    set("icon", ic);
                  }}
                  style={[styles.iconChoice, form.icon === ic && styles.iconChoiceActive]}
                  testID={`icon-${ic}`}
                >
                  <Text style={{ fontSize: 22 }}>{ic}</Text>
                </Pressable>
              ))}
            </View>

            <PartnerDropdown label="Partner" value={form.partner} partners={settings?.partners ?? []} userId={userId} onChange={(v) => set("partner", v)} onManage={onManage} />
            <MultiSelect label="Type" values={form.type} options={settings?.types ?? []} onChange={(v) => set("type", v)} onManage={onManage} />
            <Dropdown label="Place" value={form.place} options={settings?.places ?? []} onChange={(v) => set("place", v)} onManage={onManage} />
            <Dropdown label="Position" value={form.position} options={settings?.positions ?? []} onChange={(v) => set("position", v)} onManage={onManage} />

            <Text style={styles.fieldLabel}>Duration</Text>
            <TextField
              testID="entry-duration"
              value={form.duration}
              onChangeText={(v) => set("duration", v)}
              placeholder="e.g. 30 min"
            />

            <Stepper label="Your orgasms" value={form.orgasms} onChange={(v) => set("orgasms", v)} testID="entry-orgasms" />
            <Stepper label="Partner's orgasms" value={form.partnerOrgasms} onChange={(v) => set("partnerOrgasms", v)} testID="entry-partner-orgasms" />

            <Text style={styles.fieldLabel}>Notes</Text>
            <TextField
              testID="entry-notes"
              value={form.notes}
              onChangeText={(v) => set("notes", v)}
              placeholder="Anything you'd like to remember..."
              multiline
            />
          </ScrollView>

          <View style={{ gap: 10, marginTop: 8 }}>
            <PrimaryButton
              label={isEdit ? "Save changes" : "Save entry"}
              icon="check"
              onPress={() => onSave(form)}
              loading={saving}
              testID="entry-save"
            />
            <Pressable onPress={onCancel} style={styles.cancelBtn} testID="entry-cancel">
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <MonthPicker
        visible={pickerOpen}
        value={form.date}
        onClose={() => setPickerOpen(false)}
        onSelect={(d) => {
          set("date", d);
          setPickerOpen(false);
        }}
      />
    </Modal>
  );
}

function Dropdown({
  label,
  value,
  options,
  onChange,
  onManage,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  onManage: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable style={styles.dateRow} onPress={() => setOpen(true)} testID={`dropdown-${label}`}>
        <Text style={[styles.dateText, !value && { color: colors.muted }]}>
          {value || `Select ${label.toLowerCase()}`}
        </Text>
        <Icon name="chevron-down" size={18} color={colors.muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.pickerBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.optionCard} onPress={() => {}}>
            <Text style={styles.optionTitle}>{label}</Text>
            {options.length === 0 ? (
              <Text style={styles.optionEmpty}>No options yet. Add them in settings.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 300 }}>
                {options.map((o) => (
                  <Pressable
                    key={o}
                    style={styles.optionRow}
                    onPress={() => {
                      onChange(o);
                      setOpen(false);
                    }}
                    testID={`option-${o}`}
                  >
                    <Text style={styles.optionText}>{o}</Text>
                    {value === o ? <Icon name="check" size={18} color={colors.brand} /> : null}
                  </Pressable>
                ))}
              </ScrollView>
            )}
            <View style={styles.optionFooter}>
              {value ? (
                <Pressable
                  onPress={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  testID={`option-clear-${label}`}
                >
                  <Text style={styles.optionClear}>Clear</Text>
                </Pressable>
              ) : <View />}
              <Pressable
                onPress={() => {
                  setOpen(false);
                  onManage();
                }}
                testID={`option-manage-${label}`}
              >
                <Text style={styles.optionManage}>Manage options</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function MultiSelect({
  label,
  values,
  options,
  onChange,
  onManage,
}: {
  label: string;
  values: string[];
  options: string[];
  onChange: (v: string[]) => void;
  onManage: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const toggle = (o: string) => {
    Haptics.selectionAsync().catch(() => {});
    onChange(values.includes(o) ? values.filter((x) => x !== o) : [...values, o]);
  };

  return (
    <>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable style={styles.dateRow} onPress={() => setOpen(true)} testID={`dropdown-${label}`}>
        <Text style={[styles.dateText, values.length === 0 && { color: colors.muted }]}>
          {values.length ? values.join(", ") : `Select ${label.toLowerCase()}`}
        </Text>
        <Icon name="chevron-down" size={18} color={colors.muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.pickerBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.optionCard} onPress={() => {}}>
            <Text style={styles.optionTitle}>{label}</Text>
            <Text style={styles.optionSub}>Select all that apply</Text>
            {options.length === 0 ? (
              <Text style={styles.optionEmpty}>No options yet. Add them in settings.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 300 }}>
                {options.map((o) => {
                  const on = values.includes(o);
                  return (
                    <Pressable key={o} style={styles.optionRow} onPress={() => toggle(o)} testID={`option-${o}`}>
                      <Text style={styles.optionText}>{o}</Text>
                      <View style={[styles.checkBox, on && styles.checkBoxOn]}>
                        {on ? <Icon name="check" size={14} color={colors.onBrandPrimary} /> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
            <View style={styles.optionFooter}>
              {values.length ? (
                <Pressable onPress={() => onChange([])} testID={`option-clear-${label}`}>
                  <Text style={styles.optionClear}>Clear</Text>
                </Pressable>
              ) : <View />}
              <View style={{ flexDirection: "row", gap: 18 }}>
                <Pressable onPress={() => { setOpen(false); onManage(); }} testID={`option-manage-${label}`}>
                  <Text style={styles.optionManage}>Manage</Text>
                </Pressable>
                <Pressable onPress={() => setOpen(false)} testID={`option-done-${label}`}>
                  <Text style={styles.optionManage}>Done</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function PartnerDropdown({
  label,
  value,
  partners,
  userId,
  onChange,
  onManage,
}: {
  label: string;
  value: string;
  partners: PartnerOption[];
  userId: string | null;
  onChange: (v: string) => void;
  onManage: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = partners.find((p) => p.name === value);

  return (
    <>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable style={styles.dateRow} onPress={() => setOpen(true)} testID={`dropdown-${label}`}>
        {selected?.photo && userId ? (
          <Image source={{ uri: fileUrl(selected.photo, userId) }} style={styles.miniAvatar} contentFit="cover" />
        ) : null}
        <Text style={[styles.dateText, !value && { color: colors.muted }]}>
          {value || `Select ${label.toLowerCase()}`}
        </Text>
        <Icon name="chevron-down" size={18} color={colors.muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.pickerBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.optionCard} onPress={() => {}}>
            <Text style={styles.optionTitle}>{label}</Text>
            {partners.length === 0 ? (
              <Text style={styles.optionEmpty}>No partners yet. Add them in settings.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 320 }}>
                {partners.map((p) => (
                  <Pressable
                    key={p.name}
                    style={styles.optionRow}
                    onPress={() => { onChange(p.name); setOpen(false); }}
                    testID={`option-${p.name}`}
                  >
                    <View style={styles.partnerRow}>
                      {p.photo && userId ? (
                        <Image source={{ uri: fileUrl(p.photo, userId) }} style={styles.miniAvatar} contentFit="cover" />
                      ) : (
                        <View style={styles.miniAvatarBlank}>
                          <Icon name="user" size={15} color={colors.brand} />
                        </View>
                      )}
                      <Text style={styles.optionText}>{p.name}</Text>
                    </View>
                    {value === p.name ? <Icon name="check" size={18} color={colors.brand} /> : null}
                  </Pressable>
                ))}
              </ScrollView>
            )}
            <View style={styles.optionFooter}>
              {value ? (
                <Pressable onPress={() => { onChange(""); setOpen(false); }} testID={`option-clear-${label}`}>
                  <Text style={styles.optionClear}>Clear</Text>
                </Pressable>
              ) : <View />}
              <Pressable onPress={() => { setOpen(false); onManage(); }} testID={`option-manage-${label}`}>
                <Text style={styles.optionManage}>Manage partners</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function Stepper({
  label,
  value,
  onChange,
  testID,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  testID?: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.stepperRow} testID={testID}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <Pressable
          style={styles.stepBtn}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            onChange(Math.max(0, value - 1));
          }}
          testID={`${testID}-minus`}
        >
          <Icon name="minus" size={18} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.stepValue}>{value}</Text>
        <Pressable
          style={styles.stepBtn}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            onChange(value + 1);
          }}
          testID={`${testID}-plus`}
        >
          <Icon name="plus" size={18} color={colors.onSurface} />
        </Pressable>
      </View>
    </View>
  );
}

// --------------------------------------------------------------------------
// Settings modal (manage dropdown options)
// --------------------------------------------------------------------------
function SettingsModal({
  settings,
  onClose,
}: {
  settings?: IntimacySettings;
  onClose: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { userId } = useUser();
  const saveM = useSaveIntimacySettings(userId);

  const [partners, setPartners] = useState<PartnerOption[]>(settings?.partners ?? []);
  const [types, setTypes] = useState<string[]>(settings?.types ?? []);
  const [places, setPlaces] = useState<string[]>(settings?.places ?? []);
  const [positions, setPositions] = useState<string[]>(settings?.positions ?? []);

  const strGroups: { label: string; values: string[]; set: (v: string[]) => void }[] = [
    { label: "Types", values: types, set: setTypes },
    { label: "Places", values: places, set: setPlaces },
    { label: "Positions", values: positions, set: setPositions },
  ];

  const addStr = (values: string[], set: (v: string[]) => void, val: string) => {
    const t = val.trim();
    if (!t || values.some((x) => x.toLowerCase() === t.toLowerCase())) return;
    set([...values, t]);
  };
  const removeStr = (values: string[], set: (v: string[]) => void, val: string) =>
    set(values.filter((x) => x !== val));

  const save = () =>
    saveM.mutate({ partners, types, places, positions }, { onSuccess: onClose });

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <View style={[styles.sheet, { maxHeight: "92%", paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Field options</Text>
          <Text style={styles.settingsSub}>These appear as dropdown choices when you log an entry.</Text>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 18, paddingBottom: 8 }}>
            <PartnerGroup partners={partners} userId={userId} onChange={setPartners} />
            {strGroups.map((g) => (
              <OptionGroup
                key={g.label}
                label={g.label}
                values={g.values}
                onAdd={(v) => addStr(g.values, g.set, v)}
                onRemove={(v) => removeStr(g.values, g.set, v)}
              />
            ))}
          </ScrollView>

          <View style={{ gap: 10, marginTop: 8 }}>
            <PrimaryButton label="Save options" icon="check" onPress={save} loading={saveM.isPending} testID="settings-save" />
            <Pressable onPress={onClose} style={styles.cancelBtn} testID="settings-cancel">
              <Text style={[styles.cancelText, { color: colors.muted }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PartnerGroup({
  partners,
  userId,
  onChange,
}: {
  partners: PartnerOption[];
  userId: string | null;
  onChange: (p: PartnerOption[]) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);

  const add = () => {
    const t = text.trim();
    if (!t) return;
    if (!partners.some((p) => p.name.toLowerCase() === t.toLowerCase())) {
      onChange([...partners, { name: t, photo: "" }]);
    }
    setText("");
  };
  const remove = (name: string) => onChange(partners.filter((p) => p.name !== name));
  const setPhoto = (name: string, photo: string) =>
    onChange(partners.map((p) => (p.name === name ? { ...p, photo } : p)));

  const pickPhoto = async (name: string, fromCamera: boolean) => {
    setBlocked(false);
    const getPerm = fromCamera ? ImagePicker.getCameraPermissionsAsync : ImagePicker.getMediaLibraryPermissionsAsync;
    const reqPerm = fromCamera ? ImagePicker.requestCameraPermissionsAsync : ImagePicker.requestMediaLibraryPermissionsAsync;
    const perm = await getPerm();
    let status = perm;
    if (!perm.granted && perm.canAskAgain) status = await reqPerm();
    if (!status.granted) {
      if (!status.canAskAgain) setBlocked(true);
      return;
    }
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.6 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6 });
    if (res.canceled || !res.assets?.[0] || !userId) return;
    const a = res.assets[0];
    setBusy(name);
    try {
      const { path } = await uploadPhoto(userId, { uri: a.uri, fileName: a.fileName, mimeType: a.mimeType });
      setPhoto(name, path);
    } catch {
      // silent; user can retry
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.fieldLabel}>Partners</Text>
      {partners.length === 0 ? <Text style={styles.optionEmpty}>None yet</Text> : null}
      {partners.map((p) => (
        <View key={p.name} style={styles.partnerEditRow}>
          {busy === p.name ? (
            <View style={styles.miniAvatarBlank}>
              <ActivityIndicator size="small" color={colors.brand} />
            </View>
          ) : p.photo && userId ? (
            <Image source={{ uri: fileUrl(p.photo, userId) }} style={styles.miniAvatar} contentFit="cover" transition={150} />
          ) : (
            <View style={styles.miniAvatarBlank}>
              <Icon name="user" size={16} color={colors.brand} />
            </View>
          )}
          <Text style={[styles.optionText, { flex: 1 }]}>{p.name}</Text>
          <Pressable onPress={() => pickPhoto(p.name, false)} hitSlop={6} style={styles.partnerPhotoBtn} testID={`partner-photo-${p.name}`}>
            <Icon name="image" size={17} color={colors.onSurface} />
          </Pressable>
          <Pressable onPress={() => pickPhoto(p.name, true)} hitSlop={6} style={styles.partnerPhotoBtn} testID={`partner-camera-${p.name}`}>
            <Icon name="camera" size={17} color={colors.onSurface} />
          </Pressable>
          <Pressable onPress={() => remove(p.name)} hitSlop={6} style={styles.partnerPhotoBtn} testID={`partner-remove-${p.name}`}>
            <Icon name="x" size={17} color={colors.muted} />
          </Pressable>
        </View>
      ))}
      {blocked ? (
        <Pressable onPress={() => Linking.openSettings()} testID="partner-open-settings">
          <Text style={styles.blockedText}>Photo access is off. Tap to open Settings.</Text>
        </Pressable>
      ) : null}
      <View style={styles.addRow}>
        <TextField
          value={text}
          onChangeText={setText}
          placeholder="Add partner..."
          style={{ flex: 1 }}
          testID="add-input-Partners"
          onSubmitEditing={add}
        />
        <Pressable style={styles.addTagBtn} onPress={add} testID="add-btn-Partners">
          <Icon name="plus" size={20} color={colors.onBrandPrimary} />
        </Pressable>
      </View>
      <Text style={styles.hintText}>Add a partner, then tap the image or camera icon to attach a picture.</Text>
    </View>
  );
}

function OptionGroup({
  label,
  values,
  onAdd,
  onRemove,
}: {
  label: string;
  values: string[];
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [text, setText] = useState("");
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.chipWrap}>
        {values.length === 0 ? <Text style={styles.optionEmpty}>None yet</Text> : null}
        {values.map((v) => (
          <View key={v} style={styles.editTag}>
            <Text style={styles.tagText}>{v}</Text>
            <Pressable onPress={() => onRemove(v)} hitSlop={6} testID={`remove-${label}-${v}`}>
              <Icon name="x" size={14} color={colors.muted} />
            </Pressable>
          </View>
        ))}
      </View>
      <View style={styles.addRow}>
        <TextField
          value={text}
          onChangeText={setText}
          placeholder={`Add ${label.toLowerCase().replace(/s$/, "")}...`}
          style={{ flex: 1 }}
          testID={`add-input-${label}`}
          onSubmitEditing={() => {
            onAdd(text);
            setText("");
          }}
        />
        <Pressable
          style={styles.addTagBtn}
          onPress={() => {
            onAdd(text);
            setText("");
          }}
          testID={`add-btn-${label}`}
        >
          <Icon name="plus" size={20} color={colors.onBrandPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

// --------------------------------------------------------------------------
// Shared month picker
// --------------------------------------------------------------------------
function MonthPicker({
  visible,
  value,
  onClose,
  onSelect,
}: {
  visible: boolean;
  value: string;
  onClose: () => void;
  onSelect: (d: string) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [month, setMonth] = useState(() => dayjs(value).startOf("month"));

  const cells = useMemo(() => {
    const start = month.startOf("month");
    const lead = start.day();
    const total = month.daysInMonth();
    const arr: (string | null)[] = [];
    for (let i = 0; i < lead; i++) arr.push(null);
    for (let d = 1; d <= total; d++) arr.push(start.date(d).format("YYYY-MM-DD"));
    return arr;
  }, [month]);

  const today = todayStr();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.pickerBackdrop} onPress={onClose}>
        <Pressable style={styles.pickerCard} onPress={() => {}}>
          <View style={styles.pickerHead}>
            <Pressable onPress={() => setMonth((m) => m.subtract(1, "month"))} hitSlop={8}>
              <Icon name="chevron-left" size={22} color={colors.onSurface} />
            </Pressable>
            <Text style={styles.pickerMonth}>{month.format("MMMM YYYY")}</Text>
            <Pressable
              onPress={() => setMonth((m) => m.add(1, "month"))}
              hitSlop={8}
              disabled={month.endOf("month").isAfter(dayjs())}
            >
              <Icon
                name="chevron-right"
                size={22}
                color={month.endOf("month").isAfter(dayjs()) ? colors.border : colors.onSurface}
              />
            </Pressable>
          </View>
          <View style={styles.dowRow}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <Text key={i} style={styles.dow}>{d}</Text>
            ))}
          </View>
          <View style={styles.grid}>
            {cells.map((c, i) => {
              if (!c) return <View key={i} style={styles.dayCell} />;
              const isFuture = dayjs(c).isAfter(dayjs(today));
              const selected = c === value;
              return (
                <Pressable key={i} style={styles.dayCell} disabled={isFuture} onPress={() => onSelect(c)}>
                  <View style={[styles.dayInner, selected && styles.daySelected]}>
                    <Text style={[styles.dayNum, selected && { color: colors.onBrandPrimary }, isFuture && { color: colors.border }]}>
                      {dayjs(c).date()}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Pressable onPress={() => onSelect(today)} style={styles.todayBtn}>
            <Text style={styles.todayText}>Today</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface, alignItems: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  // gate
  lockIconWrap: {
    width: 72, height: 72, borderRadius: 999, backgroundColor: c.surfaceSecondary,
    alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  gateTitle: { fontFamily: fonts.displayBold, fontSize: 24, color: c.onSurface, textAlign: "center" },
  gateSub: { fontFamily: fonts.regular, fontSize: 15, color: c.muted, textAlign: "center", marginTop: 6, paddingHorizontal: 32, lineHeight: 21 },
  gateError: { fontFamily: fonts.medium, fontSize: 14, color: c.error, textAlign: "center", marginTop: 14, height: 20 },
  lenRow: { flexDirection: "row", gap: 14, marginTop: 28 },
  lenBtn: { width: 60, height: 60, borderRadius: 16, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" },
  lenBtnActive: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  lenText: { fontFamily: fonts.displayBold, fontSize: 22, color: c.onSurface },
  lenTextActive: { color: c.onBrandPrimary },
  dotsRow: { flexDirection: "row", gap: 16, marginTop: 28 },
  dot: { width: 16, height: 16, borderRadius: 999, borderWidth: 2, borderColor: c.borderStrong },
  dotFilled: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  keypad: { width: "100%", maxWidth: 300, flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  key: { width: "33.33%", aspectRatio: 1.6, alignItems: "center", justifyContent: "center" },
  keyNum: {},
  keyPressed: { opacity: 0.5 },
  keyText: { fontFamily: fonts.display, fontSize: 30, color: c.onSurface },
  // header
  header: {
    width: "100%", flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: c.divider,
  },
  headerTitle: { fontFamily: fonts.displayBold, fontSize: 28, color: c.onSurface },
  headerSub: { fontFamily: fonts.regular, fontSize: 14, color: c.muted, marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 999, backgroundColor: c.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  addBtn: { width: 44, height: 44, borderRadius: 999, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
  // segment
  segmentRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingTop: 16, width: "100%" },
  segment: { flex: 1, paddingVertical: 10, borderRadius: 999, backgroundColor: c.surfaceSecondary, alignItems: "center" },
  segmentActive: { backgroundColor: c.brandPrimary },
  segmentText: { fontFamily: fonts.semibold, fontSize: 14, color: c.onSurfaceTertiary },
  segmentTextActive: { color: c.onBrandPrimary },
  sectionLabel: { fontFamily: fonts.semibold, fontSize: 13, color: c.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  // calendar
  calCard: { backgroundColor: c.surfaceSecondary, borderRadius: 20, padding: 16, gap: 12, borderWidth: 1, borderColor: c.border },
  pickerHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pickerMonth: { fontFamily: fonts.displayBold, fontSize: 18, color: c.onSurface },
  dowRow: { flexDirection: "row" },
  dow: { flex: 1, textAlign: "center", fontFamily: fonts.semibold, fontSize: 12, color: c.muted },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  dayInner: { width: 38, height: 38, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  daySelected: { backgroundColor: c.brandPrimary },
  dayNum: { fontFamily: fonts.medium, fontSize: 15, color: c.onSurface },
  dayIcon: { fontSize: 18 },
  emptyDay: { flexDirection: "row", alignItems: "center", gap: 10, padding: 16, borderRadius: 14, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border },
  emptyDayText: { fontFamily: fonts.regular, fontSize: 14, color: c.muted, flex: 1 },
  // empty
  emptyIcon: { width: 72, height: 72, borderRadius: 999, backgroundColor: c.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontFamily: fonts.displayBold, fontSize: 20, color: c.onSurface },
  emptyText: { fontFamily: fonts.regular, fontSize: 15, color: c.muted, textAlign: "center", lineHeight: 22 },
  // entry card
  entryCard: { backgroundColor: c.surfaceSecondary, borderRadius: 18, padding: 16, gap: 10, borderWidth: 1, borderColor: c.border },
  entryTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  entryIcon: { fontSize: 26 },
  entryPartner: { fontFamily: fonts.semibold, fontSize: 16, color: c.onSurface },
  entryDate: { fontFamily: fonts.regular, fontSize: 13, color: c.muted, marginTop: 1 },
  entryAction: { width: 34, height: 34, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: c.brandTertiary },
  tagText: { fontFamily: fonts.medium, fontSize: 13, color: c.onBrandTertiary },
  oRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  oText: { fontFamily: fonts.medium, fontSize: 14, color: c.onSurfaceSecondary },
  oDot: { color: c.muted },
  entryNotes: { fontFamily: fonts.regular, fontSize: 14, color: c.onSurfaceSecondary, lineHeight: 20 },
  // stats
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { flexGrow: 1, flexBasis: "45%", backgroundColor: c.surfaceSecondary, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: c.border, gap: 4 },
  statValue: { fontFamily: fonts.displayBold, fontSize: 34, color: c.brand },
  statLabel: { fontFamily: fonts.medium, fontSize: 13, color: c.muted },
  partnerCard: { backgroundColor: c.surfaceSecondary, borderRadius: 18, padding: 16, gap: 10, borderWidth: 1, borderColor: c.border },
  partnerHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  partnerAvatar: { width: 40, height: 40, borderRadius: 999, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  partnerName: { fontFamily: fonts.semibold, fontSize: 16, color: c.onSurface },
  partnerMeta: { fontFamily: fonts.regular, fontSize: 13, color: c.muted, marginTop: 1 },
  partnerStats: { flexDirection: "row", alignItems: "center", gap: 8 },
  partnerStat: { fontFamily: fonts.medium, fontSize: 14, color: c.onSurfaceSecondary },
  // avatars & multi-select
  entryAvatar: { width: 44, height: 44, borderRadius: 999, backgroundColor: c.surfaceTertiary },
  entryIconSmall: { fontSize: 18 },
  miniAvatar: { width: 30, height: 30, borderRadius: 999, backgroundColor: c.surfaceTertiary },
  miniAvatarBlank: { width: 30, height: 30, borderRadius: 999, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  partnerRow: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  optionSub: { fontFamily: fonts.regular, fontSize: 13, color: c.muted, marginTop: -4, marginBottom: 6 },
  checkBox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: c.borderStrong, alignItems: "center", justifyContent: "center" },
  checkBoxOn: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  partnerEditRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  partnerPhotoBtn: { width: 36, height: 36, borderRadius: 999, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" },
  hintText: { fontFamily: fonts.regular, fontSize: 12, color: c.muted, lineHeight: 17 },
  blockedText: { fontFamily: fonts.medium, fontSize: 13, color: c.error },
  // sheet
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(45,43,42,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
  sheetHandle: { width: 40, height: 5, borderRadius: 999, backgroundColor: c.border, alignSelf: "center", marginBottom: 8 },
  sheetTitle: { fontFamily: fonts.displayBold, fontSize: 22, color: c.onSurface, marginBottom: 6 },
  settingsSub: { fontFamily: fonts.regular, fontSize: 14, color: c.muted, marginBottom: 12, lineHeight: 20 },
  fieldLabel: { fontFamily: fonts.semibold, fontSize: 14, color: c.onSurface, marginTop: 10 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border },
  dateText: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: c.onSurface },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  iconChoice: { width: 46, height: 46, borderRadius: 12, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" },
  iconChoiceActive: { borderColor: c.brandPrimary, backgroundColor: c.brandTertiary },
  stepperRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 },
  stepperLabel: { fontFamily: fonts.semibold, fontSize: 14, color: c.onSurface },
  stepperControls: { flexDirection: "row", alignItems: "center", gap: 14 },
  stepBtn: { width: 38, height: 38, borderRadius: 999, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" },
  stepValue: { fontFamily: fonts.displayBold, fontSize: 20, color: c.onSurface, minWidth: 28, textAlign: "center" },
  cancelBtn: { alignItems: "center", paddingVertical: 12 },
  cancelText: { fontFamily: fonts.semibold, fontSize: 15, color: c.muted },
  // options
  addRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  addTagBtn: { width: 52, height: 52, borderRadius: 12, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
  editTag: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: c.brandTertiary },
  optionEmpty: { fontFamily: fonts.regular, fontSize: 14, color: c.muted },
  // dropdown modal
  pickerBackdrop: { flex: 1, backgroundColor: "rgba(45,43,42,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  optionCard: { width: "100%", maxWidth: 360, backgroundColor: c.surface, borderRadius: 24, padding: 20, gap: 4 },
  optionTitle: { fontFamily: fonts.displayBold, fontSize: 18, color: c.onSurface, marginBottom: 8 },
  optionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.divider },
  optionText: { fontFamily: fonts.medium, fontSize: 16, color: c.onSurface },
  optionFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  optionClear: { fontFamily: fonts.semibold, fontSize: 15, color: c.error },
  optionManage: { fontFamily: fonts.semibold, fontSize: 15, color: c.brand },
  // picker
  pickerCard: { width: "100%", maxWidth: 360, backgroundColor: c.surface, borderRadius: 24, padding: 20, gap: 12 },
  todayBtn: { alignSelf: "center", paddingVertical: 8, paddingHorizontal: 20 },
  todayText: { fontFamily: fonts.semibold, fontSize: 15, color: c.brand },
}));
