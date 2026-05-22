// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-d20-lifecycle
// Save-gated and attack-damage spell profile projections extracted from spells-profiles.ts.

import {
  elapsedTimeTicksFromTimeSpanDuration,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  movementDeltaFeet,
  movementFeet,
  spellSlotLevel,
  type Ability,
  type Condition,
  type MovementFeet,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import type { CreatureType } from "@dnd/shared/game-facts";
import type {
  ActivationPhase,
  Attachment,
  DiceExpr,
  EffectAtom,
  SpellRecord,
  DiceAmount as SurfaceDiceAmount,
  TargetSelection,
} from "@dnd/surface/surface/types";
import { Either, Match } from "effect";
import {
  COLOR_SPRAY_FAILED_SAVE_CONDITION,
  ENTANGLE_FAILED_SAVE_CONDITION,
  SUPPORTED_POINT_CUBE_SAVE_GATE_SIDE_FEET,
  SUPPORTED_POINT_SPHERE_SAVE_GATE_RADIUS_FEET,
  SUPPORTED_SELF_CONE_SAVE_GATE_LENGTH_FEET,
  damageSpellSource,
  type BattleAttackKindForRedirect,
  type DamageSpellSource,
  type SaveGateFailureEffect,
  type SpellActivationPhase,
  type SpellAttackHitEffect,
  type SpellAttackKind,
  type SpellFailedSaveAttackRollEffect,
  type SpellFailedSaveConditionEffect,
  type SpellFailedSavePostDamageRider,
  type SpellPostSaveAreaEffect,
  type SpellPostDamageRider,
  type SpellSavingThrowRollModeRule,
  type SpellTargeting,
  type SaveGatedConditionImmunitySpellInvocation,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type { CharacterBattleSpellcastingState } from "../character-battle-resources.ts";
import type { CombatantId } from "../identity.ts";
import {
  sameStringSet,
  scalarBuffSpellTargetCount,
  scalarBuffSpellTargetCountBySlot,
} from "./spells-profile-shared.ts";

export type SaveGateConditionSpell = {
  readonly phase: Extract<ActivationPhase, { readonly kind: "save_gate" }>;
  readonly targeting: (slotLevel: SpellSlotLevel) => SpellTargeting;
  readonly targetCreatureTypes: readonly CreatureType[] | null;
  readonly effect: SpellFailedSaveConditionEffect;
  readonly saveRollModeRule: SpellSavingThrowRollModeRule | null;
  readonly rangeFeet: MovementFeet;
};

export type SaveGateAttackRollAdvantageSpell = {
  readonly phase: Extract<ActivationPhase, { readonly kind: "save_gate" }>;
  readonly targeting: Extract<
    SpellTargeting,
    { readonly kind: "pointOriginCube" }
  >;
  readonly effect: SpellFailedSaveAttackRollEffect;
  readonly rangeFeet: MovementFeet;
};

type SleepTargetAdmissionPhase = Extract<
  ActivationPhase,
  { readonly kind: "save_gate" }
> & {
  readonly ability: "wis";
  readonly attachment: {
    readonly kind: "hole";
    readonly value: {
      readonly kind: "area";
      readonly origin: { readonly kind: "point_within_range" };
      readonly shape: {
        readonly kind: "sphere";
        readonly radiusFeet: number;
      };
    };
  };
};
type HideousLaughterPhase = Extract<
  ActivationPhase,
  { readonly kind: "save_gate" }
> & {
  readonly ability: "wis";
  readonly attachment: {
    readonly kind: "hole";
    readonly value: {
      readonly kind: "target";
      readonly selection: TargetSelection;
    };
  };
};

type ExplodingMaxDieThresholdTier = {
  readonly atLevel: number;
  readonly dice: number;
};
type GreaseGroundHazardPhase = Extract<
  ActivationPhase,
  { readonly kind: "save_gate" }
> & {
  readonly ability: "dex";
  readonly attachment: {
    readonly kind: "hole";
    readonly value: {
      readonly kind: "area";
      readonly origin: { readonly kind: "point_within_range" };
      readonly shape: {
        readonly kind: "cube";
        readonly sideFeet: 10;
      };
    };
  };
};
type CommandPhase = Extract<ActivationPhase, { readonly kind: "save_gate" }> & {
  readonly ability: "wis";
  readonly attachment: {
    readonly kind: "hole";
    readonly value: {
      readonly kind: "target";
      readonly selection: TargetSelection;
    };
  };
  readonly onFail: {
    readonly kind: "command_target_next_turn";
    readonly execution: "target_next_turn";
    readonly options: {
      readonly grovel: {
        readonly condition: "prone";
        readonly afterward: "end_turn";
      };
      readonly halt: {
        readonly movement: "none";
        readonly action: "none";
        readonly bonusAction: "none";
        readonly duration: "target_turn";
      };
    };
  };
};
type SaveGateFailedEffect = Extract<
  ActivationPhase,
  { readonly kind: "save_gate" }
>["onFail"];
type ModifyRollAdvantageEffect = Extract<
  SaveGateFailedEffect,
  { readonly kind: "modify_roll_advantage" }
>;
type RayOfEnfeeblementPhase = Extract<
  ActivationPhase,
  { readonly kind: "save_gate" }
> & {
  readonly ability: "con";
  readonly attachment: {
    readonly kind: "hole";
    readonly value: {
      readonly kind: "target";
      readonly selection: TargetSelection;
    };
  };
};

const FIREBALL_BASE_SPELL_LEVEL = 3;
const FIREBALL_RANGE_FEET = 150;
const FIREBALL_AREA_RADIUS_FEET = 20;
const FIREBALL_BASE_DAMAGE_DICE = 8;
const FIREBALL_DAMAGE_DIE_SIZE = 6;
const FIREBALL_SLOT_DAMAGE_DICE_INCREMENT = 1;
const SHATTER_BASE_SPELL_LEVEL = 2;
const SHATTER_RANGE_FEET = 60;
const SHATTER_AREA_RADIUS_FEET = 10;
const SHATTER_BASE_DAMAGE_DICE = 3;
const SHATTER_DAMAGE_DIE_SIZE = 8;
const SHATTER_SLOT_DAMAGE_DICE_INCREMENT = 1;
const BLINDNESS_DEAFNESS_BASE_SPELL_LEVEL = 2;
const BLINDNESS_DEAFNESS_RANGE_FEET = 120;
const BLINDNESS_DEAFNESS_FAILED_SAVE_CONDITION_CHOICES = [
  "blinded",
  "deafened",
] as const satisfies readonly [Condition, ...Condition[]];
const HOLD_PERSON_BASE_SPELL_LEVEL = 2;
const HOLD_PERSON_RANGE_FEET = 60;
const HOLD_PERSON_FAILED_SAVE_CONDITION =
  "paralyzed" as const satisfies Condition;
const HOLD_PERSON_TARGET_CREATURE_TYPES = [
  "humanoid",
] as const satisfies readonly [CreatureType, ...CreatureType[]];
const CALM_EMOTIONS_BASE_SPELL_LEVEL = 2;
const CALM_EMOTIONS_RANGE_FEET = 60;
const CALM_EMOTIONS_AREA_RADIUS_FEET = 20;
const CALM_EMOTIONS_CONDITION_IMMUNITIES = [
  "charmed",
  "frightened",
] as const satisfies readonly [Condition, Condition];
const CALM_EMOTIONS_TARGET_CREATURE_TYPES = [
  "humanoid",
] as const satisfies readonly [CreatureType, ...CreatureType[]];
const RAY_OF_ENFEEBLEMENT_BASE_SPELL_LEVEL = 2;
const RAY_OF_ENFEEBLEMENT_RANGE_FEET = 60;
const RAY_OF_ENFEEBLEMENT_DURATION_AMOUNT = 1;
const RAY_OF_ENFEEBLEMENT_DURATION_UNIT = "minute";

export function hasSaveGateRepeatSaves(
  phase: ActivationPhase | undefined,
): boolean {
  return phase?.kind === "save_gate" && phase.repeatSaves !== undefined;
}

export function supportedCantripSaveGateDamageProfile(
  spell: SpellRecord,
  characterLevel: number,
): readonly SupportedSpellInvocation[] {
  return supportedSaveGateDamageProfile({
    spell,
    access: { tag: "classCantrip" },
    resource: { tag: "none" },
    characterLevel,
  });
}

export function supportedPreparedSaveGateDamageProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return supportedSaveGateDamageProfile({
      spell,
      access: { tag: "prepared" },
      resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
      slotLevel: slot.spellLevel,
    });
  });
}

export function supportedPreparedSaveGateConditionProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const conditionSpell = supportedSaveGateConditionSpell(spell);
  if (conditionSpell === null) {
    return [];
  }

  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
        procedure: "saveGatedCondition",
        spell,
        ability: conditionSpell.phase.ability,
        dc: conditionSpell.phase.dc,
        targeting: conditionSpell.targeting(slot.spellLevel),
        targetCreatureTypes: conditionSpell.targetCreatureTypes,
        effect: conditionSpell.effect,
        saveRollModeRule: conditionSpell.saveRollModeRule,
        rangeFeet: conditionSpell.rangeFeet,
      },
    ];
  });
}

export function supportedSaveGateConditionSpell(
  spell: SpellRecord,
): SaveGateConditionSpell | null {
  return (
    animalFriendshipSaveGateConditionSpell(spell) ??
    blindnessDeafnessSaveGateConditionSpell(spell) ??
    charmPersonSaveGateConditionSpell(spell) ??
    holdPersonSaveGateConditionSpell(spell) ??
    colorSpraySaveGateConditionSpell(spell) ??
    entangleSaveGateConditionSpell(spell)
  );
}

