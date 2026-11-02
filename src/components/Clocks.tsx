import { useEffect, useRef, useState } from "react";

/** Cycle of world zones — click the world row to step through them. */
const ZONES = [
  { label: "UTC", tz: "UTC" },
  { label: "NYC", tz: "America/New_York" },
  { label: "LDN", tz: "Europe/London" },
  { label: "BER", tz: "Europe/Berlin" },
  { label: "DXB", tz: "Asia/Dubai" },
  { label: "SGP", tz: "Asia/Singapore" },
  { label: "TYO", tz: "Asia/Tokyo" },
  { label: "SYD", tz: "Australia/Sydney" },
  { label: "LAX", tz: "America/Los_Angeles" },
];

function fmt(tz: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date());
  } catch {
    // unknown zone on an old engine — fall back to local time
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date());
  }
}

/**
 * Two live readouts under the wordmark. Writes straight to the DOM via refs so
 * the whole nav doesn't re-render once per second.
 */
export default function Clocks() {
  const [zone, setZone] = useState(0);
  const worldRef = useRef<HTMLSpanElement>(null);
  const istRef = useRef<HTMLSpanElement>(null);
  const zoneRef = useRef(zone);
  zoneRef.current = zone;

  useEffect(() => {
    const paint = () => {
      if (worldRef.current) worldRef.current.textContent = fmt(ZONES[zoneRef.current].tz);
      if (istRef.current) istRef.current.textContent = fmt("Asia/Kolkata");
    };
    paint();
    const id = setInterval(paint, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mt-1 hidden gap-4 font-mono text-[9px] leading-none tracking-[0.2em] text-bone/45 uppercase sm:flex">
      <button
        onClick={() => setZone((z) => (z + 1) % ZONES.length)}
        title="Click to change zone"
        className="flex items-center gap-1.5 transition-colors duration-300 hover:text-bone"
      >
        <span className="text-bone/30">{ZONES[zone].label}</span>
        <span ref={worldRef} className="tabular-nums">
          --:--:--
        </span>
      </button>
      <span className="flex items-center gap-1.5">
        <span className="text-blood">IST</span>
        <span ref={istRef} className="tabular-nums text-bone/60">
          --:--:--
        </span>
      </span>
    </div>
  );
}
