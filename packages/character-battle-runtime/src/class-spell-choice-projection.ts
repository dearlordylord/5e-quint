import type { ClassName, UnitRecord } from "@dnd/surface/surface/types";
import {
  classSpellListForClassName,
  type UnitCatalog,
} from "@dnd/surface/surface/unit-catalog";
import { Match, Option } from "effect";

export const CLASS_SPELL_CHOICE_KINDS = ["cantrip", "leveledSpell"] as const;
export type ClassSpellChoiceKind = (typeof CLASS_SPELL_CHOICE_KINDS)[number];

export function classSpellChoiceIsRuntimeDetached(input: {
  readonly unitLibrary: UnitCatalog;
  readonly sourceClassName: ClassName;
  readonly spellId: UnitRecord["id"];
  readonly choiceKind: ClassSpellChoiceKind;
}): boolean {
  if (Option.isSome(input.unitLibrary.getUnit(input.spellId))) {
    return false;
  }
  const classSpellList = classSpellListForClassName({
    unitLibrary: input.unitLibrary,
    className: input.sourceClassName,
  });
  return (
    Match.value(input.choiceKind).pipe(
      Match.when("cantrip", () =>
        classSpellList?.cantrips.includes(input.spellId),
      ),
      Match.when("leveledSpell", () =>
        classSpellList?.leveled.some(
          (spell) => spell.spellId === input.spellId,
        ),
      ),
      Match.exhaustive,
    ) === true
  );
}

export function omitRuntimeDetachedClassSpellChoices(input: {
  readonly unitLibrary: UnitCatalog;
  readonly sourceClassName: ClassName;
  readonly spellIds: readonly UnitRecord["id"][];
  readonly choiceKind: ClassSpellChoiceKind;
}): readonly UnitRecord["id"][] {
  return input.spellIds.filter(
    (spellId) =>
      !classSpellChoiceIsRuntimeDetached({
        unitLibrary: input.unitLibrary,
        sourceClassName: input.sourceClassName,
        spellId,
        choiceKind: input.choiceKind,
      }),
  );
}
