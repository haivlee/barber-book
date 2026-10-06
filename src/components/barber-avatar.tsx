import { cn } from "@/lib/utils";

const palettes = [
  "bg-[oklch(0.32_0.03_60)] text-[oklch(0.9_0.06_80)]",
  "bg-[oklch(0.74_0.12_72)] text-[oklch(0.2_0.02_60)]",
  "bg-[oklch(0.45_0.06_30)] text-[oklch(0.95_0.02_80)]",
  "bg-[oklch(0.4_0.05_200)] text-[oklch(0.95_0.02_80)]",
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function hash(value: string) {
  let h = 0;
  for (const ch of value) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export function BarberAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-12 shrink-0 place-items-center rounded-full font-heading text-base font-semibold",
        palettes[hash(name) % palettes.length],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
