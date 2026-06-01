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
      viewBox="0 0 200 200"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse cx="100" cy="100" fill="none" opacity="0.2" rx="88" ry="88" stroke="#c96442" strokeWidth="0.8" />
      <ellipse cx="100" cy="100" fill="none" rx="80" ry="28" stroke="#c96442" strokeWidth="2.8" />
      <ellipse
        cx="100"
        cy="100"
        fill="none"
        opacity="0.75"
        rx="80"
        ry="28"
        stroke="#c96442"
        strokeWidth="1.6"
        transform="rotate(60 100 100)"
      />
      <ellipse
        cx="100"
        cy="100"
        fill="none"
        opacity="0.75"
        rx="80"
        ry="28"
        stroke="#c96442"
        strokeWidth="1.6"
        transform="rotate(120 100 100)"
      />
      <circle cx="180" cy="100" fill="#c96442" r="5.5" />
      <circle cx="61" cy="161" fill="#c96442" opacity="0.75" r="4" />
      <circle cx="61" cy="39" fill="#c96442" opacity="0.75" r="4" />
      <circle cx="100" cy="100" fill="#c96442" opacity="0.15" r="11" />
      <circle cx="100" cy="100" fill="#c96442" opacity="0.4" r="7" />
      <circle cx="100" cy="100" fill="#c96442" r="4" />
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
            Xei<span className="italic text-[#c96442]">vora</span>
          </div>
          {showTagline ? (
            <div className={cn("text-xs text-[color:var(--site-subtle)]", taglineClassName)}>Unified AI Intelligence</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
