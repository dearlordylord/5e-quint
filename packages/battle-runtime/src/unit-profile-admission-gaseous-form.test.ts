// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12-SH62-GASEOUS-FORM-MIST-CLOUD-STATE gaseous_form
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-mist-cloud-form
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.MIST_CLOUD_FORM_STATE
import { describe, expect, test } from "vitest";
import type { EffectAtom, SpellRecord } from "@dnd/surface/surface/types";
import {
  applyCondition,
  combatantId,
  discoverBattleActs,
  elapsedTimeTicks,
  endTurn,
  hasCondition,
  movementDeltaFeet,
  resolveBattleSubject,
  spellCasterId,
  spellSlotInvocationRef,
  spellTargetId,
} from "./unit-profile-admission-test-support.ts";
import {
  effectiveMovementSpeed,
  representedMovementSpeedKinds,
} from "./battle-reducer/movement-speed.ts";
import { damageAmountAfterTargetAdjustments } from "./battle-reducer/damage-helpers.ts";
import { conditionApplicationPreventedByConditionImmunity } from "./battle-reducer/spell-condition-effects-helpers.ts";
import { savingThrowRollModeProjections } from "./battle-reducer/spells-damage-fills.ts";
import type {
  BattleActiveEffect,
  BattleCreatureState,
} from "./battle-reducer.ts";
import { gaseousFormUnitId } from "./unit-profile-admission-catalog-support.ts";
import {
  requireCombatant,
  requireHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  knownWillingSpellTargetListFill,
  spellAct,
  spellHoleInvocation,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";

const secondTargetId = combatantId("unit-profile-gaseous-form-target-2");
type TransformTargetEffect = Extract<
  EffectAtom,
  { readonly kind: "transform_target" }
>;
type MistCloudFormShape = Extract<
  TransformTargetEffect["newForm"],
  { readonly kind: "spell_effect_mist_cloud" }
>;

describe("L12-SH62 deterministic Gaseous Form mist-cloud state admission", () => {
  test("admits Gaseous Form as a willing target mist-cloud Spell Effect occurrence", () => {
    const spell = spellRecord(gaseousFormUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [
        { spellLevel: 2, count: 1 },
        { spellLevel: 3, count: 1 },
        { spellLevel: 4, count: 1 },
      ],
      extraTargetIds: [secondTargetId],
    });

    expect(
      discoverBattleActs(state).some(
        (act) =>
          act.subject.tag === "actionSpell" &&
          act.subject.invocation.spellId === gaseousFormUnitId &&
          act.subject.invocation.tag === "spellSlot" &&
          Number(act.subject.invocation.slotLevel) === 2,
      ),
    ).toBe(false);
    const thirdLevelAct = spellAct({
      state,
      spellId: gaseousFormUnitId,
      slotLevel: 3,
    });
    const fourthLevelAct = spellAct({
      state,
      spellId: gaseousFormUnitId,
      slotLevel: 4,
    });

    expect(thirdLevelAct.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(gaseousFormUnitId, 3, "mistCloudForm"),
      mode: { tag: "cast" },
    });
    const targetHole = requireHole(
      thirdLevelAct.initialHoles,
      "spellTargetList",
    );
    expect(targetHole).toEqual(
      expect.objectContaining({
        minTargets: 1,
        maxTargets: 1,
        choices: [spellCasterId],
        requiresTableSpatialFact: true,
      }),
    );
    expect(spellHoleInvocation([targetHole])).toEqual(
      expect.objectContaining({
        procedure: "mistCloudForm",
        spell,
        actionCost: "magicAction",
        resource: { tag: "spellSlot", slotLevel: 3 },
        targeting: {
          kind: "targetList",
          minTargets: 1,
          maxTargets: 1,
          requiredTargetDisposition: "willing",
        },
        activeEffect: {
          kind: "spellMistCloudForm",
          sourceSpellId: gaseousFormUnitId,
          sourceCombatantId: spellCasterId,
          transformedObjects: "wornAndCarried",
          earlyEnds: [
            { kind: "targetDropsToZeroHitPoints" },
            { kind: "targetMagicActionDismissal" },
            { kind: "spellEnds" },
          ],
          expiresAt: {
            kind: "concentration",
            combatantId: spellCasterId,
            durationTicks: elapsedTimeTicks(600),
          },
        },
      }),
    );
    expect(spellHoleInvocation(fourthLevelAct.initialHoles)).toEqual(
      expect.objectContaining({
        procedure: "mistCloudForm",
        resource: { tag: "spellSlot", slotLevel: 4 },
        targeting: expect.objectContaining({ maxTargets: 2 }),
      }),
    );
  });

  test("resolves a willing target into target-owned state and caster Concentration", () => {
    const spell = spellRecord(gaseousFormUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const act = spellAct({ state, spellId: gaseousFormUnitId, slotLevel: 3 });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const targetFill = knownWillingSpellTargetListFill(
      targetHole,
      spellCasterId,
      gaseousFormUnitId,
      [spellTargetId],
    );

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill],
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Gaseous Form cast to resolve.");
    }

    const caster = requireCombatant(resolved.state, spellCasterId);
    const target = requireCombatant(resolved.state, spellTargetId);
    expect(caster.concentration).toEqual({
      sourceSpellId: gaseousFormUnitId,
      effectKind: "spellEffect",
    });
    expect(target.activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "spellMistCloudForm",
          sourceSpellId: gaseousFormUnitId,
          sourceCombatantId: spellCasterId,
          transformedObjects: "wornAndCarried",
          earlyEnds: [
            { kind: "targetDropsToZeroHitPoints" },
            { kind: "targetMagicActionDismissal" },
            { kind: "spellEnds" },
          ],
          expiresAt: {
            kind: "concentration",
            combatantId: spellCasterId,
            durationTicks: elapsedTimeTicks(600),
          },
        }),
        expect.objectContaining({
          kind: "conditionImmunity",
          sourceSpellId: gaseousFormUnitId,
          sourceCombatantId: spellCasterId,
          condition: "prone",
          conditionHadNonSpellSource: false,
          expiresAt: {
            kind: "concentration",
            combatantId: spellCasterId,
            durationTicks: elapsedTimeTicks(600),
          },
        }),
      ]),
    );
    const effect = target.activeEffects.find(
      (activeEffect) => activeEffect.kind === "spellMistCloudForm",
    );
    expect(effect).toEqual(
      expect.objectContaining({
        kind: "spellMistCloudForm",
        sourceSpellId: gaseousFormUnitId,
        sourceCombatantId: spellCasterId,
        transformedObjects: "wornAndCarried",
        earlyEnds: [
          { kind: "targetDropsToZeroHitPoints" },
          { kind: "targetMagicActionDismissal" },
          { kind: "spellEnds" },
        ],
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
          durationTicks: elapsedTimeTicks(600),
        },
      }),
    );
    expect(effect).not.toHaveProperty("speedKind");
    expect(effect).not.toHaveProperty("damageType");
    expect(effect).not.toHaveProperty("condition");
    expect(effect).not.toHaveProperty("ability");
  });

  test("projects mist-cloud movement replacement, Dash budget, and defensive passives", () => {
    const spell = spellRecord(gaseousFormUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const act = spellAct({ state, spellId: gaseousFormUnitId, slotLevel: 3 });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const targetFill = knownWillingSpellTargetListFill(
      targetHole,
      spellCasterId,
      gaseousFormUnitId,
      [spellTargetId],
    );

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill],
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Gaseous Form cast to resolve.");
    }

    const target = requireCombatant(resolved.state, spellTargetId);
    expect(representedMovementSpeedKinds(target)).toEqual(["fly"]);
    expect(Number(effectiveMovementSpeed(target, "walk"))).toBe(0);
    expect(Number(effectiveMovementSpeed(target, "fly"))).toBe(10);
    expect(resolved.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: spellTargetId,
          movement: expect.objectContaining({
            speedFeet: 0,
            remainingFeet: 0,
            speedKinds: [
              {
                kind: "fly",
                speedFeet: 10,
                remainingFeet: 10,
              },
            ],
          }),
        }),
      ]),
    );

    const speedModifierEffects = [
      {
        kind: "speedDelta",
        sourceSpellId: "synthetic_speed_delta_fixture",
        sourceCombatantId: spellCasterId,
        deltaFeet: movementDeltaFeet(30),
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
        },
      },
      {
        kind: "speedRatio",
        sourceSpellId: "synthetic_speed_ratio_fixture",
        sourceCombatantId: spellCasterId,
        numerator: 2,
        denominator: 1,
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
        },
      },
      {
        kind: "speedHalved",
        sourceUnitId: "synthetic_speed_halving_fixture",
        sourceCombatantId: spellCasterId,
        expiresAt: {
          kind: "startOfTurn",
          combatantId: spellCasterId,
        },
      },
    ] as const satisfies readonly BattleActiveEffect[];
    const speedModifiedTarget: BattleCreatureState = {
      ...target,
      activeEffects: [...target.activeEffects, ...speedModifierEffects],
    };
    const speedModifiedState = {
      ...resolved.state,
      combatants: new Map(resolved.state.combatants).set(
        spellTargetId,
        speedModifiedTarget,
      ),
    };
    expect(Number(effectiveMovementSpeed(speedModifiedTarget, "walk"))).toBe(0);
    expect(Number(effectiveMovementSpeed(speedModifiedTarget, "fly"))).toBe(
      10,
    );

    expect(damageAmountAfterTargetAdjustments(target, 9, "bludgeoning")).toBe(
      4,
    );
    expect(damageAmountAfterTargetAdjustments(target, 9, "piercing")).toBe(4);
    expect(damageAmountAfterTargetAdjustments(target, 9, "slashing")).toBe(4);
    expect(damageAmountAfterTargetAdjustments(target, 9, "poison")).toBe(9);
    expect(
      conditionApplicationPreventedByConditionImmunity(target, "prone"),
    ).toBe(true);
    expect(
      conditionApplicationPreventedByConditionImmunity(target, "stunned"),
    ).toBe(false);
    expect(savingThrowRollModeProjections(resolved.state, "str")).toEqual([
      { targetId: spellTargetId, rollMode: "advantage" },
    ]);
    expect(savingThrowRollModeProjections(resolved.state, "dex")).toEqual([
      { targetId: spellTargetId, rollMode: "advantage" },
    ]);
    expect(savingThrowRollModeProjections(resolved.state, "con")).toEqual([
      { targetId: spellTargetId, rollMode: "advantage" },
    ]);
    expect(savingThrowRollModeProjections(resolved.state, "wis")).toEqual([]);

    const targetTurn = endTurn({
      state: speedModifiedState,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected Gaseous Form caster end turn.");
    }
    expect(
      discoverBattleActs(targetTurn.state).some(
        (candidate) =>
          candidate.subject.tag === "action" &&
          candidate.subject.action === "dash" &&
          candidate.subject.speedKind === "walk",
      ),
    ).toBe(false);
    const flyDash = resolveBattleSubject({
      state: targetTurn.state,
      subject: {
        tag: "action",
        actorId: spellTargetId,
        action: "dash",
        speedKind: "fly",
      },
      fills: [],
    });
    expect(flyDash).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: {
          dashMovementBonusFeet: 10,
        },
        combatants: [
          expect.anything(),
          expect.objectContaining({
            combatantId: spellTargetId,
            movement: expect.objectContaining({
              speedKinds: [
                {
                  kind: "fly",
                  speedFeet: 10,
                  remainingFeet: 20,
                },
              ],
            }),
          }),
        ],
      },
    });
  });

  test("removes existing Prone and suppresses active Prone condition effects", () => {
    const spell = spellRecord(gaseousFormUnitId);
    const baseState = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const targetBeforeCast = requireCombatant(baseState, spellTargetId);
    if (targetBeforeCast.positiveHpUnconscious !== null) {
      throw new Error("Expected Gaseous Form target to be conscious.");
    }
    const activeProneEffect = {
      kind: "spellCondition",
      sourceSpellId: "synthetic_active_prone_fixture",
      sourceCombatantId: spellCasterId,
      condition: "prone",
      conditionHadNonSpellSource: false,
      escape: null,
      turnStartDamage: null,
      expiresAt: {
        kind: "duration",
        durationTicks: elapsedTimeTicks(60),
      },
    } as const satisfies BattleActiveEffect;
    const proneTarget: BattleCreatureState = {
      ...targetBeforeCast,
      activeEffects: [...targetBeforeCast.activeEffects, activeProneEffect],
      conditions: applyCondition(targetBeforeCast.conditions, "prone"),
    };
    const state = {
      ...baseState,
      combatants: new Map(baseState.combatants).set(
        spellTargetId,
        proneTarget,
      ),
    };
    expect(
      hasCondition(requireCombatant(state, spellTargetId).conditions, "prone"),
    ).toBe(true);

    const act = spellAct({ state, spellId: gaseousFormUnitId, slotLevel: 3 });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const targetFill = knownWillingSpellTargetListFill(
      targetHole,
      spellCasterId,
      gaseousFormUnitId,
      [spellTargetId],
    );

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill],
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Gaseous Form cast to resolve.");
    }

    const target = requireCombatant(resolved.state, spellTargetId);
    expect(hasCondition(target.conditions, "prone")).toBe(false);
    expect(target.activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "spellCondition",
          condition: "prone",
        }),
        expect.objectContaining({
          kind: "conditionImmunity",
          sourceSpellId: gaseousFormUnitId,
          sourceCombatantId: spellCasterId,
          condition: "prone",
          conditionHadNonSpellSource: false,
        }),
      ]),
    );
    expect(
      conditionApplicationPreventedByConditionImmunity(target, "prone"),
    ).toBe(true);
  });

  test("requires known willing target evidence before applying the form", () => {
    const spell = spellRecord(gaseousFormUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const act = spellAct({ state, spellId: gaseousFormUnitId, slotLevel: 3 });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      gaseousFormUnitId,
      [spellTargetId],
    );

    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill],
      }),
    ).toEqual(
      expect.objectContaining({
        tag: "invalid",
        reason: "invalidFill",
        message:
          "Spell targets must be combatants within the selected spell's supported range.",
      }),
    );
  });

  test("admission follows typed mist-cloud shape rather than authored spell id", () => {
    const spell = {
      ...spellRecord(gaseousFormUnitId),
      id: "synthetic_mist_cloud_form_fixture",
      name: "Synthetic Mist Cloud Form",
    } as SpellRecord;
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });

    expect(
      spellAct({ state, spellId: spell.id, slotLevel: 3 }).subject.invocation,
    ).toEqual(spellSlotInvocationRef(spell.id, 3, "mistCloudForm"));
  });

  test("admission rejects adjacent transform shapes missing Magic Action self-end", () => {
    const spell = gaseousFormWithRevertTriggers(
      "synthetic_mist_cloud_form_missing_self_end",
      (trigger) => trigger.kind !== "dismissed_by_target",
    );

    expectSpellNotAdmitted(spell);
  });

  test("admission rejects adjacent mist-cloud shapes missing defensive passives", () => {
    const spell = gaseousFormWithMistCloudForm(
      "synthetic_mist_cloud_form_missing_prone_immunity",
      (form) => ({
        ...form,
        passive: {
          ...form.passive,
          // This negative fixture intentionally bypasses the typed surface
          // invariant so admission can reject malformed authored input.
          conditionImmunities:
            [] as unknown as MistCloudFormShape["passive"]["conditionImmunities"],
        },
      }),
    );

    expectSpellNotAdmitted(spell);
  });
});

