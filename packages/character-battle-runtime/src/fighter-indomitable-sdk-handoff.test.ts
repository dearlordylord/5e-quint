// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.failed-saving-throw-reroll
// KERNEL-COVERAGE: parity-witness BATTLE.D20_TEST.FAILED_SAVING_THROW_REROLL
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L19D-04-FIGHTER-INDOMITABLE fighter_indomitable
// UNIT-IDENTITY-REPLAY: L19D-04-FIGHTER-INDOMITABLE fighter_indomitable doOfferFailedSavingThrowReroll
import { defineSelectedIdentityReplayWitness } from "../../battle-runtime/src/selected-identity-witness.test-support.ts";
import { unitId } from "@dnd/shared/game-facts";
import {
  combatantId,
  FAILED_SAVING_THROW_REROLL_EFFECT_KIND,
  resolveBattleSubject,
  type BattleHole,
  type BattleSavingThrowOutcome,
} from "@dnd/battle-runtime";
import {
  advanceCharacterBuildClassLevel,
  classUnitId,
  creationChoiceOptionId,
  finalizeCharacterDraft,
} from "@dnd/character-creation-runtime";
import {
  completeSupportedProgressionDraft,
  testUnitChoiceSourceKey,
} from "@dnd/character-creation-runtime/test-support";
import { DieRollResult } from "@dnd/shared/types";
import { Result } from "effect";
import { describe, expect, test } from "vitest";
import {
  areaSavingThrowOutcomeFill,
  battleSessionFromSheets,
  characterResources,
  characterSheet,
  levelFiveWizardBuild,
  requireCharacterCombatant,
  requireHole,
  requireHoleFromList,
  spellSlotActForProcedure,
  unitLibrary,
} from "./sdk-integration.test-support.ts";

const wizardId = combatantId("wizard-5");
const fighterId = combatantId("fighter");

const fighterClass = classUnitId(unitId("class_fighter"));

/**
 * A real-catalog Fighter at `level` (8 or 9): created at 8, then advanced to 9
 * through the public level gain.
 */
function fighterBuild(level: 8 | 9) {
  const draft = completeSupportedProgressionDraft({
    draftId: `draft:fighter-${level}`,
    unitLibrary,
    progression: {
      startingClass: fighterClass,
      advancements: Array.from({ length: 7 }, () => ({
        classUnitId: fighterClass,
        hitPointRule: { tag: "fixedHigherLevelGain" as const },
      })),
    },
    preferredOptionIdsBySource: {
      [testUnitChoiceSourceKey(
        unitId("fighter_fighting_style"),
        "class_feature_feat_choice",
      )]: [creationChoiceOptionId("feat_archery")],
      [testUnitChoiceSourceKey(
        unitId("fighter_additional_fighting_style"),
        "class_feature_feat_choice",
      )]: [creationChoiceOptionId("defense")],
      [testUnitChoiceSourceKey(
        unitId("fighter_ability_score_improvement_l4"),
        "class_feature_feat_choice",
      )]: [creationChoiceOptionId("feat_ability_score_improvement")],
      [testUnitChoiceSourceKey(
        unitId("fighter_ability_score_improvement_l4"),
        "class_feature_ability_score_increase_choice",
      )]: [creationChoiceOptionId("ability_score:con:+2:max20")],
    },
    standardArrayAssignment: {
      str: 10,
      dex: 15,
      con: 14,
      int: 8,
      wis: 13,
      cha: 12,
    },
  });
  const result = finalizeCharacterDraft({ draft, unitLibrary });
  if (result.tag !== "ready")
    throw new Error(`Fighter creation: ${result.tag}`);
  if (level === 8) return result.build;
  return Result.getOrThrow(
    advanceCharacterBuildClassLevel({
      build: result.build,
      unitLibrary,
      levelGain: {
        tag: "classLevelGain",
        classUnitId: fighterClass,
        hitPointRule: { tag: "fixedHigherLevelGain" },
      },
    }),
  );
}

