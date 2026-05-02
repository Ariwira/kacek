export function Sparkline({
  data = [10, 18, 12, 26, 18, 32, 28, 22, 34, 40, 36, 48, 44, 40, 52, 58, 56, 68, 64, 60],
  color,
  glow,
  h = 56,
  w: _w,
}: {
  data?: number[];
  color: string;
  glow?: boolean;
  h?: number;
  w?: number;
}) {
  const pts = data && data.length > 0 ? data : [0, 0, 0, 0, 0];
  const max = Math.max(1, ...pts);
  const w = 300; // Internal coordinate system width
  const step = w / (pts.length - 1);
  
  let d = "";
  pts.forEach((y, i) => {
    const x = i * step;
    // Calculate y with padding (3px top/bottom)
    const py = h - (y / max) * (h - 10) - 5;
    d += i === 0 ? `M ${x} ${py}` : ` L ${x} ${py}`;
  });

  const id = glow ? "sparkD" : "sparkL";
  
  return (
    <div className="w-full h-full min-h-[48px]">
      <svg
        width="100%"
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className={`overflow-visible ${glow ? "drop-shadow-[0_0_8px_var(--accent)]" : ""}`}
        style={glow ? { filter: `drop-shadow(0 0 8px ${color}66)` } : undefined}
      >
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Fill Area */}
        <path 
          d={`${d} L ${w} ${h} L 0 ${h} Z`} 
          fill={`url(#${id})`} 
          className="transition-all duration-500"
        />
        
        {/* Stroke Line */}
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-500"
        />
      </svg>
    </div>
  );
}
