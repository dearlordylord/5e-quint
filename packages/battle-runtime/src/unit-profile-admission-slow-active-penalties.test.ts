// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-SLOW-ACTIVE-PENALTIES-RUNTIME slow
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-slow-active-penalties
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE
import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import { describe, expect, test } from "vitest";
import {
  activeEffectArmorClass,
  combatantCanTakeReactions,
} from "./battle-reducer/creature-state.ts";
import { effectiveWalkSpeed } from "./battle-reducer/movement-speed.ts";
import { savingThrowFlatBonusProjections } from "./battle-reducer/spells-damage-fills.ts";
import {
  combatantId,
  elapsedTimeTicks,
  endTurn,
  maybeSpellAct,
  requireCombatant,
  requireHole,
  resolveBattleSubject,
  savingThrowOutcomeFill,
  singleTargetSavingThrowOutcomeFill,
  slowUnitId,
  spellAct,
  spellCasterId,
  spellSlotInvocationRef,
  spellTargetId,
} from "./unit-profile-admission-test-support.ts";
import type {
  BattleFill,
  BattleHole,
  BattleSpellSavingThrowOutcomeHole,
  BattleState,
  CombatantId,
} from "./unit-profile-admission-test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";

const slowExtraTargetId = combatantId("unit-profile-slow-extra-target");

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

    expect(maybeSpellAct({ state, spellId: slowUnitId, slotLevel: 2 })).toBe(
      undefined,
    );
    const act = spellAct({
      state,
      spellId: slowUnitId,
      slotLevel: 3,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(slowUnitId, 3, "slowActivePenalties"),
      mode: { tag: "cast" },
    });

    const savingThrow = requireSpellSavingThrowOutcomeHole(act.initialHoles);
    expect(savingThrow).toEqual(
      expect.objectContaining({
        label: "Slow point-origin Cube Saving Throw outcomes",
        ability: "wis",
        dc: { kind: "caster_spell_save_dc" },
      }),
    );
    expect(savingThrow.spell).toEqual(
      expect.objectContaining({
        procedure: "slowActivePenalties",
        spell,
        resource: { tag: "spellSlot", slotLevel: 3 },
        targeting: { kind: "pointOriginCube", sideFeet: 40 },
        maxTargets: 6,
        rangeFeet: 120,
        durationTicks: elapsedTimeTicks(10),
      }),
    );

    const baseTarget = requireCombatant(state, spellTargetId);
    const baseArmorClass = Number(
      currentArmorClass(activeEffectArmorClass(baseTarget)),
    );
    const cast = resolveBattleSubject({
      state,
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
        sourceSpellId: slowUnitId,
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
    expect(Number(effectiveWalkSpeed(target))).toBe(15);
    expect(Number(currentArmorClass(activeEffectArmorClass(target)))).toBe(
      baseArmorClass - 2,
    );
    expect(savingThrowFlatBonusProjections(cast.state, "dex")).toEqual([
      {
        targetId: spellTargetId,
        sourceSpellId: slowUnitId,
        bonus: -2,
      },
    ]);
    expect(savingThrowFlatBonusProjections(cast.state, "wis")).toEqual([]);
    expect(combatantCanTakeReactions(target)).toBe(false);
    expect(requireCombatant(cast.state, spellCasterId).concentration).toEqual({
      sourceSpellId: slowUnitId,
      effectKind: "spellEffect",
    });
  });

  test("Slow rejects generic area save fills without Cube and chosen-creature witnesses", () => {
    const state = spellBattle({
      preparedSpells: [spellRecord(slowUnitId)],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const act = spellAct({ state, spellId: slowUnitId, slotLevel: 3 });
    const savingThrow = requireSpellSavingThrowOutcomeHole(act.initialHoles);

    const cast = resolveBattleSubject({
      state,
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
    expect(Number(effectiveWalkSpeed(slowed))).toBe(15);
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
    const repeatSave = requireSlowEndTurnSaveHole(targetTurnNeedsSave.holes);
    expect(repeatSave).toEqual(
      expect.objectContaining({
        ability: "wis",
        dc: { kind: "caster_spell_save_dc" },
        slowActivePenaltiesEndTurnSave: {
          targetId: spellTargetId,
          sourceSpellId: slowUnitId,
          sourceCombatantId: spellCasterId,
          save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
        },
      }),
    );

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
    expect(Number(effectiveWalkSpeed(target))).toBe(30);
    expect(combatantCanTakeReactions(target)).toBe(true);
    expect(savingThrowFlatBonusProjections(saved.state, "dex")).toEqual([]);
    expect(
      requireCombatant(saved.state, spellCasterId).concentration,
    ).toBeNull();
  });
});

function castFailedSlow(state: BattleState): BattleState {
  const act = spellAct({ state, spellId: slowUnitId, slotLevel: 3 });
  const savingThrow = requireSpellSavingThrowOutcomeHole(act.initialHoles);
  const cast = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      slowSavingThrowOutcomeFill(savingThrow, [
        { targetId: spellTargetId, succeeded: false },
      ]),
    ],
  });
  if (cast.tag !== "resolved") {
    throw new Error(`Expected Slow cast to resolve: ${JSON.stringify(cast)}`);
  }
  return cast.state;
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
  if (!("spell" in hole)) {
    throw new Error("Expected spell Saving Throw outcome hole.");
  }
  return hole;
}

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
