"use client";
import { useState, useMemo, useCallback } from "react";
import { Navbar } from "@/components/navbar";
import { PageBackground } from "@/components/page-background";
import { useStore } from "@/lib/store";
import { Toaster } from "sonner";
import { ResultBadge } from "@/components/result-badge";
import { ComplianceResult } from "@/lib/analyze.types";
import { ClassifySortOption } from "@/lib/types";
import { FilterButtons, FilterOption } from "@/components/filter-buttons";
import {
  HiFilter,
  HiSearch,
} from "react-icons/hi";
import { Button } from "@/components/ui/button";

export default function ClassifyPage() {
  const {
    classifyAction,
    classifyLoading,
    classifyResult,
    setClassifyAction,
    submitClassify,
  } = useStore();

  const [filter, setFilter] = useState<FilterOption>("all");
  const [sort, setSort] = useState<ClassifySortOption>("confidence");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredResults = useMemo(
    () =>
      classifyResult?.results
        ? classifyResult.results
            .filter(({ result, guideline }) => {
              if (filter !== "all" && result !== filter) return false;

              if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                return guideline.toLowerCase().includes(query);
              }

              return true;
            })
            .sort((a, b) => {
              if (sort === "confidence") {
                return b.confidence - a.confidence;
              } else {
                return a.guideline.localeCompare(b.guideline);
              }
            })
        : [],
    [classifyResult, filter, searchQuery, sort]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      submitClassify();
    },
    [submitClassify]
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    []
  );

  const handleFilterChange = useCallback((newFilter: FilterOption) => {
    setFilter(newFilter);
  }, []);

  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSort(e.target.value as ClassifySortOption);
    },
    []
  );

  return (
    <>
      <Toaster position="top-right" richColors />
      <Navbar />
      <PageBackground>
        <div className="container mx-auto px-4 pb-2 max-w-5xl pt-16 sm:pt-[4.125rem]">
          {/* Form Section */}
          <div className="rounded-xl border border-neutral-200/50 dark:border-neutral-800/50 bg-white/50 dark:bg-black/50 p-6 backdrop-blur-sm mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              Classify Action
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
              Check if an action complies with all previously submitted
              guidelines
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="action"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
                >
                  Action
                </label>
                <textarea
                  id="action"
                  value={classifyAction}
                  onChange={(e) => setClassifyAction(e.target.value)}
                  placeholder="Enter the action you want to classify..."
                  className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-500 dark:focus:ring-neutral-400 focus:border-transparent transition-all resize-none"
                  rows={4}
                  disabled={classifyLoading}
                />
              </div>

              <Button
                type="submit"
                disabled={classifyLoading || !classifyAction.trim()}
                className="w-full sm:w-auto bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {classifyLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Classifying...
                  </span>
                ) : (
                  "Classify Against All Guidelines"
                )}
              </Button>
            </form>
          </div>

          {/* Results Section */}
          {classifyResult && (
            <div className="rounded-xl border border-neutral-200/50 dark:border-neutral-800/50 bg-white/50 dark:bg-black/50 backdrop-blur-sm overflow-hidden">
              {/* Header with search and filters */}
              <div className="px-4 sm:px-6 py-4 border-b border-neutral-200/50 dark:border-neutral-800/50 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      Classification Results
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      {filteredResults.length} of{" "}
                      {classifyResult.totalGuidelines} guidelines
                    </p>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search guidelines..."
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
                    <option value="confidence">Confidence</option>
                    <option value="alphabetical">Alphabetical</option>
                  </select>
                </div>
              </div>

              {/* Results list */}
              <div className="divide-y divide-neutral-200/50 dark:divide-neutral-800/50">
                {filteredResults.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      No results match the selected filter
                    </p>
                  </div>
                ) : (
                  filteredResults.map(
                    ({ guideline, result, confidence }, index) => (
                      <div
                        key={index}
                        className="px-4 sm:px-6 py-4 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-neutral-900 dark:text-neutral-100 break-words">
                              {guideline}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <ResultBadge result={result as ComplianceResult} />
                            <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 tabular-nums">
                              {(confidence * 100).toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  )
                )}
              </div>
            </div>
          )}

          {/* Empty state when no results yet */}
          {!classifyResult && !classifyLoading && (
            <div className="rounded-xl border border-neutral-200/50 dark:border-neutral-800/50 bg-white/50 dark:bg-black/50 backdrop-blur-sm p-12 text-center">
              <HiFilter className="w-12 h-12 mx-auto text-neutral-300 dark:text-neutral-700 mb-4" />
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                No Classifications Yet
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Enter an action above and click classify to see how it matches
                against all guidelines
              </p>
            </div>
          )}
        </div>
      </PageBackground>
    </>
  );
}
