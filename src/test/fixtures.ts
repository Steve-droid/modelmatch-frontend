import type { SavingsResponse, SavingsSeriesPoint } from "../types/savings";
import type {
  ChatAnswerResponse,
  ChatHistoryResponse,
} from "../types/chat";
import type { Project } from "../types/project";
import type { RecommendationResult } from "../types/recommend";
import type { CiSetup, JenkinsConnection } from "../types/ci";

// A representative dashboard payload for component tests: a banked run, a quality-risk
// run (excluded from the headline but present), and an unrated run.
export const savingsFixture: SavingsResponse = {
  range: "all",
  selectedModel: "Gemini 2.5 Flash",
  baselineModel: "Claude Sonnet 4.x",
  kpis: {
    cumulativeSaved: "0.045000",
    savedPct: 64.3,
    baselineTotal: "0.070000",
    spendThisPeriod: "0.025000",
    qualityRisk: "0.018000",
    projectedMonthlySpend: "0.250000",
    projectedMonthlySavings: "0.450000",
    acceptanceRate: 0.86,
    qualityStatus: "banking",
    threshold: 0.8,
    runsCount: 3,
    bankedRuns: 1,
    qualityRiskRuns: 1,
    unratedRuns: 1,
  },
  series: [
    {
      date: "2026-06-02T10:00:00Z",
      jenkinsBuildId: "x",
      actual: "0.010000",
      baseline: "0.030000",
      savings: "0.020000",
      qualityOk: true,
      acceptanceRate: 1.0,
    },
    {
      date: "2026-06-04T10:00:00Z",
      jenkinsBuildId: "x",
      actual: "0.010000",
      baseline: "0.028000",
      savings: "0.018000",
      qualityOk: false,
      acceptanceRate: 0.5,
    },
    {
      date: "2026-06-06T10:00:00Z",
      jenkinsBuildId: "x",
      actual: "0.005000",
      baseline: "0.012000",
      savings: "0.007000",
      qualityOk: null,
      acceptanceRate: null,
    },
  ],
  runs: [
    {
      id: 1,
      jenkinsBuildId: "101",
      createdAt: "2026-06-02T10:00:00Z",
      model: "claude-haiku-4-5",
      tokensIn: 1200,
      tokensOut: 340,
      actualCost: "0.010000",
      baselineCost: "0.030000",
      savings: "0.020000",
      qualityOk: true,
      acceptanceRate: 1.0,
      gate: "pass",
      findingsCount: 2,
    },
    {
      id: 2,
      jenkinsBuildId: "102",
      createdAt: "2026-06-04T10:00:00Z",
      model: "claude-haiku-4-5",
      tokensIn: 1200,
      tokensOut: 340,
      actualCost: "0.010000",
      baselineCost: "0.028000",
      savings: "0.018000",
      qualityOk: false,
      acceptanceRate: 0.5,
      gate: "pass",
      findingsCount: 2,
    },
    {
      id: 3,
      jenkinsBuildId: "103",
      createdAt: "2026-06-06T10:00:00Z",
      model: "claude-haiku-4-5",
      tokensIn: 600,
      tokensOut: 180,
      actualCost: "0.005000",
      baselineCost: "0.012000",
      savings: "0.007000",
      qualityOk: null,
      acceptanceRate: null,
      gate: "pass",
      findingsCount: 1,
    },
  ],
};

// The user's projects (for the switcher). Two so the dropdown variant renders.
export const projectsFixture: Project[] = [
  {
    id: 1,
    name: "acme-api",
    userId: 1,
    selectedOptionId: 10,
    selectedOptionModel: "claude-haiku-4-5",
    baselineModelId: 20,
    baselineModel: "claude-sonnet-4-5",
    baselineVendor: "Anthropic",
    setupComplete: true,
  },
  {
    id: 2,
    name: "billing-svc",
    userId: 1,
    selectedOptionId: 11,
    selectedOptionModel: "gemini-2.5-flash",
    baselineModelId: 20,
    baselineModel: "claude-sonnet-4-5",
    baselineVendor: "Anthropic",
    setupComplete: true,
  },
];

// Chat history: the server-seeded "explain my spend" opener (with a savings trace)
// as the first assistant message — the FE renders it, never generates it.
export const chatHistoryFixture: ChatHistoryResponse = {
  messages: [
    {
      id: 1,
      role: "assistant",
      text: "You've banked $0.045 vs your Sonnet baseline across 3 CI runs — about 64% saved. Quality is holding at 86% acceptance.",
      createdAt: "2026-06-06T10:05:00Z",
      retrievalTrace: [
        {
          kind: "savings",
          ref: "savings:project",
          snippet: "cumulative saved $0.045 · acceptance 86%",
        },
      ],
    },
  ],
};

// A grounded answer to a follow-up, citing a catalog row + the savings snapshot.
export const chatAnswerFixture: ChatAnswerResponse = {
  answer:
    "Claude Haiku 4.5 is your cheapest passing model at $0.0015/run; Sonnet would cost ~$0.0042/run for the same review.",
  ok: true,
  refused: false,
  retrievalTrace: [
    {
      kind: "benchmark_result",
      ref: "chat_catalog:42",
      snippet: "claude-haiku-4-5 · ci_review 0.71 · $0.80/Mtok",
    },
    {
      kind: "savings",
      ref: "savings:project",
      snippet: "actual $0.0015/run vs baseline $0.0042/run",
    },
  ],
  debug: null,
};

