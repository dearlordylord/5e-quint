// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV56A feather_fall
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-feather-fall-mitigation
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  abilityModifier,
  attackBonus,
  Hp,
  movementFeet,
  proficiencyBonus,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { SpellRecord } from "@dnd/surface/surface/types";

import {
  activeFeatherFallDescentRateCapFeetPerRound,
  battleCombatantSide,
  battleId,
  characterId,
  combatantId,
  FEATHER_FALL_DESCENT_RATE_CAP_FEET_PER_ROUND,
  initiativeScore,
  openCreatureFallsReactionWindow,
  resolveBattleReaction,
  resolveFeatherFallLanding,
  startBattle,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type CombatantId,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Feather Fall Reaction spell test Unit catalog must build.");
}

const unitLibrary = unitCatalogResult.catalog;
const featherFallUnitId = "feather_fall";
const casterId = combatantId("feather-fall-caster");
const fallingAId = combatantId("feather-fall-target-a");
const fallingBId = combatantId("feather-fall-target-b");
const fallingCId = combatantId("feather-fall-target-c");
const fallingDId = combatantId("feather-fall-target-d");
const fallingEId = combatantId("feather-fall-target-e");
const fallingFId = combatantId("feather-fall-target-f");
const partySide = battleCombatantSide("party");

