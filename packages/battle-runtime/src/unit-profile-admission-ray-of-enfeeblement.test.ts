// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-D20-LIFECYCLE ray_of_enfeeblement
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-ray-of-enfeeblement-d20-lifecycle
import { describe, expect, test } from "vitest";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import type { SpellRecord } from "@dnd/surface/surface/types";
import rayOfEnfeeblementInput from "../../surface/content/ray_of_enfeeblement.json";
import {
  consumeSelfAttackRollEffects,
  requiredAttackRollMode,
} from "./battle-reducer/attack-roll.ts";
import { requiredAbilityCheckRollMode } from "./battle-reducer/hole-helpers.ts";
import { savingThrowRollModeProjections } from "./battle-reducer/spells-damage-fills.ts";
import { breakBattleConcentration } from "./battle-reducer/damage-apply.ts";
import {
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  requireCombatant,
  requireHole,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  savingThrowOutcomeFill,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { resourceCount, spellSlotLevel } from "@dnd/shared/types";
import { spellSavingThrowOutcomeHole } from "./battle-reducer/spells-damage-fills.ts";
import { supportedPreparedAbilityD20TestRollModeSaveGateProfile } from "./battle-reducer/spells-profiles-save-gates.ts";
import { resolveAbilityD20TestRollModeSaveGateSpellAct } from "./battle-reducer/spells-resolve-save-gates.ts";
import { spellFillSet } from "./battle-reducer/spells-resolve-fill-set.ts";
import { spellTargetListHole } from "./battle-reducer/spells-holes-fills.ts";
import { supportedSpellInvocationRef } from "./battle-reducer/spells-invocation-ref.ts";
import { endTurn } from "./unit-profile-admission-test-support.ts";
import type { BattleState, SupportedSpellInvocation } from "./index.ts";

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
    expect(
      requiredAbilityCheckRollMode(cast.state, spellTargetId, "str"),
    ).toBe("disadvantage");
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
    expect(repeatSaveHole).toHaveProperty(
      "abilityD20TestRollModeEndTurnSave",
    );
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
});
