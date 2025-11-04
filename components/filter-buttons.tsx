import {
  HiCheckCircle,
  HiXCircle,
  HiQuestionMarkCircle,
} from "react-icons/hi";
import { IconType } from "react-icons";

export type FilterOption = "all" | "COMPLIES" | "DEVIATES" | "UNCLEAR";

interface FilterConfig {
  value: FilterOption;
  label: string;
  icon: IconType | null;
}

const FILTER_CONFIG: readonly FilterConfig[] = [
  { value: "all", label: "All", icon: null },
  { value: "COMPLIES", label: "Complies", icon: HiCheckCircle },
  { value: "DEVIATES", label: "Deviates", icon: HiXCircle },
  { value: "UNCLEAR", label: "Unclear", icon: HiQuestionMarkCircle },
] as const;

interface FilterButtonsProps {
  currentFilter: FilterOption;
  onFilterChange: (filter: FilterOption) => void;
}

export function FilterButtons({
  currentFilter,
  onFilterChange,
}: FilterButtonsProps) {
  return (
    <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
      {FILTER_CONFIG.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => onFilterChange(value)}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            Icon ? "flex items-center gap-1" : ""
          } ${
            currentFilter === value
              ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          }`}
        >
          {Icon && <Icon className="w-3 h-3" />}
          {label}
        </button>
      ))}
    </div>
  );
}
