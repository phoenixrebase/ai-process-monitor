import axios from "axios";
import type {
  ComplianceResult,
  AnalyzeResult,
  HFResponseObject,
} from "./analyze.types";
import { CANDIDATE_LABELS, API_TIMEOUT, DEFAULT_RETRIES } from "./constants";
import { hfLogger } from "./logger";

export async function analyzeCompliance(
  action: string,
  guideline: string,
  apiToken: string,
  apiUrl: string,
  retries = DEFAULT_RETRIES
): Promise<AnalyzeResult> {
  if (!apiToken || !apiUrl) {
    throw new Error(`API ${!apiToken ? "token" : "URL"} is required`);
  }

  if (!action?.trim() || !guideline?.trim()) {
    throw new Error("action and guideline are required and cannot be empty");
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data, status } = await axios.post<HFResponseObject>(
        apiUrl,
        {
          inputs: `Guideline: ${guideline}\nAction taken: ${action}`,
          parameters: {
            candidate_labels: CANDIDATE_LABELS,
            multi_label: false,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          timeout: API_TIMEOUT,
        }
      );

      if (status !== 200) {
        const errorMsg =
          status >= 502 && status <= 504
            ? `HuggingFace returned ${status}: Gateway/Infrastructure error - service temporarily unavailable`
            : `HuggingFace returned ${status}: ${JSON.stringify(data)}`;
        throw new Error(errorMsg);
      }

      if (!data || typeof data !== "object") {
        throw new Error(`Unexpected API response type: ${typeof data}`);
      }

      const { labels, scores } = data;

      if (
        !Array.isArray(labels) ||
        !Array.isArray(scores) ||
        !labels.length ||
        !scores.length
      ) {
        throw new Error(
          `Missing labels or scores in response: ${JSON.stringify(data)}`
        );
      }

      const topIndex = scores.indexOf(Math.max(...scores));
      const topLabel = labels[topIndex]?.toUpperCase();
      const confidence = scores[topIndex];

      const validResults: ComplianceResult[] = [
        "COMPLIES",
        "DEVIATES",
        "UNCLEAR",
      ];
      if (!topLabel || !validResults.includes(topLabel as ComplianceResult)) {
        throw new Error(
          `Invalid compliance result from API: "${topLabel}". Expected one of: ${validResults.join(
            ", "
          )}`
        );
      }

      return {
        result: topLabel as ComplianceResult,
        confidence,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        hfLogger.error(`Error on attempt ${attempt + 1}`, error, {
          code: error.code,
          status: error.response?.status,
        });
      } else {
        hfLogger.error(`Error on attempt ${attempt + 1}`, error);
      }

      if (attempt === retries) {
        if (axios.isAxiosError(error) && error.code === "ECONNABORTED") {
          throw new Error(
            `HuggingFace API timeout after ${
              retries + 1
            } attempts - model failed to load`
          );
        }
        throw error;
      }

      const waitTime = Math.pow(2, attempt + 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  throw new Error("All retry attempts failed");
}
