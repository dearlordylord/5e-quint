// Save-gated and attack-damage spell profile projections extracted from spells-profiles.ts.

import {
  elapsedTimeTicksFromTimeSpanDuration,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  movementDeltaFeet,
  movementFeet,
  type MovementFeet,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import type { CreatureType } from "@dnd/shared/game-facts";
import type {
  ActivationPhase,
  Attachment,
  DiceExpr,
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
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type { CharacterBattleSpellcastingState } from "../character-battle-resources.ts";
import type { CombatantId } from "../identity.ts";
import {
  sameStringSet,
  scalarBuffSpellTargetCount,
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
    charmPersonSaveGateConditionSpell(spell) ??
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
    spell.name !== "Grease" ||
    spell.provenance.kind !== "srd-5.2.1" ||
    spell.provenance.section !== "Spells/Descriptions-E-L#Grease" ||
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
    !("repeatSave" in phase) &&
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
    spell.name !== "Sleep" ||
    spell.provenance.kind !== "srd-5.2.1" ||
    spell.provenance.section !== "Spells/Descriptions-S-Z#Sleep" ||
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
  const repeatSave =
    phase?.kind === "save_gate" && "repeatSave" in phase
      ? phase.repeatSave
      : undefined;
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
    repeatSave.onSuccess === "ends_on_target" &&
    repeatFailure?.kind === "apply_condition" &&
    repeatFailure.condition === "unconscious"
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
  if (
    spell.name !== "Faerie Fire" ||
    spell.provenance.kind !== "srd-5.2.1" ||
    spell.provenance.section !== "Spells/Descriptions-E-L#Faerie Fire" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 60 ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "save_gate" ||
    "repeatSave" in phase ||
    phase.ability !== "dex" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.onSuccess.kind !== "none" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "area" ||
    phase.attachment.value.origin.kind !== "point_within_range" ||
    phase.attachment.value.shape.kind !== "cube" ||
    phase.attachment.value.shape.sideFeet !==
      SUPPORTED_POINT_CUBE_SAVE_GATE_SIDE_FEET ||
    failedEffect?.kind !== "modify_roll_advantage" ||
    failedEffect.mode !== "advantage" ||
    !sameStringSet(failedEffect.on, ["attack_roll"])
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
      kind: "visibleAttackRollAgainstSelf",
      sourceSpellId: spell.id,
      sourceCombatantId: actorId,
      mode: "advantage",
      expiresAt: { kind: "concentration", combatantId: actorId },
    },
    rangeFeet: movementFeet(spell.mechanics.range.feet),
  };
}

export function animalFriendshipSaveGateConditionSpell(
  spell: SpellRecord,
): SaveGateConditionSpell | null {
  return creatureTypeCharmedSaveGateConditionSpell({
    spell,
    name: "Animal Friendship",
    provenanceSection: "Spells/Descriptions-A-D#Animal Friendship",
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
    name: "Charm Person",
    provenanceSection: "Spells/Descriptions-A-D#Charm Person",
    duration: { unit: "hour", amount: 1 },
    targetCreatureType: "humanoid",
    saveRollModeRule: { kind: "hostileTarget", mode: "advantage" },
  });
}

function creatureTypeCharmedSaveGateConditionSpell(input: {
  readonly spell: SpellRecord;
  readonly name: string;
  readonly provenanceSection: string;
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
    spell.name !== input.name ||
    spell.provenance.kind !== "srd-5.2.1" ||
    spell.provenance.section !== input.provenanceSection ||
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
    "repeatSave" in phase ||
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
      condition: "charmed",
      expiresAt: { kind: "duration", durationTicks: durationTicks.right },
      escape: { kind: "targetDamagedByCasterOrAlly" },
      turnStartDamage: null,
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
    "repeatSave" in phase ||
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
      condition: COLOR_SPRAY_FAILED_SAVE_CONDITION,
      expiresAt: "endOfCasterNextTurn",
      escape: null,
      turnStartDamage: null,
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
    "repeatSave" in phase ||
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
      condition: ENTANGLE_FAILED_SAVE_CONDITION,
      expiresAt: "concentration",
      escape: {
        kind: "abilityCheck",
        ability: "str",
        skill: "athletics",
        successEnds: "condition",
      },
      turnStartDamage: null,
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
      ? thunderwavePostSaveAreaEffect(spell, phase, spell.mechanics.phases[1])
      : null;
  const targeting =
    phase?.kind === "save_gate" ? saveGateTargeting(phase.attachment) : null;
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
    (postSaveAreaEffect === null
      ? spell.mechanics.phases.length !== 1
      : spell.mechanics.phases.length !== 2) ||
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

export function areaSaveGateSpellRangeFeet(
  range: SpellRecord["mechanics"]["range"],
  targeting: Exclude<
    SpellTargeting,
    { readonly kind: "singleCombatant" | "singleCreatureOrObject" }
  >,
): MovementFeet | null {
  return Match.value(targeting).pipe(
    Match.when({ kind: "pointOriginSphere" }, () =>
      range.kind === "point" ? movementFeet(range.feet) : null,
    ),
    Match.when({ kind: "pointOriginCubeExcludingCaster" }, () =>
      range.kind === "point" ? movementFeet(range.feet) : null,
    ),
    Match.when({ kind: "pointOriginCube" }, () =>
      range.kind === "point" ? movementFeet(range.feet) : null,
    ),
    Match.when({ kind: "selfOriginCube" }, () =>
      range.kind === "self" ? movementFeet(0) : null,
    ),
    Match.when({ kind: "selfOriginCone" }, () =>
      range.kind === "self" ? movementFeet(0) : null,
    ),
    Match.when({ kind: "primaryTargetOriginEmanation" }, () =>
      range.kind === "point" ? movementFeet(range.feet) : null,
    ),
    Match.when({ kind: "targetList" }, () =>
      range.kind === "point" ? movementFeet(range.feet) : null,
    ),
    Match.exhaustive,
  );
}

export function singleTargetSpellRangeFeet(
  range: SpellRecord["mechanics"]["range"],
): MovementFeet | null {
  return Match.value(range).pipe(
    Match.when({ kind: "point" }, (point) => movementFeet(point.feet)),
    Match.when({ kind: "touch" }, () => movementFeet(5)),
    Match.orElse(() => null),
  );
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
    return null;
  }
  return riders;
}

export function isRayOfSicknessPoisonedRiderShape(
  spell: SpellRecord,
  phase: Extract<SpellActivationPhase, { readonly kind: "attack_roll" }>,
): boolean {
  return (
    spell.name === "Ray of Sickness" &&
    spell.provenance.kind === "srd-5.2.1" &&
    spell.provenance.section === "Spells/Descriptions-Q-R#Ray of Sickness" &&
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
    spell.name === "Shocking Grasp" &&
    spell.provenance.kind === "srd-5.2.1" &&
    spell.provenance.section === "Spells/Descriptions-S-Z#Shocking Grasp" &&
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
    spell.name === "Guiding Bolt" &&
    spell.provenance.kind === "srd-5.2.1" &&
    spell.provenance.section === "Spells/Descriptions-E-L#Guiding Bolt" &&
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
    riders.filter((rider) =>
      isThunderwaveCreaturePushRiderShape(spell, phase, rider),
    ).length !== 1
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
      isThunderwaveCreaturePushRiderShape(spell, phase, effect)
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
    spell.name === "Dissonant Whispers" &&
    spell.provenance.kind === "srd-5.2.1" &&
    spell.provenance.section ===
      "Spells/Descriptions-A-D#Dissonant Whispers" &&
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

function thunderwavePostSaveAreaEffect(
  spell: SpellRecord,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
  directPhase: SpellActivationPhase | undefined,
): SpellPostSaveAreaEffect | null {
  if (
    spell.name !== "Thunderwave" ||
    spell.provenance.kind !== "srd-5.2.1" ||
    spell.provenance.section !== "Spells/Descriptions-S-Z#Thunderwave" ||
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
  spell: SpellRecord,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
  effect: SaveGateFailureEffect,
): boolean {
  return (
    spell.name === "Thunderwave" &&
    spell.provenance.kind === "srd-5.2.1" &&
    spell.provenance.section === "Spells/Descriptions-S-Z#Thunderwave" &&
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
    spell.name === "Vicious Mockery" &&
    spell.provenance.kind === "srd-5.2.1" &&
    spell.provenance.section === "Spells/Descriptions-S-Z#Vicious Mockery" &&
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
    amount.kind === "linear_per_level" &&
    amount.axis === "slot" &&
    input.spellLevel !== undefined &&
    input.slotLevel !== undefined &&
    amount.startingAtLevel === input.spellLevel &&
    amount.base.dieSize !== undefined
  ) {
    const slotDelta = Math.max(
      0,
      Number(input.slotLevel) - amount.startingAtLevel,
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