function gaseousFormWithMistCloudForm(
  id: string,
  replaceForm: (form: MistCloudFormShape) => MistCloudFormShape,
): SpellRecord {
  const base = spellRecord(gaseousFormUnitId);
  if (base.mechanics.family !== "ongoing_effect") {
    throw new Error("Expected Gaseous Form ongoing-effect mechanics.");
  }
  // The malformed fixture above widens the operation tuple, so this cast keeps
  // the test at the authored-record boundary after the local mutation.
  return {
    ...base,
    id,
    mechanics: {
      ...base.mechanics,
      operations: base.mechanics.operations.map((operation) =>
        operation.effect.kind === "transform_target" &&
        operation.effect.newForm.kind === "spell_effect_mist_cloud"
          ? {
              ...operation,
              effect: {
                ...operation.effect,
                newForm: replaceForm(operation.effect.newForm),
              },
            }
          : operation,
      ),
    },
  } as unknown as SpellRecord;
}

function gaseousFormWithRevertTriggers(
  id: string,
  keepTrigger: (
    trigger: TransformTargetEffect["revertTriggers"][number],
  ) => boolean,
): SpellRecord {
  const base = spellRecord(gaseousFormUnitId);
  if (base.mechanics.family !== "ongoing_effect") {
    throw new Error("Expected Gaseous Form ongoing-effect mechanics.");
  }
  return {
    ...base,
    id,
    mechanics: {
      ...base.mechanics,
      operations: base.mechanics.operations.map((operation) =>
        operation.effect.kind === "transform_target"
          ? {
              ...operation,
              effect: {
                ...operation.effect,
                revertTriggers:
                  operation.effect.revertTriggers.filter(keepTrigger),
              },
            }
          : operation,
      ),
    },
  } as unknown as SpellRecord;
}

function expectSpellNotAdmitted(spell: SpellRecord): void {
  const state = spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 3, count: 1 }],
  });
  expect(
    discoverBattleActs(state).some(
      (act) =>
        act.subject.tag === "actionSpell" &&
        act.subject.invocation.spellId === spell.id,
    ),
  ).toBe(false);
}