export function supportedPreparedSaveGateAttackRollAdvantageProfile(
  actorId: CombatantId,
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const attackRollAdvantageSpell = faerieFireSaveGateAttackRollAdvantageSpell(
    actorId,
    spell,
  );
  if (attackRollAdvantageSpell === null) {
    return [];
  }

  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
        procedure: "saveGatedAttackRollAdvantage",
        spell,
        ability: attackRollAdvantageSpell.phase.ability,
        dc: attackRollAdvantageSpell.phase.dc,
        targeting: attackRollAdvantageSpell.targeting,
        effect: attackRollAdvantageSpell.effect,
        rangeFeet: attackRollAdvantageSpell.rangeFeet,
      },
    ];
  });
}

export function supportedPreparedAbilityD20TestRollModeSaveGateProfile(
  actorId: CombatantId,
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const d20Lifecycle = abilityD20TestRollModeSaveGateSpell(actorId, spell);
  if (d20Lifecycle === null) {
    return [];
  }

  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
        procedure: "abilityD20TestRollModeSaveGate",
        spell,
        actionCost: "magicAction",
        ability: d20Lifecycle.phase.ability,
        dc: d20Lifecycle.phase.dc,
        targeting: d20Lifecycle.targeting,
        rangeFeet: d20Lifecycle.rangeFeet,
        successEffect: d20Lifecycle.successEffect,
        failedSaveEffect: d20Lifecycle.failedSaveEffect,
      },
    ];
  });
}

export function supportedPreparedSaveGateConditionImmunityProfile(
  actorId: CombatantId,
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const conditionImmunitySpell = calmEmotionsSaveGateConditionImmunitySpell(
    actorId,
    spell,
  );
  if (conditionImmunitySpell === null) {
    return [];
  }

  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
        procedure: "saveGatedConditionImmunity",
        spell,
        actionCost: "magicAction",
        ability: conditionImmunitySpell.phase.ability,
        dc: conditionImmunitySpell.phase.dc,
        targeting: conditionImmunitySpell.targeting,
        targetCreatureTypes: conditionImmunitySpell.targetCreatureTypes,
        activeEffects: conditionImmunitySpell.activeEffects,
        rangeFeet: conditionImmunitySpell.rangeFeet,
      },
    ];
  });
}

function calmEmotionsSaveGateConditionImmunitySpell(
  actorId: CombatantId,
  spell: SpellRecord,
): {
  readonly phase: Extract<ActivationPhase, { readonly kind: "save_gate" }>;
  readonly targeting: Extract<
    SpellTargeting,
    { readonly kind: "pointOriginSphere" }
  >;
  readonly targetCreatureTypes: typeof CALM_EMOTIONS_TARGET_CREATURE_TYPES;
  readonly activeEffects: SaveGatedConditionImmunitySpellInvocation["activeEffects"];
  readonly rangeFeet: MovementFeet;
} | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const area =
    phase?.kind === "save_gate" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "area"
      ? phase.attachment.value
      : null;
  const targetSelection = area?.selection;
  const immunityEffects =
    phase?.kind === "save_gate"
      ? conditionImmunityEffectsFromSaveGateFailure(phase.onFail)
      : null;
  if (
    spell.mechanics.level !== CALM_EMOTIONS_BASE_SPELL_LEVEL ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== CALM_EMOTIONS_RANGE_FEET ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "save_gate" ||
    hasSaveGateRepeatSaves(phase) ||
    phase.ability !== "cha" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.onSuccess.kind !== "none" ||
    area === null ||
    area.origin.kind !== "point_within_range" ||
    area.shape.kind !== "sphere" ||
    area.shape.radiusFeet !== CALM_EMOTIONS_AREA_RADIUS_FEET ||
    targetSelection?.mode !== "any_number" ||
    !sameStringSet(targetSelection.targetKinds ?? [], ["creature"]) ||
    !sameStringSet(
      targetSelection.typeFilter ?? [],
      CALM_EMOTIONS_TARGET_CREATURE_TYPES,
    ) ||
    immunityEffects === null
  ) {
    return null;
  }

  return {
    phase,
    targeting: {
      kind: "pointOriginSphere",
      radiusFeet: movementFeet(area.shape.radiusFeet),
    },
    targetCreatureTypes: CALM_EMOTIONS_TARGET_CREATURE_TYPES,
    activeEffects: [
      {
        kind: "conditionImmunity",
        sourceSpellId: spell.id,
        sourceCombatantId: actorId,
        condition: CALM_EMOTIONS_CONDITION_IMMUNITIES[0],
        expiresAt: { kind: "concentration", combatantId: actorId },
      },
      {
        kind: "conditionImmunity",
        sourceSpellId: spell.id,
        sourceCombatantId: actorId,
        condition: CALM_EMOTIONS_CONDITION_IMMUNITIES[1],
        expiresAt: { kind: "concentration", combatantId: actorId },
      },
    ],
    rangeFeet: movementFeet(spell.mechanics.range.feet),
  };
}

type GrantConditionImmunitySaveGateEffect = Extract<
  SaveGateFailedEffect,
  { readonly kind: "grant_condition_immunity" }
>;

function conditionImmunityEffectsFromSaveGateFailure(
  effect: SaveGateFailedEffect,
):
  | readonly [
      GrantConditionImmunitySaveGateEffect,
      GrantConditionImmunitySaveGateEffect,
    ]
  | null {
  const effects =
    effect.kind === "composite" ? effect.effects : ([effect] as const);
  const immunities = effects.filter(
    (candidate): candidate is GrantConditionImmunitySaveGateEffect =>
      candidate.kind === "grant_condition_immunity",
  );
  return effects.length === CALM_EMOTIONS_CONDITION_IMMUNITIES.length &&
    immunities.length === CALM_EMOTIONS_CONDITION_IMMUNITIES.length &&
    sameStringSet(
      immunities.map((immunity) => immunity.condition),
      CALM_EMOTIONS_CONDITION_IMMUNITIES,
    )
    ? [immunities[0]!, immunities[1]!]
    : null;
}

export function supportedPreparedSleepTargetAdmissionProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const sleep = sleepTargetAdmissionSpell(spell);
  if (sleep === null) {
    return [];
  }

  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
        procedure: "sleepTargetAdmission",
        spell,
        ability: sleep.phase.ability,
        dc: sleep.phase.dc,
        targeting: sleep.targeting,
        rangeFeet: sleep.rangeFeet,
      },
    ];
  });
}

export function supportedPreparedHideousLaughterProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const hideousLaughter = hideousLaughterSpell(spell);
  if (hideousLaughter === null) {
    return [];
  }

  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
        procedure: "hideousLaughter",
        spell,
        actionCost: "magicAction",
        ability: hideousLaughter.phase.ability,
        dc: hideousLaughter.phase.dc,
        targeting: hideousLaughter.targeting(slot.spellLevel),
        rangeFeet: hideousLaughter.rangeFeet,
      },
    ];
  });
}

export function supportedPreparedGreaseGroundHazardProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const grease = greaseGroundHazardSpell(spell);
  if (grease === null) {
    return [];
  }

  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
        procedure: "greaseGroundHazard",
        spell,
        ability: grease.phase.ability,
        dc: grease.phase.dc,
        targeting: grease.targeting,
        durationTicks: grease.durationTicks,
        rangeFeet: grease.rangeFeet,
      },
    ];
  });
}

export function supportedPreparedCommandProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const command = commandSpell(spell);
  if (command === null) {
    return [];
  }

  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
        procedure: "command",
        spell,
        actionCost: "magicAction",
        ability: command.phase.ability,
        dc: command.phase.dc,
        targeting: command.targeting(slot.spellLevel),
        rangeFeet: command.rangeFeet,
      },
    ];
  });
}

function commandSpell(spell: SpellRecord): {
  readonly phase: CommandPhase;
  readonly targeting: (
    slotLevel: SpellSlotLevel,
  ) => Extract<SpellTargeting, { readonly kind: "targetList" }>;
  readonly rangeFeet: MovementFeet;
} | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  if (
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 60 ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    spell.mechanics.phases.length !== 1 ||
    !isCommandPhase(phase)
  ) {
    return null;
  }
  const targetSelection = phase.attachment.value.selection;
  const targetCountBySlot = commandTargetCountBySlot(
    targetSelection,
    spell.mechanics.level,
  );
  if (
    targetSelection.mode !== "choose_up_to" ||
    targetSelection.targetKinds?.length !== 1 ||
    targetSelection.targetKinds[0] !== "creature" ||
    targetCountBySlot === null ||
    targetCountBySlot(spellSlotLevel(spell.mechanics.level)) !== 1
  ) {
    return null;
  }

  return {
    phase,
    targeting: (slotLevel) => ({
      kind: "targetList",
      minTargets: 1,
      maxTargets: targetCountBySlot(slotLevel),
    }),
    rangeFeet: movementFeet(spell.mechanics.range.feet),
  };
}

function isCommandPhase(
  phase: ActivationPhase | undefined,
): phase is CommandPhase {
  const failedEffect = phase?.kind === "save_gate" ? phase.onFail : undefined;
  return (
    phase?.kind === "save_gate" &&
    !hasSaveGateRepeatSaves(phase) &&
    phase.ability === "wis" &&
    phase.dc.kind === "caster_spell_save_dc" &&
    phase.onSuccess.kind === "none" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "target" &&
    failedEffect?.kind === "command_target_next_turn" &&
    failedEffect.execution === "target_next_turn" &&
    failedEffect.options.grovel.condition === "prone" &&
    failedEffect.options.grovel.afterward === "end_turn" &&
    failedEffect.options.halt.movement === "none" &&
    failedEffect.options.halt.action === "none" &&
    failedEffect.options.halt.bonusAction === "none" &&
    failedEffect.options.halt.duration === "target_turn"
  );
}

