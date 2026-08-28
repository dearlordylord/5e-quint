import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  assertBattleSnapshotCodecAcceptsHolesForSubjectForTest,
  battleProcedureExecutionRefForTest,
  battleStateWithAllocatedEffectForTest,
} from "./battle-runtime.test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3-FOLLOWUP-SLOW-ACTIVE-PENALTIES-RUNTIME slow
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3-FOLLOWUP-SLOW-TURN-AND-SOMATIC-RUNTIME slow
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-SLOW-ACTIVE-PENALTIES-RUNTIME slow
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-SLOW-TURN-AND-SOMATIC-RUNTIME slow
// UNIT-IDENTITY-REPLAY: L3-FOLLOWUP-SLOW-ACTIVE-PENALTIES-RUNTIME slow doReplaySlowActivePenalties
// UNIT-IDENTITY-REPLAY: L3-FOLLOWUP-SLOW-TURN-AND-SOMATIC-RUNTIME slow doReplaySlowTurnAndSomatic
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-slow-active-penalties
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE
import {
  canSpendAction,
  canSpendBonusAction,
} from "@dnd/shared-algebras/action-economy-algebra";
import {
  abilityModifier,
  currentArmorClass,
} from "@dnd/shared-algebras/armor-class-algebra";
import { proficiencyBonus } from "@dnd/shared/types";
import { Schema } from "effect";
import * as Result from "effect/Result";
import { describe, expect, test } from "vitest";
import {
  activeEffectArmorClass,
  combatantCanTakeReactions,
} from "./battle-reducer/creature-state.ts";
import { SLOW_ACTIVE_PENALTIES_SOMATIC_FAILURE_PERCENT } from "./battle-reducer/domain-constants.ts";
import { effectiveWalkSpeed } from "./battle-reducer/movement-speed.ts";
import { savingThrowFlatBonusProjections } from "./battle-reducer/spells-damage-fills.ts";
import {
  attackRollFill,
  attackTargetFill,
  combatantId,
  commandUnitId,
  discoverBattleActCandidates,
  discoverBattleActs,
  elapsedTimeTicks,
  endTurn,
  expeditiousRetreatUnitId,
  extraAttackBattleUnitRef,
  flamingSphereAreaId,
  flamingSphereRepositionAct,
  flamingSphereRepositionMovementFill,
  greaseUnitId,
  maybeSpellAct,
  movementFeet,
  requireCombatant,
  requireHole,
  requireResultHole,
  resolveBattleSubject,
  savingThrowOutcomeFill,
  singleTargetSavingThrowOutcomeFill,
  slowUnitId,
  snapshotBattle,
  spellAct,
  spellCasterId,
  spellSlotInvocationRef,
  spellTargetId,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission.test-support.ts";
import type {
  AvailableBattleAct,
  BattleFill,
  BattleHole,
  BattleRuntimeSession,
  BattleSpellSavingThrowOutcomeHole,
  BattleState,
  CombatantId,
} from "./unit-profile-admission.test-support.ts";
import {
  requireCharacterSpellProcedureRefForTest,
  monsterMultiattackStatBlock,
} from "./battle-runtime.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  shillelaghUnitId,
  spiritualWeaponUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import { defineSelectedIdentityReplayWitness } from "./selected-identity-witness.test-support.ts";
import { BattleSnapshotSchema } from "./index.ts";
import type { BattleSourcedEffectOccurrenceTemplate } from "./effect-execution-ref.ts";

const slowExtraTargetId = combatantId("unit-profile-slow-extra-target");
const slowMultiattackTargetId = combatantId(
  "unit-profile-slow-multiattack-target",
);

describe("Task 12 deterministic Slow active-penalties admission", () => {
  test("Slow admits level-3+ Magic Action casting and applies failed-save active penalties", () => {
    const spell = spellRecord(slowUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [
        { spellLevel: 2, count: 1 },
        { spellLevel: 3, count: 1 },
      ],
      extraTargetIds: [slowExtraTargetId],
    });

    expect(
      maybeSpellAct({ session: state, spellId: slowUnitId, slotLevel: 2 }),
    ).toBe(undefined);
    const act = spellAct({
      session: state,
      spellId: slowUnitId,
      slotLevel: 3,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        state,
        spellCasterId,
        spellSlotInvocationRef(slowUnitId, 3, "slowActivePenalties"),
      ),
      mode: { tag: "cast" },
    });

    const savingThrow = requireSpellSavingThrowOutcomeHole(act.initialHoles);
    expect(savingThrow).toEqual(
      expect.objectContaining({
        label: "Spell point-origin Cube Saving Throw outcomes",
        ability: "wis",
        dc: { kind: "caster_spell_save_dc" },
      }),
    );
    expect(savingThrow).toMatchObject({ outcomeTargeting: "area" });
    expect("spell" in savingThrow).toBe(false);

    const baseTarget = requireCombatant(state.state, spellTargetId);
    const baseArmorClass = Number(
      currentArmorClass(activeEffectArmorClass(state.state, baseTarget)),
    );
    const cast = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [
        slowSavingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false },
          { targetId: slowExtraTargetId, succeeded: true },
        ]),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error(`Expected Slow cast to resolve: ${JSON.stringify(cast)}`);
    }

    const target = requireCombatant(cast.state, spellTargetId);
    const savedTarget = requireCombatant(cast.state, slowExtraTargetId);
    expect(target.activeEffects).toEqual([
      expect.objectContaining({
        kind: "slowActivePenalties",
        sourceProcedureRef: act.subject.procedureRef,
        sourceCombatantId: spellCasterId,
        save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
          durationTicks: elapsedTimeTicks(10),
        },
      }),
    ]);
    expect(savedTarget.activeEffects).toEqual([]);
    expect(Number(effectiveWalkSpeed(cast.state, target))).toBe(15);
    expect(
      Number(currentArmorClass(activeEffectArmorClass(cast.state, target))),
    ).toBe(baseArmorClass - 2);
    expect(savingThrowFlatBonusProjections(cast.state, "dex")).toEqual([
      {
        targetId: spellTargetId,
        sourceCombatantId: spellCasterId,
        sourceProcedureRef: act.subject.procedureRef,
        bonus: -2,
      },
    ]);
    expect(savingThrowFlatBonusProjections(cast.state, "wis")).toEqual([]);
    expect(combatantCanTakeReactions(target)).toBe(false);
    expect(requireCombatant(cast.state, spellCasterId).concentration).toEqual({
      sourceProcedureRef: act.subject.procedureRef,
      effectKind: "spellEffect",
    });
  });

  test("Slow rejects generic area save fills without Cube and chosen-creature witnesses", () => {
    const state = spellBattle({
      preparedSpells: [spellRecord(slowUnitId)],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const act = spellAct({ session: state, spellId: slowUnitId, slotLevel: 3 });
    const savingThrow = requireSpellSavingThrowOutcomeHole(act.initialHoles);

    const cast = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [
        savingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });

    expect(cast).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
  });

  test("successful end-of-target-turn save removes Slow penalties and clears Concentration", () => {
    const cast = castFailedSlow(
      spellBattle({
        preparedSpells: [spellRecord(slowUnitId)],
        spellSlots: [{ spellLevel: 3, count: 1 }],
      }),
    );
    const slowed = requireCombatant(cast, spellTargetId);
    const slowEffect = slowed.activeEffects.find(
      (effect) => effect.kind === "slowActivePenalties",
    );
    expect(slowEffect).toBeDefined();
    expect(Number(effectiveWalkSpeed(cast, slowed))).toBe(15);
    expect(combatantCanTakeReactions(slowed)).toBe(false);

    const casterTurnEnded = endTurn({ state: cast, actorId: spellCasterId });
    if (casterTurnEnded.tag !== "resolved") {
      throw new Error("Expected Slow caster End Turn to resolve.");
    }
    const targetTurnNeedsSave = endTurn({
      state: casterTurnEnded.state,
      actorId: spellTargetId,
    });
    expect(targetTurnNeedsSave).toMatchObject({ tag: "needsHoles" });
    if (targetTurnNeedsSave.tag !== "needsHoles") {
      throw new Error("Expected Slow target End Turn to request a save.");
    }
    assertBattleSnapshotCodecAcceptsHolesForSubjectForTest({
      snapshot: targetTurnNeedsSave.snapshot,
      subject: targetTurnNeedsSave.subject,
      holes: targetTurnNeedsSave.holes,
    });
    const repeatSave = requireSlowEndTurnSaveHole(targetTurnNeedsSave.holes);
    expect(repeatSave).toEqual(
      expect.objectContaining({
        ability: "wis",
        dc: { kind: "caster_spell_save_dc" },
        slowActivePenaltiesEndTurnSave: {
          targetId: spellTargetId,
          sourceProcedureRef: slowEffect?.sourceProcedureRef,
          sourceCombatantId: spellCasterId,
          save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
        },
      }),
    );

    const maintained = endTurn({
      state: casterTurnEnded.state,
      actorId: spellTargetId,
      fills: [
        singleTargetSavingThrowOutcomeFill(repeatSave, spellTargetId, false),
      ],
    });
    if (maintained.tag !== "resolved") {
      throw new Error(
        `Expected failed Slow repeat save to resolve: ${JSON.stringify(maintained)}`,
      );
    }
    const maintainedTarget = requireCombatant(maintained.state, spellTargetId);
    expect(maintainedTarget.activeEffects).toContainEqual(
      expect.objectContaining({ kind: "slowActivePenalties" }),
    );
    expect(Number(effectiveWalkSpeed(maintained.state, maintainedTarget))).toBe(
      15,
    );
    expect(
      requireCombatant(maintained.state, spellCasterId).concentration,
    ).not.toBeNull();
    expect(snapshotBattle(maintained.state).currentActorId).toBe(spellCasterId);

    const saved = endTurn({
      state: casterTurnEnded.state,
      actorId: spellTargetId,
      fills: [
        singleTargetSavingThrowOutcomeFill(repeatSave, spellTargetId, true),
      ],
    });
    if (saved.tag !== "resolved") {
      throw new Error(
        `Expected Slow repeat save to resolve: ${JSON.stringify(saved)}`,
      );
    }

    const target = requireCombatant(saved.state, spellTargetId);
    expect(target.activeEffects).toEqual([]);
    expect(Number(effectiveWalkSpeed(saved.state, target))).toBe(30);
    expect(combatantCanTakeReactions(target)).toBe(true);
    expect(savingThrowFlatBonusProjections(saved.state, "dex")).toEqual([]);
    expect(
      requireCombatant(saved.state, spellCasterId).concentration,
    ).toBeNull();
  });

  test("slowed target turn can spend either an Action or a Bonus Action, not both", () => {
    const targetTurn = targetTurnAfterFailedSlow(
      spellBattle({
        preparedSpells: [spellRecord(slowUnitId)],
        spellSlots: [{ spellLevel: 3, count: 1 }],
      }),
    );

    expect(
      targetTurn.state.currentTurnResources.actionOrBonusActionExclusion,
    ).toEqual({
      kind: "restricted",
      choice: "notChosen",
    });
    expect(canSpendAction(targetTurn.state.currentTurnResources, "dodge")).toBe(
      true,
    );
    expect(canSpendBonusAction(targetTurn.state.currentTurnResources)).toBe(
      true,
    );

    const dodge = actionAct(targetTurn, spellTargetId, "dodge");
    const dodged = resolveBattleSubject({
      state: targetTurn.state,
      subject: dodge.subject,
      fills: [],
    });
    if (dodged.tag !== "resolved") {
      throw new Error(
        `Expected slowed Dodge to resolve: ${JSON.stringify(dodged)}`,
      );
    }

    expect(dodged.state.currentTurnResources.actionResources).toEqual([]);
    expect(dodged.state.currentTurnResources.currentHasBonusAction).toBe(false);
    expect(
      dodged.state.currentTurnResources.actionOrBonusActionExclusion,
    ).toEqual({
      kind: "restricted",
      choice: "action",
    });
    expect(canSpendAction(dodged.state.currentTurnResources, "attack")).toBe(
      false,
    );
    expect(canSpendBonusAction(dodged.state.currentTurnResources)).toBe(false);
  });

  test("Slow applied to the current actor immediately reconciles prior Action spending", () => {
    const state = spellBattle({
      preparedSpells: [spellRecord(slowUnitId)],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const act = spellAct({ session: state, spellId: slowUnitId, slotLevel: 3 });
    const savingThrow = requireSpellSavingThrowOutcomeHole(act.initialHoles);

    const cast = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [
        slowSavingThrowOutcomeFill(savingThrow, [
          { targetId: spellCasterId, succeeded: false },
        ]),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error(
        `Expected self-targeted Slow cast to resolve: ${JSON.stringify(cast)}`,
      );
    }

    expect(requireCombatant(cast.state, spellCasterId).activeEffects).toEqual([
      expect.objectContaining({ kind: "slowActivePenalties" }),
    ]);
    expect(cast.state.currentTurnResources.actionResources).toEqual([]);
    expect(cast.state.currentTurnResources.currentHasBonusAction).toBe(false);
    expect(
      cast.state.currentTurnResources.actionOrBonusActionExclusion,
    ).toEqual({
      kind: "restricted",
      choice: "action",
    });
    expect(canSpendAction(cast.state.currentTurnResources, "attack")).toBe(
      false,
    );
    expect(canSpendBonusAction(cast.state.currentTurnResources)).toBe(false);
    expect(
      discoverBattleActCandidates(cast.state).some(
        (candidate) =>
          candidate.subject.actorId === spellCasterId &&
          (candidate.subject.tag === "action" ||
            candidate.subject.tag === "bonusAction"),
      ),
    ).toBe(false);
  });

  test("slowed target Attack action does not open an Extra Attack slot", () => {
    const targetTurn = targetTurnAfterFailedSlow(
      spellBattle({
        preparedSpells: [spellRecord(slowUnitId)],
        spellSlots: [{ spellLevel: 3, count: 1 }],
        targetAttack: zeroAbilityWeaponAttack("weapon_club"),
        targetUnitRefs: [extraAttackBattleUnitRef()],
      }),
    );

    const attack = actionAct(targetTurn, spellTargetId, "attack", "Club");
    const targetHole = requireResultHole(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: attack.subject,
        fills: [],
      }),
      "targetChoice",
    );
    const targetFill = attackTargetFill(
      targetHole,
      spellTargetId,
      spellCasterId,
    );
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: attack.subject,
        fills: [targetFill],
      }),
      "attackRoll",
    );
    const attacked = resolveBattleSubject({
      state: targetTurn.state,
      subject: attack.subject,
      fills: [
        targetFill,
        attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
      ],
    });
    if (attacked.tag !== "resolved") {
      throw new Error(
        `Expected slowed Attack action to resolve: ${JSON.stringify(attacked)}`,
      );
    }

    expect(
      attacked.state.currentTurnResources.actionResources.filter(
        (resource) => resource.source === "classFeatureExtraAttack",
      ),
    ).toEqual([]);
    expect(canSpendAction(attacked.state.currentTurnResources, "attack")).toBe(
      false,
    );
  });

  test("slowed Stat Block Multiattack does not open follow-up dispatch attacks", () => {
    const targetTurn = statBlockTargetTurnAfterFailedSlow();

    const multiattack = actionAct(
      targetTurn,
      slowMultiattackTargetId,
      "multiattack",
    );
    const resolved = resolveBattleSubject({
      state: targetTurn.state,
      subject: multiattack.subject,
      fills: [],
    });
    if (resolved.tag !== "resolved") {
      throw new Error(
        `Expected slowed Stat Block Multiattack to resolve: ${JSON.stringify(resolved)}`,
      );
    }

    expect(
      resolved.state.currentTurnResources.actionResources.filter(
        (resource) => resource.source === "statBlockMultiattack",
      ),
    ).toEqual([]);
    expect(canSpendAction(resolved.state.currentTurnResources, "attack")).toBe(
      false,
    );
    expect(
      discoverBattleActCandidates(resolved.state).some(
        (candidate) =>
          candidate.subject.tag === "action" &&
          candidate.subject.actorId === slowMultiattackTargetId &&
          candidate.subject.action === "attack",
      ),
    ).toBe(false);
  });

  test("a slowed target's low-level Flaming Sphere interaction prevents a later Action", () => {
    const slowedTargetTurn = targetTurnAfterFailedSlow(
      spellBattle({
        preparedSpells: [spellRecord(slowUnitId)],
        spellSlots: [{ spellLevel: 3, count: 1 }],
      }),
    );
    const flamingSphere = syntheticTargetOwnedFlamingSphereInteraction();
    const slowedTarget = requireCombatant(
      slowedTargetTurn.state,
      spellTargetId,
    );
    const stateWithConcentration = {
      ...slowedTargetTurn.state,
      combatants: new Map(slowedTargetTurn.state.combatants).set(
        spellTargetId,
        {
          ...slowedTarget,
          concentration: {
            sourceProcedureRef: flamingSphere.sourceProcedureRef,
            effectKind: "spellEffect" as const,
          },
        },
      ),
    };
    const targetTurn = battleRuntimeSessionForTest({
      ...slowedTargetTurn,
      state: battleStateWithAllocatedEffectForTest({
        state: stateWithConcentration,
        ownerId: spellTargetId,
        effect: flamingSphere,
      }),
    });

    const reposition = flamingSphereRepositionAct(targetTurn, spellTargetId);
    const movement = requireHole(
      reposition.initialHoles,
      "movableZoneRepositionMovement",
    );
    const moved = resolveBattleSubject({
      state: targetTurn.state,
      subject: reposition.subject,
      fills: [flamingSphereRepositionMovementFill(movement)],
    });
    if (moved.tag !== "resolved") {
      throw new Error(
        `Expected slowed Flaming Sphere reposition to resolve: ${JSON.stringify(moved)}`,
      );
    }

    expect(moved.state.currentTurnResources.actionResources).toEqual([]);
    expect(moved.state.currentTurnResources.currentHasBonusAction).toBe(false);
    expect(
      moved.state.currentTurnResources.actionOrBonusActionExclusion,
    ).toEqual({
      kind: "restricted",
      choice: "bonusAction",
    });
    expect(canSpendAction(moved.state.currentTurnResources, "dodge")).toBe(
      false,
    );
    expect(canSpendBonusAction(moved.state.currentTurnResources)).toBe(false);
    expect(
      discoverBattleActCandidates(moved.state).some(
        (candidate) =>
          candidate.subject.tag === "action" &&
          candidate.subject.actorId === spellTargetId,
      ),
    ).toBe(false);
  });

  test("slowed Somatic spell cast asks for chance outcome and a failed outcome spends only cast resources", () => {
    const targetTurn = targetTurnAfterFailedSlow(
      spellBattle({
        preparedSpells: [spellRecord(slowUnitId)],
        spellSlots: [{ spellLevel: 3, count: 1 }],
        targetPreparedSpells: [spellRecord(expeditiousRetreatUnitId)],
      }),
    );

    const act = spellActForActor(
      targetTurn,
      spellTargetId,
      expeditiousRetreatUnitId,
    );
    const slowChance = requireSlowSomaticSpellFailureHole(act.initialHoles);
    const slowEffect = requireCombatant(
      targetTurn.state,
      spellTargetId,
    ).activeEffects.find((effect) => effect.kind === "slowActivePenalties");
    expect(slowEffect).toBeDefined();
    expect(slowChance).toEqual(
      expect.objectContaining({
        actorId: spellTargetId,
        sourceProcedureRef: act.subject.procedureRef,
        failurePercent: SLOW_ACTIVE_PENALTIES_SOMATIC_FAILURE_PERCENT,
        activeEffectSources: [
          {
            sourceProcedureRef: slowEffect?.sourceProcedureRef,
            sourceCombatantId: spellCasterId,
          },
        ],
      }),
    );
    const snapshot = snapshotBattle(targetTurn.state);
    const focusedSnapshot = {
      ...snapshot,
      acts: snapshot.acts.filter(
        (candidate) =>
          "procedureRef" in candidate.subject &&
          candidate.subject.procedureRef === act.subject.procedureRef,
      ),
    };
    assertBattleSnapshotCodecAcceptsHolesForSubjectForTest({
      snapshot: focusedSnapshot,
      subject: act.subject,
      holes: act.initialHoles,
    });
    const wrongOwnerHoles = act.initialHoles.map((hole) =>
      hole.kind === "slowSomaticSpellFailureOutcome"
        ? {
            ...hole,
            activeEffectSources: hole.activeEffectSources.map((source) => ({
              ...source,
              sourceCombatantId: spellTargetId,
            })),
          }
        : hole,
    );
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleSnapshotSchema)({
          ...Schema.encodeSync(BattleSnapshotSchema)(focusedSnapshot),
          acts: focusedSnapshot.acts.map((candidate) => ({
            ...candidate,
            initialHoles: wrongOwnerHoles,
          })),
        }),
      ),
    ).toBe(true);

    const failed = resolveBattleSubject({
      state: targetTurn.state,
      subject: act.subject,
      fills: [slowSomaticSpellFailureFill(slowChance, true)],
    });
    if (failed.tag !== "resolved") {
      throw new Error(
        `Expected failed slowed Somatic spell cast to resolve: ${JSON.stringify(failed)}`,
      );
    }

    const target = requireCombatant(failed.state, spellTargetId);
    expect(target.activeEffects).toEqual([
      expect.objectContaining({ kind: "slowActivePenalties" }),
    ]);
    expect(failed.state.currentTurnResources.actionResources).toEqual([]);
    expect(failed.state.currentTurnResources.currentHasBonusAction).toBe(false);
    expect(
      failed.state.currentTurnResources.actionOrBonusActionExclusion,
    ).toEqual({
      kind: "restricted",
      choice: "bonusAction",
    });
    expect(
      failed.state.currentTurnResources.spellSlotUsesThisTurn,
    ).toContainEqual({
      kind: "committed",
      combatantId: spellTargetId,
    });
  });

  test("the Slow Somatic outcome gates a Shillelagh weapon override", () => {
    const targetTurn = targetTurnAfterFailedSlow(
      spellBattle({
        preparedSpells: [spellRecord(slowUnitId)],
        spellSlots: [{ spellLevel: 3, count: 1 }],
        casterClassLevels: [{ className: "wizard", level: 5 }],
        targetAttack: zeroAbilityWeaponAttack("weapon_quarterstaff"),
        targetClassLevels: [{ className: "druid", level: 1 }],
        targetSpellcasting: {
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "druid",
            abilityModifier: abilityModifier(3),
          },
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [spellRecord(shillelaghUnitId)],
          preparedSpells: [],
          featurePreparedSpells: [],
          spellAccesses: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: [],
        },
      }),
    );
    const act = spellActForActor(targetTurn, spellTargetId, shillelaghUnitId);
    const slowChance = requireSlowSomaticSpellFailureHole(act.initialHoles);

    const failed = resolveBattleSubject({
      state: targetTurn.state,
      subject: act.subject,
      fills: [slowSomaticSpellFailureFill(slowChance, true)],
    });

    if (failed.tag !== "resolved") {
      throw new Error("Expected failed slowed Shillelagh to resolve.");
    }
    expect(
      requireCombatant(failed.state, spellTargetId).activeEffects,
    ).not.toContainEqual(
      expect.objectContaining({ kind: "spellWeaponAttackOverride" }),
    );
    expect(failed.state.currentTurnResources.currentHasBonusAction).toBe(false);

    expect(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: act.subject,
        fills: [
          slowSomaticSpellFailureFill(slowChance, true),
          {
            kind: "targetChoice",
            holeId: slowChance.holeId,
            value: spellCasterId,
          },
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });

    const resolved = resolveBattleSubject({
      state: targetTurn.state,
      subject: act.subject,
      fills: [slowSomaticSpellFailureFill(slowChance, false)],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected slowed Shillelagh to resolve after success.");
    }
    expect(
      requireCombatant(resolved.state, spellTargetId).activeEffects,
    ).toContainEqual(
      expect.objectContaining({ kind: "spellWeaponAttackOverride" }),
    );
  });

  test("a failed Slow Somatic outcome stops an Action spell before its target holes", () => {
    const targetTurn = targetTurnAfterFailedSlow(
      spellBattle({
        preparedSpells: [spellRecord(slowUnitId)],
        spellSlots: [{ spellLevel: 3, count: 1 }],
        casterClassLevels: [{ className: "wizard", level: 5 }],
        targetClassLevels: [{ className: "wizard", level: 1 }],
        targetPreparedSpells: [spellRecord(greaseUnitId)],
      }),
    );
    const act = spellActForActor(targetTurn, spellTargetId, greaseUnitId);
    const slowChance = requireSlowSomaticSpellFailureHole(act.initialHoles);

    const failed = resolveBattleSubject({
      state: targetTurn.state,
      subject: act.subject,
      fills: [slowSomaticSpellFailureFill(slowChance, true)],
    });
    if (failed.tag !== "resolved") {
      throw new Error("Expected failed slowed Grease cast to resolve.");
    }
    expect(
      requireCombatant(failed.state, spellTargetId).activeEffects,
    ).not.toContainEqual(
      expect.objectContaining({ kind: "greaseGroundHazard" }),
    );
    expect(failed.state.currentTurnResources.actionResources).toEqual([]);
    expect(
      failed.state.currentTurnResources.spellSlotUsesThisTurn,
    ).toContainEqual(
      expect.objectContaining({
        kind: "committed",
        combatantId: spellTargetId,
      }),
    );
  });

  test("a failed Slow Somatic outcome stops Spiritual Weapon before its target holes", () => {
    const targetTurn = targetTurnAfterFailedSlow(
      spellBattle({
        preparedSpells: [spellRecord(slowUnitId)],
        spellSlots: [{ spellLevel: 3, count: 1 }],
        casterClassLevels: [{ className: "wizard", level: 5 }],
        targetClassLevels: [{ className: "cleric", level: 3 }],
        targetSpellcasting: {
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "cleric",
            abilityModifier: abilityModifier(3),
          },
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [spellRecord(spiritualWeaponUnitId)],
          featurePreparedSpells: [],
          spellAccesses: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: [{ spellLevel: 2, count: 1 }],
        },
      }),
    );
    const act = spellActForActor(
      targetTurn,
      spellTargetId,
      spiritualWeaponUnitId,
    );
    const slowChance = requireSlowSomaticSpellFailureHole(act.initialHoles);

    const failed = resolveBattleSubject({
      state: targetTurn.state,
      subject: act.subject,
      fills: [slowSomaticSpellFailureFill(slowChance, true)],
    });
    if (failed.tag !== "resolved") {
      throw new Error("Expected failed slowed Spiritual Weapon to resolve.");
    }
    expect(
      requireCombatant(failed.state, spellTargetId).activeEffects,
    ).not.toContainEqual(expect.objectContaining({ kind: "spiritualWeapon" }));
    expect(failed.state.currentTurnResources.currentHasBonusAction).toBe(false);
    expect(
      failed.state.currentTurnResources.spellSlotUsesThisTurn,
    ).toContainEqual(
      expect.objectContaining({
        kind: "committed",
        combatantId: spellTargetId,
      }),
    );
  });

  test("slowed spell cast without an effective Somatic component does not ask for the Slow chance outcome", () => {
    const targetTurn = targetTurnAfterFailedSlow(
      spellBattle({
        preparedSpells: [spellRecord(slowUnitId)],
        spellSlots: [{ spellLevel: 3, count: 1 }],
        targetPreparedSpells: [spellRecord(commandUnitId)],
      }),
    );

    const act = spellActForActor(targetTurn, spellTargetId, commandUnitId);

    expect(
      act.initialHoles.some(
        (hole) => hole.kind === "slowSomaticSpellFailureOutcome",
      ),
    ).toBe(false);
  });

  test("Slow recast replaces its admitted occurrence and preserves a low-level unrelated occurrence", () => {
    const base = spellBattle({
      preparedSpells: [spellRecord(slowUnitId)],
      spellSlots: [{ spellLevel: 3, count: 2 }],
    });
    const firstAct = spellAct({
      session: base,
      spellId: slowUnitId,
      slotLevel: 3,
    });
    const firstSavingThrow = requireSpellSavingThrowOutcomeHole(
      firstAct.initialHoles,
    );
    const firstCast = resolveBattleSubject({
      state: base.state,
      subject: firstAct.subject,
      fills: [
        slowSavingThrowOutcomeFill(firstSavingThrow, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    if (firstCast.tag !== "resolved") {
      throw new Error("Expected initial Slow cast to resolve.");
    }
    const firstEffect = requireCombatant(
      firstCast.state,
      spellTargetId,
    ).activeEffects.find((effect) => effect.kind === "slowActivePenalties");
    if (firstEffect?.kind !== "slowActivePenalties") {
      throw new Error("Expected initial admitted Slow occurrence.");
    }
    const targetTurn = endTurn({
      state: firstCast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected first Slow caster turn to end.");
    }
    const repeatSaveFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (repeatSaveFrontier.tag !== "needsHoles") {
      throw new Error("Expected Slow repeat-save frontier.");
    }
    const repeatSave = requireSlowEndTurnSaveHole(repeatSaveFrontier.holes);
    const casterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [
        singleTargetSavingThrowOutcomeFill(repeatSave, spellTargetId, false),
      ],
    });
    if (casterTurn.tag !== "resolved") {
      throw new Error("Expected failed Slow repeat save to resolve.");
    }
    const unrelatedSource = battleProcedureExecutionRefForTest(
      "synthetic-slow-unrelated",
    );
    const target = requireCombatant(casterTurn.state, spellTargetId);
    const targetConcentratingState = {
      ...casterTurn.state,
      combatants: new Map(casterTurn.state.combatants).set(spellTargetId, {
        ...target,
        concentration: {
          sourceProcedureRef: unrelatedSource,
          effectKind: "spellEffect" as const,
        },
      }),
    };
    const stateWithUnrelated = battleStateWithAllocatedEffectForTest({
      state: targetConcentratingState,
      ownerId: spellTargetId,
      effect: {
        kind: "slowActivePenalties",
        sourceProcedureRef: unrelatedSource,
        sourceCombatantId: spellTargetId,
        save: {
          ability: "wis",
          dc: { kind: "caster_spell_save_dc" },
        },
        expiresAt: {
          kind: "concentration",
          combatantId: spellTargetId,
          durationTicks: elapsedTimeTicks(60),
        },
      },
    });
    const unrelatedEffect = requireCombatant(
      stateWithUnrelated,
      spellTargetId,
    ).activeEffects.find(
      (effect) =>
        effect.kind === "slowActivePenalties" &&
        effect.sourceProcedureRef === unrelatedSource,
    );
    if (unrelatedEffect?.kind !== "slowActivePenalties") {
      throw new Error("Expected unrelated synthetic Slow occurrence.");
    }
    const recastSession = battleRuntimeSessionForTest({
      ...base,
      state: stateWithUnrelated,
    });
    const act = spellAct({
      session: recastSession,
      spellId: slowUnitId,
      slotLevel: 3,
    });
    const savingThrow = requireSpellSavingThrowOutcomeHole(act.initialHoles);
    const resolved = resolveBattleSubject({
      state: recastSession.state,
      subject: act.subject,
      fills: [
        slowSavingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Slow recast to resolve.");
    }
    const effects = requireCombatant(
      resolved.state,
      spellTargetId,
    ).activeEffects;
    expect(effects).toHaveLength(2);
    const replacement = effects.find(
      (effect) =>
        effect.kind === "slowActivePenalties" &&
        effect.sourceProcedureRef === act.subject.procedureRef,
    );
    expect(replacement?.effectRef).not.toBe(firstEffect.effectRef);
    expect(
      effects.some((effect) => effect.effectRef === unrelatedEffect.effectRef),
    ).toBe(true);
    expect(effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "slowActivePenalties",
          sourceProcedureRef: unrelatedSource,
        }),
        expect.objectContaining({
          kind: "slowActivePenalties",
          sourceProcedureRef: act.subject.procedureRef,
        }),
      ]),
    );
  });
});

