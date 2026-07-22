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
  interruptWindowProgress,
  snapshotBattle,
  type BattleInterruptWindowProgress,
  type BonusActionSpellBattleResolutionInput,
} from "../../battle-reducer.ts";
import {
  admitWeaponAttackOverride,
  type WeaponAttackOverrideInvocation,
} from "../../procedure-admission/weapon-attack-override.ts";
import { activeDruidWildShapeEffect } from "../druid-wild-shape.ts";
import { loadoutWeaponItemIsUsableDuringWildShape } from "../wild-shape-equipment.ts";
import {
  discoverWeaponAttackOverrideCastAct,
  weaponAttackOverrideExecutor,
  WeaponAttackOverrideExecutionSchema,
} from "../../procedure-execution/weapon-attack-override.ts";
import { spellCastInterruptFrame } from "../spell-cast-interrupt-frame.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import type { WeaponAttackOverrideFillInput } from "../weapon-attack-override-fill-input.ts";
import type { SpellProcedureProfile } from "./profile.ts";

type WeaponAttackOverrideProfile = SpellProcedureProfile<
  "weaponAttackOverride",
  WeaponAttackOverrideInvocation,
  BonusActionSpellBattleResolutionInput,
  WeaponAttackOverrideFillInput
>;

type WeaponAttackOverrideOpenedInterruptResult = Extract<
  BattleInterruptWindowProgress,
  { readonly tag: "windowOpened" }
>["result"];
type WeaponAttackOverrideCheckpointFailureResult = Extract<
  BattleInterruptWindowProgress,
  { readonly tag: "checkpointPreparationFailed" }
>["result"];

const resolveWeaponAttackOverride = weaponAttackOverrideExecutor<
  WeaponAttackOverrideOpenedInterruptResult,
  WeaponAttackOverrideCheckpointFailureResult
>();

function resolveWeaponAttackOverrideProfile(
  input: Parameters<WeaponAttackOverrideProfile["resolve"]>[0],
) {
  const continuation = {
    kind: "replay",
    subject: input.input.subject,
    fills: input.input.fills,
  } as const;
  return resolveWeaponAttackOverride(
    {
      input: {
        state: input.input.state,
        subject: input.input.subject,
        ...(input.input.handledInterruptTrigger === undefined
          ? {}
          : {
              handledInterruptTrigger: input.input.handledInterruptTrigger,
            }),
      },
      invocation: input.invocation,
      fillInput: input.fillSet,
      continuation,
    },
    {
      snapshot: snapshotBattle,
      activeDruidWildShapeEffect,
      loadoutWeaponItemIsUsableDuringWildShape,
      spellCastInterruptFrame,
      interruptWindowProgress,
      commitWeaponAttackOverrideEffect: ({ authorization, activeEffects }) => ({
        ...authorization.execution.state,
        combatants: new Map(authorization.execution.state.combatants).set(
          authorization.execution.caster.combatantId,
          {
            ...authorization.execution.caster,
            activeEffects,
          },
        ),
      }),
      spendSpellCastResources: ({ state, execution, errorState }) =>
        spendSpellCastResources({
          state,
          actorId: execution.caster.combatantId,
          invocation: execution.invocation,
          errorState,
        }),
    },
  );
}

export const weaponAttackOverrideProfile: WeaponAttackOverrideProfile = {
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
  discoverCastAct: (state, actorId, invocation) =>
    discoverWeaponAttackOverrideCastAct(state, actorId, invocation, {
      activeDruidWildShapeEffect,
      loadoutWeaponItemIsUsableDuringWildShape,
    }),
  resolve: resolveWeaponAttackOverrideProfile,
};
