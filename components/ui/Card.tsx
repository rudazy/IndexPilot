import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-[14px]",
        "shadow-[var(--shadow-elev-1)]",
        className,
      )}
      {...rest}
    />
  );
}

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-6 pt-5 pb-4 flex items-center justify-between gap-4 border-b border-[color:var(--color-border)]",
        className,
      )}
      {...rest}
    />
  );
}

export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-sm font-medium tracking-wide uppercase text-[color:var(--color-fg-muted)]",
        className,
      )}
      style={{ fontFamily: "var(--font-sans)" }}
      {...rest}
    />
  );
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6", className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-6 py-4 border-t border-[color:var(--color-border)] flex items-center justify-between gap-4",
        className,
      )}
      {...rest}
    />
  );
}
