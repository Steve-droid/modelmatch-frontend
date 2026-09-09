// Jenkins-connection API call. Metadata only (base URL + job name) — no secrets travel
// to Modicum; the provider key + Jenkins token live in Jenkins credentials.

import { apiGet, apiPut } from "./client";
import type { JenkinsConnectInput, JenkinsConnection } from "../types/ci";

export function connectJenkins(
  projectId: number,
  input: JenkinsConnectInput,
): Promise<JenkinsConnection> {
  return apiPut<JenkinsConnection>(`/projects/${projectId}/jenkins`, input);
}

// The project's current Jenkins metadata (GET) — prefills the edit form. 404 if the
// project has no connection yet (a setup-incomplete project).
export function getJenkins(projectId: number): Promise<JenkinsConnection> {
  return apiGet<JenkinsConnection>(`/projects/${projectId}/jenkins`);
}
