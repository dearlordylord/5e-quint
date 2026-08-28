// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.attack-action-area-save-damage-replacement

import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import { DieRollResult } from "@dnd/shared/types";
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";
import type { CharacterBattleClassLevelInits } from "./character-class-level.ts";

import {
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleRuntimeSession,
  type BattleState,
  type CombatantId,
} from "./index.ts";
import type { BattleProcedureExecutionRef } from "./identity.ts";
import {
  characterCreature,
  requireHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  characterBattleFeatureInitForTest,
  rageResource,
  requireCharacterUnitProcedureRefForTest,
  supportedBattleUnitRef,
} from "./battle-runtime.test-support.ts";
import {
  speciesDragonbornBreathWeaponUnitId,
  spellCasterId,
  spellTargetId,
  unitLibrary,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  battleAttackActionAreaSaveDamageReplacementSupportForUnit,
  battleId,
  battleUnitRefWithSupportProfiles,
  classLevel,
  combatantId,
  discoverBattleActs,
  discoverBattleActCandidates,
  resolveBattleSubject,
  startBattle,
} from "./unit-profile-admission.test-support.ts";
import { extraAttackBattleUnitRef } from "./unit-profile-admission-feature-fixture.test-support.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";

const breathWeaponUnit = unitLibrary.requireUnit(
  speciesDragonbornBreathWeaponUnitId,
);
const rageUnit = unitLibrary.requireUnit("barbarian_rage");
const secondTargetId = combatantId("dragonborn-breath-second-target");

