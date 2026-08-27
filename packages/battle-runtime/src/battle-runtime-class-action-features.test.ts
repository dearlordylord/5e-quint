import {
  battleObjectId,
  BattleStatBlockProcedureExecutionRef,
  combatantId,
} from "./identity.ts";
import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.rogue-steady-aim
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.brutal-strike
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19D-01-BRUTAL-STRIKE-RECKLESS-DAMAGE barbarian_brutal_strike
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19D-02-BRUTAL-STRIKE-FORCEFUL-BLOW barbarian_brutal_strike
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19D-03-BRUTAL-STRIKE-HAMSTRING barbarian_brutal_strike
import { classLevel } from "@dnd/shared/types";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import type { CreatureNamedAttackRoll } from "@dnd/surface/surface/types";
import {
  battleActUnitPresentation,
  battleActSpellPresentation,
} from "./battle-act-composition.ts";
import {
  startBattleRight,
  testBattleCreatureStateWithConditions,
  requireResolved,
  fighterAttackSubject,
  grapplerUnitRefs,
  attackExecutionSelectionForSubjectForTest,
  goblinAttackSubject,
  attackInitialTargetHole,
  attackRollHoleAfterTarget,
  attackDamageHoleAfterHit,
  requireHole,
  findHole,
  targetFill,
  attackTargetFill,
  attackRollFill,
  grappleOutcomeFill,
  damageRollFill,
  damageRollFillWithGroups,
  attackDamageDispositionHoleAfterFills,
  attackDamageDispositionFill,
  unitFeatureDecisionFill,
  characterSeed,
  heavyArmorClassState,
  statBlockCreatureInit,
  actionSurgeResource,
  resource,
  supportedBattleUnitRef,
  rageResource,
  innateSorceryResource,
  recklessAttackFeature,
  testDaggerAttack,
  testUnarmedStrikeDamageAttack,
  testUnarmedStrikeDieAttack,
  actionSurgeWithAdditionalDirectEffect,
  secondWindWithAdditionalDirectEffect,
  wizardSpellcasting,
  spellRecord,
  statBlockCatalog,
  fighterId,
  goblinId,
  wizardId,
  unitLibrary,
  SURFACE_UNIT_RECORD_SCHEMA_NEGATIVE_TEST_TIMEOUT_MILLISECONDS,
  applyCondition,
  battleId,
  cantripSpellInvocationRef,
  characterBattleResourceUsage,
  characterBattleFeatureInitForTest,
  difficultyClass,
  discoverBattleActCandidates,
  discoverBattleActs,
  endTurn,
  movementFill,
  movementFeet,
  movementDeltaFeet,
  readyTriggerDescriptionForTest,
  resolveBattleSubject,
  resolveFailedAbilityCheckResourceBoost,
  resourceCount,
  spellSaveDcForCaster,
  startBattle,
  startBattleSessionRight,
} from "./battle-runtime.test-support.ts";
import { BRUTAL_STRIKE_SUPPORT_PROFILE } from "./unit-feature-support.ts";
import { activeRageDamageBonusForFrenzy } from "./battle-reducer/barbarian-frenzy.ts";
import { ongoingFeatureDamageModifier } from "./battle-reducer/damage-helpers.ts";
import { resolveSelectedAttackProcedure } from "./battle-reducer/attack-main.ts";
import { effectiveWalkSpeed } from "./battle-reducer/movement-speed.ts";
import { attackFillsForAttackHitReplay } from "./battle-reducer/attack-damage-events.ts";
import { FRENZY_DAMAGE_TYPE_HOLE_ID } from "./battle-reducer/battle-runtime-protocol.ts";
import { attackTargetHole } from "./battle-reducer/hole-helpers.ts";
import { resetBattleTurnResources } from "./battle-reducer/turn-resource-reset.ts";
import { isCharacterBattleCreatureState } from "./battle-reducer/creature-state-queries.ts";
import { activeFeatureSpellSaveDcRouteEvents } from "./battle-reducer/active-feature-spell-routes.ts";
import {
  eligibleAttackDamageRiders,
  frenzyDamageTypeDecision,
  frenzyDamageTypeSelection,
} from "./battle-reducer/statblock-attacks.ts";
import { creatureNamedAttackRollIsSupported } from "./statblock-action-support.ts";
import type {
  BattleState,
  BattleSubject,
} from "./battle-runtime.test-support.ts";
import type { BattleRuntimeSession } from "./index.ts";
import { describe, expect, test } from "vitest";
import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  battleProcedureExecutionRefForTest,
  requireCharacterSpellProcedureRefForTest,
  requireCharacterUnitProcedureRefForTest,
} from "./battle-runtime.test-support.ts";

function requireRecklessAttackProcedureRef(state: BattleState) {
  const actor = state.combatants.get(fighterId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected the fighter fixture to be a character.");
  }
  const binding = actor.origin.execution.procedureBindings.find(
    (candidate) =>
      candidate.procedure.kind === "unitFeature" &&
      candidate.procedure.execution.kind === "ongoingFeature" &&
      candidate.procedure.execution.activationTrigger === "firstAttackRoll" &&
      candidate.procedure.execution.spendsUse === false &&
      candidate.procedure.execution.rollModifiers.some(
        (modifier) =>
          modifier.mode === "advantage" &&
          modifier.affects === "selfRoll" &&
          modifier.on === "attackRoll" &&
          modifier.abilityFilter?.length === 1 &&
          modifier.abilityFilter[0] === "str",
      ) &&
      candidate.procedure.execution.rollModifiers.some(
        (modifier) =>
          modifier.mode === "advantage" &&
          modifier.affects === "rollsAgainstSelf" &&
          modifier.on === "attackRoll",
      ),
  );
  if (binding === undefined) {
    throw new Error("Expected the Reckless Attack mechanical procedure.");
  }
  return binding.procedureRef;
}

function requireOwnedCharacterResource(
  session: BattleRuntimeSession,
  unitId: string,
) {
  const ownership = session.context.characters
    .get(fighterId)
    ?.resourceOwnership.find((candidate) => candidate.unit.id === unitId);
  if (ownership === undefined) {
    throw new Error(`Expected resource ownership for ${unitId}.`);
  }
  const actor = session.state.combatants.get(fighterId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected the fighter fixture to be a character.");
  }
  const resource = actor.origin.resources.find(
    (candidate) => candidate.resourcePoolRef === ownership.resourcePoolRef,
  );
  if (resource === undefined) {
    throw new Error(`Expected runtime resource pool for ${unitId}.`);
  }
  return resource;
}

