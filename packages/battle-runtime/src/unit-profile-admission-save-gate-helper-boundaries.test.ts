import { movementFeet, spellSlotLevel } from "@dnd/shared/types";
import {
  unitId as parseSharedUnitId,
  type UnitId,
} from "@dnd/shared/game-facts";
import type {
  ActivationPhase,
  SpellRecord,
  TargetSelection,
} from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";
import {
  areaSaveGateSpellRangeFeet,
  oneAdditionalTargetPerSpellSlotAboveBaseLevel,
  supportedCantripSaveGateDamageProfile,
  supportedPreparedAbilityD20TestRollModeSaveGateProfile,
  supportedPreparedSaveGateConditionImmunityProfile,
  supportedPreparedSaveGateDamageProfile,
  supportedPreparedSaveGateConditionProfile,
} from "./battle-reducer/spell-procedure-profiles/_save-gate-helpers.ts";
import {
  animalFriendshipUnitId,
  acidSplashUnitId,
  blindnessDeafnessUnitId,
  calmEmotionsUnitId,
  charmPersonUnitId,
  contagionUnitId,
  dissonantWhispersUnitId,
  guidingBoltUnitId,
  holdPersonUnitId,
  rayOfEnfeeblementUnitId,
  thunderwaveUnitId,
  viciousMockeryUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  decodeSpellRecordForTest,
  spellAdmissionSource,
  spellRecord,
} from "./unit-profile-admission-spell-record.test-support.ts";
import {
  combatantId,
  resourceCount,
} from "./unit-profile-admission.test-support.ts";

type RangeBearingSpellTargeting = Parameters<
  typeof areaSaveGateSpellRangeFeet
>[1];

const preparedSlot = (level: number) => [
  {
    spellLevel: spellSlotLevel(level),
    count: resourceCount(1),
    expended: resourceCount(0),
    payment: { tag: "slot" as const },
  },
];

const blindnessDeafnessId = parseSharedUnitId(blindnessDeafnessUnitId);
const holdPersonId = parseSharedUnitId(holdPersonUnitId);
const animalFriendshipId = parseSharedUnitId(animalFriendshipUnitId);
const charmPersonId = parseSharedUnitId(charmPersonUnitId);
const rayOfEnfeeblementId = parseSharedUnitId(rayOfEnfeeblementUnitId);

function targetSelectionOf(spellId: UnitId): TargetSelection {
  const spell = spellRecord(spellId);
  if (spell.mechanics.family !== "activation") {
    throw new Error("Expected an activation spell.");
  }
  const phase = spell.mechanics.phases[0];
  if (
    phase?.kind !== "save_gate" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target"
  ) {
    throw new Error("Expected a save-gated target-selection spell.");
  }
  return phase.attachment.value.selection;
}

function spellWithTargetSelection(spellId: UnitId, selection: TargetSelection) {
  const spell = spellRecord(spellId);
  if (spell.mechanics.family !== "activation") {
    throw new Error("Expected an activation spell.");
  }
  const phase = spell.mechanics.phases[0];
  if (
    phase?.kind !== "save_gate" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target"
  ) {
    throw new Error("Expected a save-gated target-selection spell.");
  }
  return decodeSpellRecordForTest({
    ...spell,
    mechanics: {
      ...spell.mechanics,
      phases: [
        {
          ...phase,
          attachment: {
            ...phase.attachment,
            value: { ...phase.attachment.value, selection },
          },
        },
      ],
    },
  });
}