describe("Dragonborn Breath Weapon runtime", () => {
  test("resolves an empty area without damage and rejects a stale Attack action after save validation", () => {
    const session = breathWeaponBattle();
    const state = session.state;
    const act = breathWeaponAct(state);
    const savingThrowHole = requireHole(act.initialHoles, "savingThrowOutcome");
    const savingThrowFill = breathWeaponSavingThrowFill(
      savingThrowHole,
      [],
      [],
    );
    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [savingThrowFill],
      }),
    ).toMatchObject({ tag: "resolved" });

    const staleState = {
      ...state,
      currentTurnResources: {
        ...state.currentTurnResources,
        actionResources: [],
      },
    };
    expect(
      resolveBattleSubject({
        state: staleState,
        subject: act.subject,
        fills: [savingThrowFill],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Area damage replacement Attack action is no longer available.",
    });
  });

  test("requests an enemy relationship fact while Rage is active", () => {
    const session = breathWeaponBattle({ includeRage: true });
    const rageProcedureRef = requireCharacterUnitProcedureRefForTest(
      session,
      spellCasterId,
      "barbarian_rage",
    );
    const raging = resolveBattleSubject({
      state: session.state,
      subject: {
        tag: "unitFeature",
        actorId: spellCasterId,
        procedureRef: rageProcedureRef,
      },
      fills: [],
    });
    if (raging.tag !== "resolved") {
      throw new Error("Expected Rage to resolve before Breath Weapon.");
    }
    const act = breathWeaponAct(raging.state);
    const save = requireHole(act.initialHoles, "savingThrowOutcome");
    if (!("relationshipFactRequest" in save)) {
      throw new Error("Expected Breath Weapon relationship fact request.");
    }
    expect(save.relationshipFactRequest).toEqual({
      kind: "savingThrowTargetIsEnemy",
      actorId: spellCasterId,
    });
    const rageUsesBeforeBreath = unitFeatureUsesRemaining(
      raging.state,
      spellCasterId,
      rageProcedureRef,
    );
    const pendingDamage = resolveBreathWeaponSave(raging.state, {
      outcomes: [
        { targetId: spellTargetId, succeeded: false },
        { targetId: secondTargetId, succeeded: true },
      ],
      areaTargetIds: [spellTargetId, secondTargetId],
    });
    expect(pendingDamage).toMatchObject({ tag: "needsHoles" });
    if (pendingDamage.tag !== "needsHoles") {
      throw new Error("Expected Breath Weapon to request a damage roll.");
    }
    const resolved = resolveBattleSubject({
      state: raging.state,
      subject: breathWeaponSubject(raging.state),
      fills: [
        breathWeaponSavingThrowFill(
          requireHole(
            breathWeaponAct(raging.state).initialHoles,
            "savingThrowOutcome",
          ),
          [
            { targetId: spellTargetId, succeeded: false },
            { targetId: secondTargetId, succeeded: true },
          ],
          [spellTargetId, secondTargetId],
        ),
        rolledDiceFill(requireHole(pendingDamage.holes, "rolledDice"), [6, 4]),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    const resolvedStateValue = resolvedState(resolved);
    expect(currentHp(resolvedStateValue, spellTargetId)).toBe(10);
    expect(currentHp(resolvedStateValue, secondTargetId)).toBe(15);
    expect(breathWeaponUsesRemaining(resolvedStateValue)).toBe(2);
    expect(
      unitFeatureUsesRemaining(
        resolvedStateValue,
        spellCasterId,
        rageProcedureRef,
      ),
    ).toBe(rageUsesBeforeBreath);
  });

  test("resolves both save outcomes, applies ancestry damage, and spends one use", () => {
    const session = breathWeaponBattle();
    const state = session.state;
    const discovered = discoverBattleActs(session).find(
      (candidate) =>
        candidate.subject.tag === "unitFeature" &&
        candidate.subject.actorId === spellCasterId,
    );
    expect(discovered?.routeEvents).toEqual([
      {
        kind: "discoverBattleActs",
        subject: "attackActionAreaSaveDamageReplacement",
        holes: ["savingThrowOutcome"],
        owner: "battleFeatureResource",
      },
    ]);
    const pendingDamage = resolveBreathWeaponSave(state, {
      outcomes: [
        { targetId: spellTargetId, succeeded: false },
        { targetId: secondTargetId, succeeded: true },
      ],
      areaTargetIds: [spellTargetId, secondTargetId],
    });

    expect(pendingDamage).toMatchObject({
      tag: "needsHoles",
      holes: [
        expect.objectContaining({
          kind: "rolledDice",
          label: "Area damage replacement (2d10)",
        }),
      ],
    });
    if (pendingDamage.tag !== "needsHoles") {
      throw new Error("Expected Breath Weapon to request a damage roll.");
    }
    expect(pendingDamage.routeEvents).toEqual([
      {
        kind: "resolveBattleSubject",
        subject: "attackActionAreaSaveDamageReplacement",
        fill: "savingThrowOutcome",
        holes: ["rolledDice"],
        owner: "battleAreaShape",
      },
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "attackActionAreaSaveDamageReplacement",
        holes: ["rolledDice"],
        owner: "battleSavingThrowOutcome",
      },
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "attackActionAreaSaveDamageReplacement",
        holes: ["rolledDice"],
        owner: "battleDamageType",
      },
    ]);

    const result = resolveBattleSubject({
      state,
      subject: breathWeaponSubject(state),
      fills: [
        breathWeaponSavingThrowFill(
          requireHole(
            breathWeaponAct(state).initialHoles,
            "savingThrowOutcome",
          ),
          [
            { targetId: spellTargetId, succeeded: false },
            { targetId: secondTargetId, succeeded: true },
          ],
          [spellTargetId, secondTargetId],
        ),
        rolledDiceFill(requireHole(pendingDamage.holes, "rolledDice"), [6, 4]),
      ],
    });
    expect(result.routeEvents).toEqual([
      {
        kind: "resolveBattleSubject",
        subject: "attackActionAreaSaveDamageReplacement",
        fill: "rolledDice",
        holes: [],
        owner: "battleDamageRoll",
      },
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "attackActionAreaSaveDamageReplacement",
        holes: [],
        owner: "battleHitPoint",
      },
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "attackActionAreaSaveDamageReplacement",
        holes: [],
        owner: "battleFeatureResource",
      },
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "attackActionAreaSaveDamageReplacement",
        holes: [],
        owner: "battleAttackActionProcedure",
      },
    ]);
    const resolved = resolvedState(result);

    expect(currentHp(resolved, spellTargetId)).toBe(10);
    expect(currentHp(resolved, secondTargetId)).toBe(15);
    expect(breathWeaponUsesRemaining(resolved)).toBe(2);
    expect(resolved.currentTurnResources.actionResources).toHaveLength(0);
  });

  test("uses the base ancestry damage dice before the first scaling tier", () => {
    const state = breathWeaponBattle({ fighterLevel: 1 }).state;
    const pendingDamage = resolveBreathWeaponSave(state, {
      outcomes: [{ targetId: spellTargetId, succeeded: false }],
      areaTargetIds: [spellTargetId],
    });

    expect(pendingDamage).toMatchObject({
      tag: "needsHoles",
      holes: [
        expect.objectContaining({
          kind: "rolledDice",
          label: "Area damage replacement (1d10)",
        }),
      ],
    });
  });

  test("opens the remaining Extra Attack slot after replacing the first attack", () => {
    const state = breathWeaponBattle({ extraAttack: true }).state;
    const pendingDamage = resolveBreathWeaponSave(state, {
      outcomes: [{ targetId: spellTargetId, succeeded: false }],
      areaTargetIds: [spellTargetId],
    });
    if (pendingDamage.tag !== "needsHoles") {
      throw new Error("Expected Breath Weapon to request a damage roll.");
    }

    const result = resolveBattleSubject({
      state,
      subject: breathWeaponSubject(state),
      fills: [
        breathWeaponSavingThrowFill(
          requireHole(
            breathWeaponAct(state).initialHoles,
            "savingThrowOutcome",
          ),
          [{ targetId: spellTargetId, succeeded: false }],
          [spellTargetId],
        ),
        rolledDiceFill(requireHole(pendingDamage.holes, "rolledDice"), [5, 5]),
      ],
    });
    expect(result.routeEvents).toContainEqual({
      kind: "discoverBattleActs",
      subject: "weaponAttack",
      holes: ["targetChoice"],
      owner: "battleAttackActionProcedure",
    });
    const resolved = resolvedState(result);

    expect(resolved.currentTurnResources.actionResources).toEqual([
      expect.objectContaining({
        kind: "action",
        source: "classFeatureExtraAttack",
        restriction: {
          kind: "exclude",
          actions: expect.arrayContaining(["magic"]),
        },
      }),
    ]);
  });

  test("routes invalid fills and rejects exhausted resources and unowned procedures", () => {
    const state = breathWeaponBattle().state;
    const act = breathWeaponAct(state);
    const savingThrowHole = requireHole(act.initialHoles, "savingThrowOutcome");
    const savingThrowFill = breathWeaponSavingThrowFill(
      savingThrowHole,
      [{ targetId: spellTargetId, succeeded: false }],
      [spellTargetId],
    );
    const pendingDamage = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [savingThrowFill],
    });
    if (pendingDamage.tag !== "needsHoles") {
      throw new Error("Expected Breath Weapon to request a damage roll.");
    }
    const damageHole = requireHole(pendingDamage.holes, "rolledDice");

    const invalidSavingThrowFill = breathWeaponSavingThrowFill(
      savingThrowHole,
      [{ targetId: spellTargetId, succeeded: false }],
      [],
    );
    const invalidSavingThrow = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [invalidSavingThrowFill],
    });
    expect(invalidSavingThrow).toMatchObject({ tag: "invalid" });
    expect(invalidSavingThrow.routeEvents).toEqual([
      expect.objectContaining({
        fill: "savingThrowOutcome",
        owner: "battleAreaShape",
      }),
    ]);

    const invalidDamageFill = rolledDiceFill(damageHole, [1]);
    const invalidDamage = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [savingThrowFill, invalidDamageFill],
    });
    expect(invalidDamage).toMatchObject({ tag: "invalid" });
    expect(invalidDamage.routeEvents).toEqual([
      expect.objectContaining({
        fill: "rolledDice",
        owner: "battleDamageRoll",
      }),
    ]);

    const unexpectedFill = {
      kind: "unitFeatureDecision",
      holeId: savingThrowHole.holeId,
      value: "decline",
    } as const satisfies BattleFill;
    const unexpected = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [unexpectedFill],
    });
    expect(unexpected).toMatchObject({ tag: "invalid" });
    expect(unexpected.routeEvents).toBeUndefined();

    const spentState = breathWeaponBattle({ usesRemaining: 0 }).state;
    const stale = resolveBattleSubject({
      state: spentState,
      subject: act.subject,
      fills: [],
    });
    expect(stale).toMatchObject({ tag: "invalid", reason: "staleSubject" });
    expect(stale.routeEvents).toEqual([
      expect.objectContaining({
        owner: "battleFeatureResource",
      }),
    ]);

    const unownedProcedure = resolveBattleSubject({
      state,
      subject: { ...act.subject, actorId: spellTargetId },
      fills: [],
    });
    expect(unownedProcedure).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
    expect(unownedProcedure.routeEvents).toBeUndefined();
  });
});

