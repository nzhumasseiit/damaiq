"use client";

import Image from "next/image";
import { useState } from "react";

import { classNames } from "@/lib/ui";

export default function Mascot({ className, size }: { className?: string; size: "sm" | "lg" }) {
  const [useFallback, setUseFallback] = useState(false);
  const dimensions = size === "lg" ? 64 : 24;

  if (useFallback) {
    return (
      <span
        aria-hidden="true"
        className={classNames(
          "inline-flex items-center justify-center text-[#F59E0B]",
          size === "lg" ? "text-[64px] leading-none" : "text-2xl leading-none",
          className,
        )}
      >
        ♟
      </span>
    );
  }

  return (
    <Image
      src="/mascot.svg"
      alt=""
      width={dimensions}
      height={dimensions}
      onError={() => setUseFallback(true)}
      className={classNames(
        "object-contain",
        size === "lg" ? "h-16 w-16" : "h-6 w-6",
        className,
      )}
      priority={size === "lg"}
    />
  );
}
