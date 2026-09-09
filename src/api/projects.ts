// Projects API calls — thin typed wrappers over apiGet/apiPost/apiPatch/apiDelete.

import { apiDelete, apiGet, apiPatch, apiPost } from "./client";
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
  // E20: the task the pick was ranked on (the backend 422s a mismatch) + optional
  // review preferences (review task only; null = none).
  taskType?: string;
  reviewPreferences?: string | null;
}

export function createProject(input: CreateProjectInput): Promise<Project> {
  return apiPost<Project>("/projects", input);
}

// Edit a project (PATCH /projects/{id}): rename and/or re-pick the model + baseline.
// Every field is optional — send only what changed (a re-pick sends both ids).
export interface UpdateProjectInput {
  name?: string;
  selectedOptionId?: number;
  baselineModelId?: number;
  taskType?: string;
  reviewPreferences?: string | null; // explicit null clears them
}

export function updateProject(
  projectId: number,
  input: UpdateProjectInput,
): Promise<Project> {
  return apiPatch<Project>(`/projects/${projectId}`, input);
}

// Delete a project + its whole subtree server-side (DELETE /projects/{id}, 204).
export function deleteProject(projectId: number): Promise<void> {
  return apiDelete(`/projects/${projectId}`);
}
