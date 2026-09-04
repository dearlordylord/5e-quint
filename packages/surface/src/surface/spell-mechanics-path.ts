import { PositiveInteger } from "@dnd/shared/types";

import {
  unitMechanicsPath,
  type MechanicsGraphPathNode,
  type UnitMechanicsPath,
} from "./mechanics-graph-path.ts";

export const SPELL_MECHANICS_HEADER_FACTS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "castingTime",
  "family",
] as const;

export type SpellMechanicsHeaderFact =
  (typeof SPELL_MECHANICS_HEADER_FACTS)[number];

export const SPELL_MECHANICS_HEADER_FACT_ORDINALS = {
  level: PositiveInteger(1),
  school: PositiveInteger(2),
  range: PositiveInteger(3),
  components: PositiveInteger(4),
  duration: PositiveInteger(5),
  castingTime: PositiveInteger(6),
  family: PositiveInteger(7),
} as const satisfies Record<SpellMechanicsHeaderFact, PositiveInteger>;

export const SPELL_MATERIAL_COMPONENT_BRANCHES = [
  "cost",
  "consumption",
] as const;

export type SpellMaterialComponentBranch =
  (typeof SPELL_MATERIAL_COMPONENT_BRANCHES)[number];

export const SPELL_MATERIAL_COMPONENT_BRANCH_COORDINATES = {
  cost: { role: "resource", ordinal: PositiveInteger(1) },
  consumption: { role: "effect", ordinal: PositiveInteger(1) },
} as const satisfies Record<
  SpellMaterialComponentBranch,
  {
    readonly role: "resource" | "effect";
    readonly ordinal: PositiveInteger;
  }
>;

export const SPELL_DURATION_BRANCHES = [
  "value",
  "extension",
  "ending",
] as const;

export type SpellDurationBranch = (typeof SPELL_DURATION_BRANCHES)[number];

export const SPELL_DURATION_BRANCH_COORDINATES = {
  value: { role: "generalFact", firstOrdinal: PositiveInteger(1) },
  extension: { role: "extension", firstOrdinal: PositiveInteger(1) },
  ending: { role: "effect", firstOrdinal: PositiveInteger(1) },
} as const satisfies Record<
  SpellDurationBranch,
  {
    readonly role: "generalFact" | "extension" | "effect";
    readonly firstOrdinal: PositiveInteger;
  }
>;

const SPELL_ACTIVATION_BRANCH_COORDINATES = {
  attachment: { role: "generalFact", ordinal: PositiveInteger(1) },
} as const;

const SPELL_ONGOING_BRANCH_COORDINATES = {
  attachment: { role: "effect", ordinal: PositiveInteger(1) },
  concurrentEffectLimit: { role: "resource" },
  /** The collective choose node emitted for modal ongoing-effect mechanics. */
  modeChoice: { role: "procedure", ordinal: PositiveInteger(1) },
  operationEffect: { role: "effect", ordinal: PositiveInteger(1) },
  authoredConditionalMechanic: {
    role: "generalFact",
    firstOrdinal: PositiveInteger(SPELL_MECHANICS_HEADER_FACTS.length + 1),
  },
} as const;

const SPELL_TEMPLATED_SPAWN_BRANCH_COORDINATES = {
  statBlock: { role: "effect", ordinal: PositiveInteger(1) },
  control: { role: "procedure", ordinal: PositiveInteger(1) },
  reversion: { role: "effect", ordinal: PositiveInteger(2) },
} as const;

const SPELL_SPAWNED_CREATURE_BRANCH_COORDINATES = {
  creature: { role: "effect", ordinal: PositiveInteger(1) },
  control: { role: "procedure", ordinal: PositiveInteger(1) },
  dismissal: { role: "effect", ordinal: PositiveInteger(2) },
} as const;

const SPELL_GLYPH_BRANCH_COORDINATES = {
  occurrence: { role: "effect", ordinal: PositiveInteger(1) },
  trigger: { role: "procedure", ordinal: PositiveInteger(1) },
  release: { role: "effect", ordinal: PositiveInteger(2) },
  explosiveRelease: { role: "procedure", ordinal: PositiveInteger(2) },
  storedRelease: { role: "procedure", ordinal: PositiveInteger(3) },
} as const;

const RECORD_MECHANICS_NODE = {
  kind: "singleton",
  role: "recordMechanics",
} as const;

export type SpellMechanicsBranchPath = Omit<UnitMechanicsPath, "nodes"> & {
  readonly nodes: readonly [
    typeof RECORD_MECHANICS_NODE,
    MechanicsGraphPathNode,
    ...MechanicsGraphPathNode[],
  ];
};

/**
 * The root coordinate for a spell's authored mechanics graph. This coordinate
 * alone does not certify that any represented mechanics branch was consumed.
 */
export function spellMechanicsRootPath(): UnitMechanicsPath {
  return unitMechanicsPath([RECORD_MECHANICS_NODE]);
}

