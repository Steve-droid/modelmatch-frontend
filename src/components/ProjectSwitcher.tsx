import { ChevronDown, FolderGit2 } from "lucide-react";
import type { Project } from "../types/project";

// Dark-styled native select for choosing the active project. Replaces the ?project=
// query param used through S14. One project → a static label (no pointless dropdown).
export function ProjectSwitcher({
  projects,
  value,
  onChange,
}: {
  projects: Project[];
  value: number;
  onChange: (id: number) => void;
}) {
  if (projects.length === 0) return null;

  const active = projects.find((p) => p.id === value);

  if (projects.length === 1) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-panel px-2.5 py-1 text-xs font-medium text-muted">
        <FolderGit2 size={13} className="text-faint" />
        {active?.name ?? `CI-Agent #${value}`}
      </span>
    );
  }

  return (
    <div className="relative inline-flex items-center">
      <FolderGit2
        size={13}
        className="pointer-events-none absolute left-2.5 text-faint"
      />
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Select CI-Agent"
        className="appearance-none rounded-md border border-border bg-panel py-1 pl-7 pr-7 text-xs font-medium text-gray-200 focus:border-accent/50 focus:outline-none"
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <ChevronDown
        size={13}
        className="pointer-events-none absolute right-2 text-faint"
      />
    </div>
  );
}
