// Mirrors the backend's ProjectOut DTO (app/schemas/project.py; camelCase out). Used
// by the project switcher to list the signed-in user's projects.

export interface Project {
  id: number;
  name: string;
  userId: number;
  selectedOptionId: number;
  selectedOptionModel: string; // the recommended model behind the selected option
  baselineModelId: number;
  baselineModel: string;
  baselineVendor: string;
}
