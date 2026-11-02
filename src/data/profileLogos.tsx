import { memo } from "react";
import type { JSX } from "react";

/**
 * 500 deterministic ROUND profile emblems.
 *
 * index 0..499 → family = index % 25, variant = floor(index / 25)
 * Seeded PRNG, so an index always renders identical artwork and only the
 * number needs persisting.
 *
 * Everything is clipped to a circle, so the emblem is round by construction.
 */
export const LOGO_COUNT = 500;

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface P {
  bg: [string, string];
  a: string;
  b: string;
  c: string;
}

/* loud, high-voltage palettes */
const PALETTES: P[] = [
  { bg: ["#0a0f1a", "#03060c"], a: "#00e5ff", b: "#ff2bd6", c: "#faff00" },
  { bg: ["#140512", "#07020a"], a: "#ff2bd6", b: "#7c4dff", c: "#00ffc8" },
  { bg: ["#06140c", "#020806"], a: "#2bff88", b: "#faff00", c: "#00e5ff" },
  { bg: ["#160a04", "#080302"], a: "#ff8a1f", b: "#ff2b5e", c: "#ffd166" },
  { bg: ["#0b0b16", "#040409"], a: "#8c7bff", b: "#00e5ff", c: "#ff6bd6" },
  { bg: ["#150406", "#080203"], a: "#ff2b5e", b: "#ffd166", c: "#ededf0" },
  { bg: ["#04121a", "#01070c"], a: "#19d3ff", b: "#aaff00", c: "#ffffff" },
  { bg: ["#101006", "#070703"], a: "#faff00", b: "#ff8a1f", c: "#2bff88" },
  { bg: ["#0d0616", "#05020a"], a: "#c04dff", b: "#00ffc8", c: "#ff2bd6" },
  { bg: ["#0a1414", "#030808"], a: "#00ffc8", b: "#ededf0", c: "#19d3ff" },
];

const C = 100;
const RAD = 96;

const P2 = (a: number, r: number): [number, number] => [
  C + Math.cos(a) * r,
  C + Math.sin(a) * r,
];
const f = (n: number) => n.toFixed(1);
const poly = (n: number, r: number, rot = 0, cx = C, cy = C) =>
  Array.from({ length: n }, (_, i) => {
    const t = rot + (i / n) * Math.PI * 2;
    return `${f(cx + Math.cos(t) * r)},${f(cy + Math.sin(t) * r)}`;
  }).join(" ");
const arc = (r: number, a0: number, a1: number, cx = C, cy = C) => {
  const [x0, y0] = [cx + Math.cos(a0) * r, cy + Math.sin(a0) * r];
  const [x1, y1] = [cx + Math.cos(a1) * r, cy + Math.sin(a1) * r];
  return `M ${f(x0)} ${f(y0)} A ${f(r)} ${f(r)} 0 ${
    a1 - a0 > Math.PI ? 1 : 0
  } 1 ${f(x1)} ${f(y1)}`;
};

type R = () => number;

