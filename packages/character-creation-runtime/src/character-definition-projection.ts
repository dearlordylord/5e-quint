import { Match, Result } from "effect";

import { PositiveInteger } from "@dnd/shared/types";
import { canonicalStructuralKey } from "@dnd/shared/structural-value";
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
import type { UnitMechanicsAdmissionIssueDraft } from "@dnd/surface/surface/catalog-install";
import {
  unitMechanicsPath,
  type UnitMechanicsPath,
} from "@dnd/surface/surface/mechanics-graph-path";
import {
  collectSurfaceUnitAuthoredRelations,
  type SurfaceAuthoredRelation,
} from "@dnd/surface/surface/surface-relations";
import type {
  SrdSurface,
  SrdUnitRecord,
  ClassRecord,
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

export type CharacterDefinitionClassFacts = Extract<
  CharacterDefinitionProjection,
  { readonly kind: "class" }
>["facts"];
export type CharacterDefinitionSubclassFacts = Extract<
  CharacterDefinitionProjection,
  { readonly kind: "subclass" }
>["facts"];
export type CharacterDefinitionBackgroundFacts = Extract<
  CharacterDefinitionProjection,
  { readonly kind: "background" }
>["facts"];
export type CharacterDefinitionSpeciesFacts = Extract<
  CharacterDefinitionProjection,
  { readonly kind: "species" }
>["facts"];

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
        facts: projectClassDefinitionFacts(classUnit),
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
  // Correlate decoded roots by their complete structural content. The
  // catalog's duplicate-id check locates the candidate, but an altered
  // same-id record must not inherit the installed root's admission.
  if (installedRoot !== undefined) {
    if (sameCharacterDefinitionStructure(installedRoot, input.unit)) return;
    addAdmissionIssue(
      issues,
      "ambiguous_mechanics",
      rootMechanicsPath(),
      "The Character Definition admission root has the installed id but different decoded structure.",
    );
    return;
  }
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
  const relationGraph = collectSurfaceUnitAuthoredRelations(input.unit);
  if (Result.isFailure(relationGraph)) {
    for (const issue of relationGraph.failure) {
      addAdmissionIssue(
        issues,
        "unsupported_mechanics",
        rootMechanicsPath(),
        `The Character Definition authored-relation graph cannot be interpreted: ${issue.message}`,
      );
    }
    return;
  }
  for (const [index, link] of relationGraph.success.entries()) {
    inspectCharacterDefinitionLink({
      index,
      link,
      issues,
      statBlockIds,
      unitIds,
      owningClassName:
        input.unit.kind === "class" ? input.unit.className : undefined,
    });
  }
}

function inspectCharacterDefinitionLink(input: {
  readonly index: number;
  readonly link: SurfaceAuthoredRelation;
  readonly issues: CharacterDefinitionAdmissionIssue[];
  readonly statBlockIds: ReadonlySet<string>;
  readonly unitIds: ReadonlyMap<string, UnitRecord>;
  readonly owningClassName:
    | Extract<UnitRecord, { readonly kind: "class" }>["className"]
    | undefined;
}): void {
  const linkPath = characterDefinitionLinkPath(input.index, input.link);
  if (input.link.targetKind === "unit") {
    const link = input.link;
    inspectCharacterDefinitionUnitLink({
      issues: input.issues,
      link,
      linkPath,
      unitIds: input.unitIds,
      owningClassName: input.owningClassName,
    });
    return;
  }

  if (
    input.link.relationKind === "dependency" &&
    !input.statBlockIds.has(input.link.targetRecordId)
  ) {
    addAdmissionIssue(
      input.issues,
      "incomplete_graph",
      linkPath,
      `The Character Definition ${input.link.relation} authored ${input.link.relationKind} does not resolve to an installed ${input.link.targetKind}.`,
    );
  }
}

