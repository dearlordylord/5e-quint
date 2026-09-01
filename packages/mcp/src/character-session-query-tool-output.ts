import {
  CharacterSheetIdSchema,
  WILD_SHAPE_STAT_BLOCK_CATALOG_REQUIRED_MESSAGE,
} from "@dnd/character-sheet-runtime";
import { StatBlockId, UnitId } from "@dnd/shared/game-facts";
import { ArmorClassSchema } from "@dnd/shared-algebras/armor-class-algebra";
import { HAND_USES, MovementFeet, ResourceCount } from "@dnd/shared/types";
import {
  AbilitySchema,
  ArmorAcFormulaSchema,
  ArmorCategorySchema,
  SkillSchema,
} from "@dnd/surface/surface/schema";
import { ARMOR_TRAINING_CATEGORIES } from "@dnd/surface/surface/types";
import { Schema, SchemaGetter } from "effect";

import { McpSessionSummarySchema } from "./session-snapshot-output.ts";

const PositiveIntegerSchema = Schema.Number.pipe(
  Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(1)),
);
const IntegerSchema = Schema.Number.pipe(Schema.check(Schema.isInt()));
const MovementFeetOutputSchema = MovementFeet.pipe(
  Schema.decodeTo(Schema.Number, {
    decode: SchemaGetter.transform<number, MovementFeet>((feet) =>
      Number(feet),
    ),
    encode: SchemaGetter.transform<MovementFeet, number>((feet) =>
      MovementFeet.make(feet),
    ),
  }),
);
const ResourceCountOutputSchema = ResourceCount.pipe(
  Schema.decodeTo(Schema.Number, {
    decode: SchemaGetter.transform<number, ResourceCount>((count) =>
      Number(count),
    ),
    encode: SchemaGetter.transform<ResourceCount, number>((count) =>
      ResourceCount.make(count),
    ),
  }),
);
const CharacterSheetProjectionRetainRouteSchema = Schema.Struct({
  kind: Schema.Literal("retainCharacterSheetSelectedReferences"),
  subject: Schema.Literal("selectedReferenceProjection"),
  owner: Schema.Literal("selectedReference"),
});
const CharacterSheetFactsProjectionRouteSchema = Schema.Struct({
  kind: Schema.Literal("projectCharacterSheetFacts"),
  subject: Schema.Literal("buildFactsProjection"),
  owner: Schema.Literal("buildProjection"),
});
const CharacterSheetAbilityCheckProjectionRouteSchema = Schema.Struct({
  kind: Schema.Literal("projectCharacterSheetFacts"),
  subject: Schema.Literal("abilityCheckProjection"),
  owner: Schema.Literal("buildProjection"),
});
const CharacterSheetArmorClassProjectionRouteSchema = Schema.Tuple([
  CharacterSheetProjectionRetainRouteSchema,
  Schema.Struct({
    kind: Schema.Literal("projectCharacterSheetFacts"),
    subject: Schema.Literal("armorClassProjection"),
    owner: Schema.Literal("buildProjection"),
  }),
]);
const CharacterSheetWeaponMasteryProjectionRouteSchema = Schema.Tuple([
  CharacterSheetProjectionRetainRouteSchema,
  CharacterSheetFactsProjectionRouteSchema,
]);
const ArmorClassBaseSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("stat_block"),
    ac: ArmorClassSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("ability_sum"),
    base: ArmorClassSchema,
    abilityModifiers: Schema.NonEmptyArray(AbilitySchema),
    source: Schema.Literal("default_unarmored"),
  }),
  Schema.Struct({
    kind: Schema.Literal("ability_sum"),
    base: ArmorClassSchema,
    abilityModifiers: Schema.NonEmptyArray(AbilitySchema),
    source: Schema.Literals([
      "unarmored_defense",
      "class_feature_base_plus_ability",
    ]),
    sourceUnitId: UnitId,
  }),
  Schema.Struct({
    kind: Schema.Literal("ability_sum"),
    base: ArmorClassSchema,
    abilityModifiers: Schema.NonEmptyArray(AbilitySchema),
    source: Schema.Literal("spell_base_plus_ability"),
  }),
  Schema.Struct({
    kind: Schema.Literal("armor"),
    formula: ArmorAcFormulaSchema,
    category: ArmorCategorySchema,
  }),
]);
const ArmorClassBonusSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("flat"),
    bonus: IntegerSchema,
    sourceUnitId: Schema.optionalKey(UnitId),
  }),
  Schema.Struct({
    kind: Schema.Literal("shield"),
    bonus: IntegerSchema,
    handUse: Schema.Literal("shield"),
    trainingRequired: Schema.Literal("shield"),
    sourceUnitId: Schema.optionalKey(UnitId),
  }),
  Schema.Struct({
    kind: Schema.Literal("unarmored_no_shield"),
    bonus: IntegerSchema,
    sourceUnitId: Schema.optionalKey(UnitId),
  }),
  Schema.Struct({
    kind: Schema.Literal("wearing_armor"),
    bonus: IntegerSchema,
    categories: Schema.Array(ArmorCategorySchema),
    sourceUnitId: Schema.optionalKey(UnitId),
  }),
]);
const ArmorClassFloorSchema = Schema.Struct({
  floor: ArmorClassSchema,
  sourceUnitId: Schema.optionalKey(UnitId),
});
const ArmorClassStateSchema = Schema.Struct({
  abilityModifiers: Schema.Struct({
    str: IntegerSchema,
    dex: IntegerSchema,
    con: IntegerSchema,
    int: IntegerSchema,
    wis: IntegerSchema,
    cha: IntegerSchema,
  }),
  base: ArmorClassBaseSchema,
  bonuses: Schema.Array(ArmorClassBonusSchema),
  floors: Schema.Array(ArmorClassFloorSchema),
  armorTraining: Schema.Array(Schema.Literals(ARMOR_TRAINING_CATEGORIES)),
  leftHandUse: Schema.Literals(HAND_USES),
  rightHandUse: Schema.Literals(HAND_USES),
});

