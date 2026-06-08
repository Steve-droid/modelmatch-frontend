// Deterministic recommender API calls (no LLM). Thin typed wrappers over apiPost.

import { apiPost } from "./client";
import type {
  PrefillResult,
  RecommendationRequest,
  RecommendationResult,
} from "../types/recommend";

// Free-text → suggested form fields (user confirms before ranking).
export function postPrefill(text: string): Promise<PrefillResult> {
  return apiPost<PrefillResult>("/recommendations/prefill", { text });
}

// Form inputs → ranked result (suggested + baseline + comparability + shortlist).
export function postRecommendation(
  req: RecommendationRequest,
): Promise<RecommendationResult> {
  return apiPost<RecommendationResult>("/recommendations", req);
}
