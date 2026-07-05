// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L5-C17-HASTE-POSITIVE-RUNTIME haste
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L5-C18-HASTE-LETHARGY-RUNTIME haste
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L5-C17-HASTE-POSITIVE-RUNTIME haste
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L5-C18-HASTE-LETHARGY-RUNTIME haste
// UNIT-IDENTITY-REPLAY: L5-C17-HASTE-POSITIVE-RUNTIME haste doReplayHastePositiveEffects
// UNIT-IDENTITY-REPLAY: L5-C18-HASTE-LETHARGY-RUNTIME haste doReplayHasteLethargy
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-haste-positive
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.HASTE_POSITIVE_EFFECTS
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.HASTE_LETHARGY_LIFECYCLE
import {
  canSpendAction,
  spendAction,
} from "@dnd/shared-algebras/action-economy-algebra";
import { describe, expect, test } from "vitest";

import { battleCreatureWithSpellActiveEffects } from "./active-effect/lifecycle.ts";
import { effectiveWalkSpeed } from "./battle-reducer/movement-speed.ts";
import { openClassFeatureExtraAttackResource } from "./battle-reducer/attack-resolution.ts";
import { savingThrowRollModeProjections } from "./battle-reducer/spells-damage-fills.ts";
import { savingThrowOutcomeFill } from "./battle-runtime-test-support.ts";
import {
  extraAttackSupportProfile,
  fighterExtraAttackUnitId,
  hasteUnitId,
  spellCasterId,
  spellTargetId,
  unitLibrary,
} from "./unit-profile-admission-catalog-support.ts";
import {
  requireCombatant,
  requireHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  knownWillingSpellTargetFill,
  spellAct,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  battleUnitRefWithSupportProfiles,
  breakBattleConcentration,
  Either,
  elapsedTimeTicks,
  endTurn,
  hasCondition,
  applyCondition,
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./unit-profile-admission-test-support.ts";
import { defineSelectedIdentityReplayWitness } from "./selected-identity-witness.ts";
import type { RuntimeActionResource } from "@dnd/shared-algebras/action-economy-algebra";
import type {
  BattleActiveEffect,
  BattleCreatureState,
  BattleState,
  CombatantId,
} from "./unit-profile-admission-test-support.ts";

const syntheticTargetConcentrationSpellId =
  "synthetic_target_concentration_spell";
const syntheticSleepRepeatSaveSpellId = "synthetic_sleep_repeat_save";

describe("L5-C17/L5-C18 Haste runtime profile", () => {
  test("admits Haste as a level-3 Magic Action spell and applies positive effects", () => {
    const spell = spellRecord(hasteUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      targetUnitRefs: [extraAttackBattleUnitRef()],
    });
    const act = spellAct({ state, spellId: hasteUnitId, slotLevel: 3 });
    const targetHole = requireHole(act.initialHoles, "targetChoice");

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(hasteUnitId, 3, "hastePositive"),
      mode: { tag: "cast" },
    });

    const resolved = resolveHaste({
      state,
      subject: act.subject,
      targetHole,
    });

    expect(resolved.snapshot).toMatchObject({
      combatants: [
        expect.objectContaining({
          combatantId: spellCasterId,
          concentrating: true,
        }),
        expect.objectContaining({
          combatantId: spellTargetId,
          armorClass: 12,
          movement: expect.objectContaining({ speedFeet: 60 }),
        }),
      ],
    });
    expect(resolved.state.currentTurnResources.actionResources).toEqual([]);
    const caster = requireCombatant(resolved.state, spellCasterId);
    expect(caster.origin.kind).toBe("character");
    if (caster.origin.kind !== "character") return;
    expect(caster.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 3, count: 1, expended: 1 },
    ]);

    const target = requireCombatant(resolved.state, spellTargetId);
    expect(Number(effectiveWalkSpeed(target))).toBe(60);
    expect(target.activeEffects.map((effect) => effect.kind)).toEqual(
      expect.arrayContaining([
        "speedRatio",
        "spellArmorClassBonus",
        "savingThrowRollMode",
        "spellGrantedActionResource",
      ]),
    );
    expect(savingThrowRollModeProjections(resolved.state, "dex")).toEqual([
      { targetId: spellTargetId, rollMode: "advantage" },
    ]);
    expect(savingThrowRollModeProjections(resolved.state, "con")).toEqual([]);

    const targetTurn = endTurn({
      state: resolved.state,
      actorId: spellCasterId,
    });
    expect(targetTurn.tag).toBe("resolved");
    if (targetTurn.tag !== "resolved") return;

    const spellEffectResource =
      targetTurn.state.currentTurnResources.actionResources[1];
    expect(targetTurn.state.currentTurnResources.actionResources).toEqual([
      { kind: "action", source: "turn" },
      expect.objectContaining({
        kind: "action",
        source: "spellEffect",
        sourceOwnerId: spellCasterId,
        sourceSpellId: hasteUnitId,
        restriction: {
          kind: "allow_only",
          actions: [
            {
              action: "attack",
              attackLimit: { kind: "attack_count", count: 1 },
            },
            { action: "dash" },
            { action: "disengage" },
            { action: "hide" },
            { action: "utilize" },
          ],
        },
      }),
    ]);
    expect(spellEffectResource).toBeDefined();
    if (spellEffectResource === undefined) return;

    const ordinaryActionSpent = spendAction(
      targetTurn.state.currentTurnResources,
      "magic",
    );
    expect(Either.isRight(ordinaryActionSpent)).toBe(true);
    if (Either.isLeft(ordinaryActionSpent)) return;
    expect(canSpendAction(ordinaryActionSpent.right, "magic")).toBe(false);
    expect(canSpendAction(ordinaryActionSpent.right, "dash")).toBe(true);

    const noExtraAttackFromHasteAction = openClassFeatureExtraAttackResource({
      state: stateAfterSpendingResource(targetTurn.state, spellEffectResource),
      actorId: spellTargetId,
      spentResource: spellEffectResource,
    });
    expect(
      noExtraAttackFromHasteAction.actionResources.some(
        (resource) => resource.source === "classFeatureExtraAttack",
      ),
    ).toBe(false);
  });

  test("grants the spell action resource immediately when Haste targets the current actor", () => {
    const spell = spellRecord(hasteUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const act = spellAct({ state, spellId: hasteUnitId, slotLevel: 3 });
    const targetHole = requireHole(act.initialHoles, "targetChoice");

    const resolved = resolveHaste({
      state,
      subject: act.subject,
      targetHole,
      targetId: spellCasterId,
    });

    expect(resolved.state.currentTurnResources.actionResources).toEqual([
      expect.objectContaining({
        kind: "action",
        source: "spellEffect",
        sourceOwnerId: spellCasterId,
        sourceSpellId: hasteUnitId,
      }),
    ]);
    expect(canSpendAction(resolved.state.currentTurnResources, "dash")).toBe(
      true,
    );
    expect(canSpendAction(resolved.state.currentTurnResources, "magic")).toBe(
      false,
    );
  });

  test("removes the current-turn spell action resource when self-cast Haste ends", () => {
    const spell = spellRecord(hasteUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const act = spellAct({ state, spellId: hasteUnitId, slotLevel: 3 });
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const resolved = resolveHaste({
      state,
      subject: act.subject,
      targetHole,
      targetId: spellCasterId,
    });

    expect(canSpendAction(resolved.state.currentTurnResources, "dash")).toBe(
      true,
    );

    const ended = breakBattleConcentration(resolved.state, spellCasterId);
    const caster = requireCombatant(ended, spellCasterId);
    expect(caster.concentration).toBeNull();
    expect(hasCondition(caster.conditions, "incapacitated")).toBe(true);
    expect(Number(effectiveWalkSpeed(caster))).toBe(0);
    expect(
      caster.activeEffects.some(
        (effect) =>
          effect.kind === "spellGrantedActionResource" &&
          effect.sourceSpellId === hasteUnitId,
      ),
    ).toBe(false);
    expect(ended.currentTurnResources.actionResources).toEqual([]);
    expect(canSpendAction(ended.currentTurnResources, "dash")).toBe(false);
  });

  test("promotes source-owned lethargy when Haste concentration ends", () => {
    const spell = spellRecord(hasteUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const act = spellAct({ state, spellId: hasteUnitId, slotLevel: 3 });
    const resolved = resolveHaste({
      state,
      subject: act.subject,
      targetHole: requireHole(act.initialHoles, "targetChoice"),
    });

    const ended = breakBattleConcentration(resolved.state, spellCasterId);
    const caster = requireCombatant(ended, spellCasterId);
    const target = requireCombatant(ended, spellTargetId);

    expect(caster.concentration).toBeNull();
    expect(hasHastePositiveEffects(target)).toBe(false);
    expect(hasCondition(target.conditions, "incapacitated")).toBe(true);
    expect(Number(effectiveWalkSpeed(target))).toBe(0);
    expect(hasHasteLethargyCondition(target)).toBe(true);
    expect(hasHasteSpeedZero(target)).toBe(true);
  });

  test("Haste lethargy Incapacitated breaks the target's own Concentration", () => {
    const spell = spellRecord(hasteUnitId);
    const base = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const state = stateWithSyntheticTargetConcentration(base);
    const act = spellAct({ state, spellId: hasteUnitId, slotLevel: 3 });
    const resolved = resolveHaste({
      state,
      subject: act.subject,
      targetHole: requireHole(act.initialHoles, "targetChoice"),
    });

    const ended = breakBattleConcentration(resolved.state, spellCasterId);
    const target = requireCombatant(ended, spellTargetId);

    expect(target.concentration).toBeNull();
    expect(hasSyntheticTargetConcentrationEffect(target)).toBe(false);
    expect(hasCondition(target.conditions, "incapacitated")).toBe(true);
    expect(Number(effectiveWalkSpeed(target))).toBe(0);
    expect(hasHasteLethargyCondition(target)).toBe(true);
    expect(hasHasteSpeedZero(target)).toBe(true);
  });

  test("Sleep repeat-save Haste concentration loss breaks the target's own Concentration", () => {
    const spell = spellRecord(hasteUnitId);
    const base = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const state = stateWithSyntheticTargetConcentration(base);
    const act = spellAct({ state, spellId: hasteUnitId, slotLevel: 3 });
    const resolved = resolveHaste({
      state,
      subject: act.subject,
      targetHole: requireHole(act.initialHoles, "targetChoice"),
    });
    const stateWithRepeatSave = stateWithSleepPendingRepeatSave(
      resolved.state,
      spellCasterId,
    );
    const repeatSaveRequest = endTurn({
      state: stateWithRepeatSave,
      actorId: spellCasterId,
    });
    expect(repeatSaveRequest.tag).toBe("needsHoles");
    if (repeatSaveRequest.tag !== "needsHoles") {
      throw new Error("Expected Sleep repeat-save hole.");
    }
    const repeatSave = requireHole(
      repeatSaveRequest.holes,
      "savingThrowOutcome",
    );

    const ended = endTurn({
      state: stateWithRepeatSave,
      actorId: spellCasterId,
      fills: [
        savingThrowOutcomeFill(repeatSave, [
          { targetId: spellCasterId, succeeded: false },
        ]),
      ],
    });
    expect(ended.tag).toBe("resolved");
    if (ended.tag !== "resolved") return;

    const caster = requireCombatant(ended.state, spellCasterId);
    const target = requireCombatant(ended.state, spellTargetId);
    expect(caster.concentration).toBeNull();
    expect(hasCondition(caster.conditions, "unconscious")).toBe(true);
    expect(target.concentration).toBeNull();
    expect(hasSyntheticTargetConcentrationEffect(target)).toBe(false);
    expect(hasCondition(target.conditions, "incapacitated")).toBe(true);
    expect(Number(effectiveWalkSpeed(target))).toBe(0);
    expect(hasHasteLethargyCondition(target)).toBe(true);
    expect(hasHasteSpeedZero(target)).toBe(true);
  });

  test("expires Haste lethargy at target turn end without removing unrelated Incapacitated", () => {
    const spell = spellRecord(hasteUnitId);
    const base = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const state = stateWithDirectIncapacitated(base, spellTargetId);
    const act = spellAct({ state, spellId: hasteUnitId, slotLevel: 3 });
    const resolved = resolveHaste({
      state,
      subject: act.subject,
      targetHole: requireHole(act.initialHoles, "targetChoice"),
    });
    const ended = breakBattleConcentration(resolved.state, spellCasterId);
    const targetTurn = expectEndTurn(ended, spellCasterId);
    expect(hasHasteSpeedZero(requireCombatant(targetTurn, spellTargetId))).toBe(
      true,
    );

    const afterTargetTurn = expectEndTurn(targetTurn, spellTargetId);
    const target = requireCombatant(afterTargetTurn, spellTargetId);

    expect(hasHasteLethargyCondition(target)).toBe(false);
    expect(hasHasteSpeedZero(target)).toBe(false);
    expect(hasCondition(target.conditions, "incapacitated")).toBe(true);
    expect(Number(effectiveWalkSpeed(target))).toBe(30);
  });

  test("duration expiry applies Haste lethargy and clears caster concentration", () => {
    const spell = spellRecord(hasteUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const act = spellAct({ state, spellId: hasteUnitId, slotLevel: 3 });
    const resolved = resolveHaste({
      state,
      subject: act.subject,
      targetHole: requireHole(act.initialHoles, "targetChoice"),
    });
    const nearExpiry = stateWithHasteDurationTicks(
      resolved.state,
      elapsedTimeTicks(1),
    );

    const targetTurn = expectEndTurn(nearExpiry, spellCasterId);
    const nextRound = expectEndTurn(targetTurn, spellTargetId);
    const caster = requireCombatant(nextRound, spellCasterId);
    const target = requireCombatant(nextRound, spellTargetId);

    expect(caster.concentration).toBeNull();
    expect(hasHastePositiveEffects(target)).toBe(false);
    expect(hasCondition(target.conditions, "incapacitated")).toBe(true);
    expect(Number(effectiveWalkSpeed(target))).toBe(0);
    expect(hasHasteLethargyCondition(target)).toBe(true);
    expect(hasHasteSpeedZero(target)).toBe(true);
  });

  test("duration expiry into the target's next round turn clears Haste lethargy at that turn end", () => {
    const spell = spellRecord(hasteUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const act = spellAct({ state, spellId: hasteUnitId, slotLevel: 3 });
    const resolved = resolveHaste({
      state,
      subject: act.subject,
      targetHole: requireHole(act.initialHoles, "targetChoice"),
    });
    const nearExpiry = stateWithTargetAlreadyActedAndCasterLast(
      stateWithHasteDurationTicks(resolved.state, elapsedTimeTicks(1)),
    );

    const targetTurn = expectEndTurn(nearExpiry, spellCasterId);
    const targetDuringTurn = requireCombatant(targetTurn, spellTargetId);
    expect(targetTurn.initiative.stillToAct[0].creature).toBe(spellTargetId);
    expect(hasHastePositiveEffects(targetDuringTurn)).toBe(false);
    expect(hasHasteLethargyCondition(targetDuringTurn)).toBe(true);
    expect(hasHasteSpeedZero(targetDuringTurn)).toBe(true);
    expect(Number(effectiveWalkSpeed(targetDuringTurn))).toBe(0);

    const afterTargetTurn = expectEndTurn(targetTurn, spellTargetId);
    const caster = requireCombatant(afterTargetTurn, spellCasterId);
    const target = requireCombatant(afterTargetTurn, spellTargetId);

    expect(caster.concentration).toBeNull();
    expect(hasHastePositiveEffects(target)).toBe(false);
    expect(hasHasteLethargyCondition(target)).toBe(false);
    expect(hasHasteSpeedZero(target)).toBe(false);
    expect(hasCondition(target.conditions, "incapacitated")).toBe(false);
    expect(Number(effectiveWalkSpeed(target))).toBe(30);
  });

  test("recasting Haste starts the new spell after old Haste lethargy is promoted", () => {
    const spell = spellRecord(hasteUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 2 }],
    });
    const firstAct = spellAct({ state, spellId: hasteUnitId, slotLevel: 3 });
    const first = resolveHaste({
      state,
      subject: firstAct.subject,
      targetHole: requireHole(firstAct.initialHoles, "targetChoice"),
    });
    const targetTurn = expectEndTurn(first.state, spellCasterId);
    const nextCasterTurn = expectEndTurn(targetTurn, spellTargetId);
    const secondAct = spellAct({
      state: nextCasterTurn,
      spellId: hasteUnitId,
      slotLevel: 3,
    });
    const second = resolveHaste({
      state: nextCasterTurn,
      subject: secondAct.subject,
      targetHole: requireHole(secondAct.initialHoles, "targetChoice"),
    });
    const caster = requireCombatant(second.state, spellCasterId);
    const target = requireCombatant(second.state, spellTargetId);

    expect(caster.concentration).toEqual(
      expect.objectContaining({
        effectKind: "spellEffect",
        sourceSpellId: hasteUnitId,
      }),
    );
    expect(hasHastePositiveEffects(target)).toBe(true);
    expect(hasHasteLethargyCondition(target)).toBe(true);
    expect(hasHasteSpeedZero(target)).toBe(true);
    expect(hasCondition(target.conditions, "incapacitated")).toBe(true);
    expect(Number(effectiveWalkSpeed(target))).toBe(0);
  });
});

