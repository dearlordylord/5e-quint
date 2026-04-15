import { Schema } from "effect";

import { CHARACTER_BACKGROUNDS } from "#/character-ability-scores.ts";
import {
  ALIGNMENTS,
  CHARACTER_LANGUAGES,
  CHARACTER_SPECIES,
} from "#/character-domain-model.ts";
import {
  CHARACTER_ARMORS,
  CHARACTER_BACKGROUND_EQUIPMENT_OPTIONS,
  CHARACTER_CLASS_EQUIPMENT_OPTIONS,
  CHARACTER_COMBAT_EQUIPMENT_ITEMS,
  CHARACTER_WEAPONS,
} from "#/character-equipment-data.ts";
import { WEAPON_GRIPS } from "#/character-equipment.ts";
import {
  ARTISAN_TOOLS,
  CHARACTER_RARE_LANGUAGES,
  CHARACTER_TOOL_PROFICIENCIES,
  CLERIC_DIVINE_ORDERS,
  DRUID_PRIMAL_ORDERS,
  GAMING_SETS,
  MUSICAL_INSTRUMENTS,
  PALADIN_FIGHTING_STYLE_CHOICES,
  RANGER_FIGHTING_STYLE_CHOICES,
  SRD_SUBCLASSES,
} from "#/character-feature-types.ts";
import { FIGHTING_STYLES } from "#/features/class-fighter.ts";
import { CLASS_NAMES } from "#/features/class-tables.ts";
import { SKILLS } from "#/monster-types.ts";
import { ABILITIES } from "#/types.ts";

function literalSchema<const Values extends readonly [string, ...string[]]>(
  values: Values,
) {
  return Schema.Literal(...values);
}

const IntSchema = Schema.Number.pipe(Schema.int());
const NonNegativeIntSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
);

const AbilitySchema = literalSchema(ABILITIES);
const AlignmentSchema = literalSchema(ALIGNMENTS);
const ArtisanToolSchema = literalSchema(ARTISAN_TOOLS);
const BackgroundSchema = literalSchema(CHARACTER_BACKGROUNDS);
const CharacterArmorSchema = literalSchema(CHARACTER_ARMORS);
const CharacterBackgroundEquipmentOptionSchema = literalSchema(
  CHARACTER_BACKGROUND_EQUIPMENT_OPTIONS,
);
const CharacterClassEquipmentOptionSchema = literalSchema(
  CHARACTER_CLASS_EQUIPMENT_OPTIONS,
);
const CharacterCombatEquipmentItemSchema = literalSchema(
  CHARACTER_COMBAT_EQUIPMENT_ITEMS,
);
const CharacterLanguageSchema = literalSchema(CHARACTER_LANGUAGES);
const CharacterRareLanguageSchema = literalSchema(CHARACTER_RARE_LANGUAGES);
const CharacterSpeciesSchema = literalSchema(CHARACTER_SPECIES);
const CharacterWeaponGripSchema = literalSchema(WEAPON_GRIPS);
const CharacterWeaponSchema = literalSchema(CHARACTER_WEAPONS);
const ClassNameSchema = literalSchema(CLASS_NAMES);
const ClericDivineOrderSchema = literalSchema(CLERIC_DIVINE_ORDERS);
const DruidPrimalOrderSchema = literalSchema(DRUID_PRIMAL_ORDERS);
const FightingStyleSchema = literalSchema(FIGHTING_STYLES);
const GamingSetSchema = literalSchema(GAMING_SETS);
const MusicalInstrumentSchema = literalSchema(MUSICAL_INSTRUMENTS);
const PaladinFightingStyleChoiceSchema = literalSchema(
  PALADIN_FIGHTING_STYLE_CHOICES,
);
const RangerFightingStyleChoiceSchema = literalSchema(
  RANGER_FIGHTING_STYLE_CHOICES,
);
const SkillSchema = literalSchema(SKILLS);
const CharacterToolProficiencySchema = literalSchema(
  CHARACTER_TOOL_PROFICIENCIES,
);

const CharacterGrantedLanguageSchema = Schema.Union(
  CharacterLanguageSchema,
  CharacterRareLanguageSchema,
);

const CharacterDraftAbilityScoresSchema = Schema.Struct({
  str: Schema.optional(IntSchema),
  dex: Schema.optional(IntSchema),
  con: Schema.optional(IntSchema),
  int: Schema.optional(IntSchema),
  wis: Schema.optional(IntSchema),
  cha: Schema.optional(IntSchema),
});

const CharacterAbilityScoreGenerationDraftSchema = Schema.Union(
  Schema.Struct({
    mode: Schema.Literal("standardArray"),
    assignedScores: CharacterDraftAbilityScoresSchema,
  }),
  Schema.Struct({
    mode: Schema.Literal("randomGeneration"),
    assignedScores: CharacterDraftAbilityScoresSchema,
  }),
  Schema.Struct({
    mode: Schema.Literal("pointBuy"),
    assignedScores: CharacterDraftAbilityScoresSchema,
  }),
);

const BackgroundAbilityScoreIncreaseSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("plusTwoPlusOne"),
    plusTwo: AbilitySchema,
    plusOne: AbilitySchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("plusOneToThree"),
  }),
);

const CharacterOriginFeatSelectionSchema = Schema.Union(
  Schema.Struct({
    feat: Schema.Literal("skilled"),
    proficiencies: Schema.Array(
      Schema.Union(SkillSchema, CharacterToolProficiencySchema),
    ),
  }),
  Schema.Struct({
    feat: Schema.Literal(
      "magicInitiateCleric",
      "magicInitiateDruid",
      "magicInitiateWizard",
    ),
  }),
  Schema.Struct({
    feat: Schema.Literal("alert", "savageAttacker"),
  }),
);

const CharacterAdvancementChoiceSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("abilityScoreImprovement"),
    abilities: Schema.Union(
      Schema.Tuple(AbilitySchema),
      Schema.Tuple(AbilitySchema, AbilitySchema),
    ),
  }),
  Schema.Struct({
    tag: Schema.Literal("feat"),
    featId: Schema.String,
    abilityScoreIncrease: Schema.optional(AbilitySchema),
    proficiencies: Schema.optional(
      Schema.Array(Schema.Union(SkillSchema, CharacterToolProficiencySchema)),
    ),
  }),
  Schema.Struct({
    tag: Schema.Literal("epicBoon"),
    featId: Schema.String,
    abilityScoreIncrease: Schema.optional(AbilitySchema),
    proficiencies: Schema.optional(
      Schema.Array(Schema.Union(SkillSchema, CharacterToolProficiencySchema)),
    ),
  }),
);

const CharacterAdvancementFeatSelectionSchema = Schema.Struct({
  slot: Schema.Literal("feat", "epicBoon"),
  choice: CharacterAdvancementChoiceSchema,
});

const CharacterSubclassSelectionSchema = Schema.Union(
  Schema.Struct({
    className: Schema.Literal("barbarian"),
    subclass: Schema.Literal(...SRD_SUBCLASSES.barbarian),
  }),
  Schema.Struct({
    className: Schema.Literal("bard"),
    subclass: Schema.Literal(...SRD_SUBCLASSES.bard),
  }),
  Schema.Struct({
    className: Schema.Literal("cleric"),
    subclass: Schema.Literal(...SRD_SUBCLASSES.cleric),
  }),
  Schema.Struct({
    className: Schema.Literal("druid"),
    subclass: Schema.Literal(...SRD_SUBCLASSES.druid),
  }),
  Schema.Struct({
    className: Schema.Literal("fighter"),
    subclass: Schema.Literal(...SRD_SUBCLASSES.fighter),
  }),
  Schema.Struct({
    className: Schema.Literal("monk"),
    subclass: Schema.Literal(...SRD_SUBCLASSES.monk),
  }),
  Schema.Struct({
    className: Schema.Literal("paladin"),
    subclass: Schema.Literal(...SRD_SUBCLASSES.paladin),
  }),
  Schema.Struct({
    className: Schema.Literal("ranger"),
    subclass: Schema.Literal(...SRD_SUBCLASSES.ranger),
  }),
  Schema.Struct({
    className: Schema.Literal("rogue"),
    subclass: Schema.Literal(...SRD_SUBCLASSES.rogue),
  }),
  Schema.Struct({
    className: Schema.Literal("sorcerer"),
    subclass: Schema.Literal(...SRD_SUBCLASSES.sorcerer),
  }),
  Schema.Struct({
    className: Schema.Literal("warlock"),
    subclass: Schema.Literal(...SRD_SUBCLASSES.warlock),
  }),
  Schema.Struct({
    className: Schema.Literal("wizard"),
    subclass: Schema.Literal(...SRD_SUBCLASSES.wizard),
  }),
);

const CharacterAdvancementEntrySchema = Schema.Struct({
  className: ClassNameSchema,
  subclass: Schema.optional(CharacterSubclassSelectionSchema),
  feat: Schema.optional(CharacterAdvancementFeatSelectionSchema),
});

const CharacterBuildChoicesSchema = Schema.Struct({
  primaryClassSkills: Schema.optional(Schema.Array(SkillSchema)),
  multiclassSkills: Schema.optional(
    Schema.Struct({
      bard: Schema.optional(Schema.Array(SkillSchema)),
      ranger: Schema.optional(Schema.Array(SkillSchema)),
      rogue: Schema.optional(Schema.Array(SkillSchema)),
    }),
  ),
  backgroundTool: Schema.optional(GamingSetSchema),
  bardInstruments: Schema.optional(Schema.Array(MusicalInstrumentSchema)),
  multiclassBardInstrument: Schema.optional(MusicalInstrumentSchema),
  monkTool: Schema.optional(
    Schema.Union(ArtisanToolSchema, MusicalInstrumentSchema),
  ),
  speciesSkill: Schema.optional(SkillSchema),
  humanOriginFeat: Schema.optional(CharacterOriginFeatSelectionSchema),
  rogueLanguage: Schema.optional(CharacterGrantedLanguageSchema),
  rangerDeftExplorerLanguages: Schema.optional(
    Schema.Array(CharacterGrantedLanguageSchema),
  ),
  clericDivineOrder: Schema.optional(ClericDivineOrderSchema),
  druidPrimalOrder: Schema.optional(DruidPrimalOrderSchema),
  fighterFightingStyle: Schema.optional(FightingStyleSchema),
  championAdditionalFightingStyle: Schema.optional(FightingStyleSchema),
  paladinFightingStyle: Schema.optional(PaladinFightingStyleChoiceSchema),
  rangerFightingStyle: Schema.optional(RangerFightingStyleChoiceSchema),
  expertiseSkills: Schema.optional(Schema.Array(SkillSchema)),
});

