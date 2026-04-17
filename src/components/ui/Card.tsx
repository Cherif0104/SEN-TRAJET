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
        "bg-white rounded-card shadow-card p-5 border border-neutral-200/80",
        variant === "elevated" && "shadow-[0px_4px_16px_rgba(0,0,0,0.12)]",
        variant === "interactive" &&
          "hover:shadow-[0px_4px_16px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.995] transition-all duration-200 cursor-pointer",
        className
      )}
      {...props}
    />
  );
}
