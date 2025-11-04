import { create } from "zustand";
import axios from "axios";
import {
  FormData,
  AnalyzeResponse,
  ClassifyResponse,
} from "@/lib/analyze.types";
import { toast } from "sonner";
import { storeLogger } from "./logger";
import { CLIENT_TIMEOUT, DEFAULT_ITEMS_PER_PAGE } from "./constants";
import { handleApiError } from "./error-utils";
import type { FilterOption } from "@/components/filter-buttons";

export type ComplianceRecord = {
  id: number;
  action: string;
  guideline: string;
  result: string;
  confidence: string;
  timestamp: Date;
  createdAt: Date;
};

interface Store {
  form: FormData;
  loading: boolean;
  result: AnalyzeResponse | null;
  classifyAction: string;
  classifyLoading: boolean;
  classifyResult: ClassifyResponse | null;
  results: ComplianceRecord[];
  resultsLoading: boolean;
  resultsError: string | null;
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  totalResults: number;
  resultsFilter: FilterOption;
  resultsSortBy: string;
  resultsSearch: string;
  setFormField: (field: keyof FormData, value: string) => void;
  submitAnalysis: () => Promise<void>;
  resetResult: () => void;
  setClassifyAction: (action: string) => void;
  submitClassify: () => Promise<void>;
  resetClassifyResult: () => void;
  fetchResults: () => Promise<void>;
  setCurrentPage: (page: number) => void;
  goToPage: (page: number) => void;
  setResultsFilter: (filter: FilterOption) => void;
  setResultsSortBy: (sortBy: string) => void;
  setResultsSearch: (search: string) => void;
}

export const useStore = create<Store>((set, get) => ({
  form: {
    action: "",
    guideline: "",
  },
  loading: false,
  result: null,
  classifyAction: "",
  classifyLoading: false,
  classifyResult: null,
  results: [],
  resultsLoading: true,
  resultsError: null,
  currentPage: 1,
  itemsPerPage: DEFAULT_ITEMS_PER_PAGE,
  totalPages: 0,
  totalResults: 0,
  resultsFilter: "all",
  resultsSortBy: "timestamp",
  resultsSearch: "",
  setFormField: (field, value) => {
    set((state) => ({
      form: { ...state.form, [field]: value },
    }));
  },

  submitAnalysis: async () => {
    const { loading } = get();
    if (loading) {
      storeLogger.warn(
        "Analysis already in progress, ignoring duplicate submission"
      );
      return;
    }

    set({ loading: true, result: null });

    const toastId = toast.loading("Analyzing...please wait.");

    try {
      const { form } = get();
      const { data } = await axios.post<AnalyzeResponse>("/api/analyze", form, {
        headers: { "Content-Type": "application/json" },
        timeout: CLIENT_TIMEOUT,
      });
      set({ result: data, loading: false });
      toast.success("Analysis complete!", { id: toastId });
    } catch (err) {
      storeLogger.error("Analysis error", err);
      const errorMessage = handleApiError(err, "analysis");
      toast.error(errorMessage, { id: toastId, duration: 10000 });
      set({ loading: false });
    }
  },

  resetResult: () => set({ result: null }),

  setClassifyAction: (action) => set({ classifyAction: action }),

  submitClassify: async () => {
    const { classifyAction, classifyLoading } = get();

    if (classifyLoading) {
      storeLogger.warn(
        "Classification already in progress, ignoring duplicate submission"
      );
      return;
    }

    if (!classifyAction?.trim()) {
      toast.error("Please enter an action to classify");
      return;
    }

    set({ classifyLoading: true, classifyResult: null });

    const toastId = toast.loading(
      "Classifying action against all guidelines..."
    );

    try {
      const { data } = await axios.post<ClassifyResponse>(
        "/api/classify",
        { action: classifyAction },
        {
          headers: { "Content-Type": "application/json" },
          timeout: CLIENT_TIMEOUT,
        }
      );

      set({ classifyResult: data, classifyLoading: false });

      if (data.results.length === 0) {
        toast.info("No guidelines found to classify against", { id: toastId });
      } else {
        toast.success(
          `Classification complete! Matched against ${
            data.results.length
          } guideline${data.results.length === 1 ? "" : "s"}`,
          { id: toastId }
        );
      }
    } catch (err) {
      storeLogger.error("Classification error", err);
      const errorMessage = handleApiError(err, "classification");
      toast.error(errorMessage, { id: toastId, duration: 10000 });
      set({ classifyLoading: false });
    }
  },

  resetClassifyResult: () => set({ classifyResult: null }),

  fetchResults: async () => {
    set({ resultsLoading: true, resultsError: null });

    try {
      const {
        currentPage,
        itemsPerPage,
        resultsFilter,
        resultsSortBy,
        resultsSearch,
      } = get();

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        filter: resultsFilter,
        sortBy: resultsSortBy,
      });

      if (resultsSearch.trim()) {
        params.append("search", resultsSearch.trim());
      }

      const response = await fetch(`/api/results?${params.toString()}`);
      const data = await response.json();

      if (data && typeof data === "object" && "error" in data) {
        storeLogger.error("API error fetching results", undefined, {
          error: data.error,
        });

        const errorMsg =
          typeof data.error === "string" && data.error.includes("Failed query")
            ? "Unable to connect to database. Please check your database connection."
            : data.error;

        set({ resultsError: errorMsg, results: [], resultsLoading: false });
        return;
      }

      if (
        data &&
        typeof data === "object" &&
        "results" in data &&
        "pagination" in data
      ) {
        set({
          results: data.results,
          totalPages: data.pagination.totalPages,
          totalResults: data.pagination.total,
          resultsError: null,
          resultsLoading: false,
        });
      } else {
        storeLogger.error("Unexpected response format", undefined, {
          dataType: typeof data,
        });
        set({
          resultsError: "Received unexpected data format from server",
          results: [],
          resultsLoading: false,
        });
      }
    } catch (err) {
      storeLogger.error("Fetch error", err);
      set({
        resultsError: "Network error - unable to fetch results",
        results: [],
        resultsLoading: false,
      });
    }
  },

  setCurrentPage: (page) => set({ currentPage: page }),

  goToPage: (page) => {
    const { totalPages, fetchResults } = get();
    const validPage = Math.max(1, Math.min(page, totalPages || 1));
    set({ currentPage: validPage });
    fetchResults();
  },

  setResultsFilter: (filter) => {
    set({ resultsFilter: filter, currentPage: 1 });
    get().fetchResults();
  },

  setResultsSortBy: (sortBy) => {
    set({ resultsSortBy: sortBy, currentPage: 1 });
    get().fetchResults();
  },

  setResultsSearch: (search) => {
    set({ resultsSearch: search, currentPage: 1 });
    get().fetchResults();
  },
}));
