// Grounded Q&A chat API calls — thin typed wrappers over apiGet/apiPost.

import { apiGet, apiPost } from "./client";
import type { ChatAnswerResponse, ChatHistoryResponse } from "../types/chat";

// The conversation so far. First visit seeds the "explain my spend" opener
// server-side; the first assistant message IS that opener (no LLM, no POST needed).
export function getChatHistory(projectId: number): Promise<ChatHistoryResponse> {
  return apiGet<ChatHistoryResponse>(`/projects/${projectId}/chat`);
}

// Ask a grounded follow-up. 429 (hourly token cap) surfaces as ApiError(429).
export function postChat(
  projectId: number,
  question: string,
): Promise<ChatAnswerResponse> {
  return apiPost<ChatAnswerResponse>(`/projects/${projectId}/chat`, { question });
}
