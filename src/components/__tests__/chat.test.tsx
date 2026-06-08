import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ChatPanel } from "../ChatPanel";
import { RetrievalTraceDetail } from "../RetrievalTraceDetail";
import { ApiError } from "../../api/client";
import {
  chatHistoryFixture,
  chatAnswerFixture,
  chatRefusalFixture,
} from "../../test/fixtures";

vi.mock("../../api/chat", () => ({
  getChatHistory: vi.fn(),
  postChat: vi.fn(),
}));
import { getChatHistory, postChat } from "../../api/chat";

beforeEach(() => {
  vi.mocked(getChatHistory).mockResolvedValue(chatHistoryFixture);
  vi.mocked(postChat).mockReset();
});

describe("RetrievalTraceDetail", () => {
  it("renders nothing when there is no grounding", () => {
    const { container } = render(<RetrievalTraceDetail trace={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("hides the snippet until expanded, then reveals the kind/snippet (never SQL)", () => {
    render(<RetrievalTraceDetail trace={chatAnswerFixture.retrievalTrace} />);
    // collapsed: the disclosure label shows, snippet does not
    expect(screen.getByText(/Grounded on 2 sources/)).toBeInTheDocument();
    expect(screen.queryByText(/claude-haiku-4-5 · ci_review/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/Grounded on 2 sources/));
    expect(screen.getByText("Catalog row")).toBeInTheDocument();
    expect(screen.getByText(/claude-haiku-4-5 · ci_review/)).toBeInTheDocument();
  });
});

describe("ChatPanel", () => {
  it("renders the server-seeded opener from history", async () => {
    render(<ChatPanel projectId={1} />);
    expect(await screen.findByText(/You've banked \$0.045/)).toBeInTheDocument();
    // opener's trace is collapsed by default
    expect(screen.getByText(/Grounded on 1 source/)).toBeInTheDocument();
    expect(screen.queryByText(/cumulative saved/)).not.toBeInTheDocument();
  });

  it("disables send for an empty question and shows the empty/loading flow", async () => {
    render(<ChatPanel projectId={1} />);
    await screen.findByText(/You've banked/);
    expect(screen.getByLabelText("Send")).toBeDisabled();
  });

  it("sends a question and appends the grounded answer", async () => {
    vi.mocked(postChat).mockResolvedValue(chatAnswerFixture);
    render(<ChatPanel projectId={1} />);
    await screen.findByText(/You've banked/);

    fireEvent.change(screen.getByLabelText("Ask a question"), {
      target: { value: "which model is cheapest?" },
    });
    fireEvent.click(screen.getByLabelText("Send"));

    expect(screen.getByText("which model is cheapest?")).toBeInTheDocument();
    expect(await screen.findByText(/Claude Haiku 4.5 is your cheapest/)).toBeInTheDocument();
    expect(postChat).toHaveBeenCalledWith(1, "which model is cheapest?");
  });

  it("sends on Enter (Shift+Enter does not)", async () => {
    vi.mocked(postChat).mockResolvedValue(chatAnswerFixture);
    render(<ChatPanel projectId={1} />);
    await screen.findByText(/You've banked/);
    const input = screen.getByLabelText("Ask a question");

    fireEvent.change(input, { target: { value: "q" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(postChat).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(postChat).toHaveBeenCalledWith(1, "q"));
  });

  it("shows a friendly in-thread notice on a 429 rate-limit", async () => {
    vi.mocked(postChat).mockRejectedValue(new ApiError(429, "cap hit"));
    render(<ChatPanel projectId={1} />);
    await screen.findByText(/You've banked/);

    fireEvent.change(screen.getByLabelText("Ask a question"), {
      target: { value: "again?" },
    });
    fireEvent.click(screen.getByLabelText("Send"));

    expect(await screen.findByText(/hit the model's hourly limit/)).toBeInTheDocument();
  });

  it("renders an honest refusal as a normal answer (no trace)", async () => {
    vi.mocked(postChat).mockResolvedValue(chatRefusalFixture);
    render(<ChatPanel projectId={1} />);
    await screen.findByText(/You've banked/);

    fireEvent.change(screen.getByLabelText("Ask a question"), {
      target: { value: "what's the weather?" },
    });
    fireEvent.click(screen.getByLabelText("Send"));

    expect(await screen.findByText(/can't answer that from your savings/)).toBeInTheDocument();
  });

  it("surfaces a load error for a 403 (no access)", async () => {
    vi.mocked(getChatHistory).mockRejectedValue(new ApiError(403, "nope"));
    render(<ChatPanel projectId={9} />);
    expect(await screen.findByText(/don't have access to this project's chat/)).toBeInTheDocument();
  });

  it("bubbles a 401 up via onUnauthorized", async () => {
    vi.mocked(getChatHistory).mockRejectedValue(new ApiError(401, "expired"));
    const onUnauthorized = vi.fn();
    render(<ChatPanel projectId={1} onUnauthorized={onUnauthorized} />);
    await waitFor(() => expect(onUnauthorized).toHaveBeenCalled());
  });

  it("drops an in-flight answer if the project switches before it resolves", async () => {
    // History differs per project so we can tell which conversation is on screen.
    vi.mocked(getChatHistory)
      .mockResolvedValueOnce({
        messages: [{ id: 1, role: "assistant", text: "PROJECT-ONE opener", createdAt: null, retrievalTrace: [] }],
      })
      .mockResolvedValueOnce({
        messages: [{ id: 2, role: "assistant", text: "PROJECT-TWO opener", createdAt: null, retrievalTrace: [] }],
      });
    // The answer for project 1 stays pending until we release it.
    let release!: (v: typeof chatAnswerFixture) => void;
    vi.mocked(postChat).mockReturnValue(new Promise((res) => { release = res; }));

    const { rerender } = render(<ChatPanel projectId={1} />);
    await screen.findByText("PROJECT-ONE opener");
    fireEvent.change(screen.getByLabelText("Ask a question"), { target: { value: "ask on project 1" } });
    fireEvent.click(screen.getByLabelText("Send"));

    // Switch to project 2 before project 1's answer comes back.
    rerender(<ChatPanel projectId={2} />);
    await screen.findByText("PROJECT-TWO opener");

    // Now project 1's answer resolves — it must NOT appear in project 2's conversation.
    release(chatAnswerFixture);
    await waitFor(() => expect(screen.queryByText(/Claude Haiku 4.5 is your cheapest/)).not.toBeInTheDocument());
    expect(screen.queryByText("ask on project 1")).not.toBeInTheDocument();
  });
});
