import { Match, Schema } from "effect";

import {
  ABILITIES,
  ALIGNMENT_MORALITIES,
  ALIGNMENT_ORDERS,
  LANGUAGES,
  STANDARD_LANGUAGES,
  type CharacterStartingLanguages,
} from "@dnd/shared/game-facts";
import { AbilityScore } from "@dnd/shared/types";
import {
  ARMOR_TRAINING_CATEGORIES,
  SKILLS,
  WEAPON_PROFICIENCY_CATEGORIES,
} from "@dnd/surface/surface/types";
import {
  CHARACTER_DRAFT_CHOICE_PATHS,
  CREATION_BATCH_ISSUE_CODES,
  CREATION_FILL_ISSUE_CODES,
  LOADOUT_SLOTS,
  SUPPORTED_ABILITY_SCORE_METHODS,
  UNIT_CHOICE_KEYS,
  parseCharacterEquipmentItemId,
  parseCreationHoleId,
  type CharacterBuild,
  type CharacterEquipmentItemIdText,
  type CharacterEquipmentItemSlot,
  type CreationBatchFillIssue,
  type CreationBatchFillResult,
  type CreationFill,
  type CreationFinalizationIssue,
  type CreationFinalizationResult,
  type CreationHole,
  type CreationHoleIdText,
  type NonEmptyReadonlyArray,
} from "./types.ts";
import { holeIdForSource } from "./hole-factories.ts";

const UnitIdSchema = Schema.NonEmptyTrimmedString;
const AbilitySchema = Schema.Literal(...ABILITIES);
const CreationChoiceOptionIdSchema = Schema.String.pipe(
  Schema.brand("CreationChoiceOptionId"),
);
const CreationHoleIdSchema = Schema.String.pipe(
  Schema.filter(
    (value): value is CreationHoleIdText => parseCreationHoleId(value) !== null,
    { message: () => "invalid Creation Hole id" },
  ),
  Schema.brand("CreationHoleId"),
);
const ChoiceCountSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
  Schema.brand("ChoiceCount"),
);
const ChoiceMinimumCountSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
  Schema.brand("NonNegativeInteger"),
  Schema.brand("ChoiceMinimumCount"),
);
const FillIndexSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
  Schema.brand("Index"),
  Schema.brand("FillIndex"),
);
const AbilityScoreAssignmentSchema = Schema.Struct({
  str: AbilityScore,
  dex: AbilityScore,
  con: AbilityScore,
  int: AbilityScore,
  wis: AbilityScore,
  cha: AbilityScore,
});

const ChoiceCardinalitySchema = Schema.Union(
  Schema.Struct({ tag: Schema.Literal("exactly"), count: ChoiceCountSchema }),
  Schema.Struct({
    tag: Schema.Literal("between"),
    min: ChoiceMinimumCountSchema,
    max: ChoiceCountSchema,
  }).pipe(
    Schema.filter(({ min, max }) => min <= max, {
      message: () => "cardinality maximum must be at least its minimum",
    }),
  ),
);
const ChoiceHoleSourceSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("draft"),
    path: Schema.Literal(...CHARACTER_DRAFT_CHOICE_PATHS),
  }),
  Schema.Struct({
    tag: Schema.Literal("unitChoice"),
    unitId: Schema.NonEmptyTrimmedString.pipe(
      Schema.brand("UnitChoiceSourceUnitId"),
    ),
    choiceKey: Schema.Literal(...UNIT_CHOICE_KEYS),
  }),
  Schema.Struct({
    tag: Schema.Literal("loadout"),
    equipmentUnitId: Schema.NonEmptyTrimmedString.pipe(
      Schema.brand("LoadoutEquipmentUnitId"),
    ),
    slot: Schema.Literal(...LOADOUT_SLOTS),
  }),
);
const UnitRefSchema = Schema.Struct({
  unitId: UnitIdSchema,
  selectedOption: Schema.optionalWith(
    Schema.Struct({
      kind: Schema.Literal("huntersPrey"),
      selection: Schema.Literal(
        "woundedTargetWeaponDamage",
        "nearbyDifferentTargetSameWeaponAttack",
      ),
    }),
    { exact: true },
  ),
});
const CreationChoiceOptionFactSchema = Schema.Struct({
  optionId: CreationChoiceOptionIdSchema,
  unitRef: Schema.optionalWith(UnitRefSchema, { exact: true }),
});

