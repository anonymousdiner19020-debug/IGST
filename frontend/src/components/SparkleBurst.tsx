import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

type Props = {
  // Increment this to fire a new burst. 0 = idle.
  trigger: number;
};

const SPARKLES = ["✨", "⭐", "🎉", "✨", "💫", "⭐", "🎊", "✨"];
const RADIUS = 90;

// A satisfying pop-and-sparkle burst that radiates from the screen center.
// Fires whenever `trigger` changes to a new non-zero value.
export function SparkleBurst({ trigger }: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!trigger) return;
    progress.setValue(0);
    pop.setValue(0);
    Animated.parallel([
      Animated.timing(progress, {
        toValue: 1,
        duration: 850,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.spring(pop, { toValue: 1, useNativeDriver: true, friction: 4, tension: 120 }),
        Animated.timing(pop, {
          toValue: 0,
          duration: 300,
          delay: 250,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  if (!trigger) return null;

  const opacity = progress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });

  return (
    <View style={styles.overlay} pointerEvents="none" testID="sparkle-burst">
      <Animated.View
        style={[
          styles.ring,
          {
            opacity,
            transform: [
              { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.2, 2.4] }) },
            ],
          },
        ]}
      />
      <Animated.Text
        style={[
          styles.perfect,
          {
            opacity: pop,
            transform: [
              { translateY: 160 },
              { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.15] }) },
            ],
          },
        ]}
      >
        PERFECT!
      </Animated.Text>
      {SPARKLES.map((s, i) => {
        const angle = (i / SPARKLES.length) * Math.PI * 2;
        const tx = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * RADIUS] });
        const ty = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * RADIUS] });
        return (
          <Animated.Text
            key={i}
            style={[
              styles.sparkle,
              {
                opacity,
                transform: [
                  { translateX: tx },
                  { translateY: ty },
                  { scale: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 1.3, 0.9] }) },
                ],
              },
            ]}
          >
            {s}
          </Animated.Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },
  ring: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    borderColor: "#FFD166",
  },
  sparkle: { position: "absolute", fontSize: 30 },
  perfect: {
    position: "absolute",
    fontSize: 34,
    fontWeight: "900",
    color: "#FFD166",
    letterSpacing: 2,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});

export default SparkleBurst;