function commandTargetCountBySlot(
  selection: TargetSelection,
  spellLevel: number,
): ((slotLevel: SpellSlotLevel) => number) | null {
  if (selection.mode !== "choose_up_to" || selection.count === undefined) {
    return null;
  }
  const count = selection.count;
  if (
    typeof count === "number" ||
    count.kind !== "linear" ||
    count.base !== 1 ||
    (count.baseLevel ?? spellLevel) !== spellLevel ||
    count.perSlotAboveBase !== 1
  ) {
    return null;
  }
  return scalarBuffSpellTargetCountBySlot(selection, spellLevel);
}

function greaseGroundHazardSpell(spell: SpellRecord): {
  readonly phase: GreaseGroundHazardPhase;
  readonly targeting: Extract<
    SpellTargeting,
    { readonly kind: "pointOriginCube" }
  >;
  readonly durationTicks: ElapsedTimeTicks;
  readonly rangeFeet: MovementFeet;
} | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const durationTicks =
    spell.mechanics.duration.kind === "timed"
      ? elapsedTimeTicksFromTimeSpanDuration(spell.mechanics.duration.value)
      : null;
  if (
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 60 ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "minute" ||
    spell.mechanics.duration.value.amount !== 1 ||
    spell.mechanics.phases.length !== 1 ||
    !isGreaseGroundHazardPhase(phase) ||
    durationTicks === null ||
    Either.isLeft(durationTicks)
  ) {
    return null;
  }

  return {
    phase,
    targeting: {
      kind: "pointOriginCube",
      sideFeet: movementFeet(phase.attachment.value.shape.sideFeet),
    },
    durationTicks: durationTicks.right,
    rangeFeet: movementFeet(spell.mechanics.range.feet),
  };
}

function isGreaseGroundHazardPhase(
  phase: ActivationPhase | undefined,
): phase is GreaseGroundHazardPhase {
  const failedEffect = phase?.kind === "save_gate" ? phase.onFail : undefined;
  return (
    phase?.kind === "save_gate" &&
    !hasSaveGateRepeatSaves(phase) &&
    phase.ability === "dex" &&
    phase.dc.kind === "caster_spell_save_dc" &&
    phase.onSuccess.kind === "none" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "area" &&
    phase.attachment.value.origin.kind === "point_within_range" &&
    phase.attachment.value.shape.kind === "cube" &&
    phase.attachment.value.shape.sideFeet === 10 &&
    failedEffect?.kind === "apply_condition" &&
    failedEffect.condition === "prone"
  );
}

function sleepTargetAdmissionSpell(spell: SpellRecord): {
  readonly phase: SleepTargetAdmissionPhase;
  readonly targeting: Extract<
    SpellTargeting,
    { readonly kind: "pointOriginSphere" }
  >;
  readonly rangeFeet: MovementFeet;
} | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const earlyEnd =
    spell.mechanics.duration.kind === "concentration"
      ? (spell.mechanics.duration.earlyEnd ?? [])
      : [];
  if (
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 60 ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    earlyEnd.length !== 1 ||
    earlyEnd[0]?.kind !== "target_takes_damage" ||
    spell.mechanics.phases.length !== 1 ||
    !isSleepTargetAdmissionPhase(phase)
  ) {
    return null;
  }

  return {
    phase,
    targeting: {
      kind: "pointOriginSphere",
      radiusFeet: movementFeet(phase.attachment.value.shape.radiusFeet),
    },
    rangeFeet: movementFeet(spell.mechanics.range.feet),
  };
}

function isSleepTargetAdmissionPhase(
  phase: ActivationPhase | undefined,
): phase is SleepTargetAdmissionPhase {
  const repeatSaves = phase?.kind === "save_gate" ? phase.repeatSaves : [];
  const repeatSave = repeatSaves?.length === 1 ? repeatSaves[0] : undefined;
  const repeatFailure =
    repeatSave !== undefined ? repeatSave.onFailAgain : undefined;
  return (
    phase?.kind === "save_gate" &&
    phase.ability === "wis" &&
    phase.dc.kind === "caster_spell_save_dc" &&
    phase.onSuccess.kind === "none" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "area" &&
    phase.attachment.value.origin.kind === "point_within_range" &&
    phase.attachment.value.shape.kind === "sphere" &&
    phase.attachment.value.shape.radiusFeet ===
      SUPPORTED_POINT_SPHERE_SAVE_GATE_RADIUS_FEET &&
    phase.onFail.kind === "apply_condition" &&
    phase.onFail.condition === "incapacitated" &&
    repeatSave !== undefined &&
    repeatSave.cadence === "end_of_target_turn" &&
    repeatSave.rollMode === undefined &&
    repeatSave.onSuccess === "ends_on_target" &&
    repeatFailure?.kind === "apply_condition" &&
    repeatFailure.condition === "unconscious"
  );
}

function hideousLaughterSpell(spell: SpellRecord): {
  readonly phase: HideousLaughterPhase;
  readonly targeting: (
    slotLevel: SpellSlotLevel,
  ) => Extract<SpellTargeting, { readonly kind: "targetList" }>;
  readonly rangeFeet: MovementFeet;
} | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  if (
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 30 ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.phases.length !== 1 ||
    !isHideousLaughterPhase(phase)
  ) {
    return null;
  }
  const targetCountBySlot = commandTargetCountBySlot(
    phase.attachment.value.selection,
    spell.mechanics.level,
  );
  if (targetCountBySlot === null) {
    return null;
  }
  return {
    phase,
    targeting: (slotLevel) => ({
      kind: "targetList",
      minTargets: 1,
      maxTargets: targetCountBySlot(slotLevel),
    }),
    rangeFeet: movementFeet(spell.mechanics.range.feet),
  };
}

function abilityD20TestRollModeSaveGateSpell(
  actorId: CombatantId,
  spell: SpellRecord,
): {
  readonly phase: RayOfEnfeeblementPhase;
  readonly targeting: Extract<SpellTargeting, { readonly kind: "targetList" }>;
  readonly rangeFeet: MovementFeet;
  readonly successEffect: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "abilityD20TestRollModeSaveGate" }
  >["successEffect"];
  readonly failedSaveEffect: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "abilityD20TestRollModeSaveGate" }
  >["failedSaveEffect"];
} | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const durationTicks =
    spell.mechanics.duration.kind === "concentration"
      ? elapsedTimeTicksFromTimeSpanDuration(spell.mechanics.duration.upTo)
      : null;
  if (
    spell.mechanics.level !== RAY_OF_ENFEEBLEMENT_BASE_SPELL_LEVEL ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== RAY_OF_ENFEEBLEMENT_RANGE_FEET ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== RAY_OF_ENFEEBLEMENT_DURATION_UNIT ||
    spell.mechanics.duration.upTo.amount !==
      RAY_OF_ENFEEBLEMENT_DURATION_AMOUNT ||
    spell.mechanics.phases.length !== 1 ||
    durationTicks === null ||
    Either.isLeft(durationTicks) ||
    !isRayOfEnfeeblementD20LifecyclePhase(phase)
  ) {
    return null;
  }
  return {
    phase,
    targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
    rangeFeet: movementFeet(RAY_OF_ENFEEBLEMENT_RANGE_FEET),
    successEffect: {
      kind: "nextAttackRollBySelf",
      sourceSpellId: spell.id,
      sourceCombatantId: actorId,
      mode: "disadvantage",
      expiresAt: { kind: "startOfTurn", combatantId: actorId },
    },
    failedSaveEffect: {
      kind: "abilityD20TestRollModeEndTurnSave",
      sourceSpellId: spell.id,
      sourceCombatantId: actorId,
      ability: "str",
      mode: "disadvantage",
      save: { ability: "con", dc: { kind: "caster_spell_save_dc" } },
      expiresAt: {
        kind: "concentration",
        combatantId: actorId,
        durationTicks: durationTicks.right,
      },
    },
  };
}

function isRayOfEnfeeblementD20LifecyclePhase(
  phase: ActivationPhase | undefined,
): phase is RayOfEnfeeblementPhase {
  const repeatSaves = phase?.kind === "save_gate" ? (phase.repeatSaves ?? []) : [];
  const repeatSave = repeatSaves.length === 1 ? repeatSaves[0] : undefined;
  const success = phase?.kind === "save_gate" ? phase.onSuccess : undefined;
  const successDisadvantage =
    success?.kind === "modify_roll_advantage" ? success : undefined;
  const failedEffects =
    phase?.kind === "save_gate" && phase.onFail.kind === "composite"
      ? phase.onFail.effects
      : [];
  const d20DisadvantageEffects = failedEffects.filter(
    isRayStrengthD20DisadvantageEffect,
  );
  const damagePenalty = failedEffects.find(
    (effect) => effect.kind === "modify_damage_numeric",
  );
  return (
    phase?.kind === "save_gate" &&
    phase.ability === "con" &&
    phase.dc.kind === "caster_spell_save_dc" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "target" &&
    phase.attachment.value.selection.mode === "one" &&
    successDisadvantage?.mode === "disadvantage" &&
    sameStringSet(successDisadvantage.on, ["attack_roll"]) &&
    successDisadvantage.count === 1 &&
    successDisadvantage.expiresOn?.kind === "caster_turn_start" &&
    successDisadvantage.abilityFilter === undefined &&
    successDisadvantage.skillFilter === undefined &&
    successDisadvantage.conditionFilter === undefined &&
    d20DisadvantageEffects.length === 1 &&
    damagePenalty?.kind === "modify_damage_numeric" &&
    damagePenalty.delta.kind === "fixed_dice" &&
    damagePenalty.delta.sign === "-" &&
    damagePenalty.delta.dice === 1 &&
    damagePenalty.delta.dieSize === 8 &&
    failedEffects.length === 2 &&
    repeatSave !== undefined &&
    repeatSave.cadence === "end_of_target_turn" &&
    repeatSave.onSuccess === "ends_on_target" &&
    repeatSave.rollMode === undefined &&
    repeatSave.onFailAgain === undefined
  );
}

