// Jenkins-connection API call. Metadata only (base URL + job name) — no secrets travel
// to ModelMatch; the provider key + Jenkins token live in Jenkins credentials.

import { apiPut } from "./client";
import type { JenkinsConnectInput, JenkinsConnection } from "../types/ci";

export function connectJenkins(
  projectId: number,
  input: JenkinsConnectInput,
): Promise<JenkinsConnection> {
  return apiPut<JenkinsConnection>(`/projects/${projectId}/jenkins`, input);
}
