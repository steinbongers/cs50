import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-control border bg-surface px-4 text-base text-text",
        "placeholder:text-text-muted/70",
        "transition-[border-color,box-shadow] duration-150",
        "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25",
        "aria-invalid:border-negative aria-invalid:focus:ring-negative/25",
        className,
      )}
      {...props}
    />
  );
}

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
}

export function Field({ label, htmlFor, hint, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-text">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-negative" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
