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
        <circle cx="0" cy="0" fill="none" r="36" stroke="rgba(201,100,66,0.07)" strokeWidth="0.5" />
        <ellipse cx="0" cy="0" fill="none" rx="32" ry="9" stroke="#c96442" strokeWidth="2" transform="rotate(0)" />
        <ellipse
          cx="0"
          cy="0"
          fill="none"
          rx="32"
          ry="9"
          stroke="rgba(201,100,66,0.5)"
          strokeWidth="1.2"
          transform="rotate(60)"
        />
        <ellipse
          cx="0"
          cy="0"
          fill="none"
          rx="32"
          ry="9"
          stroke="rgba(201,100,66,0.28)"
          strokeWidth="0.8"
          transform="rotate(120)"
        />
        <circle cx="0" cy="0" fill="rgba(201,100,66,0.15)" r="8" />
        <circle cx="0" cy="0" fill="#c96442" r="5" />
        <circle cx="0" cy="0" fill="#0e0b08" r="2" />
        <circle cx="30" cy="0" fill="#c96442" r="2.5" />
        <circle cx="-15" cy="26" fill="#c96442" opacity="0.6" r="2" />
        <circle cx="-15" cy="-26" fill="#c96442" opacity="0.35" r="1.5" />
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
          <div className={cn("text-[15px] font-medium tracking-tight text-[#f0ead8]", nameClassName)}>
            Xei<span className="italic text-[#c96442]">vora</span>
          </div>
          {showTagline ? (
            <div className={cn("text-xs text-[rgba(240,234,216,0.58)]", taglineClassName)}>Unified AI Intelligence</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
