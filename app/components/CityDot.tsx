import { CITY_COLORS, CITY_EMOJI, type City } from "@/lib/cities";

export default function CityDot({ city }: { city: City }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: CITY_COLORS[city] }}
      />
      <span className="hidden sm:inline" aria-hidden="true">
        {CITY_EMOJI[city]}
      </span>
      <span>{city}</span>
    </span>
  );
}
