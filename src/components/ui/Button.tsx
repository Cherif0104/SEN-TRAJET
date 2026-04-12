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
    "bg-primary text-white shadow-[0_8px_20px_rgba(5,150,105,0.22)] hover:bg-primary-dark hover:shadow-[0_10px_24px_rgba(5,150,105,0.28)] active:scale-[0.99]",
  secondary:
    "bg-white border border-neutral-300 text-neutral-800 hover:bg-neutral-50 hover:border-neutral-400",
  tertiary: "bg-transparent text-primary hover:text-primary-dark hover:underline",
  ghost: "bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
  outline:
    "bg-white border border-secondary text-secondary hover:bg-secondary/10 active:scale-[0.99]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm rounded-xl",
  md: "h-11 px-6 text-sm min-h-[44px] rounded-xl",
  lg: "h-12 px-8 text-base min-h-[48px] rounded-2xl",
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
      "inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
      variantClasses[variant],
      sizeClasses[size],
      fullWidth && "w-full",
      className
    );

    if (href) {
      const { onClick } = props;
      return (
        <Link
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={classes}
          onClick={onClick as unknown as React.MouseEventHandler<HTMLAnchorElement>}
        >
          {isLoading ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            children
          )}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={classes}
        {...props}
      >
        {isLoading ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
