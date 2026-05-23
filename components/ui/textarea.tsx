import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-24 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/34 outline-none transition focus-visible:border-white/[0.14] focus-visible:ring-2 focus-visible:ring-white/10",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
