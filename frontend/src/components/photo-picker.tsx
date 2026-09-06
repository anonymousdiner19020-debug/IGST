import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, Text, View } from "react-native";

import { fileUrl, uploadPhoto } from "@/src/api";
import { Icon } from "@/src/components/ui";
import { fonts, makeStyles, useTheme } from "@/src/theme";

export function PhotoPicker({
  userId,
  value,
  onChange,
  max = 3,
}: {
  userId: string;
  value: string[];
  onChange: (paths: string[]) => void;
  max?: number;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const handleAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    setBusy(true);
    try {
      const { path } = await uploadPhoto(userId, {
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
      });
      onChange([...value, path]);
    } catch {
      // upload failed silently; user can retry
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
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.6,
    });
    if (!res.canceled && res.assets?.[0]) await handleAsset(res.assets[0]);
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
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.6 });
    if (!res.canceled && res.assets?.[0]) await handleAsset(res.assets[0]);
  };

  const remove = (path: string) => onChange(value.filter((p) => p !== path));
  const canAdd = value.length < max && !busy;

  return (
    <View style={styles.wrap}>
      <View style={styles.grid}>
        {value.map((path) => (
          <View key={path} style={styles.thumbWrap}>
            <Image source={{ uri: fileUrl(path, userId) }} style={styles.thumb} contentFit="cover" transition={200} />
            <Pressable
              testID={`remove-photo-${path.slice(-8)}`}
              onPress={() => remove(path)}
              style={styles.removeBtn}
              hitSlop={6}
            >
              <Icon name="x" size={14} color={colors.onError} />
            </Pressable>
          </View>
        ))}
        {busy ? (
          <View style={[styles.thumbWrap, styles.thumbLoading]}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : null}
      </View>

      {canAdd ? (
        <View style={styles.actions}>
          <Pressable testID="photo-camera" onPress={fromCamera} style={styles.actionBtn}>
            <Icon name="camera" size={18} color={colors.onSurface} />
            <Text style={styles.actionText}>Take photo</Text>
          </Pressable>
          <Pressable testID="photo-library" onPress={fromLibrary} style={styles.actionBtn}>
            <Icon name="image" size={18} color={colors.onSurface} />
            <Text style={styles.actionText}>Choose photo</Text>
          </Pressable>
        </View>
      ) : null}

      {blocked ? (
        <Pressable onPress={() => Linking.openSettings()} testID="photo-open-settings">
          <Text style={styles.blockedText}>Photo access is off. Tap to open Settings.</Text>
        </Pressable>
      ) : null}
      <Text style={styles.hint}>Up to {max} photos</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { gap: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  thumbWrap: { width: 92, height: 92, borderRadius: 14, overflow: "hidden", position: "relative" },
  thumb: { width: "100%", height: "100%" },
  thumbLoading: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.surfaceTertiary,
    borderWidth: 1,
    borderColor: c.border,
  },
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
  hint: { fontFamily: fonts.regular, fontSize: 12, color: c.muted },
}));