function castFailedSlow(session: BattleRuntimeSession): BattleState {
  return castSlowWithOutcomes(session, [
    { targetId: spellTargetId, succeeded: false },
  ]);
}

function castSlowWithOutcomes(
  session: BattleRuntimeSession,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): BattleState {
  const act = spellAct({ session, spellId: slowUnitId, slotLevel: 3 });
  const savingThrow = requireSpellSavingThrowOutcomeHole(act.initialHoles);
  const cast = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [slowSavingThrowOutcomeFill(savingThrow, outcomes)],
  });
  if (cast.tag !== "resolved") {
    throw new Error(`Expected Slow cast to resolve: ${JSON.stringify(cast)}`);
  }
  return cast.state;
}

function statBlockTargetTurnAfterFailedSlow(): BattleRuntimeSession {
  const session = spellBattle({
    preparedSpells: [spellRecord(slowUnitId)],
    spellSlots: [{ spellLevel: 3, count: 1 }],
    statBlockTargets: [
      {
        combatantId: slowMultiattackTargetId,
        statBlock: monsterMultiattackStatBlock(),
        initiative: 15,
      },
    ],
  });
  const cast = castSlowWithOutcomes(session, [
    { targetId: slowMultiattackTargetId, succeeded: false },
  ]);
  const targetTurn = endTurn({ state: cast, actorId: spellCasterId });
  if (targetTurn.tag !== "resolved") {
    throw new Error("Expected Slow caster End Turn to resolve.");
  }
  return battleRuntimeSessionForTest({ ...session, state: targetTurn.state });
}