/** A Wizard 5 casts Burning Hands with a Fighter at `level` in the cone. */
function fighterUnderBurningHands(level: 8 | 9) {
  const session = battleSessionFromSheets({
    battleIdText: `battle:fighter-${level}-indomitable`,
    characters: [
      characterSheet({
        characterIdText: "character:wizard-5",
        combatantId: wizardId,
        build: levelFiveWizardBuild({ preparedSpells: [] }),
        initiative: 20,
      }),
      characterSheet({
        characterIdText: `character:fighter-${level}`,
        combatantId: fighterId,
        build: fighterBuild(level),
        initiative: 10,
      }),
    ],
    monsters: [],
  });
  const act = spellSlotActForProcedure(
    session,
    "burning_hands",
    1,
    "saveGatedDamage",
  );
  return {
    session,
    act,
    save: requireHoleFromList(act.initialHoles, "savingThrowOutcome"),
  };
}

function fighterSave(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcome: Omit<
    Extract<BattleSavingThrowOutcome, { readonly withoutRoll?: never }>,
    "targetId"
  >,
) {
  return areaSavingThrowOutcomeFill(hole, wizardId, [
    { targetId: fighterId, ...outcome },
  ]);
}

const failedSave = {
  succeeded: false,
  d20TestRoll: { tag: "single", naturalD20: DieRollResult(4) },
} as const;

function failedSaveHole(level: 8 | 9) {
  const { session, act, save } = fighterUnderBurningHands(level);
  return resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [fighterSave(save, failedSave)],
  });
}

/** The Fighter's Indomitable resource in `state`, found by its ownership. */
function indomitableResource(
  session: ReturnType<typeof fighterUnderBurningHands>["session"],
  state: ReturnType<typeof fighterUnderBurningHands>["session"]["state"],
) {
  const ownership = session.context.characters
    .get(fighterId)
    ?.resourceOwnership.find(
      (candidate) => candidate.unit.id === "fighter_indomitable",
    );
  return characterResources(requireCharacterCombatant(state, fighterId)).find(
    (resource) => resource.resourcePoolRef === ownership?.resourcePoolRef,
  );
}

describe("Fighter Indomitable real-catalog SDK handoff", () => {
  test("a Fighter 9 who fails a Burning Hands save is offered the reroll with its Fighter level, and the reroll spends the use", () => {
    const { session, act, save } = fighterUnderBurningHands(9);
    expect(requireHole(failedSaveHole(9), "savingThrowOutcome")).toMatchObject({
      failedSavingThrowRerolls: [
        {
          effectKind: FAILED_SAVING_THROW_REROLL_EFFECT_KIND,
          rollerId: fighterId,
          bonus: 9,
        },
      ],
    });
    const rerolled = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        fighterSave(save, {
          ...failedSave,
          d20TestRerolls: [
            {
              kind: "reroll",
              effectKind: FAILED_SAVING_THROW_REROLL_EFFECT_KIND,
              replacement: {
                succeeded: true,
                d20TestRoll: { tag: "single", naturalD20: DieRollResult(6) },
              },
            },
          ],
        }),
      ],
    });
    requireHole(rerolled, "rolledDice");
    if (rerolled.tag !== "needsHoles") throw new Error("Expected rolledDice.");
    expect(indomitableResource(session, session.state)).toMatchObject({
      usesRemaining: 1,
    });
    expect(indomitableResource(session, rerolled.state)).toMatchObject({
      usesRemaining: 0,
    });
  });

  test("a Fighter 8 has no Indomitable to offer", () => {
    expect(requireHole(failedSaveHole(8), "rolledDice")).toBeDefined();
  });
});

defineSelectedIdentityReplayWitness({
  describeLabel: "Indomitable selected identity replay",
  taskId: "L19D-04-FIGHTER-INDOMITABLE",
  initialProjection: { selectedOffered: false, unselectedNotOffered: false },
  units: [
    {
      unitId: "fighter_indomitable",
      procedures: [
        {
          actionName: "doOfferFailedSavingThrowReroll",
          discover: () => {
            const selected = failedSaveHole(9);
            const unselected = failedSaveHole(8);
            return {
              selectedOffered:
                selected.tag === "needsHoles" &&
                requireHole(selected, "savingThrowOutcome")
                  .failedSavingThrowRerolls?.[0]?.bonus === 9,
              unselectedNotOffered:
                unselected.tag === "needsHoles" &&
                requireHole(unselected, "rolledDice") !== undefined,
            };
          },
          projectionAfter: {
            selectedOffered: true,
            unselectedNotOffered: true,
          },
        },
      ],
    },
  ],
});
