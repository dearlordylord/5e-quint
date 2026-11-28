// KERNEL-COVERAGE: parity-witness BATTLE.D20_TEST.DIE_MINIMUM BATTLE.D20_TEST.FAILED_D20_TEST_ADDED_DIE
import {
  HEROIC_INSPIRATION_AVAILABLE,
  NO_HEROIC_INSPIRATION,
} from "@dnd/shared/game-facts";
import { classLevel, DieRollResult, difficultyClass } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";

import {
  BARDIC_INSPIRATION_DIE_EFFECT_KIND,
  D20_TEST_DIE_MINIMUM_EFFECT_KIND,
  FAILED_ABILITY_CHECK_RESOURCE_BOOST_EFFECT_KIND,
  HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
  type BattleD20TestDieMinimumDecision,
  type BattleFill,
} from "./battle-state-execution.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import {
  abilityCheckFill,
  battleId,
  characterBattleFeatureInitForTest,
  characterResourceUses,
  characterSeed,
  combatantHasBardicInspirationDie,
  fighterId,
  goblinId,
  grantBardicInspirationToGoblin,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  resource,
  resourceCount,
  startBattleRight,
  statBlockCreatureInit,
  supportedBattleUnitRef,
  targetFill,
  unitLibrary,
  type BattleSubject,
} from "./battle-runtime.test-support.ts";

const search = {
  tag: "action",
  actorId: fighterId,
  action: "search",
} satisfies BattleSubject;
const useMinimum = {
  kind: "use",
  effectKind: D20_TEST_DIE_MINIMUM_EFFECT_KIND,
} as const;
const declineMinimum = {
  kind: "decline",
  effectKind: D20_TEST_DIE_MINIMUM_EFFECT_KIND,
} as const;
const boost = (face: number) =>
  ({
    kind: "addDie",
    effectKind: FAILED_ABILITY_CHECK_RESOURCE_BOOST_EFFECT_KIND,
    dieRoll: DieRollResult(face),
  }) as const;
const bardic = (face: number) =>
  ({
    kind: "addDie",
    effectKind: BARDIC_INSPIRATION_DIE_EFFECT_KIND,
    dieRoll: DieRollResult(face),
  }) as const;
type AbilityFill = Extract<BattleFill, { readonly kind: "abilityCheck" }>;

