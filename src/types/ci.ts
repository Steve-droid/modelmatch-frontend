// Types mirroring the Jenkins-connection + CI-setup DTOs (app/schemas/jenkins.py,
// app/schemas/ci.py; camelCase out). Secrets never travel to ModelMatch — they live
// in Jenkins credentials; the connection is metadata-only in and out (no secret refs).

// PUT /projects/{id}/jenkins — metadata only (base URL + job name). The backend
// rejects any secret fields; the provider key + Jenkins token live in Jenkins.
export interface JenkinsConnectInput {
  baseUrl: string;
  jobName: string;
}

export interface JenkinsConnection {
  projectId: number;
  baseUrl: string;
  jobName: string;
  status: string;
}

// GET /projects/{id}/ci-setup — the stage snippet + ingest URL. `token` is the
// plaintext per-project ingest token ONLY on the first fetch (mint-once); null after.
export interface CiSetup {
  snippet: string;
  imageRef: string;
  ciRunsUrl: string;
  token: string | null;
  // E20: which task the stage runs — the catalog vocabulary + the agent's short name
  // — so this step can word itself per task (review image vs security image).
  taskType: string;
  task: "review" | "security";
}