function targetTurnAfterFailedSlow(
  session: BattleRuntimeSession,
): BattleRuntimeSession {
  const cast = castFailedSlow(session);
  const targetTurn = endTurn({ state: cast, actorId: spellCasterId });
  if (targetTurn.tag !== "resolved") {
    throw new Error("Expected Slow caster End Turn to resolve.");
  }
  return battleRuntimeSessionForTest({ ...session, state: targetTurn.state });
}

function syntheticTargetOwnedFlamingSphereInteraction(): Extract<
  BattleSourcedEffectOccurrenceTemplate,
  { readonly kind: "flamingSphere" }
> {
  return {
    kind: "flamingSphere",
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      "synthetic-slow-target-flaming-sphere",
    ),
    sourceCombatantId: spellTargetId,
    areaId: flamingSphereAreaId,
    save: { ability: "dex", dc: { kind: "caster_spell_save_dc" } },
    damage: { expr: { dice: 2, dieSize: 6 }, damageType: "fire" },
    ramMaxMoveFeet: movementFeet(30),
    expiresAt: {
      kind: "concentration",
      combatantId: spellTargetId,
      durationTicks: elapsedTimeTicks(10),
    },
  };
}

function actionAct(
  session: BattleRuntimeSession,
  actorId: CombatantId,
  action: Extract<
    AvailableBattleAct["subject"],
    { readonly tag: "action" }
  >["action"],
  attackName?: string,
): AvailableBattleAct & {
  readonly subject: Extract<
    AvailableBattleAct["subject"],
    { readonly tag: "action" }
  >;
} {
  const act = discoverBattleActs(session).find(
    (
      candidate,
    ): candidate is AvailableBattleAct & {
      readonly subject: Extract<
        AvailableBattleAct["subject"],
        { readonly tag: "action" }
      >;
    } =>
      candidate.subject.tag === "action" &&
      candidate.subject.actorId === actorId &&
      candidate.subject.action === action &&
      (attackName === undefined ||
        (candidate.presentation.kind === "attack" &&
          candidate.presentation.name === attackName)),
  );
  if (act === undefined) {
    throw new Error(`Expected ${action} act for ${actorId}.`);
  }
  return act;
}

