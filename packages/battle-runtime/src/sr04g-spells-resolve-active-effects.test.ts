import { describe, expect, test } from "vitest";

import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  abilityModifier,
  attackBonus,
  movementDeltaFeet,
  movementFeet,
} from "@dnd/shared/types";
import type { BattleActiveEffect } from "./active-effect/types.ts";
import type {
  BattleLightEmitter,
  BattleLightEmitterProjectionFact,
  BattleMagicalDarknessZone,
  SpellActiveEffectPostDamageRider,
  SpellFailedSaveConditionEffect,
  SpellSelectedFailedSaveConditionEffect,
} from "./battle-state-execution.ts";
import { battleAreaId, battleObjectId } from "./identity.ts";
import {
  activeEffectExpirationForPostDamageRider,
  activeEffectKindForSpellPostDamageRider,
  activeFallingCreatureMitigationDescentRateCapFeetPerRound,
  activeSelfTransformationModeEffect,
  activeSelfTransformationNaturalWeaponsEffect,
  battleCreatureCanBreatheUnderwater,
  battleIlluminationFromLightEmitters,
  battleLightEmitterProjection,
  battleMagicalDarknessNonmagicalLightIllumination,
  battleMagicalDarknessSightObscurement,
  battlePerceptionRollModeForSight,
  battleSightObscurement,
  fallingCreatureMitigationLandingCleanupForCombatant,
  selectFailedSaveConditionEffect,
  spellPostDamageRiderExpiration,
} from "./battle-reducer/spells-active-effects.ts";
import {
  resolveBonusActionSpellAct,
  resolveSpellAct,
} from "./battle-reducer/spells-resolve.ts";
import { admitBattleResolutionInput } from "./battle-reducer/resolution-admission.ts";
import { spellProcedureExecutionRegistry } from "./battle-reducer/spell-procedure-profiles/execution-composition.ts";
import {
  battleEffectExecutionRefForTest,
  battleProcedureExecutionRefForTest,
} from "./battle-runtime.test-support.ts";
import {
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  spellAct,
  bonusSpellAct,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";

const sourceProcedureRef = battleProcedureExecutionRefForTest(
  "sr04g-spells-resolve-active-effects",
);
const sourceEffectRef = battleEffectExecutionRefForTest(
  "sr04g-spells-resolve-active-effects",
);

function activeEffectState(effect: BattleActiveEffect) {
  const session = spellBattle({});
  const caster = session.state.combatants.get(spellCasterId);
  if (caster === undefined) {
    throw new Error("Expected the spell caster fixture.");
  }
  return {
    ...session.state,
    combatants: new Map(session.state.combatants).set(spellCasterId, {
      ...caster,
      activeEffects: [...caster.activeEffects, effect],
    }),
  };
}

describe("SR-04G spell resolution and active-effect boundaries", () => {
  test("selects fixed and chosen failed-save condition effects exactly", () => {
    const fixed = {
      kind: "fixed",
      condition: "poisoned",
      expiresAt: "endOfCasterNextTurn",
      escape: null,
      turnStartDamage: null,
      repeatSave: null,
    } satisfies SpellFailedSaveConditionEffect;
    const choice = {
      kind: "choice",
      choices: ["charmed", "frightened"],
      expiresAt: "concentration",
      escape: null,
      turnStartDamage: null,
      repeatSave: null,
    } satisfies SpellFailedSaveConditionEffect;

    expect(selectFailedSaveConditionEffect(fixed, null)).toEqual({
      tag: "selected",
      effect: {
        condition: "poisoned",
        expiresAt: "endOfCasterNextTurn",
        escape: null,
        turnStartDamage: null,
        repeatSave: null,
      } satisfies SpellSelectedFailedSaveConditionEffect,
    });
    expect(selectFailedSaveConditionEffect(choice, null)).toEqual({
      tag: "needsConditionChoice",
      effect: choice,
    });
    expect(selectFailedSaveConditionEffect(choice, "frightened")).toEqual({
      tag: "selected",
      effect: {
        condition: "frightened",
        expiresAt: "concentration",
        escape: null,
        turnStartDamage: null,
        repeatSave: null,
      } satisfies SpellSelectedFailedSaveConditionEffect,
    });
    expect(selectFailedSaveConditionEffect(choice, "paralyzed")).toEqual({
      tag: "invalidConditionChoice",
      message: "Condition choice is not available for this spell.",
    });
  });

  test("maps post-damage riders and structured expiration facts", () => {
    const riders = [
      { kind: "speedDelta", deltaFeet: movementDeltaFeet(10) },
      {
        kind: "condition",
        condition: "blinded",
        expiresAt: "endOfCasterNextTurn",
      },
      { kind: "opportunityAttackDenied", expiresAt: "startOfTargetNextTurn" },
      {
        kind: "nextAttackRollAgainstTarget",
        mode: "advantage",
        expiresAt: "endOfCasterNextTurn",
      },
      { kind: "hitPointRegainPrevented", expiresAt: "endOfCasterNextTurn" },
      { kind: "invisibleBenefitDenied", expiresAt: "endOfCasterNextTurn" },
    ] satisfies readonly SpellActiveEffectPostDamageRider[];

    expect(riders.map(activeEffectKindForSpellPostDamageRider)).toEqual([
      "speedDelta",
      "spellCondition",
      "opportunityAttackDenied",
      "nextAttackRollAgainstSelf",
      "hitPointRegainPrevented",
      "invisibleBenefitDenied",
    ]);
    expect(spellPostDamageRiderExpiration(riders[0])).toBeUndefined();
    expect(spellPostDamageRiderExpiration(riders[1])).toBe(
      "endOfCasterNextTurn",
    );

    const state = spellBattle({}).state;
    expect(
      activeEffectExpirationForPostDamageRider(
        state,
        spellCasterId,
        spellTargetId,
        undefined,
      ),
    ).toEqual({ kind: "startOfTurn", combatantId: spellCasterId });
    expect(
      activeEffectExpirationForPostDamageRider(
        state,
        spellCasterId,
        spellTargetId,
        { kind: "concentration", durationTicks: elapsedTimeTicks(20) },
      ),
    ).toEqual({
      kind: "concentration",
      combatantId: spellCasterId,
      durationTicks: elapsedTimeTicks(20),
    });
  });

  test("cleans up falling mitigation and projects self-transformation modes", () => {
    const fallingMitigation = {
      kind: "fallingCreatureMitigationReaction",
      sourceProcedureRef,
      sourceCombatantId: spellCasterId,
      effectRef: sourceEffectRef,
      expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(3) },
    } satisfies Extract<
      BattleActiveEffect,
      { readonly kind: "fallingCreatureMitigationReaction" }
    >;
    const aquaticAdaptation = {
      kind: "selfTransformation",
      sourceProcedureRef,
      sourceCombatantId: spellCasterId,
      effectRef: sourceEffectRef,
      mode: "aquaticAdaptation",
      naturalWeaponFacts: {
        damage: {
          dice: 1,
          dieSize: 6,
          damageTypeChoices: ["slashing"],
        },
        spellcastingAbilityModifier: abilityModifier(3),
        attackBonus: attackBonus(5),
      },
      expiresAt: {
        kind: "concentration",
        combatantId: spellCasterId,
        durationTicks: elapsedTimeTicks(10),
      },
    } satisfies Extract<
      BattleActiveEffect,
      { readonly kind: "selfTransformation" }
    >;
    const state = activeEffectState(fallingMitigation);
    const stateCaster = state.combatants.get(spellCasterId);
    if (stateCaster === undefined) {
      throw new Error("Expected the spell caster fixture.");
    }
    const stateWithModes = {
      ...state,
      combatants: new Map(state.combatants).set(spellCasterId, {
        ...stateCaster,
        activeEffects: [fallingMitigation, aquaticAdaptation],
      }),
    };
    const caster = stateWithModes.combatants.get(spellCasterId);
    if (caster === undefined) {
      throw new Error("Expected the spell caster fixture.");
    }

    expect(
      activeFallingCreatureMitigationDescentRateCapFeetPerRound(caster),
    ).toBe(60);
    expect(battleCreatureCanBreatheUnderwater(caster)).toBe(true);
    expect(activeSelfTransformationModeEffect(caster)?.mode).toBe(
      "aquaticAdaptation",
    );
    expect(
      activeSelfTransformationNaturalWeaponsEffect(caster),
    ).toBeUndefined();
    expect(
      activeSelfTransformationModeEffect(caster, {
        sourceCombatantId: spellTargetId,
      }),
    ).toBeUndefined();

    expect(
      fallingCreatureMitigationLandingCleanupForCombatant(caster),
    ).toMatchObject({
      tag: "mitigated",
      combatant: { activeEffects: [aquaticAdaptation] },
    });
    const withoutMitigation = {
      ...caster,
      activeEffects: [aquaticAdaptation],
    };
    expect(
      fallingCreatureMitigationLandingCleanupForCombatant(withoutMitigation),
    ).toEqual({ tag: "unmitigated", combatant: withoutMitigation });
  });

  test("projects light and magical-darkness facts at typed boundaries", () => {
    const brightAndDimEmitter = {
      kind: "spellLightEmitter",
      sourceProcedureRef,
      sourceCombatantId: spellCasterId,
      attachment: { kind: "combatant", combatantId: spellCasterId },
      emission: {
        kind: "brightAndDim",
        brightRadiusFeet: movementFeet(10),
        dimAdditionalFeet: movementFeet(10),
      },
      opaqueCoverInteraction: { kind: "doesNotBlockEmission" },
      expiresAt: { kind: "untilDispelled" },
    } satisfies BattleLightEmitter;
    const objectFact = {
      kind: "object",
      objectId: battleObjectId("sr04g-light-object"),
      distanceFeet: movementFeet(5),
      opaqueCover: false,
    } satisfies BattleLightEmitterProjectionFact;
    const combatantFact = {
      kind: "combatant",
      combatantId: spellCasterId,
      distanceFeet: movementFeet(5),
    } satisfies BattleLightEmitterProjectionFact;

    expect(
      battleLightEmitterProjection(brightAndDimEmitter, combatantFact),
    ).toMatchObject({
      illumination: "brightLight",
    });
    expect(
      battleLightEmitterProjection(brightAndDimEmitter, {
        ...combatantFact,
        distanceFeet: movementFeet(15),
      }),
    ).toMatchObject({ illumination: "dimLight" });
    expect(
      battleLightEmitterProjection(brightAndDimEmitter, {
        ...combatantFact,
        distanceFeet: movementFeet(25),
      }),
    ).toBeNull();
    expect(
      battleLightEmitterProjection(brightAndDimEmitter, objectFact),
    ).toBeNull();
    expect(
      battleIlluminationFromLightEmitters(
        [brightAndDimEmitter],
        [combatantFact],
      ),
    ).toBe("brightLight");
    expect(battleSightObscurement("dimLight")).toBe("lightlyObscured");
    expect(battleSightObscurement("darkness")).toBe("heavilyObscured");
    expect(
      battlePerceptionRollModeForSight("dimLight", {
        kind: "darkvision",
        rangeFeet: movementFeet(60),
        distanceFeet: movementFeet(30),
      }),
    ).toBeUndefined();

    const zone = {
      kind: "spellMagicalDarknessZone",
      sourceProcedureRef,
      sourceCombatantId: spellCasterId,
      area: {
        kind: "pointOriginSphere",
        areaId: battleAreaId("sr04g-darkness-area"),
        radiusFeet: movementFeet(15),
      },
      expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(10) },
    } satisfies BattleMagicalDarknessZone;
    expect(
      battleMagicalDarknessSightObscurement(zone, {
        kind: "sightThroughArea",
        areaId: zone.area.areaId,
      }),
    ).toBe("heavilyObscured");
    expect(
      battleMagicalDarknessNonmagicalLightIllumination(zone, {
        kind: "nonmagicalLightInArea",
        areaId: battleAreaId("sr04g-other-area"),
      }),
    ).toBeNull();
  });

  test("keeps spell action resolution on its typed hole frontier", () => {
    const actionSession = spellBattle({
      preparedSpells: [spellRecord("magic_missile")],
    });
    const action = spellAct({
      session: actionSession,
      spellId: "magic_missile",
    });
    const actionAdmission = admitBattleResolutionInput({
      state: actionSession.state,
      subject: action.subject,
      fills: [],
    });
    if (actionAdmission.tag !== "admitted") {
      throw new Error("Expected admitted Magic Missile resolution input.");
    }
    const actionResult = resolveSpellAct(
      actionAdmission.input,
      spellProcedureExecutionRegistry(),
    );
    expect(actionResult.tag).toBe("needsHoles");
    if (actionResult.tag === "needsHoles") {
      expect(actionResult.holes[0]?.kind).toBe("spellTargetAllocation");
    }

    const bonusSession = spellBattle({
      preparedSpells: [spellRecord("healing_word")],
    });
    const bonus = bonusSpellAct({
      session: bonusSession,
      spellId: "healing_word",
    });
    const bonusAdmission = admitBattleResolutionInput({
      state: bonusSession.state,
      subject: bonus.subject,
      fills: [],
    });
    if (bonusAdmission.tag !== "admitted") {
      throw new Error("Expected admitted Healing Word resolution input.");
    }
    const bonusResult = resolveBonusActionSpellAct(
      bonusAdmission.input,
      spellProcedureExecutionRegistry(),
    );
    expect(bonusResult.tag).toBe("needsHoles");
    if (bonusResult.tag === "needsHoles") {
      expect(bonusResult.holes[0]?.kind).toBe("targetChoice");
    }
  });
});
