import { forwardRef } from "react";
import Link from "next/link";
import clsx from "clsx";

type ButtonVariant = "primary" | "secondary" | "tertiary" | "ghost" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
  href?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-amber-500 text-neutral-900 shadow-[0_8px_20px_rgba(213,166,74,0.28)] hover:bg-amber-400 hover:shadow-[0_10px_24px_rgba(213,166,74,0.35)] active:scale-[0.985]",
  secondary:
    "bg-white border border-neutral-300 text-neutral-800 hover:bg-neutral-50 hover:border-neutral-400 active:scale-[0.99]",
  tertiary: "bg-transparent text-amber-800 hover:text-amber-900 hover:underline",
  ghost: "bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 active:scale-[0.99]",
  outline:
    "bg-transparent border border-amber-600/60 text-amber-900 hover:bg-amber-50 active:scale-[0.99]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs rounded-lg",
  md: "h-10 px-4 text-sm min-h-[40px] rounded-xl",
  lg: "h-11 px-5 text-sm min-h-[44px] rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      fullWidth,
      isLoading,
      disabled,
      children,
      href,
      type = "button",
      ...props
    },
    ref
  ) => {
    const classes = clsx(
      "inline-flex items-center justify-center font-semibold transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
      variantClasses[variant],
      sizeClasses[size],
      fullWidth && "w-full",
      className
    );

    if (href) {
      const { onClick } = props;
      return (
        <Link
          href={href}
          className={classes}
          onClick={onClick as React.MouseEventHandler<HTMLAnchorElement> | undefined}
        >
          {isLoading ? "…" : children}
        </Link>
      );
    }

    return (
      <button ref={ref} type={type} className={classes} disabled={disabled || isLoading} {...props}>
        {isLoading ? "…" : children}
      </button>
    );
  }
);

Button.displayName = "Button";
