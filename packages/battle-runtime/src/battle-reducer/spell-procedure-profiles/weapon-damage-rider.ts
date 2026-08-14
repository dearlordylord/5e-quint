import { maybeOpenConfiguredSpellCastReactionWindow } from "../spell-active-effect-resolution.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-weapon-damage-rider
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS
//
// The weaponDamageRider Spell Procedure Profile: a self-targeted Bonus Action
// spell that installs a timed Attack Damage Rider on the caster's weapon hits.
//
// RAW anchors:
//   - SRD 5.2.1 Spells "Divine Favor": Bonus Action, Self, 1 minute; attacks
//     with weapons deal extra Radiant damage on a hit.
//   - UBIQUITOUS_LANGUAGE.md: Attack Damage Rider, Bonus Action, Attack Roll,
//     Damage Roll, and Spell Invocation.

import {
  type BattleActDiscoveryCandidate,
  type BattleActiveEffectExpiration,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { SpellWeaponDamageRiderTemplateSchema } from "../../active-effect/codecs.ts";
import { type CombatantId } from "../../identity.ts";
import { invalidResult, resolutionFromStateResult } from "../result-helpers.ts";
import { replaceTargetActiveEffect } from "../active-effect-replacement.ts";
import { spellCastCandidate } from "../spell-cast-candidate.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { supportedDamageAmountExpr } from "../spells-execution-facts.ts";
import { scalarBuffActiveEffectExpiration } from "../spells-profiles-support.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type WeaponDamageRiderInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "weaponDamageRider" }
>;
type WeaponDamageRiderResolveInput =
  SpellProcedureProfileResolveInput<WeaponDamageRiderInvocation>;

function admitWeaponDamageRider(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly WeaponDamageRiderInvocation[] {
  const activeEffect = weaponDamageRiderActiveEffect(
    ctx.actor.combatantId,
    spell,
  );
  if (activeEffect === null) {
    return [];
  }
  return ctx.spellCastOptions.flatMap(
    (slot): readonly WeaponDamageRiderInvocation[] =>
      Number(slot.spellLevel) < spell.mechanics.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "weaponDamageRider",
              spell,
              actionCost: "bonusAction",
              activeEffect,
            },
          ],
  );
}

function weaponDamageRiderActiveEffect(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
): WeaponDamageRiderInvocation["activeEffect"] | null {
  if (
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "bonus_action" ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.attachment.kind !== "self" ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.operations.length !== 1
  ) {
    return null;
  }
  const operation = spell.mechanics.operations[0];
  const expiresAt = weaponDamageRiderExpiration(
    actorId,
    spell.mechanics.duration,
  );
  const damage = weaponDamageRiderDamage(operation);
  return expiresAt === null || damage === null
    ? null
    : {
        kind: "spellWeaponDamageRider",
        sourceCombatantId: actorId,
        damage,
        expiresAt,
      };
}

function weaponDamageRiderExpiration(
  actorId: CombatantId,
  duration: BattleSpellAdmissionSource["mechanics"]["duration"],
): BattleActiveEffectExpiration | null {
  return scalarBuffActiveEffectExpiration(actorId, duration);
}

function weaponDamageRiderDamage(
  operation:
    | Extract<
        BattleSpellAdmissionSource["mechanics"],
        { readonly family: "ongoing_effect" }
      >["operations"][number]
    | undefined,
): WeaponDamageRiderInvocation["activeEffect"]["damage"] | null {
  if (
    operation?.trigger.kind !== "on_caster_attack_hit" ||
    operation.effect.kind !== "damage" ||
    operation.effect.damageType !== "radiant" ||
    operation.effect.amount === undefined
  ) {
    return null;
  }
  const expr = supportedDamageAmountExpr({ amount: operation.effect.amount });
  return expr === null
    ? null
    : {
        expr,
        damageType: "radiant",
      };
}

function discoverWeaponDamageRiderCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: import("../../battle-state-execution.ts").BattleExecutableSpellInvocation<WeaponDamageRiderInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  return [
    spellCastCandidate(
      "bonusActionSpell",
      actorId,
      invocation.sourceProcedureRef,
      [],
    ),
  ];
}

function resolveWeaponDamageRider(
  input: WeaponDamageRiderResolveInput,
): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!fillsBelongToSpellCastHoles(input.input.fills)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Weapon damage rider spells do not use target, roll, damage, or save fills.",
    );
  }
  /* v8 ignore stop */

  const spellCastReactionWindow = maybeOpenConfiguredSpellCastReactionWindow({
    resolution: input,
    targetIds: [input.actorId],
  });
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const actor = input.input.state.combatants.get(input.actorId);
  if (actor === undefined) {
    return invalidResult(
      input.input.state,
      "missingCombatant",
      "Bonus Action spell actor is not in this battle.",
    );
  }
  const effected = replaceTargetActiveEffect(
    input.input.state,
    input.actorId,
    (effect) =>
      effect.kind === "spellWeaponDamageRider" &&
      effect.sourceProcedureRef === input.invocation.sourceProcedureRef &&
      effect.sourceCombatantId === input.actorId,
    {
      ...input.invocation.activeEffect,
      sourceProcedureRef: input.invocation.sourceProcedureRef,
    },
  );
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resolutionFromStateResult(resourced);
}

const WeaponDamageRiderInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("weaponDamageRider"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("bonusAction"),
    activeEffect: SpellWeaponDamageRiderTemplateSchema,
  }),
);
export const weaponDamageRiderProfile: SpellProcedureDeclaration<
  "weaponDamageRider",
  WeaponDamageRiderInvocation
> = {
  procedure: "weaponDamageRider",
  executionSchema: WeaponDamageRiderInvocationSchema,
  admit: admitWeaponDamageRider,
  discoverCastAct: discoverWeaponDamageRiderCastAct,
  resolve: resolveWeaponDamageRider,
};
import { spellInvocationResourceForCastOption } from "./profile.ts";
