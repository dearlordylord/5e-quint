/** The authored procedure sections shared by admission, execution, and joins. */
export const STAT_BLOCK_PROCEDURE_SECTIONS = [
  "actions",
  "bonusActions",
  "reactions",
  "legendaryActions",
] as const;

export type StatBlockProcedureSection =
  (typeof STAT_BLOCK_PROCEDURE_SECTIONS)[number];
