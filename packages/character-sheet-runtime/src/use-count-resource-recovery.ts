// KERNEL-COVERAGE: runtime-owner SHEET.FEATURE_RESOURCES.USE_COUNT_RECOVERY
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.use-count-resource-recovery
import {
  characterBuildFeatureUnitIds,
  type UnitCatalog,
} from "@dnd/character-creation-runtime/consumer-protocol";
import type { UnitRecord } from "@dnd/surface/surface/types";
import { resourceCount, type SpellSlotLevel } from "@dnd/shared/types";
import { Option, Result } from "effect";
import { projectCharacterSheetClassFeature } from "./character-feature-projection.ts";
import {
  characterSheetResources,
  replaceUseCountResourceExpenditure,
} from "./resources.ts";
import { spendCharacterSheetSpellSlot } from "./spell-slots.ts";
import {
  characterSheetIssue,
  getRequiredUnit,
  type CharacterSheet,
  type CharacterSheetIssue,
  type CharacterSheetFontOfMagicSpellSlotSource,
} from "./sheet-types.ts";

/** Exchange one available Spell Slot for one expended use of the linked pool. */
export function restoreUseCountResourceWithSpellSlot(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly featureUnitId: UnitRecord["id"];
  readonly spellLevel: SpellSlotLevel;
  readonly spellSlotSource?: CharacterSheetFontOfMagicSpellSlotSource;
}): Result.Result<CharacterSheet, CharacterSheetIssue> {
  const recovery = ownedUseCountRecoveryMechanics(input);
  if (Result.isFailure(recovery)) return Result.fail(recovery.failure);
  const mechanics = recovery.success;
  const resources = characterSheetResources(input.sheet, input.unitLibrary);
  if (Result.isFailure(resources)) return Result.fail(resources.failure);
  const resource = resources.success.find(
    (candidate) =>
      candidate.tag === "useCountResource" &&
      candidate.unitId === mechanics.resourceUnitId,
  );
  if (resource === undefined || resource.tag !== "useCountResource") {
    return characterSheetIssue(
      "Recovery feature requires its linked use-count resource.",
    );
  }
  if (
    resource.expended < resourceCount(mechanics.spellSlotExchange.restoredUses)
  ) {
    return characterSheetIssue(
      "Spell Slot recovery requires an expended resource use.",
    );
  }
  const spent = spendCharacterSheetSpellSlot({
    sheet: input.sheet,
    spellLevel: input.spellLevel,
    spellSlotSource: input.spellSlotSource,
  });
  if (Result.isFailure(spent)) return Result.fail(spent.failure);
  return Result.succeed({
    ...spent.success,
    resourceExpenditures: replaceUseCountResourceExpenditure({
      expenditures: spent.success.resourceExpenditures,
      unitId: resource.unitId,
      expended: resourceCount(
        resource.expended - mechanics.spellSlotExchange.restoredUses,
      ),
    }),
  });
}

function ownedUseCountRecoveryMechanics(
  input: Parameters<typeof restoreUseCountResourceWithSpellSlot>[0],
): Result.Result<
  Extract<UnitRecord, { readonly kind: "class_feature" }>["mechanics"] & {
    readonly family: "use_count_resource_recovery";
  },
  CharacterSheetIssue
> {
  if (
    !characterBuildFeatureUnitIds(
      input.sheet.build,
      input.unitLibrary,
    ).includes(input.featureUnitId)
  ) {
    return characterSheetIssue(
      "Spell Slot recovery requires an installed recovery feature.",
    );
  }
  const unit = getRequiredUnit(input.unitLibrary, input.featureUnitId);
  if (Result.isFailure(unit)) return Result.fail(unit.failure);
  const projection = projectCharacterSheetClassFeature(unit.success);
  if (
    Option.isNone(projection) ||
    projection.value.mechanics.family !== "use_count_resource_recovery"
  ) {
    return characterSheetIssue(
      "Selected feature does not permit Spell Slot use-count recovery.",
    );
  }
  return Result.succeed(projection.value.mechanics);
}
