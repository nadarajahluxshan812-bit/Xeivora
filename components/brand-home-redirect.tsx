"use client";

import { useEffect } from "react";

function isXeivoraBrandButton(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false;
  }

  const button = target.closest("button");
  if (!(button instanceof HTMLButtonElement)) {
    return false;
  }

  const className = typeof button.className === "string" ? button.className : "";
  return className.includes("min-w-0") && className.includes("text-left") && className.includes("rounded-[10px]");
}

export function BrandHomeRedirect() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!window.location.pathname.startsWith("/chat")) {
        return;
      }

      if (!isXeivoraBrandButton(event.target)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }
      window.location.assign("/");
    }

    window.addEventListener("click", handleClick, true);
    return () => window.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}
