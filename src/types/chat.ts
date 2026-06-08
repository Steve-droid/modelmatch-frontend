// Types mirroring the backend's grounded-chat DTOs (app/schemas/chat.py). The wire
// is camelCase (CamelModel). The chat answer is plain text; the retrieval trace is a
// list of the rows/figures the answer was grounded on (architecture §4.2).

// Which grounding source an assistant message used. `kind` is 'savings' (the spend
// snapshot) or 'benchmark_result' (a catalog row); `ref` names the row/figure and
// `snippet` is a human-readable line. `kind` is widened to string so an unknown
// future kind still renders rather than breaking.
export interface RetrievalTrace {
  kind: "savings" | "benchmark_result" | (string & {});
  ref: string;
  snippet: string | null;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: number;
  role: ChatRole;
  text: string | null;
  createdAt: string | null; // ISO-8601
  retrievalTrace: RetrievalTrace[]; // empty for user messages
}

// GET /projects/{id}/chat — the persisted conversation. The first assistant message
// is the server-seeded "explain my spend" opener (no LLM); the FE never generates it.
export interface ChatHistoryResponse {
  messages: ChatMessage[];
}

// POST /projects/{id}/chat { question } — a grounded answer. `debug` is always null
// for normal users (raw SQL/internals hidden); the FE never reads it.
export interface ChatAnswerResponse {
  answer: string;
  ok: boolean; // a grounded answer was produced
  refused: boolean; // off-topic / unanswerable → honest refusal
  retrievalTrace: RetrievalTrace[];
  debug: null;
}