function isRayStrengthD20DisadvantageEffect(
  effect: EffectAtom,
): effect is ModifyRollAdvantageEffect {
  return (
    effect.kind === "modify_roll_advantage" &&
    effect.mode === "disadvantage" &&
    sameStringSet(effect.on, ["attack_roll", "ability_check", "saving_throw"]) &&
    sameAbilitySet(effect.abilityFilter, ["str"]) &&
    effect.skillFilter === undefined &&
    effect.conditionFilter === undefined &&
    effect.count === undefined &&
    effect.expiresOn === undefined
  );
}

function sameAbilitySet(
  actual: ModifyRollAdvantageEffect["abilityFilter"],
  expected: readonly Ability[],
): boolean {
  return Array.isArray(actual) && sameStringSet(actual, expected);
}

function isHideousLaughterPhase(
  phase: ActivationPhase | undefined,
): phase is HideousLaughterPhase {
  const failedEffects =
    phase?.kind === "save_gate" && phase.onFail.kind === "composite"
      ? phase.onFail.effects
      : [];
  const repeatSaves =
    phase?.kind === "save_gate" ? (phase.repeatSaves ?? []) : [];
  return (
    phase?.kind === "save_gate" &&
    phase.ability === "wis" &&
    phase.dc.kind === "caster_spell_save_dc" &&
    phase.onSuccess.kind === "none" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "target" &&
    failedEffects.length === 3 &&
    failedEffects.filter(
      (effect) =>
        effect.kind === "apply_condition" && effect.condition === "prone",
    ).length === 1 &&
    failedEffects.filter(
      (effect) =>
        effect.kind === "apply_condition" &&
        effect.condition === "incapacitated",
    ).length === 1 &&
    failedEffects.filter(
      (effect) =>
        effect.kind === "suppress_condition_self_end" &&
        effect.condition === "prone",
    ).length === 1 &&
    repeatSaves.length === 2 &&
    repeatSaves.some(
      (repeatSave) =>
        repeatSave.cadence === "end_of_target_turn" &&
        repeatSave.rollMode === undefined &&
        repeatSave.onSuccess === "ends_on_target" &&
        repeatSave.onFailAgain === undefined,
    ) &&
    repeatSaves.some(
      (repeatSave) =>
        repeatSave.cadence === "on_target_takes_damage" &&
        repeatSave.rollMode === "advantage" &&
        repeatSave.onSuccess === "ends_on_target" &&
        repeatSave.onFailAgain === undefined,
    )
  );
}

export function faerieFireSaveGateAttackRollAdvantageSpell(
  actorId: CombatantId,
  spell: SpellRecord,
): SaveGateAttackRollAdvantageSpell | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const failedEffect = phase?.kind === "save_gate" ? phase.onFail : undefined;
  const attackAdvantageEffect =
    faerieFireFailedSaveAttackAdvantageEffect(failedEffect);
  if (
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 60 ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "save_gate" ||
    hasSaveGateRepeatSaves(phase) ||
    phase.ability !== "dex" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.onSuccess.kind !== "none" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "area" ||
    phase.attachment.value.origin.kind !== "point_within_range" ||
    phase.attachment.value.shape.kind !== "cube" ||
    phase.attachment.value.shape.sideFeet !==
      SUPPORTED_POINT_CUBE_SAVE_GATE_SIDE_FEET ||
    attackAdvantageEffect === null
  ) {
    return null;
  }

  return {
    phase,
    targeting: {
      kind: "pointOriginCube",
      sideFeet: movementFeet(phase.attachment.value.shape.sideFeet),
    },
    effect: {
      kind: "faerieFireOutline",
      sourceSpellId: spell.id,
      sourceCombatantId: actorId,
      expiresAt: { kind: "concentration", combatantId: actorId },
    },
    rangeFeet: movementFeet(spell.mechanics.range.feet),
  };
}

function faerieFireFailedSaveAttackAdvantageEffect(
  effect: SaveGateFailedEffect | undefined,
): ModifyRollAdvantageEffect | null {
  if (effect?.kind !== "composite" || effect.effects.length !== 2) {
    return null;
  }
  const attackAdvantageEffects = effect.effects.filter(
    (candidate): candidate is ModifyRollAdvantageEffect =>
      candidate.kind === "modify_roll_advantage" &&
      candidate.mode === "advantage" &&
      sameStringSet(candidate.on, ["attack_roll"]),
  );
  const suppressesInvisible = effect.effects.some(
    (candidate) =>
      candidate.kind === "suppress_condition_benefit" &&
      candidate.condition === "invisible",
  );
  return attackAdvantageEffects.length === 1 && suppressesInvisible
    ? attackAdvantageEffects[0]
    : null;
}

export function animalFriendshipSaveGateConditionSpell(
  spell: SpellRecord,
): SaveGateConditionSpell | null {
  return creatureTypeCharmedSaveGateConditionSpell({
    spell,
    duration: { unit: "hour", amount: 24 },
    targetCreatureType: "beast",
    saveRollModeRule: null,
  });
}

export function charmPersonSaveGateConditionSpell(
  spell: SpellRecord,
): SaveGateConditionSpell | null {
  return creatureTypeCharmedSaveGateConditionSpell({
    spell,
    duration: { unit: "hour", amount: 1 },
    targetCreatureType: "humanoid",
    saveRollModeRule: { kind: "hostileTarget", mode: "advantage" },
  });
}

export function blindnessDeafnessSaveGateConditionSpell(
  spell: SpellRecord,
): SaveGateConditionSpell | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const failedEffect = phase?.kind === "save_gate" ? phase.onFail : undefined;
  const failedCondition =
    failedEffect?.kind === "apply_condition" ? failedEffect.condition : null;
  const targetSelection =
    phase?.kind === "save_gate" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "target"
      ? phase.attachment.value.selection
      : null;
  const repeatSaves =
    phase?.kind === "save_gate" ? (phase.repeatSaves ?? []) : [];
  const repeatSave = repeatSaves.length === 1 ? repeatSaves[0] : undefined;
  const durationTicks =
    spell.mechanics.duration.kind === "timed"
      ? elapsedTimeTicksFromTimeSpanDuration(spell.mechanics.duration.value)
      : null;
  if (
    spell.mechanics.level !== BLINDNESS_DEAFNESS_BASE_SPELL_LEVEL ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== BLINDNESS_DEAFNESS_RANGE_FEET ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "minute" ||
    spell.mechanics.duration.value.amount !== 1 ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "save_gate" ||
    phase.ability !== "con" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.onSuccess.kind !== "none" ||
    targetSelection === null ||
    targetSelection.mode !== "choose_up_to" ||
    targetSelection.count === undefined ||
    failedCondition === null ||
    typeof failedCondition === "string" ||
    !("kind" in failedCondition) ||
    failedCondition.kind !== "choose" ||
    !sameStringSet(
      failedCondition.from,
      BLINDNESS_DEAFNESS_FAILED_SAVE_CONDITION_CHOICES,
    ) ||
    repeatSave === undefined ||
    repeatSave.cadence !== "end_of_target_turn" ||
    repeatSave.rollMode !== undefined ||
    repeatSave.onSuccess !== "ends_on_target" ||
    repeatSave.onFailAgain !== undefined ||
    durationTicks === null ||
    Either.isLeft(durationTicks)
  ) {
    return null;
  }
  const targetCountBySlot = commandTargetCountBySlot(
    targetSelection,
    spell.mechanics.level,
  );
  if (
    targetCountBySlot === null ||
    (targetSelection.targetKinds !== undefined &&
      !sameStringSet(targetSelection.targetKinds, ["creature"])) ||
    targetCountBySlot(spellSlotLevel(spell.mechanics.level)) !== 1
  ) {
    return null;
  }

  return {
    phase,
    targeting: (slotLevel) => ({
      kind: "targetList",
      minTargets: 1,
      maxTargets: targetCountBySlot(slotLevel),
    }),
    targetCreatureTypes: null,
    effect: {
      kind: "choice",
      choices: BLINDNESS_DEAFNESS_FAILED_SAVE_CONDITION_CHOICES,
      expiresAt: { kind: "duration", durationTicks: durationTicks.right },
      escape: null,
      turnStartDamage: null,
      repeatSave: {
        ability: phase.ability,
        dc: phase.dc,
      },
    },
    saveRollModeRule: null,
    rangeFeet: movementFeet(spell.mechanics.range.feet),
  };
}

