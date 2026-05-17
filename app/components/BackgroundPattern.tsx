export default function BackgroundPattern({ isDark }: { isDark: boolean }) {
  if (!isDark) return null;

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 85% 70% at 50% 35%, rgba(180, 120, 40, 0.06) 0%, transparent 72%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: "radial-gradient(circle, #2a2a2a 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
    </>
  );
}
