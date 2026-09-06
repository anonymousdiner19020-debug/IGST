export type Mood = { key: string; emoji: string; label: string };

export const MOODS: Mood[] = [
  { key: "1", emoji: "😞", label: "Rough" },
  { key: "2", emoji: "😕", label: "Low" },
  { key: "3", emoji: "😐", label: "Okay" },
  { key: "4", emoji: "🙂", label: "Good" },
  { key: "5", emoji: "😀", label: "Great" },
];

export const moodEmoji = (k: string) => MOODS.find((m) => m.key === k)?.emoji ?? "";
export const moodLabel = (k: string) => MOODS.find((m) => m.key === k)?.label ?? "";