export function holdPersonSaveGateConditionSpell(
  spell: SpellRecord,
): SaveGateConditionSpell | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const failedEffect = phase?.kind === "save_gate" ? phase.onFail : undefined;
  const targetSelection =
    phase?.kind === "save_gate" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "target"
      ? phase.attachment.value.selection
      : null;
  const repeatSaves =
    phase?.kind === "save_gate" ? (phase.repeatSaves ?? []) : [];
  const repeatSave = repeatSaves.length === 1 ? repeatSaves[0] : undefined;
  const durationTicks =
    spell.mechanics.duration.kind === "concentration"
      ? elapsedTimeTicksFromTimeSpanDuration(spell.mechanics.duration.upTo)
      : null;
  if (
    spell.mechanics.level !== HOLD_PERSON_BASE_SPELL_LEVEL ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== HOLD_PERSON_RANGE_FEET ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "save_gate" ||
    phase.ability !== "wis" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.onSuccess.kind !== "none" ||
    targetSelection === null ||
    targetSelection.mode !== "choose_up_to" ||
    targetSelection.count === undefined ||
    !sameStringSet(
      targetSelection.typeFilter ?? [],
      HOLD_PERSON_TARGET_CREATURE_TYPES,
    ) ||
    failedEffect?.kind !== "apply_condition" ||
    failedEffect.condition !== HOLD_PERSON_FAILED_SAVE_CONDITION ||
    repeatSave === undefined ||
    repeatSave.cadence !== "end_of_target_turn" ||
    repeatSave.rollMode !== undefined ||
    repeatSave.onSuccess !== "ends_on_target" ||
    repeatSave.onFailAgain !== undefined ||
    durationTicks === null ||
    Either.isLeft(durationTicks)
  ) {
    return null;
  }
  const targetCountBySlot = commandTargetCountBySlot(
    targetSelection,
    spell.mechanics.level,
  );
  if (
    targetCountBySlot === null ||
    targetCountBySlot(spellSlotLevel(spell.mechanics.level)) !== 1
  ) {
    return null;
  }

  return {
    phase,
    targeting: (slotLevel) => ({
      kind: "targetList",
      minTargets: 1,
      maxTargets: targetCountBySlot(slotLevel),
    }),
    targetCreatureTypes: HOLD_PERSON_TARGET_CREATURE_TYPES,
    effect: {
      kind: "fixed",
      condition: HOLD_PERSON_FAILED_SAVE_CONDITION,
      expiresAt: { kind: "concentration", durationTicks: durationTicks.right },
      escape: null,
      turnStartDamage: null,
      repeatSave: {
        ability: phase.ability,
        dc: phase.dc,
      },
    },
    saveRollModeRule: null,
    rangeFeet: movementFeet(spell.mechanics.range.feet),
  };
}

function creatureTypeCharmedSaveGateConditionSpell(input: {
  readonly spell: SpellRecord;
  readonly duration: { readonly unit: "hour"; readonly amount: 1 | 24 };
  readonly targetCreatureType: CreatureType;
  readonly saveRollModeRule: SpellSavingThrowRollModeRule | null;
}): SaveGateConditionSpell | null {
  const spell = input.spell;
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const failedEffect = phase?.kind === "save_gate" ? phase.onFail : undefined;
  const targetSelection =
    phase?.kind === "save_gate" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "target"
      ? phase.attachment.value.selection
      : null;
  const earlyEnd =
    spell.mechanics.duration.kind === "timed"
      ? (spell.mechanics.duration.earlyEnd ?? [])
      : [];
  if (
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 30 ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== input.duration.unit ||
    spell.mechanics.duration.value.amount !== input.duration.amount ||
    earlyEnd.length !== 1 ||
    earlyEnd[0]?.kind !== "target_damaged_by_caster_or_ally" ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "save_gate" ||
    hasSaveGateRepeatSaves(phase) ||
    phase.ability !== "wis" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.onSuccess.kind !== "none" ||
    targetSelection === null ||
    targetSelection.mode !== "choose_up_to" ||
    targetSelection.count === undefined ||
    targetSelection.typeFilter?.length !== 1 ||
    targetSelection.typeFilter[0] !== input.targetCreatureType ||
    failedEffect?.kind !== "apply_condition" ||
    failedEffect.condition !== "charmed"
  ) {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.value,
  );
  if (Either.isLeft(durationTicks)) {
    return null;
  }

  return {
    phase,
    targeting: (slotLevel): SpellTargeting => {
      const targetCount = scalarBuffSpellTargetCount(
        targetSelection,
        spell.mechanics.level,
        slotLevel,
      );
      return {
        kind: "targetList",
        minTargets: 1,
        maxTargets: targetCount ?? 1,
      };
    },
    targetCreatureTypes: [input.targetCreatureType],
    effect: {
      kind: "fixed",
      condition: "charmed",
      expiresAt: { kind: "duration", durationTicks: durationTicks.right },
      escape: { kind: "targetDamagedByCasterOrAlly" },
      turnStartDamage: null,
      repeatSave: null,
    },
    saveRollModeRule: input.saveRollModeRule,
    rangeFeet: movementFeet(spell.mechanics.range.feet),
  };
}

export function colorSpraySaveGateConditionSpell(
  spell: SpellRecord,
): SaveGateConditionSpell | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const failedEffect = phase?.kind === "save_gate" ? phase.onFail : undefined;
  if (
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "round" ||
    spell.mechanics.duration.value.amount !== 1 ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "save_gate" ||
    hasSaveGateRepeatSaves(phase) ||
    phase.ability !== "con" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.onSuccess.kind !== "none" ||
    phase.attachment.kind !== "area" ||
    phase.attachment.origin.kind !== "self" ||
    phase.attachment.shape.kind !== "cone" ||
    phase.attachment.shape.lengthFeet !==
      SUPPORTED_SELF_CONE_SAVE_GATE_LENGTH_FEET ||
    failedEffect?.kind !== "apply_condition" ||
    failedEffect.condition !== COLOR_SPRAY_FAILED_SAVE_CONDITION
  ) {
    return null;
  }
  const coneShape = phase.attachment.shape;

  return {
    phase,
    targeting: () => ({
      kind: "selfOriginCone",
      lengthFeet: movementFeet(coneShape.lengthFeet),
    }),
    targetCreatureTypes: null,
    effect: {
      kind: "fixed",
      condition: COLOR_SPRAY_FAILED_SAVE_CONDITION,
      expiresAt: "endOfCasterNextTurn",
      escape: null,
      turnStartDamage: null,
      repeatSave: null,
    },
    saveRollModeRule: null,
    rangeFeet: movementFeet(0),
  };
}

export function entangleSaveGateConditionSpell(
  spell: SpellRecord,
): SaveGateConditionSpell | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const failedEffect = phase?.kind === "save_gate" ? phase.onFail : undefined;
  if (
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 90 ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "save_gate" ||
    hasSaveGateRepeatSaves(phase) ||
    phase.ability !== "str" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.onSuccess.kind !== "none" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "area" ||
    phase.attachment.value.origin.kind !== "point_within_range" ||
    phase.attachment.value.shape.kind !== "cube" ||
    phase.attachment.value.shape.sideFeet !==
      SUPPORTED_POINT_CUBE_SAVE_GATE_SIDE_FEET ||
    failedEffect?.kind !== "apply_condition" ||
    failedEffect.condition !== ENTANGLE_FAILED_SAVE_CONDITION
  ) {
    return null;
  }
  const cubeShape = phase.attachment.value.shape;

  return {
    phase,
    targeting: () => ({
      kind: "pointOriginCubeExcludingCaster",
      sideFeet: movementFeet(cubeShape.sideFeet),
    }),
    targetCreatureTypes: null,
    effect: {
      kind: "fixed",
      condition: ENTANGLE_FAILED_SAVE_CONDITION,
      expiresAt: "concentration",
      escape: {
        kind: "abilityCheck",
        ability: "str",
        skill: "athletics",
        allowedActor: "target",
        successEnds: "condition",
      },
      turnStartDamage: null,
      repeatSave: null,
    },
    saveRollModeRule: null,
    rangeFeet: movementFeet(spell.mechanics.range.feet),
  };
}

export function supportedSaveGateDamageProfile(
  input: {
    readonly spell: SpellRecord;
    readonly slotLevel?: SpellSlotLevel;
    readonly characterLevel?: number;
  } & DamageSpellSource,
): readonly SupportedSpellInvocation[] {
  const spell = input.spell;
  if (spell.mechanics.family !== "activation") {
    return [];
  }
  const phase = spell.mechanics.phases[0];
  const postSaveAreaEffect =
    phase?.kind === "save_gate"
      ? saveGatedDamagePostSaveAreaEffect(
          spell,
          phase,
          spell.mechanics.phases[1],
        )
      : null;
  const saveRollModeRule =
    phase?.kind === "save_gate"
      ? saveGatedDamageSaveRollModeRule(spell, phase)
      : null;
  const targeting =
    phase?.kind === "save_gate"
      ? saveGatedDamageTargeting(spell, phase.attachment)
      : null;
  const rangeFeet =
    targeting?.kind === "singleCombatant"
      ? singleTargetSpellRangeFeet(spell.mechanics.range)
      : targeting === null || targeting.kind === "singleCreatureOrObject"
        ? null
        : areaSaveGateSpellRangeFeet(spell.mechanics.range, targeting);
  const failedSaveEffects =
    phase?.kind === "save_gate"
      ? supportedSaveGateFailedSaveEffects(
          spell,
          phase,
          phase.onFail,
          postSaveAreaEffect,
        )
      : null;
  if (
    (input.access.tag === "classCantrip"
      ? spell.mechanics.level !== 0
      : spell.mechanics.level < 1) ||
    spell.mechanics.castingTime.kind !== "action" ||
    rangeFeet === null ||
    spell.mechanics.phases.length !==
      saveGatedDamagePhaseCount(postSaveAreaEffect) ||
    phase?.kind !== "save_gate" ||
    targeting === null ||
    (phase.onSuccess.kind !== "none" &&
      phase.onSuccess.kind !== "half_damage") ||
    failedSaveEffects === null ||
    typeof failedSaveEffects.damage.damageType !== "string"
  ) {
    return [];
  }
  const damageExpr = supportedDamageAmountExpr({
    amount: failedSaveEffects.damage.amount,
    spellLevel: spell.mechanics.level,
    slotLevel: input.slotLevel,
    characterLevel: input.characterLevel,
  });
  if (damageExpr == null) {
    return [];
  }

  const saveGatedInvocation = {
    procedure: "saveGatedDamage" as const,
    spell,
    ability: phase.ability,
    dc: phase.dc,
    targeting,
    damage: {
      expr: damageExpr,
      damageType: failedSaveEffects.damage.damageType,
    },
    successDamage: (phase.onSuccess.kind === "half_damage"
      ? "half"
      : "none") as "half" | "none",
    rangeFeet,
    failedSavePostDamageRiders: failedSaveEffects.postDamageRiders,
    saveRollModeRule,
    ...(postSaveAreaEffect === null ? {} : { postSaveAreaEffect }),
  };

  return [{ ...damageSpellSource(input), ...saveGatedInvocation }];
}

