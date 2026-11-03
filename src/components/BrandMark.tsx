/** Site name: DEB OS v0 — the v is smaller than the 0. */
export default function BrandMark({
  className = "",
}: {
  className?: string;
}) {
  return (
    <span className={`inline-flex items-baseline tracking-[0.06em] ${className}`}>
      <span>DEB OS&nbsp;</span>
      <span className="text-[0.52em] font-normal tracking-[0.12em] text-bone/70">
        v
      </span>
      <span>0</span>
    </span>
  );
}
