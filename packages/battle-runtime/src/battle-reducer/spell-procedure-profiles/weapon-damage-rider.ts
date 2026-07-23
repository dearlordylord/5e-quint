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
  type BattleActiveEffect,
  type BattleActiveEffectExpiration,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { maybeOpenInterruptWindow, snapshotBattle } from "../dispatcher.ts";
import { SpellWeaponDamageRiderTemplateSchema } from "../../active-effect/codecs.ts";
import { type CombatantId } from "../../identity.ts";
import { invalidResult } from "../result-helpers.ts";
import { spellCastInterruptFrame } from "../spell-cast-interrupt-frame.ts";
import { supportedDamageAmountExpr } from "../spells-execution-facts.ts";
import { scalarBuffActiveEffectExpiration } from "../spells-profiles-support.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import type {
  OkSpellFillSet,
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
  SpellSlotInvocationResourceSchema,
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
  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly WeaponDamageRiderInvocation[] =>
      Number(slot.spellLevel) < spell.mechanics.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
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

function resolveWeaponDamageRider(
  input: WeaponDamageRiderResolveInput,
): BattleResolutionResult {
  if (weaponDamageRiderFillSetHasDisallowedFills(input.fillSet)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Weapon damage rider spells do not use target, roll, damage, or save fills.",
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

  const actor = input.input.state.combatants.get(input.actorId);
  if (actor === undefined) {
    return invalidResult(
      input.input.state,
      "missingCombatant",
      "Bonus Action spell actor is not in this battle.",
    );
  }
  const activeEffects: readonly BattleActiveEffect[] = [
    ...actor.activeEffects.filter(
      (effect) =>
        !(
          effect.kind === "spellWeaponDamageRider" &&
          effect.sourceProcedureRef === input.invocation.sourceProcedureRef &&
          effect.sourceCombatantId === input.actorId
        ),
    ),
    {
      ...input.invocation.activeEffect,
      sourceProcedureRef: input.invocation.sourceProcedureRef,
    },
  ];
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

function weaponDamageRiderFillSetHasDisallowedFills(
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
    fillSet.savingThrowOutcomes !== undefined ||
    fillSet.skillChoice !== undefined ||
    fillSet.targetAbilityChoices !== undefined ||
    fillSet.concentrationSavingThrows.length > 0
  );
}

const WeaponDamageRiderInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
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