function resolveHaste(input: {
  readonly state: BattleState;
  readonly subject: ReturnType<typeof spellAct>["subject"];
  readonly targetHole: Extract<
    ReturnType<typeof spellAct>["initialHoles"][number],
    { readonly kind: "targetChoice" }
  >;
  readonly targetId?: CombatantId;
}) {
  const targetId = input.targetId ?? spellTargetId;
  const resolved = resolveBattleSubject({
    state: input.state,
    subject: input.subject,
    fills: [
      knownWillingSpellTargetFill(
        input.targetHole,
        hasteUnitId,
        spellCasterId,
        targetId,
      ),
    ],
  });
  expect(resolved.tag).toBe("resolved");
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Haste positive effects to resolve.");
  }
  return resolved;
}

function expectEndTurn(state: BattleState, actorId: CombatantId): BattleState {
  const resolved = endTurn({ state, actorId });
  expect(resolved.tag).toBe("resolved");
  if (resolved.tag !== "resolved") {
    throw new Error(`Expected ${actorId} to end its turn.`);
  }
  return resolved.state;
}

function hasHastePositiveEffects(combatant: BattleCreatureState): boolean {
  return combatant.activeEffects.some(
    (effect) =>
      isHastePositiveEffectKind(effect.kind) &&
      "sourceSpellId" in effect &&
      effect.sourceSpellId === hasteUnitId &&
      effect.sourceCombatantId === spellCasterId,
  );
}

