import type { UnitRecord } from "@dnd/surface/surface/types";
import {
  creationChoiceOptionId,
  eldritchInvocationId,
  type CreationChoiceOption,
  type CreationChoiceOptionId,
  type EldritchInvocationId,
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
};

function invocationOption(input: {
  readonly invocationId: string | EldritchInvocationId;
  readonly label: string;
  readonly prerequisites?: readonly EldritchInvocationPrerequisite[];
}): EldritchInvocationOption {
  const invocationId = eldritchInvocationId(input.invocationId);
  return {
    invocationId,
    optionId: creationChoiceOptionId(invocationId),
    label: input.label,
    prerequisites: input.prerequisites ?? [],
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

const PACT_OF_THE_BLADE_INVOCATION_ID = eldritchInvocationId(
  "pact_of_the_blade",
);
const PACT_OF_THE_CHAIN_INVOCATION_ID = eldritchInvocationId(
  "pact_of_the_chain",
);
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

export function selectedEldritchInvocationFeatures(input: {
  readonly selectedFromUnitId: UnitRecord["id"];
  readonly optionIds: readonly CreationChoiceOptionId[];
}): readonly {
  readonly kind: "selectedEldritchInvocation";
  readonly selectedFromUnitId: UnitRecord["id"];
  readonly invocationId: EldritchInvocationId;
}[] {
  return input.optionIds.flatMap((optionId) => {
    const invocationId = eldritchInvocationIdForOptionId(optionId);
    return invocationId == null
      ? []
      : [
          {
            kind: "selectedEldritchInvocation",
            selectedFromUnitId: input.selectedFromUnitId,
            invocationId,
          },
      ];
  });
}
