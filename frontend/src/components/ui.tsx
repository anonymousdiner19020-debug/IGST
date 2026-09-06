// Shared UI building blocks for Aura.
import Feather from "@react-native-vector-icons/feather";
import { forwardRef } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";

import { fonts, makeStyles, useTheme } from "@/src/theme";

type FeatherName = React.ComponentProps<typeof Feather>["name"];

export function Icon({
  name,
  size = 20,
  color,
}: {
  name: FeatherName;
  size?: number;
  color?: string;
}) {
  const { colors } = useTheme();
  return <Feather name={name} size={size} color={color ?? colors.onSurface} />;
}

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  icon,
  testID,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: FeatherName;
  testID?: string;
  variant?: "primary" | "secondary";
}) {
  const styles = useButtonStyles();
  const { colors } = useTheme();
  const isSecondary = variant === "secondary";
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        styles.btn,
        isSecondary ? styles.btnSecondary : styles.btnPrimary,
        (disabled || loading) && styles.btnDisabled,
        pressed && styles.btnPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isSecondary ? colors.onBrandSecondary : colors.onBrandPrimary} />
      ) : (
        <View style={styles.btnRow}>
          {icon ? (
            <Feather
              name={icon}
              size={18}
              color={isSecondary ? colors.onBrandSecondary : colors.onBrandPrimary}
            />
          ) : null}
          <Text style={[styles.btnText, isSecondary && styles.btnTextSecondary]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const useButtonStyles = makeStyles((c) => ({
  btn: {
    minHeight: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  btnPrimary: { backgroundColor: c.brandPrimary },
  btnSecondary: {
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.borderStrong,
  },
  btnDisabled: { opacity: 0.5 },
  btnPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  btnRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  btnText: { color: c.onBrandPrimary, fontFamily: fonts.semibold, fontSize: 16 },
  btnTextSecondary: { color: c.onBrandSecondary },
}));

export const TextField = forwardRef<TextInput, TextInputProps & { testID?: string }>(
  function TextField(props, ref) {
    const styles = useFieldStyles();
    const { colors } = useTheme();
    return (
      <TextInput
        ref={ref}
        placeholderTextColor={colors.muted}
        style={[styles.input, props.multiline && styles.multiline, props.style]}
        {...props}
      />
    );
  },
);

const useFieldStyles = makeStyles((c) => ({
  input: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: c.onSurface,
    minHeight: 52,
  },
  multiline: { minHeight: 120, textAlignVertical: "top", paddingTop: 14 },
}));

export function NumberedField({
  index,
  ...props
}: TextInputProps & { index: number; testID?: string }) {
  const styles = useNumberedStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{index}</Text>
      </View>
      <TextInput
        placeholderTextColor={colors.muted}
        style={[styles.input, props.style]}
        {...props}
      />
    </View>
  );
}

const useNumberedStyles = makeStyles((c) => ({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: c.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontFamily: fonts.bold, fontSize: 14, color: c.onBrandTertiary },
  input: {
    flex: 1,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: c.onSurface,
    minHeight: 52,
  },
}));

export function Chip({
  label,
  selected,
  onPress,
  icon,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: FeatherName;
  testID?: string;
}) {
  const styles = useChipStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      {icon ? (
        <Feather
          name={icon}
          size={16}
          color={selected ? colors.onBrandPrimary : colors.onSurfaceTertiary}
        />
      ) : null}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const useChipStyles = makeStyles((c) => ({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.border,
  },
  chipSelected: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  chipText: { fontFamily: fonts.medium, fontSize: 15, color: c.onSurfaceTertiary },
  chipTextSelected: { color: c.onBrandPrimary },
}));

export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: FeatherName;
  title: string;
  subtitle?: string;
}) {
  const styles = useEmptyStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={styles.circle}>
        <Feather name={icon} size={30} color={colors.brand} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const useEmptyStyles = makeStyles((c) => ({
  wrap: { alignItems: "center", paddingHorizontal: 32, paddingVertical: 40, gap: 12 },
  circle: {
    width: 72,
    height: 72,
    borderRadius: 999,
    backgroundColor: c.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: c.onSurface,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: c.muted,
    textAlign: "center",
    lineHeight: 22,
  },
}));
