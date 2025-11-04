import axios from "axios";

export type OperationType = "analysis" | "classification";

export function handleApiError(
  err: unknown,
  context: OperationType
): string {
  let errorMessage =
    context === "analysis"
      ? "Analysis failed. Please try again."
      : "Classification failed. Please try again.";

  if (axios.isAxiosError(err)) {
    if (err.code === "ECONNABORTED") {
      errorMessage =
        context === "analysis"
          ? "Request timed out. HuggingFace infrastructure is overloaded - please try again later."
          : "Request timed out. Classification is taking too long - try again later.";
    } else if (err.response?.status === 504) {
      const defaultError =
        context === "analysis"
          ? "HuggingFace infrastructure is overloaded"
          : "Classification timed out";
      errorMessage = `Gateway Timeout (504): ${
        err.response.data?.error || defaultError
      }`;
    } else if (err.response?.data?.error) {
      errorMessage = `Error: ${err.response.data.error}`;
    } else if (err.message) {
      errorMessage = `Error: ${err.message}`;
    }
  } else if (err instanceof Error) {
    errorMessage = `Error: ${err.message}`;
  }

  return errorMessage;
}
