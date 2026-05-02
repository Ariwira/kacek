export function RingProgress({
  pct, // 0..100+
  size = 110,
  ring = 10,
  color,
  trackColor,
  glow = false,
  children,
}: {
  pct: number;
  size?: number;
  ring?: number;
  color: string;
  trackColor: string;
  glow?: boolean;
  children?: React.ReactNode;
}) {
  const r = (size - ring) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const len = (clamped / 100) * c;
  const dash = `${len} ${c - len}`;

  return (
    <div
      className="relative shrink-0"
      style={{
        width: size,
        height: size,
      }}
    >
      <svg
        width={size}
        height={size}
        className="-rotate-90 block"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={ring}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={ring}
          strokeLinecap="round"
          strokeDasharray={dash}
          strokeDashoffset={0}
          className={glow ? "drop-shadow-[0_0_6px_rgba(52,245,160,0.5)]" : ""}
          style={glow ? { filter: `drop-shadow(0 0 6px ${color}88)` } : undefined}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {children}
        </div>
      )}
    </div>
  );
}