describe("save-gate helper admission boundaries", () => {
  test("one-additional-target scaling accepts only the authored linear progression", () => {
    const authoredScaling = targetSelectionOf(blindnessDeafnessId);
    if (authoredScaling.mode !== "choose_up_to") {
      throw new Error("Expected authored slot-scaled targeting.");
    }
    const targetCount = oneAdditionalTargetPerSpellSlotAboveBaseLevel(
      authoredScaling,
      2,
    );
    expect(targetCount?.(spellSlotLevel(5))).toBe(4);

    const unsupportedSelections = [
      targetSelectionOf(rayOfEnfeeblementId),
      { ...authoredScaling, count: 1 },
      {
        ...authoredScaling,
        count: {
          kind: "threshold_tiers",
          axis: "character",
          base: 1,
          tiers: [{ atLevel: 5, value: 2 }],
        },
      },
      {
        ...authoredScaling,
        count: {
          kind: "linear",
          base: 2,
          baseLevel: 2,
          perSlotAboveBase: 1,
        },
      },
      {
        ...authoredScaling,
        count: {
          kind: "linear",
          base: 1,
          baseLevel: 1,
          perSlotAboveBase: 1,
        },
      },
      {
        ...authoredScaling,
        count: {
          kind: "linear",
          base: 1,
          baseLevel: 2,
          perSlotAboveBase: 2,
        },
      },
    ] as const satisfies readonly TargetSelection[];

    for (const selection of unsupportedSelections) {
      expect(oneAdditionalTargetPerSpellSlotAboveBaseLevel(selection, 2)).toBe(
        null,
      );
    }
  });

  test("range-bearing targeting projections derive range only from compatible authored origins", () => {
    const pointRange = { kind: "point", feet: 60 } as const;
    const selfRange = { kind: "self" } as const;
    const pointTargetings = [
      { kind: "pointOriginSphere", radiusFeet: movementFeet(20) },
      { kind: "pointOriginSphereDiameter", diameterFeet: movementFeet(5) },
      { kind: "pointOriginCubeExcludingCaster", sideFeet: movementFeet(20) },
      { kind: "pointOriginCube", sideFeet: movementFeet(20) },
      {
        kind: "primaryTargetOriginEmanation",
        radiusFeet: movementFeet(5),
      },
      {
        kind: "pointOriginCylinder",
        radiusFeet: movementFeet(10),
        heightFeet: movementFeet(20),
      },
      { kind: "targetList", minTargets: 1, maxTargets: 2 },
    ] as const satisfies readonly RangeBearingSpellTargeting[];
    const selfTargetings = [
      { kind: "selfOriginCube", sideFeet: movementFeet(15) },
      { kind: "selfOriginCone", lengthFeet: movementFeet(15) },
      {
        kind: "selfOriginLine",
        lengthFeet: movementFeet(100),
        widthFeet: movementFeet(5),
      },
      { kind: "selfOriginEmanation", radiusFeet: movementFeet(10) },
    ] as const satisfies readonly RangeBearingSpellTargeting[];

    for (const targeting of pointTargetings) {
      expect(areaSaveGateSpellRangeFeet(pointRange, targeting)).toBe(
        movementFeet(60),
      );
      expect(areaSaveGateSpellRangeFeet(selfRange, targeting)).toBeNull();
    }
    for (const targeting of selfTargetings) {
      expect(areaSaveGateSpellRangeFeet(selfRange, targeting)).toBe(
        movementFeet(0),
      );
      expect(areaSaveGateSpellRangeFeet(pointRange, targeting)).toBeNull();
    }
  });

  test("condition profiles reject target scaling and target-kind near misses", () => {
    const staticBlindness = spellWithTargetSelection(blindnessDeafnessId, {
      mode: "choose_up_to",
      count: 1,
    });
    const objectBlindness = spellWithTargetSelection(blindnessDeafnessId, {
      mode: "choose_up_to",
      count: {
        kind: "linear",
        base: 1,
        baseLevel: 2,
        perSlotAboveBase: 1,
      },
      targetKinds: ["object"],
    });
    const staticHoldPerson = spellWithTargetSelection(holdPersonId, {
      mode: "choose_up_to",
      count: 1,
      typeFilter: ["humanoid"],
    });
    const holdPersonSelection = targetSelectionOf(holdPersonId);
    if (holdPersonSelection.mode !== "choose_up_to") {
      throw new Error("Expected Hold Person target-list selection.");
    }
    const objectHoldPerson = spellWithTargetSelection(holdPersonId, {
      ...holdPersonSelection,
      targetKinds: ["object"],
    });
    const repeatingHoldPerson = spellWithTargetSelection(holdPersonId, {
      ...holdPersonSelection,
      repeatsAllowed: true,
    });
    const staticAnimalFriendship = spellWithTargetSelection(
      animalFriendshipId,
      { mode: "choose_up_to", count: 1, typeFilter: ["beast"] },
    );
    const objectCharmPerson = spellWithTargetSelection(charmPersonId, {
      ...targetSelectionOf(charmPersonId),
      targetKinds: ["object"],
    });

    for (const spell of [
      staticBlindness,
      objectBlindness,
      staticHoldPerson,
      objectHoldPerson,
      repeatingHoldPerson,
      staticAnimalFriendship,
      objectCharmPerson,
    ]) {
      expect(
        supportedPreparedSaveGateConditionProfile(
          spellAdmissionSource(spell),
          preparedSlot(spell.mechanics.level),
        ),
      ).toEqual([]);
    }
  });

  test("condition-immunity admission rejects non-creature and wrong-creature filters", () => {
    const base = spellRecord(calmEmotionsUnitId);
    const selection = saveGateAreaSelection(base);
    const nonCreature = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_calm_emotions_non_creature_target",
      name: "Synthetic Calm Effect With Object Targets",
      provenance: syntheticProvenance(
        "synthetic_calm_emotions_non_creature_target",
      ),
      mechanics: {
        ...base.mechanics,
        phases: [
          saveGatePhaseWithSelection(base, {
            mode: "any_number",
            targetKinds: ["object"],
          }),
        ],
      },
    });
    const wrongCreatureFilter = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_calm_emotions_wrong_creature_filter",
      name: "Synthetic Calm Effect With Beast Filter",
      provenance: syntheticProvenance(
        "synthetic_calm_emotions_wrong_creature_filter",
      ),
      mechanics: {
        ...base.mechanics,
        phases: [
          saveGatePhaseWithSelection(base, {
            ...selection,
            typeFilter: ["beast"],
          }),
        ],
      },
    });

    expect(conditionImmunityAdmission(nonCreature)).toEqual([]);
    expect(conditionImmunityAdmission(wrongCreatureFilter)).toEqual([]);
  });

  test("Ray of Enfeeblement admission rejects a non-save phase and missing repeat save", () => {
    const base = spellRecord(rayOfEnfeeblementUnitId);
    const directPhase = firstPhase(spellRecord(guidingBoltUnitId));
    const nonSavePhase = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_ray_non_save_phase",
      name: "Synthetic Weakening Ray Without Save Gate",
      provenance: syntheticProvenance("synthetic_ray_non_save_phase"),
      mechanics: { ...base.mechanics, phases: [directPhase] },
    });
    const savePhase = firstSaveGatePhase(base);
    const { repeatSaves: _repeatSaves, ...phaseWithoutRepeatSaves } = savePhase;
    const missingRepeatSave = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_ray_missing_repeat_save",
      name: "Synthetic Weakening Ray Without Repeat Save",
      provenance: syntheticProvenance("synthetic_ray_missing_repeat_save"),
      mechanics: {
        ...base.mechanics,
        phases: [phaseWithoutRepeatSaves],
      },
    });

    expect(abilityD20Admission(nonSavePhase)).toEqual([]);
    expect(abilityD20Admission(missingRepeatSave)).toEqual([]);
  });

  test("save-gated damage admission rejects dynamic damage references and amounts", () => {
    const acidSplash = spellRecord(acidSplashUnitId);
    const primaryReference = acidSplashWithFailure(
      acidSplash,
      "synthetic_acid_splash_dynamic_primary_damage_type",
      (failure) => {
        if (failure.kind !== "damage") {
          throw new Error("Expected Acid Splash damage failure.");
        }
        return { ...failure, damageType: { kind: "all_damage_types" } };
      },
    );
    const primaryAmount = acidSplashWithFailure(
      acidSplash,
      "synthetic_acid_splash_dynamic_primary_amount",
      (failure) => {
        if (failure.kind !== "damage") {
          throw new Error("Expected Acid Splash damage failure.");
        }
        return { ...failure, amount: { kind: "resource_spent" } };
      },
    );
    const additionalReference = acidSplashWithCompositeFailure(
      acidSplash,
      "synthetic_acid_splash_dynamic_additional_damage_type",
      (damage) => ({ ...damage, damageType: { kind: "all_damage_types" } }),
    );
    const additionalAmount = acidSplashWithCompositeFailure(
      acidSplash,
      "synthetic_acid_splash_dynamic_additional_amount",
      (damage) => ({ ...damage, amount: { kind: "resource_spent" } }),
    );

    expect(cantripDamageAdmission(primaryReference)).toEqual([]);
    expect(cantripDamageAdmission(primaryAmount)).toEqual([]);
    expect(cantripDamageAdmission(additionalReference)).toEqual([]);
    expect(cantripDamageAdmission(additionalAmount)).toEqual([]);
  });

  test("save-gated damage admission rejects unsupported post-save and movement riders", () => {
    const thunderwave = spellRecord(thunderwaveUnitId);
    const damageMismatch = thunderwaveWithFailure(
      thunderwave,
      "synthetic_thunderwave_damage_shape_mismatch",
      (failure) => {
        const composite = compositeFailure(failure);
        const [damage, ...riders] = composite.effects;
        if (damage?.kind !== "damage") {
          throw new Error("Expected Thunderwave damage effect.");
        }
        return {
          ...composite,
          effects: [{ ...damage, damageType: "fire" }, ...riders],
        };
      },
    );
    const missingCreaturePush = thunderwaveWithFailure(
      thunderwave,
      "synthetic_thunderwave_missing_creature_push",
      (failure) => {
        const composite = compositeFailure(failure);
        const [damage, ...riders] = composite.effects;
        if (damage?.kind !== "damage") {
          throw new Error("Expected Thunderwave damage effect.");
        }
        return {
          ...composite,
          effects: [
            damage,
            ...riders.filter((rider) => rider.kind !== "force_move"),
          ],
        };
      },
    );
    const thunderwaveDirectMismatch = thunderwaveWithDirectEffectMutation(
      thunderwave,
      "synthetic_thunderwave_direct_effect_mismatch",
      (effect) =>
        effect.kind === "audible"
          ? { ...effect, audibleRadiusFeet: 301 }
          : effect,
    );
    const dissonantWhispers = spellRecord(dissonantWhispersUnitId);
    const movementMismatch = dissonantWhispersWithFailure(
      dissonantWhispers,
      "synthetic_dissonant_whispers_movement_shape_mismatch",
      (failure) => {
        const composite = compositeFailure(failure);
        return mapCompositeEffects(composite, (effect) =>
          effect.kind === "forced_reaction_movement"
            ? { kind: "apply_condition", condition: "blinded" as const }
            : effect,
        );
      },
    );

    expect(damageAdmission(damageMismatch)).toEqual([]);
    expect(damageAdmission(missingCreaturePush)).toEqual([]);
    expect(damageAdmission(thunderwaveDirectMismatch)).toEqual([]);
    expect(damageAdmission(movementMismatch)).toEqual([]);
  });

  test("save-gated condition support rejects unsupported Contagion riders and chosen-ability filters", () => {
    const contagion = spellRecord(contagionUnitId);
    const wrongShape = contagionWithFailure(
      contagion,
      "synthetic_contagion_wrong_shape",
      (failure) => {
        const composite = compositeFailure(failure);
        return mapCompositeEffects(composite, (effect) =>
          effect.kind === "apply_condition" && effect.condition === "poisoned"
            ? { ...effect, condition: "blinded" as const }
            : effect,
        );
      },
    );
    const wrongSuccessThreshold = contagionWithFailure(
      contagion,
      "synthetic_contagion_wrong_repeat_success_threshold",
      (failure) => compositeFailure(failure),
      (phase) => ({
        ...phase,
        repeatSaves: [
          {
            ...((phase.repeatSaves ?? [])[0] ?? {
              cadence: "end_of_target_turn",
              onSuccess: "ends_on_target",
              successesRequired: 3,
              failuresRequired: 3,
              onFailureThreshold: "locks_duration",
            }),
            successesRequired: 2,
          },
        ],
      }),
    );
    const missingOn = contagionWithFailure(
      contagion,
      "synthetic_contagion_missing_save_disadvantage_on",
      (failure) => {
        const composite = compositeFailure(failure);
        return mapCompositeEffects(composite, (effect) =>
          effect.kind === "modify_roll_advantage"
            ? { ...effect, on: ["attack_roll"] as const }
            : effect,
        );
      },
    );
    const nonHoleFilter = contagionWithFailure(
      contagion,
      "synthetic_contagion_non_hole_save_filter",
      (failure) => {
        const composite = compositeFailure(failure);
        return mapCompositeEffects(composite, (effect) =>
          effect.kind === "modify_roll_advantage"
            ? { ...effect, saveAbilityFilter: ["str"] as const }
            : effect,
        );
      },
    );

    expect(damageAdmission(wrongShape)).toEqual([]);
    expect(damageAdmission(wrongSuccessThreshold)).toEqual([]);
    expect(damageAdmission(missingOn)).toEqual([]);
    expect(damageAdmission(nonHoleFilter)).toEqual([]);
  });

  test("save-gated damage admission rejects an unsupported post-damage rider", () => {
    const mockery = spellRecord(viciousMockeryUnitId);
    const unsupportedRider = viciousMockeryWithFailure(
      mockery,
      "synthetic_vicious_mockery_unsupported_rider",
      (failure) => {
        const composite = compositeFailure(failure);
        return mapCompositeEffects(composite, (effect) =>
          effect.kind === "modify_roll_advantage"
            ? { ...effect, on: ["ability_check"] as const }
            : effect,
        );
      },
    );
    const wrongRiderCount = viciousMockeryWithFailure(
      mockery,
      "synthetic_vicious_mockery_wrong_rider_count",
      (failure) => {
        const composite = compositeFailure(failure);
        return mapCompositeEffects(composite, (effect) =>
          effect.kind === "modify_roll_advantage"
            ? { ...effect, count: 2 }
            : effect,
        );
      },
    );
    expect(cantripDamageAdmission(unsupportedRider)).toEqual([]);
    expect(cantripDamageAdmission(wrongRiderCount)).toEqual([]);
  });
});

