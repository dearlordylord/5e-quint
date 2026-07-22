import type {
  BattleFill,
  BattleTargetSpatialFact,
} from "./battle-state-execution.ts";
import type {
  BattleAreaId,
  BattleSpellEffectOccurrenceId,
  BattleTablePositionId,
  CombatantId,
} from "./identity.ts";

export const GLYPH_STORED_SPELL_TARGET_SHAPES = [
  "singleCreature",
  "area",
] as const;
export const GLYPH_OF_WARDING_BASE_LEVEL = 3;
export const GLYPH_STORED_SPELL_HOSTILE_PLACEMENT_SUBJECTS = [
  "summoned_hostile_creatures",
  "harmful_objects",
  "traps",
] as const;

export type GlyphStoredSpellReleaseProfile = {
  readonly kind: "glyphStoredSpellReleaseProfile";
  readonly storage: {
    readonly spellAccess: "prepared_spell";
    readonly castAsPartOfCreatingGlyph: true;
    readonly immediateEffect: "none";
    readonly baseMaxStoredSpellLevel: typeof GLYPH_OF_WARDING_BASE_LEVEL;
    readonly upcastMaxStoredSpellLevel: "same_as_cast_slot_level";
    readonly targetShapes: typeof GLYPH_STORED_SPELL_TARGET_SHAPES;
  };
  readonly release: {
    readonly when: "glyph_triggered";
    readonly retargeting: {
      readonly singleCreatureSpellTarget: "triggering_creature";
      readonly areaSpellOrigin: "centered_on_triggering_creature";
    };
    readonly hostilePlacement: {
      readonly appliesTo: typeof GLYPH_STORED_SPELL_HOSTILE_PLACEMENT_SUBJECTS;
      readonly placement: "as_close_as_possible_to_triggering_creature";
      readonly attackTarget: "triggering_creature";
    };
    readonly concentration: {
      readonly ifStoredSpellRequiresConcentration: "lasts_full_duration";
      readonly owner: "duration";
    };
  };
};

export type GlyphTriggerOccurrenceWitness = {
  readonly kind: "tableWitnessedGlyphTriggerOccurrence";
  readonly sourceEffectId: BattleSpellEffectOccurrenceId;
};
export type GlyphStoredSpellSingleCreatureRetargetingWitness = {
  readonly kind: "storedSpellTargetsTriggeringCreature";
  readonly targetId: CombatantId;
  readonly targetSpatialFacts: readonly BattleTargetSpatialFact[];
};
export type GlyphStoredSpellAreaCenteringWitness = {
  readonly kind: "storedSpellAreaCenteredOnTriggeringCreature";
  readonly originAnchorId: CombatantId;
};
export type GlyphStoredSpellReleaseTargetingWitness =
  | GlyphStoredSpellSingleCreatureRetargetingWitness
  | GlyphStoredSpellAreaCenteringWitness;
export type GlyphStoredSpellHostilePlacementWitness =
  | { readonly kind: "storedSpellHostilePlacementNotApplicable" }
  | {
      readonly kind: "storedSpellHostilePlacement";
      readonly subject: "traps";
      readonly areaId: BattleAreaId;
      readonly placement: "as_close_as_possible_to_triggering_creature";
      readonly attackTargetId: CombatantId;
    }
  | {
      readonly kind: "storedSpellHostilePlacement";
      readonly subject: "harmful_objects";
      readonly positionId: BattleTablePositionId;
      readonly placement: "as_close_as_possible_to_triggering_creature";
      readonly attackTargetId: CombatantId;
    };
export type GlyphStoredSpellReleaseWitness = {
  readonly kind: "tableWitnessedGlyphStoredSpellRelease";
  readonly triggerOccurrence: GlyphTriggerOccurrenceWitness;
  readonly triggeringCreatureId: CombatantId;
  readonly targeting: GlyphStoredSpellReleaseTargetingWitness;
  readonly hostilePlacement: GlyphStoredSpellHostilePlacementWitness;
  readonly fills: readonly BattleFill[];
};
