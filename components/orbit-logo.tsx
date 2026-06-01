import { cn } from "@/lib/utils";

type XeivoraGlyphProps = {
  className?: string;
  size?: number;
};

type OrbitLogoProps = {
  compact?: boolean;
  className?: string;
  showTagline?: boolean;
  nameClassName?: string;
  taglineClassName?: string;
  iconClassName?: string;
  iconSize?: number;
};

export function XeivoraGlyph({ className = "", size = 40 }: XeivoraGlyphProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      height={size}
      role="img"
      viewBox="0 0 100 100"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="translate(50 50)">
        <circle cx="0" cy="0" fill="none" r="36" stroke="rgba(var(--site-accent-rgb),0.06)" strokeWidth="0.5" />
        <ellipse cx="0" cy="0" fill="none" rx="32" ry="9" stroke="rgba(var(--site-accent-rgb),0.88)" strokeWidth="1.85" transform="rotate(0)" />
        <ellipse
          cx="0"
          cy="0"
          fill="none"
          rx="32"
          ry="9"
          stroke="rgba(var(--site-accent-rgb),0.34)"
          strokeWidth="1.05"
          transform="rotate(60)"
        />
        <ellipse
          cx="0"
          cy="0"
          fill="none"
          rx="32"
          ry="9"
          stroke="rgba(var(--site-accent-rgb),0.18)"
          strokeWidth="0.72"
          transform="rotate(120)"
        />
        <circle cx="0" cy="0" fill="rgba(var(--site-accent-rgb),0.11)" r="8" />
        <circle cx="0" cy="0" fill="var(--site-accent)" r="5" />
        <circle cx="0" cy="0" fill="rgba(var(--site-accent-rgb),0.22)" r="2" />
        <circle cx="30" cy="0" fill="var(--site-accent)" opacity="0.88" r="2.35" />
        <circle cx="-15" cy="26" fill="var(--site-accent)" opacity="0.42" r="1.9" />
        <circle cx="-15" cy="-26" fill="var(--site-accent)" opacity="0.24" r="1.45" />
      </g>
    </svg>
  );
}

export function OrbitLogo({
  compact = false,
  className = "",
  showTagline = !compact,
  nameClassName = "",
  taglineClassName = "",
  iconClassName = "",
  iconSize
}: OrbitLogoProps) {
  const resolvedIconSize = iconSize ?? (compact ? 32 : 40);

  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <XeivoraGlyph className={iconClassName} size={resolvedIconSize} />
      {!compact ? (
        <div className="min-w-0">
          <div className={cn("text-[15px] font-medium tracking-tight text-[color:var(--site-text)]", nameClassName)}>
            Xei<span className="italic text-[color:var(--site-accent)]">vora</span>
          </div>
          {showTagline ? (
            <div className={cn("text-xs text-[color:var(--site-subtle)]", taglineClassName)}>Unified AI Intelligence</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
