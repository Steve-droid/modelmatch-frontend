// Types mirroring the deterministic recommender DTOs (app/schemas/recommend.py;
// camelCase out). Decimal fields serialize as JSON *strings* (precision), like money
// — parse with Number() only for display.

export type BudgetSensitivity = "low" | "medium" | "high";
export type LatencyNeed = "low" | "medium" | "high";

// Form inputs → POST /recommendations.
export interface RecommendationRequest {
  taskTypes: string[];
  budgetSensitivity: BudgetSensitivity;
  latencyNeed?: LatencyNeed | null;
}

// The (benchmark, metric) group the ranking was computed within — like-for-like.
export interface ComparabilityGroup {
  benchmark: string;
  metric: string;
}

export interface RecommendationOption {
  recommendationOptionId: number; // persisted id — POST /projects selects this
  rank: number;
  model: string;
  modelId: number;
  vendor: string;
  benchmark: string;
  metric: string;
  score: string | null;
  costPerMtok: string | null;
  qualityNorm: string;
  costNorm: string;
  rankScore: string;
  benchmarkResultId: number;
}

export interface Baseline {
  model: string;
  modelId: number;
  vendor: string;
  costPerMtok: string | null;
  benchmarkResultId: number | null;
  selection: "configured" | "fallback_highest_cost";
}

export interface RecommendationResult {
  profileId: number;
  comparabilityGroup: ComparabilityGroup | null;
  suggested: RecommendationOption;
  baseline: Baseline;
  shortlist: RecommendationOption[];
}