// An honest out-of-scope refusal (ok=false, refused=true, no trace).
export const chatRefusalFixture: ChatAnswerResponse = {
  answer: "I can't answer that from your savings or catalog data.",
  ok: false,
  refused: true,
  retrievalTrace: [],
  debug: null,
};

// A ranked recommendation: two shortlist options (Haiku suggested, Nova 2 Lite) within
// one comparability group, plus the costed baseline. Decimal fields are JSON strings.
export const recommendationFixture: RecommendationResult = {
  profileId: 1,
  comparabilityGroup: { benchmark: "CodeReviewBench", metric: "ci_review" },
  suggested: {
    recommendationOptionId: 11,
    rank: 1,
    model: "Claude Haiku 4.5",
    modelId: 3,
    vendor: "Anthropic",
    benchmark: "CodeReviewBench",
    metric: "ci_review",
    score: "0.710000",
    costPerMtok: "2.000000",
    qualityNorm: "0.890000",
    costNorm: "0.250000",
    rankScore: "0.820000",
    benchmarkResultId: 7,
  },
  baseline: {
    model: "Claude Sonnet 4.5",
    modelId: 9,
    vendor: "Anthropic",
    costPerMtok: "8.000000",
    benchmarkResultId: 5,
    selection: "configured",
  },
  shortlist: [
    {
      recommendationOptionId: 11,
      rank: 1,
      model: "Claude Haiku 4.5",
      modelId: 3,
      vendor: "Anthropic",
      benchmark: "CodeReviewBench",
      metric: "ci_review",
      score: "0.710000",
      costPerMtok: "2.000000",
      qualityNorm: "0.890000",
      costNorm: "0.250000",
      rankScore: "0.820000",
      benchmarkResultId: 7,
    },
    {
      recommendationOptionId: 12,
      rank: 2,
      model: "Nova 2 Lite",
      modelId: 4,
      vendor: "Amazon",
      benchmark: "CodeReviewBench",
      metric: "ci_review",
      score: "0.640000",
      costPerMtok: "0.850000",
      qualityNorm: "0.800000",
      costNorm: "0.106000",
      rankScore: "0.760000",
      benchmarkResultId: 8,
    },
  ],
};

// The project returned by POST /projects (created from the chosen option + baseline).
export const createdProjectFixture: Project = {
  id: 7,
  name: "acme-api",
  userId: 1,
  selectedOptionId: 11,
  selectedOptionModel: "Claude Haiku 4.5",
  baselineModelId: 9,
  baselineModel: "Claude Sonnet 4.5",
  baselineVendor: "Anthropic",
  setupComplete: false,
};

export const jenkinsConnectionFixture: JenkinsConnection = {
  projectId: 7,
  baseUrl: "https://jenkins.example.com",
  jobName: "acme-api/main",
  status: "configured",
};

// CI setup with the mint-once token present (first fetch) …
export const ciSetupFixture: CiSetup = {
  snippet: "stage('ModelMatch') {\n  steps { sh 'docker run modelmatch-agent' }\n}",
  imageRef: "832285994273.dkr.ecr.ap-south-1.amazonaws.com/modelmatch-agent:1.2.0",
  ciRunsUrl: "http://localhost:8000/projects/7/ci-runs",
  token: "mmci_s3cr3t_one_time_value",
};

// … and the same after the token was already minted (null on subsequent fetches).
export const ciSetupNoTokenFixture: CiSetup = {
  ...ciSetupFixture,
  token: null,
};

// An overspend point/run: the recommended model cost MORE than baseline (negative
// savings). Used to prove the chart/table/KPI surface overspend in red, not green.
export const overspendSeriesPoint: SavingsSeriesPoint = {
  date: "2026-06-05T10:00:00Z",
  jenkinsBuildId: "207",
  actual: "0.040000",
  baseline: "0.030000",
  savings: "-0.010000", // baseline − actual < 0 → overspend
  qualityOk: true,
  acceptanceRate: 1.0,
};

// A whole-dashboard payload whose net result is an overspend (negative cumulative).
export const overspendFixture: SavingsResponse = {
  range: "all",
  selectedModel: "Gemini 2.5 Flash",
  baselineModel: "Claude Sonnet 4.6",
  kpis: {
    cumulativeSaved: "-0.010000",
    savedPct: -33.3,
    baselineTotal: "0.030000",
    spendThisPeriod: "0.040000",
    qualityRisk: "0.000000",
    projectedMonthlySpend: null,
    projectedMonthlySavings: null,
    acceptanceRate: 1.0,
    qualityStatus: "banking",
    threshold: 0.8,
    runsCount: 1,
    bankedRuns: 1,
    qualityRiskRuns: 0,
    unratedRuns: 0,
  },
  series: [overspendSeriesPoint],
  runs: [
    {
      id: 7,
      jenkinsBuildId: "207",
      createdAt: "2026-06-05T10:00:00Z",
      model: "Gemini 2.5 Flash",
      tokensIn: 8000,
      tokensOut: 4000,
      actualCost: "0.040000",
      baselineCost: "0.030000",
      savings: "-0.010000",
      qualityOk: true,
      acceptanceRate: 1.0,
      gate: "pass",
      findingsCount: 1,
    },
  ],
};
