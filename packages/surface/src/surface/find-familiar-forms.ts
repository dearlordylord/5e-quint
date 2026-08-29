import { Option } from "effect";

import {
  FIND_FAMILIAR_CREATURE_TYPE_OVERRIDE_TYPES,
  type CreatureType,
  type SpawnedCompanionCreatureTypeOverride,
  StatBlockId,
} from "@dnd/shared/game-facts";
import type { StatBlockCatalog } from "./stat-block-catalog.ts";
import type { SpellRecord, StatBlockRecord } from "./types.ts";

export {
  FIND_FAMILIAR_CREATURE_TYPE_OVERRIDE_TYPES,
  type SpawnedCompanionCreatureTypeOverride,
};
const FIND_FAMILIAR_CREATURE_TYPE_OVERRIDE_TYPE_SET = new Set<CreatureType>(
  FIND_FAMILIAR_CREATURE_TYPE_OVERRIDE_TYPES,
);

type PactOfTheChainSpecialFormRefShape = {
  readonly formId: string;
  readonly statBlockId: StatBlockId;
  readonly displayName: string;
};

export const PACT_OF_THE_CHAIN_SPECIAL_FORM_REFS = [
  {
    formId: "imp",
    statBlockId: StatBlockId.make("stat_block_imp"),
    displayName: "Imp",
  },
  {
    formId: "pseudodragon",
    statBlockId: StatBlockId.make("stat_block_pseudodragon"),
    displayName: "Pseudodragon",
  },
  {
    formId: "quasit",
    statBlockId: StatBlockId.make("stat_block_quasit"),
    displayName: "Quasit",
  },
  {
    formId: "skeleton",
    statBlockId: StatBlockId.make("stat_block_skeleton"),
    displayName: "Skeleton",
  },
  {
    formId: "sphinx_of_wonder",
    statBlockId: StatBlockId.make("stat_block_sphinx_of_wonder"),
    displayName: "Sphinx of Wonder",
  },
  {
    formId: "sprite",
    statBlockId: StatBlockId.make("stat_block_sprite"),
    displayName: "Sprite",
  },
  {
    formId: "venomous_snake",
    statBlockId: StatBlockId.make("stat_block_venomous_snake"),
    displayName: "Venomous Snake",
  },
] as const satisfies readonly [
  PactOfTheChainSpecialFormRefShape,
  ...PactOfTheChainSpecialFormRefShape[],
];

type SpawnedCreatureMechanics = Extract<
  SpellRecord["mechanics"],
  { readonly family: "spawned_creature" }
>;
type FamiliarFormCatalogCreature = Extract<
  SpawnedCreatureMechanics["creature"],
  { readonly kind: "familiar_form_catalog" }
>;
export type SpawnedCompanionNormalFormRef =
  FamiliarFormCatalogCreature["normalForms"][number];
type SpawnedCreatureModeOption = NonNullable<
  SpawnedCreatureMechanics["mode"]
>["options"][number];
export type SpawnedCompanionCreatureTypeOverrideChoice = {
  readonly optionId: SpawnedCreatureModeOption["id"];
  readonly displayName: SpawnedCreatureModeOption["displayName"];
  readonly creatureType: SpawnedCompanionCreatureTypeOverride;
};
export type SpawnedCompanionAdditionalFormEligibility = {
  readonly kind: "challengeRatingZeroBeast";
};
export type PactOfTheChainSpecialFormRef =
  (typeof PACT_OF_THE_CHAIN_SPECIAL_FORM_REFS)[number];

export type SpawnedCompanionFormSelection =
  | {
      readonly tag: "normalNamedForm";
      readonly formId: SpawnedCompanionNormalFormRef["formId"];
    }
  | {
      readonly tag: "challengeRatingZeroBeast";
      readonly statBlockId: StatBlockRecord["id"];
    };

export type PactOfTheChainSpawnedCompanionFormSelection =
  | SpawnedCompanionFormSelection
  | {
      readonly tag: "pactOfTheChainSpecialForm";
      readonly formId: PactOfTheChainSpecialFormRef["formId"];
    };

export type SpawnedCompanionFormEligibility = {
  readonly normalForms: readonly SpawnedCompanionNormalFormRef[];
  readonly additionalNormalFormEligibility: SpawnedCompanionAdditionalFormEligibility;
  readonly creatureTypeOverrideChoices: readonly SpawnedCompanionCreatureTypeOverrideChoice[];
};

export type PactOfTheChainSpawnedCompanionFormEligibility =
  SpawnedCompanionFormEligibility & {
    readonly specialForms: readonly PactOfTheChainSpecialFormRef[];
  };

export type SpawnedCompanionResolvedForm = {
  readonly statBlock: StatBlockRecord;
  readonly creatureTypeOverride: SpawnedCompanionCreatureTypeOverride;
};

export type SpawnedCompanionFormResolution =
  | {
      readonly tag: "resolved";
      readonly form: SpawnedCompanionResolvedForm;
    }
  | {
      readonly tag: "issue";
      readonly message: string;
    };

