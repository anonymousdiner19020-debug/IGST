import { AudioPlayer, createAudioPlayer } from "expo-audio";

// Google's public sound library — free & stable.
const URLS = {
  pop: "https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg",
  ding: "https://actions.google.com/sounds/v1/alarms/beep_short.ogg",
  coin: "https://actions.google.com/sounds/v1/cartoon/pop.ogg",
  serve: "https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg",
  error: "https://actions.google.com/sounds/v1/cartoon/concussive_hit_guitar_boing.ogg",
  cheer: "https://actions.google.com/sounds/v1/human_voices/crowd_cheering.ogg",
} as const;

type Key = keyof typeof URLS;

const players: Partial<Record<Key, AudioPlayer>> = {};
let enabled = true;

function ensure(key: Key) {
  if (!players[key]) {
    try {
      const p = createAudioPlayer({ uri: URLS[key] });
      p.volume = 0.7;
      players[key] = p;
    } catch {}
  }
  return players[key];
}

export const sound = {
  preload() {
    (Object.keys(URLS) as Key[]).forEach(ensure);
  },
  play(key: Key) {
    if (!enabled) return;
    try {
      const p = ensure(key);
      if (!p) return;
      p.seekTo(0);
      p.play();
    } catch {}
  },
  setEnabled(v: boolean) {
    enabled = v;
  },
  isEnabled() {
    return enabled;
  },
};
