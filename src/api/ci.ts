// CI-setup API call. Returns the Jenkins stage snippet + ingest URL; `token` carries
// the plaintext per-project ingest token ONLY on the first fetch (mint-once).

import { apiGet } from "./client";
import type { CiSetup } from "../types/ci";

export function getCiSetup(projectId: number): Promise<CiSetup> {
  return apiGet<CiSetup>(`/projects/${projectId}/ci-setup`);
}
