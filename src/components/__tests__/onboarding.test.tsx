import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { JenkinsConnectForm } from "../onboarding/JenkinsConnectForm";
import { CiSetupView } from "../onboarding/CiSetupView";
import { Onboarding } from "../../pages/Onboarding";
import { ApiError } from "../../api/client";
import {
  recommendationFixture,
  createdProjectFixture,
  jenkinsConnectionFixture,
  ciSetupFixture,
  ciSetupNoTokenFixture,
} from "../../test/fixtures";

vi.mock("../../api/recommend", () => ({ postRecommendation: vi.fn() }));
import { postRecommendation } from "../../api/recommend";
vi.mock("../../api/projects", () => ({ createProject: vi.fn() }));
import { createProject } from "../../api/projects";
vi.mock("../../api/jenkins", () => ({ connectJenkins: vi.fn() }));
import { connectJenkins } from "../../api/jenkins";
vi.mock("../../api/ci", () => ({ getCiSetup: vi.fn(), rotateCiToken: vi.fn() }));
import { getCiSetup, rotateCiToken } from "../../api/ci";

beforeEach(() => {
  vi.mocked(postRecommendation).mockReset();
  vi.mocked(createProject).mockReset();
  vi.mocked(connectJenkins).mockReset();
  vi.mocked(getCiSetup).mockReset();
  vi.mocked(rotateCiToken).mockReset();
});

function fillJenkins(url = "https://jenkins.example.com", job = "acme-api/main") {
  fireEvent.change(screen.getByLabelText("Jenkins base URL"), { target: { value: url } });
  fireEvent.change(screen.getByLabelText("Job name"), { target: { value: job } });
}

describe("JenkinsConnectForm (metadata only + URL validation)", () => {
  it("never asks for the provider key or a Jenkins API token", () => {
    render(<JenkinsConnectForm onSubmit={vi.fn().mockResolvedValue(undefined)} />);
    expect(screen.queryByLabelText("Model API key")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Jenkins API token")).not.toBeInTheDocument();
    expect(document.querySelector('input[type="password"]')).toBeNull();
    expect(screen.getByText("modelmatch-model-api-key")).toBeInTheDocument();
    expect(screen.getByText("modelmatch-ci-token")).toBeInTheDocument();
  });

  it("shows provider-specific API-key wiring when the selected runtime uses a key", () => {
    render(
      <JenkinsConnectForm
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        runtimeHint={{
          authMode: "api_key",
          credentialEnvVar: "ANTHROPIC_API_KEY",
          modelLabel: "Claude Haiku 4.5",
          providerLabel: "Anthropic",
        }}
      />,
    );

    expect(screen.getByText("modelmatch-model-api-key")).toBeInTheDocument();
    expect(screen.getByText(/binds it as ANTHROPIC_API_KEY/i)).toBeInTheDocument();
    expect(screen.getByText("modelmatch-ci-token")).toBeInTheDocument();
  });

  it("shows Bedrock IAM guidance without a model API key credential for Nova", () => {
    render(
      <JenkinsConnectForm
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        runtimeHint={{
          authMode: "aws_iam",
          credentialEnvVar: null,
          modelLabel: "Nova 2 Lite",
          providerLabel: "Amazon Bedrock",
        }}
      />,
    );

    expect(screen.queryByText("modelmatch-model-api-key")).not.toBeInTheDocument();
    expect(screen.getByText("modelmatch-ci-token")).toBeInTheDocument();
    expect(screen.getByText(/aws iam access for bedrock/i)).toBeInTheDocument();
  });

  it("hands a metadata-only body up via onSubmit — base URL + job name only", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<JenkinsConnectForm onSubmit={onSubmit} />);

    fillJenkins();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith({
      baseUrl: "https://jenkins.example.com",
      jobName: "acme-api/main",
    });
    const body = vi.mocked(onSubmit).mock.calls[0][0];
    expect(body).not.toHaveProperty("jenkinsToken");
    expect(body).not.toHaveProperty("modelApiKey");
  });

  it("blocks Continue on an invalid URL ('aaa' must not advance)", () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<JenkinsConnectForm onSubmit={onSubmit} />);

    fillJenkins("aaa", "acme-api/main");
    const button = screen.getByRole("button", { name: /continue/i });
    expect(button).toBeDisabled();
    expect(screen.getByText(/enter a valid url/i)).toBeInTheDocument();

    fireEvent.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("blocks Continue when the job name is empty even with a valid URL", () => {
    render(<JenkinsConnectForm onSubmit={vi.fn()} />);
    fillJenkins("https://jenkins.example.com", "");
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
  });

  it("accepts a plain http URL (not HTTPS-only)", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<JenkinsConnectForm onSubmit={onSubmit} />);

    fillJenkins("http://jenkins.local:8080", "acme/main");
    expect(screen.getByRole("button", { name: /continue/i })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        baseUrl: "http://jenkins.local:8080",
        jobName: "acme/main",
      }),
    );
  });

  it("bubbles a 401 up via onUnauthorized", async () => {
    const onUnauthorized = vi.fn();
    render(
      <JenkinsConnectForm
        onSubmit={vi.fn().mockRejectedValue(new ApiError(401, "expired"))}
        onUnauthorized={onUnauthorized}
      />,
    );
    fillJenkins();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => expect(onUnauthorized).toHaveBeenCalled());
  });

  it("prefills from initial values (edit mode)", () => {
    render(
      <JenkinsConnectForm
        onSubmit={vi.fn()}
        initialBaseUrl="http://old.jenkins"
        initialJobName="old/job"
        submitLabel="Save changes"
      />,
    );
    expect(screen.getByLabelText("Jenkins base URL")).toHaveValue("http://old.jenkins");
    expect(screen.getByLabelText("Job name")).toHaveValue("old/job");
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });
});

