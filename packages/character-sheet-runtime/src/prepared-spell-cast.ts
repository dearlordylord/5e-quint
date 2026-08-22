import type { UnitCatalog } from "@dnd/character-creation-runtime";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";
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
  ) => Either.Either<Invocation, CharacterSheetIssue>;
}): Either.Either<
  { readonly sheet: CharacterSheet; readonly invocation: Invocation },
  CharacterSheetIssue
> {
  const unit = getRequiredUnit(input.unitLibrary, input.spellId);
  /* v8 ignore next -- @preserve -- A selected prepared spell id missing from the catalog is malformed catalog correlation. */
  if (Either.isLeft(unit)) return Either.left(unit.left);
  /* v8 ignore start -- @preserve -- A selected prepared spell id resolving to a non-Spell Unit is malformed catalog correlation. */
  if (unit.right.kind !== "spell") {
    return characterSheetIssue(
      input.spellRecordIssue ?? `${input.spellName} requires a Spell record.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (!hasPreparedClassSpellAccess(input.sheet, unit.right.id)) {
    return characterSheetIssue(
      input.spellAccessIssue ??
        `${input.spellName} requires prepared class Spell Access.`,
    );
  }
  const invocation = input.invocation(unit.right);
  /* v8 ignore next -- @preserve -- Invocation rejection is attributed to the spell-specific malformed request or unsupported authored profile. */
  if (Either.isLeft(invocation)) return Either.left(invocation.left);
  const spent = spendCharacterSheetSpellSlot({
    sheet: input.sheet,
    spellLevel: input.spellLevel,
    spellSlotSource: "ordinary",
  });
  /* v8 ignore next -- @preserve -- Slot-spend rejection is malformed prepared-cast slot state. */
  if (Either.isLeft(spent)) return Either.left(spent.left);
  return Either.right({ sheet: spent.right, invocation: invocation.right });
}