function isHastePositiveEffectKind(kind: BattleActiveEffect["kind"]): boolean {
  return (
    kind === "speedRatio" ||
    kind === "spellArmorClassBonus" ||
    kind === "savingThrowRollMode" ||
    kind === "spellGrantedActionResource" ||
    kind === "spellEndTargetState"
  );
}

function hasHasteLethargyCondition(combatant: BattleCreatureState): boolean {
  return combatant.activeEffects.some(
    (effect) =>
      effect.kind === "spellCondition" &&
      effect.sourceSpellId === hasteUnitId &&
      effect.sourceCombatantId === spellCasterId &&
      effect.condition === "incapacitated",
  );
}

function hasHasteSpeedZero(combatant: BattleCreatureState): boolean {
  return combatant.activeEffects.some(
    (effect) =>
      effect.kind === "spellSpeedZero" &&
      effect.sourceSpellId === hasteUnitId &&
      effect.sourceCombatantId === spellCasterId,
  );
}

function stateWithSyntheticTargetConcentration(
  state: BattleState,
): BattleState {
  const target = requireCombatant(state, spellTargetId);
  const concentrationEffect: BattleActiveEffect = {
    kind: "spellArmorClassBonus",
    sourceSpellId: syntheticTargetConcentrationSpellId,
    sourceCombatantId: spellTargetId,
    bonus: 1,
    negatedSpellIds: [],
    expiresAt: {
      kind: "concentration",
      combatantId: spellTargetId,
    },
  };
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellTargetId, {
      ...target,
      concentration: {
        effectKind: "spellEffect",
        sourceSpellId: syntheticTargetConcentrationSpellId,
      },
      activeEffects: [...target.activeEffects, concentrationEffect],
    }),
  };
}

