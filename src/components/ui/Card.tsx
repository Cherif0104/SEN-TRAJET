import clsx from "clsx";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "interactive";
}

export function Card({
  className,
  variant = "default",
  ...props
}: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 text-[var(--color-text-primary)] shadow-card sm:p-4",
        variant === "elevated" && "bg-[var(--color-surface-raised)] shadow-[var(--shadow-md)]",
        variant === "interactive" &&
          "cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-md)] active:translate-y-0 active:scale-[0.995]",
        className
      )}
      {...props}
    />
  );
}