export function spellMechanicsHeaderPath(
  fact: SpellMechanicsHeaderFact,
): SpellMechanicsBranchPath {
  return spellMechanicsPath(
    occurrence("generalFact", SPELL_MECHANICS_HEADER_FACT_ORDINALS[fact]),
  );
}

export function spellMaterialComponentPath(
  branch: SpellMaterialComponentBranch,
): SpellMechanicsBranchPath {
  const coordinate = SPELL_MATERIAL_COMPONENT_BRANCH_COORDINATES[branch];
  return spellMechanicsPath(
    headerNode("components"),
    occurrence(coordinate.role, coordinate.ordinal),
  );
}

export function spellDurationValuePath(): SpellMechanicsBranchPath {
  return spellDurationBranchPath(
    SPELL_DURATION_BRANCH_COORDINATES.value.role,
    SPELL_DURATION_BRANCH_COORDINATES.value.firstOrdinal,
  );
}

export function spellDurationExtensionPath(
  ordinal: PositiveInteger,
): SpellMechanicsBranchPath {
  const coordinate = SPELL_DURATION_BRANCH_COORDINATES.extension;
  return spellDurationBranchPath(
    coordinate.role,
    durationBranchOrdinal(coordinate.firstOrdinal, ordinal),
  );
}

export function spellDurationEndingPath(
  ordinal: PositiveInteger,
): SpellMechanicsBranchPath {
  const coordinate = SPELL_DURATION_BRANCH_COORDINATES.ending;
  return spellDurationBranchPath(
    coordinate.role,
    durationBranchOrdinal(coordinate.firstOrdinal, ordinal),
  );
}

export function spellActivationPhasePath(
  phaseOrdinal: PositiveInteger,
): SpellMechanicsBranchPath {
  return spellMechanicsPath(occurrence("procedure", phaseOrdinal));
}

export function spellActivationAttachmentPath(
  phaseOrdinal: PositiveInteger,
): SpellMechanicsBranchPath {
  const attachment = SPELL_ACTIVATION_BRANCH_COORDINATES.attachment;
  return spellMechanicsPath(
    occurrence("procedure", phaseOrdinal),
    occurrence(attachment.role, attachment.ordinal),
  );
}

export function spellActivationRepeatPath(
  phaseOrdinal: PositiveInteger,
  repeatOrdinal: PositiveInteger,
): SpellMechanicsBranchPath {
  return spellMechanicsPath(
    occurrence("procedure", phaseOrdinal),
    occurrence("procedure", repeatOrdinal),
  );
}

export function spellActivationEffectPath(
  phaseOrdinal: PositiveInteger,
  effectOrdinal: PositiveInteger,
): SpellMechanicsBranchPath {
  return spellMechanicsPath(
    occurrence("procedure", phaseOrdinal),
    occurrence("effect", effectOrdinal),
  );
}

export function spellOngoingAttachmentPath(): SpellMechanicsBranchPath {
  const attachment = SPELL_ONGOING_BRANCH_COORDINATES.attachment;
  return spellMechanicsPath(occurrence(attachment.role, attachment.ordinal));
}

/** Canonical root resource coordinate for an ongoing effect's concurrency limit. */
export function spellOngoingConcurrentEffectLimitPath(): SpellMechanicsBranchPath {
  const concurrentEffectLimit =
    SPELL_ONGOING_BRANCH_COORDINATES.concurrentEffectLimit;
  return spellMechanicsPath(singleton(concurrentEffectLimit.role));
}

export function spellOngoingInitialPhasePath(): SpellMechanicsBranchPath {
  return spellMechanicsPath(singleton("action"));
}

export function spellOngoingOperationPath(
  operationOrdinal: PositiveInteger,
): SpellMechanicsBranchPath {
  return spellMechanicsPath(occurrence("procedure", operationOrdinal));
}

/**
 * Canonical coordinate for a modal ongoing-effect's collective mode choice.
 * Individual options intentionally have no coordinates: the Surface tracer
 * emits them as one collective choice node.
 */
export function spellOngoingModeChoicePath(): SpellMechanicsBranchPath {
  const modeChoice = SPELL_ONGOING_BRANCH_COORDINATES.modeChoice;
  return spellMechanicsPath(occurrence(modeChoice.role, modeChoice.ordinal));
}

export function spellOngoingOperationEffectPath(
  operationOrdinal: PositiveInteger,
): SpellMechanicsBranchPath {
  const effect = SPELL_ONGOING_BRANCH_COORDINATES.operationEffect;
  return spellMechanicsPath(
    occurrence("procedure", operationOrdinal),
    occurrence(effect.role, effect.ordinal),
  );
}

/** Canonical coordinate for each root-authored ongoing conditional mechanic. */
export function spellOngoingAuthoredConditionalMechanicPath(
  ordinal: PositiveInteger,
): SpellMechanicsBranchPath {
  const coordinate =
    SPELL_ONGOING_BRANCH_COORDINATES.authoredConditionalMechanic;
  return spellMechanicsPath(
    occurrence(
      coordinate.role,
      branchOrdinalFromFirst(coordinate.firstOrdinal, ordinal),
    ),
  );
}