function hasSyntheticTargetConcentrationEffect(
  combatant: BattleCreatureState,
): boolean {
  return combatant.activeEffects.some(
    (effect) =>
      "sourceSpellId" in effect &&
      effect.sourceSpellId === syntheticTargetConcentrationSpellId &&
      effect.sourceCombatantId === spellTargetId,
  );
}

function stateWithSleepPendingRepeatSave(
  state: BattleState,
  combatantId: CombatantId,
): BattleState {
  const combatant = requireCombatant(state, combatantId);
  const sleepPendingEffect: BattleActiveEffect = {
    kind: "sleepPendingRepeatSave",
    sourceSpellId: syntheticSleepRepeatSaveSpellId,
    sourceCombatantId: spellTargetId,
    conditionHadNonSpellSource: false,
    save: {
      ability: "wis",
      dc: { kind: "caster_spell_save_dc" },
    },
    repeatAt: {
      kind: "endOfTurn",
      combatantId,
      round: state.initiative.round,
    },
    expiresAt: {
      kind: "concentration",
      combatantId: spellTargetId,
    },
  };
  return {
    ...state,
    combatants: new Map(state.combatants).set(
      combatantId,
      battleCreatureWithSpellActiveEffects(combatant, [
        ...combatant.activeEffects,
        sleepPendingEffect,
      ]),
    ),
  };
}