export function saveGateTargeting(
  attachment: Attachment,
): SpellTargeting | null {
  const value = attachment.kind === "hole" ? attachment.value : attachment;
  if (
    value.kind === "target" &&
    value.selection.mode === "one" &&
    (value.selection.targetKinds === undefined ||
      sameStringSet(value.selection.targetKinds, ["creature"]))
  ) {
    return { kind: "singleCombatant" };
  }
  if (
    value.kind === "area" &&
    value.origin.kind === "point_within_range" &&
    value.shape.kind === "sphere" &&
    value.shape.radiusFeet === SUPPORTED_POINT_SPHERE_SAVE_GATE_RADIUS_FEET
  ) {
    return {
      kind: "pointOriginSphere",
      radiusFeet: movementFeet(value.shape.radiusFeet),
    };
  }
  if (
    value.kind === "area" &&
    value.origin.kind === "point_within_range" &&
    value.shape.kind === "cube" &&
    value.shape.sideFeet === SUPPORTED_POINT_CUBE_SAVE_GATE_SIDE_FEET
  ) {
    return {
      kind: "pointOriginCubeExcludingCaster",
      sideFeet: movementFeet(value.shape.sideFeet),
    };
  }
  if (
    value.kind === "area" &&
    value.origin.kind === "self" &&
    value.shape.kind === "cube" &&
    value.shape.sideFeet === 15
  ) {
    return {
      kind: "selfOriginCube",
      sideFeet: movementFeet(value.shape.sideFeet),
    };
  }
  if (
    value.kind === "area" &&
    value.origin.kind === "self" &&
    value.shape.kind === "cone" &&
    value.shape.lengthFeet === SUPPORTED_SELF_CONE_SAVE_GATE_LENGTH_FEET
  ) {
    return {
      kind: "selfOriginCone",
      lengthFeet: movementFeet(value.shape.lengthFeet),
    };
  }
  return null;
}

function saveGatedDamageTargeting(
  spell: SpellRecord,
  attachment: Attachment,
): SpellTargeting | null {
  return (
    saveGateTargeting(attachment) ??
    fireballPointOriginSphereTargeting(spell, attachment) ??
    shatterPointOriginSphereTargeting(spell, attachment)
  );
}

function fireballPointOriginSphereTargeting(
  spell: SpellRecord,
  attachment: Attachment,
): Extract<SpellTargeting, { readonly kind: "pointOriginSphere" }> | null {
  const value = attachment.kind === "hole" ? attachment.value : attachment;
  if (
    spell.mechanics.level === FIREBALL_BASE_SPELL_LEVEL &&
    spell.mechanics.castingTime.kind === "action" &&
    value.kind === "area" &&
    value.origin.kind === "point_within_range" &&
    value.shape.kind === "sphere" &&
    value.shape.radiusFeet === FIREBALL_AREA_RADIUS_FEET
  ) {
    return {
      kind: "pointOriginSphere",
      radiusFeet: movementFeet(value.shape.radiusFeet),
    };
  }
  return null;
}

function shatterPointOriginSphereTargeting(
  spell: SpellRecord,
  attachment: Attachment,
): Extract<SpellTargeting, { readonly kind: "pointOriginSphere" }> | null {
  const value = attachment.kind === "hole" ? attachment.value : attachment;
  if (
    spell.mechanics.level === SHATTER_BASE_SPELL_LEVEL &&
    spell.mechanics.castingTime.kind === "action" &&
    spell.mechanics.range.kind === "point" &&
    spell.mechanics.range.feet === SHATTER_RANGE_FEET &&
    value.kind === "area" &&
    value.origin.kind === "point_within_range" &&
    value.shape.kind === "sphere" &&
    value.shape.radiusFeet === SHATTER_AREA_RADIUS_FEET
  ) {
    return {
      kind: "pointOriginSphere",
      radiusFeet: movementFeet(value.shape.radiusFeet),
    };
  }
  return null;
}

export function areaSaveGateSpellRangeFeet(
  range: SpellRecord["mechanics"]["range"],
  targeting: Exclude<
    SpellTargeting,
    { readonly kind: "singleCombatant" | "singleCreatureOrObject" }
  >,
): MovementFeet | null {
  return Match.value(targeting).pipe(
    Match.when({ kind: "pointOriginSphere" }, () => fixedPointRangeFeet(range)),
    Match.when({ kind: "pointOriginSphereDiameter" }, () =>
      fixedPointRangeFeet(range),
    ),
    Match.when({ kind: "pointOriginCubeExcludingCaster" }, () =>
      fixedPointRangeFeet(range),
    ),
    Match.when({ kind: "pointOriginCube" }, () => fixedPointRangeFeet(range)),
    Match.when({ kind: "selfOriginCube" }, () =>
      range.kind === "self" ? movementFeet(0) : null,
    ),
    Match.when({ kind: "selfOriginCone" }, () =>
      range.kind === "self" ? movementFeet(0) : null,
    ),
    Match.when({ kind: "selfOriginLine" }, () =>
      range.kind === "self" ? movementFeet(0) : null,
    ),
    Match.when({ kind: "selfOriginEmanation" }, () =>
      range.kind === "self" ? movementFeet(0) : null,
    ),
    Match.when({ kind: "primaryTargetOriginEmanation" }, () =>
      fixedPointRangeFeet(range),
    ),
    Match.when({ kind: "pointOriginCylinder" }, () =>
      fixedPointRangeFeet(range),
    ),
    Match.when({ kind: "targetList" }, () => fixedPointRangeFeet(range)),
    Match.exhaustive,
  );
}

export function singleTargetSpellRangeFeet(
  range: SpellRecord["mechanics"]["range"],
): MovementFeet | null {
  return Match.value(range).pipe(
    Match.when({ kind: "point" }, (point) =>
      typeof point.feet === "number" ? movementFeet(point.feet) : null,
    ),
    Match.when({ kind: "touch" }, () => movementFeet(5)),
    Match.orElse(() => null),
  );
}

function fixedPointRangeFeet(
  range: SpellRecord["mechanics"]["range"],
): MovementFeet | null {
  return range.kind === "point" && typeof range.feet === "number"
    ? movementFeet(range.feet)
    : null;
}

export function supportedSpellAttackKind(
  attackKind: string,
): attackKind is SpellAttackKind {
  return (
    attackKind === "melee_spell_attack" || attackKind === "ranged_spell_attack"
  );
}

export function spellAttackKindForRedirect(
  attackKind: SpellAttackKind,
): BattleAttackKindForRedirect {
  return Match.value(attackKind).pipe(
    Match.when("melee_spell_attack", () => "melee" as const),
    Match.when("ranged_spell_attack", () => "ranged" as const),
    Match.exhaustive,
  );
}

export function supportedSpellPostDamageRiders(
  spell: SpellRecord,
  phase: Extract<SpellActivationPhase, { readonly kind: "attack_roll" }>,
  effects: readonly SpellAttackHitEffect[],
): readonly SpellPostDamageRider[] | null {
  const riders: SpellPostDamageRider[] = [];
  for (const effect of effects) {
    if (effect.kind === "modify_speed") {
      if (effect.unit !== "feet" || effect.delta >= 0) {
        return null;
      }
      riders.push({
        kind: "speedDelta",
        deltaFeet: movementDeltaFeet(effect.delta),
      });
      continue;
    }
    if (
      effect.kind === "apply_condition" &&
      effect.condition === "poisoned" &&
      isRayOfSicknessPoisonedRiderShape(spell, phase)
    ) {
      riders.push({
        kind: "condition",
        condition: effect.condition,
        expiresAt: "endOfCasterNextTurn",
      });
      continue;
    }
    if (
      effect.kind === "deny_opportunity_attack" &&
      isShockingGraspOpportunityAttackRiderShape(spell, phase)
    ) {
      riders.push({
        kind: "opportunityAttackDenied",
        expiresAt: "startOfTargetNextTurn",
      });
      continue;
    }
    if (
      effect.kind === "modify_roll_advantage" &&
      effect.mode === "advantage" &&
      sameStringSet(effect.on ?? [], ["attack_roll"]) &&
      isGuidingBoltNextAttackRiderShape(spell, phase)
    ) {
      riders.push({
        kind: "nextAttackRollAgainstTarget",
        mode: "advantage",
        expiresAt: "endOfCasterNextTurn",
      });
      continue;
    }
    if (
      effect.kind === "prevent_hit_point_regain" &&
      effect.expiresAt === "end_of_caster_next_turn" &&
      isChillTouchHitPointRegainPreventionRiderShape(spell, phase)
    ) {
      riders.push({
        kind: "hitPointRegainPrevented",
        expiresAt: "endOfCasterNextTurn",
      });
      continue;
    }
    if (
      effect.kind === "emit_dim_light" &&
      effect.radiusFeet === 10 &&
      effect.expiresAt === "end_of_caster_next_turn" &&
      isStarryWispDimLightRiderShape(spell, phase)
    ) {
      riders.push({
        kind: "lightEmission",
        emission: {
          kind: "dim",
          radiusFeet: movementFeet(effect.radiusFeet),
        },
        expiresAt: "endOfCasterNextTurn",
      });
      continue;
    }
    if (
      effect.kind === "suppress_condition_benefit" &&
      effect.condition === "invisible" &&
      isStarryWispInvisibleBenefitDenialRiderShape(spell, phase)
    ) {
      riders.push({
        kind: "invisibleBenefitDenied",
        expiresAt: "endOfCasterNextTurn",
      });
      continue;
    }
    return null;
  }
  return riders;
}