export function spellTemplatedSpawnCapacityPath(): SpellMechanicsBranchPath {
  return spellMechanicsPath(singleton("resource"));
}

export function spellTemplatedSpawnStatBlockPath(): SpellMechanicsBranchPath {
  const statBlock = SPELL_TEMPLATED_SPAWN_BRANCH_COORDINATES.statBlock;
  return spellMechanicsPath(occurrence(statBlock.role, statBlock.ordinal));
}

export function spellTemplatedSpawnSizeTierPath(
  tierOrdinal: PositiveInteger,
): SpellMechanicsBranchPath {
  return spellMechanicsPath(occurrence("extension", tierOrdinal));
}

export function spellTemplatedSpawnControlPath(): SpellMechanicsBranchPath {
  const control = SPELL_TEMPLATED_SPAWN_BRANCH_COORDINATES.control;
  return spellMechanicsPath(occurrence(control.role, control.ordinal));
}

export function spellTemplatedSpawnReversionPath(): SpellMechanicsBranchPath {
  const reversion = SPELL_TEMPLATED_SPAWN_BRANCH_COORDINATES.reversion;
  return spellMechanicsPath(occurrence(reversion.role, reversion.ordinal));
}

export function spellSpawnedCreaturePath(): SpellMechanicsBranchPath {
  const creature = SPELL_SPAWNED_CREATURE_BRANCH_COORDINATES.creature;
  return spellMechanicsPath(occurrence(creature.role, creature.ordinal));
}

export function spellSpawnedCreatureControlPath(): SpellMechanicsBranchPath {
  const control = SPELL_SPAWNED_CREATURE_BRANCH_COORDINATES.control;
  return spellMechanicsPath(occurrence(control.role, control.ordinal));
}

export function spellSpawnedCreatureDismissalPath(): SpellMechanicsBranchPath {
  const dismissal = SPELL_SPAWNED_CREATURE_BRANCH_COORDINATES.dismissal;
  return spellMechanicsPath(occurrence(dismissal.role, dismissal.ordinal));
}

export function spellGlyphOccurrencePath(): SpellMechanicsBranchPath {
  const occurrenceCoordinate = SPELL_GLYPH_BRANCH_COORDINATES.occurrence;
  return spellMechanicsPath(
    occurrence(occurrenceCoordinate.role, occurrenceCoordinate.ordinal),
  );
}

export function spellGlyphTriggerPath(): SpellMechanicsBranchPath {
  const trigger = SPELL_GLYPH_BRANCH_COORDINATES.trigger;
  return spellMechanicsPath(occurrence(trigger.role, trigger.ordinal));
}

export function spellGlyphReleasePath(): SpellMechanicsBranchPath {
  const release = SPELL_GLYPH_BRANCH_COORDINATES.release;
  return spellMechanicsPath(occurrence(release.role, release.ordinal));
}

export function spellGlyphExplosiveReleasePath(): SpellMechanicsBranchPath {
  const explosive = SPELL_GLYPH_BRANCH_COORDINATES.explosiveRelease;
  return spellMechanicsPath(occurrence(explosive.role, explosive.ordinal));
}

export function spellGlyphStoredReleasePath(): SpellMechanicsBranchPath {
  const stored = SPELL_GLYPH_BRANCH_COORDINATES.storedRelease;
  return spellMechanicsPath(occurrence(stored.role, stored.ordinal));
}

function spellDurationBranchPath(
  role: "generalFact" | "extension" | "effect",
  ordinal: PositiveInteger,
): SpellMechanicsBranchPath {
  return spellMechanicsPath(headerNode("duration"), occurrence(role, ordinal));
}

function durationBranchOrdinal(
  firstOrdinal: PositiveInteger,
  ordinal: PositiveInteger,
): PositiveInteger {
  return branchOrdinalFromFirst(firstOrdinal, ordinal);
}

function branchOrdinalFromFirst(
  firstOrdinal: PositiveInteger,
  ordinal: PositiveInteger,
): PositiveInteger {
  return PositiveInteger(firstOrdinal + ordinal - 1);
}

function spellMechanicsPath(
  ...tail: readonly [MechanicsGraphPathNode, ...MechanicsGraphPathNode[]]
): SpellMechanicsBranchPath {
  return { family: "unit", nodes: [RECORD_MECHANICS_NODE, ...tail] };
}

function headerNode(fact: SpellMechanicsHeaderFact): MechanicsGraphPathNode {
  return occurrence("generalFact", SPELL_MECHANICS_HEADER_FACT_ORDINALS[fact]);
}

function occurrence(
  role: Extract<
    MechanicsGraphPathNode,
    { readonly kind: "occurrence" }
  >["role"],
  ordinal: PositiveInteger,
): MechanicsGraphPathNode {
  return { kind: "occurrence", role, ordinal };
}

function singleton(
  role: Extract<MechanicsGraphPathNode, { readonly kind: "singleton" }>["role"],
): MechanicsGraphPathNode {
  return { kind: "singleton", role };
}
