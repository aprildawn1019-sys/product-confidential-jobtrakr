import { useEffect, useState } from "react";

/**
 * Lightweight celebration burst — sparkle particles radiating from center.
 * Pure CSS/SVG, no external dependencies. Auto-cleans after animation.
 *
 * Renders inside a `relative` parent. Triggered by changing the `trigger` key.
 */
export function CelebrationBurst({ trigger, color = "hsl(var(--success))" }: { trigger: number | string | boolean; color?: string }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (trigger === false || trigger === 0 || trigger === "") return;
    setActive(true);
    const t = setTimeout(() => setActive(false), 900);
    return () => clearTimeout(t);
  }, [trigger]);

  if (!active) return null;

  // 8 particles in a starburst
  const particles = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2;
    const dx = Math.cos(angle) * 28;
    const dy = Math.sin(angle) * 28;
    return { dx, dy, delay: i * 20 };
  });

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible"
    >
      {particles.map((p, i) => (
        <span
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full celebration-particle"
          style={{
            background: color,
            ["--dx" as string]: `${p.dx}px`,
            ["--dy" as string]: `${p.dy}px`,
            animationDelay: `${p.delay}ms`,
          }}
        />
      ))}
      <span
        className="absolute h-8 w-8 rounded-full celebration-pulse"
        style={{ background: color, opacity: 0.25 }}
      />
    </span>
  );
}