export function isStarryWispInvisibleBenefitDenialRiderShape(
  spell: SpellRecord,
  phase: Extract<SpellActivationPhase, { readonly kind: "attack_roll" }>,
): boolean {
  return isStarryWispDimLightRiderShape(spell, phase);
}

export function isStarryWispDimLightRiderShape(
  spell: SpellRecord,
  phase: Extract<SpellActivationPhase, { readonly kind: "attack_roll" }>,
): boolean {
  return (
    spell.mechanics.level === 0 &&
    spell.mechanics.duration.kind === "instantaneous" &&
    phase.attackKind === "ranged_spell_attack"
  );
}

export function isChillTouchHitPointRegainPreventionRiderShape(
  spell: SpellRecord,
  phase: Extract<SpellActivationPhase, { readonly kind: "attack_roll" }>,
): boolean {
  return (
    spell.mechanics.level === 0 &&
    spell.mechanics.duration.kind === "instantaneous" &&
    phase.attackKind === "melee_spell_attack"
  );
}

export function isRayOfSicknessPoisonedRiderShape(
  spell: SpellRecord,
  phase: Extract<SpellActivationPhase, { readonly kind: "attack_roll" }>,
): boolean {
  return (
    spell.mechanics.level === 1 &&
    spell.mechanics.duration.kind === "timed" &&
    spell.mechanics.duration.value.unit === "round" &&
    spell.mechanics.duration.value.amount === 1 &&
    phase.attackKind === "ranged_spell_attack"
  );
}

export function isShockingGraspOpportunityAttackRiderShape(
  spell: SpellRecord,
  phase: Extract<SpellActivationPhase, { readonly kind: "attack_roll" }>,
): boolean {
  return (
    spell.mechanics.level === 0 &&
    spell.mechanics.duration.kind === "instantaneous" &&
    phase.attackKind === "melee_spell_attack"
  );
}

export function isGuidingBoltNextAttackRiderShape(
  spell: SpellRecord,
  phase: Extract<SpellActivationPhase, { readonly kind: "attack_roll" }>,
): boolean {
  return (
    spell.mechanics.level === 1 &&
    spell.mechanics.duration.kind === "timed" &&
    spell.mechanics.duration.value.unit === "round" &&
    spell.mechanics.duration.value.amount === 1 &&
    phase.attackKind === "ranged_spell_attack"
  );
}

export function supportedSaveGateFailedSaveEffects(
  spell: SpellRecord,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
  effect: SaveGateFailureEffect,
  postSaveAreaEffect: SpellPostSaveAreaEffect | null = null,
): {
  readonly damage: Extract<SaveGateFailureEffect, { readonly kind: "damage" }>;
  readonly postDamageRiders: readonly SpellFailedSavePostDamageRider[];
} | null {
  if (postSaveAreaEffect?.kind === "thunderwave" && effect.kind === "damage") {
    return null;
  }
  if (effect.kind === "damage") {
    return { damage: effect, postDamageRiders: [] };
  }
  if (effect.kind !== "composite") {
    return null;
  }
  const [damage, ...riders] = effect.effects;
  if (damage?.kind !== "damage") {
    return null;
  }
  if (
    postSaveAreaEffect?.kind === "thunderwave" &&
    !isThunderwaveFailedSaveDamageShape(damage)
  ) {
    return null;
  }
  if (
    postSaveAreaEffect?.kind === "thunderwave" &&
    riders.filter((rider) => isThunderwaveCreaturePushRiderShape(phase, rider))
      .length !== 1
  ) {
    return null;
  }
  const dissonantWhispersForcedMovementCount = riders.filter((rider) =>
    isDissonantWhispersForcedReactionMovementShape(spell, phase, rider),
  ).length;
  if (
    (dissonantWhispersForcedMovementCount > 0 &&
      (dissonantWhispersForcedMovementCount !== 1 ||
        !isDissonantWhispersFailedSaveDamageShape(damage))) ||
    (isDissonantWhispersFailedSaveDamageShape(damage) &&
      dissonantWhispersForcedMovementCount !== 1)
  ) {
    return null;
  }
  const postDamageRiders = supportedFailedSavePostDamageRiders(
    spell,
    phase,
    riders,
    postSaveAreaEffect,
  );
  return postDamageRiders === null ? null : { damage, postDamageRiders };
}

export function supportedFailedSavePostDamageRiders(
  spell: SpellRecord,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
  effects: readonly SaveGateFailureEffect[],
  postSaveAreaEffect: SpellPostSaveAreaEffect | null = null,
): readonly SpellFailedSavePostDamageRider[] | null {
  const riders: SpellFailedSavePostDamageRider[] = [];
  for (const effect of effects) {
    if (
      postSaveAreaEffect?.kind === "thunderwave" &&
      isThunderwaveCreaturePushRiderShape(phase, effect)
    ) {
      continue;
    }
    if (
      effect.kind === "forced_reaction_movement" &&
      isDissonantWhispersForcedReactionMovementShape(spell, phase, effect)
    ) {
      riders.push({
        kind: "forcedReactionMovement",
        direction: "awayFromCaster",
        route: "safest",
        distance: "asFarAsPossible",
        cost: "targetReactionIfAvailable",
      });
      continue;
    }
    if (
      effect.kind !== "modify_roll_advantage" ||
      effect.mode !== "disadvantage" ||
      !sameStringSet(effect.on ?? [], ["attack_roll"]) ||
      effect.count !== 1 ||
      effect.expiresOn?.kind !== "end_of_next_turn" ||
      (effect.affects ?? "self_roll") !== "self_roll" ||
      !isViciousMockeryNextAttackRiderShape(spell, phase)
    ) {
      return null;
    }
    riders.push({
      kind: "nextAttackRollByTarget",
      mode: "disadvantage",
      expiresAt: "endOfTargetNextTurn",
    });
  }
  return riders;
}

function isDissonantWhispersForcedReactionMovementShape(
  spell: SpellRecord,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
  effect: SaveGateFailureEffect,
): boolean {
  return (
    spell.mechanics.level === 1 &&
    spell.mechanics.castingTime.kind === "action" &&
    spell.mechanics.range.kind === "point" &&
    spell.mechanics.range.feet === 60 &&
    spell.mechanics.duration.kind === "instantaneous" &&
    phase.ability === "wis" &&
    phase.dc.kind === "caster_spell_save_dc" &&
    phase.onSuccess.kind === "half_damage" &&
    effect.kind === "forced_reaction_movement" &&
    effect.cost === "target_reaction_if_available" &&
    effect.direction === "away_from_caster" &&
    effect.distance === "as_far_as_possible" &&
    effect.route === "safest_available" &&
    effect.unavailable === "no_movement"
  );
}

function isDissonantWhispersFailedSaveDamageShape(
  effect: Extract<SaveGateFailureEffect, { readonly kind: "damage" }>,
): boolean {
  const amount = effect.amount;
  return (
    effect.damageType === "psychic" &&
    amount.kind === "linear_per_level" &&
    amount.axis === "slot" &&
    amount.startingAtLevel === 1 &&
    amount.base.dice === 3 &&
    amount.base.dieSize === 6 &&
    amount.base.flat === undefined &&
    amount.base.spellcastingMod === undefined &&
    amount.base.abilityModifier === undefined &&
    amount.perLevel.dice === 1 &&
    amount.perLevel.dieSize === undefined &&
    amount.perLevel.flat === undefined
  );
}

function saveGatedDamagePostSaveAreaEffect(
  spell: SpellRecord,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
  directPhase: SpellActivationPhase | undefined,
): SpellPostSaveAreaEffect | null {
  return (
    fireballPostSaveAreaEffect(spell, phase, directPhase) ??
    shatterPostSaveAreaEffect(spell, phase, directPhase) ??
    thunderwavePostSaveAreaEffect(spell, phase, directPhase)
  );
}

function saveGatedDamagePhaseCount(
  postSaveAreaEffect: SpellPostSaveAreaEffect | null,
): number {
  if (postSaveAreaEffect === null) {
    return 1;
  }
  if (
    postSaveAreaEffect.kind === "fireballObjectIgnition" ||
    postSaveAreaEffect.kind === "thunderwave"
  ) {
    return 2;
  }
  if (postSaveAreaEffect.kind === "shatterObjectDamage") {
    return 1;
  }
  const exhaustive: never = postSaveAreaEffect;
  return exhaustive;
}

function saveGatedDamageSaveRollModeRule(
  spell: SpellRecord,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
): SpellSavingThrowRollModeRule | null {
  return isShatterSaveGateDamageShape(spell, phase)
    ? { kind: "creatureType", creatureType: "construct", mode: "disadvantage" }
    : null;
}

