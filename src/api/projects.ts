// Projects API calls — thin typed wrappers over apiGet/apiPost.

import { apiGet, apiPost } from "./client";
import type { Project } from "../types/project";

// The signed-in user's projects (owner-scoped server-side). Powers the switcher.
export function listProjects(): Promise<Project[]> {
  return apiGet<Project[]>("/projects");
}

// Create a project from a chosen recommendation option + its baseline (POST /projects).
export interface CreateProjectInput {
  name: string;
  selectedOptionId: number;
  baselineModelId: number;
}

export function createProject(input: CreateProjectInput): Promise<Project> {
  return apiPost<Project>("/projects", input);
}
