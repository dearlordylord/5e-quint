import {
  classLevelGainWithFightingStyleCantripReplacement,
  classUnitIdFromUnitId,
  fighterLevelGainWithFightingStyleReplacement,
  sorcererLevelGain,
  weaponMasteryLevelGain,
  warlockLevelGain,
  type CharacterBuildAdvancementIssue,
  type CharacterBuildClassLevelGain,
  type ClassUnitNameIssue,
} from "@dnd/character-creation-runtime";
import type { UnitId } from "@dnd/shared/game-facts";
import { Result, Match } from "effect";

import type { McpPlaySessionRoot } from "./composition-root.ts";
import type { ApplyCharacterSessionOperationToolInput } from "./character-session-operation-tool-input.ts";

export function characterBuildClassLevelGainFromTool(
  root: McpPlaySessionRoot,
  input: {
    readonly levelGain: Extract<
      ApplyCharacterSessionOperationToolInput["operation"],
      { readonly kind: "advanceClassLevel" }
    >["levelGain"];
  },
): Result.Result<CharacterBuildClassLevelGain, string> {
  return Match.value(input.levelGain).pipe(
    Match.when({ tag: "classLevelGain" }, (levelGain) =>
      parsedClassLevelGain(root, levelGain),
    ),
    Match.when(
      { tag: "classLevelGainWithListPreparedSpellcasting" },
      (levelGain) => {
        const classUnitId = parsedClassUnitId(root, levelGain.classUnitId);
        return Result.isFailure(classUnitId)
          ? Result.fail(classUnitId.failure)
          : Result.succeed({
              tag: levelGain.tag,
              classUnitId: classUnitId.success,
              hitPointRule: levelGain.hitPointRule,
              preparedSpellcasting: levelGain.preparedSpellcasting,
            });
      },
    ),
    Match.when(
      { tag: "fighterLevelGainWithFightingStyleReplacement" },
      (levelGain) => {
        const classUnitId = parsedClassUnitId(root, levelGain.classUnitId);
        if (Result.isFailure(classUnitId))
          return Result.fail(classUnitId.failure);
        return mapRuntimeGain(
          fighterLevelGainWithFightingStyleReplacement({
            unitLibrary: root.unitLibrary,
            classUnitId: classUnitId.success,
            hitPointRule: levelGain.hitPointRule,
            selectedFeatUnitId: levelGain.replacement.selectedFeatUnitId,
          }),
        );
      },
    ),
    Match.when(
      { tag: "classLevelGainWithFightingStyleCantripReplacement" },
      (levelGain) => {
        const classUnitId = parsedClassUnitId(root, levelGain.classUnitId);
        if (Result.isFailure(classUnitId))
          return Result.fail(classUnitId.failure);
        return mapRuntimeGain(
          classLevelGainWithFightingStyleCantripReplacement({
            unitLibrary: root.unitLibrary,
            classUnitId: classUnitId.success,
            hitPointRule: levelGain.hitPointRule,
            replaceCantripId: levelGain.replacement.replaceCantripId,
            selectedCantripId: levelGain.replacement.selectedCantripId,
            preparedSpellcasting: levelGain.preparedSpellcasting,
          }),
        );
      },
    ),
    Match.when(
      { tag: "classLevelGainWithWeaponMasterySelection" },
      (levelGain) => {
        const classUnitId = parsedClassUnitId(root, levelGain.classUnitId);
        if (Result.isFailure(classUnitId))
          return Result.fail(classUnitId.failure);
        return mapRuntimeGain(
          weaponMasteryLevelGain({
            unitLibrary: root.unitLibrary,
            classUnitId: classUnitId.success,
            hitPointRule: levelGain.hitPointRule,
            featureUnitId: levelGain.weaponMastery.featureUnitId,
            selectedWeaponUnitIds:
              levelGain.weaponMastery.selectedWeaponUnitIds,
          }),
        );
      },
    ),
    Match.when(
      {
        tag: "fighterLevelGainWithWeaponMasterySelectionAndFightingStyleReplacement",
      },
      (levelGain) => {
        const classUnitId = parsedClassUnitId(root, levelGain.classUnitId);
        if (Result.isFailure(classUnitId))
          return Result.fail(classUnitId.failure);
        return mapRuntimeGain(
          weaponMasteryLevelGain({
            unitLibrary: root.unitLibrary,
            classUnitId: classUnitId.success,
            hitPointRule: levelGain.hitPointRule,
            featureUnitId: levelGain.weaponMastery.featureUnitId,
            selectedWeaponUnitIds:
              levelGain.weaponMastery.selectedWeaponUnitIds,
            fightingStyleReplacement: {
              selectedFeatUnitId:
                levelGain.fightingStyleReplacement.selectedFeatUnitId,
            },
          }),
        );
      },
    ),
    Match.when({ tag: "sorcererLevelGain" }, (levelGain) => {
      const classUnitId = parsedClassUnitId(root, levelGain.classUnitId);
      if (Result.isFailure(classUnitId))
        return Result.fail(classUnitId.failure);
      return mapRuntimeGain(
        sorcererLevelGain({
          unitLibrary: root.unitLibrary,
          classUnitId: classUnitId.success,
          hitPointRule: levelGain.hitPointRule,
          gainedOptions: levelGain.metamagic.gainedOptions,
          ...(levelGain.metamagic.replacement === undefined
            ? {}
            : { replacement: levelGain.metamagic.replacement }),
        }),
      );
    }),
    Match.when({ tag: "warlockLevelGain" }, (levelGain) => {
      const classUnitId = parsedClassUnitId(root, levelGain.classUnitId);
      if (Result.isFailure(classUnitId))
        return Result.fail(classUnitId.failure);
      return mapRuntimeGain(
        warlockLevelGain({
          unitLibrary: root.unitLibrary,
          classUnitId: classUnitId.success,
          hitPointRule: levelGain.hitPointRule,
          pactMagic: levelGain.pactMagic,
          gainedInvocations: levelGain.eldritchInvocations.gainedInvocations,
          ...(levelGain.eldritchInvocations.replacement === undefined
            ? {}
            : { replacement: levelGain.eldritchInvocations.replacement }),
        }),
      );
    }),
    Match.exhaustive,
  );
}

