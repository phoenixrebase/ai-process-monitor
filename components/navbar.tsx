"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { HiSun, HiMoon, HiBeaker, HiChartBar, HiFilter } from "react-icons/hi";

export function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-black/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <span className="font-bold text-base sm:text-lg text-neutral-900 dark:text-neutral-100">
            <span className="hidden sm:inline">Process Monitor</span>
            <span className="sm:hidden">PM</span>
          </span>
        </Link>

        <div className="flex items-center space-x-0.5 sm:space-x-1">
          <Link
            href="/"
            className={`px-2 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 sm:gap-2 ${
              pathname === "/"
                ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
            }`}
          >
            <HiBeaker className="w-4 h-4" />
            <span className="hidden sm:inline">Analyze</span>
          </Link>

          <Link
            href="/results"
            className={`px-2 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 sm:gap-2 ${
              pathname === "/results"
                ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
            }`}
          >
            <HiChartBar className="w-4 h-4" />
            <span className="hidden sm:inline">Results</span>
          </Link>

          <Link
            href="/classify"
            className={`px-2 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 sm:gap-2 ${
              pathname === "/classify"
                ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
            }`}
          >
            <HiFilter className="w-4 h-4" />
            <span className="hidden sm:inline">Classify</span>
          </Link>

          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="px-2 sm:px-3 py-2 rounded-md text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <HiSun className="w-5 h-5" />
              ) : (
                <HiMoon className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
