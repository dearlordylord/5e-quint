// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-weapon-attack-override
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS
//
// The weaponAttackOverride Spell Procedure Profile: a Bonus Action cantrip
// that attaches a timed spellcasting-ability attack and damage override to an
// exact held Club or Quarterstaff item.
//
// RAW anchors:
//   - SRD 5.2.1 Spells "Shillelagh": Bonus Action, Self, 1 minute; a held
//     Club or Quarterstaff can use spellcasting ability for melee attack and
//     damage rolls, changes weapon damage dice, and can deal Force or normal
//     weapon damage. The spell ends early if cast again or the weapon is let go.
//   - UBIQUITOUS_LANGUAGE.md: Bonus Action, Attack Roll, Damage Roll, Damage
//     Type, and Weapon Property.

import {
  maybeOpenInterruptWindow,
  snapshotBattle,
  type BattleActDiscoveryCandidate,
  type BattleActiveEffect,
  type BattleCreatureState,
  type BattleResolutionResult,
  type BattleState,
  type BonusActionSpellBattleResolutionInput,
} from "../../battle-reducer.ts";
import { type CombatantId } from "../../identity.ts";
import {
  admitWeaponAttackOverride,
  type WeaponAttackOverrideInvocation,
} from "../../procedure-admission/weapon-attack-override.ts";
import type { WeaponAttackOverrideProcedureFacts } from "../../procedure-facts/weapon-attack-override.ts";
import { activeDruidWildShapeEffect } from "../druid-wild-shape.ts";
import { loadoutWeaponItemIsUsableDuringWildShape } from "../wild-shape-equipment.ts";
import {
  activeEffectsAfterWeaponAttackOverride,
  WeaponAttackOverrideExecutionSchema,
} from "../../procedure-execution/weapon-attack-override.ts";
import { invalidResult } from "../result-helpers.ts";
import { spellCastInterruptFrame } from "../spell-cast-interrupt-frame.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import type {
  OkSpellFillSet,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";

type WeaponAttackOverrideResolveInput = SpellProcedureProfileResolveInput<
  WeaponAttackOverrideInvocation,
  BonusActionSpellBattleResolutionInput
>;

function discoverWeaponAttackOverrideCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: import("../../battle-reducer.ts").BattleExecutableSpellInvocation<WeaponAttackOverrideInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const actor = state.combatants.get(actorId);
  if (
    actor?.origin.kind !== "character" ||
    !weaponAttackOverrideWeaponIsUsable(actor, invocation)
  ) {
    return [];
  }
  return [
    {
      subject: {
        tag: "bonusActionSpell",
        actorId,
        procedureRef: invocation.sourceProcedureRef,
        mode: { tag: "cast" },
      },
      initialHoles: [],
    },
  ];
}

function resolveWeaponAttackOverride(
  input: WeaponAttackOverrideResolveInput,
): BattleResolutionResult {
  if (weaponAttackOverrideFillSetHasDisallowedFills(input.fillSet)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Weapon attack override spells do not use target, roll, damage, or save fills.",
    );
  }
  if (input.invocation.activeEffect.sourceCombatantId !== input.actorId) {
    return invalidResult(
      input.input.state,
      "unsupportedSubject",
      "Weapon attack override source combatant does not match the caster.",
    );
  }
  const actor = input.input.state.combatants.get(input.actorId);
  if (actor === undefined) {
    return invalidResult(
      input.input.state,
      "missingCombatant",
      "Weapon attack override caster is not in this battle.",
    );
  }
  if (
    actor.origin.kind !== "character" ||
    !weaponAttackOverrideWeaponIsUsable(actor, input.invocation)
  ) {
    return invalidResult(
      input.input.state,
      "unsupportedSubject",
      "Weapon attack override requires its attached weapon to remain usable.",
    );
  }
  const spellCastReactionWindow = maybeOpenInterruptWindow(
    input.input.state,
    spellCastInterruptFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: [input.actorId],
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "bonusAction" },
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    }),
    input.input.handledInterruptTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const activeEffects: readonly BattleActiveEffect[] =
    activeEffectsAfterWeaponAttackOverride(
      actor.activeEffects,
      input.invocation.sourceProcedureRef,
      input.invocation.activeEffect,
    );
  const effected = {
    ...input.input.state,
    combatants: new Map(input.input.state.combatants).set(input.actorId, {
      ...actor,
      activeEffects,
    }),
  };
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resourced.tag === "invalid"
    ? resourced
    : {
        tag: "resolved",
        state: resourced.state,
        snapshot: snapshotBattle(resourced.state),
      };
}

function weaponAttackOverrideWeaponIsUsable(
  actor: BattleCreatureState,
  invocation: Pick<WeaponAttackOverrideProcedureFacts, "activeEffect">,
): boolean {
  if (actor.origin.kind !== "character") {
    return false;
  }
  return loadoutWeaponItemIsUsableDuringWildShape({
    loadout: actor.origin.selectedLoadout,
    activeWildShape: activeDruidWildShapeEffect(actor),
    itemId: invocation.activeEffect.weaponItemId,
  });
}

function weaponAttackOverrideFillSetHasDisallowedFills(
  fillSet: OkSpellFillSet,
): boolean {
  return (
    fillSet.targetId !== undefined ||
    fillSet.targetList !== undefined ||
    fillSet.attackRoll !== undefined ||
    fillSet.targetAllocation !== undefined ||
    fillSet.damageRoll !== undefined ||
    fillSet.attackBurstDamageRoll !== undefined ||
    fillSet.healingRoll !== undefined ||
    fillSet.damageDispositions.length > 0 ||
    fillSet.skillChoice !== undefined ||
    fillSet.targetAbilityChoices !== undefined ||
    fillSet.commandOptionChoice !== undefined ||
    fillSet.savingThrowOutcomes !== undefined ||
    fillSet.concentrationSavingThrows.length > 0
  );
}

export const weaponAttackOverrideProfile: SpellProcedureProfile<
  "weaponAttackOverride",
  WeaponAttackOverrideInvocation,
  BonusActionSpellBattleResolutionInput
> = {
  procedure: "weaponAttackOverride",
  executionSchema: WeaponAttackOverrideExecutionSchema,
  metamagicCompatibility: "notActionSpellCasting",
  targetListInvocation: { kind: "none" },
  isReadiedSpellCompatible: false,
  admit: (spell, ctx) =>
    admitWeaponAttackOverride(spell, {
      actor: ctx.actor,
      activeDruidWildShape: activeDruidWildShapeEffect(ctx.actor),
    }),
  discoverCastAct: discoverWeaponAttackOverrideCastAct,
  resolve: resolveWeaponAttackOverride,
};