function conditionImmunityAdmission(spell: SpellRecord) {
  return supportedPreparedSaveGateConditionImmunityProfile(
    combatantId("synthetic_save_gate_caster"),
    spellAdmissionSource(spell),
    preparedSlot(spell.mechanics.level),
  );
}

function abilityD20Admission(spell: SpellRecord) {
  return supportedPreparedAbilityD20TestRollModeSaveGateProfile(
    combatantId("synthetic_save_gate_caster"),
    spellAdmissionSource(spell),
    preparedSlot(spell.mechanics.level),
  );
}

function saveGateAreaSelection(spell: SpellRecord): TargetSelection {
  const phase = firstSaveGatePhase(spell);
  if (
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "area"
  ) {
    throw new Error("Expected a save-gated area attachment.");
  }
  const selection = phase.attachment.value.selection;
  if (selection === undefined) {
    throw new Error("Expected a save-gated area target selection.");
  }
  return selection;
}

function saveGatePhaseWithSelection(
  spell: SpellRecord,
  selection: TargetSelection,
): unknown {
  const phase = firstSaveGatePhase(spell);
  if (
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "area"
  ) {
    throw new Error("Expected a save-gated area attachment.");
  }
  const areaValue = phase.attachment.value;
  return {
    ...phase,
    attachment: {
      ...phase.attachment,
      value: { ...areaValue, selection },
    },
  };
}

