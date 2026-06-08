// Types mirroring the Jenkins-connection + CI-setup DTOs (app/schemas/jenkins.py,
// app/schemas/ci.py; camelCase out). The plaintext token + secrets only ever travel
// to the backend; refs (never the secrets) come back.

// PUT /projects/{id}/jenkins — plaintext secrets in; refs out.
export interface JenkinsConnectInput {
  baseUrl: string;
  jobName: string;
  jenkinsToken: string; // Jenkins API token (plaintext in transit only)
  modelApiKey: string; // BYOK model key (plaintext in transit only)
}

export interface JenkinsConnection {
  projectId: number;
  baseUrl: string;
  jobName: string;
  status: string;
  jenkinsTokenRef: string; // secret-store reference, NOT the token
  modelApiKeyRef: string; // secret-store reference, NOT the key
}

// GET /projects/{id}/ci-setup — the stage snippet + ingest URL. `token` is the
// plaintext per-project ingest token ONLY on the first fetch (mint-once); null after.
export interface CiSetup {
  snippet: string;
  imageRef: string;
  ciRunsUrl: string;
  token: string | null;
}
