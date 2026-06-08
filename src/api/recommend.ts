// Deterministic recommender API calls (no LLM). Thin typed wrappers over apiPost.

import { apiPost } from "./client";
import type {
  RecommendationRequest,
  RecommendationResult,
} from "../types/recommend";

// Form inputs → ranked result (suggested + baseline + comparability + shortlist).
export function postRecommendation(
  req: RecommendationRequest,
): Promise<RecommendationResult> {
  return apiPost<RecommendationResult>("/recommendations", req);
}
