// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-D20-LIFECYCLE ray_of_enfeeblement
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-ray-of-enfeeblement-d20-lifecycle
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-ray-of-enfeeblement-damage-penalty
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_D20_LIFECYCLE BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_DAMAGE_PENALTY
import { describe, expect, test } from "vitest";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { abilityModifier } from "@dnd/shared-algebras/armor-class-algebra";
import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import rayOfEnfeeblementInput from "../../surface/content/ray_of_enfeeblement.json";
import {
  consumeSelfAttackRollEffects,
  requiredAttackRollMode,
} from "./battle-reducer/attack-roll.ts";
import { requiredAbilityCheckRollMode } from "./battle-reducer/hole-helpers.ts";
import { savingThrowRollModeProjections } from "./battle-reducer/spells-damage-fills.ts";
import { breakBattleConcentration } from "./battle-reducer/damage-apply.ts";
import { sourceDamageRollPenaltyRollHole } from "./battle-reducer/damage-helpers.ts";
import {
  heatMetalUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  attackRollFill,
  attackTargetFill,
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  requireResultHole,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  requireSpellDamageReductionHole,
  savingThrowOutcomeFill,
  spellAct,
  spellManufacturedMetalObjectTargetFill,
  spellObjectContactTargetsFill,
  spellObjectTargetFill,
  spellTargetFill,
  spellTargetListFill,
  withResistanceEffect,
} from "./unit-profile-admission-spell-fill-support.ts";
import {
  damageAmount,
  Hp,
  proficiencyBonus,
  resourceCount,
  spellSlotLevel,
} from "@dnd/shared/types";
import { spellSavingThrowOutcomeHole } from "./battle-reducer/spells-damage-fills.ts";
import { supportedPreparedAbilityD20TestRollModeSaveGateProfile } from "./battle-reducer/spells-profiles-save-gates.ts";
import { resolveAbilityD20TestRollModeSaveGateSpellAct } from "./battle-reducer/spells-resolve-save-gates.ts";
import { spellFillSet } from "./battle-reducer/spells-resolve-fill-set.ts";
import { spellTargetListHole } from "./battle-reducer/spells-holes-fills.ts";
import { supportedSpellInvocationRef } from "./battle-reducer/spells-invocation-ref.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import { endTurn } from "./unit-profile-admission-test-support.ts";
import {
  battleObjectId,
  combatantId,
  discoverBattleActs,
  resolveBattleSubject,
  type BattleFill,
  type BattleHole,
  type BattleState,
  type SupportedSpellInvocation,
} from "./index.ts";

const rayOfEnfeeblementUnitId = "ray_of_enfeeblement";

function rayOfEnfeeblementSpell(): SpellRecord {
  const unit = decodeUnitRecordSync(rayOfEnfeeblementInput);
  expect(unit.kind).toBe("spell");
  return unit as SpellRecord;
}

function rayOfEnfeeblementInvocation(
  spell: SpellRecord,
): Extract<
  SupportedSpellInvocation,
  { readonly procedure: "abilityD20TestRollModeSaveGate" }
> {
  const invocation = supportedPreparedAbilityD20TestRollModeSaveGateProfile(
    spellCasterId,
    spell,
    [
      {
        spellLevel: spellSlotLevel(2),
        count: resourceCount(1),
        expended: resourceCount(0),
      },
    ],
  )[0];
  expect(invocation).toBeDefined();
  if (invocation?.procedure !== "abilityD20TestRollModeSaveGate") {
    throw new Error("Expected Ray of Enfeeblement D20 lifecycle invocation.");
  }
  return invocation;
}

function resolveRayOfEnfeeblementCast(input: {
  readonly state: BattleState;
  readonly spell: SpellRecord;
  readonly succeeded: boolean;
}) {
  const invocation = rayOfEnfeeblementInvocation(input.spell);
  const targetHole = spellTargetListHole(
    input.state,
    spellCasterId,
    invocation,
  );
  const saveHole = spellSavingThrowOutcomeHole(
    input.state,
    spellCasterId,
    invocation,
  );
  const targetFill = spellTargetListFill(
    targetHole,
    spellCasterId,
    rayOfEnfeeblementUnitId,
    [spellTargetId],
  );
  const saveFill = savingThrowOutcomeFill(saveHole, [
    { targetId: spellTargetId, succeeded: input.succeeded },
  ]);
  const fills = [targetFill, saveFill];
  const fillSet = spellFillSet(fills, invocation);
  expect(fillSet.tag).toBe("ok");
  if (fillSet.tag !== "ok") {
    throw new Error(fillSet.message);
  }
  return resolveAbilityD20TestRollModeSaveGateSpellAct({
    input: {
      state: input.state,
      subject: {
        tag: "actionSpell",
        actorId: spellCasterId,
        invocation: supportedSpellInvocationRef(invocation),
        mode: { tag: "cast" },
      },
      fills,
    },
    actorId: spellCasterId,
    invocation,
    fillSet,
  });
}

