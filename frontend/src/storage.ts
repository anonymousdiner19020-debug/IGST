import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "philly_fare_player_id";

export const playerStorage = {
  get: () => AsyncStorage.getItem(KEY),
  set: (id: string) => AsyncStorage.setItem(KEY, id),
  clear: () => AsyncStorage.removeItem(KEY),
};
