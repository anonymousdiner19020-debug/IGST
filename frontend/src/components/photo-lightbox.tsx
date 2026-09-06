import { Image } from "expo-image";
import { useState } from "react";
import { Dimensions, FlatList, Modal, Pressable, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fileUrl } from "@/src/api";
import { Icon } from "@/src/components/ui";
import { makeStyles } from "@/src/theme";

const AnimatedImage = Animated.createAnimatedComponent(Image);

function ZoomableImage({ uri, width, height }: { uri: string; width: number; height: number }) {
  const scale = useSharedValue(1);
  const saved = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const sx = useSharedValue(0);
  const sy = useSharedValue(0);
  const [zoomed, setZoomed] = useState(false);

  const reset = () => {
    scale.value = withTiming(1);
    saved.value = 1;
    tx.value = withTiming(0);
    ty.value = withTiming(0);
    sx.value = 0;
    sy.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(1, saved.value * e.scale);
    })
    .onEnd(() => {
      saved.value = scale.value;
      if (scale.value <= 1.05) {
        reset();
        runOnJS(setZoomed)(false);
      } else {
        runOnJS(setZoomed)(true);
      }
    });

  const pan = Gesture.Pan()
    .enabled(zoomed)
    .onUpdate((e) => {
      tx.value = sx.value + e.translationX;
      ty.value = sy.value + e.translationY;
    })
    .onEnd(() => {
      sx.value = tx.value;
      sy.value = ty.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        reset();
        runOnJS(setZoomed)(false);
      } else {
        scale.value = withTiming(2.5);
        saved.value = 2.5;
        runOnJS(setZoomed)(true);
      }
    });

  const gesture = Gesture.Simultaneous(pinch, pan, doubleTap);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ width, height, alignItems: "center", justifyContent: "center" }}>
        <AnimatedImage
          source={{ uri }}
          style={[{ width, height: height * 0.8 }, style]}
          contentFit="contain"
          transition={150}
        />
      </View>
    </GestureDetector>
  );
}

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
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <ZoomableImage uri={fileUrl(item, userId)} width={width} height={height} />
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