export const CreationHoleFactSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("choice"),
    holeId: CreationHoleIdSchema,
    source: ChoiceHoleSourceSchema,
    cardinality: ChoiceCardinalitySchema,
    options: Schema.Array(CreationChoiceOptionFactSchema).pipe(
      Schema.filter(
        (options) =>
          new Set(options.map(({ optionId }) => optionId)).size ===
          options.length,
        { message: () => "Creation Hole option identity must be distinct" },
      ),
    ),
  }),
  Schema.Struct({
    kind: Schema.Literal("abilityScores"),
    holeId: CreationHoleIdSchema,
    source: Schema.Struct({
      tag: Schema.Literal("draft"),
      path: Schema.Literal("draft.abilityScoreGeneration"),
    }),
    methods: Schema.Array(Schema.Literal(...SUPPORTED_ABILITY_SCORE_METHODS)),
  }),
).pipe(
  Schema.filter(({ holeId, source }) => holeId === holeIdForSource(source), {
    message: () => "Creation Hole identity must match its owner source",
  }),
);
export type CreationHoleFact = Schema.Schema.Type<
  typeof CreationHoleFactSchema
>;

export const CreationFrontierFactSchema = Schema.Struct({
  holes: Schema.Array(CreationHoleFactSchema).pipe(
    Schema.filter(
      (holes) =>
        new Set(holes.map(({ holeId }) => holeId)).size === holes.length,
      { message: () => "Creation frontier Hole identity must be distinct" },
    ),
  ),
});
export type CreationFrontierFact = Schema.Schema.Type<
  typeof CreationFrontierFactSchema
>;

export const CreationFillFactSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("choice"),
    holeId: CreationHoleIdSchema,
    optionIds: Schema.Array(CreationChoiceOptionIdSchema),
  }),
  Schema.Struct({
    kind: Schema.Literal("abilityScores"),
    holeId: CreationHoleIdSchema,
    method: Schema.Literal(...SUPPORTED_ABILITY_SCORE_METHODS),
    value: AbilityScoreAssignmentSchema,
  }),
);
export type CreationFillFact = Schema.Schema.Type<
  typeof CreationFillFactSchema
>;

