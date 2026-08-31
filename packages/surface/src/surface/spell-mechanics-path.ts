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
  level: 1,
  school: 2,
  range: 3,
  components: 4,
  duration: 5,
  castingTime: 6,
  family: 7,
} as const satisfies Record<SpellMechanicsHeaderFact, number>;

export const SPELL_MATERIAL_COMPONENT_BRANCHES = [
  "cost",
  "consumption",
] as const;

export type SpellMaterialComponentBranch =
  (typeof SPELL_MATERIAL_COMPONENT_BRANCHES)[number];

export const SPELL_MATERIAL_COMPONENT_BRANCH_COORDINATES = {
  cost: { role: "resource", ordinal: 1 },
  consumption: { role: "effect", ordinal: 1 },
} as const satisfies Record<
  SpellMaterialComponentBranch,
  { readonly role: "resource" | "effect"; readonly ordinal: number }
>;

export const SPELL_DURATION_BRANCHES = [
  "value",
  "extension",
  "ending",
] as const;

export type SpellDurationBranch = (typeof SPELL_DURATION_BRANCHES)[number];

export const SPELL_DURATION_BRANCH_COORDINATES = {
  value: { role: "generalFact", firstOrdinal: 1 },
  extension: { role: "extension", firstOrdinal: 1 },
  ending: { role: "effect", firstOrdinal: 1 },
} as const satisfies Record<
  SpellDurationBranch,
  {
    readonly role: "generalFact" | "extension" | "effect";
    readonly firstOrdinal: number;
  }
>;

const SPELL_ACTIVATION_BRANCH_COORDINATES = {
  attachment: { role: "generalFact", ordinal: 1 },
} as const;

const SPELL_ONGOING_BRANCH_COORDINATES = {
  attachment: { role: "effect", ordinal: 1 },
  operationEffect: { role: "effect", ordinal: 1 },
} as const;

const SPELL_TEMPLATED_SPAWN_BRANCH_COORDINATES = {
  statBlock: { role: "effect", ordinal: 1 },
  control: { role: "procedure", ordinal: 1 },
  reversion: { role: "effect", ordinal: 2 },
} as const;

const SPELL_SPAWNED_CREATURE_BRANCH_COORDINATES = {
  creature: { role: "effect", ordinal: 1 },
  control: { role: "procedure", ordinal: 1 },
  dismissal: { role: "effect", ordinal: 2 },
} as const;

const SPELL_GLYPH_BRANCH_COORDINATES = {
  occurrence: { role: "effect", ordinal: 1 },
  trigger: { role: "procedure", ordinal: 1 },
  release: { role: "effect", ordinal: 2 },
  explosiveRelease: { role: "procedure", ordinal: 2 },
  storedRelease: { role: "procedure", ordinal: 3 },
} as const;

const RECORD_MECHANICS_NODE = {
  kind: "singleton",
  role: "recordMechanics",
} as const;

/**
 * The root coordinate for a spell's authored mechanics graph. This coordinate
 * alone does not certify that any represented mechanics branch was consumed.
 */
export function spellMechanicsRootPath(): UnitMechanicsPath {
  return unitMechanicsPath([RECORD_MECHANICS_NODE]);
}

export function spellMechanicsHeaderPath(
  fact: SpellMechanicsHeaderFact,
): UnitMechanicsPath {
  return spellMechanicsPath(
    occurrence(
      "generalFact",
      PositiveInteger(SPELL_MECHANICS_HEADER_FACT_ORDINALS[fact]),
    ),
  );
}

export function spellMaterialComponentPath(
  branch: SpellMaterialComponentBranch,
): UnitMechanicsPath {
  const coordinate = SPELL_MATERIAL_COMPONENT_BRANCH_COORDINATES[branch];
  return spellMechanicsPath(
    headerNode("components"),
    occurrence(coordinate.role, PositiveInteger(coordinate.ordinal)),
  );
}

export function spellDurationValuePath(): UnitMechanicsPath {
  return spellDurationBranchPath(
    SPELL_DURATION_BRANCH_COORDINATES.value.role,
    PositiveInteger(SPELL_DURATION_BRANCH_COORDINATES.value.firstOrdinal),
  );
}

export function spellDurationExtensionPath(
  ordinal: PositiveInteger,
): UnitMechanicsPath {
  return spellDurationBranchPath("extension", ordinal);
}

export function spellDurationEndingPath(
  ordinal: PositiveInteger,
): UnitMechanicsPath {
  return spellDurationBranchPath("effect", ordinal);
}

export function spellActivationPhasePath(
  phaseOrdinal: PositiveInteger,
): UnitMechanicsPath {
  return spellMechanicsPath(occurrence("procedure", phaseOrdinal));
}

export function spellActivationAttachmentPath(
  phaseOrdinal: PositiveInteger,
): UnitMechanicsPath {
  const attachment = SPELL_ACTIVATION_BRANCH_COORDINATES.attachment;
  return spellMechanicsPath(
    occurrence("procedure", phaseOrdinal),
    occurrence(attachment.role, PositiveInteger(attachment.ordinal)),
  );
}

export function spellActivationRepeatPath(
  phaseOrdinal: PositiveInteger,
  repeatOrdinal: PositiveInteger,
): UnitMechanicsPath {
  return spellMechanicsPath(
    occurrence("procedure", phaseOrdinal),
    occurrence("procedure", repeatOrdinal),
  );
}

