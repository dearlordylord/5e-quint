import { Match } from "effect";

import { PositiveInteger } from "@dnd/shared/types";
import {
  backgroundCreationFacts,
  classCreationFacts,
  speciesCreationFacts,
  subclassCreationFacts,
  type BackgroundCreationFacts,
  type ClassCreationFacts,
  type NonSpellcastingClassCreationFacts,
  type NonWizardSpellcastingClassCreationFacts,
  type SpeciesCreationFacts,
  type SubclassCreationFacts,
  type SurfaceReadIssue,
  type UnitReaderResult,
  type WizardClassCreationFacts,
} from "@dnd/surface/surface/character-creation-readers";
import type {
  SurfaceMechanicsAdmission,
  UnitMechanicsAdmissionIssueDraft,
} from "@dnd/surface/surface/catalog-install";
import {
  unitMechanicsPath,
  type UnitMechanicsPath,
} from "@dnd/surface/surface/mechanics-graph-path";
import {
  srdUnitAuthoredLinks,
  type SurfaceAuthoredLink,
} from "@dnd/surface/surface/portable-surface";
import type {
  SrdSurface,
  SrdUnitRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";

type MechanicsFacts<Fact> = Fact extends {
  readonly recordId: UnitRecord["id"];
}
  ? Omit<Fact, "recordId">
  : never;

type ClassMechanicsFacts =
  | MechanicsFacts<WizardClassCreationFacts>
  | MechanicsFacts<NonWizardSpellcastingClassCreationFacts>
  | MechanicsFacts<NonSpellcastingClassCreationFacts>;

/**
 * The Character Definition roots have different authored shapes, but they
 * share one creation-domain projection boundary. The root tag describes the
 * parsed Surface shape; it is not an authored identity or a support status.
 */
export type CharacterDefinitionProjection =
  | {
      readonly kind: "class";
      readonly facts: ClassMechanicsFacts;
    }
  | {
      readonly kind: "subclass";
      readonly facts: MechanicsFacts<SubclassCreationFacts>;
    }
  | {
      readonly kind: "background";
      readonly facts: MechanicsFacts<BackgroundCreationFacts>;
    }
  | {
      readonly kind: "species";
      readonly facts: MechanicsFacts<SpeciesCreationFacts>;
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
  return Match.value(unit).pipe(
    Match.when({ kind: "class" }, (classUnit) => ({
      tag: "readable" as const,
      value: {
        kind: "class" as const,
        facts: classMechanicsFacts(classUnit),
      },
    })),
    Match.when({ kind: "subclass" }, (subclassUnit) => ({
      tag: "readable" as const,
      value: {
        kind: "subclass" as const,
        facts: withoutRecordId(subclassCreationFacts(subclassUnit)),
      },
    })),
    Match.when({ kind: "background" }, (backgroundUnit) => ({
      tag: "readable" as const,
      value: {
        kind: "background" as const,
        facts: withoutRecordId(backgroundCreationFacts(backgroundUnit)),
      },
    })),
    Match.when({ kind: "species" }, (speciesUnit) => ({
      tag: "readable" as const,
      value: {
        kind: "species" as const,
        facts: speciesMechanicsFacts(speciesUnit),
      },
    })),
    Match.when({ kind: "spell" }, unsupportedCharacterDefinitionUnit),
    Match.when({ kind: "class_feature" }, unsupportedCharacterDefinitionUnit),
    Match.when({ kind: "mastery" }, unsupportedCharacterDefinitionUnit),
    Match.when({ kind: "feat" }, unsupportedCharacterDefinitionUnit),
    Match.when({ kind: "species_trait" }, unsupportedCharacterDefinitionUnit),
    Match.when({ kind: "magic_item" }, unsupportedCharacterDefinitionUnit),
    Match.when({ kind: "armor" }, unsupportedCharacterDefinitionUnit),
    Match.when({ kind: "armor_template" }, unsupportedCharacterDefinitionUnit),
    Match.when({ kind: "shield" }, unsupportedCharacterDefinitionUnit),
    Match.when({ kind: "shield_template" }, unsupportedCharacterDefinitionUnit),
    Match.when({ kind: "weapon_template" }, unsupportedCharacterDefinitionUnit),
    Match.when({ kind: "weapon" }, unsupportedCharacterDefinitionUnit),
    Match.exhaustive,
  );
}

export type CharacterDefinitionAdmissionIssue =
  UnitMechanicsAdmissionIssueDraft<UnitMechanicsPath>;

export type CharacterDefinitionAdmissionInput = {
  readonly unit: SrdUnitRecord;
  readonly surface: SrdSurface;
};

export type CharacterDefinitionAdmissionResult =
  | {
      readonly tag: "admitted";
      readonly execution: CharacterDefinitionProjection;
    }
  | {
      readonly tag: "rejected";
      readonly issues: readonly [
        CharacterDefinitionAdmissionIssue,
        ...CharacterDefinitionAdmissionIssue[],
      ];
    };

/**
 * Admit one Character Definition root and its schema-declared graph before
 * creation consumes it.  The result carries the source-free projection so a
 * later aggregate admission can compose this owner with equipment, feature,
 * and spell owners without parsing the root again.
 */
export function admitCharacterDefinitionMechanicsGraph(
  input: CharacterDefinitionAdmissionInput,
): CharacterDefinitionAdmissionResult {
  const projection = projectCharacterDefinition(input.unit);
  if (projection.tag !== "readable") {
    const [firstIssue, ...remainingIssues] = projection.issues;
    return {
      tag: "rejected",
      issues: [
        projectionAdmissionIssue(firstIssue),
        ...remainingIssues.map(projectionAdmissionIssue),
      ],
    };
  }

  const issues: CharacterDefinitionAdmissionIssue[] = [];
  inspectCharacterDefinitionRoot(input, issues);
  inspectCharacterDefinitionLinks(input, issues);
  const [firstIssue, ...remainingIssues] = issues;
  return firstIssue === undefined
    ? { tag: "admitted", execution: projection.value }
    : { tag: "rejected", issues: [firstIssue, ...remainingIssues] };
}

/** The owner callback shape consumed by the atomic Surface installer. */
export const admitCharacterDefinitionMechanics =
  admitCharacterDefinitionMechanicsGraph satisfies SurfaceMechanicsAdmission["admitUnit"];

function projectionAdmissionIssue(
  issue: SurfaceReadIssue,
): CharacterDefinitionAdmissionIssue {
  return {
    reason: "unsupported_mechanics",
    mechanicsPath: rootMechanicsPath(),
    message: issue.message,
  };
}

function inspectCharacterDefinitionRoot(
  input: CharacterDefinitionAdmissionInput,
  issues: CharacterDefinitionAdmissionIssue[],
): void {
  const installedRoot = input.surface.units.find(
    (candidate) => candidate.id === input.unit.id,
  );
  // The Surface catalog's duplicate authored-id check makes id membership the
  // root-correlation invariant. Do not require JavaScript object identity or
  // re-project a second copy of the root here.
  if (installedRoot !== undefined) return;
  addAdmissionIssue(
    issues,
    "incomplete_graph",
    rootMechanicsPath(),
    "The Character Definition admission root is absent from the decoded Surface.",
  );
}

function inspectCharacterDefinitionLinks(
  input: CharacterDefinitionAdmissionInput,
  issues: CharacterDefinitionAdmissionIssue[],
): void {
  const unitIds = new Map(
    input.surface.units.map((unit) => [String(unit.id), unit] as const),
  );
  const statBlockIds = new Set(
    input.surface.statBlocks.map((statBlock) => String(statBlock.id)),
  );
  const projection = srdUnitAuthoredLinks(input.unit);
  for (const issue of projection.issues) {
    addAdmissionIssue(
      issues,
      "unsupported_mechanics",
      rootMechanicsPath(),
      `The Character Definition authored-link graph cannot be interpreted: ${issue.message}`,
    );
  }
  for (const [index, link] of projection.links.entries()) {
    inspectCharacterDefinitionLink({
      index,
      link,
      issues,
      statBlockIds,
      unitIds,
    });
  }
}

function inspectCharacterDefinitionLink(input: {
  readonly index: number;
  readonly link: SurfaceAuthoredLink;
  readonly issues: CharacterDefinitionAdmissionIssue[];
  readonly statBlockIds: ReadonlySet<string>;
  readonly unitIds: ReadonlyMap<string, UnitRecord>;
}): void {
  const linkPath = characterDefinitionLinkPath(input.index, input.link);
  if (input.link.targetKind === "unit") {
    const link = input.link;
    inspectCharacterDefinitionUnitLink({
      issues: input.issues,
      link,
      linkPath,
      unitIds: input.unitIds,
    });
    return;
  }

  if (
    input.link.category === "dependency" &&
    !input.statBlockIds.has(input.link.targetId)
  ) {
    addAdmissionIssue(
      input.issues,
      "incomplete_graph",
      linkPath,
      `The Character Definition ${input.link.relation} authored ${input.link.category} does not resolve to an installed ${input.link.targetKind}.`,
    );
  }
}

function inspectCharacterDefinitionUnitLink(input: {
  readonly link: SurfaceAuthoredLink & { readonly targetKind: "unit" };
  readonly linkPath: UnitMechanicsPath;
  readonly issues: CharacterDefinitionAdmissionIssue[];
  readonly unitIds: ReadonlyMap<string, UnitRecord>;
}): void {
  const target = input.unitIds.get(input.link.targetId);
  if (target === undefined) {
    if (input.link.category === "dependency") {
      addAdmissionIssue(
        input.issues,
        "incomplete_graph",
        input.linkPath,
        `The Character Definition ${input.link.relation} authored ${input.link.category} does not resolve to an installed ${input.link.targetKind}.`,
      );
    }
    return;
  }

  const expectedKinds = expectedCharacterDefinitionTargetKinds(input.link);
  if (expectedKinds !== undefined && !expectedKinds.includes(target.kind)) {
    addAdmissionIssue(
      input.issues,
      "ambiguous_mechanics",
      input.linkPath,
      `The Character Definition ${input.link.relation} resolves to an incompatible Unit shape; expected ${expectedKinds.join(" or ")}.`,
    );
  }
}

const CHARACTER_DEFINITION_CLASS_FEATURE_KINDS = [
  "class_feature",
] as const satisfies ReadonlyArray<UnitRecord["kind"]>;
const CHARACTER_DEFINITION_SUBCLASS_KINDS = [
  "subclass",
] as const satisfies ReadonlyArray<UnitRecord["kind"]>;
const CHARACTER_DEFINITION_FEAT_KINDS = [
  "feat",
] as const satisfies ReadonlyArray<UnitRecord["kind"]>;
const CHARACTER_DEFINITION_SPELL_KINDS = [
  "spell",
] as const satisfies ReadonlyArray<UnitRecord["kind"]>;
const CHARACTER_DEFINITION_ITEM_KINDS = [
  "armor",
  "armor_template",
  "magic_item",
  "shield",
  "shield_template",
  "weapon_template",
  "weapon",
] as const satisfies ReadonlyArray<UnitRecord["kind"]>;

function expectedCharacterDefinitionTargetKinds(
  link: SurfaceAuthoredLink,
): readonly UnitRecord["kind"][] | undefined {
  if (link.targetKind !== "unit") return undefined;
  return Match.value(link.relation).pipe(
    Match.when("excluded-armor-reference", () =>
      CHARACTER_DEFINITION_ITEM_KINDS.filter(
        (kind) => kind === "armor" || kind === "armor_template",
      ),
    ),
    Match.when("item-reference", () => CHARACTER_DEFINITION_ITEM_KINDS),
    Match.when(
      "linked-spell-reference",
      () => CHARACTER_DEFINITION_SPELL_KINDS,
    ),
    Match.when("origin-feat-reference", () => CHARACTER_DEFINITION_FEAT_KINDS),
    Match.when("resource-link", () => undefined),
    Match.when("spell-reference", () => CHARACTER_DEFINITION_SPELL_KINDS),
    Match.when("subclass-choice", () => CHARACTER_DEFINITION_SUBCLASS_KINDS),
    // Character Definition feature grants are the only root-owned
    // `unit-reference` branch; their target shape is a Class Feature.
    Match.when(
      "unit-reference",
      () => CHARACTER_DEFINITION_CLASS_FEATURE_KINDS,
    ),
    Match.when("spell-list", () => CHARACTER_DEFINITION_SPELL_KINDS),
    Match.when("weapon-reference", () => ["weapon"] as const),
    Match.exhaustive,
  );
}

function characterDefinitionLinkPath(
  index: number,
  link: SurfaceAuthoredLink,
): UnitMechanicsPath {
  return unitMechanicsPath([
    { kind: "singleton", role: "recordMechanics" },
    {
      kind: "occurrence",
      role: link.category === "dependency" ? "dependency" : "reference",
      ordinal: PositiveInteger(index + 1),
    },
  ]);
}

function rootMechanicsPath(): UnitMechanicsPath {
  return unitMechanicsPath([{ kind: "singleton", role: "recordMechanics" }]);
}

function addAdmissionIssue(
  issues: CharacterDefinitionAdmissionIssue[],
  reason: CharacterDefinitionAdmissionIssue["reason"],
  mechanicsPath: UnitMechanicsPath,
  message: string,
): void {
  issues.push({ reason, mechanicsPath, message });
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

function classMechanicsFacts(
  unit: Parameters<typeof classCreationFacts>[0],
): ClassMechanicsFacts {
  const facts = classCreationFacts(unit);
  if (isWizardClassCreationFacts(facts)) {
    return withoutRecordId(facts);
  }
  if (isNonWizardSpellcastingClassCreationFacts(facts)) {
    return withoutRecordId(facts);
  }
  return withoutRecordId(facts);
}

function isWizardClassCreationFacts(
  facts: ClassCreationFacts,
): facts is WizardClassCreationFacts {
  return (
    "spellcasting" in facts &&
    facts.spellcasting?.kind === "wizard_spellcasting_creation"
  );
}

function isNonWizardSpellcastingClassCreationFacts(
  facts: Exclude<ClassCreationFacts, WizardClassCreationFacts>,
): facts is NonWizardSpellcastingClassCreationFacts {
  return "spellcasting" in facts && facts.spellcasting !== undefined;
}

function speciesMechanicsFacts(
  unit: Parameters<typeof speciesCreationFacts>[0],
): MechanicsFacts<SpeciesCreationFacts> {
  const facts = speciesCreationFacts(unit);
  if ("draconicAncestry" in facts) {
    return withoutRecordId(facts);
  }
  return withoutRecordId(facts);
}

function withoutRecordId<
  Fact extends {
    readonly recordId: UnitRecord["id"];
  },
>(facts: Fact): Omit<Fact, "recordId"> {
  const { recordId: _recordId, ...mechanics } = facts;
  return mechanics;
}
