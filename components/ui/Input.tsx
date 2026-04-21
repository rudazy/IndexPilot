import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...rest }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-10 w-full bg-[color:var(--color-surface-2)] border border-[color:var(--color-border)] rounded-[8px] px-3 text-sm",
          "text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-subtle)]",
          "focus:outline-none focus:border-[color:var(--color-accent)] focus:ring-1 focus:ring-[color:var(--color-accent)]",
          "transition-colors duration-150",
          className,
        )}
        {...rest}
      />
    );
  },
);
Input.displayName = "Input";