const ProgressionSchema = Schema.Struct({
  startingClass: UnitIdSchema,
  advancements: Schema.Array(
    Schema.Struct({
      classUnitId: UnitIdSchema,
      hitPointRule: Schema.Struct({
        tag: Schema.Literal("fixedHigherLevelGain"),
      }),
    }),
  ),
});
const OriginLanguagesSchema = Schema.Array(
  Schema.Literal(...STANDARD_LANGUAGES),
).pipe(
  Schema.filter(
    (languages): languages is CharacterStartingLanguages =>
      languages.length === 3 &&
      languages[0] === "Common" &&
      new Set(languages).size === languages.length,
    { message: () => "origin languages must contain Common and two others" },
  ),
);
const SpeciesChoiceFactsSchema = Schema.Union(
  Schema.Struct({
    draconicAncestry: Schema.Struct({
      kind: Schema.Literal("draconicAncestry"),
      ancestorId: Schema.String.pipe(
        Schema.brand("CharacterDraconicAncestrySelection"),
      ),
    }),
  }),
  Schema.Struct({
    gnomishLineage: Schema.Struct({
      kind: Schema.Literal("gnomishLineage"),
      lineageId: Schema.Literal("forest_gnome", "rock_gnome"),
      spellcastingAbility: Schema.Literal("int", "wis", "cha"),
    }),
  }),
);
const ClassFeatureLanguageSchema = Schema.Struct({
  kind: Schema.Literal(
    "classFeatureLanguageGrant",
    "classFeatureLanguageChoice",
  ),
  sourceUnitId: UnitIdSchema,
  language: Schema.Literal(...LANGUAGES),
});
const ProficiencyChoiceSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("skill"),
    skill: Schema.Literal(...SKILLS),
  }),
  Schema.Struct({
    kind: Schema.Literal("skill_expertise"),
    skill: Schema.Literal(...SKILLS),
  }),
  Schema.Struct({
    kind: Schema.Literal("weapon_category"),
    category: Schema.Literal(...WEAPON_PROFICIENCY_CATEGORIES),
  }),
  Schema.Struct({
    kind: Schema.Literal("armor_category"),
    category: Schema.Literal(...ARMOR_TRAINING_CATEGORIES),
  }),
  Schema.Struct({
    kind: Schema.Literal("tool"),
    toolId: Schema.String.pipe(Schema.brand("ToolProficiencyId")),
  }),
);
const EldritchInvocationIdSchema = Schema.String.pipe(
  Schema.brand("EldritchInvocationId"),
);
const FeatureSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("selectedClassChoice"),
    selectedFromUnitId: UnitIdSchema,
    unitId: UnitIdSchema,
    selectedOption: Schema.optionalWith(
      Schema.Struct({
        kind: Schema.Literal("huntersPrey"),
        selection: Schema.Literal(
          "woundedTargetWeaponDamage",
          "nearbyDifferentTargetSameWeaponAttack",
        ),
      }),
      { exact: true },
    ),
  }),
  Schema.Struct({
    kind: Schema.Literal("selectedEldritchInvocation"),
    selectedFromUnitId: UnitIdSchema,
    selection: Schema.Union(
      Schema.Struct({
        kind: Schema.Literal("nonRepeatable"),
        invocationId: EldritchInvocationIdSchema,
      }),
      Schema.Struct({
        kind: Schema.Literal("repeatable"),
        invocationId: EldritchInvocationIdSchema,
        repeatableChoice: Schema.Union(
          Schema.Struct({
            kind: Schema.Literal("knownWarlockCantrip"),
            cantripId: UnitIdSchema,
          }),
          Schema.Struct({
            kind: Schema.Literal("originFeat"),
            featUnitId: UnitIdSchema,
          }),
        ),
      }),
    ),
  }),
  Schema.Struct({
    kind: Schema.Literal("selectedSorcererMetamagicOption"),
    selectedFromUnitId: UnitIdSchema,
    optionId: Schema.String.pipe(Schema.brand("SorcererMetamagicOptionId")),
  }),
  Schema.Struct({
    kind: Schema.Literal("abilityCheckBonus"),
    selectedFromUnitId: UnitIdSchema,
    ability: AbilitySchema,
    skills: Schema.Array(Schema.Literal(...SKILLS)),
    bonus: Schema.Struct({
      kind: Schema.Literal("abilityModifier"),
      ability: AbilitySchema,
      minimum: Schema.Number.pipe(Schema.int()),
    }),
  }),
);
const characterEquipmentItemIdSchema = <
  const Slot extends CharacterEquipmentItemSlot,
>(
  slot?: Slot,
) =>
  Schema.String.pipe(
    Schema.filter(
      (value): value is CharacterEquipmentItemIdText<Slot> => {
        const parsed = parseCharacterEquipmentItemId(value);
        return (
          parsed._tag === "Right" &&
          (slot === undefined || parsed.right.slot === slot)
        );
      },
      { message: () => "invalid Character Equipment Item id" },
    ),
    Schema.brand("CharacterEquipmentItemId"),
  );