function spellActForActor(
  session: BattleRuntimeSession,
  actorId: CombatantId,
  unitId: string,
): AvailableBattleAct & {
  readonly subject: Extract<
    AvailableBattleAct["subject"],
    {
      readonly tag: "actionSpell" | "bonusActionSpell" | "bonusActionDashSpell";
    }
  >;
} {
  const act = discoverBattleActs(session).find(
    (
      candidate,
    ): candidate is AvailableBattleAct & {
      readonly subject: Extract<
        AvailableBattleAct["subject"],
        {
          readonly tag:
            | "actionSpell"
            | "bonusActionSpell"
            | "bonusActionDashSpell";
        }
      >;
    } =>
      (candidate.subject.tag === "actionSpell" ||
        candidate.subject.tag === "bonusActionSpell" ||
        candidate.subject.tag === "bonusActionDashSpell") &&
      candidate.subject.actorId === actorId &&
      battleActSpellPresentation(candidate)?.invocation.spellId === unitId,
  );
  if (act === undefined) {
    throw new Error(`Expected ${unitId} spell act for ${actorId}.`);
  }
  return act;
}

function slowSavingThrowOutcomeFill(
  hole: BattleSpellSavingThrowOutcomeHole,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        kind: "slowArea",
        originAnchorId: spellCasterId,
        affectedTargetIds: outcomes.map((outcome) => outcome.targetId),
        cubeSideFeet: 40,
        affectedCreatureWitnesses: outcomes.map((outcome) => ({
          targetId: outcome.targetId,
          inCube: true,
          chosenByCaster: true,
        })),
      },
      outcomes,
    },
  };
}

