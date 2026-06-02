interface StatCardProps {
  value: string;
  label: string;
}

export function StatCard({ value, label }: StatCardProps) {
  return (
    <div className="depth-stat hover-lift flex flex-col items-center bg-card py-3 px-2 text-center">
      <span
        className="font-display text-2xl leading-none text-primary"
      >
        {value}
      </span>
      <span className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