const EquipmentSchema = Schema.Struct({
  owned: Schema.Array(
    Schema.Struct({
      itemId: characterEquipmentItemIdSchema(),
      unitId: UnitIdSchema,
    }),
  ),
  loadout: Schema.Struct({
    armor: Schema.optionalWith(characterEquipmentItemIdSchema("armor"), {
      exact: true,
    }),
    shield: Schema.optionalWith(characterEquipmentItemIdSchema("shield"), {
      exact: true,
    }),
    weapon: Schema.optionalWith(
      Schema.Struct({
        itemId: characterEquipmentItemIdSchema("main"),
        grip: Schema.Literal("one_handed"),
      }),
      { exact: true },
    ),
    offHandWeapon: Schema.optionalWith(
      Schema.Struct({ itemId: characterEquipmentItemIdSchema("off") }),
      { exact: true },
    ),
  }),
});
const SpellcastingSchema = Schema.Struct({
  sources: Schema.NonEmptyArray(
    Schema.Struct({
      sourceUnitId: UnitIdSchema,
      spellcastingAbility: AbilitySchema,
      cantrips: Schema.Array(UnitIdSchema),
      spellbook: Schema.Array(UnitIdSchema),
      preparedSpells: Schema.Array(UnitIdSchema),
      spellcastingFocuses: Schema.Array(
        Schema.Literal(
          "arcane_focus",
          "druidic_focus",
          "holy_symbol",
          "musical_instrument",
          "book_of_shadows",
          "spellbook",
        ),
      ),
      bookOfShadows: Schema.optionalWith(
        Schema.Struct({
          tag: Schema.Literal("bookOfShadows"),
          cantrips: Schema.Tuple(UnitIdSchema, UnitIdSchema, UnitIdSchema),
          ritualSpells: Schema.Tuple(UnitIdSchema, UnitIdSchema),
          spellcastingFocus: Schema.Literal("book_of_shadows"),
        }),
        { exact: true },
      ),
    }),
  ),
  slotPools: Schema.Struct({
    spellcasting: Schema.optionalWith(
      Schema.Struct({
        kind: Schema.Literal("spellcasting"),
        slots: Schema.Array(
          Schema.Struct({
            spellLevel: Schema.Number.pipe(Schema.int(), Schema.between(1, 9)),
            count: Schema.Number.pipe(
              Schema.int(),
              Schema.greaterThanOrEqualTo(0),
            ),
          }),
        ),
      }),
      { exact: true },
    ),
    pactMagic: Schema.optionalWith(
      Schema.Struct({
        kind: Schema.Literal("pactMagic"),
        slotLevel: Schema.Number.pipe(Schema.int(), Schema.between(1, 9)),
        count: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
      }),
      { exact: true },
    ),
  }),
});

export const CharacterBuildFactSchema = Schema.Struct({
  progression: ProgressionSchema,
  background: UnitIdSchema,
  species: UnitIdSchema,
  speciesSize: Schema.optionalWith(Schema.Literal("medium", "small"), {
    exact: true,
  }),
  speciesChoiceFacts: Schema.optionalWith(SpeciesChoiceFactsSchema, {
    exact: true,
  }),
  originLanguages: OriginLanguagesSchema,
  classFeatureLanguages: Schema.Array(ClassFeatureLanguageSchema),
  alignment: Schema.Struct({
    order: Schema.Literal(...ALIGNMENT_ORDERS),
    morality: Schema.Literal(...ALIGNMENT_MORALITIES),
  }),
  abilityScores: AbilityScoreAssignmentSchema,
  proficiencyChoices: Schema.Array(ProficiencyChoiceSchema),
  features: Schema.Array(FeatureSchema),
  spellcasting: Schema.optionalWith(SpellcastingSchema, { exact: true }),
  equipment: EquipmentSchema,
});
export type CharacterBuildFact = Schema.Schema.Type<
  typeof CharacterBuildFactSchema
>;