function firstSaveGatePhase(
  spell: SpellRecord,
): Extract<ActivationPhase, { readonly kind: "save_gate" }> {
  if (spell.mechanics.family !== "activation") {
    throw new Error("Expected activation mechanics.");
  }
  const phase = spell.mechanics.phases[0];
  if (phase?.kind !== "save_gate") {
    throw new Error("Expected a save-gate phase.");
  }
  return phase;
}

function firstPhase(spell: SpellRecord): ActivationPhase {
  if (spell.mechanics.family !== "activation") {
    throw new Error("Expected activation mechanics.");
  }
  const phase = spell.mechanics.phases[0];
  if (phase === undefined) {
    throw new Error("Expected a phase.");
  }
  return phase;
}

type SaveGatePhase = Extract<ActivationPhase, { readonly kind: "save_gate" }>;
type SaveGateFailure = SaveGatePhase["onFail"];
type CompositeFailure = Extract<
  SaveGateFailure,
  { readonly kind: "composite" }
>;
type DirectPhase = Extract<ActivationPhase, { readonly kind: "direct" }>;
type DirectPhaseEffect = NonNullable<DirectPhase["effects"]>[number];

function damageAdmission(spell: SpellRecord) {
  return supportedPreparedSaveGateDamageProfile(
    spellAdmissionSource(spell),
    preparedSlot(spell.mechanics.level),
  );
}

