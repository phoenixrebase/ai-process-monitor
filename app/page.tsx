"use client";
import Form from "@/components/form";
import { Navbar } from "@/components/navbar";
import { ResultBadge } from "@/components/result-badge";
import { Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { PageBackground } from "@/components/page-background";
import { useStore } from "@/lib/store";
import { HiX } from "react-icons/hi";

export default function Home() {
  const { result, resetResult } = useStore();

  return (
    <>
      <Toaster position="top-right" richColors />
      <Navbar />
      <PageBackground>
        <div className="container mx-auto px-4 pb-2 max-w-2xl pt-16 sm:pt-[4.125rem]">
          <div className="max-w-2xl w-full space-y-6">
            <Form />

            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="max-w-md w-full mx-auto rounded-xl p-6 border border-neutral-200/50 dark:border-neutral-800/50 bg-white/50 dark:bg-black/50 backdrop-blur-sm pointer-events-auto relative"
                >
                  <button
                    onClick={resetResult}
                    className="absolute top-4 right-4 p-1 rounded-md text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    aria-label="Close result"
                  >
                    <HiX className="w-5 h-5" />
                  </button>
                  <h3 className="font-bold text-xl sm:text-2xl text-neutral-900 dark:text-neutral-100 mb-3 sm:mb-4 pr-8">
                    Analysis Result
                  </h3>
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center gap-3">
                      <ResultBadge result={result.result} />
                      <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
                        {(result.confidence * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="text-sm text-neutral-600 dark:text-neutral-400 space-y-2">
                      <div>
                        <span className="font-medium">Action:</span>{" "}
                        {result.action}
                      </div>
                      <div>
                        <span className="font-medium">Guideline:</span>{" "}
                        {result.guideline}
                      </div>
                      <div>
                        <span className="font-medium">Timestamp:</span>{" "}
                        {new Date(result.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </PageBackground>
    </>
  );
}
