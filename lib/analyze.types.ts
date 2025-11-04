export type ComplianceResult = "COMPLIES" | "DEVIATES" | "UNCLEAR";

export type AnalyzeResult = {
  result: ComplianceResult;
  confidence: number;
};

export type AnalyzeRequest = {
  action: string;
  guideline: string;
};

export type AnalyzeResponse = {
  action: string;
  guideline: string;
  result: ComplianceResult;
  confidence: number;
  timestamp: string;
};

export type HFResponseObject = {
  labels: string[];
  scores: number[];
  sequence: string;
};

export type FormData = {
  action: string;
  guideline: string;
};

export type ClassifyRequest = {
  action: string;
};

export type ClassifyResult = {
  guideline: string;
  result: ComplianceResult;
  confidence: number;
};

export type ClassifyResponse = {
  action: string;
  results: ClassifyResult[];
  timestamp: string;
  totalGuidelines: number;
};
