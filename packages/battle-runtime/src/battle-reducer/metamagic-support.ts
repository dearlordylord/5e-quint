// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-cast-governor-quickened
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-careful-save-protection
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-heightened-save-disadvantage
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR

import { resourceCount, type ResourceCount } from "@dnd/shared/types";
import type {
  BattleCreatureState,
  SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type {
  BattleSubject,
  SpellMetamagicSelection,
} from "../battle-subjects.ts";
import {
  characterBattleResourceIsPointPool,
  type CharacterBattleMetamagicEffectKind,
  type CharacterBattleMetamagicOptionFact,
  type CharacterBattlePointPoolResourceState,
} from "../character-battle-resources.ts";

export const QUICKENED_METAMAGIC_EFFECT_KIND =
  "action_casting_time_to_bonus_action_with_spell_turn_limit" satisfies CharacterBattleMetamagicEffectKind;
export const CAREFUL_METAMAGIC_EFFECT_KIND =
  "saving_throw_protection" satisfies CharacterBattleMetamagicEffectKind;
export const HEIGHTENED_METAMAGIC_EFFECT_KIND =
  "saving_throw_disadvantage" satisfies CharacterBattleMetamagicEffectKind;
export const DISTANT_METAMAGIC_EFFECT_KIND =
  "spell_range_increase" satisfies CharacterBattleMetamagicEffectKind;
export const EXTENDED_METAMAGIC_EFFECT_KIND =
  "duration_extension_and_concentration_save_advantage" satisfies CharacterBattleMetamagicEffectKind;
export const SUBTLE_METAMAGIC_EFFECT_KIND =
  "component_suppression" satisfies CharacterBattleMetamagicEffectKind;
export const TRANSMUTED_METAMAGIC_EFFECT_KIND =
  "damage_type_substitution" satisfies CharacterBattleMetamagicEffectKind;
export const TWINNED_METAMAGIC_EFFECT_KIND =
  "effective_spell_level_increase_for_extra_target" satisfies CharacterBattleMetamagicEffectKind;
export const EMPOWERED_METAMAGIC_EFFECT_KIND =
  "damage_dice_reroll" satisfies CharacterBattleMetamagicEffectKind;
export const SEEKING_METAMAGIC_EFFECT_KIND =
  "missed_spell_attack_reroll" satisfies CharacterBattleMetamagicEffectKind;

export const QUICKENED_SPELL_METAMAGIC_SELECTION = [
  { effectKind: QUICKENED_METAMAGIC_EFFECT_KIND },
] as const satisfies readonly [SpellMetamagicSelection];

type SpellMetamagicSubject = Extract<
  BattleSubject,
  { readonly tag: "actionSpell" | "bonusActionSpell" }
>;

export function metamagicApplicationsIncludeQuickened(
  applications: readonly CharacterBattleMetamagicOptionFact[],
): boolean {
  return applications.some(
    (application) => application.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
  );
}

export function metamagicActionCostOverride(
  applications: readonly CharacterBattleMetamagicOptionFact[],
): "bonusAction" | undefined {
  return metamagicApplicationsIncludeQuickened(applications)
    ? "bonusAction"
    : undefined;
}

export function discoverSpellMetamagicSelections(input: {
  readonly actor: BattleCreatureState;
  readonly invocation: SupportedSpellInvocation;
}): readonly (readonly [SpellMetamagicSelection])[] {
  if (
    input.actor.origin.kind !== "character" ||
    input.actor.origin.metamagic === undefined
  ) {
    return [];
  }
  return input.actor.origin.metamagic.knownOptions.flatMap((application) => {
    if (
      application.effectKind !== CAREFUL_METAMAGIC_EFFECT_KIND &&
      application.effectKind !== HEIGHTENED_METAMAGIC_EFFECT_KIND
    ) {
      return [];
    }
    if (
      saveMetamagicSupportIssue({
        effectKinds: new Set([application.effectKind]),
        invocation: input.invocation,
        subject: {
          tag: "actionSpell",
          mode: { tag: "cast" },
        },
      }) !== null
    ) {
      return [];
    }
    return metamagicSorceryPointSpendIssue({
      actor: input.actor,
      applications: [application],
    }) === null
      ? [[{ effectKind: application.effectKind }]]
      : [];
  });
}

export function spellMetamagicApplications(
  actor: BattleCreatureState,
  metamagic: readonly Pick<SpellMetamagicSelection, "effectKind">[],
): readonly CharacterBattleMetamagicOptionFact[] {
  if (
    actor.origin.kind !== "character" ||
    actor.origin.metamagic === undefined
  ) {
    return [];
  }
  const knownOptions = actor.origin.metamagic.knownOptions;
  return metamagic.flatMap((selection) =>
    knownOptions.filter((option) => option.effectKind === selection.effectKind),
  );
}

export function spellMetamagicLabel(
  metamagic: readonly Pick<SpellMetamagicSelection, "effectKind">[],
): string {
  return metamagic[0]?.effectKind === CAREFUL_METAMAGIC_EFFECT_KIND
    ? "Careful Spell"
    : metamagic[0]?.effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND
      ? "Heightened Spell"
      : "Quickened Spell";
}

export function saveMetamagicSupportIssue(input: {
  readonly effectKinds: ReadonlySet<CharacterBattleMetamagicEffectKind>;
  readonly invocation: SupportedSpellInvocation;
  readonly subject: Pick<SpellMetamagicSubject, "tag" | "mode">;
}): string | null {
  const saveMetamagicOnly =
    input.effectKinds.size > 0 &&
    [...input.effectKinds].every(
      (effectKind) =>
        effectKind === CAREFUL_METAMAGIC_EFFECT_KIND ||
        effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND,
    );
  if (!saveMetamagicOnly) {
    return "Selected Metamagic option effect is not supported for this spell procedure.";
  }
  if (
    input.subject.tag !== "actionSpell" ||
    input.subject.mode.tag !== "cast"
  ) {
    return "Save-affecting Metamagic is supported only for action-time spell casts.";
  }
  if (input.invocation.procedure === "sleepTargetAdmission") {
    return "Save-affecting Metamagic is not supported for Sleep target admission because Sleep uses a two-stage admission and repeat-save lifecycle.";
  }
  if (
    input.effectKinds.has(HEIGHTENED_METAMAGIC_EFFECT_KIND) &&
    spellInvocationHasRepeatSavingThrowLifecycle(input.invocation)
  ) {
    return "Heightened Spell is not supported for spell procedures with repeat Saving Throws until the selected target is carried through later save holes.";
  }
  if (!spellInvocationSupportsSaveMetamagic(input.invocation)) {
    return "Selected Metamagic option effect is not supported for this spell procedure.";
  }
  return null;
}

export function metamagicSorceryPointSpendIssue(input: {
  readonly actor: BattleCreatureState;
  readonly applications: readonly CharacterBattleMetamagicOptionFact[];
}): string | null {
  if (input.actor.origin.kind !== "character") {
    return "Metamagic selection requires a character with known Metamagic options.";
  }
  const metamagic = input.actor.origin.metamagic;
  if (metamagic === undefined) {
    return "Metamagic selection requires a character with known Metamagic options.";
  }
  const resource = input.actor.origin.resources.find(
    (candidate): candidate is CharacterBattlePointPoolResourceState =>
      candidate.unit.id === metamagic.sorceryPointResourceUnitId &&
      characterBattleResourceIsPointPool(candidate),
  );
  if (resource === undefined) {
    return "Metamagic requires its shared Sorcery Point resource.";
  }
  return Number(resource.pointsRemaining) >=
    Number(metamagicSorceryPointCost(input.applications))
    ? null
    : "Metamagic requires enough unexpended Sorcery Points.";
}

export function metamagicSorceryPointCost(
  applications: readonly CharacterBattleMetamagicOptionFact[],
): ResourceCount {
  return resourceCount(
    applications.reduce(
      (total, application) => total + Number(application.sorceryPointCost),
      0,
    ),
  );
}

function spellInvocationSupportsSaveMetamagic(
  invocation: SupportedSpellInvocation,
): boolean {
  return (
    invocation.procedure === "saveGatedDamage" ||
    invocation.procedure === "saveGatedCondition" ||
    invocation.procedure === "saveGatedConditionImmunity" ||
    invocation.procedure === "saveGatedAttackRollAdvantage" ||
    invocation.procedure === "hideousLaughter" ||
    invocation.procedure === "command" ||
    invocation.procedure === "greaseGroundHazard" ||
    invocation.procedure === "gustOfWindLine"
  );
}

function spellInvocationHasRepeatSavingThrowLifecycle(
  invocation: SupportedSpellInvocation,
): boolean {
  return (
    invocation.procedure === "hideousLaughter" ||
    invocation.procedure === "greaseGroundHazard" ||
    invocation.procedure === "gustOfWindLine" ||
    (invocation.procedure === "saveGatedCondition" &&
      invocation.effect.repeatSave !== null)
  );
}
