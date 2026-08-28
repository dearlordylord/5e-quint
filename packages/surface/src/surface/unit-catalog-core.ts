// KERNEL-COVERAGE: runtime-owner SHEET.ARMOR_CLASS.BASE_FORMULA_CHOICE
import { Option } from "effect";
import { UnitId as UnitIdSchema } from "@dnd/shared/game-facts";
import type {
  SpellcastingClassRecord,
  Provenance,
  SrdProvenance,
  SrdUnitRecord,
  StartingEquipmentChoice,
  UnitRecord,
} from "./types.ts";

export type Srd521CollectionProvenance = Pick<SrdProvenance, "kind">;

export type UnitId = UnitRecord["id"];

export type Srd521Provenance = SrdProvenance;

export type Srd521Unit = SrdUnitRecord;

export type SrdUnitCollection = {
  readonly kind: "srdUnitCollection";
  readonly provenance: Srd521CollectionProvenance;
  readonly units: readonly Srd521Unit[];
};

export type UnitCatalog = {
  readonly getUnit: (id: string) => Option.Option<UnitRecord>;
  readonly listUnits: () => readonly UnitRecord[];
  readonly requireUnit: (id: string) => UnitRecord;
};

export type ClassSpellListName = SpellcastingClassRecord["className"];

export type ClassSpellList = {
  readonly cantrips: readonly UnitId[];
  readonly leveled: readonly {
    readonly spellId: UnitId;
    readonly spellLevel: number;
  }[];
};

function isSpellcastingClassRecord(
  unit: UnitRecord,
): unit is SpellcastingClassRecord {
  return unit.kind === "class" && unit.spellcasting !== undefined;
}

function classSpellListFromRecord(
  classRecord: SpellcastingClassRecord,
): ClassSpellList {
  const spellcasting = classRecord.spellcasting;
  const leveled =
    spellcasting.kind === "wizard_spellcasting_creation"
      ? spellcasting.spellbookAccess.spells
      : spellcasting.preparedAccess.spells;

  return {
    cantrips:
      spellcasting.cantripAccess?.spellIds.map((id) => UnitIdSchema.make(id)) ??
      [],
    leveled: leveled.map((spell) => ({
      ...spell,
      spellId: UnitIdSchema.make(spell.spellId),
    })),
  };
}

export function classSpellListForSpellcastingClassRecord(
  classRecord: SpellcastingClassRecord,
): ClassSpellList {
  return classSpellListFromRecord(classRecord);
}

export function spellcastingClassRecordForClassName(input: {
  readonly unitLibrary: UnitCatalog;
  readonly className: string;
}): SpellcastingClassRecord | undefined {
  return input.unitLibrary
    .listUnits()
    .find(
      (unit): unit is SpellcastingClassRecord =>
        isSpellcastingClassRecord(unit) && unit.className === input.className,
    );
}

export function classSpellListForClassName(input: {
  readonly unitLibrary: UnitCatalog;
  readonly className: string;
}): ClassSpellList | undefined {
  const classRecord = spellcastingClassRecordForClassName(input);
  return classRecord === undefined || !isSpellcastingClassRecord(classRecord)
    ? undefined
    : classSpellListFromRecord(classRecord);
}

export function classSpellListPreparedSpellLevel(input: {
  readonly unitLibrary: UnitCatalog;
  readonly className: string;
  readonly spellId: UnitId;
}): number | undefined {
  return classSpellListForClassName(input)?.leveled.find(
    (spell) => spell.spellId === input.spellId,
  )?.spellLevel;
}

export function allCantripsFromClassSpellList(input: {
  readonly unitLibrary: UnitCatalog;
  readonly className: string;
  readonly spellIds: readonly UnitId[];
}): boolean {
  const cantrips = new Set(classSpellListForClassName(input)?.cantrips ?? []);
  return input.spellIds.every((spellId) => cantrips.has(spellId));
}

export function allCantripsFromAnyClassSpellList(input: {
  readonly unitLibrary: UnitCatalog;
  readonly spellIds: readonly UnitId[];
}): boolean {
  return input.spellIds.every((spellId) =>
    input.unitLibrary
      .listUnits()
      .filter(isSpellcastingClassRecord)
      .some((classRecord) =>
        allCantripsFromClassSpellList({
          className: classRecord.className,
          spellIds: [spellId],
          unitLibrary: input.unitLibrary,
        }),
      ),
  );
}

