import { ComplianceResult } from "@/lib/analyze.types";
import { HiCheckCircle, HiXCircle, HiQuestionMarkCircle } from "react-icons/hi";

export function ResultBadge({
  result,
}: {
  result: ComplianceResult;
}) {
  const config = {
    COMPLIES: {
      color:
        "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200/50 dark:border-green-800/50",
      icon: HiCheckCircle,
      label: "Complies",
    },
    DEVIATES: {
      color:
        "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200/50 dark:border-red-800/50",
      icon: HiXCircle,
      label: "Deviates",
    },
    UNCLEAR: {
      color:
        "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200/50 dark:border-yellow-800/50",
      icon: HiQuestionMarkCircle,
      label: "Unclear",
    },
  };

  const Icon = config[result].icon;

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${config[result].color}`}
    >
      <Icon className="w-3 h-3" />
      <span className="text-[11px] font-medium">{config[result].label}</span>
    </div>
  );
}
