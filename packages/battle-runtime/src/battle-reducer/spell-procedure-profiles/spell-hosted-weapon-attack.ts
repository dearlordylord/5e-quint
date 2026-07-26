import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spell-hosted-weapon-attack
import { DiceExprSchema } from "@dnd/surface/surface/schema";
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
import type { DamageType, WeaponProficiency } from "@dnd/surface/surface/types";
import { Match } from "effect";
import type {
  BoundCharacterWeaponAttackActionOption,
  CharacterWeaponAttackActionOption,
} from "../../battle-action-options.ts";
import {
  type AttackSpellDamageAddition,
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type CharacterBattleCreatureState,
  type SpellHostedWeaponAttackInvocation,
} from "../../battle-state-execution.ts";
import { BattleObjectId, type CombatantId } from "../../identity.ts";
import { resolveSelectedAttackProcedure } from "../attack-main.ts";
import { isCharacterBattleCreatureState } from "../creature-state-execution.ts";
import { activeDruidWildShapeEffect } from "../druid-wild-shape.ts";
import { spellDamageTypeChoiceHole } from "../spells-damage-fills.ts";
import {
  sameStringSet,
  supportedDamageAmountExpr,
} from "../spells-execution-facts.ts";
import { wildShapeCanUseWornLoadoutObject } from "../wild-shape-equipment.ts";
import { attackTargetHole } from "../hole-helpers.ts";
import { needsHolesResult } from "../needs-holes-result.ts";
import { invalidResult } from "../result-helpers.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import {
  AbilityModifier,
  AttackBonus,
  ClassCantripSpellAccessSchema,
  DamageTypeSchema,
  NoSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  spellAdmissionCharacterLevel,
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";

const DAMAGE_TYPE_CHOICES = [
  "radiant",
  "weapon_normal",
] as const satisfies readonly string[];

type SpellHostedWeaponAttackResolveInput =
  SpellProcedureProfileResolveInput<SpellHostedWeaponAttackInvocation>;

function admitSpellHostedWeaponAttack(
  spell: BattleSpellAdmissionSource,
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
  return spellHostedWeaponAttacks(ctx.actor)
    .filter(({ attack }) =>
      origin.weaponProficiencies.some((proficiency) =>
        weaponMatchesProficiency(attack.weapon, proficiency),
      ),
    )
    .map(
      ({ objectId, attack }): SpellHostedWeaponAttackInvocation => ({
        access: { tag: "classCantrip" },
        resource: { tag: "none" },
        procedure: "spellHostedWeaponAttack",
        spell,
        actionCost: "magicAction",
        componentWeapon: { objectId, attack },
        spellcastingAbilityModifier: spellcasting.spellcastingAbilityModifier,
        attackBonus: attackBonus(
          Number(spellcasting.spellcastingAbilityModifier) +
            Number(spellcasting.proficiencyBonus),
        ),
        damageTypeChoices: [
          ...new Set<DamageType>(["radiant", attack.weapon.damage.damageType]),
        ],
        bonusDamage: projection.bonusDamage,
      }),
    );
}

function spellHostedWeaponAttackProjection(
  spell: BattleSpellAdmissionSource,
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

function spellHostedWeaponAttacks(
  actor: CharacterBattleCreatureState,
): readonly {
  readonly objectId: BattleObjectId;
  readonly attack: BoundCharacterWeaponAttackActionOption;
}[] {
  const origin = actor.origin;
  const activeWildShape = activeDruidWildShapeEffect(actor);
  return [
    ...(origin.attack === null ||
    (activeWildShape !== null &&
      (origin.selectedLoadout.weapon === undefined ||
        !wildShapeCanUseWornLoadoutObject({
          loadout: origin.selectedLoadout,
          formLimbs: activeWildShape.formLimbs,
          equipmentDisposition: activeWildShape.equipmentDisposition,
          objectKind: "mainWeapon",
          objectId: origin.attack.weaponObjectId,
        })))
      ? []
      : [
          {
            objectId: origin.attack.weaponObjectId,
            attack: origin.attack,
          },
        ]),
    ...(origin.offHandAttack === undefined ||
    (activeWildShape !== null &&
      (origin.selectedLoadout.offHandWeapon === undefined ||
        !wildShapeCanUseWornLoadoutObject({
          loadout: origin.selectedLoadout,
          formLimbs: activeWildShape.formLimbs,
          equipmentDisposition: activeWildShape.equipmentDisposition,
          objectKind: "offHandWeapon",
          objectId: origin.offHandAttack.weaponObjectId,
        })))
      ? []
      : [
          {
            objectId: origin.offHandAttack.weaponObjectId,
            attack: origin.offHandAttack,
          },
        ]),
  ].filter(({ attack }) => attack.weapon.costGp >= 0.01);
}

const byKind = Match.discriminator("kind");

function weaponMatchesProficiency(
  weapon: CharacterWeaponAttackActionOption["weapon"],
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
        weapon.properties.some((property) =>
          propertyProficiency.anyOfProperties.includes(property.kind),
        ) === true,
    ),
    Match.exhaustive,
  );
}

function discoverSpellHostedWeaponAttackCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: import("../../battle-state-execution.ts").BattleExecutableSpellInvocation<SpellHostedWeaponAttackInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const componentWeapon = spellHostedWeaponAttackForExecution(
    state,
    actorId,
    invocation.componentWeaponObjectId,
  );
  if (componentWeapon === undefined) {
    return [];
  }
  const targetHole = attackTargetHole(state, actorId, componentWeapon.attack);
  return targetHole.choices.length === 0
    ? []
    : [
        {
          subject: {
            tag: "actionSpell",
            actorId,
            procedureRef: invocation.sourceProcedureRef,
            mode: { tag: "cast" },
          },
          initialHoles: [spellDamageTypeChoiceHole(invocation), targetHole],
        },
      ];
}

function resolveSpellHostedWeaponAttack(
  input: SpellHostedWeaponAttackResolveInput,
): BattleResolutionResult {
  const componentWeapon = spellHostedWeaponAttackForExecution(
    input.input.state,
    input.actorId,
    input.invocation.componentWeaponObjectId,
  );
  if (componentWeapon === undefined) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Spell-hosted weapon attack component weapon is no longer available.",
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
  const attack = spellHostedWeaponAttack(
    input.invocation,
    componentWeapon.attack,
    selectedDamageType,
  );
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
    handledInterruptTrigger: _handledInterruptTrigger,
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
    ...(input.input.handledInterruptTrigger === undefined
      ? {}
      : { handledInterruptTrigger: input.input.handledInterruptTrigger }),
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
      subject: baseInput.subject,
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
  invocation: SpellHostedWeaponAttackResolveInput["invocation"],
  attack: BoundCharacterWeaponAttackActionOption,
  damageType: DamageType,
): BoundCharacterWeaponAttackActionOption {
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

function spellHostedWeaponAttackForExecution(
  state: BattleState,
  actorId: CombatantId,
  componentWeaponObjectId: BattleObjectId,
):
  | {
      readonly objectId: BattleObjectId;
      readonly attack: BoundCharacterWeaponAttackActionOption;
    }
  | undefined {
  const actor = state.combatants.get(actorId);
  if (actor === undefined || !isCharacterBattleCreatureState(actor)) {
    return undefined;
  }
  return spellHostedWeaponAttacks(actor).find(
    ({ objectId }) => objectId === componentWeaponObjectId,
  );
}

function spellHostedWeaponAttackBonusDamageAdditions(
  invocation: BattleExecutableSpellInvocation<SpellHostedWeaponAttackInvocation>,
  actorId: CombatantId,
): readonly AttackSpellDamageAddition[] {
  return invocation.bonusDamage === null ||
    invocation.bonusDamage.expr.dice <= 0
    ? []
    : [
        {
          kind: "attackSpellDamageAddition",
          sourceProcedure: "spellHostedWeaponAttack",
          sourceProcedureRef: invocation.sourceProcedureRef,
          sourceCombatantId: actorId,
          damage: invocation.bonusDamage,
        },
      ];
}

export const SpellHostedWeaponAttackInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: ClassCantripSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("spellHostedWeaponAttack"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("magicAction"),
      componentWeaponObjectId: BattleObjectId,
      spellcastingAbilityModifier: AbilityModifier,
      attackBonus: AttackBonus,
      damageTypeChoices: Schema.Array(DamageTypeSchema),
      bonusDamage: Schema.NullOr(
        Schema.Struct({
          expr: DiceExprSchema,
          damageType: DamageTypeSchema,
        }),
      ),
    }),
  );
export const spellHostedWeaponAttackProfile: SpellProcedureDeclaration<
  "spellHostedWeaponAttack",
  SpellHostedWeaponAttackInvocation
> = {
  procedure: "spellHostedWeaponAttack",
  executionSchema: SpellHostedWeaponAttackInvocationSchema,
  admit: admitSpellHostedWeaponAttack,
  discoverCastAct: discoverSpellHostedWeaponAttackCastAct,
  resolve: resolveSpellHostedWeaponAttack,
};