describe("battle runtime: class action features", () => {
  test("Action Surge grants one additional non-Magic action and cannot be used twice in one turn", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-action-surge"),
      combatants: [
        characterSeed({
          initiative: 20,
          resources: [actionSurgeResource(), resource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = {
      ...session.state,
      currentTurnResources: {
        actionResources: [],
        currentHasBonusAction: true,
        actionOrBonusActionExclusion: { kind: "notRestricted" },
        movementActionBonusActionExclusion: { kind: "notRestricted" },
        commandHalt: null,
        jumpDistanceMultiplier: null,
        heightenedStepOfTheWindCarriedCreatures: [],
        spellSlotUsesThisTurn: [],
        levelOnePlusSpellCastsThisTurn: [],
        quickenedLevelOnePlusSpellCastsThisTurn: [],
        attackRollMadeThisTurn: false,
        brutalStrike: { kind: "available" },
        attackDamageRidersUsedThisTurn: [],
        stunningStrikesUsedThisTurn: [],
        recklessAttackWhileRagingUsedThisTurn: [],
        weaponDamageDiceRollChoicesUsedThisTurn: [],
        weaponMasteryCleaveAttackersUsedThisTurn: [],
        huntersPreyHordeBreakerUsedThisTurn: [],
        grapplerPunchAndGrabUsedThisTurn: [],
        dashMovementBonusFeet: movementFeet(0),
        disengaged: false,
      },
    } satisfies BattleState;

    expect(
      discoverBattleActCandidates(state).map((act) => act.subject),
    ).toEqual([
      expect.objectContaining({
        tag: "unitFeature",
        actorId: fighterId,
        procedureRef: requireCharacterUnitProcedureRefForTest(
          session,
          fighterId,
          "fighter_action_surge",
        ),
      }),
      expect.objectContaining({
        tag: "unitFeature",
        actorId: fighterId,
        procedureRef: requireCharacterUnitProcedureRefForTest(
          session,
          fighterId,
          "fighter_second_wind",
        ),
      }),
      { tag: "runtimeCommand", actorId: fighterId, command: "move" },
      { tag: "runtimeCommand", actorId: fighterId, command: "endTurn" },
    ]);

    const surged = resolveBattleSubject({
      state,
      subject: {
        tag: "unitFeature",
        actorId: fighterId,
        procedureRef: requireCharacterUnitProcedureRefForTest(
          session,
          fighterId,
          "fighter_action_surge",
        ),
      },
      fills: [],
    });

    expect(surged).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: {
          actionResources: [
            {
              kind: "action",
              source: "unit",
              sourceOwnerId: fighterId,
              sourceProcedureRef: requireCharacterUnitProcedureRefForTest(
                session,
                fighterId,
                "fighter_action_surge",
              ),
              restriction: { kind: "exclude", actions: ["magic"] },
            },
          ],
        },
        acts: expect.arrayContaining([
          expect.objectContaining({
            subject: expect.objectContaining({ action: "attack" }),
          }),
          expect.objectContaining({
            subject: expect.objectContaining({ action: "grapple" }),
          }),
          expect.objectContaining({
            subject: {
              tag: "runtimeCommand",
              actorId: fighterId,
              command: "move",
            },
          }),
          expect.objectContaining({
            subject: {
              tag: "runtimeCommand",
              actorId: fighterId,
              command: "endTurn",
            },
          }),
        ]),
      },
    });

    if (surged.tag !== "resolved") {
      throw new Error(`Expected resolved Action Surge, got ${surged.tag}.`);
    }
    expect(
      surged.snapshot.acts.some((act) => act.subject.tag === "actionSpell"),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state: surged.state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          procedureRef: requireCharacterUnitProcedureRefForTest(
            session,
            fighterId,
            "fighter_action_surge",
          ),
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });

    const afterFighter = requireResolved(
      endTurn({ state: surged.state, actorId: fighterId }),
    );
    expect(
      requireOwnedCharacterResource(
        battleRuntimeSessionForTest({ ...session, state: afterFighter.state }),
        "fighter_action_surge",
      ),
    ).toEqual(expect.objectContaining({ usedThisTurn: true }));

    const afterGoblin = requireResolved(
      endTurn({ state: afterFighter.state, actorId: goblinId }),
    );
    expect(
      requireOwnedCharacterResource(
        battleRuntimeSessionForTest({ ...session, state: afterGoblin.state }),
        "fighter_action_surge",
      ),
    ).toEqual(expect.objectContaining({ usedThisTurn: false }));

    const zeroHpActorSession = startBattleSessionRight({
      battleId: battleId("battle-action-surge-atZeroHitPoints-actor"),
      combatants: [
        characterSeed({
          initiative: 20,
          currentHp: 0,
          resources: [actionSurgeResource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const zeroHpActorState = {
      ...zeroHpActorSession.state,
      currentTurnResources: {
        actionResources: [],
        currentHasBonusAction: true,
        actionOrBonusActionExclusion: { kind: "notRestricted" },
        movementActionBonusActionExclusion: { kind: "notRestricted" },
        commandHalt: null,
        jumpDistanceMultiplier: null,
        heightenedStepOfTheWindCarriedCreatures: [],
        spellSlotUsesThisTurn: [],
        levelOnePlusSpellCastsThisTurn: [],
        quickenedLevelOnePlusSpellCastsThisTurn: [],
        attackRollMadeThisTurn: false,
        brutalStrike: { kind: "available" },
        attackDamageRidersUsedThisTurn: [],
        stunningStrikesUsedThisTurn: [],
        recklessAttackWhileRagingUsedThisTurn: [],
        weaponDamageDiceRollChoicesUsedThisTurn: [],
        weaponMasteryCleaveAttackersUsedThisTurn: [],
        huntersPreyHordeBreakerUsedThisTurn: [],
        grapplerPunchAndGrabUsedThisTurn: [],
        dashMovementBonusFeet: movementFeet(0),
        disengaged: false,
      },
    } satisfies BattleState;
    expect(
      resolveBattleSubject({
        state: zeroHpActorState,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          procedureRef: requireCharacterUnitProcedureRefForTest(
            zeroHpActorSession,
            fighterId,
            "fighter_action_surge",
          ),
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("Action Surge discovery and resolution share the supported Unit feature shape", () => {
    const state = {
      ...startBattleRight({
        battleId: battleId("battle-action-surge-unsupported-shape"),
        combatants: [
          characterSeed({
            initiative: 20,
            resources: [
              actionSurgeResource({
                unit: actionSurgeWithAdditionalDirectEffect(),
              }),
            ],
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
      currentTurnResources: {
        actionResources: [],
        currentHasBonusAction: true,
        actionOrBonusActionExclusion: { kind: "notRestricted" },
        movementActionBonusActionExclusion: { kind: "notRestricted" },
        commandHalt: null,
        jumpDistanceMultiplier: null,
        heightenedStepOfTheWindCarriedCreatures: [],
        spellSlotUsesThisTurn: [],
        levelOnePlusSpellCastsThisTurn: [],
        quickenedLevelOnePlusSpellCastsThisTurn: [],
        attackRollMadeThisTurn: false,
        brutalStrike: { kind: "available" },
        attackDamageRidersUsedThisTurn: [],
        stunningStrikesUsedThisTurn: [],
        recklessAttackWhileRagingUsedThisTurn: [],
        weaponDamageDiceRollChoicesUsedThisTurn: [],
        weaponMasteryCleaveAttackersUsedThisTurn: [],
        huntersPreyHordeBreakerUsedThisTurn: [],
        grapplerPunchAndGrabUsedThisTurn: [],
        dashMovementBonusFeet: movementFeet(0),
        disengaged: false,
      },
    } satisfies BattleState;

    expect(
      discoverBattleActCandidates(state).map((act) => act.subject),
    ).toEqual([
      { tag: "runtimeCommand", actorId: fighterId, command: "move" },
      { tag: "runtimeCommand", actorId: fighterId, command: "endTurn" },
    ]);
    expect(
      discoverBattleActCandidates(state).some(
        (act) => act.subject.tag === "unitFeature",
      ),
    ).toBe(false);
  });

  test("Second Wind spends a Bonus Action and feature use to heal through the HP boundary", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-second-wind"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevel: 2,
          currentHp: 4,
          resources: [resource(), actionSurgeResource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });

    const secondWindAct = discoverBattleActs(session).find(
      (act) =>
        act.subject.tag === "unitFeature" &&
        battleActUnitPresentation(act)?.unitId === "fighter_second_wind",
    );
    expect(secondWindAct).toMatchObject({
      subject: {
        tag: "unitFeature",
        actorId: fighterId,
        procedureRef: requireCharacterUnitProcedureRefForTest(
          session,
          fighterId,
          "fighter_second_wind",
        ),
      },
      label: "Second Wind",
      initialHoles: [{ kind: "rolledDice", label: "Self-healing (1d10)" }],
    });

    if (secondWindAct === undefined) {
      throw new Error("Expected Second Wind act.");
    }
    const replay = resolveBattleSubject({
      state: session.state,
      subject: secondWindAct.subject,
      fills: [],
    });
    expect(replay).toMatchObject({
      tag: "needsHoles",
      holes: [findHole(secondWindAct.initialHoles, "rolledDice")],
    });
    const healingHole = findHole(secondWindAct.initialHoles, "rolledDice");
    const result = resolveBattleSubject({
      state: session.state,
      subject: secondWindAct.subject,
      fills: [damageRollFill(healingHole, 8)],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: {
          bonusActionQuotaAvailable: false,
        },
        combatants: [
          {
            combatantId: fighterId,
            hp: 12,
          },
          { combatantId: goblinId },
        ],
      },
    });
    if (result.tag !== "resolved") {
      throw new Error(`Expected resolved Second Wind, got ${result.tag}.`);
    }
    expect(
      requireOwnedCharacterResource(
        battleRuntimeSessionForTest({ ...session, state: result.state }),
        "fighter_second_wind",
      ),
    ).toEqual(expect.objectContaining({ usesRemaining: 1 }));
    expect(
      discoverBattleActs(
        battleRuntimeSessionForTest({ ...session, state: result.state }),
      ).some(
        (act) =>
          act.subject.tag === "unitFeature" &&
          battleActUnitPresentation(act)?.unitId === "fighter_second_wind",
      ),
    ).toBe(false);
  });

  test("Second Wind rejects an unrelated healing hole and an out-of-range d10 result", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-second-wind-invalid-healing-roll"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevel: 2,
          currentHp: 4,
          resources: [resource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const act = discoverBattleActs(session).find(
      (candidate) =>
        candidate.subject.tag === "unitFeature" &&
        battleActUnitPresentation(candidate)?.unitId === "fighter_second_wind",
    );
    if (act === undefined) {
      throw new Error("Expected Second Wind act.");
    }
    const healingHole = findHole(act.initialHoles, "rolledDice");

    expect(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [
          {
            ...damageRollFill(healingHole, 8),
            holeId: holeId("battle:test:unrelated-self-healing-roll"),
          },
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
    expect(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [damageRollFill(healingHole, 11)],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
  });

  test("Second Wind is rejected without action capacity, resource uses, or the supported Unit shape", () => {
    const noBonusActionSession = startBattleSessionRight({
      battleId: battleId("battle-second-wind-no-bonus-action"),
      combatants: [
        characterSeed({
          initiative: 20,
          currentHp: 4,
          resources: [resource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const noBonusActionState = {
      ...noBonusActionSession.state,
      currentTurnResources: {
        actionResources: [{ kind: "action", source: "turn" }],
        currentHasBonusAction: false,
        actionOrBonusActionExclusion: { kind: "notRestricted" },
        movementActionBonusActionExclusion: { kind: "notRestricted" },
        commandHalt: null,
        jumpDistanceMultiplier: null,
        heightenedStepOfTheWindCarriedCreatures: [],
        spellSlotUsesThisTurn: [],
        levelOnePlusSpellCastsThisTurn: [],
        quickenedLevelOnePlusSpellCastsThisTurn: [],
        attackRollMadeThisTurn: false,
        brutalStrike: { kind: "available" },
        attackDamageRidersUsedThisTurn: [],
        stunningStrikesUsedThisTurn: [],
        recklessAttackWhileRagingUsedThisTurn: [],
        weaponDamageDiceRollChoicesUsedThisTurn: [],
        weaponMasteryCleaveAttackersUsedThisTurn: [],
        huntersPreyHordeBreakerUsedThisTurn: [],
        grapplerPunchAndGrabUsedThisTurn: [],
        dashMovementBonusFeet: movementFeet(0),
        disengaged: false,
      },
    } satisfies BattleState;
    expect(
      resolveBattleSubject({
        state: noBonusActionState,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          procedureRef: requireCharacterUnitProcedureRefForTest(
            noBonusActionSession,
            fighterId,
            "fighter_second_wind",
          ),
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });

    const depletedState = startBattleRight({
      battleId: battleId("battle-second-wind-depleted"),
      combatants: [
        characterSeed({
          initiative: 20,
          currentHp: 4,
          resources: [resource({ usesRemaining: 0 })],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(
      discoverBattleActCandidates(depletedState).map((act) => act.subject),
    ).toEqual(
      expect.arrayContaining([
        fighterAttackSubject(depletedState, "Longsword"),
        { tag: "action", actorId: fighterId, action: "grapple" },
        { tag: "runtimeCommand", actorId: fighterId, command: "move" },
        { tag: "runtimeCommand", actorId: fighterId, command: "endTurn" },
      ]),
    );

    const unsupportedState = startBattleRight({
      battleId: battleId("battle-second-wind-unsupported-shape"),
      combatants: [
        characterSeed({
          initiative: 20,
          currentHp: 4,
          resources: [
            resource({
              unit: secondWindWithAdditionalDirectEffect(),
            }),
          ],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(
      discoverBattleActCandidates(unsupportedState).some(
        (act) => act.subject.tag === "unitFeature",
      ),
    ).toBe(false);

    const zeroHpActorSession = startBattleSessionRight({
      battleId: battleId("battle-second-wind-atZeroHitPoints-actor"),
      combatants: [
        characterSeed({
          initiative: 20,
          currentHp: 0,
          resources: [resource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const zeroHpActorState = zeroHpActorSession.state;
    expect(
      resolveBattleSubject({
        state: zeroHpActorState,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          procedureRef: requireCharacterUnitProcedureRefForTest(
            zeroHpActorSession,
            fighterId,
            "fighter_second_wind",
          ),
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("Steady Aim spends a Bonus Action, grants next-attack Advantage, and sets Speed to 0 until turn end", () => {
    const steadyAimUnit = unitLibrary.requireUnit("rogue_steady_aim");
    if (steadyAimUnit.kind !== "class_feature") {
      throw new Error("Expected Steady Aim class feature Unit.");
    }
    const session = startBattleSessionRight({
      battleId: battleId("battle-rogue-steady-aim"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "rogue", level: 3 }],
          unitFeatures: [
            characterBattleFeatureInitForTest(steadyAimUnit, [
              { className: "rogue", level: classLevel(3) },
            ]),
          ],
          characterUnitRefs: [supportedBattleUnitRef(steadyAimUnit)],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });

    const state = session.state;
    const act = discoverBattleActs(session).find(
      (candidate) =>
        candidate.subject.tag === "unitFeature" &&
        battleActUnitPresentation(candidate)?.unitId === "rogue_steady_aim",
    );
    expect(act).toMatchObject({
      subject: {
        tag: "unitFeature",
        actorId: fighterId,
        procedureRef: requireCharacterUnitProcedureRefForTest(
          session,
          fighterId,
          "rogue_steady_aim",
        ),
      },
      label: "Steady Aim",
      initialHoles: [],
    });
    if (act === undefined) {
      throw new Error("Expected Steady Aim act.");
    }
    const steadyAimProcedureRef = requireCharacterUnitProcedureRefForTest(
      session,
      fighterId,
      "rogue_steady_aim",
    );

    const aimed = requireResolved(
      resolveBattleSubject({ state, subject: act.subject, fills: [] }),
    );
    expect(aimed.snapshot.turn.bonusActionQuotaAvailable).toBe(false);
    expect(
      aimed.snapshot.combatants.find(
        (combatant) => combatant.combatantId === fighterId,
      )?.movement,
    ).toMatchObject({ speedFeet: 0, remainingFeet: 0 });
    expect(aimed.state.combatants.get(fighterId)?.activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "nextAttackRollBySelf",
          sourceProcedureRef: steadyAimProcedureRef,
          mode: "advantage",
        }),
        expect.objectContaining({
          kind: "selfSpeedZero",
          sourceProcedureRef: steadyAimProcedureRef,
        }),
      ]),
    );

    const targetHole = attackInitialTargetHole(aimed.state);
    const rollHole = attackRollHoleAfterTarget(aimed.state, targetHole);
    expect(rollHole).toMatchObject({
      kind: "attackRoll",
      rollMode: "advantage",
    });
    const attackRoll = attackRollFill(rollHole, {
      total: 16,
      naturalD20: 11,
      rollMode: "advantage",
    });
    const needsDamage = resolveBattleSubject({
      state: aimed.state,
      subject: fighterAttackSubject(state),
      fills: [targetFill(targetHole, goblinId), attackRoll],
    });
    const damageHole = requireHole(needsDamage, "rolledDice");
    const attacked = requireResolved(
      resolveBattleSubject({
        state: aimed.state,
        subject: fighterAttackSubject(state),
        fills: [
          targetFill(targetHole, goblinId),
          attackRoll,
          damageRollFill(damageHole, 4),
        ],
      }),
    );
    expect(
      attacked.state.combatants
        .get(fighterId)
        ?.activeEffects.some(
          (effect) => effect.kind === "nextAttackRollBySelf",
        ),
    ).toBe(false);
    expect(
      attacked.state.combatants
        .get(fighterId)
        ?.activeEffects.some((effect) => effect.kind === "selfSpeedZero"),
    ).toBe(true);
    expect(
      attacked.snapshot.combatants.find(
        (combatant) => combatant.combatantId === fighterId,
      )?.movement.speedFeet,
    ).toBe(0);

    const ended = endTurn({ state: attacked.state, actorId: fighterId });
    expect(ended).toMatchObject({ tag: "resolved" });
    if (ended.tag !== "resolved") {
      throw new Error("Expected Steady Aim turn end to resolve.");
    }
    expect(
      ended.state.combatants
        .get(fighterId)
        ?.activeEffects.some(
          (effect) =>
            effect.kind === "nextAttackRollBySelf" ||
            effect.kind === "selfSpeedZero",
        ),
    ).toBe(false);
    expect(
      ended.snapshot.combatants.find(
        (combatant) => combatant.combatantId === fighterId,
      )?.movement.speedFeet,
    ).toBe(30);
  });

  test("Steady Aim rejects prior movement or an unavailable Bonus Action", () => {
    const steadyAimUnit = unitLibrary.requireUnit("rogue_steady_aim");
    if (steadyAimUnit.kind !== "class_feature") {
      throw new Error("Expected Steady Aim class feature Unit.");
    }
    const session = startBattleSessionRight({
      battleId: battleId("battle-rogue-steady-aim-reject"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "rogue", level: 3 }],
          unitFeatures: [
            characterBattleFeatureInitForTest(steadyAimUnit, [
              { className: "rogue", level: classLevel(3) },
            ]),
          ],
          characterUnitRefs: [supportedBattleUnitRef(steadyAimUnit)],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const subject: BattleSubject = {
      tag: "unitFeature",
      actorId: fighterId,
      procedureRef: requireCharacterUnitProcedureRefForTest(
        session,
        fighterId,
        "rogue_steady_aim",
      ),
    };
    const actor = state.combatants.get(fighterId);
    if (actor === undefined) {
      throw new Error("Expected Steady Aim actor.");
    }
    const movedState = {
      ...state,
      combatants: new Map(state.combatants).set(fighterId, {
        ...actor,
        movementSpentFeet: movementFeet(5),
      }),
    } satisfies BattleState;
    expect(
      discoverBattleActs(
        battleRuntimeSessionForTest({ ...session, state: movedState }),
      ).some(
        (candidate) =>
          candidate.subject.tag === "unitFeature" &&
          battleActUnitPresentation(candidate)?.unitId === "rogue_steady_aim",
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({ state: movedState, subject, fills: [] }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Steady Aim is available only if the actor has not moved this turn.",
    });

    const noBonusActionState = {
      ...state,
      currentTurnResources: {
        ...state.currentTurnResources,
        currentHasBonusAction: false,
      },
    } satisfies BattleState;
    expect(
      resolveBattleSubject({ state: noBonusActionState, subject, fills: [] }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Steady Aim Bonus Action is no longer available.",
    });
  });

  test("Rage enters a reusable ongoing feature and applies damage and Resistance riders", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-rage-ongoing-feature"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 1 }],
          resources: [rageResource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const rageSubject: BattleSubject = {
      tag: "unitFeature",
      actorId: fighterId,
      procedureRef: requireCharacterUnitProcedureRefForTest(
        session,
        fighterId,
        "barbarian_rage",
      ),
    };
    expect(
      discoverBattleActCandidates(state).map((act) => act.subject),
    ).toEqual(expect.arrayContaining([expect.objectContaining(rageSubject)]));

    const raging = resolveBattleSubject({
      state,
      subject: rageSubject,
      fills: [],
    });
    expect(raging).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: expect.objectContaining({
          bonusActionQuotaAvailable: false,
        }),
      },
    });
    if (raging.tag !== "resolved") throw new Error("Expected resolved Rage.");
    expect([
      ...raging.state.combatants.get(fighterId)!
        .activeOngoingFeatureOccurrences,
    ]).toEqual(
      expect.arrayContaining([
        [
          rageSubject.procedureRef,
          expect.objectContaining({ kind: "roundExtended" }),
        ],
      ]),
    );

    const attackSubject = fighterAttackSubject(state);
    const target = attackInitialTargetHole(raging.state, attackSubject);
    const roll = attackRollHoleAfterTarget(raging.state, target, attackSubject);
    const damage = attackDamageHoleAfterHit(
      raging.state,
      target,
      roll,
      { total: 15, naturalD20: 10 },
      attackSubject,
    );
    const hit = resolveBattleSubject({
      state: raging.state,
      subject: attackSubject,
      fills: [
        targetFill(target, goblinId),
        attackRollFill(roll, { total: 15, naturalD20: 10 }),
        damageRollFill(damage, 4),
      ],
    });
    expect(hit).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: goblinId, hp: 1 }),
        ]),
      },
    });

    const goblinTurn = requireResolved(
      endTurn({ state: raging.state, actorId: fighterId }),
    ).state;
    const scimitar = goblinAttackSubject(goblinTurn, "Scimitar");
    const barbarianTarget = attackInitialTargetHole(goblinTurn, scimitar);
    const goblinRoll = attackRollHoleAfterTarget(
      goblinTurn,
      barbarianTarget,
      scimitar,
      fighterId,
    );
    const goblinDamage = attackDamageHoleAfterHit(
      goblinTurn,
      barbarianTarget,
      goblinRoll,
      { total: 15, naturalD20: 10 },
      scimitar,
      fighterId,
    );
    const resisted = resolveBattleSubject({
      state: goblinTurn,
      subject: scimitar,
      fills: [
        targetFill(barbarianTarget, fighterId),
        attackRollFill(goblinRoll, { total: 15, naturalD20: 10 }),
        damageRollFill(goblinDamage, 4),
      ],
    });
    expect(resisted).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: fighterId, hp: 9 }),
        ]),
      },
    });
  });

  test("Rage breaks Concentration and prevents spellcasting", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-rage-spellcasting-restriction"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [
            { className: "barbarian", level: 1 },
            { className: "wizard", level: 1 },
          ],
          resources: [rageResource()],
          spellcasting: wizardSpellcasting(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const concentratingActor = state.combatants.get(fighterId);
    if (concentratingActor === undefined) {
      throw new Error("Expected barbarian caster.");
    }
    const concentratingState = {
      ...state,
      combatants: new Map(state.combatants).set(fighterId, {
        ...concentratingActor,
        concentration: {
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String("mage_armor"),
          ),
          effectKind: "spellEffect" as const,
        },
      }),
    };
    const rayOfFrostProcedureRef = requireCharacterSpellProcedureRefForTest(
      battleRuntimeSessionForTest({ ...session, state: concentratingState }),
      fighterId,
      cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
    );
    const rageSubject: BattleSubject = {
      tag: "unitFeature",
      actorId: fighterId,
      procedureRef: requireCharacterUnitProcedureRefForTest(
        battleRuntimeSessionForTest({ ...session, state: concentratingState }),
        fighterId,
        "barbarian_rage",
      ),
    };
    const raging = requireResolved(
      resolveBattleSubject({
        state: concentratingState,
        subject: rageSubject,
        fills: [],
      }),
    );
    expect(raging.state.combatants.get(fighterId)?.concentration).toBeNull();
    expect(
      discoverBattleActCandidates(raging.state).map((act) => act.subject),
    ).not.toEqual(
      expect.arrayContaining([
        {
          tag: "actionSpell",
          actorId: fighterId,
          procedureRef: rayOfFrostProcedureRef,
          mode: { tag: "cast" },
        },
      ]),
    );
    expect(
      resolveBattleSubject({
        state: raging.state,
        subject: {
          tag: "actionSpell",
          actorId: fighterId,
          procedureRef: rayOfFrostProcedureRef,
          mode: { tag: "cast" },
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("Rage breaking Concentration dissipates a held readied spell", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-rage-readied-spell-cleanup"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [
            { className: "barbarian", level: 1 },
            { className: "wizard", level: 1 },
          ],
          resources: [rageResource()],
          spellcasting: wizardSpellcasting(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const readied = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "actionSpell",
          actorId: fighterId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            session,
            fighterId,
            cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
          ),
          mode: { tag: "ready", trigger: "attackHit" },
        },
        fills: [],
      }),
    );
    expect(readied.state.readiedSpells.has(fighterId)).toBe(true);
    const raging = requireResolved(
      resolveBattleSubject({
        state: readied.state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          procedureRef: requireCharacterUnitProcedureRefForTest(
            session,
            fighterId,
            "barbarian_rage",
          ),
        },
        fills: [],
      }),
    );
    expect(raging.state.combatants.get(fighterId)?.concentration).toBeNull();
    expect(raging.state.readiedSpells.has(fighterId)).toBe(false);
  });

  test("Reckless Attack is unavailable after any earlier attack roll that turn", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-reckless-after-spell-attack"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [
            { className: "barbarian", level: 2 },
            { className: "fighter", level: 2 },
            { className: "wizard", level: 1 },
          ],
          unitFeatures: [recklessAttackFeature()],
          resources: [actionSurgeResource()],
          spellcasting: wizardSpellcasting(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const spellSubject: BattleSubject = {
      tag: "actionSpell",
      actorId: fighterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        fighterId,
        cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
      ),
      mode: { tag: "cast" },
    };
    const spellAct = discoverBattleActs(session).find(
      (act) =>
        act.subject.tag === "actionSpell" &&
        act.subject.actorId === fighterId &&
        battleActSpellPresentation(act)?.invocation.spellId ===
          "ray_of_frost" &&
        battleActSpellPresentation(act)?.invocation.procedure ===
          "spellAttackDamage",
    );
    const target = spellAct?.initialHoles[0];
    if (target?.kind !== "targetChoice") {
      throw new Error("Expected Ray of Frost target hole.");
    }
    const afterTarget = resolveBattleSubject({
      state,
      subject: spellSubject,
      fills: [targetFill(target, goblinId)],
    });
    if (afterTarget.tag !== "needsHoles") {
      throw new Error("Expected Ray of Frost attack-roll hole.");
    }
    const roll = afterTarget.holes[0];
    if (roll?.kind !== "attackRoll") {
      throw new Error("Expected Ray of Frost attack-roll hole.");
    }
    const missed = requireResolved(
      resolveBattleSubject({
        state,
        subject: spellSubject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, { total: 1, naturalD20: 1 }),
        ],
      }),
    );
    expect(missed.state.currentTurnResources.attackRollMadeThisTurn).toBe(true);
    const surged = requireResolved(
      resolveBattleSubject({
        state: missed.state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          procedureRef: requireCharacterUnitProcedureRefForTest(
            session,
            fighterId,
            "fighter_action_surge",
          ),
        },
        fills: [],
      }),
    );
    const attackSubject = fighterAttackSubject(state);
    const attackTarget = attackInitialTargetHole(surged.state, attackSubject);
    const attackRoll = attackRollHoleAfterTarget(
      surged.state,
      attackTarget,
      attackSubject,
    );
    if (attackRoll.kind !== "attackRoll") {
      throw new Error("Expected weapon attack-roll hole.");
    }
    if (!("attack" in attackRoll)) {
      throw new Error("Expected weapon attack-roll hole.");
    }
    expect(attackRoll.ongoingFeatureActivations).toBeUndefined();
  });

  test("Rage Damage scales by Barbarian level", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-rage-damage-scaling"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 9 }],
          resources: [rageResource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const raging = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          procedureRef: requireCharacterUnitProcedureRefForTest(
            session,
            fighterId,
            "barbarian_rage",
          ),
        },
        fills: [],
      }),
    );
    const attackSubject = fighterAttackSubject(state);
    const target = attackInitialTargetHole(raging.state, attackSubject);
    const roll = attackRollHoleAfterTarget(raging.state, target, attackSubject);
    const damage = attackDamageHoleAfterHit(
      raging.state,
      target,
      roll,
      { total: 15, naturalD20: 10 },
      attackSubject,
    );
    const disposition = attackDamageDispositionHoleAfterFills(
      raging.state,
      attackSubject,
      [
        targetFill(target, goblinId),
        attackRollFill(roll, { total: 15, naturalD20: 10 }),
        damageRollFill(damage, 4),
      ],
    );
    const hit = requireResolved(
      resolveBattleSubject({
        state: raging.state,
        subject: attackSubject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, { total: 15, naturalD20: 10 }),
          damageRollFill(damage, 4),
          attackDamageDispositionFill(disposition, {
            kind: "ordinaryDamage",
          }),
        ],
      }),
    );
    expect(hit.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ combatantId: goblinId, hp: 0 }),
      ]),
    );
  });

  test("Rage Damage excludes an admitted Dexterity finesse attack", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-rage-dexterity-damage"),
      combatants: [
        characterSeed({
          initiative: 20,
          attack: { ...testDaggerAttack(), ability: "dex" },
          classLevels: [{ className: "barbarian", level: 9 }],
          resources: [rageResource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const raging = requireResolved(
      resolveBattleSubject({
        state: session.state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          procedureRef: requireCharacterUnitProcedureRefForTest(
            session,
            fighterId,
            "barbarian_rage",
          ),
        },
        fills: [],
      }),
    );
    const attacker = raging.state.combatants.get(fighterId);
    if (
      attacker?.origin.kind !== "character" ||
      attacker.origin.attack === null
    ) {
      throw new Error("Expected the admitted Dexterity Dagger attack.");
    }

    expect(
      ongoingFeatureDamageModifier(
        raging.state,
        attacker,
        attacker.origin.attack,
      ),
    ).toBe(0);
  });

  test("Tactical Mind spends Second Wind only when a failed ability check becomes successful", () => {
    const tacticalMindUnit = unitLibrary.requireUnit("fighter_tactical_mind");
    const session = startBattleSessionRight({
      battleId: battleId("battle-tactical-mind-converted-success"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevel: 2,
          resources: [resource({ usesRemaining: 2 })],
          unitFeatures: [
            characterBattleFeatureInitForTest(tacticalMindUnit, [
              { className: "fighter", level: classLevel(2) },
            ]),
          ],
          characterUnitRefs: [supportedBattleUnitRef(tacticalMindUnit)],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const tacticalMindProcedureRef = requireCharacterUnitProcedureRefForTest(
      session,
      fighterId,
      tacticalMindUnit.id,
    );

    const converted = resolveFailedAbilityCheckResourceBoost({
      state: session.state,
      procedureRef: tacticalMindProcedureRef,
      abilityCheck: {
        actorId: fighterId,
        ability: "int",
        skillOrToolLabel: "Investigation",
        originalTotal: 13,
        dc: difficultyClass(15),
      },
      boostRoll: 3,
    });

    expect(converted).toMatchObject({
      tag: "resolved",
      abilityCheckBoost: {
        boostedTotal: 16,
        boostedSucceeded: true,
      },
      snapshot: {
        turn: {
          bonusActionQuotaAvailable: true,
        },
      },
    });
    if (converted.tag !== "resolved") {
      throw new Error(`Expected resolved Tactical Mind, got ${converted.tag}.`);
    }
    expect(
      requireOwnedCharacterResource(
        battleRuntimeSessionForTest({ ...session, state: converted.state }),
        "fighter_second_wind",
      ),
    ).toEqual(expect.objectContaining({ usesRemaining: 1 }));

    const stillFailed = resolveFailedAbilityCheckResourceBoost({
      state: session.state,
      procedureRef: tacticalMindProcedureRef,
      abilityCheck: {
        actorId: fighterId,
        ability: "wis",
        originalTotal: 10,
        dc: difficultyClass(15),
      },
      boostRoll: 4,
    });

    expect(stillFailed).toMatchObject({
      tag: "resolved",
      abilityCheckBoost: {
        boostedTotal: 14,
        boostedSucceeded: false,
      },
    });
    if (stillFailed.tag !== "resolved") {
      throw new Error(
        `Expected resolved Tactical Mind, got ${stillFailed.tag}.`,
      );
    }
    expect(
      requireOwnedCharacterResource(
        battleRuntimeSessionForTest({ ...session, state: stillFailed.state }),
        "fighter_second_wind",
      ),
    ).toEqual(expect.objectContaining({ usesRemaining: 2 }));
  });

  test("Tactical Mind rejects successful checks, depleted Second Wind, unsupported Unit projection, and missing actors", () => {
    const tacticalMindUnit = unitLibrary.requireUnit("fighter_tactical_mind");
    const baseSession = startBattleSessionRight({
      battleId: battleId("battle-tactical-mind-invalid"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevel: 2,
          resources: [resource({ usesRemaining: 1 })],
          unitFeatures: [
            characterBattleFeatureInitForTest(tacticalMindUnit, [
              { className: "fighter", level: classLevel(2) },
            ]),
          ],
          characterUnitRefs: [supportedBattleUnitRef(tacticalMindUnit)],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const baseState = baseSession.state;
    const tacticalMindProcedureRef = requireCharacterUnitProcedureRefForTest(
      baseSession,
      fighterId,
      tacticalMindUnit.id,
    );
    expect(
      resolveFailedAbilityCheckResourceBoost({
        state: baseState,
        procedureRef: tacticalMindProcedureRef,
        abilityCheck: {
          actorId: fighterId,
          ability: "str",
          originalTotal: 15,
          dc: difficultyClass(15),
        },
        boostRoll: 1,
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });

    const depletedSession = startBattleSessionRight({
      battleId: battleId("battle-tactical-mind-depleted"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevel: 2,
          resources: [resource({ usesRemaining: 0 })],
          unitFeatures: [
            characterBattleFeatureInitForTest(tacticalMindUnit, [
              { className: "fighter", level: classLevel(2) },
            ]),
          ],
          characterUnitRefs: [supportedBattleUnitRef(tacticalMindUnit)],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const depletedState = depletedSession.state;
    expect(
      resolveFailedAbilityCheckResourceBoost({
        state: depletedState,
        procedureRef: requireCharacterUnitProcedureRefForTest(
          depletedSession,
          fighterId,
          tacticalMindUnit.id,
        ),
        abilityCheck: {
          actorId: fighterId,
          ability: "dex",
          originalTotal: 14,
          dc: difficultyClass(15),
        },
        boostRoll: 1,
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });

    const unsupportedState = startBattleRight({
      battleId: battleId("battle-tactical-mind-unsupported"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevel: 2,
          resources: [resource({ usesRemaining: 1 })],
          unitFeatures: [
            characterBattleFeatureInitForTest(tacticalMindUnit, [
              { className: "fighter", level: classLevel(2) },
            ]),
          ],
          characterUnitRefs: [],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(
      resolveFailedAbilityCheckResourceBoost({
        state: unsupportedState,
        procedureRef: tacticalMindProcedureRef,
        abilityCheck: {
          actorId: fighterId,
          ability: "cha",
          originalTotal: 14,
          dc: difficultyClass(15),
        },
        boostRoll: 1,
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });

    expect(
      resolveFailedAbilityCheckResourceBoost({
        state: baseState,
        procedureRef: tacticalMindProcedureRef,
        abilityCheck: {
          actorId: combatantId("missing-tactical-mind-actor"),
          ability: "int",
          originalTotal: 14,
          dc: difficultyClass(15),
        },
        boostRoll: 1,
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("Rage is unavailable in Heavy armor", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-rage-heavy-armor-gated"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 1 }],
          resources: [rageResource()],
          armorClass: heavyArmorClassState(),
          selectedLoadout: {
            armor: {
              itemId: battleObjectId("armor:armor_chain_mail"),
              unitId: parseSharedUnitId("armor_chain_mail"),
            },
            weapon: {
              itemId: battleObjectId("main:weapon_longsword"),
              unitId: parseSharedUnitId("weapon_longsword"),
              grip: "one_handed",
            },
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    expect(
      discoverBattleActCandidates(state).map((act) => act.subject),
    ).not.toEqual(
      expect.arrayContaining([
        {
          tag: "unitFeature",
          actorId: fighterId,
          procedureRef: requireCharacterUnitProcedureRefForTest(
            session,
            fighterId,
            "barbarian_rage",
          ),
        },
      ]),
    );
  });

  test("Rage extension spends a Bonus Action without spending another use", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-rage-bonus-action-extension"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 1 }],
          resources: [rageResource({ usesRemaining: 2 })],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const rageSubject: BattleSubject = {
      tag: "unitFeature",
      actorId: fighterId,
      procedureRef: requireCharacterUnitProcedureRefForTest(
        session,
        fighterId,
        "barbarian_rage",
      ),
    };
    const raging = requireResolved(
      resolveBattleSubject({ state, subject: rageSubject, fills: [] }),
    );
    const nextRound = requireResolved(
      endTurn({
        state: requireResolved(
          endTurn({ state: raging.state, actorId: fighterId }),
        ).state,
        actorId: goblinId,
      }),
    ).state;
    expect(
      discoverBattleActCandidates(nextRound).map((act) => act.subject),
    ).toEqual(expect.arrayContaining([expect.objectContaining(rageSubject)]));
    const extended = requireResolved(
      resolveBattleSubject({
        state: nextRound,
        subject: rageSubject,
        fills: [],
      }),
    );
    const rageState = requireOwnedCharacterResource(
      battleRuntimeSessionForTest({ ...session, state: extended.state }),
      "barbarian_rage",
    );
    if (
      rageState === undefined ||
      characterBattleResourceUsage(rageState) !== "limited" ||
      !("usesRemaining" in rageState)
    ) {
      throw new Error("Expected limited Rage resource.");
    }
    expect(Number(rageState.usesRemaining)).toBe(1);
    expect(extended.snapshot.turn.bonusActionQuotaAvailable).toBe(false);
  });

  test("Rage extends when Grapple forces an enemy saving throw", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-rage-grapple-saving-throw-extension"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 1 }],
          resources: [rageResource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const raging = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          procedureRef: requireCharacterUnitProcedureRefForTest(
            session,
            fighterId,
            "barbarian_rage",
          ),
        },
        fills: [],
      }),
    );
    const nextFighterTurn = requireResolved(
      endTurn({
        state: requireResolved(
          endTurn({ state: raging.state, actorId: fighterId }),
        ).state,
        actorId: goblinId,
      }),
    ).state;
    const grappleSubject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "grapple",
    };
    const grappleAct = discoverBattleActCandidates(nextFighterTurn).find(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.actorId === fighterId &&
        act.subject.action === "grapple",
    );
    if (grappleAct === undefined) {
      throw new Error("Expected Grapple act.");
    }
    const target = findHole(grappleAct.initialHoles, "targetChoice");
    const afterTarget = resolveBattleSubject({
      state: nextFighterTurn,
      subject: grappleSubject,
      fills: [
        targetFill(target, goblinId, [
          {
            kind: "grappleTargetWithinReach",
            grapplerId: fighterId,
            targetId: goblinId,
          },
        ]),
      ],
    });
    if (afterTarget.tag !== "needsHoles") {
      throw new Error("Expected Grapple outcome hole.");
    }
    const outcome = findHole(afterTarget.holes, "grappleOutcome");
    const grappled = requireResolved(
      resolveBattleSubject({
        state: nextFighterTurn,
        subject: grappleSubject,
        fills: [
          targetFill(target, goblinId, [
            {
              kind: "grappleTargetWithinReach",
              grapplerId: fighterId,
              targetId: goblinId,
            },
          ]),
          grappleOutcomeFill(outcome, false, [
            {
              kind: "savingThrowTargetIsEnemy",
              actorId: fighterId,
              targetId: goblinId,
              targetIsEnemy: true,
            },
          ]),
        ],
      }),
    );
    const barbarian = grappled.state.combatants.get(fighterId);
    expect(
      [...(barbarian?.activeOngoingFeatureOccurrences.values() ?? [])][0]
        ?.expiresAt,
    ).toEqual({
      kind: "endOfTurn",
      combatantId: fighterId,
      round: 3,
    });
  });

  test("Rage attack-roll extension consumes the procedure enemy fact", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-rage-attack-roll-relationship-fact"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 1 }],
          resources: [rageResource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const raging = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          procedureRef: requireCharacterUnitProcedureRefForTest(
            session,
            fighterId,
            "barbarian_rage",
          ),
        },
        fills: [],
      }),
    ).state;
    const nextFighterTurn = requireResolved(
      endTurn({
        state: requireResolved(endTurn({ state: raging, actorId: fighterId }))
          .state,
        actorId: goblinId,
      }),
    ).state;
    const subject = fighterAttackSubject(nextFighterTurn, "Longsword");
    const target = attackInitialTargetHole(nextFighterTurn, subject);
    expect(target).toMatchObject({
      relationshipFactRequest: {
        kind: "attackRollTargetIsEnemy",
        attackerId: fighterId,
      },
    });
    const targetSelection = targetFill(target, goblinId);
    if (targetSelection.kind !== "targetChoice") {
      throw new Error("Expected attack target choice fill.");
    }
    expect(
      resolveBattleSubject({
        state: nextFighterTurn,
        subject,
        fills: [
          {
            ...targetSelection,
            relationshipFacts: [
              {
                kind: "savingThrowTargetIsEnemy",
                actorId: fighterId,
                targetId: goblinId,
                targetIsEnemy: true,
              },
            ],
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Attack target relationship facts must answer the attack target hole request.",
    });
    const enemyTargetSelection = {
      ...targetSelection,
      relationshipFacts: [
        {
          kind: "attackRollTargetIsEnemy" as const,
          attackerId: fighterId,
          targetId: goblinId,
          targetIsEnemy: true,
        },
      ] as const,
    };
    const roll = attackRollHoleAfterTarget(nextFighterTurn, target, subject);
    const resolved = requireResolved(
      resolveBattleSubject({
        state: nextFighterTurn,
        subject,
        fills: [
          enemyTargetSelection,
          attackRollFill(roll, { naturalD20: 1, total: 1 }),
        ],
      }),
    );
    const barbarian = resolved.state.combatants.get(fighterId);
    expect(
      [...(barbarian?.activeOngoingFeatureOccurrences.values() ?? [])][0]
        ?.expiresAt,
    ).toEqual({
      kind: "endOfTurn",
      combatantId: fighterId,
      round: 3,
    });
  });

  test("Incapacitated combatants cannot activate or extend Rage", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-rage-incapacitated-action-gate"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 1 }],
          resources: [rageResource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const barbarian = state.combatants.get(fighterId);
    if (barbarian === undefined) {
      throw new Error("Expected barbarian combatant.");
    }
    const incapacitatedState = {
      ...state,
      combatants: new Map(state.combatants).set(
        fighterId,
        testBattleCreatureStateWithConditions(
          barbarian,
          applyCondition(barbarian.conditions, "incapacitated"),
        ),
      ),
    };
    const rageSubject: BattleSubject = {
      tag: "unitFeature",
      actorId: fighterId,
      procedureRef: requireCharacterUnitProcedureRefForTest(
        battleRuntimeSessionForTest({ ...session, state: incapacitatedState }),
        fighterId,
        "barbarian_rage",
      ),
    };
    expect(
      discoverBattleActCandidates(incapacitatedState).map((act) => act.subject),
    ).not.toEqual(expect.arrayContaining([rageSubject]));
    expect(
      resolveBattleSubject({
        state: incapacitatedState,
        subject: rageSubject,
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("Persistent Rage uses ten-minute duration and Unconscious early end", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-persistent-rage"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 15 }],
          resources: [rageResource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const raging = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          procedureRef: requireCharacterUnitProcedureRefForTest(
            session,
            fighterId,
            "barbarian_rage",
          ),
        },
        fills: [],
      }),
    );
    const snapshotBarbarian = raging.state.combatants.get(fighterId);
    expect(
      [
        ...(snapshotBarbarian?.activeOngoingFeatureOccurrences.values() ?? []),
      ][0]?.expiresAt,
    ).toEqual({
      kind: "endOfTurn",
      combatantId: fighterId,
      round: 101,
    });
    const barbarian = raging.state.combatants.get(fighterId);
    if (barbarian === undefined) {
      throw new Error("Expected barbarian combatant.");
    }
    const incapacitated = {
      ...raging.state,
      combatants: new Map(raging.state.combatants).set(
        fighterId,
        testBattleCreatureStateWithConditions(
          barbarian,
          applyCondition(barbarian.conditions, "incapacitated"),
        ),
      ),
    };
    const stillRaging = requireResolved(
      endTurn({ state: incapacitated, actorId: fighterId }),
    );
    expect(
      stillRaging.state.combatants.get(fighterId)
        ?.activeOngoingFeatureOccurrences.size,
    ).toBe(1);
    const unconscious = {
      ...raging.state,
      combatants: new Map(raging.state.combatants).set(
        fighterId,
        testBattleCreatureStateWithConditions(
          barbarian,
          applyCondition(barbarian.conditions, "unconscious"),
        ),
      ),
    };
    const ended = requireResolved(
      endTurn({ state: unconscious, actorId: fighterId }),
    );
    expect(
      ended.state.combatants.get(fighterId)?.activeOngoingFeatureOccurrences
        .size,
    ).toBe(0);
  });

  test("Spell Save DC is absent for non-spellcasting or non-character casters", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-spell-save-dc-boundaries"),
      combatants: [
        characterSeed({
          combatantId: fighterId,
          initiative: 20,
          spellcasting: undefined,
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
      ],
    });

    expect(spellSaveDcForCaster(session.state, fighterId)).toBeNull();
    expect(spellSaveDcForCaster(session.state, goblinId)).toBeNull();
    expect(
      spellSaveDcForCaster(session.state, combatantId("missing-caster")),
    ).toBeNull();
  });

  test("Innate Sorcery activation spends a Bonus Action and one Long Rest use for one minute", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-innate-sorcery"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "sorcerer", level: 1 }],
          resources: [innateSorceryResource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const subject: BattleSubject = {
      tag: "unitFeature",
      actorId: fighterId,
      procedureRef: requireCharacterUnitProcedureRefForTest(
        session,
        fighterId,
        "sorcerer_innate_sorcery",
      ),
    };

    expect(
      discoverBattleActCandidates(state).map((act) => act.subject),
    ).toEqual(expect.arrayContaining([expect.objectContaining(subject)]));

    const result = requireResolved(
      resolveBattleSubject({ state, subject, fills: [] }),
    );
    const sorcerer = result.state.combatants.get(fighterId);
    const resource = requireOwnedCharacterResource(
      battleRuntimeSessionForTest({ ...session, state: result.state }),
      "sorcerer_innate_sorcery",
    );

    expect(result.state.currentTurnResources.currentHasBonusAction).toBe(false);
    expect(resource).toMatchObject({ usesRemaining: resourceCount(1) });
    expect(sorcerer?.activeOngoingFeatureOccurrences).toEqual(
      new Map([
        [
          subject.procedureRef,
          {
            kind: "fixedDuration",
            expiresAt: {
              kind: "endOfTurn",
              combatantId: fighterId,
              round: 11,
            },
          },
        ],
      ]),
    );
  });

  test("Innate Sorcery rejects exhausted uses and non-Sorcerer ownership", () => {
    const exhaustedSession = startBattleSessionRight({
      battleId: battleId("battle-innate-sorcery-exhausted"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "sorcerer", level: 1 }],
          resources: [innateSorceryResource({ usesRemaining: 0 })],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const exhausted = exhaustedSession.state;
    const subject: BattleSubject = {
      tag: "unitFeature",
      actorId: fighterId,
      procedureRef: requireCharacterUnitProcedureRefForTest(
        exhaustedSession,
        fighterId,
        "sorcerer_innate_sorcery",
      ),
    };
    expect(
      discoverBattleActCandidates(exhausted).map((act) => act.subject),
    ).not.toEqual(expect.arrayContaining([subject]));
    expect(
      resolveBattleSubject({ state: exhausted, subject, fills: [] }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
    expect(() =>
      startBattle({
        battleId: battleId("battle-innate-sorcery-non-sorcerer"),
        combatants: [
          characterSeed({
            initiative: 20,
            resources: [innateSorceryResource()],
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
    ).toThrow(
      "Character class feature resource requires a sorcerer class level.",
    );
  });

  test("Innate Sorcery expires after its one-minute active duration", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-innate-sorcery-expiry"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "sorcerer", level: 1 }],
          resources: [innateSorceryResource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const subject: BattleSubject = {
      tag: "unitFeature",
      actorId: fighterId,
      procedureRef: requireCharacterUnitProcedureRefForTest(
        session,
        fighterId,
        "sorcerer_innate_sorcery",
      ),
    };
    let current = requireResolved(
      resolveBattleSubject({ state, subject, fills: [] }),
    ).state;

    for (let round = 1; round <= 10; round += 1) {
      current = requireResolved(
        endTurn({ state: current, actorId: fighterId }),
      ).state;
      current = requireResolved(
        endTurn({ state: current, actorId: goblinId }),
      ).state;
    }
    current = requireResolved(
      endTurn({ state: current, actorId: fighterId }),
    ).state;

    expect(
      current.combatants.get(fighterId)?.activeOngoingFeatureOccurrences,
    ).toEqual(new Map());
  });

  test("Innate Sorcery projects +1 DC and spell attack Advantage for Sorcerer spells while active", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-innate-sorcery-spell-projection"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "sorcerer", level: 1 }],
          resources: [innateSorceryResource()],
          spellcasting: {
            ...wizardSpellcasting({
              cantrips: [
                spellRecord("acid_splash"),
                spellRecord("ray_of_frost"),
              ],
              preparedSpells: [],
            }),
            spellcastingSource: {
              tag: "classSpellcasting",
              className: "sorcerer",
              abilityModifier: 3,
            },
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    expect(
      activeFeatureSpellSaveDcRouteEvents({
        state,
        casterId: fighterId,
      }),
    ).toBeUndefined();
    const activated = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          procedureRef: requireCharacterUnitProcedureRefForTest(
            session,
            fighterId,
            "sorcerer_innate_sorcery",
          ),
        },
        fills: [],
      }),
    ).state;

    expect(spellSaveDcForCaster(activated, fighterId)).toBe(14);
    expect(
      activeFeatureSpellSaveDcRouteEvents({
        state: activated,
        casterId: fighterId,
      }),
    ).toEqual([
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "activeFeatureSpellSaveDc",
        holes: [],
        owner: "battleActiveEffect",
      },
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "activeFeatureSpellSaveDc",
        holes: [],
        owner: "battleSpellSlotAndActionEconomy",
      },
    ]);

    const subject: BattleSubject = {
      tag: "actionSpell",
      actorId: fighterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        fighterId,
        cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
      ),
      mode: { tag: "cast" },
    };
    const target = requireHole(
      resolveBattleSubject({ state: activated, subject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state: activated,
        subject,
        fills: [targetFill(target, goblinId)],
      }),
      "attackRoll",
    );

    expect(attackRoll).toMatchObject({ rollMode: "advantage" });

    const mutualUnseenAttackRoll = requireHole(
      resolveBattleSubject({
        state: activated,
        subject,
        fills: [
          targetFill(target, goblinId, [
            {
              kind: "spellTarget",
              casterId: fighterId,
              targetId: goblinId,
              sourceProcedureRef: battleProcedureExecutionRefForTest(
                String("ray_of_frost"),
              ),
            },
            {
              kind: "attackAttackerCannotSeeTarget",
              attackerId: fighterId,
              targetId: goblinId,
            },
            {
              kind: "attackTargetCannotSeeAttacker",
              attackerId: fighterId,
              targetId: goblinId,
            },
          ]),
        ],
      }),
      "attackRoll",
    );

    expect(mutualUnseenAttackRoll).toHaveProperty("rollMode", "normal");
  });

  test("Innate Sorcery does not project onto non-Sorcerer spell sources and stops after expiration", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-innate-sorcery-spell-source-gate"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [
            { className: "sorcerer", level: 1 },
            { className: "wizard", level: 1 },
          ],
          resources: [innateSorceryResource()],
          spellcasting: {
            ...wizardSpellcasting({
              cantrips: [spellRecord("ray_of_frost")],
              preparedSpells: [],
            }),
            spellcastingSource: {
              tag: "classSpellcasting",
              className: "wizard",
              abilityModifier: 3,
            },
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const activated = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          procedureRef: requireCharacterUnitProcedureRefForTest(
            session,
            fighterId,
            "sorcerer_innate_sorcery",
          ),
        },
        fills: [],
      }),
    ).state;

    expect(spellSaveDcForCaster(activated, fighterId)).toBe(13);

    const subject: BattleSubject = {
      tag: "actionSpell",
      actorId: fighterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        fighterId,
        cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
      ),
      mode: { tag: "cast" },
    };
    const target = requireHole(
      resolveBattleSubject({ state: activated, subject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state: activated,
        subject,
        fills: [targetFill(target, goblinId)],
      }),
      "attackRoll",
    );

    expect(attackRoll).not.toHaveProperty("rollMode");

    let expired = activated;
    for (let round = 1; round <= 10; round += 1) {
      expired = requireResolved(
        endTurn({ state: expired, actorId: fighterId }),
      ).state;
      expired = requireResolved(
        endTurn({ state: expired, actorId: goblinId }),
      ).state;
    }
    expired = requireResolved(
      endTurn({ state: expired, actorId: fighterId }),
    ).state;

    expect(spellSaveDcForCaster(expired, fighterId)).toBe(13);
  });

  test("Rage early-end conditions remove the ongoing feature instead of hiding it", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-rage-early-end-removal"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 1 }],
          resources: [rageResource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const rageSubject: BattleSubject = {
      tag: "unitFeature",
      actorId: fighterId,
      procedureRef: requireCharacterUnitProcedureRefForTest(
        session,
        fighterId,
        "barbarian_rage",
      ),
    };
    const raging = requireResolved(
      resolveBattleSubject({ state, subject: rageSubject, fills: [] }),
    );
    const barbarian = raging.state.combatants.get(fighterId);
    if (barbarian === undefined) {
      throw new Error("Expected barbarian combatant.");
    }
    const incapacitated = {
      ...raging.state,
      combatants: new Map(raging.state.combatants).set(
        fighterId,
        testBattleCreatureStateWithConditions(
          barbarian,
          applyCondition(barbarian.conditions, "incapacitated"),
        ),
      ),
    };
    const ended = requireResolved(
      endTurn({ state: incapacitated, actorId: fighterId }),
    );
    expect(
      ended.state.combatants.get(fighterId)?.activeOngoingFeatureOccurrences
        .size,
    ).toBe(0);
  });

  test("Reckless Attack ongoing feature grants reciprocal Advantage until the actor's next turn", () => {
    const state = startBattleRight({
      battleId: battleId("battle-reckless-ongoing-feature"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 2 }],
          unitFeatures: [recklessAttackFeature()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(
      discoverBattleActCandidates(state).map((act) => act.subject),
    ).not.toEqual(
      expect.arrayContaining([
        {
          tag: "unitFeature",
          actorId: fighterId,
          procedureRef: requireRecklessAttackProcedureRef(state),
        },
      ]),
    );

    const attackSubject = fighterAttackSubject(state);
    const target = attackInitialTargetHole(state, attackSubject);
    const roll = attackRollHoleAfterTarget(state, target, attackSubject);
    expect(roll).toMatchObject({
      ongoingFeatureActivations: [
        expect.objectContaining({
          procedureRef: requireRecklessAttackProcedureRef(state),
          rollMode: "advantage",
        }),
      ],
    });
    const reckless = resolveBattleSubject({
      state,
      subject: attackSubject,
      fills: [
        targetFill(target, goblinId),
        attackRollFill(roll, {
          total: 15,
          naturalD20: 10,
          rollMode: "advantage",
          activatedOngoingFeatureProcedureRef:
            requireRecklessAttackProcedureRef(state),
        }),
      ],
    });
    if (reckless.tag !== "needsHoles") {
      throw new Error("Expected Reckless attack to reach damage roll.");
    }
    expect([
      ...reckless.state.combatants.get(fighterId)!
        .activeOngoingFeatureOccurrences,
    ]).toEqual(
      expect.arrayContaining([
        [
          requireRecklessAttackProcedureRef(state),
          expect.objectContaining({ kind: "turnBoundary" }),
        ],
      ]),
    );
    const damage = findHole(reckless.holes, "rolledDice");
    const completedAttack = requireResolved(
      resolveBattleSubject({
        state: reckless.state,
        subject: attackSubject,
        fills: [
          attackTargetFill(
            target,
            attackSubject.actorId,
            goblinId,
            attackExecutionSelectionForSubjectForTest(attackSubject),
          ),
          attackRollFill(roll, {
            total: 15,
            naturalD20: 10,
            rollMode: "advantage",
            activatedOngoingFeatureProcedureRef:
              requireRecklessAttackProcedureRef(state),
          }),
          damageRollFill(damage, 4),
        ],
      }),
    );

    const goblinTurn = requireResolved(
      endTurn({ state: completedAttack.state, actorId: fighterId }),
    ).state;
    const scimitar = goblinAttackSubject(goblinTurn, "Scimitar");
    const barbarianTarget = attackInitialTargetHole(goblinTurn, scimitar);
    const incomingRoll = attackRollHoleAfterTarget(
      goblinTurn,
      barbarianTarget,
      scimitar,
      fighterId,
    );
    expect(incomingRoll).toMatchObject({ rollMode: "advantage" });

    const barbarianTurn = requireResolved(
      endTurn({ state: goblinTurn, actorId: goblinId }),
    ).state;
    expect(
      barbarianTurn.combatants.get(fighterId)?.activeOngoingFeatureOccurrences,
    ).toEqual(new Map());
  });

  test("Frenzy damage-type selection exposes automatic, choice, and invalid outcomes", () => {
    expect(
      frenzyDamageTypeSelection({
        authoredDamageTypes: ["bludgeoning", "bludgeoning"],
        selectedDamageType: undefined,
      }),
    ).toEqual({ tag: "automatic", damageType: "bludgeoning" });
    expect(
      frenzyDamageTypeSelection({
        authoredDamageTypes: ["bludgeoning"],
        selectedDamageType: "fire",
      }),
    ).toEqual({ tag: "invalid", reason: "selectionForAutomaticType" });
    expect(
      frenzyDamageTypeSelection({
        authoredDamageTypes: ["bludgeoning", "fire", "piercing"],
        selectedDamageType: undefined,
      }),
    ).toEqual({
      tag: "decisionRequired",
      choices: ["bludgeoning", "fire", "piercing"],
    });
    expect(
      frenzyDamageTypeSelection({
        authoredDamageTypes: ["bludgeoning", "fire"],
        selectedDamageType: "fire",
      }),
    ).toEqual({ tag: "selected", damageType: "fire" });
    expect(
      frenzyDamageTypeSelection({
        authoredDamageTypes: ["bludgeoning", "fire"],
        selectedDamageType: "cold",
      }),
    ).toEqual({ tag: "invalid", reason: "outsideOfferedTypes" });
  });

  test("Frenzy applies mandatory Rage Damage dice to the first Reckless Strength hit", () => {
    const frenzyUnit = unitLibrary.requireUnit("barbarian_frenzy");
    const session = startBattleSessionRight({
      battleId: battleId("battle-barbarian-frenzy"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 3 }],
          resources: [rageResource()],
          unitFeatures: [
            characterBattleFeatureInitForTest(frenzyUnit, [
              { className: "barbarian", level: classLevel(3) },
            ]),
            recklessAttackFeature(),
          ],
          characterUnitRefs: [supportedBattleUnitRef(frenzyUnit)],
          unarmedStrike: testUnarmedStrikeDamageAttack(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const rageSubject: BattleSubject = {
      tag: "unitFeature",
      actorId: fighterId,
      procedureRef: requireCharacterUnitProcedureRefForTest(
        session,
        fighterId,
        "barbarian_rage",
      ),
    };
    const raging = requireResolved(
      resolveBattleSubject({ state, subject: rageSubject, fills: [] }),
    ).state;
    const ragingActor = raging.combatants.get(fighterId);
    if (!isCharacterBattleCreatureState(ragingActor)) {
      throw new Error("Expected the raging fixture to be a character.");
    }
    const strengthBasedStatBlockAttack = statBlockCatalog
      .requireStatBlock("stat_block_wolf")
      .statBlock.actions?.attacks?.find((attack) => attack.name === "Bite");
    if (
      strengthBasedStatBlockAttack === undefined ||
      !creatureNamedAttackRollIsSupported(strengthBasedStatBlockAttack)
    ) {
      throw new Error("Expected a supported Strength-based Stat Block attack.");
    }
    const statBlockAttackSubject = goblinAttackSubject(state, "Scimitar");
    if (statBlockAttackSubject.procedureRef === undefined) {
      throw new Error("Expected a Stat Block attack procedure reference.");
    }
    const statBlockProcedureRef = BattleStatBlockProcedureExecutionRef.make(
      statBlockAttackSubject.procedureRef,
    );
    const baseDamageEffect = strengthBasedStatBlockAttack.onHit.find(
      (effect) => effect.kind === "damage",
    );
    if (baseDamageEffect === undefined) {
      throw new Error("Expected the Strength-based attack to deal damage.");
    }
    const multiDamageStatBlockAttack: CreatureNamedAttackRoll = {
      ...strengthBasedStatBlockAttack,
      onHit: [
        baseDamageEffect,
        {
          kind: "damage",
          amount: {
            kind: "fixed",
            expr: { dice: 1, dieSize: 4, flat: 0 },
            static: 2,
          },
          damageType: "fire",
        },
      ],
    };
    const duplicateDamageTypeStatBlockAttack: CreatureNamedAttackRoll = {
      ...strengthBasedStatBlockAttack,
      onHit: [
        baseDamageEffect,
        {
          kind: "damage",
          amount: {
            kind: "fixed",
            expr: { dice: 1, dieSize: 4, flat: 0 },
            static: 2,
          },
          damageType: "piercing",
        },
      ],
    };
    if (!creatureNamedAttackRollIsSupported(multiDamageStatBlockAttack)) {
      throw new Error("Expected a supported multi-damage Stat Block attack.");
    }
    if (
      !creatureNamedAttackRollIsSupported(duplicateDamageTypeStatBlockAttack)
    ) {
      throw new Error(
        "Expected a supported duplicate-damage-type Stat Block attack.",
      );
    }
    expect(
      activeRageDamageBonusForFrenzy(ragingActor, {
        kind: "statBlockAttack",
        procedureRef: statBlockProcedureRef,
        attack: strengthBasedStatBlockAttack,
        damageNotation: "rolled",
      }),
    ).toMatchObject({ damageBonus: 2 });

    const attackSubject = fighterAttackSubject(state, "Unarmed Strike");
    const target = attackInitialTargetHole(raging, attackSubject);
    const roll = attackRollHoleAfterTarget(raging, target, attackSubject);
    const recklessAttackRollFill = attackRollFill(roll, {
      total: 15,
      naturalD20: 10,
      rollMode: "advantage",
      activatedOngoingFeatureProcedureRef:
        requireRecklessAttackProcedureRef(state),
    });
    if (recklessAttackRollFill.kind !== "attackRoll") {
      throw new Error("Expected an attack roll fill.");
    }
    const afterRecklessRoll = resolveBattleSubject({
      state: raging,
      subject: attackSubject,
      fills: [targetFill(target, goblinId), recklessAttackRollFill],
    });
    if (afterRecklessRoll.tag !== "needsHoles") {
      throw new Error("Expected Frenzy attack to reach damage roll.");
    }
    const damage = findHole(afterRecklessRoll.holes, "rolledDice");
    expect(damage).toMatchObject({
      attackDamageRiders: [
        {
          procedureRef: requireCharacterUnitProcedureRefForTest(
            battleRuntimeSessionForTest({ ...session, state: raging }),
            fighterId,
            frenzyUnit.id,
          ),
          optional: false,
          damage: { dice: 2, dieSize: 6, damageType: "bludgeoning" },
        },
      ],
    });
    const singleDamageStatBlockOption = {
      kind: "statBlockAttack",
      procedureRef: statBlockProcedureRef,
      attack: strengthBasedStatBlockAttack,
      damageNotation: "rolled",
    } as const;
    const mixedDamageStatBlockOption = {
      kind: "statBlockAttack",
      procedureRef: statBlockProcedureRef,
      attack: multiDamageStatBlockAttack,
      damageNotation: "rolled",
    } as const;
    const mixedDamageTarget = attackTargetHole(
      afterRecklessRoll.state,
      fighterId,
      mixedDamageStatBlockOption,
    );
    const mixedDamageSubject = {
      tag: "action",
      actorId: fighterId,
      action: "attack",
      procedureRef: statBlockProcedureRef,
    } as const;
    const stopBeforeAttackSpend = () => {
      throw new Error("Frenzy damage-type tests stop before attack spend.");
    };
    const mixedDamageAfterTarget = resolveSelectedAttackProcedure(
      {
        state: afterRecklessRoll.state,
        subject: mixedDamageSubject,
        fills: [targetFill(mixedDamageTarget, goblinId)],
      },
      mixedDamageStatBlockOption,
      stopBeforeAttackSpend,
    );
    if (mixedDamageAfterTarget.tag !== "needsHoles") {
      throw new Error("Expected the mixed Stat Block attack-roll hole.");
    }
    const mixedDamageAttackRoll = findHole(
      mixedDamageAfterTarget.holes,
      "attackRoll",
    );
    const mixedDamageRecklessAttackRollFill = attackRollFill(
      mixedDamageAttackRoll,
      {
        total: 15,
        naturalD20: 10,
        rollMode: "advantage",
      },
    );
    expect(
      frenzyDamageTypeDecision({
        state: afterRecklessRoll.state,
        attackerId: fighterId,
        attack: singleDamageStatBlockOption,
        hitWithAttackRoll: true,
        selectedDamageType: undefined,
      }),
    ).toMatchObject({ tag: "selected", damageType: "piercing" });
    expect(
      frenzyDamageTypeDecision({
        state: afterRecklessRoll.state,
        attackerId: fighterId,
        attack: {
          ...mixedDamageStatBlockOption,
          attack: duplicateDamageTypeStatBlockAttack,
        },
        hitWithAttackRoll: true,
        selectedDamageType: undefined,
      }),
    ).toMatchObject({ tag: "selected", damageType: "piercing" });
    expect(
      frenzyDamageTypeDecision({
        state: afterRecklessRoll.state,
        attackerId: fighterId,
        attack: mixedDamageStatBlockOption,
        hitWithAttackRoll: true,
        selectedDamageType: undefined,
      }),
    ).toMatchObject({
      tag: "decisionRequired",
      hole: {
        kind: "damageTypeChoice",
        choices: ["piercing", "fire"],
      },
    });
    const resolveMixedDamageAttack = (
      damageType?: "piercing" | "fire" | "cold",
    ) =>
      resolveSelectedAttackProcedure(
        {
          state: afterRecklessRoll.state,
          subject: mixedDamageSubject,
          fills: [
            targetFill(mixedDamageTarget, goblinId),
            mixedDamageRecklessAttackRollFill,
            ...(damageType === undefined
              ? []
              : [
                  {
                    kind: "damageTypeChoice" as const,
                    holeId: FRENZY_DAMAGE_TYPE_HOLE_ID,
                    value: damageType,
                  },
                ]),
          ],
        },
        mixedDamageStatBlockOption,
        stopBeforeAttackSpend,
      );
    const mixedDamageDecision = resolveMixedDamageAttack();
    if (mixedDamageDecision.tag === "invalid") {
      throw new Error(mixedDamageDecision.message);
    }
    expect(mixedDamageDecision).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "damageTypeChoice",
          choices: ["piercing", "fire"],
        },
      ],
    });
    expect(resolveMixedDamageAttack("cold")).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
    expect(
      attackFillsForAttackHitReplay([
        targetFill(mixedDamageTarget, goblinId),
        mixedDamageRecklessAttackRollFill,
        {
          kind: "damageTypeChoice",
          holeId: FRENZY_DAMAGE_TYPE_HOLE_ID,
          value: "fire",
        },
      ]),
    ).toContainEqual({
      kind: "damageTypeChoice",
      holeId: FRENZY_DAMAGE_TYPE_HOLE_ID,
      value: "fire",
    });
    expect(
      frenzyDamageTypeDecision({
        state: afterRecklessRoll.state,
        attackerId: fighterId,
        attack: mixedDamageStatBlockOption,
        hitWithAttackRoll: true,
        selectedDamageType: "cold",
      }),
    ).toMatchObject({ tag: "invalid" });
    for (const damageType of ["piercing", "fire"] as const) {
      const selection = frenzyDamageTypeDecision({
        state: afterRecklessRoll.state,
        attackerId: fighterId,
        attack: mixedDamageStatBlockOption,
        hitWithAttackRoll: true,
        selectedDamageType: damageType,
      });
      expect(selection).toMatchObject({ tag: "selected", damageType });
      if (selection.tag !== "selected") {
        throw new Error("Expected an admitted mixed-damage Frenzy selection.");
      }
      expect(
        eligibleAttackDamageRiders(
          afterRecklessRoll.state,
          fighterId,
          goblinId,
          mixedDamageStatBlockOption,
          recklessAttackRollFill.value,
          [],
          selection,
        ),
      ).toMatchObject([
        {
          optional: false,
          damage: { damageType },
        },
      ]);
      expect(resolveMixedDamageAttack(damageType)).toMatchObject({
        tag: "needsHoles",
        holes: [
          {
            kind: "rolledDice",
            attackDamageRiders: [
              {
                optional: false,
                damage: { damageType },
              },
            ],
          },
        ],
      });
    }
    const damageFill = damageRollFillWithGroups(damage, [[4, 4]]);
    const disposition = attackDamageDispositionHoleAfterFills(
      afterRecklessRoll.state,
      attackSubject,
      [
        targetFill(target, goblinId),
        attackRollFill(roll, {
          total: 15,
          naturalD20: 10,
          rollMode: "advantage",
          activatedOngoingFeatureProcedureRef:
            requireRecklessAttackProcedureRef(state),
        }),
        damageFill,
      ],
    );

    const hit = requireResolved(
      resolveBattleSubject({
        state: afterRecklessRoll.state,
        subject: attackSubject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, {
            total: 15,
            naturalD20: 10,
            rollMode: "advantage",
            activatedOngoingFeatureProcedureRef:
              requireRecklessAttackProcedureRef(state),
          }),
          damageFill,
          attackDamageDispositionFill(disposition, { kind: "ordinaryDamage" }),
        ],
      }),
    );
    expect(
      hit.state.currentTurnResources.attackDamageRidersUsedThisTurn,
    ).toEqual([
      {
        attackerId: fighterId,
        procedureRef: requireCharacterUnitProcedureRefForTest(
          battleRuntimeSessionForTest({ ...session, state: raging }),
          fighterId,
          frenzyUnit.id,
        ),
      },
    ]);
  });

  test("Frenzy does not apply when Reckless Attack was used before Rage was active", () => {
    const frenzyUnit = unitLibrary.requireUnit("barbarian_frenzy");
    const extraAttackUnit = unitLibrary.requireUnit("fighter_extra_attack");
    const session = startBattleSessionRight({
      battleId: battleId("battle-barbarian-frenzy-reckless-before-rage"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [
            { className: "barbarian", level: 3 },
            { className: "fighter", level: 5 },
          ],
          resources: [rageResource()],
          unitFeatures: [
            characterBattleFeatureInitForTest(frenzyUnit, [
              { className: "barbarian", level: classLevel(3) },
              { className: "fighter", level: classLevel(5) },
            ]),
            recklessAttackFeature(),
          ],
          characterUnitRefs: [
            supportedBattleUnitRef(frenzyUnit),
            supportedBattleUnitRef(extraAttackUnit),
          ],
          unarmedStrike: testUnarmedStrikeDieAttack(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;

    const attackSubject = fighterAttackSubject(state, "Unarmed Strike");
    const firstTarget = attackInitialTargetHole(state, attackSubject);
    const firstRoll = attackRollHoleAfterTarget(
      state,
      firstTarget,
      attackSubject,
    );
    const afterRecklessMiss = requireResolved(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(firstTarget, goblinId),
          attackRollFill(firstRoll, {
            total: 1,
            naturalD20: 1,
            rollMode: "advantage",
            activatedOngoingFeatureProcedureRef:
              requireRecklessAttackProcedureRef(state),
          }),
        ],
      }),
    ).state;
    expect(
      afterRecklessMiss.currentTurnResources
        .recklessAttackWhileRagingUsedThisTurn,
    ).toEqual([]);

    const rageSubject: BattleSubject = {
      tag: "unitFeature",
      actorId: fighterId,
      procedureRef: requireCharacterUnitProcedureRefForTest(
        session,
        fighterId,
        "barbarian_rage",
      ),
    };
    const ragingAfterRecklessMiss = requireResolved(
      resolveBattleSubject({
        state: afterRecklessMiss,
        subject: rageSubject,
        fills: [],
      }),
    ).state;

    const secondTarget = attackInitialTargetHole(
      ragingAfterRecklessMiss,
      attackSubject,
    );
    const secondRoll = attackRollHoleAfterTarget(
      ragingAfterRecklessMiss,
      secondTarget,
      attackSubject,
    );
    const afterSecondHit = resolveBattleSubject({
      state: ragingAfterRecklessMiss,
      subject: attackSubject,
      fills: [
        targetFill(secondTarget, goblinId),
        attackRollFill(secondRoll, {
          total: 15,
          naturalD20: 10,
          rollMode: "advantage",
        }),
      ],
    });
    if (afterSecondHit.tag !== "needsHoles") {
      throw new Error("Expected second Reckless hit to reach damage roll.");
    }
    const damage = findHole(afterSecondHit.holes, "rolledDice");
    expect(damage).not.toMatchObject({
      attackDamageRiders: [
        expect.objectContaining({
          procedureRef: requireCharacterUnitProcedureRefForTest(
            battleRuntimeSessionForTest({
              ...session,
              state: ragingAfterRecklessMiss,
            }),
            fighterId,
            frenzyUnit.id,
          ),
        }),
      ],
    });
  });

  test("Brutal Strike is admitted from Surface mechanics as a typed battle support profile", () => {
    const brutalStrikeUnit = unitLibrary.requireUnit("barbarian_brutal_strike");

    expect(supportedBattleUnitRef(brutalStrikeUnit).supportProfiles).toEqual([
      expect.objectContaining({
        kind: BRUTAL_STRIKE_SUPPORT_PROFILE,
        brutalStrike: expect.objectContaining({
          trigger: expect.objectContaining({
            kind: "recklessAttackStrengthAttackHit",
            advantageForgone: true,
          }),
          damage: { dice: 1, dieSize: 10, damageType: "sameAsAttack" },
        }),
      }),
    ]);
  });

  test(
    "Surface rejects malformed same-family Brutal Strike mechanics",
    () => {
      const unit = unitLibrary.requireUnit("barbarian_brutal_strike");
      if (
        unit.kind !== "class_feature" ||
        unit.mechanics.family !== "brutal_strike"
      ) {
        throw new Error("Expected Brutal Strike mechanics.");
      }
      const mechanics = unit.mechanics;

      expect(() =>
        decodeUnitRecordSync({
          ...unit,
          id: "synthetic_brutal_strike_wrong_push_distance",
          mechanics: {
            ...mechanics,
            options: [
              {
                ...mechanics.options[0],
                forcedMovement: {
                  ...mechanics.options[0].forcedMovement,
                  feet: 10,
                },
              },
              mechanics.options[1],
            ],
          },
        }),
      ).toThrow();
    },
    SURFACE_UNIT_RECORD_SCHEMA_NEGATIVE_TEST_TIMEOUT_MILLISECONDS,
  );

  test("Brutal Strike forgoes Reckless Advantage and adds same-type damage on a Strength hit", () => {
    const brutalStrikeUnit = unitLibrary.requireUnit("barbarian_brutal_strike");
    const session = startBattleSessionRight({
      battleId: battleId("battle-barbarian-brutal-strike-damage"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 9 }],
          unitFeatures: [recklessAttackFeature()],
          characterUnitRefs: [supportedBattleUnitRef(brutalStrikeUnit)],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;

    const attackSubject = fighterAttackSubject(state);
    const target = attackInitialTargetHole(state, attackSubject);
    const decision = requireHole(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [targetFill(target, goblinId)],
      }),
      "unitFeatureDecision",
    );
    expect(decision).toMatchObject({
      label: "Use Brutal Strike",
      choices: ["use", "decline"],
    });
    const roll = requireHole(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(target, goblinId),
          unitFeatureDecisionFill(decision, "use"),
        ],
      }),
      "attackRoll",
    );
    expect(roll).toMatchObject({
      ongoingFeatureActivations: [
        expect.objectContaining({
          procedureRef: requireRecklessAttackProcedureRef(state),
        }),
      ],
    });
    expect(roll).not.toHaveProperty("rollMode");

    const afterRoll = resolveBattleSubject({
      state,
      subject: attackSubject,
      fills: [
        targetFill(target, goblinId),
        unitFeatureDecisionFill(decision, "use"),
        attackRollFill(roll, {
          total: 15,
          naturalD20: 10,
          activatedOngoingFeatureProcedureRef:
            requireRecklessAttackProcedureRef(state),
        }),
      ],
    });
    if (afterRoll.tag !== "needsHoles") {
      throw new Error("Expected Brutal Strike hit to need an effect choice.");
    }
    const effectDecision = findHole(afterRoll.holes, "unitFeatureDecision");
    expect(effectDecision).toMatchObject({
      label: "Choose a Brutal Strike effect",
      choices: ["forceful_blow", "hamstring_blow", "decline"],
    });
    expect(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(target, goblinId),
          unitFeatureDecisionFill(decision, "use"),
          attackRollFill(roll, {
            total: 5,
            naturalD20: 3,
            activatedOngoingFeatureProcedureRef:
              requireRecklessAttackProcedureRef(state),
          }),
          unitFeatureDecisionFill(effectDecision, "decline"),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "A Brutal Strike effect can be chosen only after the selected attack roll hits.",
    });
    expect(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(target, goblinId),
          unitFeatureDecisionFill(decision, "use"),
          attackRollFill(roll, {
            total: 15,
            naturalD20: 10,
            activatedOngoingFeatureProcedureRef:
              requireRecklessAttackProcedureRef(state),
          }),
          unitFeatureDecisionFill(effectDecision, "use"),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: "Brutal Strike effect choice is not admitted at level 9.",
    });
    const afterEffect = resolveBattleSubject({
      state: afterRoll.state,
      subject: attackSubject,
      fills: [
        targetFill(target, goblinId),
        unitFeatureDecisionFill(decision, "use"),
        attackRollFill(roll, {
          total: 15,
          naturalD20: 10,
          activatedOngoingFeatureProcedureRef:
            requireRecklessAttackProcedureRef(state),
        }),
        unitFeatureDecisionFill(effectDecision, "decline"),
      ],
    });
    if (afterEffect.tag !== "needsHoles") {
      throw new Error(
        `Expected Brutal Strike hit to need damage; got ${afterEffect.tag}${afterEffect.tag === "invalid" ? `: ${afterEffect.message}` : ""}.`,
      );
    }
    const damage = findHole(afterEffect.holes, "rolledDice");
    expect(damage).toMatchObject({
      attackDamageRiders: [
        {
          procedureRef: requireCharacterUnitProcedureRefForTest(
            session,
            fighterId,
            brutalStrikeUnit.id,
          ),
          optional: false,
          damage: { dice: 1, dieSize: 10, damageType: "slashing" },
        },
      ],
    });
    const resolved = requireResolved(
      resolveBattleSubject({
        state: afterEffect.state,
        subject: attackSubject,
        fills: [
          targetFill(target, goblinId),
          unitFeatureDecisionFill(decision, "use"),
          attackRollFill(roll, {
            total: 15,
            naturalD20: 10,
            activatedOngoingFeatureProcedureRef:
              requireRecklessAttackProcedureRef(state),
          }),
          unitFeatureDecisionFill(effectDecision, "decline"),
          damageRollFillWithGroups(damage, [[1], [1]]),
        ],
      }),
    );
    expect(resolved.shovePushes ?? []).toEqual([]);
    expect(
      resolved.state.combatants
        .get(goblinId)
        ?.activeEffects.some(
          (effect) => effect.kind === "brutalStrikeHamstring",
        ),
    ).toBe(false);
    expect(resolved.state.currentTurnResources.brutalStrike).toEqual({
      kind: "spent",
    });
  });

  test("Brutal Strike adds bludgeoning damage to a Strength-based Unarmed Strike", () => {
    const brutalStrikeUnit = unitLibrary.requireUnit("barbarian_brutal_strike");
    const session = startBattleSessionRight({
      battleId: battleId("battle-barbarian-brutal-strike-unarmed-damage"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 9 }],
          unitFeatures: [recklessAttackFeature()],
          characterUnitRefs: [supportedBattleUnitRef(brutalStrikeUnit)],
          attack: null,
          unarmedStrike: testUnarmedStrikeDamageAttack(),
          selectedLoadout: {},
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const subject = fighterAttackSubject(state, "Unarmed Strike");
    const target = attackInitialTargetHole(state, subject);
    const decision = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, goblinId)],
      }),
      "unitFeatureDecision",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, goblinId),
          unitFeatureDecisionFill(decision, "use"),
        ],
      }),
      "attackRoll",
    );

    const afterRoll = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, goblinId),
        unitFeatureDecisionFill(decision, "use"),
        attackRollFill(roll, {
          total: 15,
          naturalD20: 10,
          activatedOngoingFeatureProcedureRef:
            requireRecklessAttackProcedureRef(state),
        }),
      ],
    });
    if (afterRoll.tag !== "needsHoles") {
      throw new Error("Expected Unarmed Brutal Strike hit to need an effect.");
    }
    const effectDecision = findHole(afterRoll.holes, "unitFeatureDecision");
    const afterEffect = resolveBattleSubject({
      state: afterRoll.state,
      subject,
      fills: [
        targetFill(target, goblinId),
        unitFeatureDecisionFill(decision, "use"),
        attackRollFill(roll, {
          total: 15,
          naturalD20: 10,
          activatedOngoingFeatureProcedureRef:
            requireRecklessAttackProcedureRef(state),
        }),
        unitFeatureDecisionFill(effectDecision, "decline"),
      ],
    });
    if (afterEffect.tag !== "needsHoles") {
      throw new Error("Expected Unarmed Brutal Strike hit to need damage.");
    }

    expect(findHole(afterEffect.holes, "rolledDice")).toMatchObject({
      attackDamageRiders: [
        {
          procedureRef: requireCharacterUnitProcedureRefForTest(
            session,
            fighterId,
            brutalStrikeUnit.id,
          ),
          optional: false,
          damage: { dice: 1, dieSize: 10, damageType: "bludgeoning" },
        },
      ],
    });
  });

  test("Brutal Strike can forgo Reckless Advantage after Reckless Attack is already active", () => {
    const brutalStrikeUnit = unitLibrary.requireUnit("barbarian_brutal_strike");
    const extraAttackUnit = unitLibrary.requireUnit("barbarian_extra_attack");
    const session = startBattleSessionRight({
      battleId: battleId("battle-barbarian-brutal-strike-active-reckless"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 9 }],
          unitFeatures: [recklessAttackFeature()],
          characterUnitRefs: [
            supportedBattleUnitRef(brutalStrikeUnit),
            supportedBattleUnitRef(extraAttackUnit),
          ],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;

    const attackSubject = fighterAttackSubject(state);
    const firstTarget = attackInitialTargetHole(state, attackSubject);
    const firstDecision = requireHole(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [targetFill(firstTarget, goblinId)],
      }),
      "unitFeatureDecision",
    );
    const firstRoll = requireHole(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(firstTarget, goblinId),
          unitFeatureDecisionFill(firstDecision, "decline"),
        ],
      }),
      "attackRoll",
    );
    const afterRecklessMiss = requireResolved(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(firstTarget, goblinId),
          unitFeatureDecisionFill(firstDecision, "decline"),
          attackRollFill(firstRoll, {
            total: 1,
            naturalD20: 1,
            rollMode: "advantage",
            activatedOngoingFeatureProcedureRef:
              requireRecklessAttackProcedureRef(state),
          }),
        ],
      }),
    ).state;

    const secondTarget = attackInitialTargetHole(
      afterRecklessMiss,
      attackSubject,
    );
    const secondDecision = requireHole(
      resolveBattleSubject({
        state: afterRecklessMiss,
        subject: attackSubject,
        fills: [targetFill(secondTarget, goblinId)],
      }),
      "unitFeatureDecision",
    );
    const secondRoll = requireHole(
      resolveBattleSubject({
        state: afterRecklessMiss,
        subject: attackSubject,
        fills: [
          targetFill(secondTarget, goblinId),
          unitFeatureDecisionFill(secondDecision, "use"),
        ],
      }),
      "attackRoll",
    );
    expect(secondRoll).not.toHaveProperty("rollMode");
    expect(secondRoll).not.toHaveProperty("ongoingFeatureActivations");

    const afterSecondRoll = resolveBattleSubject({
      state: afterRecklessMiss,
      subject: attackSubject,
      fills: [
        targetFill(secondTarget, goblinId),
        unitFeatureDecisionFill(secondDecision, "use"),
        attackRollFill(secondRoll, { total: 15, naturalD20: 10 }),
      ],
    });
    if (afterSecondRoll.tag !== "needsHoles") {
      throw new Error(
        "Expected active-Reckless Brutal Strike hit to need an effect choice.",
      );
    }
    const effectDecision = findHole(
      afterSecondRoll.holes,
      "unitFeatureDecision",
    );
    const afterEffect = resolveBattleSubject({
      state: afterSecondRoll.state,
      subject: attackSubject,
      fills: [
        targetFill(secondTarget, goblinId),
        unitFeatureDecisionFill(secondDecision, "use"),
        attackRollFill(secondRoll, { total: 15, naturalD20: 10 }),
        unitFeatureDecisionFill(effectDecision, "hamstring_blow"),
      ],
    });
    if (afterEffect.tag !== "needsHoles") {
      throw new Error("Expected Hamstring Blow to need damage.");
    }
    const damage = findHole(afterEffect.holes, "rolledDice");
    expect(damage).toMatchObject({
      attackDamageRiders: [
        {
          procedureRef: requireCharacterUnitProcedureRefForTest(
            battleRuntimeSessionForTest({
              ...session,
              state: afterRecklessMiss,
            }),
            fighterId,
            brutalStrikeUnit.id,
          ),
          optional: false,
          damage: { dice: 1, dieSize: 10, damageType: "slashing" },
        },
      ],
    });
  });

  test("Brutal Strike chosen on a miss remains spent until the next turn", () => {
    const brutalStrikeUnit = unitLibrary.requireUnit("barbarian_brutal_strike");
    const extraAttackUnit = unitLibrary.requireUnit("barbarian_extra_attack");
    const state = startBattleRight({
      battleId: battleId("battle-barbarian-brutal-strike-miss-quota"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 9 }],
          unitFeatures: [recklessAttackFeature()],
          characterUnitRefs: [
            supportedBattleUnitRef(brutalStrikeUnit),
            supportedBattleUnitRef(extraAttackUnit),
          ],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const attackSubject = fighterAttackSubject(state);
    const firstTarget = attackInitialTargetHole(state, attackSubject);
    const firstDecision = requireHole(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [targetFill(firstTarget, goblinId)],
      }),
      "unitFeatureDecision",
    );
    const firstRoll = requireHole(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(firstTarget, goblinId),
          unitFeatureDecisionFill(firstDecision, "use"),
        ],
      }),
      "attackRoll",
    );
    const afterMiss = requireResolved(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(firstTarget, goblinId),
          unitFeatureDecisionFill(firstDecision, "use"),
          attackRollFill(firstRoll, {
            total: 1,
            naturalD20: 1,
            activatedOngoingFeatureProcedureRef:
              requireRecklessAttackProcedureRef(state),
          }),
        ],
      }),
    ).state;
    expect(afterMiss.currentTurnResources.brutalStrike).toEqual({
      kind: "spent",
    });

    const secondTarget = attackInitialTargetHole(afterMiss, attackSubject);
    const secondDiscovery = resolveBattleSubject({
      state: afterMiss,
      subject: attackSubject,
      fills: [targetFill(secondTarget, goblinId)],
    });
    if (secondDiscovery.tag !== "needsHoles") {
      throw new Error("Expected the second attack to need its attack roll.");
    }
    expect(
      secondDiscovery.holes.some(
        (hole) =>
          hole.kind === "unitFeatureDecision" &&
          hole.label === "Use Brutal Strike",
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state: afterMiss,
        subject: attackSubject,
        fills: [
          targetFill(secondTarget, goblinId),
          unitFeatureDecisionFill(firstDecision, "use"),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
    expect(
      resetBattleTurnResources(afterMiss.currentTurnResources).brutalStrike,
    ).toEqual({ kind: "available" });
  });

  test("Brutal Strike Forceful Blow pushes, moves, and replays combined Punch and Grab once", () => {
    const brutalStrikeUnit = unitLibrary.requireUnit("barbarian_brutal_strike");
    const baseState = startBattleRight({
      battleId: battleId("battle-barbarian-brutal-strike-forceful-blow"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 9 }],
          unitFeatures: [recklessAttackFeature()],
          characterUnitRefs: [
            supportedBattleUnitRef(brutalStrikeUnit),
            ...grapplerUnitRefs(),
          ],
        }),
        characterSeed({ combatantId: wizardId, initiative: 15 }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const actor = baseState.combatants.get(fighterId);
    if (actor === undefined) {
      throw new Error("Expected the Forceful Blow actor.");
    }
    const state = {
      ...baseState,
      combatants: new Map(baseState.combatants).set(fighterId, {
        ...actor,
        activeEffects: [
          ...actor.activeEffects,
          {
            kind: "specialSpeedGrant",
            sourceProcedureRef: battleProcedureExecutionRefForTest(
              "synthetic-forceful-blow-fly-speed",
            ),
            sourceCombatantId: fighterId,
            speedKind: "fly",
            speed: { kind: "fixed", speedFeet: movementFeet(40) },
            hover: true,
            expiresAt: { kind: "untilDispelled" },
          } as const,
        ],
      }),
    } satisfies BattleState;
    const attackSubject = fighterAttackSubject(state, "Unarmed Strike");
    const target = attackInitialTargetHole(state, attackSubject);
    const decision = requireHole(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [targetFill(target, goblinId)],
      }),
      "unitFeatureDecision",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(target, goblinId),
          unitFeatureDecisionFill(decision, "use"),
        ],
      }),
      "attackRoll",
    );
    const afterRoll = resolveBattleSubject({
      state,
      subject: attackSubject,
      fills: [
        targetFill(target, goblinId),
        unitFeatureDecisionFill(decision, "use"),
        attackRollFill(roll, {
          total: 15,
          naturalD20: 10,
          activatedOngoingFeatureProcedureRef:
            requireRecklessAttackProcedureRef(state),
        }),
      ],
    });
    if (afterRoll.tag !== "needsHoles") {
      throw new Error("Expected Brutal Strike hit to need an effect choice.");
    }
    expect(afterRoll.state.currentTurnResources.brutalStrike).toEqual({
      kind: "pending",
      subject: attackSubject,
      targetId: goblinId,
    });
    const effectDecision = findHole(afterRoll.holes, "unitFeatureDecision");
    const afterEffect = resolveBattleSubject({
      state: afterRoll.state,
      subject: attackSubject,
      fills: [
        targetFill(target, goblinId),
        unitFeatureDecisionFill(decision, "use"),
        attackRollFill(roll, {
          total: 15,
          naturalD20: 10,
          activatedOngoingFeatureProcedureRef:
            requireRecklessAttackProcedureRef(state),
        }),
        unitFeatureDecisionFill(effectDecision, "forceful_blow"),
      ],
    });
    if (afterEffect.tag !== "needsHoles") {
      throw new Error("Expected Forceful Blow hit to need damage.");
    }
    const damage = findHole(afterEffect.holes, "rolledDice");
    const attackFills = [
      targetFill(target, goblinId),
      unitFeatureDecisionFill(decision, "use"),
      attackRollFill(roll, {
        total: 15,
        naturalD20: 10,
        activatedOngoingFeatureProcedureRef:
          requireRecklessAttackProcedureRef(state),
      }),
      unitFeatureDecisionFill(effectDecision, "forceful_blow"),
      damageRollFillWithGroups(damage, [[1]]),
    ] as const;
    const afterDamage = resolveBattleSubject({
      state: afterEffect.state,
      subject: attackSubject,
      fills: attackFills,
    });
    if (afterDamage.tag !== "needsHoles") {
      throw new Error(
        `Expected the combined hit to need Punch and Grab; got ${afterDamage.tag}${afterDamage.tag === "invalid" ? `: ${afterDamage.message}` : ""}.`,
      );
    }
    const punchAndGrabDecision = findHole(
      afterDamage.holes,
      "unitFeatureDecision",
    );
    expect(punchAndGrabDecision.label).toBe("Use Punch and Grab");
    const fillsThroughPunchAndGrabDecision = [
      ...attackFills,
      unitFeatureDecisionFill(punchAndGrabDecision, "use"),
    ] as const;
    const afterPunchAndGrabDecision = resolveBattleSubject({
      state: afterDamage.state,
      subject: attackSubject,
      fills: fillsThroughPunchAndGrabDecision,
    });
    if (afterPunchAndGrabDecision.tag !== "needsHoles") {
      throw new Error("Expected Punch and Grab to need its grapple outcome.");
    }
    const punchAndGrabOutcome = findHole(
      afterPunchAndGrabDecision.holes,
      "grappleOutcome",
    );
    const fillsThroughPunchAndGrab = [
      ...fillsThroughPunchAndGrabDecision,
      grappleOutcomeFill(punchAndGrabOutcome, false),
    ] as const;
    const afterPunchAndGrab = resolveBattleSubject({
      state: afterPunchAndGrabDecision.state,
      subject: attackSubject,
      fills: fillsThroughPunchAndGrab,
    });
    if (afterPunchAndGrab.tag !== "needsHoles") {
      throw new Error(
        "Expected Forceful Blow to offer its optional follow-up movement.",
      );
    }
    const movementDecision = findHole(
      afterPunchAndGrab.holes,
      "unitFeatureDecision",
    );
    expect(movementDecision.choices).toEqual(["use", "decline"]);

    const zeroSpeedState = {
      ...afterPunchAndGrab.state,
      grapples: [
        ...afterPunchAndGrab.state.grapples,
        {
          grapplerId: wizardId,
          targetId: fighterId,
          escapeDc: difficultyClass(10),
          reachFeet: movementFeet(5),
          hand: "left" as const,
        },
      ],
    } satisfies BattleState;
    const zeroSpeedResolution = requireResolved(
      resolveBattleSubject({
        state: zeroSpeedState,
        subject: attackSubject,
        fills: fillsThroughPunchAndGrab,
      }),
    );
    expect(zeroSpeedResolution.shovePushes).toEqual([
      expect.objectContaining({ targetId: goblinId }),
    ]);
    expect(
      zeroSpeedResolution.state.combatants.get(fighterId)?.movementSpentFeet,
    ).toBe(movementFeet(0));

    const declined = requireResolved(
      resolveBattleSubject({
        state: afterPunchAndGrab.state,
        subject: attackSubject,
        fills: [
          ...fillsThroughPunchAndGrab,
          unitFeatureDecisionFill(movementDecision, "decline"),
        ],
      }),
    );
    expect(declined.state.combatants.get(fighterId)?.movementSpentFeet).toBe(
      movementFeet(0),
    );

    const afterMovementAccepted = resolveBattleSubject({
      state: afterPunchAndGrab.state,
      subject: attackSubject,
      fills: [
        ...fillsThroughPunchAndGrab,
        unitFeatureDecisionFill(movementDecision, "use"),
      ],
    });
    if (afterMovementAccepted.tag !== "needsHoles") {
      throw new Error(
        "Expected accepted Forceful Blow movement to need a path.",
      );
    }
    const movement = findHole(afterMovementAccepted.holes, "movement");
    expect(movement).toMatchObject({
      actorId: fighterId,
      movementBudgetFeet: movementFeet(20),
      speedKinds: [
        { kind: "walk", movementBudgetFeet: movementFeet(15) },
        { kind: "fly", movementBudgetFeet: movementFeet(20) },
      ],
      brutalStrikeForcefulBlow: {
        kind: "brutalStrikeForcefulBlowStraightTowardTarget",
        targetId: goblinId,
      },
    });
    if (movement.brutalStrikeForcefulBlow === undefined) {
      throw new Error("Expected the Forceful Blow movement contract.");
    }
    const forcefulTargetId = movement.brutalStrikeForcefulBlow.targetId;
    const forcefulMovementFill = (
      movementCostFeet: number,
      additionalSpeedSegments: readonly {
        readonly speedKind: "walk" | "fly";
        readonly movementCostFeet: ReturnType<typeof movementFeet>;
        readonly provokedOpportunityAttacks: readonly [];
      }[] = [],
    ) => {
      const fill = movementFill(movement, {
        movementCostFeet,
        provokedOpportunityAttacks: [],
      });
      const {
        jumpMovementReplacement: _jumpMovementReplacement,
        levitatedMovement: _levitatedMovement,
        commandApproach: _commandApproach,
        commandFlee: _commandFlee,
        brutalStrikeForcefulBlow: _brutalStrikeForcefulBlow,
        ...movementValue
      } = fill.value;
      return {
        ...fill,
        value: {
          ...movementValue,
          additionalSpeedSegments,
          brutalStrikeForcefulBlow: {
            kind: "brutalStrikeForcefulBlowStraightTowardTarget" as const,
            targetId: forcefulTargetId,
          },
        },
      };
    };
    const resolved = requireResolved(
      resolveBattleSubject({
        state: afterMovementAccepted.state,
        subject: attackSubject,
        fills: [
          ...fillsThroughPunchAndGrab,
          unitFeatureDecisionFill(movementDecision, "use"),
          forcefulMovementFill(10),
        ],
      }),
    );
    expect(
      resolveBattleSubject({
        state: afterMovementAccepted.state,
        subject: attackSubject,
        fills: [
          ...fillsThroughPunchAndGrab,
          unitFeatureDecisionFill(movementDecision, "use"),
          forcefulMovementFill(15),
        ],
      }).tag,
    ).toBe("resolved");
    expect(
      resolveBattleSubject({
        state: afterMovementAccepted.state,
        subject: attackSubject,
        fills: [
          ...fillsThroughPunchAndGrab,
          unitFeatureDecisionFill(movementDecision, "use"),
          forcefulMovementFill(16),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
    const switchedSpeed = requireResolved(
      resolveBattleSubject({
        state: afterMovementAccepted.state,
        subject: attackSubject,
        fills: [
          ...fillsThroughPunchAndGrab,
          unitFeatureDecisionFill(movementDecision, "use"),
          forcefulMovementFill(10, [
            {
              speedKind: "fly",
              movementCostFeet: movementFeet(10),
              provokedOpportunityAttacks: [],
            },
          ]),
        ],
      }),
    );

    expect(resolved.shovePushes).toEqual([
      {
        targetId: goblinId,
        disposition: expect.objectContaining({
          kind: "pushed",
          distanceFeet: movementFeet(15),
          provokesOpportunityAttacks: false,
        }),
      },
    ]);
    expect(resolved.state.combatants.get(fighterId)?.movementSpentFeet).toBe(
      movementFeet(0),
    );
    expect(resolved.state.combatants.get(goblinId)?.hp).toBe(
      declined.state.combatants.get(goblinId)?.hp,
    );
    expect(resolved.state.grapples).toEqual([
      expect.objectContaining({
        grapplerId: fighterId,
        targetId: goblinId,
      }),
    ]);
    expect(switchedSpeed.state.combatants.get(goblinId)?.hp).toBe(
      resolved.state.combatants.get(goblinId)?.hp,
    );
  });

  test("Brutal Strike Hamstring Blow reduces Speed until the Barbarian's next turn", () => {
    const brutalStrikeUnit = unitLibrary.requireUnit("barbarian_brutal_strike");
    const session = startBattleSessionRight({
      battleId: battleId("battle-barbarian-brutal-strike-hamstring-blow"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 9 }],
          unitFeatures: [recklessAttackFeature()],
          characterUnitRefs: [supportedBattleUnitRef(brutalStrikeUnit)],
        }),
        characterSeed({
          combatantId: wizardId,
          initiative: 15,
          classLevels: [{ className: "barbarian", level: 9 }],
          unitFeatures: [recklessAttackFeature()],
          characterUnitRefs: [supportedBattleUnitRef(brutalStrikeUnit)],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const targetCombatant = session.state.combatants.get(goblinId);
    if (targetCombatant === undefined) {
      throw new Error("Expected the Hamstring target.");
    }
    const priorHamstring = {
      kind: "brutalStrikeHamstring" as const,
      sourceProcedureRef: requireCharacterUnitProcedureRefForTest(
        session,
        wizardId,
        brutalStrikeUnit.id,
      ),
      sourceCombatantId: wizardId,
      effect: {
        kind: "hamstringBlow" as const,
        deltaFeet: movementDeltaFeet(-15),
        stacking: "mostRecentOnly" as const,
        expires: "startOfYourNextTurn" as const,
      },
      expiresAt: { kind: "startOfSourceTurn" as const },
    };
    const state = {
      ...session.state,
      combatants: new Map(session.state.combatants).set(goblinId, {
        ...targetCombatant,
        activeEffects: [...targetCombatant.activeEffects, priorHamstring],
      }),
    };
    const attackSubject = fighterAttackSubject(state);
    const target = attackInitialTargetHole(state, attackSubject);
    const decision = requireHole(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [targetFill(target, goblinId)],
      }),
      "unitFeatureDecision",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(target, goblinId),
          unitFeatureDecisionFill(decision, "use"),
        ],
      }),
      "attackRoll",
    );
    const afterRoll = resolveBattleSubject({
      state,
      subject: attackSubject,
      fills: [
        targetFill(target, goblinId),
        unitFeatureDecisionFill(decision, "use"),
        attackRollFill(roll, {
          total: 15,
          naturalD20: 10,
          activatedOngoingFeatureProcedureRef:
            requireRecklessAttackProcedureRef(state),
        }),
      ],
    });
    if (afterRoll.tag !== "needsHoles") {
      throw new Error("Expected Brutal Strike hit to need an effect choice.");
    }
    const effectDecision = findHole(afterRoll.holes, "unitFeatureDecision");
    const afterEffect = resolveBattleSubject({
      state: afterRoll.state,
      subject: attackSubject,
      fills: [
        targetFill(target, goblinId),
        unitFeatureDecisionFill(decision, "use"),
        attackRollFill(roll, {
          total: 15,
          naturalD20: 10,
          activatedOngoingFeatureProcedureRef:
            requireRecklessAttackProcedureRef(state),
        }),
        unitFeatureDecisionFill(effectDecision, "hamstring_blow"),
      ],
    });
    if (afterEffect.tag !== "needsHoles") {
      throw new Error("Expected Hamstring Blow hit to need damage.");
    }
    const damage = findHole(afterEffect.holes, "rolledDice");
    const resolved = requireResolved(
      resolveBattleSubject({
        state: afterEffect.state,
        subject: attackSubject,
        fills: [
          targetFill(target, goblinId),
          unitFeatureDecisionFill(decision, "use"),
          attackRollFill(roll, {
            total: 15,
            naturalD20: 10,
            activatedOngoingFeatureProcedureRef:
              requireRecklessAttackProcedureRef(state),
          }),
          unitFeatureDecisionFill(effectDecision, "hamstring_blow"),
          damageRollFillWithGroups(damage, [[1], [1]]),
        ],
      }),
    );

    const hamstrings =
      resolved.state.combatants
        .get(goblinId)
        ?.activeEffects.filter(
          (effect) => effect.kind === "brutalStrikeHamstring",
        ) ?? [];
    expect(hamstrings).toEqual([
      {
        kind: "brutalStrikeHamstring",
        sourceProcedureRef: requireCharacterUnitProcedureRefForTest(
          session,
          fighterId,
          "barbarian_brutal_strike",
        ),
        sourceCombatantId: fighterId,
        effect: {
          kind: "hamstringBlow",
          deltaFeet: movementDeltaFeet(-15),
          stacking: "mostRecentOnly",
          expires: "startOfYourNextTurn",
        },
        expiresAt: { kind: "startOfSourceTurn" },
      },
    ]);
    const hamstrungTarget = resolved.state.combatants.get(goblinId);
    if (hamstrungTarget === undefined) {
      throw new Error("Expected the resolved Hamstring target.");
    }
    expect(effectiveWalkSpeed(resolved.state, hamstrungTarget)).toBe(
      movementFeet(15),
    );

    const wizardTurn = requireResolved(
      endTurn({ state: resolved.state, actorId: fighterId }),
    );
    const goblinTurn = requireResolved(
      endTurn({ state: wizardTurn.state, actorId: wizardId }),
    );
    const fighterTurn = requireResolved(
      endTurn({ state: goblinTurn.state, actorId: goblinId }),
    );
    expect(
      fighterTurn.state.combatants
        .get(goblinId)
        ?.activeEffects.some(
          (effect) => effect.kind === "brutalStrikeHamstring",
        ),
    ).toBe(false);
  });

  test("Reckless Attack cannot be declared before the first attack roll", () => {
    const state = startBattleRight({
      battleId: battleId("battle-reckless-not-predeclared"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 2 }],
          unitFeatures: [recklessAttackFeature()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(
      resolveBattleSubject({
        state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          procedureRef: requireRecklessAttackProcedureRef(state),
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("Reckless Attack activation preserves straight rolls when modifiers already cancel", () => {
    const state = startBattleRight({
      battleId: battleId("battle-reckless-cancelled-modifiers"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 2 }],
          unitFeatures: [recklessAttackFeature()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const fighter = state.combatants.get(fighterId);
    const goblin = state.combatants.get(goblinId);
    if (fighter === undefined || goblin === undefined) {
      throw new Error("Expected combatants.");
    }
    const contestedState: BattleState = {
      ...state,
      combatants: new Map(state.combatants)
        .set(fighterId, {
          ...fighter,
          hidden: { discoveryDc: difficultyClass(16) },
        })
        .set(goblinId, {
          ...goblin,
          hidden: { discoveryDc: difficultyClass(16) },
        }),
    };
    const attackSubject = fighterAttackSubject(state);
    const target = attackInitialTargetHole(contestedState, attackSubject);
    const roll = attackRollHoleAfterTarget(
      contestedState,
      target,
      attackSubject,
    );
    if (roll.kind !== "attackRoll") {
      throw new Error("Expected attack-roll hole.");
    }
    expect(roll.rollMode).toBe("normal");
    const reckless = resolveBattleSubject({
      state: contestedState,
      subject: attackSubject,
      fills: [
        targetFill(target, goblinId),
        attackRollFill(roll, {
          total: 15,
          naturalD20: 10,
          activatedOngoingFeatureProcedureRef:
            requireRecklessAttackProcedureRef(state),
        }),
      ],
    });
    if (reckless.tag !== "needsHoles") {
      throw new Error("Expected Reckless attack to reach damage roll.");
    }
    const damage = findHole(reckless.holes, "rolledDice");
    expect(
      resolveBattleSubject({
        state: reckless.state,
        subject: attackSubject,
        fills: [
          attackTargetFill(
            target,
            attackSubject.actorId,
            goblinId,
            attackExecutionSelectionForSubjectForTest(attackSubject),
          ),
          attackRollFill(roll, {
            total: 15,
            naturalD20: 10,
            activatedOngoingFeatureProcedureRef:
              requireRecklessAttackProcedureRef(state),
          }),
          damageRollFill(damage, 4),
        ],
      }),
    ).toMatchObject({ tag: "resolved" });
  });

  test("Brutal Strike does not interpret a player-authored Ready trigger", () => {
    const brutalStrikeUnit = unitLibrary.requireUnit("barbarian_brutal_strike");
    const baseState = startBattleRight({
      battleId: battleId("battle-reckless-reaction-replay"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 9 }],
          unitFeatures: [recklessAttackFeature()],
          characterUnitRefs: [supportedBattleUnitRef(brutalStrikeUnit)],
        }),
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 10,
          attack: null,
        }),
        statBlockCreatureInit({ initiative: 5 }),
      ],
    });
    const state = {
      ...baseState,
      readiedResponses: new Map([
        [
          wizardId,
          {
            trigger: readyTriggerDescriptionForTest("the attack hits"),
            response: { kind: "movement" as const },
            expiresAt: { kind: "startOfTurn" as const, combatantId: wizardId },
          },
        ],
      ]),
    } satisfies BattleState;
    const attackSubject = fighterAttackSubject(state);
    const target = attackInitialTargetHole(state, attackSubject);
    const brutalStrikeDecision = requireHole(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [targetFill(target, goblinId)],
      }),
      "unitFeatureDecision",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(target, goblinId),
          unitFeatureDecisionFill(brutalStrikeDecision, "use"),
        ],
      }),
      "attackRoll",
    );
    const awaitingBrutalStrike = resolveBattleSubject({
      state,
      subject: attackSubject,
      fills: [
        targetFill(target, goblinId),
        unitFeatureDecisionFill(brutalStrikeDecision, "use"),
        attackRollFill(roll, {
          total: 15,
          naturalD20: 10,
          activatedOngoingFeatureProcedureRef:
            requireRecklessAttackProcedureRef(state),
        }),
      ],
    });
    if (awaitingBrutalStrike.tag !== "needsHoles") {
      throw new Error("Expected the Brutal Strike effect decision.");
    }
    expect(
      awaitingBrutalStrike.holes.some(
        (hole) => hole.kind === "interruptDecision",
      ),
    ).toBe(false);
    expect(
      findHole(awaitingBrutalStrike.holes, "unitFeatureDecision"),
    ).toMatchObject({
      label: "Choose a Brutal Strike effect",
      choices: ["forceful_blow", "hamstring_blow", "decline"],
    });
    expect(awaitingBrutalStrike.state.readiedResponses.get(wizardId)).toEqual(
      state.readiedResponses.get(wizardId),
    );
  });
});
