import type { UnitCatalog } from "@dnd/character-creation-runtime";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Result } from "effect";
import { hasPreparedClassSpellAccess } from "./prepared-spell-access.ts";
import {
  characterSheetIssue,
  getRequiredUnit,
  type CharacterSheet,
  type CharacterSheetIssue,
} from "./sheet-types.ts";
import { spendCharacterSheetSpellSlot } from "./spell-slots.ts";

export function castPreparedSpell<Invocation>(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly spellId: Parameters<typeof getRequiredUnit>[1];
  readonly spellLevel: Parameters<
    typeof spendCharacterSheetSpellSlot
  >[0]["spellLevel"];
  readonly spellName: string;
  readonly spellRecordIssue?: string;
  readonly spellAccessIssue?: string;
  readonly invocation: (
    spell: SpellRecord,
  ) => Result.Result<Invocation, CharacterSheetIssue>;
}): Result.Result<
  { readonly sheet: CharacterSheet; readonly invocation: Invocation },
  CharacterSheetIssue
> {
  const unit = getRequiredUnit(input.unitLibrary, input.spellId);
  /* v8 ignore next -- @preserve -- A selected prepared spell id missing from the catalog is malformed catalog correlation. */
  if (Result.isFailure(unit)) return Result.fail(unit.failure);
  /* v8 ignore start -- @preserve -- A selected prepared spell id resolving to a non-Spell Unit is malformed catalog correlation. */
  if (unit.success.kind !== "spell") {
    return characterSheetIssue(
      input.spellRecordIssue ?? `${input.spellName} requires a Spell record.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (!hasPreparedClassSpellAccess(input.sheet, unit.success.id)) {
    return characterSheetIssue(
      input.spellAccessIssue ??
        `${input.spellName} requires prepared class Spell Access.`,
    );
  }
  const invocation = input.invocation(unit.success);
  /* v8 ignore next -- @preserve -- Invocation rejection is attributed to the spell-specific malformed request or unsupported authored profile. */
  if (Result.isFailure(invocation)) return Result.fail(invocation.failure);
  const spent = spendCharacterSheetSpellSlot({
    sheet: input.sheet,
    spellLevel: input.spellLevel,
    spellSlotSource: "ordinary",
  });
  /* v8 ignore next -- @preserve -- Slot-spend rejection is malformed prepared-cast slot state. */
  if (Result.isFailure(spent)) return Result.fail(spent.failure);
  return Result.succeed({
    sheet: spent.success,
    invocation: invocation.success,
  });
}