describe("Ray of Enfeeblement D20 lifecycle profile admission", () => {
  test("success applies one next-attack Disadvantage until caster turn start", () => {
    const spell = rayOfEnfeeblementSpell();
    const baseState = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      casterClassLevels: [{ className: "wizard", level: 3 }],
    });
    const cast = resolveRayOfEnfeeblementCast({
      state: baseState,
      spell,
      succeeded: true,
    });

    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const target = requireCombatant(cast.state, spellTargetId);
    expect(requireCombatant(cast.state, spellCasterId).concentration).toEqual(
      expect.objectContaining({ sourceSpellId: rayOfEnfeeblementUnitId }),
    );
    expect(target.activeEffects).toContainEqual(
      expect.objectContaining({
        kind: "nextAttackRollBySelf",
        sourceSpellId: rayOfEnfeeblementUnitId,
        mode: "disadvantage",
      }),
    );
    expect(
      requiredAttackRollMode(
        cast.state,
        spellTargetId,
        spellCasterId,
        zeroAbilityWeaponAttack("weapon_longsword"),
      ),
    ).toBe("disadvantage");
    const afterConsumedAttack = consumeSelfAttackRollEffects(
      cast.state,
      spellTargetId,
    );
    expect(
      requireCombatant(afterConsumedAttack, spellTargetId).activeEffects.some(
        (effect) => effect.kind === "nextAttackRollBySelf",
      ),
    ).toBe(false);
    expect(
      requireCombatant(afterConsumedAttack, spellCasterId).concentration,
    ).toBe(null);

    const castForStartTurnExpiry = resolveRayOfEnfeeblementCast({
      state: baseState,
      spell,
      succeeded: true,
    });
    expect(castForStartTurnExpiry.tag).toBe("resolved");
    if (castForStartTurnExpiry.tag !== "resolved") return;
    const targetTurn = endTurn({
      state: castForStartTurnExpiry.state,
      actorId: spellCasterId,
    });
    expect(targetTurn.tag).toBe("resolved");
    if (targetTurn.tag !== "resolved") return;
    const casterNextTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    expect(casterNextTurn.tag).toBe("resolved");
    if (casterNextTurn.tag !== "resolved") return;
    expect(
      requireCombatant(casterNextTurn.state, spellTargetId).activeEffects.some(
        (effect) => effect.kind === "nextAttackRollBySelf",
      ),
    ).toBe(false);
    expect(
      requireCombatant(casterNextTurn.state, spellCasterId).concentration,
    ).toBe(null);

    const afterConcentration = breakBattleConcentration(
      cast.state,
      spellCasterId,
    );
    expect(
      requireCombatant(afterConcentration, spellTargetId).activeEffects.some(
        (effect) => effect.kind === "nextAttackRollBySelf",
      ),
    ).toBe(false);
  });

  test("failed save applies Strength D20 Disadvantage and repeat-save cleanup", () => {
    const spell = rayOfEnfeeblementSpell();
    const baseState = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      casterClassLevels: [{ className: "wizard", level: 3 }],
    });
    const cast = resolveRayOfEnfeeblementCast({
      state: baseState,
      spell,
      succeeded: false,
    });

    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    expect(requiredAbilityCheckRollMode(cast.state, spellTargetId, "str")).toBe(
      "disadvantage",
    );
    expect(
      savingThrowRollModeProjections(cast.state, "str").some(
        (projection) =>
          projection.targetId === spellTargetId &&
          projection.rollMode === "disadvantage",
      ),
    ).toBe(true);
    expect(
      requiredAttackRollMode(
        cast.state,
        spellTargetId,
        spellCasterId,
        zeroAbilityWeaponAttack("weapon_longsword"),
      ),
    ).toBe("disadvantage");

    const afterConcentrationBreak = breakBattleConcentration(
      cast.state,
      spellCasterId,
    );
    expect(
      requireCombatant(
        afterConcentrationBreak,
        spellTargetId,
      ).activeEffects.some(
        (effect) => effect.kind === "abilityD20TestRollModeEndTurnSave",
      ),
    ).toBe(false);
    expect(
      requireCombatant(afterConcentrationBreak, spellCasterId).concentration,
    ).toBe(null);

    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    expect(targetTurn.tag).toBe("resolved");
    if (targetTurn.tag !== "resolved") return;
    const repeatSaveRequest = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    const repeatSaveHole = requireHole(
      repeatSaveRequest.tag === "needsHoles" ? repeatSaveRequest.holes : [],
      "savingThrowOutcome",
    );
    expect(repeatSaveHole).toHaveProperty("abilityD20TestRollModeEndTurnSave");
    const repeated = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [
        savingThrowOutcomeFill(repeatSaveHole, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });
    expect(repeated.tag).toBe("resolved");
    if (repeated.tag !== "resolved") return;
    expect(
      requireCombatant(repeated.state, spellTargetId).activeEffects.some(
        (effect) => effect.kind === "abilityD20TestRollModeEndTurnSave",
      ),
    ).toBe(false);
    expect(requireCombatant(repeated.state, spellCasterId).concentration).toBe(
      null,
    );
  });

  test("failed save subtracts 1d8 from the affected target's damage rolls before concentration damage", () => {
    const spell = rayOfEnfeeblementSpell();
    const baseState = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      casterClassLevels: [{ className: "wizard", level: 3 }],
      targetAttack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const cast = resolveRayOfEnfeeblementCast({
      state: baseState,
      spell,
      succeeded: false,
    });
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;

    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    expect(targetTurn.tag).toBe("resolved");
    if (targetTurn.tag !== "resolved") return;
    const attackAct = discoverBattleActs(targetTurn.state).find(
      (candidate) =>
        candidate.subject.tag === "action" &&
        candidate.subject.action === "attack" &&
        candidate.subject.attackName === "Longsword",
    );
    expect(attackAct).toBeDefined();
    if (attackAct === undefined) return;

    const targetHole = requireHole(attackAct.initialHoles, "targetChoice");
    const targetFill = attackTargetFill(
      targetHole,
      spellTargetId,
      spellCasterId,
      "Longsword",
    );
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: attackAct.subject,
        fills: [targetFill],
      }),
      "attackRoll",
    );
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: attackAct.subject,
        fills: [
          targetFill,
          attackRollFill(attackRoll, {
            total: 18,
            naturalD20: 12,
            rollMode: "disadvantage",
          }),
        ],
      }),
      "rolledDice",
    );
    const penaltyRequest = resolveBattleSubject({
      state: targetTurn.state,
      subject: attackAct.subject,
      fills: [
        targetFill,
        attackRollFill(attackRoll, {
          total: 18,
          naturalD20: 12,
          rollMode: "disadvantage",
        }),
        damageRollFillWithGroups(damageRoll, [[6]]),
      ],
    });
    const penaltyRoll = requireResultHole(penaltyRequest, "rolledDice");
    expect(penaltyRoll).toHaveProperty("sourceDamageRollPenalty");
    const stalePenaltyOnMiss = resolveBattleSubject({
      state: targetTurn.state,
      subject: attackAct.subject,
      fills: [
        targetFill,
        attackRollFill(attackRoll, {
          total: 1,
          naturalD20: 1,
          rollMode: "disadvantage",
        }),
        damageRollFillWithGroups(penaltyRoll, [[4]]),
      ],
    });
    expect(stalePenaltyOnMiss).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Attack damage can only be filled after a hit.",
    });

    const concentrationRequest = resolveBattleSubject({
      state: targetTurn.state,
      subject: attackAct.subject,
      fills: [
        targetFill,
        attackRollFill(attackRoll, {
          total: 18,
          naturalD20: 12,
          rollMode: "disadvantage",
        }),
        damageRollFillWithGroups(damageRoll, [[6]]),
        damageRollFillWithGroups(penaltyRoll, [[4]]),
      ],
    });
    const concentration = requireResultHole(
      concentrationRequest,
      "concentrationSavingThrow",
    );
    expect(Number(concentration.damageAmount)).toBe(2);
    const resolved = resolveBattleSubject({
      state:
        concentrationRequest.tag === "needsHoles"
          ? concentrationRequest.state
          : targetTurn.state,
      subject: attackAct.subject,
      fills: [
        targetFill,
        attackRollFill(attackRoll, {
          total: 18,
          naturalD20: 12,
          rollMode: "disadvantage",
        }),
        damageRollFillWithGroups(damageRoll, [[6]]),
        damageRollFillWithGroups(penaltyRoll, [[4]]),
        {
          kind: "concentrationSavingThrow",
          holeId: concentration.holeId,
          value: { succeeded: true },
        } satisfies Extract<
          BattleFill,
          { readonly kind: "concentrationSavingThrow" }
        >,
      ],
    });
    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: spellCasterId, hp: 10 },
          { combatantId: spellTargetId },
        ],
      },
    });
  });

  test("failed save subtracts the penalty before Resistance spell reduction", () => {
    const spell = rayOfEnfeeblementSpell();
    const baseState = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      casterClassLevels: [{ className: "wizard", level: 3 }],
      targetAttack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const cast = resolveRayOfEnfeeblementCast({
      state: baseState,
      spell,
      succeeded: false,
    });
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;

    const stateWithReduction = withResistanceEffect(
      cast.state,
      spellCasterId,
      "slashing",
      false,
    );
    const targetTurn = endTurn({
      state: stateWithReduction,
      actorId: spellCasterId,
    });
    expect(targetTurn.tag).toBe("resolved");
    if (targetTurn.tag !== "resolved") return;
    const attackAct = discoverBattleActs(targetTurn.state).find(
      (candidate) =>
        candidate.subject.tag === "action" &&
        candidate.subject.action === "attack" &&
        candidate.subject.attackName === "Longsword",
    );
    expect(attackAct).toBeDefined();
    if (attackAct === undefined) return;

    const targetHole = requireHole(attackAct.initialHoles, "targetChoice");
    const targetFill = attackTargetFill(
      targetHole,
      spellTargetId,
      spellCasterId,
      "Longsword",
    );
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: attackAct.subject,
        fills: [targetFill],
      }),
      "attackRoll",
    );
    const attackFill = attackRollFill(attackRoll, {
      total: 18,
      naturalD20: 12,
      rollMode: "disadvantage",
    });
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: attackAct.subject,
        fills: [targetFill, attackFill],
      }),
      "rolledDice",
    );
    const penaltyRequest = resolveBattleSubject({
      state: targetTurn.state,
      subject: attackAct.subject,
      fills: [targetFill, attackFill, damageRollFillWithGroups(damageRoll, [[6]])],
    });
    const penaltyRoll = requireResultHole(penaltyRequest, "rolledDice");
    expect(penaltyRoll).toHaveProperty("sourceDamageRollPenalty");

    const reductionRequest = resolveBattleSubject({
      state: targetTurn.state,
      subject: attackAct.subject,
      fills: [
        targetFill,
        attackFill,
        damageRollFillWithGroups(damageRoll, [[6]]),
        damageRollFillWithGroups(penaltyRoll, [[4]]),
      ],
    });
    expect(reductionRequest).toMatchObject({ tag: "needsHoles" });
    if (reductionRequest.tag !== "needsHoles") {
      throw new Error("Expected Resistance reduction roll.");
    }
    const reductionRoll = requireSpellDamageReductionHole(
      reductionRequest.holes,
    );
    expect(reductionRoll.spellDamageReduction).toEqual(
      expect.objectContaining({
        targetId: spellCasterId,
        damageType: "slashing",
      }),
    );

    const concentrationRequest = resolveBattleSubject({
      state: targetTurn.state,
      subject: attackAct.subject,
      fills: [
        targetFill,
        attackFill,
        damageRollFillWithGroups(damageRoll, [[6]]),
        damageRollFillWithGroups(penaltyRoll, [[4]]),
        damageRollFillWithGroups(reductionRoll, [[1]]),
      ],
    });
    const concentration = requireResultHole(
      concentrationRequest,
      "concentrationSavingThrow",
    );
    expect(Number(concentration.damageAmount)).toBe(1);
    const resolved = resolveBattleSubject({
      state:
        concentrationRequest.tag === "needsHoles"
          ? concentrationRequest.state
          : targetTurn.state,
      subject: attackAct.subject,
      fills: [
        targetFill,
        attackFill,
        damageRollFillWithGroups(damageRoll, [[6]]),
        damageRollFillWithGroups(penaltyRoll, [[4]]),
        damageRollFillWithGroups(reductionRoll, [[1]]),
        {
          kind: "concentrationSavingThrow",
          holeId: concentration.holeId,
          value: { succeeded: true },
        } satisfies Extract<
          BattleFill,
          { readonly kind: "concentrationSavingThrow" }
        >,
      ],
    });
    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: spellCasterId, hp: 11 },
          { combatantId: spellTargetId },
        ],
      },
    });
  });

  test("failed save requests a separate penalty roll for spell attack sequence damage", () => {
    const spell = rayOfEnfeeblementSpell();
    const scorchingRay = spellRecord("scorching_ray");
    const baseState = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      casterClassLevels: [{ className: "wizard", level: 3 }],
      targetPreparedSpells: [scorchingRay],
      targetSpellcasting: {
        sourceClassName: "wizard",
        spellcastingAbilityModifier: abilityModifier(3),
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [scorchingRay],
        featurePreparedSpells: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 2, count: 1 }],
      },
    });
    const cast = resolveRayOfEnfeeblementCast({
      state: baseState,
      spell,
      succeeded: false,
    });
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    expect(targetTurn.tag).toBe("resolved");
    if (targetTurn.tag !== "resolved") return;
    expect(
      requireCombatant(targetTurn.state, spellTargetId).activeEffects.some(
        (effect) => effect.kind === "sourceDamageRollPenalty",
      ),
    ).toBe(true);

    const act = spellAct({
      state: targetTurn.state,
      spellId: "scorching_ray",
      slotLevel: 2,
    });
    expect(act.subject.actorId).toBe(spellTargetId);
    const targetFills = targetChoiceHoles(act.initialHoles).map((hole) =>
      spellTargetFill(hole, "scorching_ray", spellTargetId, spellCasterId),
    );
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: act.subject,
        fills: targetFills,
      }),
      "attackRoll",
    );
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: act.subject,
        fills: [
          ...targetFills,
          attackRollFill(attackRoll, {
            total: 18,
            naturalD20: 12,
            rollMode: "normal",
          }),
        ],
      }),
      "rolledDice",
    );
    const penaltyRequest = resolveBattleSubject({
      state: targetTurn.state,
      subject: act.subject,
      fills: [
        ...targetFills,
        attackRollFill(attackRoll, {
          total: 18,
          naturalD20: 12,
          rollMode: "normal",
        }),
        damageRollFillWithGroups(damageRoll, [[3, 3]]),
      ],
    });
    const penaltyRoll = requireResultHole(penaltyRequest, "rolledDice");
    expect(penaltyRoll).toHaveProperty(
      "sourceDamageRollPenalty.affectedCombatantId",
      spellTargetId,
    );
    expect(penaltyRoll).toHaveProperty(
      "sourceDamageRollPenalty.damageRollHoleId",
      damageRoll.holeId,
    );
  });

  test("failed save subtracts the penalty before save-halved spell damage", () => {
    const spell = rayOfEnfeeblementSpell();
    const burningHands = spellRecord("burning_hands");
    const sacredFlame = spellRecord("sacred_flame");
    const baseState = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      casterClassLevels: [{ className: "wizard", level: 3 }],
      targetPreparedSpells: [burningHands],
      targetSpellcasting: {
        sourceClassName: "wizard",
        spellcastingAbilityModifier: abilityModifier(3),
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [sacredFlame],
        preparedSpells: [burningHands],
        featurePreparedSpells: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 2, count: 1 }],
      },
    });
    const cast = resolveRayOfEnfeeblementCast({
      state: baseState,
      spell,
      succeeded: false,
    });
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    expect(targetTurn.tag).toBe("resolved");
    if (targetTurn.tag !== "resolved") return;

    const act = spellAct({
      state: targetTurn.state,
      spellId: "burning_hands",
      slotLevel: 2,
    });
    expect(act.subject.actorId).toBe(spellTargetId);
    const save = requireHole(act.initialHoles, "savingThrowOutcome");
    const saveFill = {
      kind: "savingThrowOutcome",
      holeId: save.holeId,
      value: {
        area: {
          originAnchorId: spellTargetId,
          affectedTargetIds: [spellCasterId],
        },
        outcomes: [{ targetId: spellCasterId, succeeded: true }],
      },
    } satisfies Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>;
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: act.subject,
        fills: [saveFill],
      }),
      "rolledDice",
    );
    const penaltyRequest = resolveBattleSubject({
      state: targetTurn.state,
      subject: act.subject,
      fills: [saveFill, damageRollFillWithGroups(damageRoll, [[5, 5, 5, 5]])],
    });
    const penaltyRoll = requireResultHole(penaltyRequest, "rolledDice");
    expect(
      sourceDamageRollPenaltyHoles(
        penaltyRequest.tag === "needsHoles" ? penaltyRequest.holes : [],
      ),
    ).toHaveLength(1);
    expect(penaltyRoll).toHaveProperty(
      "sourceDamageRollPenalty.damageRollHoleId",
      damageRoll.holeId,
    );
    const noDamageAct = spellAct({
      state: targetTurn.state,
      spellId: "sacred_flame",
    });
    expect(noDamageAct.subject.actorId).toBe(spellTargetId);
    const noDamageTarget = requireHole(
      noDamageAct.initialHoles,
      "targetChoice",
    );
    const noDamageTargetFill = spellTargetFill(
      noDamageTarget,
      "sacred_flame",
      spellTargetId,
      spellCasterId,
    );
    const noDamageSave = requireResultHole(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: noDamageAct.subject,
        fills: [noDamageTargetFill],
      }),
      "savingThrowOutcome",
    );
    const stalePenaltyOnNoDamage = resolveBattleSubject({
      state: targetTurn.state,
      subject: noDamageAct.subject,
      fills: [
        noDamageTargetFill,
        savingThrowOutcomeFill(noDamageSave, [
          { targetId: spellCasterId, succeeded: true },
        ]),
        damageRollFillWithGroups(penaltyRoll, [[4]]),
      ],
    });
    expect(stalePenaltyOnNoDamage).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Save-gate spell damage can only be filled when at least one target takes damage.",
    });
    const concentrationRequest = resolveBattleSubject({
      state: targetTurn.state,
      subject: act.subject,
      fills: [
        saveFill,
        damageRollFillWithGroups(damageRoll, [[5, 5, 5, 5]]),
        damageRollFillWithGroups(penaltyRoll, [[4]]),
      ],
    });
    const concentration = requireResultHole(
      concentrationRequest,
      "concentrationSavingThrow",
    );
    expect(Number(concentration.damageAmount)).toBe(8);
    const resolved = resolveBattleSubject({
      state: targetTurn.state,
      subject: act.subject,
      fills: [
        saveFill,
        damageRollFillWithGroups(damageRoll, [[5, 5, 5, 5]]),
        damageRollFillWithGroups(penaltyRoll, [[4]]),
        {
          kind: "concentrationSavingThrow",
          holeId: concentration.holeId,
          value: { succeeded: true },
        } satisfies Extract<
          BattleFill,
          { readonly kind: "concentrationSavingThrow" }
        >,
      ],
    });
    expect(resolved.tag).toBe("resolved");
    if (resolved.tag !== "resolved") return;
    expect(Number(requireCombatant(resolved.state, spellCasterId).hp)).toBe(4);
  });

  test("failed save composes save-gated damage with target-side Resistance reduction", () => {
    const spell = rayOfEnfeeblementSpell();
    const burningHands = spellRecord("burning_hands");
    const baseState = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      casterClassLevels: [{ className: "wizard", level: 3 }],
      targetPreparedSpells: [burningHands],
      targetSpellcasting: {
        sourceClassName: "wizard",
        spellcastingAbilityModifier: abilityModifier(3),
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [burningHands],
        featurePreparedSpells: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 2, count: 1 }],
      },
    });
    const cast = resolveRayOfEnfeeblementCast({
      state: baseState,
      spell,
      succeeded: false,
    });
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const stateWithReduction = withResistanceEffect(
      cast.state,
      spellCasterId,
      "fire",
      false,
    );
    const targetTurn = endTurn({
      state: stateWithReduction,
      actorId: spellCasterId,
    });
    expect(targetTurn.tag).toBe("resolved");
    if (targetTurn.tag !== "resolved") return;

    const act = spellAct({
      state: targetTurn.state,
      spellId: "burning_hands",
      slotLevel: 2,
    });
    expect(act.subject.actorId).toBe(spellTargetId);
    const save = requireHole(act.initialHoles, "savingThrowOutcome");
    const saveFill = {
      kind: "savingThrowOutcome",
      holeId: save.holeId,
      value: {
        area: {
          originAnchorId: spellTargetId,
          affectedTargetIds: [spellCasterId],
        },
        outcomes: [{ targetId: spellCasterId, succeeded: true }],
      },
    } satisfies Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>;
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: act.subject,
        fills: [saveFill],
      }),
      "rolledDice",
    );
    const penaltyRequest = resolveBattleSubject({
      state: targetTurn.state,
      subject: act.subject,
      fills: [saveFill, damageRollFillWithGroups(damageRoll, [[5, 5, 5, 5]])],
    });
    const penaltyRoll = requireResultHole(penaltyRequest, "rolledDice");
    const reductionRequest = resolveBattleSubject({
      state: targetTurn.state,
      subject: act.subject,
      fills: [
        saveFill,
        damageRollFillWithGroups(damageRoll, [[5, 5, 5, 5]]),
        damageRollFillWithGroups(penaltyRoll, [[4]]),
      ],
    });
    expect(reductionRequest).toMatchObject({ tag: "needsHoles" });
    if (reductionRequest.tag !== "needsHoles") {
      throw new Error("Expected Resistance reduction roll.");
    }
    const reductionRoll = requireSpellDamageReductionHole(
      reductionRequest.holes,
    );
    expect(reductionRoll.spellDamageReduction).toEqual(
      expect.objectContaining({
        targetId: spellCasterId,
        damageType: "fire",
      }),
    );

    const concentrationRequest = resolveBattleSubject({
      state: targetTurn.state,
      subject: act.subject,
      fills: [
        saveFill,
        damageRollFillWithGroups(damageRoll, [[5, 5, 5, 5]]),
        damageRollFillWithGroups(penaltyRoll, [[4]]),
        damageRollFillWithGroups(reductionRoll, [[3]]),
      ],
    });
    const concentration = requireResultHole(
      concentrationRequest,
      "concentrationSavingThrow",
    );
    expect(Number(concentration.damageAmount)).toBe(5);
    const resolved = resolveBattleSubject({
      state:
        concentrationRequest.tag === "needsHoles"
          ? concentrationRequest.state
          : targetTurn.state,
      subject: act.subject,
      fills: [
        saveFill,
        damageRollFillWithGroups(damageRoll, [[5, 5, 5, 5]]),
        damageRollFillWithGroups(penaltyRoll, [[4]]),
        damageRollFillWithGroups(reductionRoll, [[3]]),
        {
          kind: "concentrationSavingThrow",
          holeId: concentration.holeId,
          value: { succeeded: true },
        } satisfies Extract<
          BattleFill,
          { readonly kind: "concentrationSavingThrow" }
        >,
      ],
    });
    expect(resolved.tag).toBe("resolved");
    if (resolved.tag !== "resolved") return;
    expect(Number(requireCombatant(resolved.state, spellCasterId).hp)).toBe(7);
    expect(requireCombatant(resolved.state, spellCasterId).activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "spellDamageReduction",
          usedThisTurn: true,
        }),
      ]),
    );
  });

  test("failed save subtracts the penalty from direct object spell damage rolls", () => {
    const spell = rayOfEnfeeblementSpell();
    const starryWisp = spellRecord("starry_wisp");
    const objectId = battleObjectId("ray-weakened-starry-wisp-object");
    const baseState = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      casterClassLevels: [{ className: "wizard", level: 3 }],
      targetSpellcasting: {
        sourceClassName: "wizard",
        spellcastingAbilityModifier: abilityModifier(3),
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [starryWisp],
        preparedSpells: [],
        featurePreparedSpells: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [],
      },
    });
    const cast = resolveRayOfEnfeeblementCast({
      state: baseState,
      spell,
      succeeded: false,
    });
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    expect(targetTurn.tag).toBe("resolved");
    if (targetTurn.tag !== "resolved") return;

    const act = spellAct({ state: targetTurn.state, spellId: "starry_wisp" });
    expect(act.subject.actorId).toBe(spellTargetId);
    const objectFill = spellObjectTargetFill({
      hole: requireHole(act.initialHoles, "objectTargetChoice"),
      objectId,
      spellId: "starry_wisp",
      casterId: spellTargetId,
      damageDisposition: { kind: "hitPoints", hitPoints: Hp(10) },
    });
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: act.subject,
        fills: [objectFill],
      }),
      "attackRoll",
    );
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: act.subject,
        fills: [
          objectFill,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const penaltyRequest = resolveBattleSubject({
      state: targetTurn.state,
      subject: act.subject,
      fills: [
        objectFill,
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damageRoll, [[8]]),
      ],
    });
    const penaltyRoll = requireResultHole(penaltyRequest, "rolledDice");
    expect(
      sourceDamageRollPenaltyHoles(
        penaltyRequest.tag === "needsHoles" ? penaltyRequest.holes : [],
      ),
    ).toHaveLength(1);
    expect(penaltyRoll).toHaveProperty(
      "sourceDamageRollPenalty.damageRollHoleId",
      damageRoll.holeId,
    );

    const resolved = resolveBattleSubject({
      state: targetTurn.state,
      subject: act.subject,
      fills: [
        objectFill,
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damageRoll, [[8]]),
        damageRollFillWithGroups(penaltyRoll, [[4]]),
      ],
    });
    expect(resolved).toMatchObject({
      tag: "resolved",
      objectDamages: [
        {
          kind: "hitPoints",
          objectId,
          damageType: "radiant",
          rolledDamage: damageAmount(4),
          effectiveDamage: damageAmount(4),
          priorHitPoints: Hp(10),
          nextHitPoints: Hp(6),
          destroyed: false,
        },
      ],
    });
  });

  test("failed save rejects stale source-penalty fills on direct spell damage", () => {
    const spell = rayOfEnfeeblementSpell();
    const starryWisp = spellRecord("starry_wisp");
    const baseState = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      casterClassLevels: [{ className: "wizard", level: 3 }],
      targetSpellcasting: {
        sourceClassName: "wizard",
        spellcastingAbilityModifier: abilityModifier(3),
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [starryWisp],
        preparedSpells: [],
        featurePreparedSpells: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [],
      },
    });
    const cast = resolveRayOfEnfeeblementCast({
      state: baseState,
      spell,
      succeeded: false,
    });
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    expect(targetTurn.tag).toBe("resolved");
    if (targetTurn.tag !== "resolved") return;

    const act = spellAct({ state: targetTurn.state, spellId: "starry_wisp" });
    expect(act.subject.actorId).toBe(spellTargetId);
    const targetFill = spellTargetFill(
      requireHole(act.initialHoles, "targetChoice"),
      "starry_wisp",
      spellTargetId,
      spellCasterId,
    );
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: act.subject,
        fills: [targetFill],
      }),
      "attackRoll",
    );
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: act.subject,
        fills: [
          targetFill,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const penaltyRequest = resolveBattleSubject({
      state: targetTurn.state,
      subject: act.subject,
      fills: [
        targetFill,
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damageRoll, [[8]]),
      ],
    });
    const penaltyRoll = requireResultHole(penaltyRequest, "rolledDice");
    const stalePenalty = sourceDamageRollPenaltyRollHole({
      sourceSpellId: rayOfEnfeeblementUnitId,
      sourceCombatantId: spellCasterId,
      affectedCombatantId: spellTargetId,
      damageRollHoleId: holeId("battle:test:direct-spell-stale-source-penalty"),
      amount: { dice: 1, dieSize: 8 },
    });

    expect(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: act.subject,
        fills: [
          targetFill,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(damageRoll, [[8]]),
          damageRollFillWithGroups(penaltyRoll, [[4]]),
          damageRollFillWithGroups(stalePenalty, [[1]]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Source damage roll penalty does not match an active source-side damage penalty.",
    });
  });

  test("failed save subtracts one shared penalty from save-gated object damage rolls", () => {
    const spell = rayOfEnfeeblementSpell();
    const shatter = spellRecord("shatter");
    const objectId = battleObjectId("ray-weakened-shatter-object");
    const baseState = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      casterClassLevels: [{ className: "wizard", level: 3 }],
      targetPreparedSpells: [shatter],
      targetSpellcasting: {
        sourceClassName: "wizard",
        spellcastingAbilityModifier: abilityModifier(3),
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [shatter],
        featurePreparedSpells: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 2, count: 1 }],
      },
    });
    const cast = resolveRayOfEnfeeblementCast({
      state: baseState,
      spell,
      succeeded: false,
    });
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    expect(targetTurn.tag).toBe("resolved");
    if (targetTurn.tag !== "resolved") return;

    const act = spellAct({
      state: targetTurn.state,
      spellId: "shatter",
      slotLevel: 2,
    });
    expect(act.subject.actorId).toBe(spellTargetId);
    const save = requireHole(act.initialHoles, "savingThrowOutcome");
    const saveFill = {
      kind: "savingThrowOutcome",
      holeId: save.holeId,
      value: {
        area: {
          kind: "shatterArea",
          originAnchorId: spellTargetId,
          affectedTargetIds: [spellCasterId],
          nonmagicalUnattendedObjectDamageFacts: [
            {
              objectId,
              disposition: { kind: "hitPoints", hitPoints: Hp(20) },
            },
          ],
        },
        outcomes: [{ targetId: spellCasterId, succeeded: false }],
      },
    } satisfies Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>;
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: act.subject,
        fills: [saveFill],
      }),
      "rolledDice",
    );
    const penaltyRequest = resolveBattleSubject({
      state: targetTurn.state,
      subject: act.subject,
      fills: [saveFill, damageRollFillWithGroups(damageRoll, [[5, 5, 5]])],
    });
    const penaltyRoll = requireResultHole(penaltyRequest, "rolledDice");
    expect(
      sourceDamageRollPenaltyHoles(
        penaltyRequest.tag === "needsHoles" ? penaltyRequest.holes : [],
      ),
    ).toHaveLength(1);
    expect(penaltyRoll).toHaveProperty(
      "sourceDamageRollPenalty.damageRollHoleId",
      damageRoll.holeId,
    );
    const concentrationRequest = resolveBattleSubject({
      state: targetTurn.state,
      subject: act.subject,
      fills: [
        saveFill,
        damageRollFillWithGroups(damageRoll, [[5, 5, 5]]),
        damageRollFillWithGroups(penaltyRoll, [[4]]),
      ],
    });
    const concentration = requireResultHole(
      concentrationRequest,
      "concentrationSavingThrow",
    );
    expect(Number(concentration.damageAmount)).toBe(11);

    const resolved = resolveBattleSubject({
      state: targetTurn.state,
      subject: act.subject,
      fills: [
        saveFill,
        damageRollFillWithGroups(damageRoll, [[5, 5, 5]]),
        damageRollFillWithGroups(penaltyRoll, [[4]]),
        {
          kind: "concentrationSavingThrow",
          holeId: concentration.holeId,
          value: { succeeded: true },
        } satisfies Extract<
          BattleFill,
          { readonly kind: "concentrationSavingThrow" }
        >,
      ],
    });
    expect(resolved).toMatchObject({
      tag: "resolved",
      objectDamages: [
        {
          kind: "hitPoints",
          objectId,
          damageType: "thunder",
          rolledDamage: damageAmount(11),
          effectiveDamage: damageAmount(11),
          priorHitPoints: Hp(20),
          nextHitPoints: Hp(9),
          destroyed: false,
        },
      ],
    });
  });

  test("failed save requests one penalty hole for multi-target object-contact damage rolls", () => {
    const spell = rayOfEnfeeblementSpell();
    const heatMetal = spellRecord(heatMetalUnitId);
    const secondContactTargetId = combatantId(
      "ray-heat-metal-second-contact-target",
    );
    const objectId = battleObjectId("ray-weakened-heat-metal-object");
    const baseState = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      casterClassLevels: [{ className: "wizard", level: 3 }],
      extraTargetIds: [secondContactTargetId],
      targetPreparedSpells: [heatMetal],
      targetSpellcasting: {
        sourceClassName: "wizard",
        spellcastingAbilityModifier: abilityModifier(3),
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [heatMetal],
        featurePreparedSpells: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 2, count: 1 }],
      },
    });
    const cast = resolveRayOfEnfeeblementCast({
      state: baseState,
      spell,
      succeeded: false,
    });
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    expect(targetTurn.tag).toBe("resolved");
    if (targetTurn.tag !== "resolved") return;

    const act = spellAct({
      state: targetTurn.state,
      spellId: heatMetalUnitId,
      slotLevel: 2,
    });
    expect(act.subject.actorId).toBe(spellTargetId);
    const objectFill = spellManufacturedMetalObjectTargetFill({
      hole: requireHole(act.initialHoles, "objectTargetChoice"),
      objectId,
      spellId: heatMetalUnitId,
      casterId: spellTargetId,
    });
    const contactHole = requireResultHole(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: act.subject,
        fills: [objectFill],
      }),
      "objectContactTargets",
    );
    const contactFill = spellObjectContactTargetsFill({
      hole: contactHole,
      targetIds: [spellCasterId, secondContactTargetId],
      holdingOrWearing: new Map([
        [spellCasterId, "wearing"],
        [secondContactTargetId, "wearing"],
      ]),
    });
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: act.subject,
        fills: [objectFill, contactFill],
      }),
      "rolledDice",
    );
    const penaltyRequest = resolveBattleSubject({
      state: targetTurn.state,
      subject: act.subject,
      fills: [
        objectFill,
        contactFill,
        damageRollFillWithGroups(damageRoll, [[4, 5]]),
      ],
    });
    const penaltyHoles = sourceDamageRollPenaltyHoles(
      penaltyRequest.tag === "needsHoles" ? penaltyRequest.holes : [],
    );
    expect(penaltyHoles).toHaveLength(1);
    expect(penaltyHoles[0]).toHaveProperty(
      "sourceDamageRollPenalty.damageRollHoleId",
      damageRoll.holeId,
    );
    const stalePenaltyHole = sourceDamageRollPenaltyRollHole({
      sourceSpellId: rayOfEnfeeblementUnitId,
      sourceCombatantId: spellCasterId,
      affectedCombatantId: spellTargetId,
      damageRollHoleId: holeId("battle:test:stale-source-penalty-damage-roll"),
      amount: { dice: 1, dieSize: 8 },
    });
    const extraPenaltyFill = resolveBattleSubject({
      state: targetTurn.state,
      subject: act.subject,
      fills: [
        objectFill,
        contactFill,
        damageRollFillWithGroups(damageRoll, [[4, 5]]),
        damageRollFillWithGroups(penaltyHoles[0], [[3]]),
        damageRollFillWithGroups(stalePenaltyHole, [[1]]),
      ],
    });
    expect(extraPenaltyFill).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Source damage roll penalty does not match an active source-side damage penalty.",
    });

    const noContactFill = spellObjectContactTargetsFill({
      hole: contactHole,
      targetIds: [],
      holdingOrWearing: new Map(),
    });
    const stalePenaltyWithoutDamage = resolveBattleSubject({
      state: targetTurn.state,
      subject: act.subject,
      fills: [
        objectFill,
        noContactFill,
        damageRollFillWithGroups(stalePenaltyHole, [[1]]),
      ],
    });
    expect(stalePenaltyWithoutDamage).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Object-contact damage fills are not valid when no contact creatures are selected.",
    });
  });
});

function targetChoiceHoles(
  holes: readonly BattleHole[],
): Extract<BattleHole, { readonly kind: "targetChoice" }>[] {
  return holes.filter(
    (hole): hole is Extract<BattleHole, { readonly kind: "targetChoice" }> =>
      hole.kind === "targetChoice",
  );
}

function sourceDamageRollPenaltyHoles(
  holes: readonly BattleHole[],
): readonly Extract<BattleHole, { readonly kind: "rolledDice" }>[] {
  return holes.filter(
    (
      hole,
    ): hole is Extract<BattleHole, { readonly kind: "rolledDice" }> =>
      hole.kind === "rolledDice" && "sourceDamageRollPenalty" in hole,
  );
}
