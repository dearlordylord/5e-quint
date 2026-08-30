import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  battleActSpellPresentation,
  battleActUnitPresentation,
} from "./battle-act-composition.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19D-06-PALADIN-ABJURE-FOES paladin_abjure_foes
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.magic-action-save-gated-condition
import { describe, expect, test } from "vitest";

import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";
import { damageAmount, movementFeet, type ClassLevel } from "@dnd/shared/types";
import * as Either from "effect/Either";
import type { CharacterBattleClassLevelInits } from "./character-class-level.ts";

import { applyBattleHitPointDamage } from "./battle-reducer/damage-apply.ts";
import {
  characterBattleResourceIsUnlimited,
  characterBattleResourceIsUseCount,
  requireCharacterUnitProcedureRefForTest,
  characterBattleFeatureInitForTest,
  characterSeed,
  rageResource,
  resourceCount,
  savingThrowOutcomeFill,
  supportedBattleUnitRef,
  testCharacterD20Statistics,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import type {
  BattleFill,
  BattleHole,
  BattleResolutionResult,
  BattleRuntimeSession,
  BattleState,
  BattleTargetSpatialFact,
  BattleProcedureExecutionRef,
  CombatantId,
} from "./index.ts";
import {
  paladinChannelDivinityUnitId,
  spellCasterId,
  spellTargetId,
  unitLibrary,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  characterCreature,
  requireHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  battleId,
  battleUnitRefWithSupportProfiles,
  classLevel,
  combatantId,
  discoverBattleActCandidates,
  discoverBattleActs,
  endTurn,
  resolveBattleSubject,
  startBattle,
} from "./unit-profile-admission.test-support.ts";
import {
  battleMagicActionSaveGatedConditionSupportForUnit,
  magicActionSaveGatedConditionProfileForUnit,
} from "./unit-feature-support.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";

const paladinAbjureFoesUnitId = "paladin_abjure_foes";
const abjureFoesUnit = unitLibrary.requireUnit(paladinAbjureFoesUnitId);
const channelDivinityUnit = unitLibrary.requireUnit(
  paladinChannelDivinityUnitId,
);
const secondTargetId = combatantId("abjure-foes-second-target");

describe("Paladin Abjure Foes Magic Action save-gated condition", () => {
  test("applies the caster's move/action/bonus-action restriction when the caster fails", () => {
    const session = abjureFoesBattle();
    const act = abjureFoesAct(session);
    const save = requireHole(act.initialHoles, "savingThrowOutcome");
    const procedureRef = requireCharacterUnitProcedureRefForTest(
      session,
      spellCasterId,
      paladinAbjureFoesUnitId,
    );
    const resolved = recordResolvedState(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [
          abjureFoesSavingThrowFill(procedureRef, save, [
            { targetId: spellCasterId, succeeded: false },
          ]),
        ],
      }),
    );
    expect(
      resolved.currentTurnResources.movementActionBonusActionExclusion,
    ).toEqual({ kind: "restricted", choice: "action" });
  });

  test("replaces an existing condition effect from the same procedure", () => {
    const session = abjureFoesBattle();
    const act = abjureFoesAct(session);
    const save = requireHole(act.initialHoles, "savingThrowOutcome");
    const procedureRef = requireCharacterUnitProcedureRefForTest(
      session,
      spellCasterId,
      paladinAbjureFoesUnitId,
    );
    const first = recordResolvedState(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [
          abjureFoesSavingThrowFill(procedureRef, save, [
            { targetId: spellTargetId, succeeded: false },
          ]),
        ],
      }),
    );
    const targetTurn = recordResolvedState(
      endTurn({ state: first, actorId: spellCasterId }),
    );
    const secondTargetTurn = recordResolvedState(
      endTurn({ state: targetTurn, actorId: spellTargetId }),
    );
    const replayState = recordResolvedState(
      endTurn({ state: secondTargetTurn, actorId: secondTargetId }),
    );
    const replayAct = abjureFoesAct(
      battleRuntimeSessionForTest({ ...session, state: replayState }),
    );
    const replaySave = requireHole(
      replayAct.initialHoles,
      "savingThrowOutcome",
    );
    const replayed = recordResolvedState(
      resolveBattleSubject({
        state: replayState,
        subject: replayAct.subject,
        fills: [
          abjureFoesSavingThrowFill(procedureRef, replaySave, [
            { targetId: spellTargetId, succeeded: false },
          ]),
        ],
      }),
    );
    expect(
      requireCombatant(replayed, spellTargetId).activeEffects.filter(
        (effect) =>
          effect.kind === "unitFeatureCondition" &&
          effect.sourceProcedureRef === procedureRef,
      ),
    ).toHaveLength(1);
  });

  test("requests and consumes an enemy relationship fact while Rage is active", () => {
    const session = abjureFoesBattle({ includeRage: true });
    const raging = recordResolvedState(
      resolveBattleSubject({
        state: session.state,
        subject: {
          tag: "unitFeature",
          actorId: spellCasterId,
          procedureRef: requireCharacterUnitProcedureRefForTest(
            session,
            spellCasterId,
            "barbarian_rage",
          ),
        },
        fills: [],
      }),
    );
    const ragingSession = battleRuntimeSessionForTest({
      ...session,
      state: raging,
    });
    const act = abjureFoesAct(ragingSession);
    const save = requireHole(act.initialHoles, "savingThrowOutcome");
    if (!("relationshipFactRequest" in save)) {
      throw new Error("Expected Abjure Foes relationship fact request.");
    }
    expect(save.relationshipFactRequest).toEqual({
      kind: "savingThrowTargetIsEnemy",
      actorId: spellCasterId,
    });

    const procedureRef = requireCharacterUnitProcedureRefForTest(
      ragingSession,
      spellCasterId,
      paladinAbjureFoesUnitId,
    );
    expect(
      resolveBattleSubject({
        state: raging,
        subject: act.subject,
        fills: [
          abjureFoesSavingThrowFill(procedureRef, save, [
            { targetId: spellTargetId, succeeded: false },
          ]),
        ],
      }),
    ).toMatchObject({ tag: "resolved" });
  });

  test("uses the acquired level without character context and rejects unavailable class levels or another mechanics family", () => {
    expect(
      magicActionSaveGatedConditionProfileForUnit(abjureFoesUnit, undefined),
    ).toMatchObject({
      kind: "magicActionSaveGatedCondition",
      unit: abjureFoesUnit,
    });
    expect(
      magicActionSaveGatedConditionProfileForUnit(abjureFoesUnit, []),
    ).toBeNull();
    expect(
      magicActionSaveGatedConditionProfileForUnit(abjureFoesUnit, [
        {
          className: "paladin",
          level: classLevel(8),
        },
      ]),
    ).toBeNull();
    expect(
      battleMagicActionSaveGatedConditionSupportForUnit(abjureFoesUnit, []),
    ).toBe("unsupported");
    expect(
      battleMagicActionSaveGatedConditionSupportForUnit(channelDivinityUnit),
    ).toBeNull();
  });

  test("admits the SRD Surface record and resolves failed Wisdom saves into runnable Frightened restrictions", () => {
    const session = abjureFoesBattle();
    const act = abjureFoesAct(session);
    const procedureRef = requireCharacterUnitProcedureRefForTest(
      session,
      spellCasterId,
      paladinAbjureFoesUnitId,
    );
    const save = requireHole(act.initialHoles, "savingThrowOutcome");

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "unitFeature",
      actorId: spellCasterId,
      procedureRef: requireCharacterUnitProcedureRefForTest(
        session,
        spellCasterId,
        paladinAbjureFoesUnitId,
      ),
    });
    expect(save).toMatchObject({
      ability: "wis",
      dc: { kind: "fixed", dc: 13 },
      targetIds: expect.arrayContaining([spellTargetId, secondTargetId]),
    });

    const resolved = recordResolvedState(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [
          abjureFoesSavingThrowFill(procedureRef, save, [
            { targetId: spellTargetId, succeeded: false },
            { targetId: secondTargetId, succeeded: true },
          ]),
        ],
      }),
    );
    const failedTarget = requireCombatant(resolved, spellTargetId);
    const savedTarget = requireCombatant(resolved, secondTargetId);

    expect(
      channelDivinityUsesRemaining(
        battleRuntimeSessionForTest({
          state: resolved,
          context: session.context,
        }),
      ),
    ).toBe(1);
    expect(resolved.currentTurnResources.actionResources).toHaveLength(0);
    expect(hasCondition(failedTarget.conditions, "frightened")).toBe(true);
    expect(hasCondition(savedTarget.conditions, "frightened")).toBe(false);
    expect(failedTarget.activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "unitFeatureCondition",
          sourceProcedureRef: procedureRef,
          sourceCombatantId: spellCasterId,
          condition: "frightened",
          earlyEnd: { kind: "targetTakesAnyDamage" },
          turnRestriction: { kind: "moveActionOrBonusAction" },
          expiresAt: { kind: "duration", durationTicks: 10 },
        }),
      ]),
    );

    const targetTurn = recordResolvedState(
      endTurn({ state: resolved, actorId: spellCasterId }),
    );
    expect(
      targetTurn.currentTurnResources.movementActionBonusActionExclusion,
    ).toEqual({ kind: "restricted", choice: "notChosen" });
    expect(hasMoveAct(targetTurn, spellTargetId)).toBe(true);

    const dodged = recordResolvedState(
      resolveBattleSubject({
        state: targetTurn,
        subject: { tag: "action", actorId: spellTargetId, action: "dodge" },
        fills: [],
      }),
    );
    expect(
      dodged.currentTurnResources.movementActionBonusActionExclusion,
    ).toEqual({ kind: "restricted", choice: "action" });
    expect(dodged.currentTurnResources.currentHasBonusAction).toBe(false);
    expect(hasMoveAct(dodged, spellTargetId)).toBe(false);

    const damaged = applyBattleHitPointDamage({
      state: resolved,
      target: failedTarget,
      damageAmount: damageAmount(1),
      deathFailuresAtZeroHp: 1,
      damageSourceId: secondTargetId,
    });
    const damagedTarget = requireCombatant(damaged, spellTargetId);
    expect(hasCondition(damagedTarget.conditions, "frightened")).toBe(false);
    expect(
      damagedTarget.activeEffects.some(
        (effect) =>
          effect.kind === "unitFeatureCondition" &&
          effect.sourceProcedureRef === procedureRef,
      ),
    ).toBe(false);
  });

  test("rejects selected targets without the visible-within-60-feet spatial fact", () => {
    const session = abjureFoesBattle();
    const act = abjureFoesAct(session);
    const save = requireHole(act.initialHoles, "savingThrowOutcome");
    const result = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        {
          ...savingThrowOutcomeFill(save, [
            { targetId: spellTargetId, succeeded: false },
          ]),
          spatialFacts: [],
        },
      ],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: expect.stringContaining("visibility and range evidence"),
    });
  });

  test("rejects a replay after Channel Divinity or the Magic Action becomes unavailable", () => {
    const session = abjureFoesBattle();
    const act = abjureFoesAct(session);
    const save = requireHole(act.initialHoles, "savingThrowOutcome");
    const procedureRef = requireCharacterUnitProcedureRefForTest(
      session,
      spellCasterId,
      paladinAbjureFoesUnitId,
    );
    const fills = [
      abjureFoesSavingThrowFill(procedureRef, save, [
        { targetId: spellTargetId, succeeded: false },
      ]),
    ];

    expect(
      resolveBattleSubject({
        state: stateWithDepletedChannelDivinity(session),
        subject: act.subject,
        fills,
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Magic Action condition has no resource uses remaining.",
    });

    expect(
      resolveBattleSubject({
        state: {
          ...session.state,
          currentTurnResources: {
            ...session.state.currentTurnResources,
            actionResources: [],
          },
        },
        subject: act.subject,
        fills,
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Magic Action condition is no longer available.",
    });
  });
});