export function allLeveledSpellsFromAnyClassSpellList(input: {
  readonly unitLibrary: UnitCatalog;
  readonly spells: readonly {
    readonly spellId: UnitId;
    readonly spellLevel: number;
  }[];
}): boolean {
  return input.spells.every((spell) =>
    input.unitLibrary
      .listUnits()
      .filter(isSpellcastingClassRecord)
      .some(
        (classRecord) =>
          classSpellListPreparedSpellLevel({
            className: classRecord.className,
            spellId: spell.spellId,
            unitLibrary: input.unitLibrary,
          }) === spell.spellLevel,
      ),
  );
}

export type UnitCatalogBuildIssue =
  | {
      readonly code: "duplicateUnitId";
      readonly unitId: UnitId;
    }
  | {
      readonly code: "duplicateSpellcastingClassName";
      readonly className: SpellcastingClassRecord["className"];
      readonly unitIds: readonly [UnitId, UnitId];
    }
  | {
      readonly code: "mixedProvenance";
      readonly collectionKind: SrdUnitCollection["kind"];
      readonly expected: Srd521CollectionProvenance;
      readonly actual: Provenance;
      readonly unitId: UnitId;
    }
  | {
      readonly code: "unknownUnitReference";
      readonly referringUnitId: UnitId;
      readonly referencedUnitId: UnitId;
    }
  | {
      readonly code: "invalidSubclassChoiceReference";
      readonly classUnitId: UnitId;
      readonly subclassUnitId: UnitId;
      readonly expectedClassName: string;
      readonly actualKind: UnitRecord["kind"];
      readonly actualClassName?: string;
    }
  | {
      readonly code: "invalidSpeciesTraitReference";
      readonly speciesUnitId: UnitId;
      readonly traitUnitId: UnitId;
      readonly expectedSpecies: string;
      readonly actualKind: UnitRecord["kind"];
      readonly actualSpecies?: string;
    };

export type UnitCatalogBuildResult =
  | { readonly tag: "ok"; readonly catalog: UnitCatalog }
  | {
      readonly tag: "invalid";
      readonly issues: readonly UnitCatalogBuildIssue[];
    };

export function isSrd521Provenance(
  value: Provenance,
): value is Srd521Provenance {
  return value.kind === "srd-5.2.1";
}

export function isSrd521Unit(unit: UnitRecord): unit is Srd521Unit {
  return isSrd521Provenance(unit.provenance);
}

export function assertSrd521Unit(unit: UnitRecord): Srd521Unit {
  /* v8 ignore start -- @preserve -- callers must establish SRD provenance before invoking this assertion; a non-SRD Unit violates that internal precondition */
  if (!isSrd521Unit(unit)) {
    throw new Error(`Unit is not SRD 5.2.1: ${unit.id}`);
  }
  /* v8 ignore stop -- @preserve */

  return unit;
}

export function defineSrdUnitCollection(input: {
  readonly units: readonly Srd521Unit[];
}): SrdUnitCollection {
  const collection = {
    kind: "srdUnitCollection",
    provenance: { kind: "srd-5.2.1" },
    units: input.units,
  } as const satisfies SrdUnitCollection;
  const provenanceIssues = validateSrdUnitCollection(collection);

  if (provenanceIssues.length > 0) {
    throw new Error("SRD Unit collection contains non-SRD provenance");
  }

  return collection;
}

export function buildUnitCatalog(input: {
  readonly collections: readonly SrdUnitCollection[];
}): UnitCatalogBuildResult {
  const issues: UnitCatalogBuildIssue[] = [];
  const records = new Map<UnitId, UnitRecord>();
  const spellcastingClassOwners = new Map<
    SpellcastingClassRecord["className"],
    UnitId
  >();

  for (const collection of input.collections) {
    issues.push(...validateSrdUnitCollection(collection));

    for (const unit of collection.units) {
      if (records.has(unit.id)) {
        issues.push({
          code: "duplicateUnitId",
          unitId: unit.id,
        });
      } else {
        records.set(unit.id, unit);
        if (isSpellcastingClassRecord(unit)) {
          const existingUnitId = spellcastingClassOwners.get(unit.className);
          if (existingUnitId === undefined) {
            spellcastingClassOwners.set(unit.className, unit.id);
          } else {
            issues.push({
              code: "duplicateSpellcastingClassName",
              className: unit.className,
              unitIds: [existingUnitId, unit.id],
            });
          }
        }
      }
    }
  }

  for (const collection of input.collections) {
    for (const unit of collection.units) {
      issues.push(...findUnknownStartingEquipmentRefs(unit, records));
      issues.push(...findInvalidSubclassChoiceRefs(unit, records));
      issues.push(...findInvalidSpeciesTraitRefs(unit, records));
    }
  }
  // Class feature grant refs are intentionally not catalog-validated yet:
  // this first vertical slice can load partial class progressions while
  // unimplemented higher-level feature Units are still absent. Consumers that
  // need a granted feature Unit dereference it at the point of use. Once the
  // catalog has an explicit supported-level horizon, validate all grant refs
  // inside that horizon here.

  if (issues.length > 0) {
    return { tag: "invalid", issues };
  }

  return {
    tag: "ok",
    catalog: {
      getUnit: (id) => Option.fromNullable(records.get(UnitIdSchema.make(id))),
      listUnits: () => Array.from(records.values()),
      requireUnit: (id) => records.get(UnitIdSchema.make(id))!,
    },
  };
}

