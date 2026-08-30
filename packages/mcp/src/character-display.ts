import type { CharacterBuildDisplayNameIssues } from "@dnd/character-creation-runtime";

export { characterBuildDisplayName } from "@dnd/character-creation-runtime";

export function characterBuildDisplayNameIssueMessage(
  issues: CharacterBuildDisplayNameIssues,
): string {
  return `Character display catalog is incomplete: ${issues
    .map((issue) =>
      issue.tag === "characterBuildDisplayUnitMissing"
        ? `${issue.role} ${issue.unitId} is missing`
        : `${issue.role} ${issue.unitId} has kind ${issue.actualKind}; expected ${issue.role}`,
    )
    .join("; ")}.`;
}