function abjureFoesBattle(
  input: {
    readonly channelDivinityUsesRemaining?: number;
    readonly includeRage?: boolean;
    readonly paladinLevel?: ClassLevel;
  } = {},
): BattleRuntimeSession {
  const paladinLevel = input.paladinLevel ?? classLevel(9);
  const rageUnit = unitLibrary.requireUnit("barbarian_rage");
  const rageClassLevel = {
    className: "barbarian" as const,
    level: classLevel(1),
  };
  const classLevels: CharacterBattleClassLevelInits =
    input.includeRage === true
      ? [{ className: "paladin" as const, level: paladinLevel }, rageClassLevel]
      : [{ className: "paladin" as const, level: paladinLevel }];
  const result = startBattle({
    battleId: battleId("paladin-abjure-foes"),
    combatants: [
      characterSeed({
        combatantId: spellCasterId,
        displayName: "Devotion Paladin",
        initiative: 20,
        classLevels,
        d20Statistics: testCharacterD20Statistics({ cha: 16, wis: 10 }),
        characterUnitRefs: [
          requireAbjureFoesUnitRef(paladinLevel),
          ...(input.includeRage === true
            ? [supportedBattleUnitRef(rageUnit)]
            : []),
        ],
        unitFeatures: [
          characterBattleFeatureInitForTest(abjureFoesUnit, [
            { className: "paladin", level: paladinLevel },
          ]),
          ...(input.includeRage === true
            ? [characterBattleFeatureInitForTest(rageUnit, [rageClassLevel])]
            : []),
        ],
        resources: [
          {
            unit: channelDivinityUnit,
            usesRemaining: input.channelDivinityUsesRemaining ?? 2,
          },
          ...(input.includeRage === true ? [rageResource()] : []),
        ],
        spellcasting: {
          ...wizardSpellcasting(),
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "paladin",
            abilityModifier: 3,
          },
        },
        attack: null,
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Failed Save Target",
        initiative: 10,
        currentHp: 20,
        maxHp: 20,
      }),
      characterCreature({
        combatantId: secondTargetId,
        displayName: "Successful Save Target",
        initiative: 9,
        currentHp: 20,
        maxHp: 20,
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(battleStateInitIssueMessage(result.left));
  }
  return result.right;
}

function abjureFoesAct(session: BattleRuntimeSession) {
  const act = discoverBattleActs(session).find(
    (candidate) =>
      candidate.subject.tag === "unitFeature" &&
      candidate.subject.actorId === spellCasterId &&
      battleActUnitPresentation(candidate)?.unitId === paladinAbjureFoesUnitId,
  );
  if (act === undefined) {
    throw new Error("Expected Abjure Foes act.");
  }
  return act;
}

function abjureFoesSavingThrowFill(
  sourceProcedureRef: BattleProcedureExecutionRef,
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    ...savingThrowOutcomeFill(hole, outcomes),
    spatialFacts: outcomes.map((outcome) =>
      abjureFoesVisibleWithinRangeFact(sourceProcedureRef, outcome.targetId),
    ),
  };
}

function abjureFoesVisibleWithinRangeFact(
  sourceProcedureRef: BattleProcedureExecutionRef,
  targetId: CombatantId,
): BattleTargetSpatialFact {
  return {
    kind: "unitFeatureVisibleTargetWithinRange",
    actorId: spellCasterId,
    targetId,
    sourceProcedureRef,
    rangeFeet: movementFeet(60),
  };
}

function recordResolvedState(result: BattleResolutionResult): BattleState {
  if (result.tag !== "resolved") {
    throw new Error(`Expected Abjure Foes result to resolve: ${result.tag}`);
  }
  return result.state;
}

function requireCombatant(state: BattleState, combatantId: CombatantId) {
  const combatant = state.combatants.get(combatantId);
  if (combatant === undefined) {
    throw new Error(`Expected combatant ${combatantId}.`);
  }
  return combatant;
}

function channelDivinityUsesRemaining(session: BattleRuntimeSession): number {
  const actor = session.state.combatants.get(spellCasterId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected Paladin actor.");
  }
  const resourcePoolRef = channelDivinityResourcePoolRef(session);
  const resource = actor.origin.resources.find(
    (candidate) => candidate.resourcePoolRef === resourcePoolRef,
  );
  if (resource === undefined || !("usesRemaining" in resource)) {
    throw new Error("Expected Paladin Channel Divinity resource.");
  }
  return Number(resource.usesRemaining);
}

function stateWithDepletedChannelDivinity(
  session: BattleRuntimeSession,
): BattleState {
  const actor = session.state.combatants.get(spellCasterId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected Paladin actor.");
  }
  const resourcePoolRef = channelDivinityResourcePoolRef(session);
  const channelDivinity = actor.origin.resources.find(
    (resource) => resource.resourcePoolRef === resourcePoolRef,
  );
  if (
    channelDivinity === undefined ||
    !characterBattleResourceIsUseCount(channelDivinity) ||
    characterBattleResourceIsUnlimited(channelDivinity)
  ) {
    throw new Error("Expected limited Paladin Channel Divinity resource.");
  }
  return {
    ...session.state,
    combatants: new Map(session.state.combatants).set(spellCasterId, {
      ...actor,
      origin: {
        ...actor.origin,
        resources: actor.origin.resources.map((resource) =>
          resource === channelDivinity
            ? { ...channelDivinity, usesRemaining: resourceCount(0) }
            : resource,
        ),
      },
    }),
  };
}

function channelDivinityResourcePoolRef(session: BattleRuntimeSession) {
  const resourcePoolRef = session.context.characters
    .get(spellCasterId)
    ?.resourceOwnership.find(
      (ownership) => ownership.unit.id === paladinChannelDivinityUnitId,
    )?.resourcePoolRef;
  if (resourcePoolRef === undefined) {
    throw new Error("Expected Paladin Channel Divinity resource ownership.");
  }
  return resourcePoolRef;
}

function hasMoveAct(state: BattleState, actorId: CombatantId): boolean {
  return discoverBattleActCandidates(state).some(
    (act) =>
      act.subject.tag === "runtimeCommand" &&
      act.subject.actorId === actorId &&
      act.subject.command === "move",
  );
}

function requireAbjureFoesUnitRef(paladinLevel: ClassLevel) {
  const classLevels = [{ className: "paladin" as const, level: paladinLevel }];
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: parseSharedUnitId(paladinAbjureFoesUnitId) },
    unit: abjureFoesUnit,
    classLevels,
  });
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  const support = battleMagicActionSaveGatedConditionSupportForUnit(
    abjureFoesUnit,
    classLevels,
  );
  if (support === null || support === "unsupported") {
    throw new Error("Expected Abjure Foes save-gated condition support.");
  }
  expect(unitRef.right.supportProfiles).toContainEqual(support);
  return unitRef.right;
}
