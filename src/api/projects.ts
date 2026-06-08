// Projects API calls — thin typed wrappers over apiGet.

import { apiGet } from "./client";
import type { Project } from "../types/project";

// The signed-in user's projects (owner-scoped server-side). Powers the switcher.
export function listProjects(): Promise<Project[]> {
  return apiGet<Project[]>("/projects");
}