function cantripDamageAdmission(spell: SpellRecord) {
  return supportedCantripSaveGateDamageProfile(spellAdmissionSource(spell), 5);
}

function acidSplashWithFailure(
  base: SpellRecord,
  id: string,
  mapFailure: (failure: SaveGateFailure) => SaveGateFailure,
): SpellRecord {
  const mechanics = activationMechanics(base);
  const phase = firstSaveGatePhase(base);
  return decodeSpellRecordForTest({
    ...base,
    id,
    name: syntheticName(id),
    provenance: syntheticProvenance(id),
    mechanics: {
      ...mechanics,
      phases: mechanics.phases.map((candidate, index) =>
        index === 0
          ? { ...phase, onFail: mapFailure(phase.onFail) }
          : candidate,
      ),
    },
  });
}

function acidSplashWithCompositeFailure(
  base: SpellRecord,
  id: string,
  mapAdditionalDamage: (
    damage: Extract<SaveGateFailure, { readonly kind: "damage" }>,
  ) => Extract<SaveGateFailure, { readonly kind: "damage" }>,
): SpellRecord {
  const mechanics = activationMechanics(base);
  const phase = firstSaveGatePhase(base);
  if (phase.onFail.kind !== "damage") {
    if (phase.onFail.kind !== "composite") {
      throw new Error("Expected a damage failure.");
    }
    const [damage, ...riders] = phase.onFail.effects;
    if (damage?.kind !== "damage") {
      throw new Error("Expected a leading damage effect.");
    }
    const additional = mapAdditionalDamage({
      kind: "damage",
      damageType: "cold",
      amount: { kind: "fixed", expr: { dice: 1, dieSize: 6 } },
    });
    return decodeSpellRecordForTest({
      ...base,
      id,
      name: syntheticName(id),
      provenance: syntheticProvenance(id),
      mechanics: {
        ...mechanics,
        phases: mechanics.phases.map((candidate, index) =>
          index === 0
            ? {
                ...phase,
                onFail: {
                  kind: "composite",
                  effects: [damage, additional, ...riders],
                },
              }
            : candidate,
        ),
      },
    });
  }
  const additional = mapAdditionalDamage({
    kind: "damage",
    damageType: "cold",
    amount: { kind: "fixed", expr: { dice: 1, dieSize: 6 } },
  });
  return decodeSpellRecordForTest({
    ...base,
    id,
    name: syntheticName(id),
    provenance: syntheticProvenance(id),
    mechanics: {
      ...activationMechanics(base),
      phases: activationMechanics(base).phases.map((candidate, index) =>
        index === 0
          ? {
              ...phase,
              onFail: {
                kind: "composite",
                effects: [phase.onFail, additional],
              },
            }
          : candidate,
      ),
    },
  });
}