const CharacterSheetAbilityCheckAbilityProjectionSchema = Schema.Struct({
  defaultAbility: AbilitySchema,
  optionalSubstitutions: Schema.Array(
    Schema.Struct({
      ability: AbilitySchema,
      sourceUnitId: UnitId,
      requiredActiveFeatureUnitId: Schema.optionalKey(UnitId),
    }),
  ),
});
const CharacterSheetAbilityCheckProficiencyBonusProjectionSchema =
  Schema.Struct({
    proficiencyBonus: Schema.Union([
      Schema.Struct({
        tag: Schema.Literal("none"),
        bonus: Schema.Literal(0),
      }),
      Schema.Struct({
        tag: Schema.Literal("skillProficiency"),
        skill: SkillSchema,
        bonus: Schema.Number,
      }),
      Schema.Struct({
        tag: Schema.Literal("expertise"),
        skill: SkillSchema,
        bonus: Schema.Number,
      }),
      Schema.Struct({
        tag: Schema.Literal("jackOfAllTrades"),
        sourceUnitId: UnitId,
        skill: SkillSchema,
        bonus: Schema.Number,
      }),
    ]),
    qRoute: Schema.Tuple([CharacterSheetAbilityCheckProjectionRouteSchema]),
  });
const CharacterSheetJumpDistanceAbilityProjectionSchema = Schema.Struct({
  defaultAbility: AbilitySchema,
  optionalSubstitutions: Schema.Array(
    Schema.Struct({
      ability: AbilitySchema,
      replaces: AbilitySchema,
      sourceUnitId: UnitId,
    }),
  ),
});
const CharacterSheetLinkedSpeedGrantSchema = Schema.Struct({
  sourceUnitId: UnitId,
  speedKind: Schema.Literals(["fly", "swim", "climb", "burrow"]),
  feet: Schema.Union([
    MovementFeetOutputSchema,
    Schema.Struct({ kind: Schema.Literal("walk_speed") }),
  ]),
});
const CharacterSheetArmorClassProjectionSchema = Schema.Struct({
  state: ArmorClassStateSchema,
  armorClass: ArmorClassSchema,
  qRoute: CharacterSheetArmorClassProjectionRouteSchema,
});
const CharacterSheetSpellAccessProjectionSchema = Schema.Array(
  Schema.Struct({
    source: Schema.Literals(["classFeature", "magicInitiate"]),
    sourceUnitId: UnitId,
    spellId: UnitId,
    spellcastingAbility: AbilitySchema,
    preparation: Schema.Literals(["alwaysPrepared", "learnedCantrip"]),
  }),
);
const CharacterSheetKnownFormsProjectionSchema = Schema.Struct({
  statBlockIds: Schema.Array(StatBlockId),
});
const CharacterSheetWeaponMasteryProjectionSchema = Schema.Struct({
  featureUnitId: UnitId,
  classUnitId: UnitId,
  selectedWeaponUnitIds: Schema.Array(UnitId),
  choiceCount: ResourceCountOutputSchema,
  longRestChangeCount: ResourceCountOutputSchema,
  eligibleWeaponUnitIds: Schema.Array(UnitId),
  qRoute: CharacterSheetWeaponMasteryProjectionRouteSchema,
});
const CharacterSheetSpellbookRitualAccessSpellSchema = Schema.Struct({
  id: UnitId,
  mechanics: Schema.Struct({ level: PositiveIntegerSchema }),
});
const CharacterSheetSpellbookRitualAccessSchema = Schema.Struct({
  tag: Schema.Literal("spellbookRitual"),
  spell: CharacterSheetSpellbookRitualAccessSpellSchema,
  spellcastingSourceUnitId: UnitId,
  featureUnitId: UnitId,
});
const CharacterSheetSpellbookRitualInvocationSchema = Schema.Struct({
  tag: Schema.Literal("spellbookRitual"),
  spellId: UnitId,
  spellLevel: PositiveIntegerSchema,
  spellcastingSourceUnitId: UnitId,
  featureUnitId: UnitId,
  spellSlotCost: Schema.Struct({ kind: Schema.Literal("none") }),
  preparationRequirement: Schema.Literal("not_required"),
  requiredSpellAccess: Schema.Literal("spellbook"),
  additionalCastingTimeMinutes: PositiveIntegerSchema,
  requiresReadingSpellbook: Schema.Literal(true),
});
const CharacterSheetIssueSchema = Schema.Union([
  Schema.Struct({
    tag: Schema.Literal("characterSheetIssue"),
    code: Schema.optionalKey(Schema.Never),
    message: Schema.String,
  }),
  Schema.Struct({
    tag: Schema.Literal("characterSheetIssue"),
    code: Schema.Literal("wildShapeStatBlockCatalogRequired"),
    message: Schema.Literal(WILD_SHAPE_STAT_BLOCK_CATALOG_REQUIRED_MESSAGE),
  }),
]);
const CharacterSheetSpellbookRitualInvocationRetainRouteSchema = Schema.Struct({
  kind: Schema.Literal("retainCharacterSheetSelectedReferences"),
  subject: Schema.Literal("selectedReferenceProjection"),
  owner: Schema.Literal("selectedReference"),
});
const CharacterSheetSpellbookRitualInvocationAcceptedResolveRouteSchema =
  Schema.Struct({
    kind: Schema.Literal("resolveCharacterSheetSubject"),
    subject: Schema.Literal("spellResource"),
    fill: Schema.Literal("projectionSelection"),
    holes: Schema.Tuple([]),
    owner: Schema.Literal("selectedReference"),
  });