type CreatureTypeOverrideChoiceResolution =
  | {
      readonly tag: "resolved";
      readonly creatureTypeOverride: SpawnedCompanionCreatureTypeOverride;
    }
  | {
      readonly tag: "issue";
      readonly message: string;
    };

export function spawnedCompanionFormEligibilityForSpell(
  spell: SpellRecord,
): SpawnedCompanionFormEligibility | null {
  if (
    spell.mechanics.family !== "spawned_creature" ||
    spell.mechanics.creature.kind !== "familiar_form_catalog"
  ) {
    return null;
  }
  /* v8 ignore start -- @preserve -- duplicate normal-form ids are malformed Find Familiar authorship; the shipped record is decoded and uniqueness-audited */
  if (
    !hasUniqueSpawnedCompanionNormalFormIds(
      spell.mechanics.creature.normalForms,
    )
  ) {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  const creatureTypeOverrideChoices =
    spawnedCompanionCreatureTypeOverrideChoicesForSpell(spell);
  /* v8 ignore start -- @preserve -- a missing, duplicate, or incomplete override menu is malformed Find Familiar authorship */
  if (creatureTypeOverrideChoices === null) {
    return null;
  }
  /* v8 ignore stop -- @preserve */

  return {
    normalForms: spell.mechanics.creature.normalForms,
    additionalNormalFormEligibility:
      spell.mechanics.creature.additionalNormalFormEligibility,
    creatureTypeOverrideChoices,
  };
}

export function pactOfTheChainSpawnedCompanionFormEligibilityForSpell(
  spell: SpellRecord,
): PactOfTheChainSpawnedCompanionFormEligibility | null {
  const baseEligibility = spawnedCompanionFormEligibilityForSpell(spell);
  return baseEligibility === null
    ? null
    : {
        ...baseEligibility,
        specialForms: PACT_OF_THE_CHAIN_SPECIAL_FORM_REFS,
      };
}

export function resolveSpawnedCompanionForm(input: {
  readonly catalog: StatBlockCatalog;
  readonly eligibility: SpawnedCompanionFormEligibility;
  readonly selection: SpawnedCompanionFormSelection;
  readonly creatureTypeOverrideChoiceId: SpawnedCompanionCreatureTypeOverrideChoice["optionId"];
}): SpawnedCompanionFormResolution {
  const creatureTypeOverride = resolveCreatureTypeOverrideChoice({
    eligibility: input.eligibility,
    optionId: input.creatureTypeOverrideChoiceId,
  });
  if (creatureTypeOverride.tag === "issue") {
    return creatureTypeOverride;
  }

  return resolveSpawnedCompanionSelectedForm({
    catalog: input.catalog,
    eligibility: input.eligibility,
    selection: input.selection,
    creatureTypeOverride: creatureTypeOverride.creatureTypeOverride,
  });
}

export function resolveSpawnedCompanionSelectedForm(input: {
  readonly catalog: StatBlockCatalog;
  readonly eligibility: SpawnedCompanionFormEligibility;
  readonly selection: SpawnedCompanionFormSelection;
  readonly creatureTypeOverride: SpawnedCompanionCreatureTypeOverride;
}): SpawnedCompanionFormResolution {
  if (input.selection.tag === "normalNamedForm") {
    const formId = input.selection.formId;
    const formRef = input.eligibility.normalForms.find(
      (candidate) => candidate.formId === formId,
    );

    return formRef === undefined
      ? {
          tag: "issue",
          message: `Find Familiar normal form is not eligible: ${formId}.`,
        }
      : resolveChallengeRatingZeroBeastStatBlock({
          catalog: input.catalog,
          statBlockId: formRef.statBlockId,
          creatureTypeOverride: input.creatureTypeOverride,
        });
  }

  return resolveChallengeRatingZeroBeastStatBlock({
    catalog: input.catalog,
    statBlockId: input.selection.statBlockId,
    creatureTypeOverride: input.creatureTypeOverride,
  });
}

export function resolvePactOfTheChainSpawnedCompanionForm(input: {
  readonly catalog: StatBlockCatalog;
  readonly eligibility: PactOfTheChainSpawnedCompanionFormEligibility;
  readonly selection: PactOfTheChainSpawnedCompanionFormSelection;
  readonly creatureTypeOverrideChoiceId: SpawnedCompanionCreatureTypeOverrideChoice["optionId"];
}): SpawnedCompanionFormResolution {
  if (input.selection.tag !== "pactOfTheChainSpecialForm") {
    return resolveSpawnedCompanionForm({
      catalog: input.catalog,
      eligibility: input.eligibility,
      selection: input.selection,
      creatureTypeOverrideChoiceId: input.creatureTypeOverrideChoiceId,
    });
  }
  const creatureTypeOverride = resolveCreatureTypeOverrideChoice({
    eligibility: input.eligibility,
    optionId: input.creatureTypeOverrideChoiceId,
  });
  if (creatureTypeOverride.tag === "issue") {
    return creatureTypeOverride;
  }

  const formId = input.selection.formId;
  const formRef = input.eligibility.specialForms.find(
    (candidate) => candidate.formId === formId,
  );

  if (formRef === undefined) {
    return {
      tag: "issue",
      message: `Pact of the Chain special form is not eligible: ${formId}.`,
    };
  }

  const statBlock = getStatBlock(input.catalog, formRef.statBlockId);
  return statBlock === null
    ? {
        tag: "issue",
        message: `Pact of the Chain special form Stat Block is not in the catalog: ${formRef.statBlockId}.`,
      }
    : {
        tag: "resolved",
        form: {
          statBlock,
          creatureTypeOverride: creatureTypeOverride.creatureTypeOverride,
        },
      };
}

function spawnedCompanionCreatureTypeOverrideChoicesForSpell(
  spell: SpellRecord,
): readonly SpawnedCompanionCreatureTypeOverrideChoice[] | null {
  const mode =
    spell.mechanics.family === "spawned_creature"
      ? spell.mechanics.mode
      : undefined;
  /* v8 ignore start -- @preserve -- the admitted Find Familiar record must author its complete creature-type mode menu */
  if (mode === undefined) {
    return null;
  }
  /* v8 ignore stop -- @preserve */

  const choices: SpawnedCompanionCreatureTypeOverrideChoice[] = [];
  const creatureTypes = new Set<SpawnedCompanionCreatureTypeOverride>();
  const optionIds = new Set<
    SpawnedCompanionCreatureTypeOverrideChoice["optionId"]
  >();
  for (const option of mode.options) {
    const creatureType = option.overrides.creatureType;
    /* v8 ignore start -- @preserve -- unknown creature types and duplicate option/type identities are malformed mode-menu authorship */
    if (
      !isSpawnedCompanionCreatureTypeOverride(creatureType) ||
      optionIds.has(option.id) ||
      creatureTypes.has(creatureType)
    ) {
      return null;
    }
    /* v8 ignore stop -- @preserve */
    optionIds.add(option.id);
    creatureTypes.add(creatureType);
    choices.push({
      optionId: option.id,
      displayName: option.displayName,
      creatureType,
    });
  }
  /* v8 ignore start -- @preserve -- the admitted mode menu must cover every canonical Find Familiar creature-type override */
  return FIND_FAMILIAR_CREATURE_TYPE_OVERRIDE_TYPES.every((creatureType) =>
    creatureTypes.has(creatureType),
  )
    ? choices
    : null;
  /* v8 ignore stop -- @preserve */
}

function hasUniqueSpawnedCompanionNormalFormIds(
  normalForms: readonly SpawnedCompanionNormalFormRef[],
): boolean {
  const formIds = new Set<SpawnedCompanionNormalFormRef["formId"]>();
  for (const form of normalForms) {
    /* v8 ignore start -- @preserve -- duplicate normal-form identities are rejected as malformed Find Familiar authorship */
    if (formIds.has(form.formId)) {
      return false;
    }
    /* v8 ignore stop -- @preserve */
    formIds.add(form.formId);
  }
  return true;
}

function resolveCreatureTypeOverrideChoice(input: {
  readonly eligibility: SpawnedCompanionFormEligibility;
  readonly optionId: SpawnedCompanionCreatureTypeOverrideChoice["optionId"];
}): CreatureTypeOverrideChoiceResolution {
  const choice = input.eligibility.creatureTypeOverrideChoices.find(
    (candidate) => candidate.optionId === input.optionId,
  );
  return choice === undefined
    ? {
        tag: "issue",
        message: `Find Familiar creature type override is not eligible: ${input.optionId}.`,
      }
    : {
        tag: "resolved",
        creatureTypeOverride: choice.creatureType,
      };
}

export function isSpawnedCompanionCreatureTypeOverride(
  creatureType: unknown,
): creatureType is SpawnedCompanionCreatureTypeOverride {
  return (
    typeof creatureType === "string" &&
    FIND_FAMILIAR_CREATURE_TYPE_OVERRIDE_TYPE_SET.has(
      creatureType as CreatureType,
    )
  );
}

function resolveChallengeRatingZeroBeastStatBlock(input: {
  readonly catalog: StatBlockCatalog;
  readonly statBlockId: StatBlockRecord["id"];
  readonly creatureTypeOverride: SpawnedCompanionCreatureTypeOverride;
}): SpawnedCompanionFormResolution {
  const statBlock = getStatBlock(input.catalog, input.statBlockId);
  if (statBlock === null) {
    return {
      tag: "issue",
      message: `Find Familiar form Stat Block is not in the catalog: ${input.statBlockId}.`,
    };
  }

  if (
    statBlock.statBlock.creatureType !== "beast" ||
    statBlock.challengeRating !== 0
  ) {
    return {
      tag: "issue",
      message: `Find Familiar normal form must resolve to a CR 0 Beast Stat Block: ${input.statBlockId}.`,
    };
  }

  return {
    tag: "resolved",
    form: {
      statBlock,
      creatureTypeOverride: input.creatureTypeOverride,
    },
  };
}

function getStatBlock(
  catalog: StatBlockCatalog,
  statBlockId: StatBlockId,
): StatBlockRecord | null {
  return Option.getOrNull(catalog.getStatBlock(statBlockId));
}