function thunderwaveWithFailure(
  base: SpellRecord,
  id: string,
  mapFailure: (failure: SaveGateFailure) => SaveGateFailure,
): SpellRecord {
  const phase = firstSaveGatePhase(base);
  const direct = firstDirectPhase(base);
  return decodeSpellRecordForTest({
    ...base,
    id,
    name: syntheticName(id),
    provenance: syntheticProvenance(id),
    mechanics: {
      ...activationMechanics(base),
      phases: [{ ...phase, onFail: mapFailure(phase.onFail) }, direct],
    },
  });
}

function thunderwaveWithDirectEffectMutation(
  base: SpellRecord,
  id: string,
  mapEffect: (effect: DirectPhaseEffect) => DirectPhaseEffect,
): SpellRecord {
  const phase = firstSaveGatePhase(base);
  const direct = firstDirectPhase(base);
  return decodeSpellRecordForTest({
    ...base,
    id,
    name: syntheticName(id),
    provenance: syntheticProvenance(id),
    mechanics: {
      ...activationMechanics(base),
      phases: [
        phase,
        {
          ...direct,
          effects: direct.effects?.map(mapEffect),
        },
      ],
    },
  });
}

function dissonantWhispersWithFailure(
  base: SpellRecord,
  id: string,
  mapFailure: (failure: SaveGateFailure) => SaveGateFailure,
): SpellRecord {
  const phase = firstSaveGatePhase(base);
  return decodeSpellRecordForTest({
    ...base,
    id,
    name: syntheticName(id),
    provenance: syntheticProvenance(id),
    mechanics: {
      ...activationMechanics(base),
      phases: [{ ...phase, onFail: mapFailure(phase.onFail) }],
    },
  });
}

