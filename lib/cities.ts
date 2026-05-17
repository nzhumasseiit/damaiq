export const CITIES = [
  "Алматы",
  "Астана",
  "Шымкент",
  "Қарағанды",
  "Атырау",
  "Ақтөбе",
  "Павлодар",
  "Өскемен",
  "Тараз",
  "Басқа қала",
] as const;

export type City = (typeof CITIES)[number];

export const CITY_COLORS: Record<City, string> = {
  Алматы: "#3B82F6",
  Астана: "#10B981",
  Шымкент: "#F59E0B",
  Қарағанды: "#8B5CF6",
  Атырау: "#06B6D4",
  Ақтөбе: "#EF4444",
  Павлодар: "#EC4899",
  Өскемен: "#14B8A6",
  Тараз: "#F97316",
  "Басқа қала": "#6B7280",
};

export const CITY_EMOJI: Record<City, string> = {
  Алматы: "🏔",
  Астана: "🏛",
  Шымкент: "🌴",
  Қарағанды: "⛏",
  Атырау: "🛢",
  Ақтөбе: "🌾",
  Павлодар: "🏭",
  Өскемен: "🦅",
  Тараз: "🏺",
  "Басқа қала": "📍",
};

export function isCity(value: string): value is City {
  return (CITIES as readonly string[]).includes(value);
}