function findInvalidSpeciesTraitRefs(
  unit: UnitRecord,
  records: ReadonlyMap<UnitId, UnitRecord>,
): readonly UnitCatalogBuildIssue[] {
  if (unit.kind !== "species") {
    return [];
  }

  const issues: UnitCatalogBuildIssue[] = [];
  for (const rawTraitUnitId of Object.values(unit.traits)) {
    const traitUnitId = UnitIdSchema.make(rawTraitUnitId);
    const referenced = records.get(traitUnitId);
    if (referenced == null) {
      issues.push({
        code: "unknownUnitReference",
        referringUnitId: unit.id,
        referencedUnitId: traitUnitId,
      });
      continue;
    }
    if (
      referenced.kind === "species_trait" &&
      referenced.species === unit.species
    ) {
      continue;
    }

    issues.push({
      code: "invalidSpeciesTraitReference",
      speciesUnitId: unit.id,
      traitUnitId,
      expectedSpecies: unit.species,
      actualKind: referenced.kind,
      /* v8 ignore next -- @preserve -- only malformed species-trait catalog composition reaches this diagnostic projection */
      ...("species" in referenced ? { actualSpecies: referenced.species } : {}),
    });
  }

  return issues;
}

function findUnknownStartingEquipmentRefs(
  unit: UnitRecord,
  records: ReadonlyMap<UnitId, UnitRecord>,
): readonly UnitCatalogBuildIssue[] {
  if (!hasStartingEquipment(unit)) {
    return [];
  }

  return unit.startingEquipment.flatMap((choice) =>
    choice.kind === "item_bundle"
      ? choice.items.flatMap((item) =>
          item.kind === "unit_ref" && !records.has(item.unitId)
            ? [
                {
                  code: "unknownUnitReference",
                  referringUnitId: unit.id,
                  referencedUnitId: item.unitId,
                } satisfies UnitCatalogBuildIssue,
              ]
            : [],
        )
      : [],
  );
}

function hasStartingEquipment(unit: UnitRecord): unit is UnitRecord & {
  readonly startingEquipment: readonly StartingEquipmentChoice[];
} {
  return unit.kind === "class" || unit.kind === "background";
}

function findInvalidSubclassChoiceRefs(
  unit: UnitRecord,
  records: ReadonlyMap<UnitId, UnitRecord>,
): readonly UnitCatalogBuildIssue[] {
  if (unit.kind !== "class") {
    return [];
  }

  return unit.subclassChoices.flatMap((choice) =>
    choice.options.flatMap(
      (rawSubclassUnitId): readonly UnitCatalogBuildIssue[] => {
        const subclassUnitId = UnitIdSchema.make(rawSubclassUnitId);
        const referenced = records.get(subclassUnitId);
        /* v8 ignore start -- @preserve -- an unresolved subclass id is malformed class-catalog composition */
        if (referenced == null) {
          return [
            {
              code: "unknownUnitReference",
              referringUnitId: unit.id,
              referencedUnitId: subclassUnitId,
            } satisfies UnitCatalogBuildIssue,
          ];
        }
        /* v8 ignore stop -- @preserve */
        if (
          referenced.kind === "subclass" &&
          referenced.className === unit.className
        ) {
          return [];
        }

        return [
          {
            code: "invalidSubclassChoiceReference",
            classUnitId: unit.id,
            subclassUnitId,
            expectedClassName: unit.className,
            actualKind: referenced.kind,
            /* v8 ignore start -- @preserve -- only malformed subclass catalog composition reaches this diagnostic projection */
            ...("className" in referenced
              ? { actualClassName: referenced.className }
              : {}),
            /* v8 ignore stop -- @preserve */
          } satisfies UnitCatalogBuildIssue,
        ];
      },
    ),
  );
}

function validateSrdUnitCollection(
  collection: SrdUnitCollection,
): readonly UnitCatalogBuildIssue[] {
  return collection.units.flatMap((unit) =>
    isSrd521Provenance(unit.provenance)
      ? []
      : [
          {
            code: "mixedProvenance",
            collectionKind: collection.kind,
            expected: collection.provenance,
            actual: unit.provenance,
            unitId: unit.id,
          } satisfies UnitCatalogBuildIssue,
        ],
  );
}
