"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Sheet = Dialog.Root;
const SheetTrigger = Dialog.Trigger;
const SheetClose = Dialog.Close;
const SheetPortal = Dialog.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof Dialog.Overlay>,
  React.ComponentPropsWithoutRef<typeof Dialog.Overlay>
>(({ className, ...props }, ref) => (
  <Dialog.Overlay
    className={cn("fixed inset-0 z-50 bg-black/70 backdrop-blur-sm", className)}
    ref={ref}
    {...props}
  />
));
SheetOverlay.displayName = Dialog.Overlay.displayName;

const sheetSides = {
  top: "inset-x-0 top-0 border-b",
  bottom: "inset-x-0 bottom-0 border-t",
  left: "inset-y-0 left-0 h-full w-[90vw] max-w-[340px] border-r",
  right: "inset-y-0 right-0 h-full w-[90vw] max-w-[340px] border-l"
} as const;

const SheetContent = React.forwardRef<
  React.ElementRef<typeof Dialog.Content>,
  React.ComponentPropsWithoutRef<typeof Dialog.Content> & {
    side?: keyof typeof sheetSides;
  }
>(({ className, children, side = "right", ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <Dialog.Content
      className={cn(
        "fixed z-50 bg-[#0d0d0d] p-5 text-white shadow-2xl outline-none",
        "border-white/[0.08]",
        sheetSides[side],
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
      <SheetClose className="absolute right-4 top-4 rounded-full p-2 text-white/56 transition hover:bg-white/[0.05] hover:text-white">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </SheetClose>
    </Dialog.Content>
  </SheetPortal>
));
SheetContent.displayName = Dialog.Content.displayName;

export { Sheet, SheetClose, SheetContent, SheetOverlay, SheetPortal, SheetTrigger };
