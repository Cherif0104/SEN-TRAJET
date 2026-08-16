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
    "bg-[var(--color-accent)] text-[var(--color-accent-contrast)] shadow-[var(--shadow-md)] hover:bg-[var(--color-accent-hover)] active:scale-[0.985]",
  secondary:
    "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] hover:border-[var(--color-border-strong)] active:scale-[0.99]",
  tertiary: "bg-transparent text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] hover:underline",
  ghost: "bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] active:scale-[0.99]",
  outline:
    "bg-transparent border border-[var(--color-accent)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] active:scale-[0.99]",
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
      "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] focus:ring-offset-2 focus:ring-offset-[var(--color-background)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
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
          aria-busy={isLoading}
        >
          {isLoading ? <span className="sj-inline-loader" aria-hidden="true" /> : null}
          {children}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading ? <span className="sj-inline-loader" aria-hidden="true" /> : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
