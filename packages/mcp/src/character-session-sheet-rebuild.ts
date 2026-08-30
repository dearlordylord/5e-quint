import {
  characterSheetSpellSlotSourceState,
  rebuildCharacterSheet,
  type CharacterSheet,
} from "@dnd/character-sheet-runtime";
import type { StatBlockId } from "@dnd/shared/game-facts";
import { Hp } from "@dnd/shared/types";
import { Result, Match } from "effect";

import type { McpPlaySessionRoot } from "./composition-root.ts";
import type { AvailableCharacterSession } from "./session-store.ts";

export function rebuildCharacterSheetForOperation(
  root: McpPlaySessionRoot,
  input: {
    readonly sheet: AvailableCharacterSession;
    readonly build: AvailableCharacterSession["build"];
    readonly druidWildShapeKnownFormStatBlockIds?: readonly StatBlockId[];
  },
): Result.Result<CharacterSheet, string> {
  const hitPointState = Match.value(input.sheet.hitPoints).pipe(
    Match.when({ tag: "positive" }, (hitPoints) => ({
      currentHp: hitPoints.currentHp,
      tempHp: hitPoints.tempHp,
    })),
    Match.when({ tag: "knockedOut" }, (hitPoints) => ({
      currentHp: Hp(1),
      tempHp: hitPoints.tempHp,
      positiveHpUnconscious: { tag: "knockedOut" as const },
    })),
    Match.when({ tag: "zero" }, (hitPoints) => ({
      currentHp: Hp(0),
      tempHp: hitPoints.tempHp,
      zeroHpLifecycle: hitPoints.lifecycle,
    })),
    Match.exhaustive,
  );
  const bookOfShadowsPresence =
    "bookOfShadowsPresence" in input.sheet &&
    input.sheet.bookOfShadowsPresence !== undefined
      ? { bookOfShadowsPresence: input.sheet.bookOfShadowsPresence }
      : {};
  const pactSlots =
    "pactSlotExpenditure" in input.sheet &&
    input.sheet.pactSlotExpenditure !== undefined
      ? { pactSlots: input.sheet.pactSlotExpenditure }
      : {};
  const druidWildShapeKnownForms =
    input.druidWildShapeKnownFormStatBlockIds === undefined
      ? input.sheet.druidWildShapeKnownForms === undefined
        ? {}
        : {
            druidWildShapeKnownFormStatBlockIds:
              input.sheet.druidWildShapeKnownForms.statBlockIds,
          }
      : {
          druidWildShapeKnownFormStatBlockIds:
            input.druidWildShapeKnownFormStatBlockIds,
        };
  const druidCircleLand =
    input.sheet.druidCircleLand === undefined
      ? {}
      : { druidCircleLand: input.sheet.druidCircleLand };
  const fiendishResilience =
    input.sheet.fiendishResilience === undefined
      ? {}
      : { fiendishResilience: input.sheet.fiendishResilience };
  const rebuilt = rebuildCharacterSheet(
    {
      characterId: input.sheet.characterId,
      build: input.build,
      ...hitPointState,
      hitPointMaximumReduction: input.sheet.hitPointMaximumReduction,
      exhaustionLevel: input.sheet.exhaustionLevel,
      conditions: input.sheet.conditions,
      unitLibrary: root.unitLibrary,
      spentHitDice: input.sheet.spentHitDice,
      restFeatureUses: input.sheet.restFeatureUses,
      resourceExpenditures: input.sheet.resourceExpenditures,
      heroicInspiration: input.sheet.heroicInspiration,
      companion: input.sheet.companion,
      statBlockCatalog: root.statBlockCatalog,
      ...bookOfShadowsPresence,
      ...pactSlots,
      ...druidWildShapeKnownForms,
      ...druidCircleLand,
      ...fiendishResilience,
    },
    characterSheetSpellSlotSourceState(input.sheet),
  );
  return Result.mapError(rebuilt, (issue) => issue.message);
}