function fixture() {
  const talent = unitLibrary.requireUnit("rogue_reliable_talent");
  const tacticalMind = unitLibrary.requireUnit("fighter_tactical_mind");
  const levels = [
    { className: "rogue", level: classLevel(7) },
    { className: "fighter", level: classLevel(2) },
  ] as const;
  const state = startBattleRight({
    battleId: battleId("minimum-rerolls-added-dice"),
    combatants: [
      characterSeed({
        initiative: 20,
        classLevel: 9,
        classLevels: levels,
        heroicInspiration: HEROIC_INSPIRATION_AVAILABLE,
        resources: [resource({ usesRemaining: 2 })],
        characterUnitRefs: [
          supportedBattleUnitRef(talent),
          supportedBattleUnitRef(tacticalMind),
        ],
        unitFeatures: [
          characterBattleFeatureInitForTest(talent, levels),
          characterBattleFeatureInitForTest(tacticalMind, levels),
        ],
        d20Statistics: {
          ...testCharacterD20Statistics({ dex: 13, wis: 8 }),
          skillProficiencies: ["perception"],
        },
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
  const granted = grantBardicInspirationToGoblin()
    .combatants.get(goblinId)
    ?.activeEffects.find((effect) => effect.kind === "bardicInspirationDie");
  const actor = state.combatants.get(fighterId);
  const target = state.combatants.get(goblinId);
  if (granted === undefined || actor === undefined || target === undefined)
    throw new Error("Expected the public Bardic grant and its test holder.");
  const inspired = {
    ...state,
    combatants: new Map(state.combatants)
      .set(fighterId, {
        ...actor,
        activeEffects: [...actor.activeEffects, granted],
      })
      .set(goblinId, {
        ...target,
        hidden: { discoveryDc: difficultyClass(15) },
      }),
  };
  const targetHole = requireHole(
    resolveBattleSubject({ state: inspired, subject: search, fills: [] }),
    "targetChoice",
  );
  const targetSelection = targetFill(targetHole, goblinId);
  const check = requireHole(
    resolveBattleSubject({
      state: inspired,
      subject: search,
      fills: [targetSelection],
    }),
    "abilityCheck",
  );
  if (check.kind !== "abilityCheck")
    throw new Error("Expected Search's ability check.");
  return { state: inspired, check, targetSelection };
}

function afterLowReroll(
  check: ReturnType<typeof fixture>["check"],
  minimum: BattleD20TestDieMinimumDecision,
): AbilityFill {
  // Rogue 7 / Fighter 2, Dexterity 13 for multiclassing, Wisdom 8 and
  // Perception proficiency: modifier +3 on this Search check.
  // The same natural 3 -> 4 reroll counts as 10 -> 10 when the minimum is used.
  const used = minimum.kind === "use";
  return abilityCheckFill(check, {
    total: used ? 13 : 6,
    naturalD20: 3,
    d20TestDieMinimum: minimum,
    d20TestRerolls: [
      {
        kind: "reroll",
        effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
        replacement: {
          total: used ? 13 : 7,
          d20TestRoll: { tag: "single", naturalD20: DieRollResult(4) },
        },
      },
    ],
  });
}

describe("one minimum decision through rerolls and added dice", () => {
  test.each([
    { minimum: useMinimum, boostFace: 1, bardicFace: 1 },
    { minimum: declineMinimum, boostFace: 3, bardicFace: 5 },
  ])(
    "$minimum.kind survives a low reroll before Tactical Mind and Bardic Inspiration settle the check",
    ({ minimum, boostFace, bardicFace }) => {
      const { state, check, targetSelection } = fixture();
      const rerolled = afterLowReroll(check, minimum);
      const offered = resolveBattleSubject({
        state,
        subject: search,
        fills: [targetSelection, rerolled],
      });
      const addedHole = requireHole(offered, "abilityCheck");
      expect(addedHole).toMatchObject({
        bardicInspirationDice: [
          { effectKind: BARDIC_INSPIRATION_DIE_EFFECT_KIND },
        ],
        failedAbilityCheckResourceBoosts: [
          { effectKind: FAILED_ABILITY_CHECK_RESOURCE_BOOST_EFFECT_KIND },
        ],
      });
      if (offered.tag !== "needsHoles")
        throw new Error("Expected an added-die continuation.");
      const boostOnly: AbilityFill = {
        ...rerolled,
        value: { ...rerolled.value, d20TestAddedDice: [boost(boostFace)] },
      };
      const waitingForBardic = resolveBattleSubject({
        state: offered.state,
        subject: search,
        fills: [targetSelection, boostOnly],
      });
      expect(requireHole(waitingForBardic, "abilityCheck")).toMatchObject({
        bardicInspirationDice: [
          { effectKind: BARDIC_INSPIRATION_DIE_EFFECT_KIND },
        ],
      });
      if (waitingForBardic.tag !== "needsHoles")
        throw new Error("Expected the remaining Bardic decision.");
      const filled: AbilityFill = {
        ...rerolled,
        value: {
          ...rerolled.value,
          d20TestAddedDice: [boost(boostFace), bardic(bardicFace)],
        },
      };
      const resolved = requireResolved(
        resolveBattleSubject({
          state: waitingForBardic.state,
          subject: search,
          fills: [targetSelection, filled],
        }),
      ).state;
      // Tactical Mind alone still failed; the final Bardic die turns it into success.
      expect(resolved.combatants.get(goblinId)?.hidden).toBeNull();
      expect(characterResourceUses(resolved, fighterId)).toEqual([
        resourceCount(1),
      ]);
      expect(combatantHasBardicInspirationDie(resolved, fighterId)).toBe(false);
      const actor = resolved.combatants.get(fighterId);
      if (actor?.origin.kind !== "character")
        throw new Error("Expected the Search check's character.");
      expect(actor.origin.heroicInspiration).toEqual(NO_HEROIC_INSPIRATION);
    },
  );

  test("a minimum-counted reroll cannot change the ordinary modifier", () => {
    const { state, check, targetSelection } = fixture();
    const rerolled = afterLowReroll(check, useMinimum);
    const changed = {
      ...rerolled,
      value: {
        ...rerolled.value,
        d20TestRerolls: [
          {
            kind: "reroll",
            effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
            replacement: {
              total: 14,
              d20TestRoll: { tag: "single", naturalD20: DieRollResult(4) },
            },
          },
        ],
      },
    } satisfies AbilityFill;
    expect(
      resolveBattleSubject({
        state,
        subject: search,
        fills: [targetSelection, changed],
      }),
    ).toMatchObject({ tag: "invalid" });
  });
});
