// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12-SH62-GASEOUS-FORM-MIST-CLOUD-STATE gaseous_form
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12-SH64-GASEOUS-FORM-RESTRICTIONS-CLEANUP gaseous_form
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-mist-cloud-form
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.MIST_CLOUD_FORM_STATE
import { describe, expect, test } from "vitest";
import { abilityModifier } from "@dnd/shared-algebras/armor-class-algebra";
import { proficiencyBonus } from "@dnd/shared/types";
import type { EffectAtom, SpellRecord } from "@dnd/surface/surface/types";
import {
  applyCondition,
  breakBattleConcentration,
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
import { combatantPerceptionCommunicationProjection } from "./creature-perception-communication.ts";
import { applyBattleHitPointDamage } from "./battle-reducer/damage-apply.ts";
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

  test("restricts speech, attacks, spellcasting, object interaction, and exposes table-spatial witnesses", () => {
    const spell = spellRecord(gaseousFormUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      targetPreparedSpells: [spell],
      targetSpellcasting: {
        sourceClassName: "wizard",
        spellcastingAbilityModifier: abilityModifier(3),
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [spell],
        featurePreparedSpells: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 3, count: 1 }],
      },
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
    const targetTurn = endTurn({
      state: resolved.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected target turn.");
    }
    const target = requireCombatant(targetTurn.state, spellTargetId);
    const acts = discoverBattleActs(targetTurn.state);

    expect(
      combatantPerceptionCommunicationProjection(target).communication,
    ).toMatchObject({
      kind: "characterRetainedCommunication",
      speech: {
        kind: "retainedCharacterSpeech",
        blockedByCondition: false,
        blockedByMistCloudForm: true,
      },
    });
    const movementHole = acts
      .flatMap((candidate) => candidate.initialHoles)
      .find((hole) => hole.kind === "movement");
    expect(movementHole).toMatchObject({
      kind: "movement",
      mistCloudFormTableSpatialWitnesses: [
        "occupyAnotherCreatureSpace",
        "passThroughNarrowOpenings",
        "liquidsAsSolidSurfaces",
      ],
    });
    expect(
      acts.some(
        (candidate) =>
          candidate.subject.tag === "action" &&
          candidate.subject.action === "attack",
      ),
    ).toBe(false);
    expect(
      acts.some((candidate) => candidate.subject.tag === "actionSpell"),
    ).toBe(false);
    expect(
      acts.some(
        (candidate) =>
          candidate.subject.tag === "runtimeCommand" &&
          candidate.subject.command === "releaseSpellCreatedHeldObject",
      ),
    ).toBe(false);
    expect(
      acts.some(
        (candidate) =>
          candidate.subject.tag === "runtimeCommand" &&
          candidate.subject.command === "dismissMistCloudForm",
      ),
    ).toBe(true);

    expect(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: {
          tag: "action",
          actorId: spellTargetId,
          action: "attack",
          attackName: "Unarmed Strike",
        },
        fills: [],
      }),
    ).toEqual(
      expect.objectContaining({
        tag: "invalid",
        message: "Mist-cloud form prevents attacks.",
      }),
    );
    expect(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: {
          tag: "actionSpell",
          actorId: spellTargetId,
          invocation: spellSlotInvocationRef(
            gaseousFormUnitId,
            3,
            "mistCloudForm",
          ),
          mode: { tag: "cast" },
        },
        fills: [],
      }),
    ).toEqual(
      expect.objectContaining({
        tag: "invalid",
        message: "Mist-cloud form prevents spellcasting.",
      }),
    );
  });

  test("pending Command Drop under mist-cloud form resolves without object interaction deadlock", () => {
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
    const targetTurn = endTurn({
      state: resolved.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected target turn.");
    }
    const commandSourceSpellId = "synthetic_command_drop_source";
    const target = requireCombatant(targetTurn.state, spellTargetId);
    const commandState = {
      ...targetTurn.state,
      combatants: new Map(targetTurn.state.combatants).set(spellTargetId, {
        ...target,
        activeEffects: [
          ...target.activeEffects,
          {
            kind: "commandPending",
            option: "drop",
            sourceSpellId: commandSourceSpellId,
            sourceCombatantId: spellCasterId,
            expiresAt: {
              kind: "endOfTurn",
              combatantId: spellTargetId,
              round: targetTurn.state.initiative.round,
            },
          } satisfies BattleActiveEffect,
        ],
      }),
    };
    const commandDrop = discoverBattleActs(commandState).find(
      (candidate) =>
        candidate.subject.tag === "runtimeCommand" &&
        candidate.subject.command === "commandDrop",
    );
    if (commandDrop === undefined) {
      throw new Error("Expected pending Command Drop act.");
    }
    expect(commandDrop.initialHoles).toEqual([]);

    const dropped = resolveBattleSubject({
      state: commandState,
      subject: commandDrop.subject,
      fills: [],
    });
    if (dropped.tag !== "resolved") {
      throw new Error("Expected Command Drop under mist-cloud form to resolve.");
    }
    expect(dropped.droppedObjects).toEqual([]);
    expect(
      requireCombatant(dropped.state, spellTargetId).activeEffects.some(
        (effect) => effect.kind === "commandPending",
      ),
    ).toBe(false);
  });

  test("target Magic Action self-ending removes the form and clears sole Concentration owner cleanup", () => {
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
    const targetTurn = endTurn({
      state: resolved.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected target turn.");
    }
    const dismiss = discoverBattleActs(targetTurn.state).find(
      (candidate) =>
        candidate.subject.tag === "runtimeCommand" &&
        candidate.subject.command === "dismissMistCloudForm",
    );
    if (dismiss === undefined) {
      throw new Error("Expected mist-cloud self-dismissal act.");
    }

    const dismissed = resolveBattleSubject({
      state: targetTurn.state,
      subject: dismiss.subject,
      fills: [],
    });
    if (dismissed.tag !== "resolved") {
      throw new Error("Expected mist-cloud self-dismissal to resolve.");
    }

    expect(
      requireCombatant(dismissed.state, spellTargetId).activeEffects.some(
        (effect) => effect.kind === "spellMistCloudForm",
      ),
    ).toBe(false);
    expect(
      requireCombatant(dismissed.state, spellTargetId).activeEffects.some(
        (effect) => effect.kind === "conditionImmunity",
      ),
    ).toBe(false);
    expect(requireCombatant(dismissed.state, spellCasterId).concentration).toBe(
      null,
    );
  });

  test("target Magic Action self-ending restores a pre-existing non-spell Prone source", () => {
    const spell = spellRecord(gaseousFormUnitId);
    const baseState = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const targetBeforeCast = requireCombatant(baseState, spellTargetId);
    if (targetBeforeCast.positiveHpUnconscious !== null) {
      throw new Error("Expected Gaseous Form target to be conscious.");
    }
    const state = {
      ...baseState,
      combatants: new Map(baseState.combatants).set(spellTargetId, {
        ...targetBeforeCast,
        conditions: applyCondition(targetBeforeCast.conditions, "prone"),
      }),
    };
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
    expect(
      hasCondition(
        requireCombatant(resolved.state, spellTargetId).conditions,
        "prone",
      ),
    ).toBe(false);
    const targetTurn = endTurn({
      state: resolved.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected target turn.");
    }
    const dismiss = discoverBattleActs(targetTurn.state).find(
      (candidate) =>
        candidate.subject.tag === "runtimeCommand" &&
        candidate.subject.command === "dismissMistCloudForm",
    );
    if (dismiss === undefined) {
      throw new Error("Expected mist-cloud self-dismissal act.");
    }
    const dismissed = resolveBattleSubject({
      state: targetTurn.state,
      subject: dismiss.subject,
      fills: [],
    });
    if (dismissed.tag !== "resolved") {
      throw new Error("Expected mist-cloud self-dismissal to resolve.");
    }

    expect(
      hasCondition(
        requireCombatant(dismissed.state, spellTargetId).conditions,
        "prone",
      ),
    ).toBe(true);
  });

  test("zero Hit Points ends the target's mist-cloud form without authored identity dispatch", () => {
    const spell = spellRecord(gaseousFormUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      targetHp: 5,
      targetMaxHp: 5,
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

    const dropped = applyBattleHitPointDamage({
      state: resolved.state,
      target,
      damageAmount: 5,
      deathFailuresAtZeroHp: 1,
    });

    expect(
      requireCombatant(dropped, spellTargetId).activeEffects.some(
        (effect) => effect.kind === "spellMistCloudForm",
      ),
    ).toBe(false);
    expect(requireCombatant(dropped, spellCasterId).concentration).toBe(null);
  });

  test("normal spell ending cleans up active mist-cloud form state", () => {
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

    const ended = breakBattleConcentration(resolved.state, spellCasterId);

    expect(
      requireCombatant(ended, spellTargetId).activeEffects.some(
        (effect) => effect.kind === "spellMistCloudForm",
      ),
    ).toBe(false);
    expect(
      requireCombatant(ended, spellTargetId).activeEffects.some(
        (effect) => effect.kind === "conditionImmunity",
      ),
    ).toBe(false);
    expect(requireCombatant(ended, spellCasterId).concentration).toBe(null);
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