describe("Onboarding defer-create", () => {
  function getRecommendation() {
    vi.mocked(postRecommendation).mockResolvedValue(recommendationFixture);
    render(<Onboarding onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /get recommendation/i }));
  }

  it("creates the project only at the Jenkins step, never at the pick step", async () => {
    vi.mocked(createProject).mockResolvedValue(createdProjectFixture);
    vi.mocked(connectJenkins).mockResolvedValue(jenkinsConnectionFixture);
    vi.mocked(getCiSetup).mockResolvedValue(ciSetupFixture);
    getRecommendation();

    // pick step: name + Continue — this MUST NOT create the project
    fireEvent.change(await screen.findByLabelText("Project name"), {
      target: { value: "acme-api" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    // now on the Jenkins step, still nothing created
    await screen.findByLabelText("Jenkins base URL");
    expect(createProject).not.toHaveBeenCalled();

    // valid Jenkins submit creates then connects
    fillJenkins();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => expect(createProject).toHaveBeenCalledTimes(1));
    expect(createProject).toHaveBeenCalledWith({
      name: "acme-api",
      selectedOptionId: 11,
      baselineModelId: 9,
    });
    await waitFor(() =>
      expect(connectJenkins).toHaveBeenCalledWith(createdProjectFixture.id, {
        baseUrl: "https://jenkins.example.com",
        jobName: "acme-api/main",
      }),
    );
  });

  it("abandoning before the Jenkins submit creates no project", async () => {
    const onCancel = vi.fn();
    vi.mocked(postRecommendation).mockResolvedValue(recommendationFixture);
    render(<Onboarding onDone={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: /get recommendation/i }));

    fireEvent.change(await screen.findByLabelText("Project name"), {
      target: { value: "acme-api" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByLabelText("Jenkins base URL");

    fireEvent.click(screen.getByRole("button", { name: /back to dashboard/i }));
    expect(onCancel).toHaveBeenCalled();
    expect(createProject).not.toHaveBeenCalled();
  });

  it("keeps the created project on a connect failure — retry connects, never re-creates", async () => {
    vi.mocked(createProject).mockResolvedValue(createdProjectFixture);
    vi.mocked(connectJenkins)
      .mockRejectedValueOnce(new ApiError(502, "jenkins unreachable"))
      .mockResolvedValueOnce(jenkinsConnectionFixture);
    vi.mocked(getCiSetup).mockResolvedValue(ciSetupFixture);
    getRecommendation();

    fireEvent.change(await screen.findByLabelText("Project name"), {
      target: { value: "acme-api" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByLabelText("Jenkins base URL");

    fillJenkins();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    // first attempt: created, but connect failed → inline error, still on the step
    expect(await screen.findByText("jenkins unreachable")).toBeInTheDocument();
    expect(createProject).toHaveBeenCalledTimes(1);

    // retry: connects the SAME project, no second create
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => expect(connectJenkins).toHaveBeenCalledTimes(2));
    expect(createProject).toHaveBeenCalledTimes(1);
  });

  it("shows Bedrock Jenkins requirements when the user picks Nova 2 Lite", async () => {
    getRecommendation();

    fireEvent.click(await screen.findByText("Nova 2 Lite"));
    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "acme-api" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await screen.findByLabelText("Jenkins base URL");
    expect(screen.queryByText("modelmatch-model-api-key")).not.toBeInTheDocument();
    expect(screen.getByText("modelmatch-ci-token")).toBeInTheDocument();
    expect(screen.getByText(/do not add modelmatch-model-api-key/i)).toBeInTheDocument();
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

  it("regenerates a lost token — rotate issues a fresh one and shows it", async () => {
    vi.mocked(getCiSetup).mockResolvedValue(ciSetupNoTokenFixture); // already minted
    vi.mocked(rotateCiToken).mockResolvedValue({
      ...ciSetupFixture,
      token: "mmci_rotated_fresh_value",
    });
    render(<CiSetupView projectId={7} onDone={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: /regenerate token/i }));

    expect(await screen.findByText("mmci_rotated_fresh_value")).toBeInTheDocument();
    expect(rotateCiToken).toHaveBeenCalledWith(7);
    expect(screen.getByText(/shown once/i)).toBeInTheDocument();
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

  it("recovers from a transient setup failure via Retry", async () => {
    vi.mocked(getCiSetup)
      .mockRejectedValueOnce(new ApiError(504, "gateway timeout"))
      .mockResolvedValueOnce(ciSetupFixture);
    render(<CiSetupView projectId={7} onDone={vi.fn()} />);

    expect(await screen.findByText("gateway timeout")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    // the retry succeeds → snippet + token now shown, error gone
    expect(await screen.findByText(/shown once/i)).toBeInTheDocument();
    expect(screen.queryByText("gateway timeout")).not.toBeInTheDocument();
  });

  it("bubbles a 401 up via onUnauthorized", async () => {
    vi.mocked(getCiSetup).mockRejectedValue(new ApiError(401, "expired"));
    const onUnauthorized = vi.fn();
    render(<CiSetupView projectId={7} onDone={vi.fn()} onUnauthorized={onUnauthorized} />);
    await waitFor(() => expect(onUnauthorized).toHaveBeenCalled());
  });
});
