import type {
  EffectAtom,
  FeatRecord,
  SpellRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";
import { Option } from "effect";
import {
  creationChoiceOptionId,
  eldritchInvocationId,
  type CharacterBuildEldritchInvocationRepeatableChoice,
  type CharacterBuildEldritchInvocationSelection,
  type CreationChoiceOption,
  type CreationChoiceOptionId,
  type EldritchInvocationId,
  type UnitCatalog,
} from "./types.ts";

export type EldritchInvocationPrerequisite =
  | { readonly kind: "minimumWarlockLevel"; readonly level: number }
  | {
      readonly kind: "knownWarlockCantrip";
      readonly cantrip: "deals_damage" | "attack_roll_damage";
    }
  | {
      readonly kind: "knownInvocation";
      readonly invocationId: EldritchInvocationId;
    };

export type EldritchInvocationOption = {
  readonly invocationId: EldritchInvocationId;
  readonly optionId: CreationChoiceOptionId;
  readonly label: string;
  readonly prerequisites: readonly EldritchInvocationPrerequisite[];
  readonly repeatability:
    | { readonly kind: "once" }
    | {
        readonly kind: "repeatable";
        readonly choice: EldritchInvocationRepeatableChoiceRule;
      };
};

export type EldritchInvocationRepeatableChoiceRule =
  | {
      readonly kind: "knownWarlockCantrip";
      readonly cantrip: "deals_damage" | "attack_roll_damage";
      readonly minimumRangeFeet?: number;
    }
  | { readonly kind: "originFeat" };

export type EldritchInvocationSelection =
  CharacterBuildEldritchInvocationSelection;

type SpellActivationMechanics = Extract<
  SpellRecord["mechanics"],
  { readonly family: "activation" }
>;
type SpellActivationPhase = SpellActivationMechanics["phases"][number];
type SaveGatePhase = Extract<
  SpellActivationPhase,
  { readonly kind: "save_gate" }
>;
type DirectPhaseEffect = NonNullable<
  Extract<SpellActivationPhase, { readonly kind: "direct" }>["effects"]
>[number];

const ORIGIN_FEAT_CATEGORY = "origin" as const satisfies FeatRecord["category"];

function invocationOption(input: {
  readonly invocationId: string | EldritchInvocationId;
  readonly label: string;
  readonly prerequisites?: readonly EldritchInvocationPrerequisite[];
  readonly repeatability?: EldritchInvocationOption["repeatability"];
}): EldritchInvocationOption {
  const invocationId = eldritchInvocationId(input.invocationId);
  return {
    invocationId,
    optionId: creationChoiceOptionId(invocationId),
    label: input.label,
    prerequisites: input.prerequisites ?? [],
    repeatability: input.repeatability ?? { kind: "once" },
  };
}

function knownInvocation(
  invocationId: EldritchInvocationId,
): EldritchInvocationPrerequisite {
  return {
    kind: "knownInvocation",
    invocationId,
  };
}

const PACT_OF_THE_BLADE_INVOCATION_ID =
  eldritchInvocationId("pact_of_the_blade");
const PACT_OF_THE_CHAIN_INVOCATION_ID =
  eldritchInvocationId("pact_of_the_chain");
const PACT_OF_THE_TOME_INVOCATION_ID = eldritchInvocationId("pact_of_the_tome");
const THIRSTING_BLADE_INVOCATION_ID = eldritchInvocationId("thirsting_blade");

// SRD 5.2.1 Classes/Warlock.md:128-328. This catalog is character-creation
// option ownership only; invocation execution remains outside this package.
export const SRD_ELDRITCH_INVOCATION_OPTIONS = [
  invocationOption({
    invocationId: "agonizing_blast",
    label: "Agonizing Blast",
    prerequisites: [
      { kind: "minimumWarlockLevel", level: 2 },
      { kind: "knownWarlockCantrip", cantrip: "deals_damage" },
    ],
    repeatability: {
      kind: "repeatable",
      choice: { kind: "knownWarlockCantrip", cantrip: "deals_damage" },
    },
  }),
  invocationOption({
    invocationId: "armor_of_shadows",
    label: "Armor of Shadows",
  }),
  invocationOption({
    invocationId: "ascendant_step",
    label: "Ascendant Step",
    prerequisites: [{ kind: "minimumWarlockLevel", level: 5 }],
  }),
  invocationOption({
    invocationId: "devils_sight",
    label: "Devil's Sight",
    prerequisites: [{ kind: "minimumWarlockLevel", level: 2 }],
  }),
  invocationOption({
    invocationId: "devouring_blade",
    label: "Devouring Blade",
    prerequisites: [
      { kind: "minimumWarlockLevel", level: 12 },
      knownInvocation(THIRSTING_BLADE_INVOCATION_ID),
    ],
  }),
  invocationOption({ invocationId: "eldritch_mind", label: "Eldritch Mind" }),
  invocationOption({
    invocationId: "eldritch_smite",
    label: "Eldritch Smite",
    prerequisites: [
      { kind: "minimumWarlockLevel", level: 5 },
      knownInvocation(PACT_OF_THE_BLADE_INVOCATION_ID),
    ],
  }),
  invocationOption({
    invocationId: "eldritch_spear",
    label: "Eldritch Spear",
    prerequisites: [
      { kind: "minimumWarlockLevel", level: 2 },
      { kind: "knownWarlockCantrip", cantrip: "deals_damage" },
    ],
    repeatability: {
      kind: "repeatable",
      choice: {
        kind: "knownWarlockCantrip",
        cantrip: "deals_damage",
        minimumRangeFeet: 10,
      },
    },
  }),
  invocationOption({
    invocationId: "fiendish_vigor",
    label: "Fiendish Vigor",
    prerequisites: [{ kind: "minimumWarlockLevel", level: 2 }],
  }),
  invocationOption({
    invocationId: "gaze_of_two_minds",
    label: "Gaze of Two Minds",
    prerequisites: [{ kind: "minimumWarlockLevel", level: 5 }],
  }),
  invocationOption({
    invocationId: "gift_of_the_depths",
    label: "Gift of the Depths",
    prerequisites: [{ kind: "minimumWarlockLevel", level: 5 }],
  }),
  invocationOption({
    invocationId: "gift_of_the_protectors",
    label: "Gift of the Protectors",
    prerequisites: [
      { kind: "minimumWarlockLevel", level: 9 },
      knownInvocation(PACT_OF_THE_TOME_INVOCATION_ID),
    ],
  }),
  invocationOption({
    invocationId: "investment_of_the_chain_master",
    label: "Investment of the Chain Master",
    prerequisites: [
      { kind: "minimumWarlockLevel", level: 5 },
      knownInvocation(PACT_OF_THE_CHAIN_INVOCATION_ID),
    ],
  }),
  invocationOption({
    invocationId: "lessons_of_the_first_ones",
    label: "Lessons of the First Ones",
    prerequisites: [{ kind: "minimumWarlockLevel", level: 2 }],
    repeatability: { kind: "repeatable", choice: { kind: "originFeat" } },
  }),
  invocationOption({
    invocationId: "lifedrinker",
    label: "Lifedrinker",
    prerequisites: [
      { kind: "minimumWarlockLevel", level: 9 },
      knownInvocation(PACT_OF_THE_BLADE_INVOCATION_ID),
    ],
  }),
  invocationOption({
    invocationId: "mask_of_many_faces",
    label: "Mask of Many Faces",
    prerequisites: [{ kind: "minimumWarlockLevel", level: 2 }],
  }),
  invocationOption({
    invocationId: "master_of_myriad_forms",
    label: "Master of Myriad Forms",
    prerequisites: [{ kind: "minimumWarlockLevel", level: 5 }],
  }),
  invocationOption({
    invocationId: "misty_visions",
    label: "Misty Visions",
    prerequisites: [{ kind: "minimumWarlockLevel", level: 2 }],
  }),
  invocationOption({
    invocationId: "one_with_shadows",
    label: "One with Shadows",
    prerequisites: [{ kind: "minimumWarlockLevel", level: 5 }],
  }),
  invocationOption({
    invocationId: "otherworldly_leap",
    label: "Otherworldly Leap",
    prerequisites: [{ kind: "minimumWarlockLevel", level: 2 }],
  }),
  invocationOption({
    invocationId: PACT_OF_THE_BLADE_INVOCATION_ID,
    label: "Pact of the Blade",
  }),
  invocationOption({
    invocationId: PACT_OF_THE_CHAIN_INVOCATION_ID,
    label: "Pact of the Chain",
  }),
  invocationOption({
    invocationId: PACT_OF_THE_TOME_INVOCATION_ID,
    label: "Pact of the Tome",
  }),
  invocationOption({
    invocationId: "repelling_blast",
    label: "Repelling Blast",
    prerequisites: [
      { kind: "minimumWarlockLevel", level: 2 },
      { kind: "knownWarlockCantrip", cantrip: "attack_roll_damage" },
    ],
    repeatability: {
      kind: "repeatable",
      choice: {
        kind: "knownWarlockCantrip",
        cantrip: "attack_roll_damage",
      },
    },
  }),
  invocationOption({
    invocationId: THIRSTING_BLADE_INVOCATION_ID,
    label: "Thirsting Blade",
    prerequisites: [
      { kind: "minimumWarlockLevel", level: 5 },
      knownInvocation(PACT_OF_THE_BLADE_INVOCATION_ID),
    ],
  }),
  invocationOption({
    invocationId: "visions_of_distant_realms",
    label: "Visions of Distant Realms",
    prerequisites: [{ kind: "minimumWarlockLevel", level: 9 }],
  }),
  invocationOption({
    invocationId: "whispers_of_the_grave",
    label: "Whispers of the Grave",
    prerequisites: [{ kind: "minimumWarlockLevel", level: 7 }],
  }),
  invocationOption({
    invocationId: "witch_sight",
    label: "Witch Sight",
    prerequisites: [{ kind: "minimumWarlockLevel", level: 15 }],
  }),
] as const satisfies ReadonlyArray<EldritchInvocationOption>;

export const LEVEL_ONE_ELDRITCH_INVOCATION_OPTIONS =
  SRD_ELDRITCH_INVOCATION_OPTIONS.filter(
    (option) => option.prerequisites.length === 0,
  );

export function levelOneEldritchInvocationChoiceOptions(): readonly CreationChoiceOption[] {
  return LEVEL_ONE_ELDRITCH_INVOCATION_OPTIONS.map((option) => ({
    optionId: option.optionId,
    label: option.label,
  }));
}

export function eldritchInvocationIdForOptionId(
  optionId: CreationChoiceOptionId,
): EldritchInvocationId | undefined {
  return SRD_ELDRITCH_INVOCATION_OPTIONS.find(
    (option) => option.optionId === optionId,
  )?.invocationId;
}

export function eldritchInvocationOptionForInvocationId(
  invocationId: EldritchInvocationId,
): EldritchInvocationOption | undefined {
  return SRD_ELDRITCH_INVOCATION_OPTIONS.find(
    (option) => option.invocationId === invocationId,
  );
}

export function isRepeatableEldritchInvocation(
  invocationId: EldritchInvocationId,
): boolean {
  return (
    eldritchInvocationOptionForInvocationId(invocationId)?.repeatability
      .kind === "repeatable"
  );
}

export function eldritchInvocationRepeatableChoiceSatisfiesRule(input: {
  readonly unitLibrary: UnitCatalog;
  readonly choiceRule: EldritchInvocationRepeatableChoiceRule;
  readonly repeatableChoice: CharacterBuildEldritchInvocationRepeatableChoice;
}): boolean {
  if (input.choiceRule.kind === "originFeat") {
    return (
      input.repeatableChoice.kind === "originFeat" &&
      isOriginFeat(input.unitLibrary, input.repeatableChoice.featUnitId)
    );
  }

  return (
    input.repeatableChoice.kind === "knownWarlockCantrip" &&
    knownWarlockCantripSatisfiesEldritchInvocationRule({
      unitLibrary: input.unitLibrary,
      cantripId: input.repeatableChoice.cantripId,
      cantrip: input.choiceRule.cantrip,
      ...(input.choiceRule.minimumRangeFeet === undefined
        ? {}
        : { minimumRangeFeet: input.choiceRule.minimumRangeFeet }),
    })
  );
}

export function knownWarlockCantripSatisfiesEldritchInvocationRule(input: {
  readonly unitLibrary: UnitCatalog;
  readonly cantripId: UnitRecord["id"];
  readonly cantrip: Extract<
    EldritchInvocationPrerequisite,
    { readonly kind: "knownWarlockCantrip" }
  >["cantrip"];
  readonly minimumRangeFeet?: number;
}): boolean {
  const unit = input.unitLibrary.getUnit(input.cantripId);
  if (Option.isNone(unit) || unit.value.kind !== "spell") {
    return false;
  }

  if (
    input.minimumRangeFeet !== undefined &&
    !spellRangeIsAtLeast(unit.value, input.minimumRangeFeet)
  ) {
    return false;
  }

  return input.cantrip === "attack_roll_damage"
    ? isAttackRollDamageCantrip(unit.value)
    : isDamageCantrip(unit.value);
}

export function selectedEldritchInvocationFeatures(input: {
  readonly selectedFromUnitId: UnitRecord["id"];
  readonly optionIds: readonly CreationChoiceOptionId[];
}): readonly {
  readonly kind: "selectedEldritchInvocation";
  readonly selectedFromUnitId: UnitRecord["id"];
  readonly selection: Extract<
    CharacterBuildEldritchInvocationSelection,
    { readonly kind: "nonRepeatable" }
  >;
}[] {
  return input.optionIds.flatMap((optionId) => {
    const invocationId = eldritchInvocationIdForOptionId(optionId);
    return invocationId == null
      ? []
      : [
          {
            kind: "selectedEldritchInvocation",
            selectedFromUnitId: input.selectedFromUnitId,
            selection: { kind: "nonRepeatable", invocationId },
          },
        ];
  });
}

function isOriginFeat(
  unitLibrary: UnitCatalog,
  featUnitId: UnitRecord["id"],
): boolean {
  const unit = unitLibrary.getUnit(featUnitId);
  return (
    Option.isSome(unit) &&
    unit.value.kind === "feat" &&
    unit.value.category === ORIGIN_FEAT_CATEGORY
  );
}

function spellRangeIsAtLeast(spell: SpellRecord, minimumFeet: number): boolean {
  return (
    spell.mechanics.family === "activation" &&
    spell.mechanics.range.kind === "point" &&
    typeof spell.mechanics.range.feet === "number" &&
    spell.mechanics.range.feet >= minimumFeet
  );
}

function isDamageCantrip(spell: SpellRecord): boolean {
  return (
    spell.mechanics.family === "activation" &&
    spell.mechanics.level === 0 &&
    spell.mechanics.phases.some((phase) => phaseDealsDamage(phase))
  );
}

function isAttackRollDamageCantrip(spell: SpellRecord): boolean {
  return (
    spell.mechanics.family === "activation" &&
    spell.mechanics.level === 0 &&
    spell.mechanics.phases.some(phaseDealsDamageViaAttackRoll)
  );
}

function phaseDealsDamage(phase: SpellActivationPhase): boolean {
  if (phase.kind === "attack_roll") {
    return phase.onHit.some(effectDealsDamage);
  }

  if (phase.kind === "save_gate") {
    return (
      effectDealsDamage(phase.onFail) ||
      saveGateSuccessOutcomeDealsDamage(phase.onSuccess)
    );
  }

  if (phase.kind === "direct") {
    return phase.effects?.some(directPhaseEffectDealsDamage) ?? false;
  }

  return false;
}

function phaseDealsDamageViaAttackRoll(phase: SpellActivationPhase): boolean {
  if (phase.kind === "attack_roll") {
    return phase.onHit.some(effectDealsDamage);
  }

  if (phase.kind === "direct") {
    return phase.effects?.some(directPhaseEffectIsWeaponAttack) ?? false;
  }

  return false;
}

function saveGateSuccessOutcomeDealsDamage(
  outcome: SaveGatePhase["onSuccess"],
): boolean {
  return outcome.kind === "half_damage" || effectDealsDamage(outcome);
}

function directPhaseEffectDealsDamage(effect: DirectPhaseEffect): boolean {
  return effect.kind === "damage" || directPhaseEffectIsWeaponAttack(effect);
}

function directPhaseEffectIsWeaponAttack(effect: DirectPhaseEffect): boolean {
  return effect.kind === "make_weapon_attack";
}

function effectDealsDamage(effect: EffectAtom): boolean {
  return effect.kind === "damage";
}
