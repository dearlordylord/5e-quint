// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS
import type { DamageType } from "@dnd/surface/surface/types";
import {
  type ActionSpellBattleResolutionInput,
  type AttackSpellDamageAddition,
  type BattleResolutionResult,
  type SpellHostedWeaponAttackInvocation,
} from "../battle-reducer.ts";
import type { CharacterWeaponAttackActionOption } from "../battle-action-options.ts";
import type { CombatantId } from "../identity.ts";
import { resolveSelectedAttackProcedure } from "./attack-main.ts";
import { invalidResult } from "./result-helpers.ts";
import { spendSpellCastResources } from "./spells-resolve-resources.ts";
import type { SpellFillSet } from "./spells-resolve-fill-set.ts";
import { needsHolesResult } from "./hole-helpers.ts";
import { spellDamageTypeChoiceHole } from "./spells-damage-fills.ts";

export function resolveSpellHostedWeaponAttackSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: SpellHostedWeaponAttackInvocation;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  const subjectWeaponItemId = input.input.subject.componentWeaponItemId;
  if (subjectWeaponItemId === undefined) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "True Strike component weapon identity is required.",
    );
  }
  if (
    subjectWeaponItemId !== input.invocation.componentWeapon.itemId
  ) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "True Strike component weapon no longer matches this spell act.",
    );
  }
  if (input.fillSet.damageTypeChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellDamageTypeChoiceHole(input.invocation),
    ]);
  }
  const selectedDamageType = input.fillSet.damageTypeChoice.value;
  if (!input.invocation.damageTypeChoices.includes(selectedDamageType)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "True Strike damage type must be Radiant or the selected weapon's normal damage type.",
    );
  }
  const attack = trueStrikeWeaponAttack(input.invocation, selectedDamageType);
  const attackFills = input.input.fills.filter(
    (fill) => fill.kind !== "damageTypeChoice",
  );
  const pendingAttackDamageAdditions = [
    ...(input.input.pendingAttackDamageAdditions ?? []),
    ...trueStrikeBonusDamageAdditions(input.invocation, input.actorId),
  ];
  const {
    replayingInterruptedProcedure: _replayingInterruptedProcedure,
    suppressedReactionTrigger: _suppressedReactionTrigger,
    pendingAttackDamageReductions: _pendingAttackDamageReductions,
    pendingAttackDamageAdditions: _pendingAttackDamageAdditions,
    ...baseInput
  } = input.input;
  const replayOptions = {
    ...(input.input.replayingInterruptedProcedure === undefined
      ? {}
      : {
          replayingInterruptedProcedure:
            input.input.replayingInterruptedProcedure,
        }),
    ...(input.input.suppressedReactionTrigger === undefined
      ? {}
      : { suppressedReactionTrigger: input.input.suppressedReactionTrigger }),
    ...(input.input.pendingAttackDamageReductions === undefined
      ? {}
      : {
          pendingAttackDamageReductions:
            input.input.pendingAttackDamageReductions,
        }),
  };
  return resolveSelectedAttackProcedure(
    {
      ...baseInput,
      ...replayOptions,
      subject: {
        ...baseInput.subject,
        componentWeaponItemId: subjectWeaponItemId,
      },
      fills: attackFills,
      pendingAttackDamageAdditions,
    },
    attack,
    (state, actorId) =>
      spendSpellCastResources({
        state,
        actorId,
        invocation: input.invocation,
        errorState: input.input.state,
        startConcentration: false,
      }),
  );
}

function trueStrikeWeaponAttack(
  invocation: SpellHostedWeaponAttackInvocation,
  damageType: DamageType,
): CharacterWeaponAttackActionOption {
  const attack = invocation.componentWeapon.attack;
  return {
    ...attack,
    abilityModifier: invocation.spellcastingAbilityModifier,
    attackBonus: invocation.attackBonus,
    damageAbilityModifier: invocation.spellcastingAbilityModifier,
    weapon: {
      ...attack.weapon,
      damage:
        attack.weapon.damage.damageType === damageType
          ? attack.weapon.damage
          : { ...attack.weapon.damage, damageType },
    },
  };
}

function trueStrikeBonusDamageAdditions(
  invocation: SpellHostedWeaponAttackInvocation,
  actorId: CombatantId,
): readonly AttackSpellDamageAddition[] {
  return invocation.bonusDamage === null || invocation.bonusDamage.expr.dice <= 0
    ? []
    : [
        {
          kind: "attackSpellDamageAddition",
          sourceSpellId: invocation.spell.id,
          sourceCombatantId: actorId,
          damage: invocation.bonusDamage,
        },
      ];
}
