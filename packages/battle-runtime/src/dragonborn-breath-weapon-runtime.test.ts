// RAW-COVERAGE: runtime-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.attack-action-area-save-damage-replacement

import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import { DieRollResult } from "@dnd/shared/types";
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";

import type {
  BattleFill,
  BattleHole,
  BattleResolutionResult,
  BattleRuntimeSession,
  BattleState,
  CombatantId,
} from "./index.ts";
import {
  characterCreature,
  requireHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
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
const secondTargetId = combatantId("dragonborn-breath-second-target");

describe("Dragonborn Breath Weapon runtime", () => {
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

    const resolved = resolvedState(
      resolveBattleSubject({
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
          rolledDiceFill(
            requireHole(pendingDamage.holes, "rolledDice"),
            [6, 4],
          ),
        ],
      }),
    );

    expect(currentHp(resolved, spellTargetId)).toBe(10);
    expect(currentHp(resolved, secondTargetId)).toBe(15);
    expect(breathWeaponUsesRemaining(resolved)).toBe(2);
    expect(resolved.currentTurnResources.actionResources).toHaveLength(0);
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

    const resolved = resolvedState(
      resolveBattleSubject({
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
          rolledDiceFill(
            requireHole(pendingDamage.holes, "rolledDice"),
            [5, 5],
          ),
        ],
      }),
    );

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
});

function breathWeaponBattle(
  input: { readonly extraAttack?: boolean } = {},
): BattleRuntimeSession {
  const result = startBattle({
    battleId: battleId("dragonborn-breath-weapon-runtime"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Dragonborn Fighter",
        initiative: 20,
        classLevels: [{ className: "fighter", level: classLevel(5) }],
        characterUnitRefs: [
          breathWeaponUnitRef(),
          ...(input.extraAttack === true ? [extraAttackBattleUnitRef()] : []),
        ],
        resources: [{ unit: breathWeaponUnit }],
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
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
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
