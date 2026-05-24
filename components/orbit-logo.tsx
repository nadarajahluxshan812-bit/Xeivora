import { useId } from "react";

import { cn } from "@/lib/utils";

type OrbitLogoProps = {
  compact?: boolean;
  className?: string;
};

export function OrbitLogo({ compact = false, className = "" }: OrbitLogoProps) {
  const gradientId = useId();

  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <div
        aria-hidden="true"
        className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#111111] shadow-[0_12px_32px_rgba(0,0,0,0.28)] ring-1 ring-white/8"
      >
        <svg viewBox="0 0 40 40" role="img">
          <defs>
            <linearGradient id={gradientId} x1="7" x2="33" y1="7" y2="33">
              <stop stopColor="#8b5cf6" />
              <stop offset="1" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
          <rect height="40" rx="12" width="40" fill={`url(#${gradientId})`} />
          <path
            d="M12 12.5c5.8 0 10.8 15 16.8 15 2.6 0 4.2-1.5 4.2-3.8 0-2.4-1.8-3.9-4.3-3.9-6.1 0-10.8 15-16.7 15-2.9 0-5-1.9-5-4.7 0-2.6 2-4.6 5-4.6"
            fill="none"
            stroke="rgba(255,255,255,.92)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
            transform="translate(0 -3.5)"
          />
          <path
            d="M13 13l14 14M27 13 13 27"
            stroke="rgba(255,255,255,.72)"
            strokeLinecap="round"
            strokeWidth="2.4"
          />
        </svg>
      </div>
      {!compact ? (
        <div>
          <div className="text-[15px] font-semibold tracking-tight text-white">Xeivora</div>
          <div className="text-xs text-white/58">Unified AI Intelligence</div>
        </div>
      ) : null}
    </div>
  );
}
