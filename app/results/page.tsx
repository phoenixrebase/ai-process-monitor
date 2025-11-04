"use client";
import { useEffect, useMemo, useCallback } from "react";
import { ComplianceResult } from "@/lib/analyze.types";
import { ResultsSortOption } from "@/lib/types";
import { useStore } from "@/lib/store";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Navbar } from "@/components/navbar";
import { PageBackground } from "@/components/page-background";
import { ResultBadge } from "@/components/result-badge";
import { FilterButtons, FilterOption } from "@/components/filter-buttons";
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  HiDocumentText,
  HiCheckCircle,
  HiXCircle,
  HiQuestionMarkCircle,
  HiLightningBolt,
  HiChevronLeft,
  HiChevronRight,
  HiSearch,
} from "react-icons/hi";
import { IconType } from "react-icons";
import { Button } from "@/components/ui/button";
import CustomTooltip from "@/components/custom-tool-tip";

const COLORS = {
  COMPLIES: "#10b981",
  DEVIATES: "#ef4444",
  UNCLEAR: "#f59e0b",
};

function safeParseConfidence(value: string | number): number {
  const parsed = typeof value === "number" ? value : parseFloat(value);

  if (isNaN(parsed) || !isFinite(parsed)) {
    console.warn(`Invalid confidence value: ${value}, defaulting to 0`);
    return 0;
  }

  if (parsed < 0 || parsed > 1) {
    console.warn(`Confidence out of range [0,1]: ${parsed}, clamping`);
    return Math.max(0, Math.min(1, parsed));
  }

  return parsed;
}

