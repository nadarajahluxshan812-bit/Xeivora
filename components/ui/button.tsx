import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-white/20",
  {
    variants: {
      variant: {
        default: "bg-white text-[#0a0a0a] hover:bg-white/90",
        secondary: "border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]",
        ghost: "text-white/72 hover:bg-white/[0.05] hover:text-white",
        subtle: "border border-white/[0.08] bg-[#111111] text-white/86 hover:border-white/[0.14] hover:bg-[#171717]"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-11 rounded-2xl px-5",
        icon: "h-10 w-10 rounded-full"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({ asChild = false, className, size, variant, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
