import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "philly_fare_player_id";

export const playerStorage = {
  get: () => AsyncStorage.getItem(KEY),
  set: (id: string) => AsyncStorage.setItem(KEY, id),
  clear: () => AsyncStorage.removeItem(KEY),
};

// Generic one-shot flags (e.g. "seen the pretzel tutorial").
export const flagStorage = {
  seen: async (key: string) => (await AsyncStorage.getItem(`flag_${key}`)) === "1",
  mark: (key: string) => AsyncStorage.setItem(`flag_${key}`, "1"),
};
