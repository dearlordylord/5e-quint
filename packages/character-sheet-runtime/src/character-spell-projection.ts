import { Match, Option } from "effect";

import { PositiveInteger } from "@dnd/shared/types";
import type { UnitReaderResult } from "@dnd/surface/surface/character-creation-readers";
import {
  unitMechanicsPath,
  type MechanicsGraphPathNode,
  type MechanicsGraphNodeRole,
  type UnitMechanicsPath,
} from "@dnd/surface/surface/mechanics-graph-path";
import type {
  SpellMechanics,
  SpellRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";

type SpellFactsWithoutMechanics = Omit<
  SpellRecord,
  "id" | "kind" | "name" | "provenance" | "mechanics"
>;

export type CharacterSheetSpellComponents = {
  readonly v: boolean;
  readonly s: boolean;
  readonly material:
    | { readonly kind: "absent" }
    | {
        readonly kind: "present";
        readonly costGp: Option.Option<number>;
        readonly consumed: boolean;
      };
};

type ProjectedSpellMechanics<Mechanics extends SpellMechanics> = Omit<
  Mechanics,
  "components"
> & {
  readonly components: CharacterSheetSpellComponents;
};

export type CharacterSheetSpellMechanics = {
  [Family in SpellMechanics["family"]]: ProjectedSpellMechanics<
    Extract<SpellMechanics, { readonly family: Family }>
  >;
}[SpellMechanics["family"]];

/**
 * Root-record-identity-free input to Character Sheet spell admission.
 * Specialist readers must narrow nested authored expression before execution.
 */
export type CharacterSheetSpellFacts = SpellFactsWithoutMechanics & {
  readonly mechanics: CharacterSheetSpellMechanics;
};
export type CharacterSheetSpellSource = CharacterSheetSpellFacts & {
  readonly unitId: UnitRecord["id"];
};

export const CHARACTER_SHEET_SPELL_PATH_DISPOSITIONS = [
  "consumed",
  "unowned",
] as const;
export type CharacterSheetSpellPathDisposition =
  (typeof CHARACTER_SHEET_SPELL_PATH_DISPOSITIONS)[number];

export const CHARACTER_SHEET_SPELL_EVIDENCE_BRANCHES = [
  "spell level",
  "spell school",
  "spell range",
  "spell components",
  "material component cost",
  "material component consumption",
  "spell duration",
  "mechanics family",
  "duration limit",
  "duration early ending",
  "duration upcast tier",
  "permanent duration ending",
  "permanent casting cadence",
  "maintained permanent duration",
  "casting time",
  "activation phase",
  "phase attachment",
  "phase effect execution",
  "repeat saving throw",
  "ongoing attachment",
  "ongoing initial phase",
  "ongoing operation execution",
  "spawn capacity",
  "spawn stat block execution",
  "spawn size tier",
  "spawn control execution",
  "zero-hit-point reversion",
  "spawned creature execution",
  "spawn dismissal",
] as const;
export type CharacterSheetSpellEvidenceBranch =
  (typeof CHARACTER_SHEET_SPELL_EVIDENCE_BRANCHES)[number];

export type CharacterSheetSpellPathEvidence = {
  readonly mechanicsPath: UnitMechanicsPath;
  readonly disposition: CharacterSheetSpellPathDisposition;
  readonly branch: CharacterSheetSpellEvidenceBranch;
};

export type PartialCharacterSheetSpellProjection = {
  readonly projection: CharacterSheetSpellFacts;
  readonly evidence: readonly [
    CharacterSheetSpellPathEvidence,
    ...CharacterSheetSpellPathEvidence[],
  ];
};

export const PARTIAL_CHARACTER_SHEET_SPELL_PROJECTION_ISSUE_CODES = [
  "completeSpellRoot",
  "unsupportedSpellBranch",
  "unsupportedSpellRoot",
] as const;
export type PartialCharacterSheetSpellProjectionIssueCode =
  (typeof PARTIAL_CHARACTER_SHEET_SPELL_PROJECTION_ISSUE_CODES)[number];
export type PartialCharacterSheetSpellProjectionIssue = {
  readonly code: PartialCharacterSheetSpellProjectionIssueCode;
  readonly mechanicsPath: UnitMechanicsPath;
  readonly message: string;
};
export type PartialCharacterSheetSpellProjectionResult =
  | {
      readonly tag: "readable";
      readonly value: PartialCharacterSheetSpellProjection;
    }
  | {
      readonly tag: "unreadable";
      readonly issues: readonly [
        PartialCharacterSheetSpellProjectionIssue,
        ...PartialCharacterSheetSpellProjectionIssue[],
      ];
    };

type Activation = Extract<
  CharacterSheetSpellMechanics,
  { readonly family: "activation" }
>;
type OngoingEffect = Extract<
  CharacterSheetSpellMechanics,
  { readonly family: "ongoing_effect" }
>;
type TemplatedSpawn = Extract<
  CharacterSheetSpellMechanics,
  { readonly family: "templated_multi_spawn" }
>;
type SpawnedCreature = Extract<
  CharacterSheetSpellMechanics,
  { readonly family: "spawned_creature" }
>;
type DirectPhase = Extract<
  Activation["phases"][number],
  { readonly kind: "direct" }
>;
type DirectEffect = NonNullable<DirectPhase["effects"]>[number];
type SavePhase = Extract<
  Activation["phases"][number],
  { readonly kind: "save_gate" }
>;

const SHEET_DIRECT_EFFECT_KINDS = new Set<DirectEffect["kind"]>([
  "set_ability_score",
  "create_object",
  "remove_condition",
  "revive_dead_creature",
  "composite",
]);
const SHEET_SAVE_FAILURE_KINDS = new Set<SavePhase["onFail"]["kind"]>([
  "planar_entity_answers",
  "create_sensor",
  "create_illusion",
]);
type DirectEffectSetCandidateKind = DirectEffect["kind"];
const SHEET_OWNED_DIRECT_EFFECT_KINDS = new Set<DirectEffectSetCandidateKind>([
  "grant_rest_benefit",
  "spell_recipient_rest_lockout",
  "remove_condition",
  "revive_dead_creature",
]);

const SPELL_HEADER_FACT_ORDINALS = {
  level: 1,
  school: 2,
  range: 3,
  components: 4,
  duration: 5,
  castingTime: 6,
  family: 7,
} as const;

const MATERIAL_BRANCH_ORDINALS = { cost: 1, consumption: 1 } as const;
const DURATION_BRANCH_ORDINALS = {
  value: 1,
  firstExtension: 1,
  firstEffect: 1,
} as const;

export function projectCharacterSheetSpell(
  unit: UnitRecord,
): UnitReaderResult<CharacterSheetSpellFacts> {
  return Match.value(unit).pipe(
    Match.when({ kind: "spell" }, (spell) => ({
      tag: "readable" as const,
      value: projectSpellAdmissionFacts(spell),
    })),
    Match.when({ kind: "class" }, unsupportedSpellRoot),
    Match.when({ kind: "subclass" }, unsupportedSpellRoot),
    Match.when({ kind: "class_feature" }, unsupportedSpellRoot),
    Match.when({ kind: "feat" }, unsupportedSpellRoot),
    Match.when({ kind: "background" }, unsupportedSpellRoot),
    Match.when({ kind: "species" }, unsupportedSpellRoot),
    Match.when({ kind: "species_trait" }, unsupportedSpellRoot),
    Match.when({ kind: "mastery" }, unsupportedSpellRoot),
    Match.when({ kind: "magic_item" }, unsupportedSpellRoot),
    Match.when({ kind: "armor" }, unsupportedSpellRoot),
    Match.when({ kind: "armor_template" }, unsupportedSpellRoot),
    Match.when({ kind: "shield" }, unsupportedSpellRoot),
    Match.when({ kind: "shield_template" }, unsupportedSpellRoot),
    Match.when({ kind: "weapon_template" }, unsupportedSpellRoot),
    Match.when({ kind: "weapon" }, unsupportedSpellRoot),
    Match.exhaustive,
  );
}

export function projectCharacterSheetSpellSource(
  unit: UnitRecord,
): Option.Option<CharacterSheetSpellSource> {
  const projection = projectCharacterSheetSpell(unit);
  return projection.tag === "readable"
    ? Option.some({ unitId: unit.id, ...projection.value })
    : Option.none();
}

export function projectPartialCharacterSheetSpell(
  unit: UnitRecord,
): PartialCharacterSheetSpellProjectionResult {
  const projection = projectCharacterSheetSpell(unit);
  if (projection.tag !== "readable") {
    return spellRootIssue("unsupportedSpellRoot", projection.issues[0].message);
  }
  const issues = partialSpellBranchIssues(projection.value.mechanics);
  const firstIssue = issues[0];
  if (firstIssue !== undefined) {
    return { tag: "unreadable", issues: [firstIssue, ...issues.slice(1)] };
  }
  if (!isPartialSpellMechanics(projection.value.mechanics)) {
    return spellRootIssue(
      "completeSpellRoot",
      "This spell root has no structurally partial Character Sheet projection.",
    );
  }
  return {
    tag: "readable",
    value: {
      projection: projection.value,
      evidence: spellEvidence(projection.value.mechanics),
    },
  };
}

function isPartialSpellMechanics(
  mechanics: CharacterSheetSpellMechanics,
): boolean {
  return Match.value(mechanics).pipe(
    Match.when({ family: "activation" }, isPartialActivation),
    Match.when({ family: "ongoing_effect" }, isPartialOngoingEffect),
    Match.when({ family: "templated_multi_spawn" }, isPartialTemplatedSpawn),
    Match.when({ family: "spawned_creature" }, isPartialSpawnedCreature),
    Match.when({ family: "modal_ongoing_effect" }, () => false),
    Match.when({ family: "modal_activation" }, () => false),
    Match.when({ family: "triggered_reaction" }, () => false),
    Match.when({ family: "passive_hit_intercept" }, () => false),
    Match.when({ family: "anchored_trigger" }, () => false),
    Match.when({ family: "magic_circle_ward" }, () => false),
    Match.when({ family: "stone_merge" }, () => false),
    Match.when({ family: "glyph_warding" }, () => false),
    Match.when({ family: "reanimated_creature" }, () => false),
    Match.when({ family: "object_repair" }, () => false),
    Match.when({ family: "minor_magic_effect_menu" }, () => false),
    Match.exhaustive,
  );
}

function isPartialActivation(mechanics: Activation): boolean {
  return (
    hasRestBenefitCandidate(mechanics) ||
    (mechanics.level === 5 &&
      mechanics.phases.some((phase) =>
        Match.value(phase).pipe(
          Match.when({ kind: "direct" }, (direct) =>
            isSheetDirectPhase(mechanics, direct),
          ),
          Match.when({ kind: "save_gate" }, (save) =>
            isSheetSavePhase(mechanics, save),
          ),
          Match.when({ kind: "attack_roll" }, () => false),
          Match.when({ kind: "ability_check_gate" }, () => false),
          Match.when({ kind: "random_table" }, () => false),
          Match.exhaustive,
        ),
      ))
  );
}

function hasRestBenefitCandidate(mechanics: Activation): boolean {
  return mechanics.phases.some(
    (phase) =>
      phase.kind === "direct" &&
      (phase.effects ?? []).some(
        (effect) =>
          effect.kind === "grant_rest_benefit" ||
          effect.kind === "spell_recipient_rest_lockout",
      ),
  );
}

function isSheetDirectPhase(
  mechanics: Activation,
  phase: DirectPhase,
): boolean {
  const effects = phase.effects ?? [];
  return (
    effects.some(isSheetDirectEffect) ||
    (effects.length === 1 &&
      effects[0]?.kind === "none" &&
      isSheetNoEffectActivation(mechanics, phase.attachment.kind))
  );
}

function isSheetDirectEffect(effect: DirectEffect): boolean {
  return (
    SHEET_DIRECT_EFFECT_KINDS.has(effect.kind) ||
    (effect.kind === "apply_condition" && effect.condition === "invisible")
  );
}

function isSheetNoEffectActivation(
  mechanics: Activation,
  attachmentKind: DirectPhase["attachment"]["kind"],
): boolean {
  return (
    attachmentKind === "self" ||
    attachmentKind === "location" ||
    attachmentKind === "area" ||
    (attachmentKind === "hole" &&
      (mechanics.range.kind === "touch" || mechanics.range.kind === "point"))
  );
}

function isSheetSavePhase(mechanics: Activation, phase: SavePhase): boolean {
  return (
    SHEET_SAVE_FAILURE_KINDS.has(phase.onFail.kind) ||
    (phase.onFail.kind === "composite" && phase.attachment.kind === "self") ||
    (phase.onFail.kind === "apply_condition" &&
      isSheetSaveCondition(phase.onFail.condition)) ||
    (phase.onFail.kind === "none" && mechanics.duration.kind === "slot_tiered")
  );
}

function isSheetSaveCondition(
  condition: Extract<
    Extract<
      Activation["phases"][number],
      { readonly kind: "save_gate" }
    >["onFail"],
    { readonly kind: "apply_condition" }
  >["condition"],
): boolean {
  return (
    condition === "charmed" ||
    (Array.isArray(condition) && condition.includes("incapacitated"))
  );
}

function isPartialOngoingEffect(mechanics: OngoingEffect): boolean {
  const kinds = mechanics.operations.map((operation) => operation.effect.kind);
  return (
    kinds.includes("prevent_creature_passage") ||
    kinds.includes("choose_effect_mode") ||
    kinds.includes("block_travel")
  );
}

function isPartialTemplatedSpawn(mechanics: TemplatedSpawn): boolean {
  return (
    mechanics.capacity.kind === "caster_ability_modifier" &&
    mechanics.duration.kind === "concentration" &&
    mechanics.revertOnZeroHp
  );
}

function isPartialSpawnedCreature(mechanics: SpawnedCreature): boolean {
  return (
    isPotentialSpawnedCreature(mechanics) &&
    mechanics.control !== undefined &&
    mechanics.dismissal.onZeroHp === "disappears" &&
    mechanics.dismissal.onSpellEnd === "disappears"
  );
}

function isPotentialSpawnedCreature(mechanics: SpawnedCreature): boolean {
  return mechanics.level === 5 && mechanics.creature.kind === "inline";
}

function partialSpellBranchIssues(
  mechanics: CharacterSheetSpellMechanics,
): readonly PartialCharacterSheetSpellProjectionIssue[] {
  return Match.value(mechanics).pipe(
    Match.when({ family: "activation" }, activationBranchIssues),
    Match.when({ family: "ongoing_effect" }, ongoingBranchIssues),
    Match.when({ family: "templated_multi_spawn" }, templatedSpawnBranchIssues),
    Match.when({ family: "spawned_creature" }, spawnedCreatureBranchIssues),
    Match.when({ family: "modal_ongoing_effect" }, () => []),
    Match.when({ family: "modal_activation" }, () => []),
    Match.when({ family: "triggered_reaction" }, () => []),
    Match.when({ family: "passive_hit_intercept" }, () => []),
    Match.when({ family: "anchored_trigger" }, () => []),
    Match.when({ family: "magic_circle_ward" }, () => []),
    Match.when({ family: "stone_merge" }, () => []),
    Match.when({ family: "glyph_warding" }, () => []),
    Match.when({ family: "reanimated_creature" }, () => []),
    Match.when({ family: "object_repair" }, () => []),
    Match.when({ family: "minor_magic_effect_menu" }, () => []),
    Match.exhaustive,
  );
}

function activationBranchIssues(
  mechanics: Activation,
): readonly PartialCharacterSheetSpellProjectionIssue[] {
  if (!isPotentialSheetActivation(mechanics)) return [];
  const issues: PartialCharacterSheetSpellProjectionIssue[] = [];
  if (mechanics.phases.length !== 1) {
    issues.push(
      branchIssue(
        [occurrence("procedure", 1)],
        "A Character Sheet spell profile requires one activation phase.",
      ),
    );
  }
  issues.push(...activationDurationBranchIssues(mechanics.duration));
  const phase = mechanics.phases[0];
  if (phase !== undefined)
    issues.push(...activationPhaseBranchIssues(mechanics, phase));
  return issues;
}

function activationPhaseBranchIssues(
  mechanics: Activation,
  phase: Activation["phases"][number],
): readonly PartialCharacterSheetSpellProjectionIssue[] {
  return Match.value(phase).pipe(
    Match.when({ kind: "direct" }, (direct) =>
      directPhaseBranchIssues(mechanics, direct),
    ),
    Match.when({ kind: "save_gate" }, (save) =>
      savePhaseBranchIssues(mechanics, save),
    ),
    Match.when({ kind: "attack_roll" }, () => []),
    Match.when({ kind: "ability_check_gate" }, () => []),
    Match.when({ kind: "random_table" }, () => []),
    Match.exhaustive,
  );
}

function directPhaseBranchIssues(
  mechanics: Activation,
  phase: DirectPhase,
): readonly PartialCharacterSheetSpellProjectionIssue[] {
  const effects = phase.effects ?? [];
  if (isSheetReincarnationPhase(mechanics, phase)) {
    return reincarnationPhaseBranchIssues(effects);
  }
  const ownedCandidateKind = effects.find((effect) =>
    SHEET_OWNED_DIRECT_EFFECT_KINDS.has(effect.kind),
  )?.kind;
  if (ownedCandidateKind !== undefined) {
    return ownedDirectPhaseBranchIssues(effects, ownedCandidateKind);
  }
  if (hasUnsupportedNoEffectAttachment(mechanics, phase, effects)) {
    return [
      branchIssue(
        [occurrence("procedure", 1), occurrence("generalFact", 1)],
        "The activation phase has an unsupported attachment branch.",
      ),
    ];
  }
  return isSheetDirectPhase(mechanics, phase) ||
    effects.some((effect) => effect.kind === "grant_rest_benefit")
    ? []
    : [
        branchIssue(
          [occurrence("procedure", 1), occurrence("effect", 1)],
          "The activation phase has an unsupported effect branch.",
        ),
      ];
}

function reincarnationPhaseBranchIssues(
  effects: readonly DirectEffect[],
): readonly PartialCharacterSheetSpellProjectionIssue[] {
  if (effects.length === 1 && effects[0]?.kind === "none") return [];
  return [
    branchIssue(
      [occurrence("procedure", 1), occurrence("effect", 1)],
      "The Character Sheet reincarnation phase requires one explicit no-op effect.",
    ),
  ];
}

function ownedDirectPhaseBranchIssues(
  effects: readonly DirectEffect[],
  ownedCandidateKind: DirectEffectSetCandidateKind,
): readonly PartialCharacterSheetSpellProjectionIssue[] {
  const validation = validateOwnedEffectSet(effects, ownedCandidateKind);
  const issues = validation.unsupportedIndices.map((unsupportedEffectIndex) =>
    branchIssue(
      [
        occurrence("procedure", 1),
        occurrence("effect", unsupportedEffectIndex + 1),
      ],
      "The Character Sheet-owned phase has an unsupported effect branch.",
    ),
  );
  if (validation.missingRequired) {
    issues.push(
      branchIssue(
        [occurrence("procedure", 1)],
        "The Character Sheet-owned phase is missing a required effect branch.",
      ),
    );
  }
  return issues;
}

function hasUnsupportedNoEffectAttachment(
  mechanics: Activation,
  phase: DirectPhase,
  effects: readonly DirectEffect[],
): boolean {
  return (
    effects.length === 1 &&
    effects[0]?.kind === "none" &&
    !isSheetNoEffectActivation(mechanics, phase.attachment.kind)
  );
}

function validateOwnedEffectSet(
  effects: readonly DirectEffect[],
  ownedCandidateKind: DirectEffectSetCandidateKind,
): {
  readonly unsupportedIndices: readonly number[];
  readonly missingRequired: boolean;
} {
  const expectedCounts =
    ownedCandidateKind === "grant_rest_benefit" ||
    ownedCandidateKind === "spell_recipient_rest_lockout"
      ? new Map<DirectEffect["kind"], number>([
          ["heal_hp", 1],
          ["grant_rest_benefit", 1],
          ["spell_recipient_rest_lockout", 1],
        ])
      : new Map<DirectEffect["kind"], number>([[ownedCandidateKind, 1]]);
  const unsupportedIndices: number[] = [];
  for (const [index, effect] of effects.entries()) {
    const remaining = expectedCounts.get(effect.kind) ?? 0;
    if (remaining === 0) {
      unsupportedIndices.push(index);
    } else {
      expectedCounts.set(effect.kind, remaining - 1);
    }
  }
  return {
    unsupportedIndices,
    missingRequired: [...expectedCounts.values()].some(
      (remaining) => remaining > 0,
    ),
  };
}

function savePhaseBranchIssues(
  mechanics: Activation,
  phase: SavePhase,
): readonly PartialCharacterSheetSpellProjectionIssue[] {
  if (isSheetSavePhase(mechanics, phase)) return [];
  const role = phase.onFail.kind === "composite" ? "generalFact" : "effect";
  return [
    branchIssue(
      [occurrence("procedure", 1), occurrence(role, 1)],
      "The save phase has an unsupported represented branch.",
    ),
  ];
}

function isPotentialSheetActivation(mechanics: Activation): boolean {
  return (
    hasRestBenefitCandidate(mechanics) ||
    (mechanics.level === 5 &&
      mechanics.phases.some(
        (phase) =>
          phase.kind === "save_gate" ||
          (phase.kind === "direct" &&
            (phase.effects ?? []).some(
              (effect) => effect.kind === "none" || isSheetDirectEffect(effect),
            )),
      ))
  );
}

function activationDurationBranchIssues(
  duration: Activation["duration"],
): readonly PartialCharacterSheetSpellProjectionIssue[] {
  return Match.value(duration).pipe(
    Match.when({ kind: "instantaneous" }, () => []),
    Match.when({ kind: "timed" }, (timed) =>
      timed.earlyEnd === undefined &&
      (timed.permanentAfter === undefined ||
        timed.value.upcastTiers === undefined)
        ? []
        : [unsupportedDurationIssue([headerFact("duration")])],
    ),
    Match.when({ kind: "concentration" }, (concentration) =>
      concentration.earlyEnd === undefined ||
      concentration.permanentIfMaintainedFull === undefined
        ? []
        : [unsupportedDurationIssue([headerFact("duration")])],
    ),
    Match.when({ kind: "permanent" }, () => []),
    Match.when({ kind: "slot_tiered" }, slotTieredDurationBranchIssues),
    Match.exhaustive,
  );
}

function slotTieredDurationBranchIssues(
  duration: Extract<Activation["duration"], { readonly kind: "slot_tiered" }>,
): readonly PartialCharacterSheetSpellProjectionIssue[] {
  const issues: PartialCharacterSheetSpellProjectionIssue[] = [];
  if (!isPlainTimedDurationBranch(duration.base)) {
    issues.push(
      unsupportedDurationIssue([headerFact("duration"), durationValue()]),
    );
  }
  for (const [index, tier] of duration.tiers.entries()) {
    if (!isPlainTimedDurationBranch(tier.duration)) {
      issues.push(
        unsupportedDurationIssue([
          headerFact("duration"),
          occurrence(
            "extension",
            DURATION_BRANCH_ORDINALS.firstExtension + index,
          ),
        ]),
      );
    }
  }
  return issues;
}

function isPlainTimedDurationBranch(
  duration: Extract<
    Activation["duration"],
    { readonly kind: "slot_tiered" }
  >["base"],
): boolean {
  return (
    duration.kind === "timed" &&
    duration.earlyEnd === undefined &&
    duration.permanentAfter === undefined &&
    duration.value.upcastTiers === undefined
  );
}

function isPlainConcentrationDuration(
  duration: CharacterSheetSpellMechanics["duration"],
): boolean {
  return (
    duration.kind === "concentration" &&
    duration.earlyEnd === undefined &&
    duration.permanentIfMaintainedFull === undefined
  );
}

function unsupportedDurationIssue(
  mechanicsPath: UnitMechanicsPath["nodes"],
): PartialCharacterSheetSpellProjectionIssue {
  return branchIssue(
    mechanicsPath,
    "The Character Sheet spell profile has an unsupported duration branch.",
  );
}

function ongoingBranchIssues(
  mechanics: OngoingEffect,
): readonly PartialCharacterSheetSpellProjectionIssue[] {
  if (!isPartialOngoingEffect(mechanics)) return [];
  return isPlainConcentrationDuration(mechanics.duration)
    ? []
    : [
        branchIssue(
          [headerFact("duration")],
          "An ongoing Character Sheet spell requires Concentration.",
        ),
      ];
}

function templatedSpawnBranchIssues(
  mechanics: TemplatedSpawn,
): readonly PartialCharacterSheetSpellProjectionIssue[] {
  const issues: PartialCharacterSheetSpellProjectionIssue[] = [];
  if (!isPlainConcentrationDuration(mechanics.duration)) {
    issues.push(
      branchIssue(
        [headerFact("duration")],
        "A templated Character Sheet spawn requires Concentration.",
      ),
    );
  }
  if (!mechanics.revertOnZeroHp) {
    issues.push(
      branchIssue(
        [occurrence("effect", 2)],
        "A templated object spawn must revert at 0 Hit Points.",
      ),
    );
  }
  return issues;
}

function spawnedCreatureBranchIssues(
  mechanics: SpawnedCreature,
): readonly PartialCharacterSheetSpellProjectionIssue[] {
  if (!isPotentialSpawnedCreature(mechanics)) return [];
  const issues: PartialCharacterSheetSpellProjectionIssue[] = [];
  if (!isPlainConcentrationDuration(mechanics.duration)) {
    issues.push(
      branchIssue(
        [headerFact("duration")],
        "A Character Sheet spawned creature requires Concentration.",
      ),
    );
  }
  if (mechanics.control === undefined) {
    issues.push(
      branchIssue(
        [occurrence("procedure", 1)],
        "A Character Sheet spawned creature requires control facts.",
      ),
    );
  }
  if (
    mechanics.dismissal.onZeroHp !== "disappears" ||
    mechanics.dismissal.onSpellEnd !== "disappears"
  ) {
    issues.push(
      branchIssue(
        [occurrence("effect", 2)],
        "A spawned creature must use the supported correlated dismissal branch.",
      ),
    );
  }
  return issues;
}

function spellEvidence(
  mechanics: CharacterSheetSpellMechanics,
): PartialCharacterSheetSpellProjection["evidence"] {
  return [
    evidence("consumed", [headerFact("level")], "spell level"),
    evidence("consumed", [headerFact("school")], "spell school"),
    evidence("consumed", [headerFact("range")], "spell range"),
    evidence("consumed", [headerFact("components")], "spell components"),
    ...componentEvidence(mechanics.components),
    evidence("consumed", [headerFact("duration")], "spell duration"),
    ...durationEvidence(mechanics.duration),
    evidence("consumed", [headerFact("castingTime")], "casting time"),
    evidence("consumed", [headerFact("family")], "mechanics family"),
    ...familyEvidence(mechanics),
  ];
}

function componentEvidence(
  components: CharacterSheetSpellComponents,
): readonly CharacterSheetSpellPathEvidence[] {
  if (components.material.kind === "absent") return [];
  const entries: CharacterSheetSpellPathEvidence[] = [];
  if (Option.isSome(components.material.costGp)) {
    entries.push(
      evidence(
        "consumed",
        [
          headerFact("components"),
          occurrence("resource", MATERIAL_BRANCH_ORDINALS.cost),
        ],
        "material component cost",
      ),
    );
  }
  if (components.material.consumed) {
    entries.push(
      evidence(
        "consumed",
        [
          headerFact("components"),
          occurrence("effect", MATERIAL_BRANCH_ORDINALS.consumption),
        ],
        "material component consumption",
      ),
    );
  }
  return entries;
}

function durationEvidence(
  duration: CharacterSheetSpellMechanics["duration"],
): readonly CharacterSheetSpellPathEvidence[] {
  return Match.value(duration).pipe(
    Match.when({ kind: "instantaneous" }, () => []),
    Match.when({ kind: "timed" }, timedDurationEvidence),
    Match.when({ kind: "concentration" }, concentrationDurationEvidence),
    Match.when({ kind: "permanent" }, permanentDurationEvidence),
    Match.when({ kind: "slot_tiered" }, slotTieredDurationEvidence),
    Match.exhaustive,
  );
}

function timedDurationEvidence(
  duration: Extract<
    CharacterSheetSpellMechanics["duration"],
    { readonly kind: "timed" }
  >,
): readonly CharacterSheetSpellPathEvidence[] {
  const entries: CharacterSheetSpellPathEvidence[] = [
    evidence(
      "consumed",
      [headerFact("duration"), durationValue()],
      "duration limit",
    ),
  ];
  for (const [index] of (duration.value.upcastTiers ?? []).entries()) {
    entries.push(
      evidence(
        "consumed",
        [
          headerFact("duration"),
          occurrence(
            "extension",
            DURATION_BRANCH_ORDINALS.firstExtension + index,
          ),
        ],
        "duration upcast tier",
      ),
    );
  }
  for (const [index] of (duration.earlyEnd ?? []).entries()) {
    entries.push(
      evidence(
        "consumed",
        [
          headerFact("duration"),
          occurrence("effect", DURATION_BRANCH_ORDINALS.firstEffect + index),
        ],
        "duration early ending",
      ),
    );
  }
  if (duration.permanentAfter !== undefined) {
    const earlyEndCount = duration.earlyEnd?.length ?? 0;
    entries.push(
      evidence(
        "consumed",
        [
          headerFact("duration"),
          occurrence(
            "effect",
            DURATION_BRANCH_ORDINALS.firstEffect + earlyEndCount,
          ),
        ],
        "permanent casting cadence",
      ),
    );
  }
  return entries;
}

function concentrationDurationEvidence(
  duration: Extract<
    CharacterSheetSpellMechanics["duration"],
    { readonly kind: "concentration" }
  >,
): readonly CharacterSheetSpellPathEvidence[] {
  const entries: CharacterSheetSpellPathEvidence[] = [
    evidence(
      "consumed",
      [headerFact("duration"), durationValue()],
      "duration limit",
    ),
  ];
  for (const [index] of (duration.earlyEnd ?? []).entries()) {
    entries.push(
      evidence(
        "consumed",
        [
          headerFact("duration"),
          occurrence("effect", DURATION_BRANCH_ORDINALS.firstEffect + index),
        ],
        "duration early ending",
      ),
    );
  }
  if (duration.permanentIfMaintainedFull === true) {
    const earlyEndCount = duration.earlyEnd?.length ?? 0;
    entries.push(
      evidence(
        "consumed",
        [
          headerFact("duration"),
          occurrence(
            "effect",
            DURATION_BRANCH_ORDINALS.firstEffect + earlyEndCount,
          ),
        ],
        "maintained permanent duration",
      ),
    );
  }
  return entries;
}

function permanentDurationEvidence(
  duration: Extract<
    CharacterSheetSpellMechanics["duration"],
    { readonly kind: "permanent" }
  >,
): readonly CharacterSheetSpellPathEvidence[] {
  return (duration.endsOn ?? []).map((_, index) =>
    evidence(
      "consumed",
      [
        headerFact("duration"),
        occurrence("effect", DURATION_BRANCH_ORDINALS.firstEffect + index),
      ],
      "permanent duration ending",
    ),
  );
}

function slotTieredDurationEvidence(
  duration: Extract<
    CharacterSheetSpellMechanics["duration"],
    { readonly kind: "slot_tiered" }
  >,
): readonly CharacterSheetSpellPathEvidence[] {
  return [
    evidence(
      "consumed",
      [headerFact("duration"), durationValue()],
      "duration limit",
    ),
    ...duration.tiers.map((_, index) =>
      evidence(
        "consumed",
        [
          headerFact("duration"),
          occurrence(
            "extension",
            DURATION_BRANCH_ORDINALS.firstExtension + index,
          ),
        ],
        "duration upcast tier",
      ),
    ),
  ];
}

function familyEvidence(
  mechanics: CharacterSheetSpellMechanics,
): readonly CharacterSheetSpellPathEvidence[] {
  return Match.value(mechanics).pipe(
    Match.when({ family: "activation" }, activationEvidence),
    Match.when({ family: "ongoing_effect" }, ongoingEvidence),
    Match.when({ family: "templated_multi_spawn" }, templatedSpawnEvidence),
    Match.when({ family: "spawned_creature" }, spawnedCreatureEvidence),
    Match.when({ family: "modal_ongoing_effect" }, () => []),
    Match.when({ family: "modal_activation" }, () => []),
    Match.when({ family: "triggered_reaction" }, () => []),
    Match.when({ family: "passive_hit_intercept" }, () => []),
    Match.when({ family: "anchored_trigger" }, () => []),
    Match.when({ family: "magic_circle_ward" }, () => []),
    Match.when({ family: "stone_merge" }, () => []),
    Match.when({ family: "glyph_warding" }, () => []),
    Match.when({ family: "reanimated_creature" }, () => []),
    Match.when({ family: "object_repair" }, () => []),
    Match.when({ family: "minor_magic_effect_menu" }, () => []),
    Match.exhaustive,
  );
}

function activationEvidence(
  mechanics: Activation,
): readonly CharacterSheetSpellPathEvidence[] {
  return mechanics.phases.flatMap((phase, index) => {
    const ordinal = index + 1;
    const entries: CharacterSheetSpellPathEvidence[] = [
      evidence(
        "consumed",
        [occurrence("procedure", ordinal)],
        "activation phase",
      ),
      evidence(
        "consumed",
        [occurrence("procedure", ordinal), occurrence("generalFact", 1)],
        "phase attachment",
      ),
    ];
    if (phase.kind === "direct") {
      const disposition = ownsExactDirectPhaseEffects(mechanics, phase)
        ? "consumed"
        : "unowned";
      return [
        ...entries,
        ...(phase.effects ?? []).map((_, effectIndex) =>
          evidence(
            disposition,
            [
              occurrence("procedure", ordinal),
              occurrence("effect", effectIndex + 1),
            ],
            "phase effect execution",
          ),
        ),
      ];
    }
    if (phase.kind === "save_gate") {
      for (const [repeatIndex] of (phase.repeatSaves ?? []).entries()) {
        entries.push(
          evidence(
            "unowned",
            [
              occurrence("procedure", ordinal),
              occurrence("procedure", repeatIndex + 1),
            ],
            "repeat saving throw",
          ),
        );
      }
      entries.push(
        evidence(
          "unowned",
          [occurrence("procedure", ordinal), occurrence("effect", 1)],
          "phase effect execution",
        ),
      );
    }
    return entries;
  });
}

function ownsExactDirectPhaseEffects(
  mechanics: Activation,
  phase: DirectPhase,
): boolean {
  const effects = phase.effects ?? [];
  return (
    ownsExactRestBenefitEffects(effects) ||
    ownsSingleDirectEffect(effects) ||
    ownsReincarnationNoEffect(mechanics, phase, effects)
  );
}

function ownsExactRestBenefitEffects(
  effects: readonly DirectEffect[],
): boolean {
  if (effects.length !== 3) return false;
  const validation = validateOwnedEffectSet(effects, "grant_rest_benefit");
  return (
    validation.unsupportedIndices.length === 0 && !validation.missingRequired
  );
}

function ownsSingleDirectEffect(effects: readonly DirectEffect[]): boolean {
  if (effects.length !== 1) return false;
  return (
    effects[0]?.kind === "remove_condition" ||
    effects[0]?.kind === "revive_dead_creature"
  );
}

function ownsReincarnationNoEffect(
  mechanics: Activation,
  phase: DirectPhase,
  effects: readonly DirectEffect[],
): boolean {
  return (
    effects.length === 1 &&
    effects[0]?.kind === "none" &&
    isSheetReincarnationPhase(mechanics, phase)
  );
}

function isSheetReincarnationPhase(
  mechanics: Activation,
  phase: DirectPhase,
): boolean {
  if (
    mechanics.range.kind !== "touch" ||
    mechanics.duration.kind !== "instantaneous" ||
    phase.attachment.kind !== "hole"
  ) {
    return false;
  }
  return hasDeadHumanoidSelection(phase.attachment.value);
}

function hasDeadHumanoidSelection(
  selection: Extract<
    Extract<
      Activation["phases"][number],
      { readonly kind: "direct" }
    >["attachment"],
    { readonly kind: "hole" }
  >["value"],
): boolean {
  return (
    selection.kind === "target" &&
    "stateFilter" in selection.selection &&
    "typeFilter" in selection.selection &&
    selection.selection.stateFilter?.some((state) => state === "dead") ===
      true &&
    selection.selection.typeFilter?.some((type) => type === "humanoid") === true
  );
}

function ongoingEvidence(
  mechanics: OngoingEffect,
): readonly CharacterSheetSpellPathEvidence[] {
  const entries: CharacterSheetSpellPathEvidence[] = [
    evidence("consumed", [occurrence("effect", 1)], "ongoing attachment"),
  ];
  if (mechanics.initialPhase !== undefined) {
    entries.push(
      evidence("consumed", [singleton("action")], "ongoing initial phase"),
    );
  }
  for (const [index] of mechanics.operations.entries()) {
    entries.push(
      evidence(
        "unowned",
        [occurrence("procedure", index + 1), occurrence("effect", 1)],
        "ongoing operation execution",
      ),
    );
  }
  return entries;
}

function templatedSpawnEvidence(
  mechanics: TemplatedSpawn,
): readonly CharacterSheetSpellPathEvidence[] {
  return [
    evidence("consumed", [singleton("resource")], "spawn capacity"),
    evidence(
      "consumed",
      [occurrence("effect", 1)],
      "spawn stat block execution",
    ),
    ...mechanics.sizeTiers.map((_, index) =>
      evidence(
        "consumed",
        [occurrence("extension", index + 1)],
        "spawn size tier",
      ),
    ),
    evidence(
      "unowned",
      [occurrence("procedure", 1)],
      "spawn control execution",
    ),
    evidence("unowned", [occurrence("effect", 2)], "zero-hit-point reversion"),
  ];
}

function spawnedCreatureEvidence(
  mechanics: SpawnedCreature,
): readonly CharacterSheetSpellPathEvidence[] {
  const entries: CharacterSheetSpellPathEvidence[] = [
    evidence(
      "consumed",
      [occurrence("effect", 1)],
      "spawned creature execution",
    ),
  ];
  if (mechanics.control !== undefined) {
    entries.push(
      evidence(
        "unowned",
        [occurrence("procedure", 1)],
        "spawn control execution",
      ),
    );
  }
  entries.push(
    evidence("unowned", [occurrence("effect", 2)], "spawn dismissal"),
  );
  return entries;
}

type PathNode = MechanicsGraphPathNode;
type PathTail = readonly [PathNode, ...PathNode[]];

function evidence(
  disposition: CharacterSheetSpellPathDisposition,
  tail: PathTail,
  branch: CharacterSheetSpellEvidenceBranch,
): CharacterSheetSpellPathEvidence {
  return {
    disposition,
    branch,
    mechanicsPath: unitMechanicsPath([
      { kind: "singleton", role: "recordMechanics" },
      ...tail,
    ]),
  };
}

function occurrence(role: MechanicsGraphNodeRole, ordinal: number) {
  return {
    kind: "occurrence" as const,
    role,
    ordinal: PositiveInteger(ordinal),
  };
}

function singleton(role: MechanicsGraphNodeRole) {
  return { kind: "singleton" as const, role };
}

function headerFact(field: keyof typeof SPELL_HEADER_FACT_ORDINALS) {
  return occurrence("generalFact", SPELL_HEADER_FACT_ORDINALS[field]);
}

function durationValue() {
  return occurrence("generalFact", DURATION_BRANCH_ORDINALS.value);
}

function branchIssue(
  tail: PathTail,
  message: string,
): PartialCharacterSheetSpellProjectionIssue {
  return {
    code: "unsupportedSpellBranch",
    mechanicsPath: unitMechanicsPath([
      { kind: "singleton", role: "recordMechanics" },
      ...tail,
    ]),
    message,
  };
}

function spellRootIssue(
  code: PartialCharacterSheetSpellProjectionIssueCode,
  message: string,
): PartialCharacterSheetSpellProjectionResult {
  return {
    tag: "unreadable",
    issues: [
      {
        code,
        mechanicsPath: unitMechanicsPath([
          { kind: "singleton", role: "recordMechanics" },
        ]),
        message,
      },
    ],
  };
}

function projectSpellAdmissionFacts(
  spell: SpellRecord,
): CharacterSheetSpellFacts {
  const {
    id: _id,
    kind: _kind,
    name: _name,
    provenance: _provenance,
    mechanics,
    ...facts
  } = spell;
  return { ...facts, mechanics: projectSpellAdmissionMechanics(mechanics) };
}

function projectSpellAdmissionMechanics(
  mechanics: SpellMechanics,
): CharacterSheetSpellMechanics {
  const { components, ...facts } = mechanics;
  return {
    ...facts,
    components: projectSpellComponents(components),
  };
}

function projectSpellComponents(
  components: SpellMechanics["components"],
): CharacterSheetSpellComponents {
  if (components.m === false) {
    return { v: components.v, s: components.s, material: { kind: "absent" } };
  }
  return {
    v: components.v,
    s: components.s,
    material: {
      kind: "present",
      costGp:
        "materialCostGp" in components
          ? Option.fromNullishOr(components.materialCostGp)
          : Option.none(),
      consumed:
        "materialConsumed" in components &&
        components.materialConsumed === true,
    },
  };
}

function unsupportedSpellRoot(unit: UnitRecord): UnitReaderResult<never> {
  return {
    tag: "unreadable",
    issues: [
      {
        code: "unsupportedUnitKind",
        message: `Expected a Character Sheet Spell Definition, received ${unit.kind}.`,
        unitId: unit.id,
      },
    ],
  };
}
