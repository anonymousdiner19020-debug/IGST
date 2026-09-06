import { Image } from "expo-image";
import { useState } from "react";
import { Dimensions, FlatList, Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fileUrl } from "@/src/api";
import { Icon } from "@/src/components/ui";
import { makeStyles } from "@/src/theme";

export function PhotoLightbox({
  visible,
  paths,
  userId,
  initialIndex = 0,
  onClose,
}: {
  visible: boolean;
  paths: string[];
  userId: string;
  initialIndex?: number;
  onClose: () => void;
}) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get("window");
  const [index, setIndex] = useState(initialIndex);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <FlatList
          data={paths}
          horizontal
          pagingEnabled
          initialScrollIndex={initialIndex}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          keyExtractor={(p) => p}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) =>
            setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
          }
          renderItem={({ item }) => (
            <Pressable onPress={onClose} style={{ width, height, alignItems: "center", justifyContent: "center" }}>
              <Image
                source={{ uri: fileUrl(item, userId) }}
                style={{ width, height: height * 0.8 }}
                contentFit="contain"
                transition={200}
              />
            </Pressable>
          )}
        />
        <Pressable
          testID="lightbox-close"
          onPress={onClose}
          style={[styles.close, { top: insets.top + 12 }]}
          hitSlop={10}
        >
          <Icon name="x" size={26} color="#FFFFFF" />
        </Pressable>
        {paths.length > 1 ? (
          <View style={[styles.dots, { bottom: insets.bottom + 24 }]}>
            {paths.map((p, i) => (
              <View key={p} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const useStyles = makeStyles(() => ({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.94)" },
  close: {
    position: "absolute",
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  dots: { position: "absolute", left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.35)" },
  dotActive: { backgroundColor: "#FFFFFF" },
}));
