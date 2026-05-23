import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex h-11 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white placeholder:text-white/34 outline-none transition focus-visible:border-white/[0.14] focus-visible:ring-2 focus-visible:ring-white/10",
        className
      )}
      type={type}
      {...props}
    />
  );
}

export { Input };
