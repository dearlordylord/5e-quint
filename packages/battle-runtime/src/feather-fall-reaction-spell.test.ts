import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV56A feather_fall
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-feather-fall-mitigation
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  abilityModifier,
  attackBonus,
  damageAmount,
  Hp,
  movementFeet,
  proficiencyBonus,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  classSpellListForSpellcastingClassRecord,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { SpellRecord } from "@dnd/surface/surface/types";
import {
  activeFeatherFallDescentRateCapFeetPerRound,
  battleId,
  characterId,
  combatantId,
  FEATHER_FALL_DESCENT_RATE_CAP_FEET_PER_ROUND,
  initiativeScore,
  openCreatureFallsInterruptWindow,
  openCreatureFallsRuntimeInterruptWindow,
  resolveBattleInterrupt,
  resolveBattleRuntimeInterrupt,
  resolveFallDamageLanding,
  resolveFeatherFallLanding,
  startBattle,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleRuntimeSession,
  type BattleState,
  type BattleTargetSpatialFact,
  type CombatantId,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import {
  spellAccessFreeCastSpellInvocationRef,
  spellSlotInvocationRef,
} from "./battle-subjects.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";
import {
  battleProcedureExecutionRefForSpellHoleForTest,
  battleFrontierInterruptDecisionForState,
  characterSpellInvocationRefForProcedureRefForTest,
  requireCharacterSpellProcedureRefForTest,
} from "./battle-runtime.test-support.ts";

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

describe("Feather Fall Reaction spell", () => {
  test("spends a source-scoped free cast when Feather Fall resolves for a falling creature", () => {
    const session = battleWithFeatherFall({ sourceScopedFreeCast: true });
    const caster = session.state.combatants.get(casterId);
    if (caster?.origin.kind !== "character") {
      throw new Error("Expected Feather Fall caster character.");
    }
    const freeCastOwnership = session.context.characters
      .get(casterId)
      ?.resourceOwnership.find(
        (ownership) =>
          ownership.purpose.tag === "spellAccessFreeCast" &&
          ownership.purpose.spellId === featherFallUnitId,
      );
    if (freeCastOwnership === undefined) {
      throw new Error("Expected Feather Fall free-cast resource ownership.");
    }
    const freeCastResource = caster.origin.resources.find(
      (resource) =>
        resource.resourcePoolRef === freeCastOwnership.resourcePoolRef,
    );
    if (freeCastResource === undefined) {
      throw new Error("Expected Feather Fall free-cast resource state.");
    }
    const resourcePoolRef = freeCastResource.resourcePoolRef;
    const invocationRef = spellAccessFreeCastSpellInvocationRef(
      featherFallUnitId,
      resourcePoolRef,
      "featherFallMitigation",
    );
    const awaitingReaction = openFeatherFallWindow(
      session,
      fallingAId,
      true,
      invocationRef,
    );
    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Feather Fall falling-trigger Reaction window.");
    }
    const reactionChoice = battleFrontierInterruptDecisionForState(
      awaitingReaction.state,
    )?.choices.find((choice) => choice.kind === "castTriggeredReactionSpell");
    if (
      reactionChoice === undefined ||
      reactionChoice.kind !== "castTriggeredReactionSpell"
    ) {
      throw new Error("Expected Feather Fall Reaction choice.");
    }
    expect(
      characterSpellInvocationRefForProcedureRefForTest(
        battleRuntimeSessionForTest({
          state: awaitingReaction.state,
          context: session.context,
        }),
        casterId,
        reactionChoice.subject.procedureRef,
      ),
    ).toMatchObject({
      tag: "spellAccessFreeCast",
      spellId: featherFallUnitId,
      procedure: "featherFallMitigation",
    });
    const targetList = requireHole(
      reactionChoice.initialHoles,
      "spellTargetList",
    );
    const resolved = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: casterId,
          choice: {
            kind: "castTriggeredReactionSpell",
            procedureRef: reactionChoice.subject.procedureRef,
            fills: [
              featherFallTargetListFill(targetList, casterId, [fallingAId]),
            ],
          },
        },
      ),
    });
    expect(resolved).toMatchObject({
      tag: "resolved",
    });
    if (resolved.tag !== "resolved") {
      throw new Error(
        "Expected source-scoped Feather Fall free cast to resolve.",
      );
    }
    const resolvedCaster = resolved.state.combatants.get(casterId);
    if (resolvedCaster?.origin.kind !== "character") {
      throw new Error("Expected Feather Fall caster character after cast.");
    }
    expect(
      resolvedCaster.origin.resources.find(
        (resource) => resource.resourcePoolRef === resourcePoolRef,
      ),
    ).toEqual(
      expect.objectContaining({
        resourcePoolRef,
        usesRemaining: 0,
      }),
    );
    expect(
      resolvedCaster?.origin.kind === "character"
        ? resolvedCaster.origin.spellcasting?.spellSlots
        : [],
    ).toEqual([]);
  });

  test("ignores unrelated spatial facts while discovering falling reactors", () => {
    const session = battleWithFeatherFall();
    const result = openCreatureFallsRuntimeInterruptWindow({
      session,
      fallingCreatureId: fallingAId,
      reactionSpellTargetFacts: [
        ...featherFallTriggerFacts(session, fallingAId, true),
        {
          kind: "retaliationDamagerWithinFiveFeet",
          damagedId: fallingAId,
          damageSourceId: casterId,
        },
      ],
    });

    expect(result).toMatchObject({
      tag: "needsHoles",
    });
  });

  test("rejects landing resolution for a combatant outside the battle", () => {
    const state = battleWithFeatherFall().state;

    expect(
      resolveFeatherFallLanding({
        state,
        targetId: combatantId("missing-feather-fall-target"),
      }),
    ).toMatchObject({
      tag: "invalid",
      state,
      reason: "missingCombatant",
    });
  });

  test("opens from a table-supplied falling trigger and applies per-target mitigation effects", () => {
    const state = battleWithFeatherFall();
    const awaitingReaction = openCreatureFallsRuntimeInterruptWindow({
      session: state,
      fallingCreatureId: fallingAId,
      reactionSpellTargetFacts: featherFallTriggerFacts(
        state,
        fallingAId,
        true,
      ),
    });

    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      envelope: {
        frontier: { kind: "interruptDecision", trigger: "creatureFalls" },
      },
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Feather Fall falling-trigger Reaction window.");
    }

    if (awaitingReaction.envelope.frontier.kind !== "interruptDecision") {
      throw new Error("Expected Feather Fall interrupt decision frontier.");
    }
    const choice = awaitingReaction.envelope.frontier.choices.find(
      (candidate) => {
        if (candidate.kind !== "castTriggeredReactionSpell") return false;
        const invocation = characterSpellInvocationRefForProcedureRefForTest(
          awaitingReaction.session,
          candidate.reactorId,
          candidate.subject.procedureRef,
        );
        return (
          invocation.tag === "spellSlot" &&
          invocation.spellId === featherFallUnitId &&
          invocation.procedure === "featherFallMitigation"
        );
      },
    );
    if (choice === undefined || choice.kind !== "castTriggeredReactionSpell") {
      throw new Error("Expected Feather Fall Reaction choice.");
    }
    const targetList = requireHole(choice.initialHoles, "spellTargetList");
    expect(targetList).toMatchObject({ minTargets: 1, maxTargets: 5 });

    const resolved = resolveBattleRuntimeInterrupt({
      session: awaitingReaction.session,
      fill: interruptDecisionFill(
        awaitingReaction.envelope.frontier.decisionHole,
        {
          kind: "resolve",
          responderId: casterId,
          choice: {
            kind: "castTriggeredReactionSpell",
            procedureRef: choice.subject.procedureRef,
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
      envelope: { frontier: { kind: "acts" } },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Feather Fall Reaction to resolve.");
    }

    const caster = requireCombatant(resolved.session.state, casterId);
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
      const target = requireCombatant(resolved.session.state, targetId);
      expect(target.activeEffects).toContainEqual(
        expect.objectContaining({
          kind: "featherFallMitigation",
          sourceProcedureRef: expect.any(String),
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

    const landing = resolveFallDamageLanding({
      state: mitigatedState,
      targetId: fallingAId,
      fallDamage: { kind: "rawFallDamage", amount: damageAmount(20) },
    });

    expect(landing).toMatchObject({
      tag: "landed",
      targetId: fallingAId,
      effectiveFallDamage: damageAmount(0),
      fallDamagePrevented: true,
      fallingPronePrevented: true,
      slowFallReductionAmount: damageAmount(0),
      featherFallMitigated: true,
    });
    if (landing.tag !== "landed") {
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
      state: battleWithFeatherFall().state,
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
    });
  });

  test("requests the target list when a Feather Fall Reaction omits it", () => {
    const awaitingReaction = openFeatherFallWindow(
      battleWithFeatherFall(),
      fallingAId,
      true,
    );
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Feather Fall falling-trigger Reaction window.");
    }
    const choice = battleFrontierInterruptDecisionForState(
      awaitingReaction.state,
    )?.choices.find(
      (candidate) => candidate.kind === "castTriggeredReactionSpell",
    );
    if (choice === undefined || choice.kind !== "castTriggeredReactionSpell") {
      throw new Error("Expected Feather Fall Reaction choice.");
    }

    const result = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: casterId,
          choice: {
            kind: "castTriggeredReactionSpell",
            procedureRef: choice.subject.procedureRef,
            fills: [],
          },
        },
      ),
    });

    expect(result).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "spellTargetList" }],
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
    const choice = battleFrontierInterruptDecisionForState(
      awaitingReaction.state,
    )?.choices.find(
      (candidate) => candidate.kind === "castTriggeredReactionSpell",
    );
    if (choice === undefined || choice.kind !== "castTriggeredReactionSpell") {
      throw new Error("Expected Feather Fall Reaction choice.");
    }
    const targetList = requireHole(choice.initialHoles, "spellTargetList");
    const decisionHole = requireHole(
      awaitingReaction.holes,
      "interruptDecision",
    );

    const nonFalling = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(decisionHole, {
        kind: "resolve",
        responderId: casterId,
        choice: {
          kind: "castTriggeredReactionSpell",
          procedureRef: choice.subject.procedureRef,
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

    const tooMany = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(decisionHole, {
        kind: "resolve",
        responderId: casterId,
        choice: {
          kind: "castTriggeredReactionSpell",
          procedureRef: choice.subject.procedureRef,
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

function battleWithFeatherFall(
  options: { readonly sourceScopedFreeCast?: boolean } = {},
): BattleRuntimeSession {
  const freeCastSource = {
    id: authoredUnitId("feat_synthetic_feather_fall_dabbler"),
    kind: "feat",
    category: "origin",
    name: "Synthetic Feather Fall Dabbler",
    provenance: { kind: "synthetic-test", section: "feather fall regression" },
    mechanics: { family: "magic_initiate", spellList: "wizard" },
  } as const;
  const sourceScopedFreeCast = options.sourceScopedFreeCast === true;
  const rayOfFrost = srdSpellRecord("ray_of_frost");
  const acidSplash = srdSpellRecord("acid_splash");
  const result = startBattle({
    battleId: battleId("feather-fall-reaction-spell"),
    combatants: [
      characterCreature(
        casterId,
        "Feather Fall caster",
        20,
        {
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "wizard",
            abilityModifier: abilityModifier(3),
          },
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [srdSpellRecord(featherFallUnitId)],
          featurePreparedSpells: [],
          spellAccesses: sourceScopedFreeCast
            ? [
                {
                  source: {
                    tag: "feat",
                    sourceUnit: freeCastSource,
                    spellList: wizardSpellListSource(),
                  },
                  spellcastingAbilityModifier: 3,
                  cantrips: [rayOfFrost, acidSplash],
                  levelOneSpell: srdSpellRecord(featherFallUnitId),
                },
              ]
            : [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: sourceScopedFreeCast ? [] : [{ spellLevel: 1, count: 1 }],
        },
        sourceScopedFreeCast
          ? {
              resources: [
                {
                  unit: freeCastSource,
                  spellAccessFreeCast: {
                    spellId: srdSpellRecord(featherFallUnitId).id,
                    count: 1,
                  },
                  usesRemaining: 1,
                },
              ],
              characterUnitRefs: [
                { unit: rayOfFrost, supportProfiles: [] },
                { unit: acidSplash, supportProfiles: [] },
                {
                  unit: srdSpellRecord(featherFallUnitId),
                  supportProfiles: [],
                },
                { unit: freeCastSource, supportProfiles: [] },
              ],
            }
          : undefined,
      ),
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
    throw new Error(battleStateInitIssueMessage(result.left));
  }
  return result.right;
}

function castFeatherFallOn(
  targetIds: readonly [CombatantId, ...CombatantId[]],
): BattleState {
  const session = battleWithFeatherFall();
  const awaitingReaction = openFeatherFallWindow(session, targetIds[0], true);
  if (awaitingReaction.tag !== "needsHoles") {
    throw new Error("Expected Feather Fall falling-trigger Reaction window.");
  }
  const choice = battleFrontierInterruptDecisionForState(
    awaitingReaction.state,
  )?.choices.find((candidate) => {
    if (candidate.kind !== "castTriggeredReactionSpell") return false;
    const invocation = characterSpellInvocationRefForProcedureRefForTest(
      battleRuntimeSessionForTest({
        ...session,
        state: awaitingReaction.state,
      }),
      candidate.reactorId,
      candidate.subject.procedureRef,
    );
    return (
      invocation.tag === "spellSlot" &&
      invocation.spellId === featherFallUnitId &&
      invocation.procedure === "featherFallMitigation"
    );
  });
  if (choice === undefined || choice.kind !== "castTriggeredReactionSpell") {
    throw new Error("Expected Feather Fall Reaction choice.");
  }
  const resolved = resolveBattleInterrupt({
    state: awaitingReaction.state,
    fill: interruptDecisionFill(
      requireHole(awaitingReaction.holes, "interruptDecision"),
      {
        kind: "resolve",
        responderId: casterId,
        choice: {
          kind: "castTriggeredReactionSpell",
          procedureRef: choice.subject.procedureRef,
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
  options: {
    readonly resources?: Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["resources"];
    readonly characterUnitRefs?: Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["characterUnitRefs"];
  } = {},
): BattleCreatureInit {
  return {
    combatantId: combatantIdValue,
    displayName,
    initiative: initiativeScore(initiative),
    creatureInit: {
      kind: "character",
      ammunitionStocks: [],
      characterId: characterId(`${combatantIdValue}-character`),
      characterUnitRefs: options.characterUnitRefs ?? [],
      classLevels: [{ className: "wizard", level: 3 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics(),
      weaponMasteries: [],
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
      resources: options.resources ?? [],
    },
  };
}

function openFeatherFallWindow(
  session: BattleRuntimeSession,
  fallingCreatureId: CombatantId,
  includeTriggerFact: boolean,
  invocationRef = spellSlotInvocationRef(
    featherFallUnitId,
    1,
    "featherFallMitigation",
  ),
): BattleResolutionResult {
  return openCreatureFallsInterruptWindow({
    state: session.state,
    fallingCreatureId,
    reactionSpellTargetFacts: featherFallTriggerFacts(
      session,
      fallingCreatureId,
      includeTriggerFact,
      invocationRef,
    ),
  });
}

function featherFallTriggerFacts(
  session: BattleRuntimeSession,
  fallingCreatureId: CombatantId,
  includeTriggerFact: boolean,
  invocationRef = spellSlotInvocationRef(
    featherFallUnitId,
    1,
    "featherFallMitigation",
  ),
): readonly BattleTargetSpatialFact[] {
  return includeTriggerFact
    ? [
        {
          kind: "featherFallTriggerSelfOrVisibleCreatureWithinRange",
          reactorId: casterId,
          fallingCreatureId,
          sourceProcedureRef: requireCharacterSpellProcedureRefForTest(
            session,
            casterId,
            invocationRef,
          ),
          rangeFeet: movementFeet(60),
        },
      ]
    : [];
}

function wizardSpellListSource(): import("./index.ts").CharacterBattleSpellListFact {
  const wizard = unitLibrary.requireUnit("class_wizard");
  if (
    wizard.kind !== "class" ||
    wizard.className !== "wizard" ||
    wizard.spellcasting?.kind !== "wizard_spellcasting_creation"
  ) {
    throw new Error("Expected Wizard spell-list source.");
  }
  return {
    className: wizard.className,
    ...classSpellListForSpellcastingClassRecord(wizard),
  };
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
      sourceProcedureRef: battleProcedureExecutionRefForSpellHoleForTest(hole),
      rangeFeet: movementFeet(60),
    })),
  };
}

function interruptDecisionFill(
  hole: Extract<BattleHole, { readonly kind: "interruptDecision" }>,
  value: Extract<BattleFill, { readonly kind: "interruptDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "interruptDecision" }> {
  return { kind: "interruptDecision", holeId: hole.holeId, value };
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