describe("Feather Fall Reaction spell", () => {
  test("opens from a table-supplied falling trigger and applies per-target mitigation effects", () => {
    const state = battleWithFeatherFall();
    const awaitingReaction = openFeatherFallWindow(state, fallingAId, true);

    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingReaction: { trigger: "creatureFalls" } },
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Feather Fall falling-trigger Reaction window.");
    }

    const choice = awaitingReaction.snapshot.pendingReaction?.choices.find(
      (candidate) =>
        candidate.kind === "castTriggeredReactionSpell" &&
        candidate.invocation.tag === "spellSlot" &&
        candidate.invocation.spellId === featherFallUnitId &&
        candidate.invocation.procedure === "featherFallMitigation",
    );
    if (choice === undefined || choice.kind !== "castTriggeredReactionSpell") {
      throw new Error("Expected Feather Fall Reaction choice.");
    }
    const targetList = requireHole(choice.initialHoles, "spellTargetList");
    expect(targetList).toMatchObject({ minTargets: 1, maxTargets: 5 });

    const resolved = resolveBattleReaction({
      state: awaitingReaction.state,
      fill: reactionDecisionFill(
        requireHole(awaitingReaction.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: casterId,
          choice: {
            kind: "castTriggeredReactionSpell",
            invocation: choice.invocation,
            fills: [
              featherFallTargetListFill(targetList, casterId, [
                fallingAId,
                fallingBId,
              ]),
            ],
          },
        },
      ),
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { pendingReaction: null },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Feather Fall Reaction to resolve.");
    }

    const caster = requireCombatant(resolved.state, casterId);
    expect(caster.reactionAvailable).toBe(false);
    expect(caster.origin.kind).toBe("character");
    if (caster.origin.kind !== "character") {
      throw new Error("Expected Feather Fall caster to be a character.");
    }
    expect(caster.origin.spellcasting?.spellSlots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ spellLevel: 1, expended: 1 }),
      ]),
    );

    for (const targetId of [fallingAId, fallingBId]) {
      const target = requireCombatant(resolved.state, targetId);
      expect(target.activeEffects).toContainEqual(
        expect.objectContaining({
          kind: "featherFallMitigation",
          sourceSpellId: featherFallUnitId,
          sourceCombatantId: casterId,
          expiresAt: expect.objectContaining({ kind: "duration" }),
        }),
      );
      expect(activeFeatherFallDescentRateCapFeetPerRound(target)).toBe(
        FEATHER_FALL_DESCENT_RATE_CAP_FEET_PER_ROUND,
      );
    }
  });

  test("clears mitigation on landing and prevents fall damage plus Falling Prone", () => {
    const mitigatedState = castFeatherFallOn([fallingAId, fallingBId]);

    const landing = resolveFeatherFallLanding({
      state: mitigatedState,
      targetId: fallingAId,
    });

    expect(landing).toMatchObject({
      tag: "mitigated",
      targetId: fallingAId,
      fallDamagePrevented: true,
      fallingPronePrevented: true,
    });
    if (landing.tag !== "mitigated") {
      throw new Error("Expected Feather Fall landing mitigation.");
    }
    const landedTarget = requireCombatant(landing.state, fallingAId);
    expect(activeFeatherFallDescentRateCapFeetPerRound(landedTarget)).toBe(
      null,
    );
    expect(landing.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: fallingAId,
          conditions: expect.not.arrayContaining(["prone"]),
        }),
      ]),
    );

    const stillFallingTarget = requireCombatant(landing.state, fallingBId);
    expect(
      activeFeatherFallDescentRateCapFeetPerRound(stillFallingTarget),
    ).toBe(FEATHER_FALL_DESCENT_RATE_CAP_FEET_PER_ROUND);
  });

  test("leaves unaffected and stale landing facts to normal Falling resolution", () => {
    const unaffected = resolveFeatherFallLanding({
      state: battleWithFeatherFall(),
      targetId: fallingAId,
    });
    expect(unaffected).toMatchObject({
      tag: "unmitigated",
      targetId: fallingAId,
      fallDamagePrevented: false,
      fallingPronePrevented: false,
    });

    const mitigatedState = castFeatherFallOn([fallingAId]);
    const firstLanding = resolveFeatherFallLanding({
      state: mitigatedState,
      targetId: fallingAId,
    });
    if (firstLanding.tag !== "mitigated") {
      throw new Error("Expected first landing to consume Feather Fall.");
    }
    const staleLanding = resolveFeatherFallLanding({
      state: firstLanding.state,
      targetId: fallingAId,
    });

    expect(staleLanding).toMatchObject({
      tag: "unmitigated",
      targetId: fallingAId,
      fallDamagePrevented: false,
      fallingPronePrevented: false,
    });
    expect(staleLanding.state).toBe(firstLanding.state);
  });

  test("does not offer Feather Fall without the falling-trigger fact", () => {
    const result = openFeatherFallWindow(
      battleWithFeatherFall(),
      fallingAId,
      false,
    );

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: { pendingReaction: null },
    });
  });

  test("rejects non-falling targets and more than five falling targets", () => {
    const awaitingReaction = openFeatherFallWindow(
      battleWithFeatherFall(),
      fallingAId,
      true,
    );
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Feather Fall falling-trigger Reaction window.");
    }
    const choice = awaitingReaction.snapshot.pendingReaction?.choices.find(
      (candidate) => candidate.kind === "castTriggeredReactionSpell",
    );
    if (choice === undefined || choice.kind !== "castTriggeredReactionSpell") {
      throw new Error("Expected Feather Fall Reaction choice.");
    }
    const targetList = requireHole(choice.initialHoles, "spellTargetList");
    const decisionHole = requireHole(
      awaitingReaction.holes,
      "reactionDecision",
    );

    const nonFalling = resolveBattleReaction({
      state: awaitingReaction.state,
      fill: reactionDecisionFill(decisionHole, {
        kind: "resolve",
        reactorId: casterId,
        choice: {
          kind: "castTriggeredReactionSpell",
          invocation: choice.invocation,
          fills: [
            featherFallTargetListFill(
              targetList,
              casterId,
              [fallingAId, fallingBId],
              [fallingAId],
            ),
          ],
        },
      }),
    });
    expect(nonFalling).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });

    const tooMany = resolveBattleReaction({
      state: awaitingReaction.state,
      fill: reactionDecisionFill(decisionHole, {
        kind: "resolve",
        reactorId: casterId,
        choice: {
          kind: "castTriggeredReactionSpell",
          invocation: choice.invocation,
          fills: [
            featherFallTargetListFill(targetList, casterId, [
              fallingAId,
              fallingBId,
              fallingCId,
              fallingDId,
              fallingEId,
              fallingFId,
            ]),
          ],
        },
      }),
    });
    expect(tooMany).toMatchObject({ tag: "invalid", reason: "invalidFill" });
  });
});