export function spellActivationEffectPath(
  phaseOrdinal: PositiveInteger,
  effectOrdinal: PositiveInteger,
): UnitMechanicsPath {
  return spellMechanicsPath(
    occurrence("procedure", phaseOrdinal),
    occurrence("effect", effectOrdinal),
  );
}

export function spellOngoingAttachmentPath(): UnitMechanicsPath {
  const attachment = SPELL_ONGOING_BRANCH_COORDINATES.attachment;
  return spellMechanicsPath(
    occurrence(attachment.role, PositiveInteger(attachment.ordinal)),
  );
}

export function spellOngoingInitialPhasePath(): UnitMechanicsPath {
  return spellMechanicsPath(singleton("action"));
}

export function spellOngoingOperationPath(
  operationOrdinal: PositiveInteger,
): UnitMechanicsPath {
  return spellMechanicsPath(occurrence("procedure", operationOrdinal));
}

export function spellOngoingOperationEffectPath(
  operationOrdinal: PositiveInteger,
): UnitMechanicsPath {
  const effect = SPELL_ONGOING_BRANCH_COORDINATES.operationEffect;
  return spellMechanicsPath(
    occurrence("procedure", operationOrdinal),
    occurrence(effect.role, PositiveInteger(effect.ordinal)),
  );
}

export function spellTemplatedSpawnCapacityPath(): UnitMechanicsPath {
  return spellMechanicsPath(singleton("resource"));
}

export function spellTemplatedSpawnStatBlockPath(): UnitMechanicsPath {
  const statBlock = SPELL_TEMPLATED_SPAWN_BRANCH_COORDINATES.statBlock;
  return spellMechanicsPath(
    occurrence(statBlock.role, PositiveInteger(statBlock.ordinal)),
  );
}

export function spellTemplatedSpawnSizeTierPath(
  tierOrdinal: PositiveInteger,
): UnitMechanicsPath {
  return spellMechanicsPath(occurrence("extension", tierOrdinal));
}

export function spellTemplatedSpawnControlPath(): UnitMechanicsPath {
  const control = SPELL_TEMPLATED_SPAWN_BRANCH_COORDINATES.control;
  return spellMechanicsPath(
    occurrence(control.role, PositiveInteger(control.ordinal)),
  );
}

export function spellTemplatedSpawnReversionPath(): UnitMechanicsPath {
  const reversion = SPELL_TEMPLATED_SPAWN_BRANCH_COORDINATES.reversion;
  return spellMechanicsPath(
    occurrence(reversion.role, PositiveInteger(reversion.ordinal)),
  );
}

export function spellSpawnedCreaturePath(): UnitMechanicsPath {
  const creature = SPELL_SPAWNED_CREATURE_BRANCH_COORDINATES.creature;
  return spellMechanicsPath(
    occurrence(creature.role, PositiveInteger(creature.ordinal)),
  );
}

export function spellSpawnedCreatureControlPath(): UnitMechanicsPath {
  const control = SPELL_SPAWNED_CREATURE_BRANCH_COORDINATES.control;
  return spellMechanicsPath(
    occurrence(control.role, PositiveInteger(control.ordinal)),
  );
}

export function spellSpawnedCreatureDismissalPath(): UnitMechanicsPath {
  const dismissal = SPELL_SPAWNED_CREATURE_BRANCH_COORDINATES.dismissal;
  return spellMechanicsPath(
    occurrence(dismissal.role, PositiveInteger(dismissal.ordinal)),
  );
}

export function spellGlyphOccurrencePath(): UnitMechanicsPath {
  const occurrenceCoordinate = SPELL_GLYPH_BRANCH_COORDINATES.occurrence;
  return spellMechanicsPath(
    occurrence(
      occurrenceCoordinate.role,
      PositiveInteger(occurrenceCoordinate.ordinal),
    ),
  );
}

export function spellGlyphTriggerPath(): UnitMechanicsPath {
  const trigger = SPELL_GLYPH_BRANCH_COORDINATES.trigger;
  return spellMechanicsPath(
    occurrence(trigger.role, PositiveInteger(trigger.ordinal)),
  );
}

export function spellGlyphReleasePath(): UnitMechanicsPath {
  const release = SPELL_GLYPH_BRANCH_COORDINATES.release;
  return spellMechanicsPath(
    occurrence(release.role, PositiveInteger(release.ordinal)),
  );
}

export function spellGlyphExplosiveReleasePath(): UnitMechanicsPath {
  const explosive = SPELL_GLYPH_BRANCH_COORDINATES.explosiveRelease;
  return spellMechanicsPath(
    occurrence(explosive.role, PositiveInteger(explosive.ordinal)),
  );
}

export function spellGlyphStoredReleasePath(): UnitMechanicsPath {
  const stored = SPELL_GLYPH_BRANCH_COORDINATES.storedRelease;
  return spellMechanicsPath(
    occurrence(stored.role, PositiveInteger(stored.ordinal)),
  );
}

function spellDurationBranchPath(
  role: "generalFact" | "extension" | "effect",
  ordinal: PositiveInteger,
): UnitMechanicsPath {
  return spellMechanicsPath(headerNode("duration"), occurrence(role, ordinal));
}

function spellMechanicsPath(
  ...tail: readonly [MechanicsGraphPathNode, ...MechanicsGraphPathNode[]]
): UnitMechanicsPath {
  return unitMechanicsPath([RECORD_MECHANICS_NODE, ...tail]);
}

function headerNode(fact: SpellMechanicsHeaderFact): MechanicsGraphPathNode {
  return occurrence(
    "generalFact",
    PositiveInteger(SPELL_MECHANICS_HEADER_FACT_ORDINALS[fact]),
  );
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
