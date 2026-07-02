// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-mist-cloud-form
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MIST_CLOUD_FORM_STATE
//
// Mist-cloud form restrictions and cleanup are derived from the typed
// spellMistCloudForm active effect. They intentionally do not inspect Gaseous
// Form authored identity.

import {
  MIST_CLOUD_FORM_TABLE_SPATIAL_WITNESSES,
  type BattleSubject,
  type MistCloudFormTableSpatialWitness,
} from "../battle-subjects.ts";
import type {
  BattleActiveEffect,
  BattleCreatureState,
  BattleState,
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";
import {
  combatantsAfterConcentrationSpellEffectsEndedIfNoEffects,
  conditionsAfterExpiringSpellConditionEffects,
  type SpellConcentrationEffectSource,
} from "./spell-condition-effects-helpers.ts";

type MistCloudFormEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "spellMistCloudForm" }
>;

export function activeMistCloudFormEffect(
  combatant: BattleCreatureState | undefined,
): MistCloudFormEffect | null {
  return (
    combatant?.activeEffects.find(
      (effect): effect is MistCloudFormEffect =>
        effect.kind === "spellMistCloudForm",
    ) ?? null
  );
}

export function combatantHasMistCloudForm(
  combatant: BattleCreatureState | undefined,
): boolean {
  return activeMistCloudFormEffect(combatant) !== null;
}

export function mistCloudFormBlocksSpeech(
  combatant: BattleCreatureState,
): boolean {
  return combatantHasMistCloudForm(combatant);
}

export function mistCloudFormBlocksObjectManipulation(
  combatant: BattleCreatureState | undefined,
): boolean {
  return combatantHasMistCloudForm(combatant);
}

export function mistCloudFormBlocksSpellcasting(
  combatant: BattleCreatureState | undefined,
): boolean {
  return combatantHasMistCloudForm(combatant);
}

export function mistCloudFormBlocksAttackSubject(
  state: BattleState,
  subject: BattleSubject,
): boolean {
  const actor = state.combatants.get(subject.actorId);
  if (!combatantHasMistCloudForm(actor)) {
    return false;
  }
  return (
    subject.tag === "pactOfTheChainFamiliarAttack" ||
    subject.tag === "monkFocusFlurryOfBlowsStrike" ||
    subject.tag === "unitFeatureHeldWeaponActivation" ||
    (subject.tag === "action" &&
      (subject.action === "attack" ||
        subject.action === "multiattack" ||
        subject.action === "grapple" ||
        subject.action === "shove")) ||
    (subject.tag === "bonusAction" &&
      (subject.action === "offHandAttack" ||
        subject.action === "martialArtsUnarmedStrike" ||
        subject.action === "statBlockActionOption")) ||
    (subject.tag === "runtimeCommand" &&
      subject.command === "opportunityAttack")
  );
}

export function mistCloudFormBlocksObjectSubject(
  state: BattleState,
  subject: BattleSubject,
): boolean {
  const actor = state.combatants.get(subject.actorId);
  if (!mistCloudFormBlocksObjectManipulation(actor)) {
    return false;
  }
  return (
    (subject.tag === "runtimeCommand" &&
      subject.command === "releaseSpellCreatedHeldObject") ||
    subject.tag === "unitFeatureHeldWeaponActivation"
  );
}

export function mistCloudFormSpatialWitnessesForCombatant(
  combatant: BattleCreatureState | undefined,
): readonly MistCloudFormTableSpatialWitness[] {
  return combatantHasMistCloudForm(combatant)
    ? MIST_CLOUD_FORM_TABLE_SPATIAL_WITNESSES
    : [];
}

export function battleStateAfterMistCloudFormSelfDismissal(
  state: BattleState,
  actorId: CombatantId,
): BattleState {
  return battleStateAfterMistCloudFormEndedForTarget(state, actorId);
}

export function battleStateAfterMistCloudFormZeroHitPointCleanup(
  state: BattleState,
  targetId: CombatantId,
  priorTarget: BattleCreatureState,
  nextTarget: BattleCreatureState,
): BattleState {
  return Number(priorTarget.hp) > 0 && Number(nextTarget.hp) === 0
    ? battleStateAfterMistCloudFormEndedForTarget(state, targetId)
    : state;
}

function battleStateAfterMistCloudFormEndedForTarget(
  state: BattleState,
  targetId: CombatantId,
): BattleState {
  const target = state.combatants.get(targetId);
  const effect = activeMistCloudFormEffect(target);
  if (target === undefined || effect === null) {
    return state;
  }
  const source = {
    sourceCombatantId: effect.sourceCombatantId,
    sourceSpellId: effect.sourceSpellId,
  } satisfies SpellConcentrationEffectSource;
  const expiringEffects = target.activeEffects.filter((candidate) =>
    mistCloudFormEffectFromSource(candidate, source),
  );
  const activeEffects = target.activeEffects.filter(
    (candidate) => !mistCloudFormEffectFromSource(candidate, source),
  );
  const nextTarget: BattleCreatureState =
    target.positiveHpUnconscious === null
      ? {
          ...target,
          activeEffects,
          conditions: conditionsAfterExpiringSpellConditionEffects(
            target.conditions,
            activeEffects,
            expiringEffects,
          ),
        }
      : { ...target, activeEffects };
  const combatants = combatantsAfterConcentrationSpellEffectsEndedIfNoEffects(
    new Map(state.combatants).set(targetId, nextTarget),
    source,
  );
  return { ...state, combatants };
}

function mistCloudFormEffectFromSource(
  effect: BattleActiveEffect,
  source: SpellConcentrationEffectSource,
): boolean {
  return (
    (effect.kind === "spellMistCloudForm" ||
      (effect.kind === "conditionImmunity" && effect.condition === "prone")) &&
    effect.sourceCombatantId === source.sourceCombatantId &&
    effect.sourceSpellId === source.sourceSpellId
  );
}
