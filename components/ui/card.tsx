import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "md" | "lg";
  elevated?: boolean;
}

export function Card({ className, padding = "md", elevated = true, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card bg-surface",
        elevated ? "shadow-card" : "border",
        padding === "md" && "p-4",
        padding === "lg" && "p-5",
        className,
      )}
      {...props}
    />
  );
}
