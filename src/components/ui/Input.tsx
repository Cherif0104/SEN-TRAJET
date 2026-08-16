import { forwardRef, useId } from "react";
import clsx from "clsx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, suppressHydrationWarning, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const descriptionId = `${inputId}-description`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            "input-base transition-colors disabled:cursor-not-allowed disabled:opacity-55",
            error
              ? "!border-[var(--color-error)]"
              : "",
            className
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={error || helperText ? descriptionId : undefined}
          {...props}
          suppressHydrationWarning={suppressHydrationWarning ?? true}
        />
        {error ? (
          <p id={descriptionId} role="alert" className="mt-1.5 text-sm text-[var(--color-error)]">
            {error}
          </p>
        ) : helperText ? (
          <p id={descriptionId} className="mt-1.5 text-xs text-[var(--color-text-secondary)]">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
