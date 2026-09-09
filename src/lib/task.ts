// E20: the project's task, in words. The catalog vocabulary ("ci_review" |
// "security_analysis") is the wire value; the UI names it.
export function taskLabelOf(taskType: string | null | undefined): string {
  if (taskType === "security_analysis") return "Security analysis";
  if (taskType === "ci_review") return "PR code review";
  return "CI agent";
}
