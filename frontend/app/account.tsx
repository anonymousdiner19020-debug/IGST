import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import { useAuth } from "@/src/auth-context";
import { Icon, PrimaryButton, TextField } from "@/src/components/ui";
import { fonts, makeStyles, useTheme } from "@/src/theme";

const DELETE_PHRASE = "DELETE MY ACCOUNT";

export default function AccountScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut, refreshUser } = useAuth();

  const hasPassword = !!user?.hasPassword;

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwErr, setPwErr] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);

  const [confirm, setConfirm] = useState("");
  const [delPw, setDelPw] = useState("");
  const [delErr, setDelErr] = useState("");
  const [delBusy, setDelBusy] = useState(false);

  const submitPassword = async () => {
    setPwMsg("");
    setPwErr(false);
    if (next.length < 6) {
      setPwErr(true);
      setPwMsg("Password must be at least 6 characters.");
      return;
    }
    setPwBusy(true);
    try {
      if (hasPassword) await api.changePassword(current, next);
      else await api.setPassword(next);
      await refreshUser();
      setCurrent("");
      setNext("");
      setPwMsg(hasPassword ? "Password updated." : "Password set.");
    } catch (e: any) {
      setPwErr(true);
      setPwMsg(e?.message || "Could not update password.");
    } finally {
      setPwBusy(false);
    }
  };

  const submitDelete = async () => {
    setDelErr("");
    if (confirm !== DELETE_PHRASE) {
      setDelErr(`Type "${DELETE_PHRASE}" exactly to confirm.`);
      return;
    }
    setDelBusy(true);
    try {
      await api.deleteAccount(DELETE_PHRASE, hasPassword ? delPw : undefined);
      await signOut();
      router.replace("/");
    } catch (e: any) {
      setDelErr(e?.message || "Could not delete account.");
      setDelBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="account-back">
          <Icon name="arrow-left" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Account Safety</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24, gap: 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>{hasPassword ? "Change password" : "Set a password"}</Text>
        <View style={styles.card}>
          {hasPassword ? (
            <TextField
              testID="current-password"
              value={current}
              onChangeText={setCurrent}
              placeholder="Current password"
              secureTextEntry
              autoCapitalize="none"
            />
          ) : (
            <Text style={styles.cardText}>
              You signed in with Google. Set a password to also sign in with email.
            </Text>
          )}
          <TextField
            testID="new-password"
            value={next}
            onChangeText={setNext}
            placeholder="New password"
            secureTextEntry
            autoCapitalize="none"
          />
          {pwMsg ? <Text style={[styles.msg, pwErr && styles.errText]}>{pwMsg}</Text> : null}
          <PrimaryButton
            testID="save-password"
            label={hasPassword ? "Update password" : "Set password"}
            loading={pwBusy}
            onPress={submitPassword}
          />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.error }]}>Danger zone</Text>
        <View style={[styles.card, styles.dangerCard]}>
          <Text style={styles.cardText}>
            Permanently delete your account and erase all entries, photos, and history. This cannot be undone.
          </Text>
          <TextField
            testID="delete-confirm"
            value={confirm}
            onChangeText={setConfirm}
            placeholder={`Type ${DELETE_PHRASE}`}
            autoCapitalize="characters"
          />
          {hasPassword ? (
            <TextField
              testID="delete-password"
              value={delPw}
              onChangeText={setDelPw}
              placeholder="Current password"
              secureTextEntry
              autoCapitalize="none"
            />
          ) : null}
          {delErr ? <Text style={[styles.msg, styles.errText]}>{delErr}</Text> : null}
          <Pressable
            testID="delete-account"
            onPress={submitDelete}
            disabled={delBusy}
            style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.9 }, delBusy && { opacity: 0.5 }]}
          >
            <Icon name="trash-2" size={18} color={colors.onError} />
            <Text style={styles.deleteText}>Permanently delete account</Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
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
  sectionLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: c.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: -8,
  },
  card: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: 18,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: c.border,
  },
  dangerCard: { borderColor: c.error },
  cardText: { fontFamily: fonts.regular, fontSize: 14, color: c.onSurfaceSecondary, lineHeight: 21 },
  msg: { fontFamily: fonts.medium, fontSize: 14, color: c.success },
  errText: { color: c.error },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: c.error,
  },
  deleteText: { fontFamily: fonts.semibold, fontSize: 15, color: c.onError },
}));
