import { Match } from "effect";

import {
  readBackgroundCreationFacts,
  readClassCreationFacts,
  readSpeciesCreationFacts,
  readSubclassCreationFacts,
  type BackgroundCreationFacts,
  type ClassCreationFacts,
  type SpeciesCreationFacts,
  type SubclassCreationFacts,
  type UnitReaderResult,
} from "@dnd/surface/surface/character-creation-readers";
import type { UnitRecord } from "@dnd/surface/surface/types";

/**
 * The Character Definition roots have different authored shapes, but they
 * share one creation-domain projection boundary. The root tag describes the
 * parsed Surface shape; it is not an authored identity or a support status.
 */
export type CharacterDefinitionProjection =
  | {
      readonly kind: "class";
      readonly facts: Omit<ClassCreationFacts, "recordId">;
    }
  | {
      readonly kind: "subclass";
      readonly facts: Omit<SubclassCreationFacts, "recordId">;
    }
  | {
      readonly kind: "background";
      readonly facts: Omit<BackgroundCreationFacts, "recordId">;
    }
  | {
      readonly kind: "species";
      readonly facts: Omit<SpeciesCreationFacts, "recordId">;
    };

/**
 * Project one already-decoded Character Definition Unit without consulting a
 * build, actor, session, target, resource, turn, or battle state.
 *
 * The Surface readers remain the single parser for each creation shape. This
 * function only tags their narrowed facts with the corresponding domain root;
 * it does not re-recognize authored mechanics or maintain another fact store.
 */
export function projectCharacterDefinition(
  unit: UnitRecord,
): UnitReaderResult<CharacterDefinitionProjection> {
  return Match.value(unit.kind).pipe(
    Match.when("class", () =>
      mapReadable(readClassCreationFacts(unit), (facts) => ({
        kind: "class" as const,
        facts: withoutRecordId(facts),
      })),
    ),
    Match.when("subclass", () =>
      mapReadable(readSubclassCreationFacts(unit), (facts) => ({
        kind: "subclass" as const,
        facts: withoutRecordId(facts),
      })),
    ),
    Match.when("background", () =>
      mapReadable(readBackgroundCreationFacts(unit), (facts) => ({
        kind: "background" as const,
        facts: withoutRecordId(facts),
      })),
    ),
    Match.when("species", () =>
      mapReadable(readSpeciesCreationFacts(unit), (facts) => ({
        kind: "species" as const,
        facts: withoutRecordId(facts),
      })),
    ),
    Match.when("spell", () => unsupportedCharacterDefinitionUnit(unit)),
    Match.when("class_feature", () => unsupportedCharacterDefinitionUnit(unit)),
    Match.when("mastery", () => unsupportedCharacterDefinitionUnit(unit)),
    Match.when("feat", () => unsupportedCharacterDefinitionUnit(unit)),
    Match.when("species_trait", () => unsupportedCharacterDefinitionUnit(unit)),
    Match.when("magic_item", () => unsupportedCharacterDefinitionUnit(unit)),
    Match.when("armor", () => unsupportedCharacterDefinitionUnit(unit)),
    Match.when("armor_template", () =>
      unsupportedCharacterDefinitionUnit(unit),
    ),
    Match.when("shield", () => unsupportedCharacterDefinitionUnit(unit)),
    Match.when("shield_template", () =>
      unsupportedCharacterDefinitionUnit(unit),
    ),
    Match.when("weapon_template", () =>
      unsupportedCharacterDefinitionUnit(unit),
    ),
    Match.when("weapon", () => unsupportedCharacterDefinitionUnit(unit)),
    Match.exhaustive,
  );
}

function unsupportedCharacterDefinitionUnit(
  unit: UnitRecord,
): UnitReaderResult<never> {
  return {
    tag: "unreadable",
    issues: [
      {
        code: "unsupportedUnitKind",
        message: `Expected a Character Definition root, received ${unit.kind}.`,
        unitId: unit.id,
      },
    ],
  };
}

function mapReadable<T, U>(
  result: UnitReaderResult<T>,
  map: (value: T) => U,
): UnitReaderResult<U> {
  return result.tag === "readable"
    ? { tag: "readable", value: map(result.value) }
    : result;
}

function withoutRecordId<Fact extends { readonly recordId: string }>(
  facts: Fact,
): Omit<Fact, "recordId"> {
  const { recordId: _recordId, ...mechanics } = facts;
  return mechanics;
}