function stateWithDirectIncapacitated(
  state: BattleState,
  combatantId: CombatantId,
): BattleState {
  const combatant = requireCombatant(state, combatantId);
  if (combatant.positiveHpUnconscious !== null) {
    throw new Error(
      "Expected direct Incapacitated fixture target to be awake.",
    );
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(combatantId, {
      ...combatant,
      conditions: applyCondition(combatant.conditions, "incapacitated"),
    }),
  };
}

function stateWithHasteDurationTicks(
  state: BattleState,
  ticks: Extract<
    Extract<
      BattleActiveEffect,
      { readonly kind: "spellEndTargetState" }
    >["expiresAt"],
    { readonly kind: "concentration" }
  >["durationTicks"],
): BattleState {
  return {
    ...state,
    combatants: new Map(
      [...state.combatants].map(([combatantId, combatant]) => [
        combatantId,
        {
          ...combatant,
          activeEffects: combatant.activeEffects.map((effect) =>
            effectIsOwnedByHaste(effect) &&
            "expiresAt" in effect &&
            effect.expiresAt.kind === "concentration" &&
            effect.expiresAt.durationTicks !== undefined
              ? // The guards above prove this is a BattleActiveEffect with a
                // tickable Concentration expiration; the spread only replaces
                // that branded duration count.
                ({
                  ...effect,
                  expiresAt: { ...effect.expiresAt, durationTicks: ticks },
                } as BattleActiveEffect)
              : effect,
          ),
        },
      ]),
    ),
  };
}

