// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.druid-wild-shape-known-form
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-creature-size-change
import {
  abilityModifier,
  armorClass,
  statBlockArmorClassState,
  type ArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import { abilityScoreToMod } from "@dnd/shared-algebras/ability-score-algebra";
import { elapsedTimeTicksFromHours } from "@dnd/shared-algebras/elapsed-time-algebra";
import { Hp, SIZES } from "@dnd/shared/types";
import { druidWildShapeDurationHoursForClassLevel } from "@dnd/surface/surface/druid-wild-shape-readers";
import type { Size, UnitRecord } from "@dnd/surface/surface/types";
import * as Either from "effect/Either";

import type { StatBlockMutableResourceState } from "../battle-action-options.ts";
import type { BattleDruidWildShapeKnownForm } from "../battle-init.ts";
import type {
  BattleActiveEffect,
  BattleCreatureState,
  BattleState,
  CharacterBattleCreatureState,
} from "../battle-reducer.ts";
import type { BattleDruidWildShapeKnownFormSupportProfile } from "../unit-feature-support.ts";
import type { CombatantId } from "../identity.ts";
import { combatantHasUnendedDruidWildShapeEffect } from "./creature-state-leaves.ts";
import {
  activeCreatureSizeChangeEffect,
  type SpellCreatureSizeChangeEffect,
} from "./creature-size-change-effects.ts";

export type ActiveDruidWildShape = {
  readonly effect: Extract<
    BattleActiveEffect,
    { readonly kind: "druidWildShapeForm" }
  >;
  readonly form: BattleDruidWildShapeKnownForm;
};

export function druidWildShapeKnownFormsIssueForProfile(
  forms: readonly BattleDruidWildShapeKnownForm[] | undefined,
  _profile: BattleDruidWildShapeKnownFormSupportProfile,
): string | null {
  if (forms === undefined) {
    return "Druid Wild Shape battle initialization requires known Beast forms.";
  }
  return null;
}

export function activeDruidWildShapeEffect(
  combatant: BattleCreatureState | undefined,
): Extract<BattleActiveEffect, { readonly kind: "druidWildShapeForm" }> | null {
  return activeDruidWildShape(combatant)?.effect ?? null;
}

export function combatantHasActiveDruidWildShape(
  combatant: BattleCreatureState | undefined,
): boolean {
  return activeDruidWildShapeEffect(combatant) !== null;
}

export function activeDruidWildShapeForm(
  combatant: BattleCreatureState | undefined,
): BattleDruidWildShapeKnownForm | null {
  return activeDruidWildShape(combatant)?.form ?? null;
}

export function activeDruidWildShape(
  combatant: BattleCreatureState | undefined,
): ActiveDruidWildShape | null {
  if (
    combatant === undefined ||
    combatant.origin.kind !== "character" ||
    !combatantHasUnendedDruidWildShapeEffect(combatant)
  ) {
    return null;
  }
  for (const effect of combatant.activeEffects) {
    if (effect.kind !== "druidWildShapeForm") continue;
    const form =
      combatant.origin.druidWildShapeKnownForms?.find(
        (candidate) => candidate.id === effect.formStatBlockId,
      ) ?? null;
    if (form !== null) return { effect, form };
  }
  return null;
}

export function combatantEffectiveSize(combatant: BattleCreatureState): Size {
  const form = activeDruidWildShapeForm(combatant);
  const baseSize = form === null ? combatant.size : literalStatBlockSize(form);
  const sizeChange = activeCreatureSizeChangeEffect(combatant);
  return sizeChange === null
    ? baseSize
    : shiftedCreatureSize(baseSize, sizeChange.direction);
}

function shiftedCreatureSize(
  baseSize: Size,
  direction: SpellCreatureSizeChangeEffect["direction"],
): Size {
  const index = SIZES.indexOf(baseSize);
  const nextIndex = direction === "increase" ? index + 1 : index - 1;
  return SIZES[Math.max(0, Math.min(SIZES.length - 1, nextIndex))] as Size;
}

export function combatantDruidWildShapeArmorClassState(
  combatant: BattleCreatureState,
): ArmorClassState | null {
  const form = activeDruidWildShapeForm(combatant);
  if (form === null) return null;
  return {
    ...statBlockArmorClassState(literalStatBlockArmorClass(form)),
    abilityModifiers: statBlockAbilityModifiers(form),
  };
}

export function removeEndedDruidWildShapeEffects(
  combatant: BattleCreatureState,
): BattleCreatureState["activeEffects"] {
  if (combatantHasUnendedDruidWildShapeEffect(combatant)) {
    return combatant.activeEffects;
  }
  return combatant.activeEffects.filter(
    (effect) => effect.kind !== "druidWildShapeForm",
  );
}

export function assumeDruidWildShapeForm(input: {
  readonly state: BattleState;
  readonly actor: CharacterBattleCreatureState;
  readonly unitId: UnitRecord["id"];
  readonly form: BattleDruidWildShapeKnownForm;
  readonly equipmentDisposition: "merged";
  readonly formResources: StatBlockMutableResourceState;
  readonly profile: BattleDruidWildShapeKnownFormSupportProfile;
}): BattleState {
  const durationTicks = elapsedTimeTicksFromHours(
    druidWildShapeDurationHoursForClassLevel(Number(input.profile.classLevel)),
  );
  if (Either.isLeft(durationTicks)) {
    throw new Error("Druid Wild Shape duration must use whole-hour ticks.");
  }
  const nextActor: CharacterBattleCreatureState = {
    ...input.actor,
    tempHp: Hp(
      Math.max(Number(input.actor.tempHp), Number(input.profile.classLevel)),
    ),
    activeEffects: [
      ...input.actor.activeEffects.filter(
        (effect) => effect.kind !== "druidWildShapeForm",
      ),
      {
        kind: "druidWildShapeForm",
        sourceUnitId: input.unitId,
        sourceCombatantId: input.actor.combatantId,
        formStatBlockId: input.form.id,
        equipmentDisposition: input.equipmentDisposition,
        resources: input.formResources,
        expiresAt: { kind: "duration", durationTicks: durationTicks.right },
      },
    ],
  };
  return {
    ...input.state,
    combatants: new Map(input.state.combatants).set(
      input.actor.combatantId,
      nextActor,
    ),
  };
}

export function updateActiveDruidWildShapeResources(
  combatant: BattleCreatureState,
  resources: StatBlockMutableResourceState,
): BattleCreatureState {
  const active = activeDruidWildShape(combatant);
  if (active === null) return combatant;
  return {
    ...combatant,
    activeEffects: combatant.activeEffects.map((effect) =>
      effect === active.effect ? { ...active.effect, resources } : effect,
    ),
  };
}

export function dismissDruidWildShapeForm(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
}): BattleState {
  const actor = input.state.combatants.get(input.actorId);
  if (actor === undefined) return input.state;
  return {
    ...input.state,
    combatants: new Map(input.state.combatants).set(input.actorId, {
      ...actor,
      activeEffects: actor.activeEffects.filter(
        (effect) => effect.kind !== "druidWildShapeForm",
      ),
    }),
  };
}

function literalStatBlockArmorClass(
  form: BattleDruidWildShapeKnownForm,
): number {
  return Number(armorClass(form.statBlock.ac.value));
}

function literalStatBlockSize(form: BattleDruidWildShapeKnownForm): Size {
  return form.statBlock.size;
}

function statBlockAbilityModifiers(
  form: BattleDruidWildShapeKnownForm,
): ArmorClassState["abilityModifiers"] {
  const scores = form.statBlock.abilityScores;
  return {
    str: abilityModifier(abilityScoreToMod(scores.str)),
    dex: abilityModifier(abilityScoreToMod(scores.dex)),
    con: abilityModifier(abilityScoreToMod(scores.con)),
    int: abilityModifier(abilityScoreToMod(scores.int)),
    wis: abilityModifier(abilityScoreToMod(scores.wis)),
    cha: abilityModifier(abilityScoreToMod(scores.cha)),
  };
}
