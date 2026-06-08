// CI-setup API call. Returns the Jenkins stage snippet + ingest URL; `token` carries
// the plaintext per-project ingest token ONLY on the first fetch (mint-once).

import { apiGet, apiPost } from "./client";
import type { CiSetup } from "../types/ci";

export function getCiSetup(projectId: number): Promise<CiSetup> {
  return apiGet<CiSetup>(`/projects/${projectId}/ci-setup`);
}

// Issue a FRESH per-project ingest token, replacing any existing one. Recovery for a
// mint-once token that was never copied; the old token stops working immediately.
export function rotateCiToken(projectId: number): Promise<CiSetup> {
  return apiPost<CiSetup>(`/projects/${projectId}/ci-setup/rotate`, {});
}