function contagionWithFailure(
  base: SpellRecord,
  id: string,
  mapFailure: (failure: SaveGateFailure) => SaveGateFailure,
  mapPhase: (phase: SaveGatePhase) => SaveGatePhase = (phase) => phase,
): SpellRecord {
  const phase = firstSaveGatePhase(base);
  return decodeSpellRecordForTest({
    ...base,
    id,
    name: syntheticName(id),
    provenance: syntheticProvenance(id),
    mechanics: {
      ...activationMechanics(base),
      phases: [{ ...mapPhase(phase), onFail: mapFailure(phase.onFail) }],
    },
  });
}

function viciousMockeryWithFailure(
  base: SpellRecord,
  id: string,
  mapFailure: (failure: SaveGateFailure) => SaveGateFailure,
): SpellRecord {
  const phase = firstSaveGatePhase(base);
  return decodeSpellRecordForTest({
    ...base,
    id,
    name: syntheticName(id),
    provenance: syntheticProvenance(id),
    mechanics: {
      ...activationMechanics(base),
      phases: [{ ...phase, onFail: mapFailure(phase.onFail) }],
    },
  });
}

function firstDirectPhase(spell: SpellRecord): DirectPhase {
  if (spell.mechanics.family !== "activation") {
    throw new Error("Expected activation mechanics.");
  }
  const phase = spell.mechanics.phases.find(
    (candidate): candidate is DirectPhase => candidate.kind === "direct",
  );
  if (phase === undefined) {
    throw new Error("Expected a direct phase.");
  }
  return phase;
}

function syntheticName(id: string): string {
  return id.replaceAll("_", " ");
}

function syntheticProvenance(id: string) {
  return { kind: "synthetic-test" as const, section: id };
}

function activationMechanics(spell: SpellRecord) {
  if (spell.mechanics.family !== "activation") {
    throw new Error("Expected activation mechanics.");
  }
  return spell.mechanics;
}

function compositeFailure(failure: SaveGateFailure): CompositeFailure {
  if (failure.kind !== "composite") {
    throw new Error("Expected a composite save-gate failure.");
  }
  return failure;
}

function mapCompositeEffects(
  failure: CompositeFailure,
  mapEffect: (
    effect: CompositeFailure["effects"][number],
  ) => CompositeFailure["effects"][number],
): CompositeFailure {
  const [first, ...rest] = failure.effects;
  if (first === undefined) {
    throw new Error("Expected a non-empty composite effect list.");
  }
  return {
    ...failure,
    effects: [mapEffect(first), ...rest.map(mapEffect)],
  };
}