const CharacterLoadoutSchema = Schema.Struct({
  wornArmor: Schema.optional(CharacterArmorSchema),
  wieldedWeapon: Schema.optional(CharacterWeaponSchema),
  secondaryWeapon: Schema.optional(CharacterWeaponSchema),
  shield: Schema.optional(Schema.Boolean),
  wieldedWeaponGrip: Schema.optional(CharacterWeaponGripSchema),
});

const CharacterEquipmentChoicesDraftSchema = Schema.Struct({
  backgroundOption: Schema.optional(CharacterBackgroundEquipmentOptionSchema),
  classOption: Schema.optional(CharacterClassEquipmentOptionSchema),
  purchasedCombatEquipment: Schema.optional(
    Schema.Array(CharacterCombatEquipmentItemSchema),
  ),
  remainingGoldPieces: Schema.optional(NonNegativeIntSchema),
  loadout: Schema.optional(CharacterLoadoutSchema),
});

const CharacterSpellcastingEntrySchema = Schema.Struct({
  cantrips: Schema.optional(Schema.Array(Schema.String)),
  preparedSpells: Schema.optional(Schema.Array(Schema.String)),
  spellbook: Schema.optional(Schema.Array(Schema.String)),
});

const CharacterSpellcastingChoicesSchema = Schema.Struct({
  bard: Schema.optional(CharacterSpellcastingEntrySchema),
  cleric: Schema.optional(CharacterSpellcastingEntrySchema),
  druid: Schema.optional(CharacterSpellcastingEntrySchema),
  paladin: Schema.optional(CharacterSpellcastingEntrySchema),
  ranger: Schema.optional(CharacterSpellcastingEntrySchema),
  sorcerer: Schema.optional(CharacterSpellcastingEntrySchema),
  warlock: Schema.optional(CharacterSpellcastingEntrySchema),
  wizard: Schema.optional(CharacterSpellcastingEntrySchema),
});

const CharacterDraftClassLevelsSchema = Schema.Struct({
  barbarian: Schema.optional(NonNegativeIntSchema),
  bard: Schema.optional(NonNegativeIntSchema),
  cleric: Schema.optional(NonNegativeIntSchema),
  druid: Schema.optional(NonNegativeIntSchema),
  fighter: Schema.optional(NonNegativeIntSchema),
  monk: Schema.optional(NonNegativeIntSchema),
  paladin: Schema.optional(NonNegativeIntSchema),
  ranger: Schema.optional(NonNegativeIntSchema),
  rogue: Schema.optional(NonNegativeIntSchema),
  sorcerer: Schema.optional(NonNegativeIntSchema),
  warlock: Schema.optional(NonNegativeIntSchema),
  wizard: Schema.optional(NonNegativeIntSchema),
});

export const CharacterDraftSchema = Schema.Struct({
  primaryClass: Schema.optional(ClassNameSchema),
  classLevels: Schema.optional(CharacterDraftClassLevelsSchema),
  advancement: Schema.optional(Schema.Array(CharacterAdvancementEntrySchema)),
  background: Schema.optional(BackgroundSchema),
  abilityScoreGeneration: Schema.optional(
    CharacterAbilityScoreGenerationDraftSchema,
  ),
  backgroundAbilityScoreIncrease: Schema.optional(
    BackgroundAbilityScoreIncreaseSchema,
  ),
  species: Schema.optional(CharacterSpeciesSchema),
  languages: Schema.optional(Schema.Array(CharacterLanguageSchema)),
  alignment: Schema.optional(AlignmentSchema),
  choices: Schema.optional(CharacterBuildChoicesSchema),
  equipment: Schema.optional(CharacterEquipmentChoicesDraftSchema),
  spellcasting: Schema.optional(CharacterSpellcastingChoicesSchema),
});

export const CharacterLevelUpTransitionSchema = Schema.Struct({
  entry: CharacterAdvancementEntrySchema,
  choices: Schema.optional(CharacterBuildChoicesSchema),
  spellcasting: Schema.optional(CharacterSpellcastingChoicesSchema),
});

export const strictCharacterParseOptions = {
  onExcessProperty: "error",
} as const;