const CharacterSheetSpellbookRitualInvocationRejectedResolveRouteSchema =
  Schema.Struct({
    kind: Schema.Literal("resolveCharacterSheetSubject"),
    subject: Schema.Literal("spellResource"),
    fill: Schema.Literal("projectionSelection"),
    holes: Schema.Tuple([Schema.Literal("projectionChoice")]),
    owner: Schema.Literal("selectedReference"),
  });
const CharacterSheetSpellbookRitualInvocationProjectionSchema = Schema.Union([
  Schema.Struct({
    tag: Schema.Literal("accepted"),
    invocation: CharacterSheetSpellbookRitualInvocationSchema,
    qRoute: Schema.Tuple([
      CharacterSheetSpellbookRitualInvocationRetainRouteSchema,
      CharacterSheetSpellbookRitualInvocationAcceptedResolveRouteSchema,
    ]),
  }),
  Schema.Struct({
    tag: Schema.Literal("rejected"),
    issue: CharacterSheetIssueSchema,
    qRoute: Schema.Tuple([
      CharacterSheetSpellbookRitualInvocationRetainRouteSchema,
      CharacterSheetSpellbookRitualInvocationRejectedResolveRouteSchema,
    ]),
  }),
]);
const CharacterSessionQueryProjectionSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("abilityCheckAbility"),
    projection: CharacterSheetAbilityCheckAbilityProjectionSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("abilityCheckProficiencyBonus"),
    projection: CharacterSheetAbilityCheckProficiencyBonusProjectionSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("jumpDistanceAbility"),
    projection: CharacterSheetJumpDistanceAbilityProjectionSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("linkedSpeedGrants"),
    projection: Schema.Array(CharacterSheetLinkedSpeedGrantSchema),
  }),
  Schema.Struct({
    kind: Schema.Literal("armorClass"),
    projection: CharacterSheetArmorClassProjectionSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("spellAccess"),
    projection: CharacterSheetSpellAccessProjectionSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("knownForms"),
    projection: CharacterSheetKnownFormsProjectionSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("weaponMasterySelections"),
    projection: CharacterSheetWeaponMasteryProjectionSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("spellbookRitualAccesses"),
    projection: Schema.Array(CharacterSheetSpellbookRitualAccessSchema),
  }),
  Schema.Struct({
    kind: Schema.Literal("spellbookRitualAccess"),
    projection: CharacterSheetSpellbookRitualAccessSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("spellInvocation"),
    projection: CharacterSheetSpellbookRitualInvocationProjectionSchema,
  }),
]);

export const CharacterSessionQueryOutputSchema = Schema.Struct({
  characterId: CharacterSheetIdSchema,
  query: CharacterSessionQueryProjectionSchema,
  session: McpSessionSummarySchema,
});
export type CharacterSessionQueryOutput = Schema.Schema.Type<
  typeof CharacterSessionQueryOutputSchema
>;
