type ListSkeletonProps = {
  items?: number;
  itemClassName?: string;
  className?: string;
};

export function ListSkeleton({
  items = 3,
  itemClassName = "h-24 rounded-xl bg-neutral-200",
  className = "animate-pulse space-y-3",
}: ListSkeletonProps) {
  return (
    <div className={className}>
      {Array.from({ length: items }).map((_, idx) => (
        <div key={idx} className={itemClassName} />
      ))}
    </div>
  );
}