function requireSpellSavingThrowOutcomeHole(
  holes: readonly BattleHole[],
): BattleSpellSavingThrowOutcomeHole {
  const hole = requireHole(holes, "savingThrowOutcome");
  if (!("sourceProcedureRef" in hole)) {
    throw new Error("Expected a spell Saving Throw outcome projection.");
  }
  return hole;
}

defineSelectedIdentityReplayWitness({
  describeLabel:
    "L3-FOLLOWUP-SLOW-ACTIVE-PENALTIES-RUNTIME selected identity replay",
  taskId: "L3-FOLLOWUP-SLOW-ACTIVE-PENALTIES-RUNTIME",
  initialProjection: {
    unitId: slowUnitId,
    procedure: "initial",
    targetHasSlow: false,
    somaticFailureRequested: false,
  },
  units: [
    {
      unitId: slowUnitId,
      procedures: [
        {
          actionName: "doReplaySlowActivePenalties",
          projectionAfter: {
            unitId: slowUnitId,
            procedure: "slowActivePenalties",
            targetHasSlow: true,
            somaticFailureRequested: false,
          },
          discover: () => {
            const state = castFailedSlow(
              spellBattle({
                preparedSpells: [spellRecord(slowUnitId)],
                spellSlots: [{ spellLevel: 3, count: 1 }],
              }),
            );
            return {
              unitId: slowUnitId,
              procedure: "slowActivePenalties",
              targetHasSlow: requireCombatant(
                state,
                spellTargetId,
              ).activeEffects.some(
                (effect) =>
                  effect.kind === "slowActivePenalties" &&
                  effect.sourceCombatantId === spellCasterId,
              ),
              somaticFailureRequested: false,
            };
          },
        },
        {
          actionName: "doReplaySlowTurnAndSomatic",
          projectionAfter: {
            unitId: slowUnitId,
            procedure: "slowTurnAndSomatic",
            targetHasSlow: true,
            somaticFailureRequested: true,
          },
          discover: () => {
            const targetTurn = targetTurnAfterFailedSlow(
              spellBattle({
                preparedSpells: [spellRecord(slowUnitId)],
                spellSlots: [{ spellLevel: 3, count: 1 }],
                targetPreparedSpells: [spellRecord(expeditiousRetreatUnitId)],
              }),
            );
            const act = spellActForActor(
              targetTurn,
              spellTargetId,
              expeditiousRetreatUnitId,
            );
            const slowChance = requireSlowSomaticSpellFailureHole(
              act.initialHoles,
            );
            const failed = resolveBattleSubject({
              state: targetTurn.state,
              subject: act.subject,
              fills: [slowSomaticSpellFailureFill(slowChance, true)],
            });
            if (failed.tag !== "resolved") {
              throw new Error("Expected selected Slow Somatic replay.");
            }
            return {
              unitId: slowUnitId,
              procedure: "slowTurnAndSomatic",
              targetHasSlow: requireCombatant(
                failed.state,
                spellTargetId,
              ).activeEffects.some(
                (effect) =>
                  effect.kind === "slowActivePenalties" &&
                  effect.sourceCombatantId === spellCasterId,
              ),
              somaticFailureRequested: true,
            };
          },
        },
      ],
    },
  ],
});

function requireSlowEndTurnSaveHole(holes: readonly BattleHole[]): Extract<
  BattleHole,
  { readonly kind: "savingThrowOutcome" }
> & {
  readonly slowActivePenaltiesEndTurnSave: unknown;
} {
  const hole = requireHole(holes, "savingThrowOutcome");
  if (!("slowActivePenaltiesEndTurnSave" in hole)) {
    throw new Error("Expected Slow end-turn Saving Throw outcome hole.");
  }
  return hole;
}

function requireSlowSomaticSpellFailureHole(
  holes: readonly BattleHole[],
): Extract<BattleHole, { readonly kind: "slowSomaticSpellFailureOutcome" }> {
  return requireHole(holes, "slowSomaticSpellFailureOutcome");
}

function slowSomaticSpellFailureFill(
  hole: Extract<
    BattleHole,
    { readonly kind: "slowSomaticSpellFailureOutcome" }
  >,
  spellFailed: boolean,
): Extract<BattleFill, { readonly kind: "slowSomaticSpellFailureOutcome" }> {
  return {
    kind: "slowSomaticSpellFailureOutcome",
    holeId: hole.holeId,
    value: { spellFailed },
  };
}