const CreationFillIssueFactSchema = Schema.Struct({
  tag: Schema.Literal("illegalFill"),
  holeId: CreationHoleIdSchema,
  fillIndex: FillIndexSchema,
  code: Schema.Literal(...CREATION_FILL_ISSUE_CODES),
});
const CreationBatchIssueFactSchema = Schema.Struct({
  tag: Schema.Literal("illegalBatch"),
  code: Schema.Literal(...CREATION_BATCH_ISSUE_CODES),
});
export const CreationBatchRejectionFactSchema = Schema.Union(
  CreationFillIssueFactSchema,
  CreationBatchIssueFactSchema,
);
export type CreationBatchRejectionFact = Schema.Schema.Type<
  typeof CreationBatchRejectionFactSchema
>;

export const CreationFinalizationRejectionFactSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("illegalFinalization"),
    code: Schema.Literal("illegalFinalization"),
  }),
  Schema.Struct({
    tag: Schema.Literal("invalidChoiceOption"),
    code: Schema.Literal("invalidChoiceOption"),
    optionId: Schema.String,
  }),
  Schema.Struct({
    tag: Schema.Literal("unsupportedFinalization"),
    code: Schema.Literal("unsupportedFinalization"),
  }),
);
export type CreationFinalizationRejectionFact = Schema.Schema.Type<
  typeof CreationFinalizationRejectionFactSchema
>;

export const CreationFinalizationFactSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("ready"),
    build: CharacterBuildFactSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("incomplete"),
    frontier: CreationFrontierFactSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("invalid"),
    issues: Schema.NonEmptyArray(CreationFinalizationRejectionFactSchema),
  }),
);
export type CreationFinalizationFact = Schema.Schema.Type<
  typeof CreationFinalizationFactSchema
>;

export const CharacterCreationBatchFactSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("accepted"),
    frontier: CreationFrontierFactSchema,
    finalization: CreationFinalizationFactSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("rejected"),
    frontier: CreationFrontierFactSchema,
    issues: Schema.NonEmptyArray(CreationBatchRejectionFactSchema),
    finalization: CreationFinalizationFactSchema,
  }),
);
export type CharacterCreationBatchFact = Schema.Schema.Type<
  typeof CharacterCreationBatchFactSchema
>;

function noUnprojectedFields(
  fields: Readonly<Record<PropertyKey, never>>,
): void {
  void fields;
}

function mapNonEmpty<A, B>(
  values: NonEmptyReadonlyArray<A>,
  project: (value: A) => B,
): NonEmptyReadonlyArray<B> {
  return [project(values[0]), ...values.slice(1).map(project)];
}

export function creationHoleFact(hole: CreationHole): CreationHoleFact {
  return Match.value(hole).pipe(
    Match.when({ kind: "choice" }, (choice) => {
      const { kind, holeId, source, cardinality, options, ...unprojected } =
        choice;
      noUnprojectedFields(unprojected);
      return {
        kind,
        holeId,
        source,
        cardinality,
        options: options.map(
          ({ optionId, unitRef, label: _label, ...rest }) => {
            noUnprojectedFields(rest);
            return unitRef === undefined ? { optionId } : { optionId, unitRef };
          },
        ),
      };
    }),
    Match.when({ kind: "abilityScores" }, (abilityScores) => {
      const { kind, holeId, source, methods, ...unprojected } = abilityScores;
      noUnprojectedFields(unprojected);
      return { kind, holeId, source, methods };
    }),
    Match.exhaustive,
  );
}

export function creationFrontierFact(
  holes: readonly CreationHole[],
): CreationFrontierFact {
  return { holes: holes.map(creationHoleFact) };
}

export function creationFillFact(fill: CreationFill): CreationFillFact {
  return Match.value(fill).pipe(
    Match.when({ kind: "choice" }, (choice) => {
      const { kind, holeId, optionIds, ...unprojected } = choice;
      noUnprojectedFields(unprojected);
      return { kind, holeId, optionIds };
    }),
    Match.when({ kind: "abilityScores" }, (abilityScores) => {
      const { kind, holeId, method, value, ...unprojected } = abilityScores;
      noUnprojectedFields(unprojected);
      return { kind, holeId, method, value };
    }),
    Match.exhaustive,
  );
}

