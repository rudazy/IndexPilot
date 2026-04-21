import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const base =
  "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 ease-out " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-accent)] " +
  "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-current whitespace-nowrap";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-[color:var(--color-accent)] text-black hover:bg-[color:var(--color-accent-hover)] " +
    "active:translate-y-[1px]",
  secondary:
    "bg-[color:var(--color-surface-2)] text-[color:var(--color-fg)] border border-[color:var(--color-border-strong)] " +
    "hover:bg-[color:var(--color-surface-3)] hover:border-[color:var(--color-fg-subtle)]",
  ghost:
    "bg-transparent text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] " +
    "hover:bg-[color:var(--color-surface-2)]",
  danger:
    "bg-transparent text-[color:var(--color-danger)] border border-[color:var(--color-danger-dim)] " +
    "hover:bg-[color:var(--color-danger-dim)]",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs rounded-[6px]",
  md: "h-10 px-4 text-sm rounded-[8px]",
  lg: "h-12 px-6 text-base rounded-[10px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, type = "button", ...rest }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(base, variants[variant], sizes[size], className)}
        {...rest}
      />
    );
  },
);

Button.displayName = "Button";
