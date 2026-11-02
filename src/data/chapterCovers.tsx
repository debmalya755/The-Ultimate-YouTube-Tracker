import { memo } from "react";
import type { JSX } from "react";

/**
 * 400 deterministic CHAPTER covers — a different visual language from the
 * profile patterns: 16:9 landscape "cinematic plates" with atmospheric depth
 * (contours, ridgelines, radar, orbits, circuit traces, light shafts…).
 *
 * index 0..399 → family = index % 16, variant = floor(index / 16)
 * A bottom scrim is baked in so chapter names stay readable on the card.
 */
export const CHAPTER_COVER_COUNT = 400;

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Palette {
  bg: [string, string];
  a: string;
  b: string;
}

/* cinematic teal/amber grade — distinct from the profile palettes */
const PALETTES: Palette[] = [
  { bg: ["#0a1114", "#05080a"], a: "#5fb8c9", b: "#f0a65a" },
  { bg: ["#10100c", "#070705"], a: "#d9b36a", b: "#7ecef4" },
  { bg: ["#0c0f14", "#05070a"], a: "#7ea8d8", b: "#e10600" },
  { bg: ["#0e1210", "#060807"], a: "#86c9a8", b: "#d9b36a" },
  { bg: ["#120e0c", "#080605"], a: "#e0885a", b: "#8fb8c9" },
  { bg: ["#0b0d12", "#05060a"], a: "#9aa8c0", b: "#f0a65a" },
  { bg: ["#0d1012", "#060809"], a: "#6fc7d8", b: "#ededf0" },
  { bg: ["#100c10", "#070508"], a: "#c98fa8", b: "#7ecef4" },
  { bg: ["#0c100e", "#050807"], a: "#a8c986", b: "#e0885a" },
  { bg: ["#0e0d12", "#060509"], a: "#8f9ad8", b: "#d9b36a" },
];

const W = 800;
const H = 450;

type Rnd = () => number;

const arcPath = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const x0 = cx + Math.cos(a0) * r;
  const y0 = cy + Math.sin(a0) * r;
  const x1 = cx + Math.cos(a1) * r;
  const y1 = cy + Math.sin(a1) * r;
  return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 ${
    a1 - a0 > Math.PI ? 1 : 0
  } 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
};

const blob = (cx: number, cy: number, base: number, p1: number, p2: number) => {
  let d = "";
  for (let i = 0; i <= 72; i++) {
    const t = (i / 72) * Math.PI * 2;
    const r = base * (1 + 0.17 * Math.sin(3 * t + p1) + 0.11 * Math.sin(5 * t + p2));
    d += `${i ? "L" : "M"} ${(cx + Math.cos(t) * r).toFixed(1)} ${(
      cy + Math.sin(t) * r * 0.82
    ).toFixed(1)} `;
  }
  return d + "Z";
};