function srdSpellRecord(unitId: string): SpellRecord {
  const unit = unitLibrary.requireUnit(unitId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected SRD catalog unit ${unitId} to be a Spell.`);
  }
  return unit;
}

function battleWithFeatherFall(): BattleState {
  const result = startBattle({
    battleId: battleId("feather-fall-reaction-spell"),
    combatants: [
      characterCreature(casterId, "Feather Fall caster", 20, {
        sourceClassName: "wizard",
        spellcastingAbilityModifier: abilityModifier(3),
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [srdSpellRecord(featherFallUnitId)],
        featurePreparedSpells: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      }),
      characterCreature(fallingAId, "Falling A", 15),
      characterCreature(fallingBId, "Falling B", 14),
      characterCreature(fallingCId, "Falling C", 13),
      characterCreature(fallingDId, "Falling D", 12),
      characterCreature(fallingEId, "Falling E", 11),
      characterCreature(fallingFId, "Falling F", 10),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function castFeatherFallOn(
  targetIds: readonly [CombatantId, ...CombatantId[]],
): BattleState {
  const awaitingReaction = openFeatherFallWindow(
    battleWithFeatherFall(),
    targetIds[0],
    true,
  );
  if (awaitingReaction.tag !== "needsHoles") {
    throw new Error("Expected Feather Fall falling-trigger Reaction window.");
  }
  const choice = awaitingReaction.snapshot.pendingReaction?.choices.find(
    (candidate) =>
      candidate.kind === "castTriggeredReactionSpell" &&
      candidate.invocation.tag === "spellSlot" &&
      candidate.invocation.spellId === featherFallUnitId &&
      candidate.invocation.procedure === "featherFallMitigation",
  );
  if (choice === undefined || choice.kind !== "castTriggeredReactionSpell") {
    throw new Error("Expected Feather Fall Reaction choice.");
  }
  const resolved = resolveBattleReaction({
    state: awaitingReaction.state,
    fill: reactionDecisionFill(
      requireHole(awaitingReaction.holes, "reactionDecision"),
      {
        kind: "resolve",
        reactorId: casterId,
        choice: {
          kind: "castTriggeredReactionSpell",
          invocation: choice.invocation,
          fills: [
            featherFallTargetListFill(
              requireHole(choice.initialHoles, "spellTargetList"),
              casterId,
              targetIds,
            ),
          ],
        },
      },
    ),
  });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Feather Fall Reaction to resolve.");
  }
  return resolved.state;
}

function characterCreature(
  combatantIdValue: CombatantId,
  displayName: string,
  initiative: number,
  spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"],
): BattleCreatureInit {
  return {
    combatantId: combatantIdValue,
    displayName,
    initiative: initiativeScore(initiative),
    side: partySide,
    creatureInit: {
      kind: "character",
      characterId: characterId(`${combatantIdValue}-character`),
      characterUnitRefs: [],
      classLevels: [{ className: "wizard", level: 3 }],
      d20Statistics: testCharacterD20Statistics(),
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: {
        kind: "unarmedStrike",
        effect: {
          kind: "damage",
          damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
        },
        attackAbility: "str",
        attackAbilityModifier: abilityModifier(0),
        attackBonus: attackBonus(2),
        damageAbilityModifier: abilityModifier(0),
      },
      ...(spellcasting === undefined ? {} : { spellcasting }),
    },
  };
}

function openFeatherFallWindow(
  state: BattleState,
  fallingCreatureId: CombatantId,
  includeTriggerFact: boolean,
): BattleResolutionResult {
  return openCreatureFallsReactionWindow({
    state,
    fallingCreatureId,
    reactionSpellTargetFacts: includeTriggerFact
      ? [
          {
            kind: "featherFallTriggerSelfOrVisibleCreatureWithinRange",
            reactorId: casterId,
            fallingCreatureId,
            spellId: featherFallUnitId,
            rangeFeet: movementFeet(60),
          },
        ]
      : [],
  });
}

function featherFallTargetListFill(
  hole: Extract<BattleHole, { readonly kind: "spellTargetList" }>,
  casterIdValue: CombatantId,
  targetIds: readonly CombatantId[],
  fallingTargetIds: readonly CombatantId[] = targetIds,
): Extract<BattleFill, { readonly kind: "spellTargetList" }> {
  return {
    kind: "spellTargetList",
    holeId: hole.holeId,
    value: { targetIds },
    spatialFacts: fallingTargetIds.map((targetId) => ({
      kind: "featherFallTargetFallingWithinRange",
      casterId: casterIdValue,
      targetId,
      spellId: featherFallUnitId,
      rangeFeet: movementFeet(60),
    })),
  };
}

function reactionDecisionFill(
  hole: Extract<BattleHole, { readonly kind: "reactionDecision" }>,
  value: Extract<BattleFill, { readonly kind: "reactionDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "reactionDecision" }> {
  return { kind: "reactionDecision", holeId: hole.holeId, value };
}

function requireHole<K extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  const hole = holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: K }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function requireCombatant(state: BattleState, id: CombatantId) {
  const combatant = state.combatants.get(id);
  if (combatant === undefined) {
    throw new Error(`Expected combatant ${id}.`);
  }
  return combatant;
}
