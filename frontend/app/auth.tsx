import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth-context";
import { Icon, PrimaryButton, TextField } from "@/src/components/ui";
import { fonts, makeStyles, useTheme } from "@/src/theme";

export default function AuthScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signInEmail, signUpEmail, signInGoogle } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const submit = async () => {
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "register") await signUpEmail(email, password, name);
      else await signInEmail(email, password);
      router.back();
    } catch (e: any) {
      setError(e?.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError("");
    setGoogleBusy(true);
    try {
      await signInGoogle();
      // On mobile this resolves after the browser closes; auth state updates via context.
      router.back();
    } catch (e: any) {
      setError(e?.message || "Google sign-in failed.");
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="auth-close">
          <Icon name="x" size={24} color={colors.onSurface} />
        </Pressable>
      </View>
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{mode === "login" ? "Welcome back" : "Create your account"}</Text>
        <Text style={styles.subtitle}>
          {mode === "login"
            ? "Sign in to sync your journal across devices."
            : "Your entries on this device will move into your new account."}
        </Text>

        <View style={styles.form}>
          {mode === "register" ? (
            <TextField
              testID="auth-name"
              value={name}
              onChangeText={setName}
              placeholder="Your name (optional)"
              autoCapitalize="words"
            />
          ) : null}
          <TextField
            testID="auth-email"
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextField
            testID="auth-password"
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            autoCapitalize="none"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton
            testID="auth-submit"
            label={mode === "login" ? "Sign in" : "Create account"}
            loading={busy}
            onPress={submit}
          />
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.line} />
          <Text style={styles.or}>or</Text>
          <View style={styles.line} />
        </View>

        <Pressable
          testID="auth-google"
          onPress={google}
          disabled={googleBusy}
          style={({ pressed }) => [styles.googleBtn, pressed && { opacity: 0.9 }]}
        >
          {googleBusy ? (
            <ActivityIndicator color={colors.onSurface} />
          ) : (
            <>
              <Icon name="log-in" size={20} color={colors.onSurface} />
              <Text style={styles.googleText}>Continue with Google</Text>
            </>
          )}
        </Pressable>

        <Pressable
          testID="auth-toggle-mode"
          onPress={() => {
            setError("");
            setMode(mode === "login" ? "register" : "login");
          }}
          style={styles.toggle}
        >
          <Text style={styles.toggleText}>
            {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
          </Text>
        </Pressable>
      </KeyboardAwareScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  content: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 },
  title: { fontFamily: fonts.displayBold, fontSize: 30, color: c.onSurface },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, color: c.muted, marginTop: 8, lineHeight: 22 },
  form: { marginTop: 28, gap: 14 },
  error: { fontFamily: fonts.medium, fontSize: 14, color: c.error },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 24 },
  line: { flex: 1, height: 1, backgroundColor: c.divider },
  or: { fontFamily: fonts.medium, fontSize: 13, color: c.muted },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.borderStrong,
  },
  googleText: { fontFamily: fonts.semibold, fontSize: 16, color: c.onSurface },
  toggle: { marginTop: 24, alignItems: "center" },
  toggleText: { fontFamily: fonts.medium, fontSize: 15, color: c.brand },
}));
