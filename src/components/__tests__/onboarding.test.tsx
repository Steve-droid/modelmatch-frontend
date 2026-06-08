import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { JenkinsConnectForm } from "../onboarding/JenkinsConnectForm";
import { CiSetupView } from "../onboarding/CiSetupView";
import { ApiError } from "../../api/client";
import {
  jenkinsConnectionFixture,
  ciSetupFixture,
  ciSetupNoTokenFixture,
} from "../../test/fixtures";

vi.mock("../../api/jenkins", () => ({ connectJenkins: vi.fn() }));
import { connectJenkins } from "../../api/jenkins";
vi.mock("../../api/ci", () => ({ getCiSetup: vi.fn() }));
import { getCiSetup } from "../../api/ci";

beforeEach(() => {
  vi.mocked(connectJenkins).mockReset();
  vi.mocked(getCiSetup).mockReset();
});

function fillJenkins() {
  fireEvent.change(screen.getByLabelText("Jenkins base URL"), {
    target: { value: "https://jenkins.example.com" },
  });
  fireEvent.change(screen.getByLabelText("Job name"), { target: { value: "acme-api/main" } });
}

describe("JenkinsConnectForm (metadata only)", () => {
  it("never asks for the provider key or a Jenkins API token", () => {
    render(<JenkinsConnectForm projectId={7} onConnected={vi.fn()} />);
    // no secret inputs at all
    expect(screen.queryByLabelText("Model API key")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Jenkins API token")).not.toBeInTheDocument();
    expect(document.querySelector('input[type="password"]')).toBeNull();
    // instead it shows the user-created Jenkins credential ids…
    expect(screen.getByText("modelmatch-model-api-key")).toBeInTheDocument();
    expect(screen.getByText("modelmatch-ci-token")).toBeInTheDocument();
    // …and never claims secrets are stored by the backend
    expect(screen.queryByText(/sent to the backend/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/never leave the backend/i)).not.toBeInTheDocument();
  });

  it("sends only base URL + job name (secrets are the non-secret bridge sentinel)", async () => {
    vi.mocked(connectJenkins).mockResolvedValue(jenkinsConnectionFixture);
    const onConnected = vi.fn();
    render(<JenkinsConnectForm projectId={7} onConnected={onConnected} />);

    fillJenkins();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => expect(onConnected).toHaveBeenCalledWith(jenkinsConnectionFixture));
    const [pid, body] = vi.mocked(connectJenkins).mock.calls[0];
    expect(pid).toBe(7);
    expect(body.baseUrl).toBe("https://jenkins.example.com");
    expect(body.jobName).toBe("acme-api/main");
    // the bridge values are NOT real secrets the user typed
    expect(body.jenkinsToken).toBe(body.modelApiKey); // same sentinel
    expect(body.modelApiKey).not.toMatch(/sk-|token/i);
  });

  it("bubbles a 401 up via onUnauthorized", async () => {
    vi.mocked(connectJenkins).mockRejectedValue(new ApiError(401, "expired"));
    const onUnauthorized = vi.fn();
    render(<JenkinsConnectForm projectId={7} onConnected={vi.fn()} onUnauthorized={onUnauthorized} />);
    fillJenkins();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => expect(onUnauthorized).toHaveBeenCalled());
  });
});

describe("CiSetupView", () => {
  it("shows a loading state, then the snippet + the mint-once token", async () => {
    vi.mocked(getCiSetup).mockResolvedValue(ciSetupFixture);
    render(<CiSetupView projectId={7} onDone={vi.fn()} />);

    expect(screen.getByText(/Loading setup…/)).toBeInTheDocument();
    expect(await screen.findByText(/shown once/i)).toBeInTheDocument();
    expect(screen.getByText("mmci_s3cr3t_one_time_value")).toBeInTheDocument();
    expect(screen.getByText(/stage\('ModelMatch'\)/)).toBeInTheDocument();
  });

  it("explains the null-token case (already minted) without showing a token", async () => {
    vi.mocked(getCiSetup).mockResolvedValue(ciSetupNoTokenFixture);
    render(<CiSetupView projectId={7} onDone={vi.fn()} />);

    expect(await screen.findByText(/already minted/i)).toBeInTheDocument();
    expect(screen.queryByText(/shown once/i)).not.toBeInTheDocument();
    expect(screen.queryByText("mmci_s3cr3t_one_time_value")).not.toBeInTheDocument();
  });

  it("advances to the dashboard on 'Go to dashboard'", async () => {
    vi.mocked(getCiSetup).mockResolvedValue(ciSetupFixture);
    const onDone = vi.fn();
    render(<CiSetupView projectId={7} onDone={onDone} />);
    fireEvent.click(await screen.findByRole("button", { name: /go to dashboard/i }));
    expect(onDone).toHaveBeenCalled();
  });

  it("shows an error state when the setup fetch fails", async () => {
    vi.mocked(getCiSetup).mockRejectedValue(new ApiError(500, "boom"));
    render(<CiSetupView projectId={7} onDone={vi.fn()} />);
    expect(await screen.findByText("boom")).toBeInTheDocument();
  });

  it("bubbles a 401 up via onUnauthorized", async () => {
    vi.mocked(getCiSetup).mockRejectedValue(new ApiError(401, "expired"));
    const onUnauthorized = vi.fn();
    render(<CiSetupView projectId={7} onDone={vi.fn()} onUnauthorized={onUnauthorized} />);
    await waitFor(() => expect(onUnauthorized).toHaveBeenCalled());
  });
});