export default function ResultsPage() {
  const {
    results,
    resultsLoading: loading,
    resultsError: error,
    currentPage,
    totalPages,
    totalResults,
    resultsFilter: filter,
    resultsSortBy: sort,
    resultsSearch: searchQuery,
    itemsPerPage,
    fetchResults,
    goToPage,
    setResultsFilter,
    setResultsSortBy,
    setResultsSearch,
  } = useStore();

  const stats = useMemo(
    () => ({
      total: totalResults,
      complies: results.filter(({ result }) => result === "COMPLIES").length,
      deviates: results.filter(({ result }) => result === "DEVIATES").length,
      unclear: results.filter(({ result }) => result === "UNCLEAR").length,
      avgConfidence:
        results.length > 0
          ? results.reduce(
              (sum, r) => sum + safeParseConfidence(r.confidence),
              0
            ) / results.length
          : 0,
    }),
    [results, totalResults]
  );

  const pieData = useMemo(
    () =>
      [
        { name: "Complies", value: stats.complies, color: COLORS.COMPLIES },
        { name: "Deviates", value: stats.deviates, color: COLORS.DEVIATES },
        { name: "Unclear", value: stats.unclear, color: COLORS.UNCLEAR },
      ].filter(({ value }) => value > 0),
    [stats]
  );

  const confidenceTrendData = useMemo(
    () =>
      results
        .slice(0, 15)
        .reverse()
        .map(({ confidence }, i) => ({
          index: i + 1,
          confidence: (safeParseConfidence(confidence) * 100).toFixed(2),
        })),
    [results]
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setResultsSearch(e.target.value);
    },
    [setResultsSearch]
  );

  const handleFilterChange = useCallback(
    (newFilter: FilterOption) => {
      setResultsFilter(newFilter);
    },
    [setResultsFilter]
  );

  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setResultsSortBy(e.target.value as ResultsSortOption);
    },
    [setResultsSortBy]
  );

  const startIndex =
    totalResults === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(startIndex + results.length - 1, totalResults);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  if (loading) {
    return (
      <>
        <Navbar />
        <PageBackground>
          <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)]">
            <div className="text-neutral-500 dark:text-neutral-400">
              Loading...
            </div>
          </div>
        </PageBackground>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <PageBackground>
          <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)] px-4">
            <div className="max-w-md w-full">
              <div className="rounded-xl border border-red-200/60 dark:border-red-900/40 bg-gradient-to-br from-red-50/80 to-red-100/60 dark:from-red-950/40 dark:to-red-900/20 p-6 sm:p-8 backdrop-blur-md shadow-lg">
                {/* Icon */}
                <div className="flex justify-center mb-3 sm:mb-4">
                  <div className="rounded-full bg-red-100 dark:bg-red-900/50 p-2.5 sm:p-3">
                    <HiXCircle className="w-7 h-7 sm:w-8 sm:h-8 text-red-600 dark:text-red-500" />
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-base sm:text-lg font-semibold text-center text-neutral-900 dark:text-neutral-100 mb-2">
                  Database Connection Error
                </h2>

                {/* Error Message */}
                <p className="text-xs sm:text-sm text-center text-neutral-700 dark:text-neutral-300 mb-4 sm:mb-6 leading-relaxed">
                  {error}
                </p>

                {/* Troubleshooting Hint */}
                <div className="rounded-lg bg-white/50 dark:bg-black/30 border border-red-200/40 dark:border-red-900/30 p-2.5 sm:p-3 mb-4 sm:mb-6">
                  <p className="text-[11px] sm:text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                      Troubleshooting:
                    </span>{" "}
                    Make sure your PostgreSQL database is running and
                    environment variables are configured correctly.
                  </p>
                </div>

                {/* Retry Button */}
                <Button
                  onClick={fetchResults}
                  className="w-full text-xs sm:text-sm h-9 sm:h-10 bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-black transition-all shadow-md hover:shadow-lg"
                >
                  Retry Connection
                </Button>
              </div>
            </div>
          </div>
        </PageBackground>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <PageBackground>
        <div className="container mx-auto px-4 pb-2 max-w-7xl pt-16 sm:pt-[4.125rem] flex flex-col">
          {/* Ultra Minimal Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 mb-2 order-1">
            <MinimalStatCard
              label="Total"
              value={stats.total}
              icon={HiDocumentText}
            />
            <MinimalStatCard
              label="Complies"
              value={stats.complies}
              icon={HiCheckCircle}
              variant="success"
            />
            <MinimalStatCard
              label="Deviates"
              value={stats.deviates}
              icon={HiXCircle}
              variant="error"
            />
            <MinimalStatCard
              label="Unclear"
              value={stats.unclear}
              icon={HiQuestionMarkCircle}
              variant="warning"
            />
            <div className="col-span-2 sm:col-span-1 flex justify-center sm:justify-start">
              <div className="w-full max-w-[50%] sm:max-w-none">
                <MinimalStatCard
                  label="Confidence"
                  value={`${(stats.avgConfidence * 100).toFixed(0)}%`}
                  icon={HiLightningBolt}
                />
              </div>
            </div>
          </div>

          {/* Ultra Minimal Charts */}
          {results.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-2 sm:grid-rows-1 order-3 sm:order-2">
              <MinimalChartCard>
                <div className="mb-2">
                  <span className="text-[10px] font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                    Distribution
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={80}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={20}
                      outerRadius={36}
                      dataKey="value"
                      paddingAngle={0}
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {pieData.map(({ color }, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={<CustomTooltip />}
                      formatter={(value: number, name: string) => [value, name]}
                      animationDuration={0}
                      isAnimationActive={false}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-2 mt-1">
                  {pieData.map(({ name, color, value }) => (
                    <div key={name} className="flex items-center gap-1">
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-[9px] text-neutral-700 dark:text-neutral-300">
                        {name}
                      </span>
                      <span className="text-[9px] font-medium text-neutral-900 dark:text-neutral-100">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </MinimalChartCard>

              <div className="rounded-md border border-neutral-200/50 dark:border-neutral-800/50 bg-white/50 dark:bg-black/50 backdrop-blur-sm overflow-hidden flex flex-col min-h-[120px]">
                <div className="flex items-center justify-between px-2.5 pt-2.5 pb-0">
                  <span className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                    Confidence Trend
                  </span>
                  <span className="text-[9px] text-neutral-600 dark:text-neutral-400">
                    Last 15 analyses (old to new)
                  </span>
                </div>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={confidenceTrendData}
                      margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="colorConfidence"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#525252"
                            stopOpacity={0.15}
                          />
                          <stop
                            offset="95%"
                            stopColor="#525252"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="index" hide />
                      <YAxis hide domain={[0, 100]} />
                      <Tooltip
                        content={(props) => (
                          <CustomTooltip {...props} label="" />
                        )}
                        formatter={(value: number) => `${value.toFixed(2)}%`}
                        animationDuration={0}
                        isAnimationActive={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="confidence"
                        stroke="#525252"
                        strokeWidth={1}
                        fillOpacity={1}
                        fill="url(#colorConfidence)"
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Minimal Table */}
          <div className="rounded-lg border border-neutral-200/50 dark:border-neutral-800/50 bg-white/50 dark:bg-black/50 overflow-hidden backdrop-blur-sm order-2 sm:order-3">
            {/* Header with search and filters */}
            <div className="px-3 py-2 sm:py-3 border-b border-neutral-200/50 dark:border-neutral-800/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Results
                  </h2>
                  <p className="text-[9px] sm:text-[10px] text-neutral-400">
                    {totalResults} total results
                  </p>
                </div>
                {totalPages > 1 && (
                  <div className="text-[10px] sm:text-xs text-neutral-400">
                    {currentPage}/{totalPages}
                  </div>
                )}
              </div>

              {/* Search Bar */}
              <div className="relative">
                <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search actions or guidelines..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-500 dark:focus:ring-neutral-400 focus:border-transparent transition-all"
                />
              </div>

              {/* Filter and Sort Controls */}
              <div className="flex flex-col sm:flex-row gap-2">
                {/* Filter buttons */}
                <FilterButtons
                  currentFilter={filter}
                  onFilterChange={handleFilterChange}
                />

                {/* Sort dropdown */}
                <select
                  value={sort}
                  onChange={handleSortChange}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-neutral-500 dark:focus:ring-neutral-400 w-auto sm:w-auto"
                >
                  <option value="timestamp">Date</option>
                  <option value="confidence">Confidence</option>
                  <option value="action">Action</option>
                  <option value="guideline">Guideline</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto -mx-px">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow className="border-neutral-200/50 dark:border-neutral-800/50">
                    <TableHead className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 h-7 py-1">
                      Action
                    </TableHead>
                    <TableHead className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 h-7 py-1">
                      Guideline
                    </TableHead>
                    <TableHead className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 h-7 py-1">
                      Result
                    </TableHead>
                    <TableHead className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 h-7 py-1">
                      Confidence
                    </TableHead>
                    <TableHead className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 h-7 py-1">
                      Timestamp
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="flex flex-col items-center gap-1">
                          <HiDocumentText className="w-6 h-6 text-neutral-300 dark:text-neutral-700" />
                          <div className="text-[11px] text-neutral-400">
                            No results yet
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    results.map((result) => (
                      <TableRow
                        key={result.id}
                        className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 transition-colors border-neutral-200/30 dark:border-neutral-800/30"
                      >
                        <TableCell className="max-w-xs truncate text-[11px] font-medium py-1">
                          {result.action}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-[11px] text-neutral-500 dark:text-neutral-400 py-1">
                          {result.guideline}
                        </TableCell>
                        <TableCell className="py-1">
                          <ResultBadge
                            result={result.result as ComplianceResult}
                          />
                        </TableCell>
                        <TableCell className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300 py-1">
                          {(
                            safeParseConfidence(result.confidence) * 100
                          ).toFixed(2)}
                          %
                        </TableCell>
                        <TableCell className="text-[11px] text-neutral-400 py-1">
                          {new Date(result.timestamp).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Minimal Pagination */}
            {totalPages > 1 && (
              <div className="px-3 py-1.5 border-t border-neutral-200/50 dark:border-neutral-800/50 flex items-center justify-between">
                <div className="text-[10px] text-neutral-400">
                  {startIndex}-{endIndex} of {totalResults}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-6 w-6 p-0 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                  >
                    <HiChevronLeft className="w-3 h-3" />
                  </Button>
                  <div className="hidden sm:flex items-center gap-0.5">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant="ghost"
                          size="sm"
                          onClick={() => goToPage(pageNum)}
                          className={`h-6 w-6 p-0 text-[11px] ${
                            currentPage === pageNum
                              ? "bg-neutral-900 text-white hover:bg-neutral-800 hover:text-white dark:bg-neutral-100 dark:text-black dark:hover:bg-neutral-200 dark:hover:text-black"
                              : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                          }`}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <div className="sm:hidden text-[11px] text-neutral-600 dark:text-neutral-400">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="h-6 w-6 p-0 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                  >
                    <HiChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </PageBackground>
    </>
  );
}

function MinimalStatCard({
  label,
  value,
  icon: Icon,
  variant = "default",
}: {
  label: string;
  value: string | number;
  icon: IconType;
  variant?: "default" | "success" | "error" | "warning";
}) {
  const variantStyles = {
    default: "border-neutral-200/40 dark:border-neutral-800/40",
    success: "border-green-200/40 dark:border-green-900/20",
    error: "border-red-200/40 dark:border-red-900/20",
    warning: "border-yellow-200/40 dark:border-yellow-900/20",
  };

  const iconStyles = {
    default: "text-neutral-400",
    success: "text-green-500/70",
    error: "text-red-500/70",
    warning: "text-yellow-500/70",
  };

  return (
    <div
      className={`rounded border ${variantStyles[variant]} bg-white/30 dark:bg-black/30 p-1.5 sm:p-2 backdrop-blur-sm`}
    >
      <div className="flex items-center justify-between mb-0.5">
        <div className="text-[8px] sm:text-[9px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          {label}
        </div>
        <Icon className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${iconStyles[variant]}`} />
      </div>
      <div className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        {value}
      </div>
    </div>
  );
}

function MinimalChartCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-md border border-neutral-200/50 dark:border-neutral-800/50 bg-white/50 dark:bg-black/50 p-2.5 backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}
