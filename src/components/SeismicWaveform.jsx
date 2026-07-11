/**
 * Sahifaning "imzo" elementi — uzluksiz chizilayotgan seysmograf to'lqini.
 * Mavzuga (seysmologiya) bevosita bog'liq va real vaqtli monitoring hissini beradi.
 */
export default function SeismicWaveform({ className = "", tone = "amber" }) {
  const stroke = tone === "teal" ? "#0d6efd" : "#003366";

  // Tasodifiy bo'lmagan, lekin tabiiy ko'rinadigan to'lqin nuqtalari
  const points = [
    [0, 20], [20, 20], [30, 8], [40, 34], [50, 12], [60, 28], [70, 20],
    [90, 20], [100, 4], [110, 36], [120, 20], [140, 20], [150, 16],
    [160, 24], [170, 20], [190, 20], [200, 2], [212, 38], [224, 20],
    [240, 20], [260, 20],
  ];
  const path = "M " + points.map((p) => p.join(",")).join(" L ");

  return (
    <svg
      viewBox="0 0 260 40"
      className={className}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength="1"
        style={{
          strokeDasharray: 1,
          strokeDashoffset: 1,
          animation: "draw-wave 3.2s linear infinite",
        }}
      />
      <style>{`
        @keyframes draw-wave {
          0% { stroke-dashoffset: 1; opacity: 0.3; }
          8% { opacity: 1; }
          92% { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0.3; }
        }
      `}</style>
    </svg>
  );
}