const families: ((r: R, p: P, v: number) => JSX.Element[])[] = [
  // 00 — mandala petals
  (_r, p, v) => {
    const rings = 3 + (v % 4);
    const out: JSX.Element[] = [];
    for (let k = 0; k < rings; k++) {
      const n = 6 + k * 4 + (v % 3);
      const rr = 26 + k * (62 / rings);
      for (let i = 0; i < n; i++) {
        const t = (i / n) * Math.PI * 2 + k * 0.3;
        const [x, y] = P2(t, rr);
        out.push(
          <ellipse
            key={`${k}-${i}`}
            cx={x}
            cy={y}
            rx={13 - k * 2}
            ry={5.5}
            fill="none"
            stroke={k % 2 ? p.b : p.a}
            strokeOpacity={0.85}
            strokeWidth={1.1}
            transform={`rotate(${(t * 180) / Math.PI} ${f(x)} ${f(y)})`}
          />
        );
      }
    }
    out.push(<circle key="co" cx={C} cy={C} r={9} fill={p.c} />);
    return out;
  },

  // 01 — occult sigil
  (_r, p, v) => {
    const n = 5 + (v % 4);
    const step = 2 + (v % 2);
    const pts = Array.from({ length: n }, (_, i) => P2((i / n) * Math.PI * 2 - Math.PI / 2, 64));
    const out: JSX.Element[] = [
      <circle key="r1" cx={C} cy={C} r={78} fill="none" stroke={p.a} strokeOpacity={0.5} strokeWidth={1} />,
      <circle key="r2" cx={C} cy={C} r={68} fill="none" stroke={p.a} strokeOpacity={0.3} strokeWidth={0.7} />,
    ];
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + step) % n];
      out.push(
        <line key={`s${i}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={p.b} strokeOpacity={0.95} strokeWidth={1.6} />
      );
    }
    pts.forEach(([x, y], i) => {
      out.push(<circle key={`n${i}`} cx={x} cy={y} r={4} fill={p.c} />);
      const [gx, gy] = P2((i / n) * Math.PI * 2 - Math.PI / 2, 73);
      out.push(
        <rect key={`g${i}`} x={gx - 2} y={gy - 2} width={4} height={4} fill={p.a} transform={`rotate(45 ${f(gx)} ${f(gy)})`} />
      );
    });
    return out;
  },

  // 02 — shuriken blades
  (_r, p, v) => {
    const n = 3 + (v % 6);
    return Array.from({ length: n }, (_, i) => {
      const t = (i / n) * Math.PI * 2;
      const [x1, y1] = P2(t, 86);
      const [x2, y2] = P2(t + 0.55, 30);
      const [x3, y3] = P2(t - 0.3, 22);
      return (
        <polygon
          key={i}
          points={`${f(x1)},${f(y1)} ${f(x2)},${f(y2)} ${f(x3)},${f(y3)}`}
          fill={i % 2 ? p.a : p.b}
          fillOpacity={0.9}
          stroke={p.c}
          strokeOpacity={0.6}
          strokeWidth={0.8}
        />
      );
    }).concat(<circle key="h" cx={C} cy={C} r={11} fill="none" stroke={p.c} strokeWidth={2.4} />);
  },

  // 03 — spirograph
  (_r, p, v) => {
    const Rr = 70;
    const rr = 12 + (v % 9) * 3;
    const d = 20 + (v % 7) * 5;
    let path = "";
    for (let i = 0; i <= 720; i += 3) {
      const t = (i * Math.PI) / 180;
      const k = (Rr - rr) / rr;
      const x = C + (Rr - rr) * Math.cos(t) + d * Math.cos(k * t);
      const y = C + (Rr - rr) * Math.sin(t) - d * Math.sin(k * t);
      path += `${i ? "L" : "M"} ${f(x)} ${f(y)} `;
    }
    return [
      <path key="s" d={path} fill="none" stroke={p.a} strokeOpacity={0.95} strokeWidth={1.1} />,
      <path key="s2" d={path} fill="none" stroke={p.b} strokeOpacity={0.5} strokeWidth={1.1} transform={`rotate(${12 + (v % 5) * 6} ${C} ${C})`} />,
    ];
  },

  // 04 — the eye
  (_r, p, v) => {
    const out: JSX.Element[] = [];
    const fibers = 40 + (v % 6) * 8;
    for (let i = 0; i < fibers; i++) {
      const t = (i / fibers) * Math.PI * 2;
      const [x1, y1] = P2(t, 22);
      const [x2, y2] = P2(t, 46 + (i % 3) * 7);
      out.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i % 4 ? p.a : p.c} strokeOpacity={0.75} strokeWidth={1} />);
    }
    out.push(
      <circle key="ir" cx={C} cy={C} r={52} fill="none" stroke={p.b} strokeWidth={2.4} />,
      <circle key="pu" cx={C} cy={C} r={19} fill="#05070a" stroke={p.c} strokeWidth={1.6} />,
      <circle key="gl" cx={C - 7} cy={C - 7} r={5} fill={p.c} fillOpacity={0.9} />,
      <path key="lid" d={`M 8 100 Q 100 ${18 + (v % 5) * 6} 192 100`} fill="none" stroke={p.c} strokeOpacity={0.55} strokeWidth={2} />,
      <path key="lid2" d={`M 8 100 Q 100 ${182 - (v % 5) * 6} 192 100`} fill="none" stroke={p.c} strokeOpacity={0.55} strokeWidth={2} />
    );
    return out;
  },

  // 05 — vortex
  (_r, p, v) => {
    const arms = 3 + (v % 7);
    return Array.from({ length: arms }, (_, k) => {
      let d = "";
      for (let i = 0; i <= 90; i++) {
        const t = (i / 90) * 3.4 + (k / arms) * Math.PI * 2;
        const rr = 8 + (i / 90) * 88;
        const [x, y] = P2(t, rr);
        d += `${i ? "L" : "M"} ${f(x)} ${f(y)} `;
      }
      return (
        <path key={k} d={d} fill="none" stroke={k % 2 ? p.a : p.b} strokeOpacity={0.9} strokeWidth={2.2} strokeLinecap="round" />
      );
    });
  },

  // 06 — kaleidoscope polygons
  (_r, p, v) => {
    const sides = 3 + (v % 6);
    const n = 9 + (v % 8);
    return Array.from({ length: n }, (_, i) => (
      <polygon
        key={i}
        points={poly(sides, 12 + i * (80 / n), i * 0.42)}
        fill="none"
        stroke={i % 3 === 0 ? p.b : i % 3 === 1 ? p.a : p.c}
        strokeOpacity={0.85}
        strokeWidth={1.1}
        strokeLinejoin="round"
      />
    ));
  },

  // 07 — atom
  (r, p, v) => {
    const n = 2 + (v % 4);
    const out: JSX.Element[] = [];
    for (let i = 0; i < n; i++) {
      const rot = (i / n) * 180;
      out.push(
        <ellipse key={`o${i}`} cx={C} cy={C} rx={84} ry={30 + (v % 3) * 6} fill="none" stroke={p.a} strokeOpacity={0.8} strokeWidth={1.4} transform={`rotate(${rot} ${C} ${C})`} />
      );
      const t = r() * Math.PI * 2;
      const ex = C + Math.cos(t) * 84;
      const ey = C + Math.sin(t) * (30 + (v % 3) * 6);
      const rad = (rot * Math.PI) / 180;
      const rx = C + (ex - C) * Math.cos(rad) - (ey - C) * Math.sin(rad);
      const ry = C + (ex - C) * Math.sin(rad) + (ey - C) * Math.cos(rad);
      out.push(<circle key={`e${i}`} cx={rx} cy={ry} r={5} fill={p.c} />);
    }
    out.push(
      <circle key="nu" cx={C} cy={C} r={14} fill={p.b} />,
      <circle key="nu2" cx={C} cy={C} r={21} fill="none" stroke={p.b} strokeOpacity={0.45} strokeWidth={1} />
    );
    return out;
  },

  // 08 — sunburst
  (_r, p, v) => {
    const n = 16 + (v % 10) * 4;
    return Array.from({ length: n }, (_, i) => {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 0.5) / n) * Math.PI * 2;
      const rr = i % 2 ? 94 : 58 + (v % 4) * 6;
      const [x1, y1] = P2(a0, rr);
      const [x2, y2] = P2(a1, rr);
      return (
        <polygon key={i} points={`${C},${C} ${f(x1)},${f(y1)} ${f(x2)},${f(y2)}`} fill={i % 2 ? p.a : p.b} fillOpacity={i % 2 ? 0.85 : 0.45} />
      );
    }).concat(<circle key="c" cx={C} cy={C} r={16} fill={p.c} />);
  },

  // 09 — interference ripples
  (r, p, v) => {
    const srcs = 2 + (v % 2);
    const out: JSX.Element[] = [];
    for (let s = 0; s < srcs; s++) {
      // keep sources near the centre so the pattern always fills the disc
      const cx = 72 + r() * 56;
      const cy = 72 + r() * 56;
      for (let i = 1; i <= 12; i++) {
        out.push(
          <circle
            key={`${s}-${i}`}
            cx={cx}
            cy={cy}
            r={i * 8.5}
            fill="none"
            stroke={s % 2 ? p.b : p.a}
            strokeOpacity={0.9 - i * 0.035}
            strokeWidth={1.5}
          />
        );
      }
      out.push(<circle key={`c${s}`} cx={cx} cy={cy} r={4} fill={p.c} />);
    }
    return out;
  },

  // 10 — radial fractal tree
  (_r, p, v) => {
    const out: JSX.Element[] = [];
    const branches = 5 + (v % 6);
    const grow = (x: number, y: number, ang: number, len: number, depth: number) => {
      if (depth === 0 || len < 3) return;
      const x2 = x + Math.cos(ang) * len;
      const y2 = y + Math.sin(ang) * len;
      out.push(
        <line key={`${x}-${y}-${depth}-${ang}`} x1={f(x) as unknown as number} y1={f(y) as unknown as number} x2={f(x2) as unknown as number} y2={f(y2) as unknown as number}
          stroke={depth > 2 ? p.a : p.c} strokeOpacity={0.4 + depth * 0.14} strokeWidth={depth * 0.5} strokeLinecap="round" />
      );
      const spread = 0.42 + (v % 4) * 0.08;
      grow(x2, y2, ang - spread, len * 0.68, depth - 1);
      grow(x2, y2, ang + spread, len * 0.68, depth - 1);
    };
    for (let i = 0; i < branches; i++) {
      const a = (i / branches) * Math.PI * 2;
      grow(C + Math.cos(a) * 10, C + Math.sin(a) * 10, a, 26, 4);
    }
    out.push(<circle key="c" cx={C} cy={C} r={7} fill={p.b} />);
    return out;
  },

  // 11 — shatter
  (r, p, v) => {
    const n = 7 + (v % 8);
    const out: JSX.Element[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.3;
      let d = `M ${C} ${C}`;
      let rr = 0;
      let aa = a;
      while (rr < 94) {
        rr += 18 + r() * 20;
        aa += (r() - 0.5) * 0.5;
        const [x, y] = P2(aa, Math.min(rr, 94));
        d += ` L ${f(x)} ${f(y)}`;
      }
      out.push(<path key={i} d={d} fill="none" stroke={i % 3 === 0 ? p.c : p.a} strokeOpacity={0.9} strokeWidth={i % 3 === 0 ? 2 : 1.1} />);
    }
    out.push(<circle key="h" cx={C} cy={C} r={6 + (v % 4) * 2} fill={p.b} />);
    return out;
  },

  // 12 — gear
  (_r, p, v) => {
    const teeth = 8 + (v % 10);
    const out: JSX.Element[] = [];
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      const [x, y] = P2(a, 80);
      out.push(
        <rect key={i} x={x - 8} y={y - 7} width={16} height={14} rx={2} fill={p.a} transform={`rotate(${(a * 180) / Math.PI} ${f(x)} ${f(y)})`} />
      );
    }
    out.push(
      <circle key="r" cx={C} cy={C} r={74} fill="none" stroke={p.a} strokeWidth={10} />,
      <circle key="r2" cx={C} cy={C} r={54} fill="none" stroke={p.b} strokeOpacity={0.8} strokeWidth={2} />,
      <circle key="h" cx={C} cy={C} r={20} fill="none" stroke={p.c} strokeWidth={3} />
    );
    for (let i = 0; i < 5 + (v % 4); i++) {
      const a = (i / (5 + (v % 4))) * Math.PI * 2;
      const [x, y] = P2(a, 38);
      out.push(<circle key={`b${i}`} cx={x} cy={y} r={5} fill={p.c} fillOpacity={0.7} />);
    }
    return out;
  },

  // 13 — labyrinth
  (r, p, v) => {
    const rings = 7 + (v % 7);
    return Array.from({ length: rings }, (_, i) => {
      const rr = 14 + i * (80 / rings);
      const gap = 0.5 + r() * 1.6;
      const start = r() * Math.PI * 2;
      return (
        <path key={i} d={arc(rr, start, start + Math.PI * 2 - gap)} fill="none" stroke={i % 3 === 0 ? p.b : p.a} strokeOpacity={0.9} strokeWidth={2.2} strokeLinecap="round" />
      );
    });
  },

  // 14 — radial checker warp
  (_r, p, v) => {
    const seg = 10 + (v % 8) * 2;
    const rings = 5 + (v % 4);
    const out: JSX.Element[] = [];
    for (let k = 0; k < rings; k++) {
      const r0 = 10 + k * (86 / rings);
      const r1 = 10 + (k + 1) * (86 / rings);
      for (let i = 0; i < seg; i++) {
        if ((i + k) % 2) continue;
        const a0 = (i / seg) * Math.PI * 2 + k * 0.12;
        const a1 = ((i + 1) / seg) * Math.PI * 2 + k * 0.12;
        const [x0, y0] = P2(a0, r0);
        const [x1, y1] = P2(a1, r0);
        const [x2, y2] = P2(a1, r1);
        const [x3, y3] = P2(a0, r1);
        out.push(
          <polygon key={`${k}-${i}`} points={`${f(x0)},${f(y0)} ${f(x1)},${f(y1)} ${f(x2)},${f(y2)} ${f(x3)},${f(y3)}`} fill={k % 2 ? p.a : p.b} fillOpacity={0.85} />
        );
      }
    }
    return out;
  },

  // 15 — molecular lattice
  (r, p, v) => {
    const n = 7 + (v % 7);
    const nodes = Array.from({ length: n }, () => ({
      x: 26 + r() * 148,
      y: 26 + r() * 148,
      s: 3 + r() * 5,
    }));
    const out: JSX.Element[] = [];
    nodes.forEach((a, i) =>
      nodes.forEach((b, j) => {
        if (j <= i) return;
        if (Math.hypot(a.x - b.x, a.y - b.y) < 72) {
          out.push(<line key={`l${i}-${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={p.a} strokeOpacity={0.55} strokeWidth={1} />);
        }
      })
    );
    nodes.forEach((nd, i) => {
      out.push(<circle key={`n${i}`} cx={nd.x} cy={nd.y} r={nd.s} fill={i % 3 === 0 ? p.c : p.b} />);
    });
    return out;
  },

  // 16 — radial chevrons
  (_r, p, v) => {
    const n = 5 + (v % 7);
    const out: JSX.Element[] = [];
    for (let k = 0; k < n; k++) {
      const rr = 22 + k * (72 / n);
      const pts = 12 + (v % 6) * 2;
      let d = "";
      for (let i = 0; i <= pts; i++) {
        const t = (i / pts) * Math.PI * 2;
        const rad = rr + (i % 2 ? 9 : -9);
        const [x, y] = P2(t, rad);
        d += `${i ? "L" : "M"} ${f(x)} ${f(y)} `;
      }
      out.push(<path key={k} d={`${d}Z`} fill="none" stroke={k % 2 ? p.b : p.a} strokeOpacity={0.9} strokeWidth={1.4} strokeLinejoin="round" />);
    }
    return out;
  },

  // 17 — angular shards
  (r, p, v) => {
    const n = 8 + (v % 9);
    return Array.from({ length: n }, (_, i) => {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 1) / n) * Math.PI * 2;
      const r0 = 20 + r() * 30;
      const r1 = 60 + r() * 36;
      const [x0, y0] = P2(a0, r0);
      const [x1, y1] = P2(a1, r0);
      const [x2, y2] = P2((a0 + a1) / 2, r1);
      return (
        <polygon key={i} points={`${f(x0)},${f(y0)} ${f(x1)},${f(y1)} ${f(x2)},${f(y2)}`}
          fill={i % 3 === 0 ? p.c : i % 3 === 1 ? p.a : p.b} fillOpacity={0.3 + (i % 4) * 0.18}
          stroke={p.c} strokeOpacity={0.5} strokeWidth={0.7} />
      );
    });
  },

  // 18 — dual swirl
  (_r, p, v) => {
    const out: JSX.Element[] = [
      <path key="y" d={`M ${C} 6 A 47 47 0 0 1 ${C} 100 A 47 47 0 0 0 ${C} 194 A 94 94 0 0 1 ${C} 6 Z`} fill={p.a} />,
      <circle key="d1" cx={C} cy={53} r={13} fill={p.bg[1]} />,
      <circle key="d2" cx={C} cy={147} r={13} fill={p.a} />,
    ];
    const rings = 2 + (v % 4);
    for (let i = 0; i < rings; i++) {
      out.push(
        <circle key={`r${i}`} cx={C} cy={C} r={66 - i * 9} fill="none" stroke={p.b} strokeOpacity={0.4} strokeWidth={0.9} strokeDasharray={`${2 + i} ${5 + i * 2}`} />
      );
    }
    return out;
  },

  // 19 — crystal facets
  (_r, p, v) => {
    const n = 6 + (v % 5);
    const outer = Array.from({ length: n }, (_, i) => P2((i / n) * Math.PI * 2 - Math.PI / 2, 88));
    const inner = Array.from({ length: n }, (_, i) => P2(((i + 0.5) / n) * Math.PI * 2 - Math.PI / 2, 38));
    const out: JSX.Element[] = [];
    for (let i = 0; i < n; i++) {
      const a = outer[i];
      const b = outer[(i + 1) % n];
      const m = inner[i];
      out.push(
        <polygon key={`f${i}`} points={`${f(a[0])},${f(a[1])} ${f(b[0])},${f(b[1])} ${f(m[0])},${f(m[1])}`}
          fill={i % 2 ? p.a : p.b} fillOpacity={0.22 + (i % 3) * 0.2} stroke={p.c} strokeOpacity={0.65} strokeWidth={0.9} />
      );
      out.push(<line key={`c${i}`} x1={C} y1={C} x2={a[0]} y2={a[1]} stroke={p.c} strokeOpacity={0.3} strokeWidth={0.7} />);
    }
    out.push(<polygon key="core" points={inner.map(([x, y]) => `${f(x)},${f(y)}`).join(" ")} fill={p.c} fillOpacity={0.18} stroke={p.c} strokeWidth={1.2} />);
    return out;
  },

  // 20 — sonar
  (r, p, v) => {
    const sweep = r() * Math.PI * 2;
    const out: JSX.Element[] = [];
    for (let i = 1; i <= 4 + (v % 3); i++) {
      out.push(<circle key={`r${i}`} cx={C} cy={C} r={(i / (4 + (v % 3))) * 90} fill="none" stroke={p.a} strokeOpacity={0.45} strokeWidth={1} />);
    }
    out.push(
      <line key="h" x1={6} y1={C} x2={194} y2={C} stroke={p.a} strokeOpacity={0.3} strokeWidth={0.8} />,
      <line key="v" x1={C} y1={6} x2={C} y2={194} stroke={p.a} strokeOpacity={0.3} strokeWidth={0.8} />,
      <path key="sw" d={`M ${C} ${C} L ${f(C + Math.cos(sweep) * 92)} ${f(C + Math.sin(sweep) * 92)} A 92 92 0 0 1 ${f(C + Math.cos(sweep + 0.85) * 92)} ${f(C + Math.sin(sweep + 0.85) * 92)} Z`} fill={p.a} fillOpacity={0.22} />
    );
    for (let i = 0; i < 4 + (v % 5); i++) {
      const [x, y] = P2(r() * Math.PI * 2, 16 + r() * 72);
      out.push(<circle key={`b${i}`} cx={x} cy={y} r={2.8} fill={p.c} />, <circle key={`bo${i}`} cx={x} cy={y} r={7} fill="none" stroke={p.c} strokeOpacity={0.45} strokeWidth={0.8} />);
    }
    return out;
  },

  // 21 — circular helix
  (_r, p, v) => {
    const turns = 5 + (v % 7);
    const out: JSX.Element[] = [];
    const A: [number, number][] = [];
    const B: [number, number][] = [];
    for (let i = 0; i <= 120; i++) {
      const t = (i / 120) * Math.PI * 2;
      const w = 15 + (v % 4) * 4;
      const off = Math.sin(t * turns) * w;
      A.push(P2(t, 62 + off));
      B.push(P2(t, 62 - off));
    }
    const toD = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? "L" : "M"} ${f(x)} ${f(y)}`).join(" ");
    out.push(
      <path key="a" d={toD(A)} fill="none" stroke={p.a} strokeWidth={2} />,
      <path key="b" d={toD(B)} fill="none" stroke={p.b} strokeWidth={2} />
    );
    for (let i = 0; i < 120; i += 6) {
      out.push(<line key={`r${i}`} x1={A[i][0]} y1={A[i][1]} x2={B[i][0]} y2={B[i][1]} stroke={p.c} strokeOpacity={0.5} strokeWidth={0.9} />);
    }
    return out;
  },

  // 22 — flower of life
  (_r, p, v) => {
    const rr = 24 + (v % 5) * 3;
    const out: JSX.Element[] = [<circle key="c0" cx={C} cy={C} r={rr} fill="none" stroke={p.a} strokeOpacity={0.9} strokeWidth={1.1} />];
    const rings = 1 + (v % 3);
    for (let k = 1; k <= rings; k++) {
      const n = 6 * k;
      for (let i = 0; i < n; i++) {
        const [x, y] = P2((i / n) * Math.PI * 2 + (k % 2 ? 0.3 : 0), rr * k);
        out.push(<circle key={`${k}-${i}`} cx={x} cy={y} r={rr} fill="none" stroke={k % 2 ? p.b : p.a} strokeOpacity={0.75} strokeWidth={1} />);
      }
    }
    out.push(<circle key="rim" cx={C} cy={C} r={92} fill="none" stroke={p.c} strokeOpacity={0.6} strokeWidth={1.6} />);
    return out;
  },

  // 23 — radial barcode
  (r, p, v) => {
    const n = 40 + (v % 8) * 8;
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      const r0 = 30;
      const r1 = 44 + r() * 50;
      const [x1, y1] = P2(a, r0);
      const [x2, y2] = P2(a, r1);
      const hot = r() > 0.84;
      return (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={hot ? p.c : p.a} strokeOpacity={hot ? 1 : 0.4 + r() * 0.5} strokeWidth={hot ? 3 : 1.6} strokeLinecap="round" />
      );
    }).concat(
      <circle key="in" cx={C} cy={C} r={24} fill="none" stroke={p.b} strokeWidth={2} />,
      <circle key="dot" cx={C} cy={C} r={7} fill={p.b} />
    );
  },

  // 24 — star polygon web
  (_r, p, v) => {
    const n = 7 + (v % 10);
    const skip = 2 + (v % Math.max(1, Math.floor(n / 2) - 1));
    const pts = Array.from({ length: n }, (_, i) => P2((i / n) * Math.PI * 2 - Math.PI / 2, 86));
    const out: JSX.Element[] = [];
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + skip) % n];
      out.push(<line key={`a${i}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={p.a} strokeOpacity={0.9} strokeWidth={1.3} />);
      const c = pts[(i + skip + 1) % n];
      out.push(<line key={`b${i}`} x1={a[0]} y1={a[1]} x2={c[0]} y2={c[1]} stroke={p.b} strokeOpacity={0.45} strokeWidth={0.9} />);
    }
    pts.forEach(([x, y], i) => out.push(<circle key={`p${i}`} cx={x} cy={y} r={3} fill={p.c} />));
    return out;
  },
];

