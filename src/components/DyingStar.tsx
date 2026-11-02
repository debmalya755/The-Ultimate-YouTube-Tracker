/**
 * The heart of a dying star — pure SVG/CSS, no raster assets.
 *
 * Built as physical layers:
 *   light spill → corona → convective plasma body (3 counter-rotating
 *   turbulence shells) → limb darkening → white-hot core → prominence
 *   loops erupting off the limb → collapsing debris rings → anamorphic flare.
 *
 * Performance: every turbulence texture is a static background-image, so the
 * browser rasterizes it once and the churn is pure compositor transform.
 * Nothing re-runs a filter per frame. Freezes under prefers-reduced-motion.
 */

/** fractal-noise plasma texture as a one-shot background image */
const plasma = (freq: number, octaves: number, seed: number, matrix: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='520' height='520'>` +
      `<filter id='f' x='0' y='0' width='100%' height='100%'>` +
      `<feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='${octaves}' seed='${seed}'/>` +
      `<feColorMatrix type='matrix' values='${matrix}'/>` +
      `</filter><rect width='520' height='520' filter='url(#f)'/></svg>`
  )}")`;

/* deep churn — large slow convection cells, blood-orange */
const CHURN = plasma(
  0.006,
  4,
  7,
  "0 0 0 0 0.95  0 0 0 0 0.33  0 0 0 0 0.06  1.5 0 0 0 -0.42"
);
/* mid shell — brighter amber tongues */
const TONGUES = plasma(
  0.015,
  3,
  21,
  "0 0 0 0 1  0 0 0 0 0.62  0 0 0 0 0.18  1.35 0 0 0 -0.5"
);
/* fine granulation — white-hot speckle */
const GRAIN = plasma(
  0.05,
  2,
  43,
  "0 0 0 0 1  0 0 0 0 0.92  0 0 0 0 0.72  1.1 0 0 0 -0.62"
);

const R = 124; // star radius inside the 400x400 viewBox

const pt = (a: number, r: number): [number, number] => [
  200 + Math.cos(a) * r,
  200 + Math.sin(a) * r,
];

/** a plasma loop arcing off the limb and falling back */
const loop = (a0: number, a1: number, bulge: number) => {
  const [x0, y0] = pt(a0, R * 0.97);
  const [x1, y1] = pt(a1, R * 0.97);
  const [cx, cy] = pt((a0 + a1) / 2, R * bulge);
  return `M ${x0.toFixed(1)} ${y0.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(
    1
  )} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
};

const PROMINENCES: { a0: number; a1: number; bulge: number; w: number }[] = [
  { a0: -1.95, a1: -1.15, bulge: 1.52, w: 3 },
  { a0: -0.35, a1: 0.3, bulge: 1.34, w: 2.2 },
  { a0: 1.05, a1: 1.85, bulge: 1.46, w: 2.6 },
  { a0: 2.45, a1: 2.95, bulge: 1.26, w: 1.8 },
  { a0: 3.6, a1: 4.3, bulge: 1.4, w: 2.4 },
];

export default function DyingStar({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`relative ${className}`}>
      {/* ---- light thrown into the surrounding dark ---- */}
      <div
        className="absolute inset-[-58%] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(255,150,60,0.26) 0%, rgba(255,110,40,0.11) 34%, rgba(190,60,20,0.04) 56%, transparent 72%)",
        }}
      />

      {/* ---- corona ---- */}
      <div
        className="star-corona absolute inset-[4%] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(255,214,150,0.34) 38%, rgba(255,140,50,0.2) 56%, rgba(200,50,15,0.07) 74%, transparent 86%)",
          filter: "blur(10px)",
        }}
      />

      {/* ---- convective body ---- */}
      <div className="absolute inset-[19%] overflow-hidden rounded-full">
        {/* molten base */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 42% 38%, #fff6e2 0%, #ffd27a 16%, #ff9b3d 34%, #f2561a 56%, #a81508 78%, #3d0702 100%)",
          }}
        />

        {/* deep churn shell */}
        <div
          className="star-shell-a absolute -inset-1/2 will-change-transform"
          style={{
            backgroundImage: CHURN,
            backgroundSize: "62% 62%",
            opacity: 0.85,
            mixBlendMode: "overlay",
          }}
        />

        {/* amber tongues, counter-rotating */}
        <div
          className="star-shell-b absolute -inset-1/2 will-change-transform"
          style={{
            backgroundImage: TONGUES,
            backgroundSize: "48% 48%",
            opacity: 0.6,
            mixBlendMode: "screen",
          }}
        />

        {/* fast fine granulation */}
        <div
          className="star-shell-c absolute -inset-1/2"
          style={{
            backgroundImage: GRAIN,
            backgroundSize: "34% 34%",
            opacity: 0.32,
            mixBlendMode: "color-dodge",
          }}
        />

        {/* white-hot collapsing core */}
        <div
          className="star-core absolute inset-[22%] rounded-full"
          style={{
            background:
              "radial-gradient(circle, #ffffff 0%, #fff4d6 26%, rgba(255,196,110,0.65) 52%, rgba(255,140,50,0) 78%)",
            filter: "blur(3px)",
          }}
        />

        {/* limb darkening — makes it read as a sphere, not a disc */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 40% 35%, transparent 28%, rgba(150,30,6,0.3) 58%, rgba(96,14,3,0.7) 80%, rgba(22,3,1,0.96) 100%)",
          }}
        />

        {/* hot limb rim */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ boxShadow: "inset 0 0 22px 4px rgba(255,170,80,0.42)" }}
        />
      </div>

      {/* ---- eruptions, rings, ejecta ---- */}
      <svg
        viewBox="0 0 400 400"
        fill="none"
        className="absolute inset-0 block h-full w-full"
        role="presentation"
      >
        <defs>
          <linearGradient id="dsFlare" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffd9a0" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#ffb257" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#ff6a1f" stopOpacity="0.1" />
          </linearGradient>
          <filter id="dsGlow" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="3.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* prominence loops — rotate with the star */}
        <g className="star-rotor" filter="url(#dsGlow)">
          {PROMINENCES.map((p, i) => (
            <path
              key={i}
              d={loop(p.a0, p.a1, p.bulge)}
              fill="none"
              stroke="url(#dsFlare)"
              strokeWidth={p.w}
              strokeLinecap="round"
              opacity={0.75 + (i % 3) * 0.08}
            />
          ))}
        </g>

        {/* infalling debris ring */}
        <g className="star-rotor-rev">
          <ellipse
            cx="200"
            cy="200"
            rx="172"
            ry="46"
            fill="none"
            stroke="#ffb257"
            strokeOpacity="0.22"
            strokeWidth="1"
            strokeDasharray="2 7"
            transform="rotate(-18 200 200)"
          />
          <ellipse
            cx="200"
            cy="200"
            rx="150"
            ry="34"
            fill="none"
            stroke="#ff8a3d"
            strokeOpacity="0.3"
            strokeWidth="2.2"
            strokeDasharray="30 300"
            strokeLinecap="round"
            transform="rotate(-18 200 200)"
          />
        </g>

        {/* accretion arc + ejecta sparks */}
        <g className="star-rotor-slow">
          <circle
            cx="200"
            cy="200"
            r="146"
            fill="none"
            stroke="#ffd9a0"
            strokeOpacity="0.26"
            strokeWidth="1.3"
            strokeDasharray="84 380"
            strokeLinecap="round"
          />
          {[0.4, 1.7, 2.9, 4.1, 5.3].map((a, i) => {
            const [x, y] = pt(a, 132 + (i % 3) * 16);
            return (
              <circle
                key={a}
                cx={x}
                cy={y}
                r={1.6 + (i % 2)}
                fill="#ffd9a0"
                opacity={0.8}
              />
            );
          })}
        </g>

        {/* collapsing shockwave ring */}
        <circle
          className="star-shock"
          cx="200"
          cy="200"
          r="126"
          fill="none"
          stroke="#ffc477"
          strokeWidth="1.4"
        />
      </svg>

      {/* ---- anamorphic flare ---- */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[2px] w-[172%] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,206,140,0.05) 13%, rgba(255,236,200,0.8) 50%, rgba(255,206,140,0.05) 87%, transparent 100%)",
          filter: "blur(0.6px)",
        }}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-11 w-[138%] -translate-x-1/2 -translate-y-1/2 opacity-45"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,160,70,0.16) 26%, rgba(255,190,110,0.3) 50%, rgba(255,160,70,0.16) 74%, transparent 100%)",
          filter: "blur(17px)",
        }}
      />
    </div>
  );
}
