"use client";

import { useEffect } from "react";

export function HomeViewportLock() {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return null;
}