/* ------------------------------- component ------------------------------ */

function ProfileLogoImpl({
  index,
  className = "",
}: {
  index: number;
  className?: string;
}) {
  const i = ((index % LOGO_COUNT) + LOGO_COUNT) % LOGO_COUNT;
  const family = i % families.length;
  const variant = Math.floor(i / families.length);
  const pal = PALETTES[(i * 7 + variant * 3) % PALETTES.length];
  const rnd = mulberry32(i * 2246822519 + 3266489917);
  const gid = `pl${i}`;

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role="presentation"
      aria-hidden
    >
      <defs>
        <radialGradient id={`${gid}bg`} cx="42%" cy="36%" r="78%">
          <stop offset="0%" stopColor={pal.bg[0]} />
          <stop offset="100%" stopColor={pal.bg[1]} />
        </radialGradient>
        <radialGradient id={`${gid}vg`} cx="50%" cy="50%" r="50%">
          <stop offset="62%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.6" />
        </radialGradient>
        <clipPath id={`${gid}cl`}>
          <circle cx={C} cy={C} r={RAD} />
        </clipPath>
      </defs>

      <circle cx={C} cy={C} r={RAD} fill={`url(#${gid}bg)`} />
      <g clipPath={`url(#${gid}cl)`}>{families[family](rnd, pal, variant)}</g>
      <circle cx={C} cy={C} r={RAD} fill={`url(#${gid}vg)`} />
      <circle
        cx={C}
        cy={C}
        r={RAD}
        fill="none"
        stroke="rgba(237,237,240,0.18)"
        strokeWidth="1.5"
      />
    </svg>
  );
}

/* memoised — each emblem is hundreds of nodes and the picker shows dozens */
export const ProfileLogo = memo(ProfileLogoImpl);
