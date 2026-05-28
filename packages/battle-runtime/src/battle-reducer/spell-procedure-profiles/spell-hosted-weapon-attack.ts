// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spell-hosted-weapon-attack
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS
//
// The spellHostedWeaponAttack Spell Procedure Profile: an action cantrip that
// hosts one existing proficient character weapon attack through the Magic
// action, replacing the attack/damage ability with the caster's spellcasting
// ability and adding spell damage at higher character levels.
//
// RAW anchors:
//   - SRD 5.2.1 Playing-the-Game "Attack Rolls": weapon attack rolls add
//     Proficiency Bonus when proficient, and features can replace the normal
//     Strength/Dexterity ability modifier.
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Attack Roll, Damage Type, and
//     Spell Invocation.

import { attackBonus } from "@dnd/shared/types";
import type {
  DamageType,
  SpellRecord,
  WeaponProficiency,
  WeaponRecord,
} from "@dnd/surface/surface/types";
import { Match } from "effect";

import type { CharacterWeaponAttackActionOption } from "../../battle-action-options.ts";
import {
  type ActionSpellBattleResolutionInput,
  type AttackSpellDamageAddition,
  type AvailableBattleAct,
  type BattleResolutionResult,
  type BattleState,
  type SpellHostedWeaponAttackInvocation,
} from "../../battle-reducer.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import { resolveSelectedAttackProcedure } from "../attack-main.ts";
import { spellDamageTypeChoiceHole } from "../spells-damage-fills.ts";
import {
  sameStringSet,
  supportedDamageAmountExpr,
} from "../spells-profile-shared.ts";
import { attackTargetHole, needsHolesResult } from "../hole-helpers.ts";
import { invalidResult } from "../result-helpers.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import type { SpellInvocationRef } from "../../battle-subjects.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { spellAdmissionCharacterLevel } from "./profile.ts";

const DAMAGE_TYPE_CHOICES = [
  "radiant",
  "weapon_normal",
] as const satisfies readonly string[];

type SpellHostedWeaponAttackResolveInput = SpellProcedureProfileResolveInput<
  SpellHostedWeaponAttackInvocation,
  ActionSpellBattleResolutionInput
>;

function admitSpellHostedWeaponAttack(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly SpellHostedWeaponAttackInvocation[] {
  const projection = spellHostedWeaponAttackProjection(
    spell,
    spellAdmissionCharacterLevel(ctx),
  );
  if (projection === null) {
    return [];
  }

  const origin = ctx.actor.origin;
  const spellcasting = origin.spellcasting;
  return spellHostedWeaponAttacks(ctx)
    .filter(({ attack }) =>
      origin.weaponProficiencies.some((proficiency) =>
        weaponMatchesProficiency(attack.weapon, proficiency),
      ),
    )
    .map(({ itemId, attack }): SpellHostedWeaponAttackInvocation => ({
      access: { tag: "classCantrip" },
      resource: { tag: "none" },
      procedure: "spellHostedWeaponAttack",
      spell,
      actionCost: "magicAction",
      componentWeapon: { itemId, attack },
      spellcastingAbilityModifier: spellcasting.spellcastingAbilityModifier,
      attackBonus: attackBonus(
        Number(spellcasting.spellcastingAbilityModifier) +
          Number(spellcasting.proficiencyBonus),
      ),
      damageTypeChoices: [
        ...new Set<DamageType>(["radiant", attack.weapon.damage.damageType]),
      ],
      bonusDamage: projection.bonusDamage,
    }));
}

function spellHostedWeaponAttackProjection(
  spell: SpellRecord,
  characterLevel: number,
): Pick<SpellHostedWeaponAttackInvocation, "bonusDamage"> | null {
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 0 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    spell.mechanics.phases.length !== 1
  ) {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const effects = phase?.kind === "direct" ? phase.effects : undefined;
  const effect = effects?.[0];
  const bonusDamage =
    effect?.kind === "make_weapon_attack" ? effect.bonusDamage : undefined;
  if (
    phase?.kind !== "direct" ||
    effects === undefined ||
    effects.length !== 1 ||
    effect?.kind !== "make_weapon_attack" ||
    effect.damageTypeChoice === undefined ||
    bonusDamage === undefined ||
    typeof bonusDamage.damageType !== "string" ||
    effect.weapon !== "material_component" ||
    effect.abilityOverride !== "spellcasting" ||
    !sameStringSet(effect.damageTypeChoice, [...DAMAGE_TYPE_CHOICES])
  ) {
    return null;
  }
  const bonusDamageExpr = supportedDamageAmountExpr({
    amount: bonusDamage.amount,
    spellLevel: spell.mechanics.level,
    characterLevel,
  });
  return bonusDamageExpr === null
    ? null
    : {
        bonusDamage: {
          expr: bonusDamageExpr,
          damageType: bonusDamage.damageType,
        },
      };
}

function spellHostedWeaponAttacks(ctx: SpellAdmissionContext): readonly {
  readonly itemId: string;
  readonly attack: CharacterWeaponAttackActionOption;
}[] {
  const origin = ctx.actor.origin;
  return [
    ...(origin.attack === null
      ? []
      : [
          {
            itemId:
              origin.selectedLoadout.weapon?.itemId ?? origin.attack.weapon.id,
            attack: origin.attack,
          },
        ]),
    ...(origin.offHandAttack === undefined
      ? []
      : [
          {
            itemId:
              origin.selectedLoadout.offHandWeapon?.itemId ??
              origin.offHandAttack.weapon.id,
            attack: origin.offHandAttack,
          },
        ]),
  ].filter(({ attack }) => attack.weapon.costGp >= 0.01);
}

const byKind = Match.discriminator("kind");

function weaponMatchesProficiency(
  weapon: WeaponRecord,
  proficiency: WeaponProficiency,
): boolean {
  return Match.value(proficiency).pipe(
    byKind(
      "weapon_category",
      (categoryProficiency) => weapon.category === categoryProficiency.category,
    ),
    byKind(
      "weapon_category_with_properties",
      (propertyProficiency) =>
        weapon.category === propertyProficiency.category &&
        weapon.properties?.some((property) =>
          propertyProficiency.anyOfProperties.includes(property.kind),
        ) === true,
    ),
    Match.exhaustive,
  );
}

function discoverSpellHostedWeaponAttackCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: SpellHostedWeaponAttackInvocation,
): readonly AvailableBattleAct[] {
  const targetHole = attackTargetHole(
    state,
    actorId,
    invocation.componentWeapon.attack,
  );
  return targetHole.choices.length === 0
    ? []
    : [
        {
          subject: {
            tag: "actionSpell",
            actorId,
            invocation: spellHostedWeaponAttackInvocationRef(invocation),
            mode: { tag: "cast" },
            componentWeaponItemId: invocation.componentWeapon.itemId,
          },
          label: `${invocation.spell.name} (${invocation.componentWeapon.attack.weapon.name})`,
          summary: spellHostedWeaponAttackCastSummary(invocation),
          initialHoles: [spellDamageTypeChoiceHole(invocation), targetHole],
        },
      ];
}

