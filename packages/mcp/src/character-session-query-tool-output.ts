import { Schema } from "effect";

import { McpSessionSummarySchema } from "./session-snapshot-output.ts";

const PositiveIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
);

const CharacterSheetAbilityCheckAbilityProjectionSchema = Schema.Struct({
  defaultAbility: Schema.String,
  optionalSubstitutions: Schema.Array(
    Schema.Struct({
      ability: Schema.String,
      sourceUnitId: Schema.String,
      requiredActiveFeatureUnitId: Schema.optionalWith(Schema.String, {
        exact: true,
      }),
    }),
  ),
});
const CharacterSheetAbilityCheckProficiencyBonusProjectionSchema =
  Schema.Struct({
    proficiencyBonus: Schema.Union(
      Schema.Struct({
        tag: Schema.Literal("none"),
        bonus: Schema.Literal(0),
      }),
      Schema.Struct({
        tag: Schema.Literal("skillProficiency"),
        skill: Schema.String,
        bonus: Schema.Number,
      }),
      Schema.Struct({
        tag: Schema.Literal("expertise"),
        skill: Schema.String,
        bonus: Schema.Number,
      }),
      Schema.Struct({
        tag: Schema.Literal("jackOfAllTrades"),
        sourceUnitId: Schema.String,
        skill: Schema.String,
        bonus: Schema.Number,
      }),
    ),
    qRoute: Schema.Array(Schema.Any),
  });
const CharacterSheetJumpDistanceAbilityProjectionSchema = Schema.Struct({
  defaultAbility: Schema.String,
  optionalSubstitutions: Schema.Array(
    Schema.Struct({
      ability: Schema.String,
      replaces: Schema.String,
      sourceUnitId: Schema.String,
    }),
  ),
});
const CharacterSheetLinkedSpeedGrantSchema = Schema.Struct({
  sourceUnitId: Schema.String,
  speedKind: Schema.Literal("fly", "swim", "climb", "burrow"),
  feet: Schema.Union(
    Schema.Number,
    Schema.Struct({ kind: Schema.Literal("walk_speed") }),
  ),
});
const CharacterSheetArmorClassProjectionSchema = Schema.Struct({
  state: Schema.Struct({
    abilityModifiers: Schema.Record({
      key: Schema.String,
      value: Schema.Number,
    }),
    base: Schema.Any,
    bonuses: Schema.Array(Schema.Any),
    floors: Schema.Array(Schema.Any),
    armorTraining: Schema.Array(Schema.String),
    leftHandUse: Schema.String,
    rightHandUse: Schema.String,
  }),
  armorClass: Schema.Number,
  qRoute: Schema.Array(Schema.Any),
});
const CharacterSheetSpellAccessProjectionSchema = Schema.Array(
  Schema.Struct({
    source: Schema.Literal("classFeature", "magicInitiate"),
    sourceUnitId: Schema.String,
    spellId: Schema.String,
    spellcastingAbility: Schema.String,
    preparation: Schema.Literal("alwaysPrepared", "learnedCantrip"),
  }),
);
const CharacterSheetKnownFormsProjectionSchema = Schema.Struct({
  statBlockIds: Schema.Array(Schema.String),
});
const CharacterSheetWeaponMasteryProjectionSchema = Schema.Struct({
  featureUnitId: Schema.String,
  classUnitId: Schema.String,
  selectedWeaponUnitIds: Schema.Array(Schema.String),
  choiceCount: Schema.Number,
  longRestChangeCount: Schema.Number,
  eligibleWeaponUnitIds: Schema.Array(Schema.String),
  qRoute: Schema.Array(Schema.Any),
});
const CharacterSheetSpellbookRitualInvocationSchema = Schema.Struct({
  tag: Schema.Literal("spellbookRitual"),
  spellId: Schema.String,
  spellLevel: PositiveIntegerSchema,
  spellcastingSourceUnitId: Schema.String,
  featureUnitId: Schema.String,
  spellSlotCost: Schema.Struct({ kind: Schema.Literal("none") }),
  preparationRequirement: Schema.Literal("not_required"),
  requiredSpellAccess: Schema.Literal("spellbook"),
  additionalCastingTimeMinutes: PositiveIntegerSchema,
  requiresReadingSpellbook: Schema.Literal(true),
});
const CharacterSheetIssueSchema = Schema.Struct({
  tag: Schema.Literal("characterSheetIssue"),
  message: Schema.String,
});
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
    holes: Schema.Tuple(),
    owner: Schema.Literal("selectedReference"),
  });
const CharacterSheetSpellbookRitualInvocationRejectedResolveRouteSchema =
  Schema.Struct({
    kind: Schema.Literal("resolveCharacterSheetSubject"),
    subject: Schema.Literal("spellResource"),
    fill: Schema.Literal("projectionSelection"),
    holes: Schema.Tuple(Schema.Literal("projectionChoice")),
    owner: Schema.Literal("selectedReference"),
  });
const CharacterSheetSpellbookRitualInvocationProjectionSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("accepted"),
    invocation: CharacterSheetSpellbookRitualInvocationSchema,
    qRoute: Schema.Tuple(
      CharacterSheetSpellbookRitualInvocationRetainRouteSchema,
      CharacterSheetSpellbookRitualInvocationAcceptedResolveRouteSchema,
    ),
  }),
  Schema.Struct({
    tag: Schema.Literal("rejected"),
    issue: CharacterSheetIssueSchema,
    qRoute: Schema.Tuple(
      CharacterSheetSpellbookRitualInvocationRetainRouteSchema,
      CharacterSheetSpellbookRitualInvocationRejectedResolveRouteSchema,
    ),
  }),
);
const CharacterSessionQueryProjectionSchema = Schema.Union(
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
    projection: Schema.Array(Schema.Any),
  }),
  Schema.Struct({
    kind: Schema.Literal("spellbookRitualAccess"),
    projection: Schema.Any,
  }),
  Schema.Struct({
    kind: Schema.Literal("spellInvocation"),
    projection: CharacterSheetSpellbookRitualInvocationProjectionSchema,
  }),
);

export const CharacterSessionQueryOutputSchema = Schema.Struct({
  characterId: Schema.String,
  query: CharacterSessionQueryProjectionSchema,
  session: McpSessionSummarySchema,
});
export type CharacterSessionQueryOutput = Schema.Schema.Type<
  typeof CharacterSessionQueryOutputSchema
>;
