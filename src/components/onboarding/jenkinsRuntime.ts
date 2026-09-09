import type { RecommendationOption } from "../../types/recommend";

export type JenkinsRuntimeHint = {
  authMode: "api_key" | "aws_iam";
  credentialEnvVar:
    | "ANTHROPIC_API_KEY"
    | "GOOGLE_API_KEY"
    | "DEEPSEEK_API_KEY"
    | "OPENAI_API_KEY"
    | null;
  modelLabel: string | null;
  providerLabel: "Anthropic" | "Google" | "Amazon Bedrock" | "DeepSeek" | "OpenAI";
};

export function runtimeHintFromRecommendationOption(
  option: RecommendationOption | null | undefined,
): JenkinsRuntimeHint | null {
  if (!option) return null;
  return runtimeHintFromVendor(option.vendor, option.model);
}

export function runtimeHintFromProjectModel(
  modelName: string | null | undefined,
): JenkinsRuntimeHint | null {
  const name = modelName?.trim();
  if (!name) return null;
  const normalized = name.toLowerCase();
  if (normalized.includes("nova")) return runtimeHintFromVendor("amazon", name);
  if (normalized.includes("gemini")) return runtimeHintFromVendor("google", name);
  if (normalized.includes("deepseek")) return runtimeHintFromVendor("deepseek", name);
  if (normalized.includes("gpt")) return runtimeHintFromVendor("openai", name);
  if (
    normalized.includes("claude") ||
    normalized.includes("haiku") ||
    normalized.includes("sonnet")
  ) {
    return runtimeHintFromVendor("anthropic", name);
  }
  return null;
}

function runtimeHintFromVendor(
  vendor: string | null | undefined,
  modelLabel: string | null,
): JenkinsRuntimeHint | null {
  switch (vendor?.trim().toLowerCase()) {
    case "anthropic":
      return {
        authMode: "api_key",
        credentialEnvVar: "ANTHROPIC_API_KEY",
        modelLabel,
        providerLabel: "Anthropic",
      };
    case "google":
      return {
        authMode: "api_key",
        credentialEnvVar: "GOOGLE_API_KEY",
        modelLabel,
        providerLabel: "Google",
      };
    case "amazon":
      return {
        authMode: "aws_iam",
        credentialEnvVar: null,
        modelLabel,
        providerLabel: "Amazon Bedrock",
      };
    // E20: the security task's vendors (driven through OpenCode; a plain API key).
    // The generated snippet binds whatever the runtime-config row declares; this hint
    // only names the variable so the user can tell which key to paste.
    case "deepseek":
      return {
        authMode: "api_key",
        credentialEnvVar: "DEEPSEEK_API_KEY",
        modelLabel,
        providerLabel: "DeepSeek",
      };
    case "openai":
      return {
        authMode: "api_key",
        credentialEnvVar: "OPENAI_API_KEY",
        modelLabel,
        providerLabel: "OpenAI",
      };
    default:
      return null;
  }
}