export function runtimeIssueMessage(issue: {
  readonly message: string;
}): string {
  return issue.message;
}

function parsedClassLevelGain(
  root: McpPlaySessionRoot,
  levelGain: Extract<
    ApplyCharacterSessionOperationToolInput["operation"],
    { readonly kind: "advanceClassLevel" }
  >["levelGain"] & { readonly tag: "classLevelGain" },
): Result.Result<CharacterBuildClassLevelGain, string> {
  const classUnitId = parsedClassUnitId(root, levelGain.classUnitId);
  return Result.isFailure(classUnitId)
    ? Result.fail(classUnitId.failure)
    : Result.succeed({
        tag: levelGain.tag,
        classUnitId: classUnitId.success,
        hitPointRule: levelGain.hitPointRule,
      });
}

function parsedClassUnitId(root: McpPlaySessionRoot, classUnitId: UnitId) {
  const parsed = classUnitIdFromUnitId({
    unitLibrary: root.unitLibrary,
    classUnitId,
  });
  return Result.isFailure(parsed)
    ? Result.fail(classUnitIdIssueMessage(parsed.failure))
    : Result.succeed(parsed.success);
}

function classUnitIdIssueMessage(issue: ClassUnitNameIssue): string {
  return Match.value(issue).pipe(
    Match.when(
      { code: "unknownUnitId" },
      ({ unitId }) => `Unknown Unit id ${unitId}.`,
    ),
    Match.when(
      { code: "nonClassUnit" },
      ({ unitId, unitKind }) =>
        `${unitId} is a ${unitKind} Unit, not a class Unit.`,
    ),
    Match.exhaustive,
  );
}

function mapRuntimeGain<T>(
  result: Result.Result<T, CharacterBuildAdvancementIssue>,
): Result.Result<T, string> {
  return Result.isFailure(result)
    ? Result.fail(runtimeIssueMessage(result.failure))
    : Result.succeed(result.success);
}