export function characterBuildFact(build: CharacterBuild): CharacterBuildFact {
  const {
    progression,
    background,
    species,
    speciesSize,
    speciesChoiceFacts,
    originLanguages,
    classFeatureLanguages,
    alignment,
    abilityScores,
    proficiencyChoices,
    features,
    spellcasting,
    equipment,
    ...unprojected
  } = build;
  noUnprojectedFields(unprojected);
  return {
    progression,
    background,
    species,
    ...(speciesSize === undefined ? {} : { speciesSize }),
    ...(speciesChoiceFacts === undefined ? {} : { speciesChoiceFacts }),
    originLanguages,
    classFeatureLanguages,
    alignment,
    abilityScores,
    proficiencyChoices,
    features,
    ...(spellcasting === undefined ? {} : { spellcasting }),
    equipment,
  };
}

function creationBatchRejectionFact(
  issue: CreationBatchFillIssue,
): CreationBatchRejectionFact {
  return Match.value(issue).pipe(
    Match.when({ tag: "illegalFill" }, (fillIssue) => {
      const {
        tag,
        holeId,
        fillIndex,
        code,
        message: _message,
        ...unprojected
      } = fillIssue;
      noUnprojectedFields(unprojected);
      return { tag, holeId, fillIndex, code };
    }),
    Match.when({ tag: "illegalBatch" }, (batchIssue) => {
      const { tag, code, message: _message, ...unprojected } = batchIssue;
      noUnprojectedFields(unprojected);
      return { tag, code };
    }),
    Match.exhaustive,
  );
}

function creationFinalizationRejectionFact(
  issue: CreationFinalizationIssue,
): CreationFinalizationRejectionFact {
  return Match.value(issue).pipe(
    Match.when({ tag: "illegalFinalization" }, (illegal) => {
      const { tag, code, message: _message, ...unprojected } = illegal;
      noUnprojectedFields(unprojected);
      return { tag, code };
    }),
    Match.when({ tag: "invalidChoiceOption" }, (invalidChoice) => {
      const {
        tag,
        code,
        optionId,
        reason: _reason,
        message: _message,
        ...unprojected
      } = invalidChoice;
      noUnprojectedFields(unprojected);
      return { tag, code, optionId };
    }),
    Match.when({ tag: "unsupportedFinalization" }, (unsupported) => {
      const { tag, code, message: _message, ...unprojected } = unsupported;
      noUnprojectedFields(unprojected);
      return { tag, code };
    }),
    Match.exhaustive,
  );
}

export function creationFinalizationFact(
  result: CreationFinalizationResult,
): CreationFinalizationFact {
  return Match.value(result).pipe(
    Match.when({ tag: "ready" }, ({ tag, build, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag, build: characterBuildFact(build) };
    }),
    Match.when({ tag: "incomplete" }, ({ tag, holes, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return { tag, frontier: creationFrontierFact(holes) };
    }),
    Match.when({ tag: "invalid" }, ({ tag, issues, ...unprojected }) => {
      noUnprojectedFields(unprojected);
      return {
        tag,
        issues: mapNonEmpty(issues, creationFinalizationRejectionFact),
      };
    }),
    Match.exhaustive,
  );
}

export function characterCreationBatchFact(
  result: CreationBatchFillResult,
): CharacterCreationBatchFact {
  return Match.value(result).pipe(
    Match.when(
      { tag: "accepted" },
      ({ tag, holes, finalization, draft: _draft, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return {
          tag,
          frontier: creationFrontierFact(holes),
          finalization: creationFinalizationFact(finalization),
        };
      },
    ),
    Match.when(
      { tag: "rejected" },
      ({ tag, holes, issues, finalization, draft: _draft, ...unprojected }) => {
        noUnprojectedFields(unprojected);
        return {
          tag,
          frontier: creationFrontierFact(holes),
          issues: mapNonEmpty(issues, creationBatchRejectionFact),
          finalization: creationFinalizationFact(finalization),
        };
      },
    ),
    Match.exhaustive,
  );
}