function inspectCharacterDefinitionUnitLink(input: {
  readonly link: SurfaceAuthoredRelation & { readonly targetKind: "unit" };
  readonly linkPath: UnitMechanicsPath;
  readonly issues: CharacterDefinitionAdmissionIssue[];
  readonly unitIds: ReadonlyMap<string, UnitRecord>;
  readonly owningClassName:
    | Extract<UnitRecord, { readonly kind: "class" }>["className"]
    | undefined;
}): void {
  const expectation = expectedCharacterDefinitionTarget(input.link);
  if (expectation.tag === "unowned") {
    addAdmissionIssue(
      input.issues,
      "unsupported_mechanics",
      input.linkPath,
      `The Character Definition ${input.link.relation} authored ${input.link.relationKind} has no owner projection.`,
    );
    return;
  }

  const target = input.unitIds.get(input.link.targetRecordId);
  if (target === undefined) {
    if (input.link.relationKind === "dependency") {
      addAdmissionIssue(
        input.issues,
        "incomplete_graph",
        input.linkPath,
        `The Character Definition ${input.link.relation} authored ${input.link.relationKind} does not resolve to an installed ${input.link.targetKind}.`,
      );
    }
    return;
  }

  if (!expectation.targetKinds.includes(target.kind)) {
    addAdmissionIssue(
      input.issues,
      "ambiguous_mechanics",
      input.linkPath,
      `The Character Definition ${input.link.relation} resolves to an incompatible Unit shape; expected ${expectation.targetKinds.join(" or ")}.`,
    );
    return;
  }
  if (
    expectation.requiresOwningClassName &&
    (input.owningClassName === undefined ||
      target.kind !== "subclass" ||
      target.className !== input.owningClassName)
  ) {
    addAdmissionIssue(
      input.issues,
      "ambiguous_mechanics",
      input.linkPath,
      `The Character Definition subclass-choice target must belong to ${input.owningClassName ?? "the owning class"}.`,
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

type CharacterDefinitionTargetExpectation =
  | {
      readonly tag: "supported";
      readonly targetKinds: readonly UnitRecord["kind"][];
      readonly requiresOwningClassName?: boolean;
    }
  | { readonly tag: "unowned" };

function expectedCharacterDefinitionTarget(
  link: SurfaceAuthoredRelation,
): CharacterDefinitionTargetExpectation {
  if (link.targetKind !== "unit") return { tag: "unowned" };
  if ("sourceRole" in link && link.sourceRole === "class-feature-grant") {
    return {
      tag: "supported",
      targetKinds: CHARACTER_DEFINITION_CLASS_FEATURE_KINDS,
    };
  }
  if ("sourceRole" in link && link.sourceRole === "class-subclass-choice") {
    return {
      tag: "supported",
      targetKinds: CHARACTER_DEFINITION_SUBCLASS_KINDS,
      requiresOwningClassName: true,
    };
  }
  return Match.value(link.relation).pipe(
    Match.when("excluded-armor-reference", () => ({
      tag: "supported" as const,
      targetKinds: CHARACTER_DEFINITION_ITEM_KINDS.filter(
        (kind) => kind === "armor" || kind === "armor_template",
      ),
    })),
    Match.when("item-reference", () => ({
      tag: "supported" as const,
      targetKinds: CHARACTER_DEFINITION_ITEM_KINDS,
    })),
    Match.when("linked-spell-reference", () => ({
      tag: "supported" as const,
      targetKinds: CHARACTER_DEFINITION_SPELL_KINDS,
    })),
    Match.when("mastery-reference", () => ({ tag: "unowned" as const })),
    Match.when("origin-feat-reference", () => ({
      tag: "supported" as const,
      targetKinds: CHARACTER_DEFINITION_FEAT_KINDS,
    })),
    Match.when("resource-link", () => ({ tag: "unowned" as const })),
    Match.when("spell-reference", () => ({
      tag: "supported" as const,
      targetKinds: CHARACTER_DEFINITION_SPELL_KINDS,
    })),
    // A generic subclass-choice or unit-reference is intentionally not
    // accepted: its source role is required to identify the owning branch.
    Match.when("subclass-choice", () => ({ tag: "unowned" as const })),
    Match.when("unit-reference", () => ({ tag: "unowned" as const })),
    Match.when("spell-list", () => ({
      tag: "supported" as const,
      targetKinds: CHARACTER_DEFINITION_SPELL_KINDS,
    })),
    Match.when("weapon-reference", () => ({
      tag: "supported" as const,
      targetKinds: ["weapon"] as const,
    })),
    Match.exhaustive,
  );
}

function characterDefinitionLinkPath(
  index: number,
  link: SurfaceAuthoredRelation,
): UnitMechanicsPath {
  return unitMechanicsPath([
    { kind: "singleton", role: "recordMechanics" },
    {
      kind: "occurrence",
      role: link.relationKind === "dependency" ? "dependency" : "reference",
      ordinal: PositiveInteger(index + 1),
    },
  ]);
}

function rootMechanicsPath(): UnitMechanicsPath {
  return unitMechanicsPath([{ kind: "singleton", role: "recordMechanics" }]);
}

function sameCharacterDefinitionStructure(
  left: SrdUnitRecord,
  right: SrdUnitRecord,
): boolean {
  return canonicalStructuralKey(left) === canonicalStructuralKey(right);
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

export function projectClassDefinitionFacts(
  unit: ClassRecord,
): CharacterDefinitionClassFacts {
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