function spellHostedWeaponAttackInvocationRef(
  invocation: SpellHostedWeaponAttackInvocation,
): SpellInvocationRef {
  return {
    tag: "cantrip",
    spellId: spellId(invocation.spell.id),
    procedure: "spellHostedWeaponAttack",
  };
}

function spellHostedWeaponAttackCastSummary(
  invocation: SpellHostedWeaponAttackInvocation,
): string {
  return `Cast ${invocation.spell.name} as a cantrip using ${invocation.componentWeapon.attack.weapon.name}.`;
}

function resolveSpellHostedWeaponAttack(
  input: SpellHostedWeaponAttackResolveInput,
): BattleResolutionResult {
  const subjectWeaponItemId = input.input.subject.componentWeaponItemId;
  if (subjectWeaponItemId === undefined) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Spell-hosted weapon attack component weapon identity is required.",
    );
  }
  if (subjectWeaponItemId !== input.invocation.componentWeapon.itemId) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Spell-hosted weapon attack component weapon no longer matches this spell act.",
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
      "Spell-hosted weapon attack damage type must be Radiant or the selected weapon's normal damage type.",
    );
  }
  const attack = spellHostedWeaponAttack(input.invocation, selectedDamageType);
  const attackFills = input.input.fills.filter(
    (fill) => fill.kind !== "damageTypeChoice",
  );
  const pendingAttackDamageAdditions = [
    ...(input.input.pendingAttackDamageAdditions ?? []),
    ...spellHostedWeaponAttackBonusDamageAdditions(
      input.invocation,
      input.actorId,
    ),
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

function spellHostedWeaponAttack(
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

function spellHostedWeaponAttackBonusDamageAdditions(
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

export const spellHostedWeaponAttackProfile: SpellProcedureProfile<
  "spellHostedWeaponAttack",
  SpellHostedWeaponAttackInvocation,
  ActionSpellBattleResolutionInput
> = {
  procedure: "spellHostedWeaponAttack",
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  isTargetListInvocation: false,
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitSpellHostedWeaponAttack,
  discoverCastAct: discoverSpellHostedWeaponAttackCastAct,
  castSummary: spellHostedWeaponAttackCastSummary,
  invocationRef: spellHostedWeaponAttackInvocationRef,
  resolve: resolveSpellHostedWeaponAttack,
};