function fireballPostSaveAreaEffect(
  spell: SpellRecord,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
  directPhase: SpellActivationPhase | undefined,
): SpellPostSaveAreaEffect | null {
  const damage = phase.onFail;
  const ignite =
    directPhase?.kind === "direct" ? directPhase.effects?.[0] : undefined;
  if (
    spell.mechanics.level !== FIREBALL_BASE_SPELL_LEVEL ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== FIREBALL_RANGE_FEET ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    phase.ability !== "dex" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.onSuccess.kind !== "half_damage" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "area" ||
    phase.attachment.value.origin.kind !== "point_within_range" ||
    phase.attachment.value.shape.kind !== "sphere" ||
    phase.attachment.value.shape.radiusFeet !== FIREBALL_AREA_RADIUS_FEET ||
    damage.kind !== "damage" ||
    damage.damageType !== "fire" ||
    damage.amount.kind !== "linear_per_level" ||
    damage.amount.axis !== "slot" ||
    damage.amount.startingAtLevel !== FIREBALL_BASE_SPELL_LEVEL ||
    damage.amount.base.dice !== FIREBALL_BASE_DAMAGE_DICE ||
    damage.amount.base.dieSize !== FIREBALL_DAMAGE_DIE_SIZE ||
    damage.amount.perLevel.dice !== FIREBALL_SLOT_DAMAGE_DICE_INCREMENT ||
    directPhase?.kind !== "direct" ||
    directPhase.attachment.kind !== "hole" ||
    directPhase.attachment.value.kind !== "area" ||
    directPhase.attachment.value.origin.kind !== "point_within_range" ||
    directPhase.attachment.value.shape.kind !== "sphere" ||
    directPhase.attachment.value.shape.radiusFeet !==
      FIREBALL_AREA_RADIUS_FEET ||
    directPhase.effects?.length !== 1 ||
    ignite?.kind !== "ignite_objects" ||
    ignite.filter.material !== "flammable" ||
    ignite.filter.targetRelation !== "not_worn_or_carried"
  ) {
    return null;
  }
  return { kind: "fireballObjectIgnition" };
}

function shatterPostSaveAreaEffect(
  spell: SpellRecord,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
  directPhase: SpellActivationPhase | undefined,
): SpellPostSaveAreaEffect | null {
  return directPhase === undefined && isShatterSaveGateDamageShape(spell, phase)
    ? { kind: "shatterObjectDamage" }
    : null;
}

function isShatterSaveGateDamageShape(
  spell: SpellRecord,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
): boolean {
  const damage = phase.onFail;
  return (
    spell.mechanics.level === SHATTER_BASE_SPELL_LEVEL &&
    spell.mechanics.castingTime.kind === "action" &&
    spell.mechanics.range.kind === "point" &&
    spell.mechanics.range.feet === SHATTER_RANGE_FEET &&
    spell.mechanics.duration.kind === "instantaneous" &&
    phase.ability === "con" &&
    phase.dc.kind === "caster_spell_save_dc" &&
    phase.onSuccess.kind === "half_damage" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "area" &&
    phase.attachment.value.origin.kind === "point_within_range" &&
    phase.attachment.value.shape.kind === "sphere" &&
    phase.attachment.value.shape.radiusFeet === SHATTER_AREA_RADIUS_FEET &&
    damage.kind === "damage" &&
    damage.damageType === "thunder" &&
    damage.amount.kind === "linear_per_level" &&
    damage.amount.axis === "slot" &&
    damage.amount.startingAtLevel === SHATTER_BASE_SPELL_LEVEL &&
    damage.amount.base.dice === SHATTER_BASE_DAMAGE_DICE &&
    damage.amount.base.dieSize === SHATTER_DAMAGE_DIE_SIZE &&
    damage.amount.perLevel.dice === SHATTER_SLOT_DAMAGE_DICE_INCREMENT &&
    damage.amount.perLevel.dieSize === undefined &&
    damage.amount.base.flat === undefined &&
    damage.amount.base.spellcastingMod === undefined &&
    damage.amount.base.abilityModifier === undefined &&
    damage.amount.perLevel.flat === undefined
  );
}

function thunderwavePostSaveAreaEffect(
  spell: SpellRecord,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
  directPhase: SpellActivationPhase | undefined,
): SpellPostSaveAreaEffect | null {
  if (
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    phase.ability !== "con" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.onSuccess.kind !== "half_damage" ||
    phase.attachment.kind !== "area" ||
    phase.attachment.origin.kind !== "self" ||
    phase.attachment.shape.kind !== "cube" ||
    phase.attachment.shape.sideFeet !== 15 ||
    directPhase?.kind !== "direct" ||
    directPhase.attachment.kind !== "area" ||
    directPhase.attachment.origin.kind !== "self" ||
    directPhase.attachment.shape.kind !== "cube" ||
    directPhase.attachment.shape.sideFeet !== 15 ||
    directPhase.effects?.length !== 2
  ) {
    return null;
  }
  const [objectPush, audibleBoom] = directPhase.effects;
  if (
    objectPush?.kind !== "push_unsecured_objects" ||
    objectPush.objectLocation !== "entirely_within_area" ||
    objectPush.originDirection !== "away_from_caster" ||
    objectPush.distanceFeet !== 10 ||
    audibleBoom?.kind !== "audible" ||
    audibleBoom.sound !== "thunderous boom" ||
    audibleBoom.audibleRadiusFeet !== 300
  ) {
    return null;
  }
  return {
    kind: "thunderwave",
    creaturePush: {
      distanceFeet: movementFeet(10),
      originDirection: "away_from_caster",
    },
    unsecuredObjectPush: {
      distanceFeet: movementFeet(10),
      originDirection: "away_from_caster",
      objectLocation: "entirely_within_area",
    },
    audibleBoom: {
      sound: "thunderous boom",
      audibleRadiusFeet: movementFeet(300),
    },
  };
}

function isThunderwaveCreaturePushRiderShape(
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
  effect: SaveGateFailureEffect,
): boolean {
  return (
    phase.ability === "con" &&
    phase.onSuccess.kind === "half_damage" &&
    effect.kind === "force_move" &&
    effect.movementKind === "push" &&
    effect.originDirection === "away_from_caster" &&
    effect.distanceFeet === 10
  );
}

function isThunderwaveFailedSaveDamageShape(
  effect: Extract<SaveGateFailureEffect, { readonly kind: "damage" }>,
): boolean {
  const amount = effect.amount;
  return (
    effect.damageType === "thunder" &&
    amount.kind === "linear_per_level" &&
    amount.axis === "slot" &&
    amount.startingAtLevel === 1 &&
    amount.base.dice === 2 &&
    amount.base.dieSize === 8 &&
    amount.base.flat === undefined &&
    amount.base.spellcastingMod === undefined &&
    amount.base.abilityModifier === undefined &&
    amount.perLevel.dice === 1 &&
    amount.perLevel.dieSize === undefined &&
    amount.perLevel.flat === undefined
  );
}

export function isViciousMockeryNextAttackRiderShape(
  spell: SpellRecord,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
): boolean {
  return (
    spell.mechanics.level === 0 &&
    spell.mechanics.duration.kind === "timed" &&
    spell.mechanics.duration.value.unit === "round" &&
    spell.mechanics.duration.value.amount === 1 &&
    phase.ability === "wis" &&
    phase.onSuccess.kind === "none"
  );
}

export function supportedRepeatedEffectCount(
  selection: TargetSelection,
  spellLevel: number,
): ((slotLevel: SpellSlotLevel) => number) | null {
  if (selection.mode !== "choose_up_to" || selection.repeatsAllowed !== true) {
    return null;
  }
  const count = selection.count;
  if (typeof count === "number") {
    return () => count;
  }
  if (count.kind !== "linear") {
    return null;
  }
  const { base, perSlotAboveBase } = count;
  const baseLevel = count.baseLevel ?? spellLevel;
  return (slotLevel) =>
    base + Math.max(0, Number(slotLevel) - baseLevel) * perSlotAboveBase;
}

export function supportedDamageAmountExpr(input: {
  readonly amount: SurfaceDiceAmount;
  readonly spellLevel?: number | undefined;
  readonly slotLevel?: SpellSlotLevel | undefined;
  readonly characterLevel?: number | undefined;
}): DiceExpr | null {
  const { amount } = input;
  if (amount.kind === "fixed") {
    return amount.expr;
  }
  if (
    amount.kind === "threshold_tiers" &&
    amount.axis === "character" &&
    input.characterLevel !== undefined
  ) {
    return amount.tiers.reduce(
      (expr, tier) =>
        input.characterLevel !== undefined &&
        input.characterLevel >= tier.atLevel
          ? diceExprWithDelta(expr, tier.override)
          : expr,
      amount.base,
    );
  }
  if (
    amount.kind === "threshold_tiers_exploding_max_die" &&
    amount.axis === "character" &&
    input.characterLevel !== undefined
  ) {
    return amount.tiers.reduce<DiceExpr>(
      (expr: DiceExpr, tier: ExplodingMaxDieThresholdTier): DiceExpr =>
        input.characterLevel !== undefined &&
        input.characterLevel >= tier.atLevel
          ? diceExprWithDelta(expr, { dice: tier.dice })
          : expr,
      { dice: amount.baseDice, dieSize: amount.dieSize },
    );
  }
  if (
    amount.kind === "linear_per_level" &&
    amount.axis === "slot" &&
    input.spellLevel !== undefined &&
    input.slotLevel !== undefined &&
    (amount.startingAtLevel === input.spellLevel ||
      amount.startingAtLevel === input.spellLevel + 1) &&
    amount.base.dieSize !== undefined
  ) {
    const firstIncreasedSlot = amount.startingAtLevel === input.spellLevel + 1;
    const slotDelta = Math.max(
      0,
      Number(input.slotLevel) -
        amount.startingAtLevel +
        (firstIncreasedSlot ? 1 : 0),
    );
    return {
      dice: amount.base.dice + (amount.perLevel?.dice ?? 0) * slotDelta,
      dieSize: amount.base.dieSize,
      ...(amount.base.flat === undefined ? {} : { flat: amount.base.flat }),
    };
  }
  return null;
}

export function diceExprWithDelta(
  base: DiceExpr,
  delta: {
    readonly dice?: number | undefined;
    readonly dieSize?: number | undefined;
    readonly flat?: number | undefined;
  },
): DiceExpr {
  return {
    dice: delta.dice ?? base.dice,
    dieSize: delta.dieSize ?? base.dieSize,
    ...((delta.flat ?? base.flat) === undefined
      ? {}
      : { flat: delta.flat ?? base.flat }),
  };
}