function stateWithTargetAlreadyActedAndCasterLast(
  state: BattleState,
): BattleState {
  const entries = [
    ...state.initiative.alreadyActed,
    ...state.initiative.stillToAct,
  ];
  const targetEntry = entries.find((entry) => entry.creature === spellTargetId);
  const casterEntry = entries.find((entry) => entry.creature === spellCasterId);
  if (targetEntry === undefined || casterEntry === undefined) {
    throw new Error("Expected Haste fixture initiative entries.");
  }
  const initiative: BattleState["initiative"] = {
    ...state.initiative,
    alreadyActed: [targetEntry],
    stillToAct: [casterEntry],
  };
  return { ...state, initiative };
}

function effectIsOwnedByHaste(effect: BattleActiveEffect): boolean {
  return (
    "sourceSpellId" in effect &&
    effect.sourceSpellId === hasteUnitId &&
    effect.sourceCombatantId === spellCasterId
  );
}

function extraAttackBattleUnitRef() {
  const unit = unitLibrary.requireUnit(fighterExtraAttackUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(unitRef).toEqual(
    Either.right({
      unitId: fighterExtraAttackUnitId,
      supportProfiles: [extraAttackSupportProfile],
    }),
  );
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

function stateAfterSpendingResource(
  state: BattleState,
  spentResource: RuntimeActionResource,
): BattleState {
  return {
    ...state,
    currentTurnResources: {
      ...state.currentTurnResources,
      actionResources: state.currentTurnResources.actionResources.filter(
        (resource) => resource !== spentResource,
      ),
    },
  };
}

defineSelectedIdentityReplayWitness({
  describeLabel: "L5-C17/L5-C18 Haste selected identity replay",
  taskId: "L5-C17-HASTE-POSITIVE-RUNTIME",
  initialProjection: {
    unitId: hasteUnitId,
    procedure: "initial",
    targetHasHaste: false,
    targetLethargic: false,
  },
  units: [
    {
      unitId: hasteUnitId,
      procedures: [
        {
          actionName: "doReplayHastePositiveEffects",
          projectionAfter: {
            unitId: hasteUnitId,
            procedure: "hastePositive",
            targetHasHaste: true,
            targetLethargic: false,
          },
          discover: () => {
            const resolved = replayHasteCast();
            return {
              unitId: hasteUnitId,
              procedure: "hastePositive",
              targetHasHaste: hasHastePositiveEffects(
                requireCombatant(resolved.state, spellTargetId),
              ),
              targetLethargic: hasCondition(
                requireCombatant(resolved.state, spellTargetId).conditions,
                "incapacitated",
              ),
            };
          },
        },
        {
          actionName: "doReplayHasteLethargy",
          projectionAfter: {
            unitId: hasteUnitId,
            procedure: "hasteLethargy",
            targetHasHaste: false,
            targetLethargic: true,
          },
          discover: () => {
            const resolved = replayHasteCast();
            const ended = breakBattleConcentration(
              resolved.state,
              spellCasterId,
            );
            const target = requireCombatant(ended, spellTargetId);
            return {
              unitId: hasteUnitId,
              procedure: "hasteLethargy",
              targetHasHaste: hasHastePositiveEffects(target),
              targetLethargic: hasCondition(target.conditions, "incapacitated"),
            };
          },
        },
      ],
    },
  ],
});

function replayHasteCast(): {
  readonly state: BattleState;
} {
  const spell = spellRecord(hasteUnitId);
  const state = spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 3, count: 1 }],
  });
  const act = spellAct({ state, spellId: hasteUnitId, slotLevel: 3 });
  return resolveHaste({
    state,
    subject: act.subject,
    targetHole: requireHole(act.initialHoles, "targetChoice"),
  });
}
