// Savings dashboard API calls — thin typed wrappers over apiGet.

import { apiGet } from "./client";
import type {
  RunFindingsResponse,
  SavingsRange,
  SavingsResponse,
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
