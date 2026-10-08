"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "lg";

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-control font-semibold select-none " +
  "transition-[background-color,color,transform,opacity] duration-150 ease-out-soft " +
  "disabled:cursor-not-allowed disabled:opacity-50 active:enabled:scale-[0.98]";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary hover:enabled:bg-primary-strong",
  secondary: "bg-primary-soft text-primary hover:enabled:bg-primary/15",
  ghost: "bg-transparent text-text hover:enabled:bg-surface-muted",
  danger: "bg-negative-soft text-negative hover:enabled:bg-negative/15",
};

const sizeClasses: Record<ButtonSize, string> = {
  md: "h-11 min-h-11 px-4 text-[15px]",
  lg: "h-13 min-h-13 px-5 text-base",
};

export function buttonClasses(opts: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}): string {
  return cn(
    baseClasses,
    variantClasses[opts.variant ?? "primary"],
    sizeClasses[opts.size ?? "md"],
    opts.fullWidth && "w-full",
    opts.className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant,
  size,
  fullWidth,
  loading = false,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, fullWidth, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

export function ButtonLink({ variant, size, fullWidth, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses({ variant, size, fullWidth, className })} {...props} />;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-4 animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
