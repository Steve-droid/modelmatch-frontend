// Savings dashboard API calls — thin typed wrappers over apiGet/apiPost.

import { apiGet, apiPost } from "./client";
import type {
  FeedbackResponse,
  RunFindingsResponse,
  SavingsRange,
  SavingsResponse,
  Verdict,
} from "../types/savings";

export function getSavings(
  projectId: number,
  range: SavingsRange = "all",
): Promise<SavingsResponse> {
  return apiGet<SavingsResponse>(
    `/projects/${projectId}/savings?range=${range}`,
  );
}

export function getRunFindings(
  projectId: number,
  runId: number,
): Promise<RunFindingsResponse> {
  return apiGet<RunFindingsResponse>(
    `/projects/${projectId}/runs/${runId}/findings`,
  );
}

// Record an accept/reject verdict on a finding (the quality signal, S13). The backend
// recomputes the run's quality_ok from its acceptance rate, which re-banks/excludes the
// run's savings — so callers refetch savings after this resolves.
export function submitFeedback(
  findingId: number,
  verdict: Verdict,
): Promise<FeedbackResponse> {
  return apiPost<FeedbackResponse>(`/findings/${findingId}/feedback`, { verdict });
}
