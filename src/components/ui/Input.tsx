import { forwardRef } from "react";
import clsx from "clsx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, suppressHydrationWarning, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-neutral-800 mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={clsx(
            "w-full min-h-[40px] px-3 py-2.5 rounded-button border-2 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors",
            error
              ? "border-red-500 focus:border-red-500"
              : "border-neutral-200 focus:border-emerald-600",
            className
          )}
          {...props}
          suppressHydrationWarning={suppressHydrationWarning ?? true}
        />
        {error && (
          <p className="mt-1.5 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
