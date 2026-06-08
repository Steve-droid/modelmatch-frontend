// Jenkins-connection API call. The plaintext Jenkins token + BYOK model key go to the
// backend ONCE (stored as secret refs); they are never returned, logged, or displayed.

import { apiPut } from "./client";
import type { JenkinsConnectInput, JenkinsConnection } from "../types/ci";

export function connectJenkins(
  projectId: number,
  input: JenkinsConnectInput,
): Promise<JenkinsConnection> {
  return apiPut<JenkinsConnection>(`/projects/${projectId}/jenkins`, input);
}