function breathWeaponBattle(
  input: {
    readonly extraAttack?: boolean;
    readonly fighterLevel?: number;
    readonly includeRage?: boolean;
    readonly usesRemaining?: number;
  } = {},
): BattleRuntimeSession {
  const fighterLevel = classLevel(input.fighterLevel ?? 5);
  const classLevels: CharacterBattleClassLevelInits =
    input.includeRage === true
      ? [
          { className: "fighter" as const, level: fighterLevel },
          { className: "barbarian" as const, level: classLevel(1) },
        ]
      : [{ className: "fighter" as const, level: fighterLevel }];
  const result = startBattle({
    battleId: battleId("dragonborn-breath-weapon-runtime"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Dragonborn Fighter",
        initiative: 20,
        classLevels,
        characterUnitRefs: [
          breathWeaponUnitRef(),
          ...(input.extraAttack === true ? [extraAttackBattleUnitRef()] : []),
          ...(input.includeRage === true
            ? [supportedBattleUnitRef(rageUnit)]
            : []),
        ],
        unitFeatures:
          input.includeRage === true
            ? [
                characterBattleFeatureInitForTest(rageUnit, [
                  { className: "barbarian", level: classLevel(1) },
                ]),
              ]
            : [],
        resources: [
          {
            unit: breathWeaponUnit,
            ...(input.usesRemaining === undefined
              ? {}
              : { usesRemaining: input.usesRemaining }),
          },
          ...(input.includeRage === true ? [rageResource()] : []),
        ],
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

function breathWeaponAct(state: BattleState) {
  const act = discoverBattleActCandidates(state).find(
    (candidate) =>
      candidate.subject.tag === "unitFeature" &&
      candidate.subject.actorId === spellCasterId,
  );
  if (act === undefined) {
    throw new Error("Expected Breath Weapon act.");
  }
  return act;
}

function breathWeaponSubject(state: BattleState) {
  return breathWeaponAct(state).subject;
}

function resolveBreathWeaponSave(
  state: BattleState,
  input: {
    readonly outcomes: readonly {
      readonly targetId: CombatantId;
      readonly succeeded: boolean;
    }[];
    readonly areaTargetIds: readonly CombatantId[];
  },
): BattleResolutionResult {
  return resolveBattleSubject({
    state,
    subject: breathWeaponSubject(state),
    fills: [
      breathWeaponSavingThrowFill(
        requireHole(breathWeaponAct(state).initialHoles, "savingThrowOutcome"),
        input.outcomes,
        input.areaTargetIds,
      ),
    ],
  });
}

function breathWeaponSavingThrowFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
  areaTargetIds: readonly CombatantId[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  const relationshipFactRequest =
    "relationshipFactRequest" in hole
      ? hole.relationshipFactRequest
      : undefined;
  const [firstOutcome, ...restOutcomes] = outcomes;
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    ...(relationshipFactRequest?.kind === "savingThrowTargetIsEnemy" &&
    firstOutcome !== undefined
      ? {
          relationshipFacts: [
            {
              kind: "savingThrowTargetIsEnemy" as const,
              actorId: relationshipFactRequest.actorId,
              targetId: firstOutcome.targetId,
              targetIsEnemy: true,
            },
            ...restOutcomes.map((outcome) => ({
              kind: "savingThrowTargetIsEnemy" as const,
              actorId: relationshipFactRequest.actorId,
              targetId: outcome.targetId,
              targetIsEnemy: true,
            })),
          ],
        }
      : {}),
    value: {
      area: {
        originAnchorId: spellCasterId,
        affectedTargetIds: areaTargetIds,
      },
      outcomes,
    },
  };
}

function rolledDiceFill(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
  rolls: readonly [number, ...number[]],
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: [{ results: rolls.map(DieRollResult) }],
  };
}

function breathWeaponUnitRef() {
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: parseSharedUnitId(speciesDragonbornBreathWeaponUnitId) },
    unit: breathWeaponUnit,
    sourceFacts: { draconicAncestryDamageType: "fire" },
  });
  const support = battleAttackActionAreaSaveDamageReplacementSupportForUnit({
    unit: breathWeaponUnit,
    draconicAncestryDamageType: "fire",
  });
  if (support === null || support === "unsupported") {
    throw new Error("Expected Breath Weapon support.");
  }
  expect(unitRef).toEqual(
    Either.right({ unit: breathWeaponUnit, supportProfiles: [support] }),
  );
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

