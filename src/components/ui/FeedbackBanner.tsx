import clsx from "clsx";

type FeedbackTone = "success" | "warning" | "error" | "info";

const toneStyles: Record<FeedbackTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  error: "border-red-200 bg-red-50 text-red-700",
  info: "border-sky-200 bg-sky-50 text-sky-800",
};

type FeedbackBannerProps = {
  message: string;
  tone?: FeedbackTone;
  className?: string;
};

export function FeedbackBanner({ message, tone = "info", className }: FeedbackBannerProps) {
  return (
    <div className={clsx("rounded-xl border px-4 py-3 text-sm", toneStyles[tone], className)}>
      {message}
    </div>
  );
}
