interface TooltipPayload {
  name?: string;
  value: number | string;
  color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

export default function CustomTooltip({
  active,
  payload,
  label,
}: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 px-2 py-1.5 shadow-lg backdrop-blur-sm">
        {label && (
          <p className="text-[10px] font-medium text-neutral-900 dark:text-neutral-100 mb-0.5">
            {label}
          </p>
        )}
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-1.5">
            {entry.color && (
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
            )}
            <span className="text-[10px] text-neutral-600 dark:text-neutral-400">
              {entry.name}:
            </span>
            <span className="text-[10px] font-semibold text-neutral-900 dark:text-neutral-100">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}