const families: ((r: Rnd, p: Palette, v: number, gid: string) => JSX.Element[])[] = [
  // 00 — topographic contours
  (r, p, v) => {
    const cx = 180 + r() * 440;
    const cy = 110 + r() * 200;
    const p1 = r() * 6;
    const p2 = r() * 6;
    const n = 10 + (v % 9);
    return Array.from({ length: n }, (_, i) => (
      <path
        key={i}
        d={blob(cx, cy, 18 + i * (200 / n), p1, p2)}
        fill="none"
        stroke={i % 4 === 0 ? p.b : p.a}
        strokeOpacity={0.62 - (i / n) * 0.42}
        strokeWidth={i % 4 === 0 ? 1.6 : 0.9}
      />
    ));
  },

  // 01 — layered ridgelines
  (r, p, v) => {
    const n = 7 + (v % 6);
    const ph = [r() * 6, r() * 6, r() * 6];
    return Array.from({ length: n }, (_, i) => {
      const base = 110 + i * (300 / n);
      const amp = 26 + r() * 60;
      let line = "";
      for (let x = 0; x <= W; x += 14) {
        const y =
          base -
          Math.abs(
            Math.sin(x * 0.008 + ph[0] + i) * amp +
              Math.sin(x * 0.021 + ph[1]) * amp * 0.5 +
              Math.sin(x * 0.052 + ph[2]) * amp * 0.22
          );
        line += `${x ? "L" : "M"} ${x} ${y.toFixed(1)} `;
      }
      return (
        <g key={i}>
          <path d={`${line}L ${W} ${H} L 0 ${H} Z`} fill={p.bg[1]} fillOpacity={0.88} />
          <path
            d={line}
            fill="none"
            stroke={i === n - 2 ? p.b : p.a}
            strokeOpacity={0.25 + (i / n) * 0.6}
            strokeWidth={i === n - 2 ? 1.8 : 1}
          />
        </g>
      );
    });
  },

  // 02 — waveform
  (r, p, v) => {
    const n = 90 + (v % 8) * 10;
    const bw = W / n;
    const mid = H * 0.52;
    const skew = 0.3 + r() * 0.4;
    return [
      <line key="base" x1={0} y1={mid} x2={W} y2={mid} stroke={p.a} strokeOpacity={0.25} strokeWidth={0.8} />,
      ...Array.from({ length: n }, (_, i) => {
        const t = i / n;
        const env = Math.pow(Math.sin(Math.PI * Math.min(1, t / skew)), 1.6);
        const h = Math.max(2, env * (0.25 + r() * 0.75) * 170);
        const hot = r() > 0.93;
        return (
          <rect
            key={i}
            x={i * bw + bw * 0.2}
            y={mid - h / 2}
            width={bw * 0.6}
            height={h}
            fill={hot ? p.b : p.a}
            fillOpacity={hot ? 0.85 : 0.3 + env * 0.4}
          />
        );
      }),
    ];
  },

  // 03 — radar sweep
  (r, p, v) => {
    const cx = r() > 0.5 ? 560 : 250;
    const cy = 210;
    const rings = 5 + (v % 4);
    const sweep = r() * Math.PI * 2;
    const out: JSX.Element[] = [];
    for (let i = 1; i <= rings; i++) {
      out.push(
        <circle key={`r${i}`} cx={cx} cy={cy} r={(i / rings) * 185} fill="none" stroke={p.a} strokeOpacity={0.3} strokeWidth={0.9} />
      );
    }
    out.push(
      <line key="h" x1={cx - 190} y1={cy} x2={cx + 190} y2={cy} stroke={p.a} strokeOpacity={0.22} strokeWidth={0.8} />,
      <line key="v" x1={cx} y1={cy - 190} x2={cx} y2={cy + 190} stroke={p.a} strokeOpacity={0.22} strokeWidth={0.8} />,
      <path
        key="sw"
        d={`M ${cx} ${cy} L ${cx + Math.cos(sweep) * 185} ${cy + Math.sin(sweep) * 185} ${arcPath(cx, cy, 185, sweep, sweep + 0.7).slice(arcPath(cx, cy, 185, sweep, sweep + 0.7).indexOf("A") - 1)} Z`}
        fill={p.a}
        fillOpacity={0.12}
      />
    );
    for (let i = 0; i < 6 + (v % 4); i++) {
      const t = r() * Math.PI * 2;
      const rad = 30 + r() * 150;
      const x = cx + Math.cos(t) * rad;
      const y = cy + Math.sin(t) * rad;
      out.push(
        <g key={`b${i}`}>
          <circle cx={x} cy={y} r={2.4} fill={p.b} />
          <circle cx={x} cy={y} r={6.5} fill="none" stroke={p.b} strokeOpacity={0.4} strokeWidth={0.8} />
        </g>
      );
    }
    return out;
  },

  // 04 — constellation
  (r, p, v) => {
    const out: JSX.Element[] = [];
    for (let i = 0; i < 70 + (v % 6) * 12; i++) {
      out.push(
        <circle key={`s${i}`} cx={r() * W} cy={r() * H * 0.9} r={0.5 + r() * 1.3} fill={p.a} fillOpacity={0.2 + r() * 0.55} />
      );
    }
    const anchors = Array.from({ length: 6 + (v % 4) }, () => ({
      x: 60 + r() * (W - 120),
      y: 40 + r() * (H - 160),
    }));
    anchors.forEach((a, i) => {
      const b = anchors[(i + 1) % anchors.length];
      out.push(
        <line key={`l${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={p.a} strokeOpacity={0.35} strokeWidth={0.8} />,
        <circle key={`a${i}`} cx={a.x} cy={a.y} r={2.6} fill={i % 3 === 0 ? p.b : p.a} />,
        <circle key={`g${i}`} cx={a.x} cy={a.y} r={7} fill="none" stroke={p.a} strokeOpacity={0.3} strokeWidth={0.7} />
      );
    });
    return out;
  },

  // 05 — horizon grid
  (r, p, v, gid) => {
    const hy = 180 + r() * 60;
    const vx = 240 + r() * 320;
    const out: JSX.Element[] = [
      <defs key="d">
        <radialGradient id={`${gid}sun`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={p.b} stopOpacity="0.75" />
          <stop offset="100%" stopColor={p.b} stopOpacity="0" />
        </radialGradient>
      </defs>,
      <circle key="sun" cx={vx} cy={hy - 34} r={64 + (v % 5) * 10} fill={`url(#${gid}sun)`} />,
      <line key="hz" x1={0} y1={hy} x2={W} y2={hy} stroke={p.a} strokeOpacity={0.55} strokeWidth={1} />,
    ];
    for (let k = -11; k <= 11; k++) {
      out.push(
        <line key={`v${k}`} x1={vx} y1={hy} x2={vx + k * 110} y2={H + 20} stroke={p.a} strokeOpacity={0.26} strokeWidth={0.8} />
      );
    }
    for (let i = 1; i <= 9; i++) {
      const y = hy + (H - hy) * Math.pow(i / 9, 1.9);
      out.push(
        <line key={`h${i}`} x1={0} y1={y} x2={W} y2={y} stroke={p.a} strokeOpacity={0.2 + (i / 9) * 0.25} strokeWidth={0.8} />
      );
    }
    for (let i = 0; i < 26; i++) {
      out.push(
        <circle key={`st${i}`} cx={r() * W} cy={r() * (hy - 30)} r={0.6 + r()} fill={p.a} fillOpacity={0.3 + r() * 0.4} />
      );
    }
    return out;
  },

  // 06 — light shafts
  (r, p, v, gid) => {
    const n = 4 + (v % 4);
    const drift = 120 + r() * 160;
    return [
      <defs key="d">
        <linearGradient id={`${gid}beam`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.a} stopOpacity="0.4" />
          <stop offset="100%" stopColor={p.a} stopOpacity="0" />
        </linearGradient>
      </defs>,
      ...Array.from({ length: n }, (_, i) => {
        const x = 40 + r() * (W - 200);
        const w = 26 + r() * 90;
        return (
          <g key={i}>
            <polygon
              points={`${x},0 ${x + w},0 ${x + w + drift},${H} ${x + drift},${H}`}
              fill={`url(#${gid}beam)`}
              opacity={0.35 + r() * 0.5}
            />
            <line x1={x} y1={0} x2={x + drift} y2={H} stroke={i === 0 ? p.b : p.a} strokeOpacity={0.4} strokeWidth={0.9} />
          </g>
        );
      }),
      <ellipse key="fl" cx={W * 0.55} cy={H} rx={330} ry={40} fill={p.a} fillOpacity={0.08} />,
    ];
  },

  // 07 — orbital diagram
  (r, p, v) => {
    const cx = 280 + r() * 240;
    const cy = 215;
    const n = 4 + (v % 4);
    const tilt = -14 + r() * 28;
    const out: JSX.Element[] = [
      <circle key="star" cx={cx} cy={cy} r={9} fill={p.b} />,
      <circle key="glow" cx={cx} cy={cy} r={22} fill="none" stroke={p.b} strokeOpacity={0.35} strokeWidth={1} />,
    ];
    for (let i = 1; i <= n; i++) {
      const rx = 55 + i * (300 / n);
      const ry = rx * (0.3 + r() * 0.16);
      const t = r() * Math.PI * 2;
      out.push(
        <g key={i} transform={`rotate(${tilt} ${cx} ${cy})`}>
          <ellipse
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            fill="none"
            stroke={p.a}
            strokeOpacity={0.4}
            strokeWidth={0.9}
            strokeDasharray={i === n ? "4 6" : undefined}
          />
          <circle cx={cx + Math.cos(t) * rx} cy={cy + Math.sin(t) * ry} r={3 + r() * 3} fill={i % 2 ? p.a : p.b} />
        </g>
      );
    }
    return out;
  },

  // 08 — circuit traces
  (r, p, v) => {
    const out: JSX.Element[] = [];
    for (let gy = 20; gy < H; gy += 34) {
      for (let gx = 20; gx < W; gx += 34) {
        out.push(<circle key={`d${gx}-${gy}`} cx={gx} cy={gy} r={0.7} fill={p.a} fillOpacity={0.12} />);
      }
    }
    const n = 8 + (v % 7);
    for (let i = 0; i < n; i++) {
      let x = -10;
      let y = 30 + r() * (H - 90);
      let d = `M ${x} ${y}`;
      const segs = 3 + Math.floor(r() * 4);
      for (let s = 0; s < segs; s++) {
        x += 60 + r() * 160;
        d += ` L ${x} ${y}`;
        if (s < segs - 1) {
          y = Math.max(24, Math.min(H - 60, y + (r() - 0.5) * 160));
          d += ` L ${x} ${y}`;
        }
      }
      const hot = i % 4 === 0;
      out.push(
        <g key={`t${i}`}>
          <path d={d} fill="none" stroke={hot ? p.b : p.a} strokeOpacity={hot ? 0.75 : 0.42} strokeWidth={hot ? 1.6 : 1.1} />
          <circle cx={x} cy={y} r={3.2} fill={p.bg[1]} stroke={hot ? p.b : p.a} strokeWidth={1.2} />
          <circle cx={x} cy={y} r={6.4} fill="none" stroke={hot ? p.b : p.a} strokeOpacity={0.35} strokeWidth={0.8} />
        </g>
      );
    }
    return out;
  },

  // 09 — shards
  (r, p, v) => {
    const n = 5 + (v % 5);
    const fromLeft = r() > 0.5;
    return Array.from({ length: n }, (_, i) => {
      const y0 = r() * H;
      const spread = 90 + r() * 220;
      const x0 = fromLeft ? -40 : W + 40;
      const x1 = fromLeft ? W * (0.5 + r() * 0.6) : W * (0.5 - r() * 0.6);
      return (
        <g key={i}>
          <polygon
            points={`${x0},${y0} ${x1},${y0 - spread / 2} ${x1},${y0 + spread / 2}`}
            fill={i === 1 ? p.b : p.a}
            fillOpacity={0.05 + r() * 0.12}
            stroke={p.a}
            strokeOpacity={0.3}
            strokeWidth={0.8}
          />
          <line x1={x0} y1={y0} x2={x1} y2={y0 - spread / 2} stroke={i === 1 ? p.b : p.a} strokeOpacity={0.6} strokeWidth={1} />
        </g>
      );
    });
  },

  // 10 — halftone field + ring
  (r, p, v) => {
    const cx = 220 + r() * 360;
    const cy = 140 + r() * 160;
    const R = 110 + (v % 6) * 14;
    const out: JSX.Element[] = [];
    let k = 0;
    for (let y = 14; y < H; y += 24) {
      for (let x = 14; x < W; x += 24) {
        const d = Math.hypot(x - cx, y - cy);
        const inside = d < R;
        const rr = inside ? 2 + (1 - d / R) * 6.5 : Math.max(0.7, 3.4 - (x / W) * 2.4);
        out.push(
          <circle key={k++} cx={x} cy={y} r={rr} fill={inside ? p.b : p.a} fillOpacity={inside ? 0.6 : 0.28} />
        );
      }
    }
    out.push(
      <circle key="ring" cx={cx} cy={cy} r={R} fill="none" stroke={p.a} strokeOpacity={0.6} strokeWidth={1.2} />
    );
    return out;
  },

  // 11 — eclipse
  (r, p, v) => {
    const cx = 480 + r() * 160;
    const cy = 170 + r() * 90;
    const R = 105 + (v % 6) * 9;
    const a0 = -0.7 + r() * 1.4;
    const out: JSX.Element[] = [];
    for (let i = 0; i < 40; i++) {
      out.push(<circle key={i} cx={r() * W} cy={r() * H} r={0.5 + r()} fill={p.a} fillOpacity={0.25 + r() * 0.4} />);
    }
    out.push(
      <circle key="halo" cx={cx} cy={cy} r={R + 14} fill="none" stroke={p.a} strokeOpacity={0.18} strokeWidth={10} />,
      <circle key="body" cx={cx} cy={cy} r={R} fill="#04060a" stroke={p.a} strokeOpacity={0.35} strokeWidth={1} />,
      <path key="rim" d={arcPath(cx, cy, R, a0, a0 + 1.5)} fill="none" stroke={p.b} strokeOpacity={0.95} strokeWidth={2.6} strokeLinecap="round" />,
      <line key="fl" x1={0} y1={cy} x2={W} y2={cy} stroke={p.b} strokeOpacity={0.22} strokeWidth={1} />
    );
    return out;
  },

  // 12 — scan bands
  (r, p, v) => {
    const out: JSX.Element[] = [];
    let y = 0;
    let k = 0;
    while (y < H) {
      const h = 3 + r() * 26;
      out.push(
        <rect key={k++} x={0} y={y} width={W} height={h} fill={p.a} fillOpacity={0.03 + r() * 0.14} />
      );
      if (r() > 0.72) {
        out.push(
          <rect key={k++} x={r() * (W - 220)} y={y} width={60 + r() * 180} height={Math.min(h, 5)} fill={p.b} fillOpacity={0.55} />
        );
      }
      y += h + r() * 8;
    }
    out.push(
      <rect key="bar" x={560 + (v % 8) * 22} y={0} width={2} height={H} fill={p.b} fillOpacity={0.7} />
    );
    return out;
  },

  // 13 — flow field
  (r, p, v) => {
    const n = 14 + (v % 9);
    const f1 = 0.006 + r() * 0.006;
    const f2 = 0.017 + r() * 0.012;
    const p1 = r() * 6;
    const p2 = r() * 6;
    return Array.from({ length: n }, (_, i) => {
      const y0 = (i + 0.5) * (H / n);
      let d = "";
      for (let x = -10; x <= W + 10; x += 12) {
        const y =
          y0 + Math.sin(x * f1 + p1 + i * 0.4) * 34 + Math.sin(x * f2 + p2) * 14;
        d += `${x <= -10 + 12 ? "M" : "L"} ${x} ${y.toFixed(1)} `;
      }
      return (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={i % 5 === 0 ? p.b : p.a}
          strokeOpacity={i % 5 === 0 ? 0.7 : 0.22 + (i / n) * 0.3}
          strokeWidth={i % 5 === 0 ? 1.5 : 0.9}
        />
      );
    });
  },

  // 14 — blueprint
  (r, p, v) => {
    const out: JSX.Element[] = [];
    for (let x = 0; x <= W; x += 40) {
      out.push(<line key={`gx${x}`} x1={x} y1={0} x2={x} y2={H} stroke={p.a} strokeOpacity={0.07} strokeWidth={0.7} />);
    }
    for (let y = 0; y <= H; y += 40) {
      out.push(<line key={`gy${y}`} x1={0} y1={y} x2={W} y2={y} stroke={p.a} strokeOpacity={0.07} strokeWidth={0.7} />);
    }
    for (let i = 0; i < 3 + (v % 3); i++) {
      const w = 90 + r() * 220;
      const h = 60 + r() * 150;
      const x = 30 + r() * (W - w - 60);
      const y = 30 + r() * (H - h - 80);
      out.push(
        <rect key={`r${i}`} x={x} y={y} width={w} height={h} fill="none" stroke={i === 0 ? p.b : p.a} strokeOpacity={0.6} strokeWidth={1.1} strokeDasharray="7 5" />,
        <line key={`dl${i}`} x1={x} y1={y + h + 14} x2={x + w} y2={y + h + 14} stroke={p.a} strokeOpacity={0.45} strokeWidth={0.8} />,
        <line key={`t1${i}`} x1={x} y1={y + h + 9} x2={x} y2={y + h + 19} stroke={p.a} strokeOpacity={0.45} strokeWidth={0.8} />,
        <line key={`t2${i}`} x1={x + w} y1={y + h + 9} x2={x + w} y2={y + h + 19} stroke={p.a} strokeOpacity={0.45} strokeWidth={0.8} />
      );
    }
    const cx = 120 + r() * (W - 240);
    const cy = 100 + r() * (H - 220);
    const R = 40 + r() * 55;
    out.push(
      <circle key="c" cx={cx} cy={cy} r={R} fill="none" stroke={p.b} strokeOpacity={0.7} strokeWidth={1.2} />,
      <line key="ch" x1={cx - R - 12} y1={cy} x2={cx + R + 12} y2={cy} stroke={p.a} strokeOpacity={0.4} strokeWidth={0.8} />,
      <line key="cv" x1={cx} y1={cy - R - 12} x2={cx} y2={cy + R + 12} stroke={p.a} strokeOpacity={0.4} strokeWidth={0.8} />
    );
    return out;
  },

  // 15 — data rain
  (r, p, v) => {
    const n = 60 + (v % 8) * 8;
    return Array.from({ length: n }, (_, i) => {
      const x = Math.round((r() * W) / 14) * 14;
      const y = r() * H;
      const len = 18 + r() * 130;
      const hot = r() > 0.9;
      return (
        <g key={i}>
          <line
            x1={x}
            y1={y}
            x2={x}
            y2={Math.min(H, y + len)}
            stroke={hot ? p.b : p.a}
            strokeOpacity={hot ? 0.8 : 0.14 + r() * 0.35}
            strokeWidth={hot ? 1.8 : 1}
          />
          {hot && <circle cx={x} cy={Math.min(H, y + len)} r={2} fill={p.b} />}
        </g>
      );
    });
  },
];

/* --------------------------------- cover -------------------------------- */

function ChapterCoverImpl({
  index,
  className = "",
}: {
  index: number;
  className?: string;
}) {
  const i =
    ((index % CHAPTER_COVER_COUNT) + CHAPTER_COVER_COUNT) % CHAPTER_COVER_COUNT;
  const family = i % families.length;
  const variant = Math.floor(i / families.length);
  const palette = PALETTES[(i * 3 + variant * 7) % PALETTES.length];
  const rnd = mulberry32(i * 40503 + 987654321);
  const gid = `cc${i}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="presentation"
      aria-hidden
    >
      <defs>
        <linearGradient id={`${gid}bg`} x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor={palette.bg[0]} />
          <stop offset="100%" stopColor={palette.bg[1]} />
        </linearGradient>
        <linearGradient id={`${gid}sc`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="46%" stopColor="#04060a" stopOpacity="0" />
          <stop offset="100%" stopColor="#04060a" stopOpacity="0.9" />
        </linearGradient>
        <radialGradient id={`${gid}vg`} cx="50%" cy="42%" r="80%">
          <stop offset="58%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.55" />
        </radialGradient>
        <clipPath id={`${gid}cl`}>
          <rect width={W} height={H} />
        </clipPath>
      </defs>

      <rect width={W} height={H} fill={`url(#${gid}bg)`} />
      <g clipPath={`url(#${gid}cl)`}>{families[family](rnd, palette, variant, gid)}</g>
      <rect width={W} height={H} fill={`url(#${gid}vg)`} />
      <rect width={W} height={H} fill={`url(#${gid}sc)`} />
      <rect
        x="0.5"
        y="0.5"
        width={W - 1}
        height={H - 1}
        fill="none"
        stroke="rgba(237,237,240,0.1)"
      />
    </svg>
  );
}

export const ChapterCover = memo(ChapterCoverImpl);
