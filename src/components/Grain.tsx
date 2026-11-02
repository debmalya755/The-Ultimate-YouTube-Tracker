export default function Grain({
  opacity = 0.08,
  fixed = false,
}: {
  opacity?: number;
  fixed?: boolean;
}) {
  return (
    <div
      className={`pointer-events-none inset-0 z-[70] overflow-hidden ${
        fixed ? "fixed" : "absolute"
      }`}
      aria-hidden
    >
      <div
        className="noise-bg animate-grain absolute -inset-[30%] will-change-transform"
        style={{ opacity }}
      />
    </div>
  );
}