function resolvedState(result: BattleResolutionResult): BattleState {
  if (result.tag !== "resolved") {
    throw new Error(`Expected Breath Weapon to resolve: ${result.tag}`);
  }
  return result.state;
}

function currentHp(state: BattleState, combatantId: CombatantId): number {
  const combatant = state.combatants.get(combatantId);
  if (combatant === undefined) {
    throw new Error(`Expected combatant ${combatantId}.`);
  }
  return Number(combatant.hp);
}

function breathWeaponUsesRemaining(state: BattleState): number {
  const actor = state.combatants.get(spellCasterId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected Dragonborn actor.");
  }
  const binding = actor.origin.execution.procedureBindings.find(
    (candidate) =>
      candidate.procedure.kind === "unitFeature" &&
      candidate.procedure.source.kind === "resourcePool" &&
      candidate.procedure.execution.kind ===
        "attackActionAreaSaveDamageReplacement",
  );
  if (
    binding === undefined ||
    binding.procedure.kind !== "unitFeature" ||
    binding.procedure.source.kind !== "resourcePool"
  ) {
    throw new Error("Expected Breath Weapon mechanical procedure.");
  }
  const resourcePoolRef = binding.procedure.source.resourcePoolRef;
  const resource = actor.origin.resources.find(
    (candidate) => candidate.resourcePoolRef === resourcePoolRef,
  );
  if (resource === undefined || !("usesRemaining" in resource)) {
    throw new Error("Expected Breath Weapon use-count resource.");
  }
  return Number(resource.usesRemaining);
}

function unitFeatureUsesRemaining(
  state: BattleState,
  actorId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
): number {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected a character actor.");
  }
  const binding = actor.origin.execution.procedureBindings.find(
    (candidate) => candidate.procedureRef === procedureRef,
  );
  if (binding === undefined) {
    throw new Error("Expected the selected Unit feature procedure.");
  }
  const procedure = binding.procedure;
  if (
    procedure.kind !== "unitFeature" ||
    procedure.source.kind !== "resourcePool"
  ) {
    throw new Error("Expected the selected Unit feature resource.");
  }
  const resourcePoolRef = procedure.source.resourcePoolRef;
  const resource = actor.origin.resources.find(
    (candidate) => candidate.resourcePoolRef === resourcePoolRef,
  );
  if (resource === undefined || !("usesRemaining" in resource)) {
    throw new Error("Expected an ongoing feature use-count resource.");
  }
  return Number(resource.usesRemaining);
}
