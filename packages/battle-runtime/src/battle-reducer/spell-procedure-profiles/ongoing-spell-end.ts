import { maybeOpenSpellCastReactionWindow } from "../spell-cast-reaction-window.ts";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type {
  ActivationPhase,
  Components,
  SpellMechanics,
} from "@dnd/surface/surface/types";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ongoing-spell-ending
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.DISPEL_MAGIC_ONGOING_SPELL_ENDING
//
// The Dispel Magic ongoing-spell ending Spell Procedure Profile: action-time
// level-3-or-higher Spell Slot casting selects one creature, object, or
// magical-effect target within 120 feet, ends tracked ongoing spell effects at
// or below the slot level, and gates higher-level tracked effects behind a
// spellcasting Ability Check against DC 10 + the tracked spell level.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-A-D.md "Dispel Magic":
//     Action; 120 feet; V/S; instantaneous; choose one creature, object, or
//     magical effect within range; ongoing spells of level 3 or lower end;
//     higher-level ongoing spells require a spellcasting Ability Check against
//     DC 10 plus the spell level; higher-level slots automatically end spells
//     whose level is equal to or below the slot level.
//   - .references/srd-5.2.1/Spells/Descriptions-A-D.md "Antimagic Field":
//     Dispel Magic has no effect on the aura.
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Ability Check, Spell Slot, Spell
//     Invocation, Spell Effect, and Battle Runtime Boundaries.

import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  difficultyClass,
  movementFeet,
  PositiveInteger,
  type DifficultyClass as DifficultyClassType,
} from "@dnd/shared/types";
import {
  type ActionSpellBattleResolutionInput,
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleActiveEffect,
  type BattleCreatureState,
  type BattleMagicSuppressionOngoingSpellEffectRef,
  type BattleOngoingSpellEffectRef,
  type BattleOngoingSpellTarget,
  type BattleOngoingSpellTargetChoiceHole,
  type BattleOngoingSpellTargetWithinRangeFact,
  type BattleResolutionResult,
  type BattleSpellcastingAbilityCheckHole,
  type BattleState,
  type BattleTrackedOngoingSpellLightEmitter,
  type BattleSpellExecutionSource,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import {
  battleEffectExecutionRefBelongsToScope,
  type BattleProcedureExecutionRef,
  type CombatantId,
} from "../../identity.ts";

import { needsHolesResult } from "../needs-holes-result.ts";
import { invalidResult, resolutionFromStateResult } from "../result-helpers.ts";
import {
  isTrackedOngoingSpellLightEmitter,
  magicSuppressionOngoingSpellEffectRefForActiveEffect,
  magicSuppressionOngoingSpellEffectRefForEmitter,
  ongoingSpellEffectRefEquals,
  ongoingSpellEffectRefForMagicSuppressionEmanation,
  ongoingSpellEffectRefForActiveEffect,
  ongoingSpellEffectRefForEmitter,
  ongoingSpellEffectRefKey,
} from "../magic-suppression-ongoing-effect.ts";
import { combatantsAfterConcentrationSpellEffectsEndedIfNoEffects } from "../spell-condition-effects-helpers.ts";
import type { BattleSpellEffectLevel } from "../spells-effective-level.ts";
import type { SpellFillSet } from "../spells-resolve-fill-set.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import { effectiveD20TestNaturalOneRerollAbilityCheckValue } from "../d20-test-natural-one-reroll.ts";
import { characterRetainedSpellProcedureExecution } from "../../character-execution-queries.ts";
import { spellInvocationEffectiveSpellLevel } from "../spells-effective-level.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
} from "./profile.ts";
import { Match, Schema } from "effect";
import {
  SpellRuleExecutionFactsSchema,
  spellInvocationResourceForCastOption,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  admitSpellTargetAttachment,
  spellConsumedMaterialEvidencePaths,
  spellMechanicsObjectHasOnlyKeys,
  spellProcedureHasRedundantSignature,
  spellProcedureMapNonEmpty,
  spellProcedureNonEmpty,
  spellUniqueMechanicsIssues,
  type SpellAttachmentRejection,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureAdmissionIssue,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsFacts,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  DifficultyClass,
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type OngoingSpellEndInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "ongoingSpellEnd" }
>;
type OngoingSpellEndMechanics = Extract<
  SpellMechanics,
  { readonly family: "activation" }
>;
type OngoingSpellEndMechanicsFacts = SpellProcedureMechanicsFacts & {
  readonly rangeFeet: ReturnType<typeof movementFeet>;
  readonly abilityCheckDcBase: DifficultyClassType;
};

const ONGOING_SPELL_END_LEVEL = 3 as const;
const ONGOING_SPELL_END_RANGE_FEET = 120 as const;
const ONGOING_SPELL_END_TARGET_KINDS = [
  "creature",
  "object",
  "magical_effect",
] as const;
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Canonical source for OngoingSpellEndFailedFact.
const ONGOING_SPELL_END_FAILED_FACTS = [
  "mechanics",
  "level",
  "school",
  "range",
  "components",
  "duration",
  "castingTime",
  "phaseCount",
  "phase",
  "phaseOrder",
  "attachmentKind",
  "attachmentShape",
  "selection",
  "selectionMode",
  "selectionTargetKinds",
  "typeFilter",
  "stateFilter",
  "visibility",
  "creatureSizeFilter",
  "relativePosition",
  "objectFilter",
  "creatureDisposition",
  "objectOrLocationMaxDimensionFeet",
  "repeatsAllowed",
  "castingRequirement",
  "disposition",
  "directEffectCount",
  "directEffect",
  "directMaxSpellLevel",
  "checkAbility",
  "checkSkill",
  "checkDc",
  "checkOnPass",
  "checkOnFail",
  "checkAutoSuccess",
  "phaseShape",
] as const;
type OngoingSpellEndFailedFact =
  (typeof ONGOING_SPELL_END_FAILED_FACTS)[number];
type OngoingSpellEndIssue = SpellProcedureAdmissionIssue<
  "ongoingSpellEnd",
  OngoingSpellEndFailedFact,
  UnitMechanicsPath
>;
type IssueFact = {
  readonly failedFact: OngoingSpellEndFailedFact;
  readonly mechanicsPath: UnitMechanicsPath;
};

const ROOT_FIELDS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "castingTime",
  "family",
  "phases",
] as const satisfies ReadonlyArray<keyof OngoingSpellEndMechanics>;
type ComponentKeySpace = Pick<Components, "v" | "s" | "m"> & {
  readonly materialCostGp?: unknown;
  readonly materialConsumed?: unknown;
};
const COMPONENT_FIELDS = [
  "v",
  "s",
  "m",
  "materialCostGp",
  "materialConsumed",
] as const satisfies ReadonlyArray<keyof ComponentKeySpace>;
const RANGE_FIELDS = ["kind", "feet"] as const;
const DURATION_FIELDS = ["kind"] as const;
const CASTING_TIME_FIELDS = ["kind"] as const;
const DIRECT_FIELDS = ["kind", "attachment", "effects", "mode"] as const;
const CHECK_FIELDS = [
  "kind",
  "attachment",
  "ability",
  "skill",
  "dc",
  "onPass",
  "onFail",
  "autoSuccessIfCasterSlotGte",
] as const;
const EFFECT_FIELDS = ["kind", "maxSpellLevel"] as const;

function issue(
  failedFact: OngoingSpellEndFailedFact,
  mechanicsPath: UnitMechanicsPath,
): OngoingSpellEndIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "ongoingSpellEnd",
    failedFact,
    mechanicsPath,
    message: `Unsupported ongoingSpellEnd mechanics fact: ${failedFact}.`,
  };
}

function isRepresentation(
  mechanics: SpellMechanics,
): mechanics is OngoingSpellEndMechanics {
  return Match.value(mechanics).pipe(
    Match.when({ family: "activation" }, (activation) =>
      spellProcedureHasRedundantSignature({
        kind: "oneOfFiveWitnessesMayBeMissing",
        witnesses: [
          {
            name: "header",
            present:
              activation.level === ONGOING_SPELL_END_LEVEL &&
              activation.school === "abjuration" &&
              activation.castingTime.kind === "action",
          },
          {
            name: "range",
            present:
              activation.range.kind === "point" &&
              activation.range.feet === ONGOING_SPELL_END_RANGE_FEET,
          },
          {
            name: "instantaneous",
            present:
              activation.duration.kind === "instantaneous" &&
              activation.components.v === true &&
              activation.components.s === true &&
              activation.components.m === false,
          },
          {
            name: "direct",
            present: activation.phases.some(
              (phase) =>
                phase.kind === "direct" &&
                phase.effects?.some(
                  (effect) => effect.kind === "end_ongoing_spells",
                ) === true,
            ),
          },
          {
            name: "check",
            present: activation.phases.some(
              (phase) =>
                phase.kind === "ability_check_gate" &&
                phase.onPass.kind === "end_ongoing_spells",
            ),
          },
        ],
      }),
    ),
    Match.whenOr(
      { family: "ongoing_effect" },
      { family: "modal_ongoing_effect" },
      { family: "modal_activation" },
      { family: "triggered_reaction" },
      { family: "passive_hit_intercept" },
      { family: "anchored_trigger" },
      { family: "magic_circle_ward" },
      { family: "stone_merge" },
      { family: "glyph_warding" },
      { family: "spawned_creature" },
      { family: "reanimated_creature" },
      { family: "templated_multi_spawn" },
      { family: "object_repair" },
      { family: "minor_magic_effect_menu" },
      () => false,
    ),
    Match.exhaustive,
  );
}

function attachmentFact(
  rejection: SpellAttachmentRejection,
  phase: ActivationPhase,
): OngoingSpellEndFailedFact {
  if (rejection.failedFact === "attachment")
    return rejection.coordinate.kind === "wrapper" &&
      rejection.coordinate.field === "kind" &&
      "attachment" in phase &&
      phase.attachment.kind !== "hole"
      ? "attachmentKind"
      : "attachmentShape";
  return Match.value(rejection.failedFact).pipe(
    Match.when("selection", () => "selection" as const),
    Match.when("mode", () => "selectionMode" as const),
    Match.when("targetKinds", () => "selectionTargetKinds" as const),
    Match.whenOr(
      "typeFilter",
      "stateFilter",
      "visibility",
      "creatureSizeFilter",
      "relativePosition",
      "objectFilter",
      "creatureDisposition",
      "objectOrLocationMaxDimensionFeet",
      "repeatsAllowed",
      "castingRequirement",
      "disposition",
      (fact) => fact,
    ),
    Match.whenOr(
      "rangeOrigin",
      "count",
      "shape",
      "origin",
      "occupantDispositionFilter",
      "occupantPerceptionFilter",
      "excludedAreas",
      () => "attachmentShape" as const,
    ),
    Match.exhaustive,
  );
}

function targetKindsSupported(phase: ActivationPhase): boolean {
  if (!("attachment" in phase)) return false;
  const admission = admitSpellTargetAttachment(phase.attachment, [
    "mode",
    "targetKinds",
  ]);
  if (admission.tag !== "admitted") return false;
  const selection = admission.attachment.value.selection;
  return (
    "targetKinds" in selection &&
    selection.targetKinds !== undefined &&
    selection.targetKinds.length === ONGOING_SPELL_END_TARGET_KINDS.length &&
    new Set(selection.targetKinds).size === selection.targetKinds.length &&
    ONGOING_SPELL_END_TARGET_KINDS.every((kind) =>
      new Set<string>(selection.targetKinds).has(kind),
    )
  );
}

function targetModeSupported(phase: ActivationPhase): boolean {
  if (!("attachment" in phase)) return false;
  const admission = admitSpellTargetAttachment(phase.attachment, [
    "mode",
    "targetKinds",
  ]);
  return (
    admission.tag === "admitted" &&
    admission.attachment.value.selection.mode === "one"
  );
}

type Inspection =
  | { readonly tag: "notRepresented" }
  | {
      readonly tag: "unsupported";
      readonly issues: readonly [IssueFact, ...IssueFact[]];
    }
  | {
      readonly tag: "parsed";
      readonly facts: OngoingSpellEndMechanicsFacts;
      readonly evidence: SpellProcedureMechanicsEvidence;
    };
function inspect(source: SpellMechanicsAdmissionSource): Inspection {
  if (!isRepresentation(source.mechanics)) return { tag: "notRepresented" };
  const mechanics = source.mechanics;
  const issues: IssueFact[] = [];
  const push = (
    failedFact: OngoingSpellEndFailedFact,
    mechanicsPath: UnitMechanicsPath,
  ): void => {
    issues.push({ failedFact, mechanicsPath });
  };
  if (!spellMechanicsObjectHasOnlyKeys(mechanics, ROOT_FIELDS))
    push("mechanics", spellMechanicsRootPath());
  if (mechanics.level !== ONGOING_SPELL_END_LEVEL)
    push("level", spellMechanicsHeaderPath("level"));
  if (mechanics.school !== "abjuration")
    push("school", spellMechanicsHeaderPath("school"));
  const rangeFeet =
    mechanics.range.kind === "point" &&
    mechanics.range.feet === ONGOING_SPELL_END_RANGE_FEET &&
    spellMechanicsObjectHasOnlyKeys(mechanics.range, RANGE_FIELDS)
      ? movementFeet(mechanics.range.feet)
      : undefined;
  if (rangeFeet === undefined) push("range", spellMechanicsHeaderPath("range"));
  if (
    mechanics.components.v !== true ||
    mechanics.components.s !== true ||
    mechanics.components.m !== false ||
    !spellMechanicsObjectHasOnlyKeys<ComponentKeySpace>(
      mechanics.components,
      COMPONENT_FIELDS,
    )
  )
    push("components", spellMechanicsHeaderPath("components"));
  for (const path of spellConsumedMaterialEvidencePaths(mechanics.components))
    push("components", path);
  if (
    mechanics.duration.kind !== "instantaneous" ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.duration, DURATION_FIELDS)
  )
    push("duration", spellMechanicsHeaderPath("duration"));
  if (
    mechanics.castingTime.kind !== "action" ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.castingTime, CASTING_TIME_FIELDS)
  )
    push("castingTime", spellMechanicsHeaderPath("castingTime"));

  const occurrences = mechanics.phases.map((phase, index) => ({
    phase,
    ordinal: PositiveInteger(index + 1),
  }));
  const directCandidates = occurrences.filter(
    ({ phase }) => phase.kind === "direct" || "effects" in phase,
  );
  const checkCandidates = occurrences.filter(
    ({ phase }) => phase.kind === "ability_check_gate" || "onPass" in phase,
  );
  const direct =
    directCandidates.length === 1 ? directCandidates[0] : undefined;
  const check = checkCandidates.length === 1 ? checkCandidates[0] : undefined;
  if (mechanics.phases.length !== 2)
    if (mechanics.phases.length === 0)
      push("phaseCount", spellMechanicsRootPath());
    else
      for (const occurrence of occurrences)
        push("phaseCount", spellActivationPhasePath(occurrence.ordinal));
  for (const occurrence of occurrences)
    if (
      !directCandidates.includes(occurrence) &&
      !checkCandidates.includes(occurrence)
    )
      push("phase", spellActivationPhasePath(occurrence.ordinal));
  if (directCandidates.length === 0) push("phase", spellMechanicsRootPath());
  if (checkCandidates.length === 0) push("phase", spellMechanicsRootPath());
  if (directCandidates.length > 1)
    for (const candidate of directCandidates)
      push("phaseCount", spellActivationPhasePath(candidate.ordinal));
  if (checkCandidates.length > 1)
    for (const candidate of checkCandidates)
      push("phaseCount", spellActivationPhasePath(candidate.ordinal));
  for (const directCandidate of directCandidates) {
    const path = spellActivationPhasePath(directCandidate.ordinal);
    if (
      directCandidate.phase.kind !== "direct" ||
      !spellMechanicsObjectHasOnlyKeys(directCandidate.phase, DIRECT_FIELDS)
    )
      push("phase", path);
    if (
      directCandidates.length === 1 &&
      directCandidate.ordinal !== PositiveInteger(1)
    )
      push("phaseOrder", path);
    if ("attachment" in directCandidate.phase) {
      const admission = admitSpellTargetAttachment(
        directCandidate.phase.attachment,
        ["mode", "targetKinds"],
      );
      if (admission.tag === "rejected")
        for (const rejection of admission.rejections)
          push(
            attachmentFact(rejection, directCandidate.phase),
            spellActivationAttachmentPath(directCandidate.ordinal),
          );
    }
    if (!targetKindsSupported(directCandidate.phase))
      push(
        "selectionTargetKinds",
        spellActivationAttachmentPath(directCandidate.ordinal),
      );
    if (!targetModeSupported(directCandidate.phase))
      push(
        "selectionMode",
        spellActivationAttachmentPath(directCandidate.ordinal),
      );
    const effects =
      "effects" in directCandidate.phase
        ? (directCandidate.phase.effects ?? [])
        : [];
    if (effects.length !== 1)
      push(
        "directEffectCount",
        effects.length === 0
          ? path
          : spellActivationEffectPath(
              directCandidate.ordinal,
              PositiveInteger(1),
            ),
      );
    for (const [index, effect] of effects.entries()) {
      const effectPath = spellActivationEffectPath(
        directCandidate.ordinal,
        PositiveInteger(index + 1),
      );
      if (
        effect.kind !== "end_ongoing_spells" ||
        !spellMechanicsObjectHasOnlyKeys(effect, EFFECT_FIELDS)
      )
        push("directEffect", effectPath);
      if (
        effect.kind === "end_ongoing_spells" &&
        effect.maxSpellLevel !== "caster_slot_level"
      )
        push("directMaxSpellLevel", effectPath);
    }
  }
  for (const checkCandidate of checkCandidates) {
    const path = spellActivationPhasePath(checkCandidate.ordinal);
    if (
      checkCandidate.phase.kind !== "ability_check_gate" ||
      !spellMechanicsObjectHasOnlyKeys(checkCandidate.phase, CHECK_FIELDS)
    )
      push("phase", path);
    if (
      checkCandidates.length === 1 &&
      checkCandidate.ordinal !== PositiveInteger(2)
    )
      push("phaseOrder", path);
    if ("attachment" in checkCandidate.phase) {
      const admission = admitSpellTargetAttachment(
        checkCandidate.phase.attachment,
        ["mode", "targetKinds"],
      );
      if (admission.tag === "rejected")
        for (const rejection of admission.rejections)
          push(
            attachmentFact(rejection, checkCandidate.phase),
            spellActivationAttachmentPath(checkCandidate.ordinal),
          );
    }
    if (!targetKindsSupported(checkCandidate.phase))
      push(
        "selectionTargetKinds",
        spellActivationAttachmentPath(checkCandidate.ordinal),
      );
    if (!targetModeSupported(checkCandidate.phase))
      push(
        "selectionMode",
        spellActivationAttachmentPath(checkCandidate.ordinal),
      );
    if (
      !("ability" in checkCandidate.phase) ||
      checkCandidate.phase.ability !== "caster_spellcasting_ability"
    )
      push("checkAbility", path);
    if (
      "skill" in checkCandidate.phase &&
      checkCandidate.phase.skill !== undefined
    )
      push("checkSkill", path);
    if (!("dc" in checkCandidate.phase) || checkCandidate.phase.dc !== 10)
      push("checkDc", path);
    if (
      !("autoSuccessIfCasterSlotGte" in checkCandidate.phase) ||
      checkCandidate.phase.autoSuccessIfCasterSlotGte !== "target_spell_level"
    )
      push("checkAutoSuccess", path);
    if (
      "onFail" in checkCandidate.phase &&
      checkCandidate.phase.onFail !== undefined
    )
      push("checkOnFail", path);
    if (
      !("onPass" in checkCandidate.phase) ||
      checkCandidate.phase.onPass.kind !== "end_ongoing_spells" ||
      !spellMechanicsObjectHasOnlyKeys(
        checkCandidate.phase.onPass,
        EFFECT_FIELDS,
      )
    )
      push(
        "checkOnPass",
        spellActivationEffectPath(checkCandidate.ordinal, PositiveInteger(1)),
      );
    else if (
      checkCandidate.phase.onPass.maxSpellLevel !== "contested_spell_level"
    )
      push(
        "directMaxSpellLevel",
        spellActivationEffectPath(checkCandidate.ordinal, PositiveInteger(1)),
      );
  }
  const unsupported = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (unsupported !== undefined)
    return { tag: "unsupported", issues: unsupported };
  const abilityCheckDcBase =
    check?.phase.kind === "ability_check_gate" && check.phase.dc === 10
      ? difficultyClass(check.phase.dc)
      : undefined;
  if (
    direct === undefined ||
    check === undefined ||
    rangeFeet === undefined ||
    abilityCheckDcBase === undefined
  )
    return {
      tag: "unsupported",
      issues: [
        { failedFact: "mechanics", mechanicsPath: spellMechanicsRootPath() },
      ],
    };
  return {
    tag: "parsed",
    facts: {
      ...source.spellDefinitionRuleFacts,
      rangeFeet,
      abilityCheckDcBase,
    },
    evidence: {
      consumed: [
        spellMechanicsHeaderPath("level"),
        spellMechanicsHeaderPath("school"),
        spellMechanicsHeaderPath("range"),
        spellMechanicsHeaderPath("components"),
        spellMechanicsHeaderPath("duration"),
        spellMechanicsHeaderPath("castingTime"),
        spellMechanicsHeaderPath("family"),
        spellActivationPhasePath(direct.ordinal),
        spellActivationAttachmentPath(direct.ordinal),
        spellActivationEffectPath(direct.ordinal, PositiveInteger(1)),
        spellActivationPhasePath(check.ordinal),
        spellActivationAttachmentPath(check.ordinal),
        spellActivationEffectPath(check.ordinal, PositiveInteger(1)),
      ],
      unowned: [],
    },
  };
}

function admitOngoingSpellEndMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "ongoingSpellEnd",
  OngoingSpellEndMechanicsFacts,
  OngoingSpellEndInvocation,
  OngoingSpellEndIssue
> {
  return Match.value(inspect(source)).pipe(
    Match.when({ tag: "notRepresented" }, () => ({
      tag: "notRepresented" as const,
    })),
    Match.when({ tag: "unsupported" }, ({ issues }) => ({
      tag: "unsupported" as const,
      issues: spellProcedureMapNonEmpty(
        issues,
        ({ failedFact, mechanicsPath }) => issue(failedFact, mechanicsPath),
      ),
    })),
    Match.when({ tag: "parsed" }, ({ facts, evidence }) => ({
      tag: "supported" as const,
      admitted: {
        binding: "ready" as const,
        procedure: "ongoingSpellEnd" as const,
        facts,
        evidence,
        admit: (
          spell: BattleSpellExecutionSource,
          ctx: SpellAdmissionContext,
        ) => admitOngoingSpellEnd(spell, ctx, facts),
      },
    })),
    Match.exhaustive,
  );
}

function admitOngoingSpellEnd(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: OngoingSpellEndMechanicsFacts,
): readonly OngoingSpellEndInvocation[] {
  return ctx.spellCastOptions.flatMap(
    (slot): readonly OngoingSpellEndInvocation[] =>
      Number(slot.spellLevel) < Number(facts.level)
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "ongoingSpellEnd",
              spell,
              actionCost: "magicAction",
              rangeFeet: facts.rangeFeet,
              abilityCheckDcBase: facts.abilityCheckDcBase,
            },
          ],
  );
}

function discoverOngoingSpellEndCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<OngoingSpellEndInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  return [
    {
      subject: {
        tag: "actionSpell",
        actorId,
        procedureRef: invocation.sourceProcedureRef,
        mode: { tag: "cast" },
      },
      initialHoles: [ongoingSpellTargetChoiceHole(state, actorId, invocation)],
    },
  ];
}

const ONGOING_SPELL_TARGET_CHOICE_HOLE_ID = holeId(
  "battle:spell:ongoing-end:target",
);
const ONGOING_SPELL_TARGET_CHOICE_HOLE_INSTANCE = holeInstanceKey(
  "battle:spell:ongoing-end:target",
);

type TrackedDispellableOngoingSpellActiveEffect = Extract<
  BattleActiveEffect,
  {
    readonly kind: "spellObjectContactDamage" | "spatialMeleeSpellAttackProxy";
  }
>;

type BattleTrackedOngoingSpellOccurrence =
  | {
      readonly kind: "lightEmitter";
      readonly ownerId: CombatantId;
      readonly emitter: BattleTrackedOngoingSpellLightEmitter;
      readonly sourceSpellLevel: BattleSpellEffectLevel;
    }
  | {
      readonly kind: "activeEffect";
      readonly ownerId: CombatantId;
      readonly effect: TrackedDispellableOngoingSpellActiveEffect;
      readonly sourceSpellLevel: BattleSpellEffectLevel;
    };
type MagicSuppressionEmanationOngoingSpellEffectRef = Extract<
  BattleOngoingSpellEffectRef,
  { readonly kind: "magicSuppressionEmanation" }
>;
type OngoingSpellEndDispelException =
  | {
      readonly kind: "magicSuppressionAuraNoEffect";
      readonly effect: MagicSuppressionEmanationOngoingSpellEffectRef;
    }
  | {
      readonly kind: "notException";
    }
  | {
      readonly kind: "invalid";
      readonly message: string;
    };

function ongoingSpellTargetChoiceHole(
  state: BattleState,
  casterId: CombatantId,
  invocation: BattleExecutableSpellInvocation<OngoingSpellEndInvocation>,
): BattleOngoingSpellTargetChoiceHole {
  return {
    holeInstanceKey: ONGOING_SPELL_TARGET_CHOICE_HOLE_INSTANCE,
    holeId: ONGOING_SPELL_TARGET_CHOICE_HOLE_ID,
    kind: "ongoingSpellTargetChoice",
    label: "Ongoing spell target",
    requiresTableSpatialFact: true,
    casterId,
    procedureRef: invocation.sourceProcedureRef,
    rangeFeet: invocation.rangeFeet,
    choices: ongoingSpellTargetChoices(state),
  };
}

function ongoingSpellTargetEquals(
  left: BattleOngoingSpellTarget,
  right: BattleOngoingSpellTarget,
): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === "combatant" && right.kind === "combatant") {
    return left.combatantId === right.combatantId;
  }
  if (left.kind === "object" && right.kind === "object") {
    return left.objectId === right.objectId;
  }
  return (
    left.kind === "magicalEffect" &&
    right.kind === "magicalEffect" &&
    ongoingSpellEffectRefEquals(left.effect, right.effect)
  );
}

function ongoingSpellTargetMatchesFact(input: {
  readonly fact: BattleOngoingSpellTargetWithinRangeFact;
  readonly casterId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation<OngoingSpellEndInvocation>;
  readonly target: BattleOngoingSpellTarget;
}): boolean {
  return (
    input.fact.kind === "ongoingSpellTargetWithinRange" &&
    input.fact.casterId === input.casterId &&
    input.fact.sourceProcedureRef === input.invocation.sourceProcedureRef &&
    Number(input.fact.rangeFeet) <= Number(input.invocation.rangeFeet) &&
    ongoingSpellTargetEquals(input.fact.target, input.target)
  );
}

function resolveOngoingSpellEndSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation<OngoingSpellEndInvocation>;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  const unrelatedFill = ongoingSpellEndUnrelatedFill(input.fillSet);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (unrelatedFill !== null) {
    return invalidResult(input.input.state, "invalidFill", unrelatedFill);
  }
  /* v8 ignore stop -- @preserve */
  if (input.fillSet.ongoingSpellTarget === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      ongoingSpellTargetChoiceHole(
        input.input.state,
        input.actorId,
        input.invocation,
      ),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.ongoingSpellTarget.holeId !==
    ONGOING_SPELL_TARGET_CHOICE_HOLE_ID
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Ongoing spell target fill must use the selected spell act target hole.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const selectedTarget = input.fillSet.ongoingSpellTarget.target;
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !input.fillSet.ongoingSpellTarget.spatialFacts.some((fact) =>
      ongoingSpellTargetMatchesFact({
        fact,
        casterId: input.actorId,
        invocation: input.invocation,
        target: selectedTarget,
      }),
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Ongoing spell target does not satisfy the selected spell's range.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const spellCastReactionWindow = maybeOpenSpellCastReactionWindow(
    input,
    selectedTarget.kind === "combatant" ? [selectedTarget.combatantId] : [],
    { kind: "magicAction" },
    undefined,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const dispelException = ongoingSpellEndDispelException(
    input.input.state,
    selectedTarget,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (dispelException.kind === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      dispelException.message,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (dispelException.kind === "magicSuppressionAuraNoEffect") {
    return resolveOngoingSpellEndDispelException({
      state: input.input.state,
      actorId: input.actorId,
      invocation: input.invocation,
      exception: dispelException,
    });
  }

  const targetOccurrences = matchingTrackedOngoingSpellOccurrences(
    input.input.state,
    selectedTarget,
  );
  const casterSlotLevel = Number(
    Match.value(input.invocation.resource).pipe(
      Match.when({ tag: "spellSlot" }, ({ slotLevel }) => slotLevel),
      Match.when({ tag: "spellAccessFreeCast" }, ({ castLevel }) => castLevel),
      Match.exhaustive,
    ),
  );
  const automaticallyEnded = targetOccurrences.filter(
    (occurrence) =>
      ongoingSpellOccurrenceSourceSpellLevel(occurrence) <= casterSlotLevel,
  );
  const gatedOccurrences = targetOccurrences.filter(
    (occurrence) =>
      ongoingSpellOccurrenceSourceSpellLevel(occurrence) > casterSlotLevel,
  );
  const gatedHoles = gatedOccurrences.map((occurrence) =>
    ongoingSpellEndAbilityCheckHole(
      input.actorId,
      input.invocation,
      selectedTarget,
      occurrence,
    ),
  );
  const abilityCheckByHoleId = new Map(
    input.fillSet.ongoingSpellAbilityChecks.map((fill) => [
      fill.holeId,
      {
        ...fill,
        value: effectiveD20TestNaturalOneRerollAbilityCheckValue(fill.value),
      },
    ]),
  );
  const unknownAbilityCheck = input.fillSet.ongoingSpellAbilityChecks.find(
    (fill) => !gatedHoles.some((hole) => hole.holeId === fill.holeId),
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (unknownAbilityCheck !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Ongoing spell ending ability check fill does not match this spell act.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const missingHoles = gatedHoles.filter(
    (hole) => !abilityCheckByHoleId.has(hole.holeId),
  );
  if (missingHoles.length > 0) {
    return needsHolesResult(
      input.input.state,
      input.input.subject,
      missingHoles,
    );
  }

  const successfullyChecked = gatedOccurrences.filter((occurrence) => {
    const hole = ongoingSpellEndAbilityCheckHole(
      input.actorId,
      input.invocation,
      selectedTarget,
      occurrence,
    );
    const fill = abilityCheckByHoleId.get(hole.holeId);
    return fill !== undefined && fill.value.total >= Number(hole.dc);
  });
  const endedKeys = new Set(
    [...automaticallyEnded, ...successfullyChecked].map((occurrence) =>
      ongoingSpellEffectRefKey(ongoingSpellOccurrenceRef(occurrence)),
    ),
  );
  const combatantsWithoutDispelledEffects: ReadonlyMap<
    CombatantId,
    BattleCreatureState
  > = new Map(
    [...input.input.state.combatants].map(([combatantId, combatant]) => {
      let removedTrackedEffect = false;
      const activeEffects = combatant.activeEffects.filter((effect) => {
        const keep =
          !isTrackedDispellableOngoingSpellActiveEffect(effect) ||
          !endedKeys.has(
            ongoingSpellEffectRefKey(
              ongoingSpellEffectRefForActiveEffect(effect),
            ),
          );
        if (!keep) {
          removedTrackedEffect = true;
        }
        return keep;
      });
      const nextCombatant = removedTrackedEffect
        ? { ...combatant, activeEffects }
        : combatant;
      return [combatantId, nextCombatant] as const;
    }),
  );
  const concentrationSources = uniqueConcentrationSources(
    [...automaticallyEnded, ...successfullyChecked].flatMap((occurrence) =>
      occurrence.kind === "activeEffect" &&
      occurrence.effect.expiresAt.kind === "concentration"
        ? [
            {
              sourceCombatantId: occurrence.effect.sourceCombatantId,
              sourceProcedureRef: occurrence.effect.sourceProcedureRef,
            },
          ]
        : [],
    ),
  );
  const combatants = concentrationSources.reduce<
    ReadonlyMap<CombatantId, BattleCreatureState>
  >(
    (currentCombatants, source) =>
      combatantsAfterConcentrationSpellEffectsEndedIfNoEffects(
        currentCombatants,
        source,
      ),
    combatantsWithoutDispelledEffects,
  );
  const effected: BattleState = {
    ...input.input.state,
    combatants,
    lightEmitters: input.input.state.lightEmitters.filter(
      (emitter) =>
        !(
          isTrackedOngoingSpellLightEmitter(emitter) &&
          endedKeys.has(
            ongoingSpellEffectRefKey(ongoingSpellEffectRefForEmitter(emitter)),
          )
        ),
    ),
  };
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resolutionFromStateResult(resourced);
}

function ongoingSpellEndDispelException(
  state: BattleState,
  target: BattleOngoingSpellTarget,
): OngoingSpellEndDispelException {
  if (target.kind !== "magicalEffect") {
    return { kind: "notException" };
  }
  if (target.effect.kind !== "magicSuppressionEmanation") {
    return { kind: "notException" };
  }
  return activeMagicSuppressionAuraMatchesTarget(state, target.effect)
    ? {
        kind: "magicSuppressionAuraNoEffect",
        effect: target.effect,
      }
    : {
        kind: "invalid",
        message:
          "Ongoing-spell ending suppression target must reference an active aura.",
      };
}

function activeMagicSuppressionAuraMatchesTarget(
  state: BattleState,
  target: MagicSuppressionEmanationOngoingSpellEffectRef,
): boolean {
  const source = state.combatants.get(target.sourceCombatantId);
  const effect = source?.activeEffects.find(
    (candidate) => candidate.effectRef === target.effectRef,
  );
  return (
    effect?.kind === "magicSuppressionEmanation" &&
    effect.areaId === target.areaId &&
    effect.sourceCombatantId === target.sourceCombatantId
  );
}

function resolveOngoingSpellEndDispelException(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation<OngoingSpellEndInvocation>;
  readonly exception: Extract<
    OngoingSpellEndDispelException,
    { readonly kind: "magicSuppressionAuraNoEffect" }
  >;
}): BattleResolutionResult {
  const resourced = spendSpellCastResources({
    state: input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.state,
  });
  return resolutionFromStateResult(resourced);
}

function ongoingSpellEndAbilityCheckHole(
  casterId: CombatantId,
  invocation: BattleExecutableSpellInvocation<OngoingSpellEndInvocation>,
  target: BattleOngoingSpellTarget,
  occurrence: BattleTrackedOngoingSpellOccurrence,
): BattleSpellcastingAbilityCheckHole {
  const effect = ongoingSpellOccurrenceRef(occurrence);
  const contestedSpellLevel =
    ongoingSpellOccurrenceSourceSpellLevel(occurrence);
  const dc = difficultyClass(
    Number(invocation.abilityCheckDcBase) + contestedSpellLevel,
  );
  const checkedTarget = Match.value(target).pipe(
    Match.discriminatorsExhaustive("kind")({
      magicalEffect: () => ({
        target: { kind: "magicalEffect" as const, effect },
      }),
      combatant: (combatantTarget) => ({
        target: combatantTarget,
        checkedOccurrence: {
          ownerId: occurrence.ownerId,
          effect,
        },
      }),
      object: (objectTarget) => ({
        target: objectTarget,
        checkedOccurrence: {
          ownerId: occurrence.ownerId,
          effect,
        },
      }),
    }),
  );
  return {
    holeInstanceKey: holeInstanceKey(
      `battle:spell:ongoing-end:check:${ongoingSpellEffectRefKey(effect)}`,
    ),
    holeId: holeId(
      `battle:spell:ongoing-end:check:${ongoingSpellEffectRefKey(effect)}`,
    ),
    kind: "spellcastingAbilityCheck",
    label: `Spellcasting ability check (DC ${dc})`,
    dc,
    spellcastingAbilityCheck: {
      casterId,
      sourceProcedureRef: invocation.sourceProcedureRef,
      contestedSpellLevel,
      ...checkedTarget,
    },
  };
}

function ongoingSpellTargetChoices(
  state: BattleState,
): readonly BattleOngoingSpellTarget[] {
  const choices: BattleOngoingSpellTarget[] = [...state.combatants.keys()].map(
    (combatantId) => ({
      kind: "combatant" as const,
      combatantId,
    }),
  );
  for (const emitter of state.lightEmitters) {
    if (!isTrackedOngoingSpellLightEmitter(emitter)) {
      continue;
    }
    if (emitter.attachment.kind === "object") {
      pushUniqueOngoingSpellTarget(choices, {
        kind: "object",
        objectId: emitter.attachment.objectId,
      });
    }
    pushUniqueOngoingSpellTarget(choices, {
      kind: "magicalEffect",
      effect: ongoingSpellEffectRefForEmitter(emitter),
    });
  }
  for (const combatant of state.combatants.values()) {
    for (const effect of combatant.activeEffects) {
      if (effect.kind === "magicSuppressionEmanation") {
        pushUniqueOngoingSpellTarget(choices, {
          kind: "magicalEffect",
          effect: ongoingSpellEffectRefForMagicSuppressionEmanation({
            effectRef: effect.effectRef,
            areaId: effect.areaId,
            sourceCombatantId: effect.sourceCombatantId,
          }),
        });
        continue;
      }
      if (!isTrackedDispellableOngoingSpellActiveEffect(effect)) {
        continue;
      }
      if (effect.kind === "spellObjectContactDamage") {
        pushUniqueOngoingSpellTarget(choices, {
          kind: "object",
          objectId: effect.objectId,
        });
      }
      pushUniqueOngoingSpellTarget(choices, {
        kind: "magicalEffect",
        effect: ongoingSpellEffectRefForActiveEffect(effect),
      });
    }
  }
  return choices;
}

function matchingTrackedOngoingSpellOccurrences(
  state: BattleState,
  target: BattleOngoingSpellTarget,
): readonly BattleTrackedOngoingSpellOccurrence[] {
  const lightEmitters = state.lightEmitters.flatMap((emitter) =>
    isTrackedOngoingSpellLightEmitter(emitter) &&
    spellLightEmitterMatchesOngoingTarget(emitter, target)
      ? [...state.combatants.values()].flatMap((combatant) =>
          battleEffectExecutionRefBelongsToScope(
            emitter.effectRef,
            combatant.origin.execution.scopeRef,
          )
            ? [
                {
                  kind: "lightEmitter" as const,
                  ownerId: combatant.combatantId,
                  emitter,
                  sourceSpellLevel: emitter.sourceSpellLevel,
                },
              ]
            : [],
        )
      : [],
  );
  const activeEffects = [...state.combatants.values()].flatMap((combatant) =>
    combatant.activeEffects.flatMap((effect) => {
      const occurrence = matchingTrackedOngoingSpellActiveEffectOccurrence(
        combatant,
        effect,
        target,
      );
      return occurrence === undefined ? [] : [occurrence];
    }),
  );
  return [...lightEmitters, ...activeEffects];
}

function matchingTrackedOngoingSpellActiveEffectOccurrence(
  combatant: BattleCreatureState,
  effect: BattleActiveEffect,
  target: BattleOngoingSpellTarget,
):
  | Extract<
      BattleTrackedOngoingSpellOccurrence,
      { readonly kind: "activeEffect" }
    >
  | undefined {
  if (combatant.origin.kind !== "character") return undefined;
  if (!activeEffectMatchesOngoingSpellTarget(effect, target)) {
    return undefined;
  }
  if (effect.sourceCombatantId !== combatant.combatantId) return undefined;
  const source = characterRetainedSpellProcedureExecution(
    combatant.origin.execution,
    effect.sourceProcedureRef,
  );
  if (source === undefined) return undefined;
  if (
    source.procedure !== "objectContactDamage" &&
    (source.procedure !== "spatialMeleeSpellAttackProxy" ||
      source.operation !== "createAndAttack")
  ) {
    return undefined;
  }
  return {
    kind: "activeEffect",
    ownerId: combatant.combatantId,
    effect,
    sourceSpellLevel: spellInvocationEffectiveSpellLevel(source),
  };
}

function activeEffectMatchesOngoingSpellTarget(
  effect: BattleActiveEffect,
  target: BattleOngoingSpellTarget,
): effect is TrackedDispellableOngoingSpellActiveEffect {
  return (
    isTrackedDispellableOngoingSpellActiveEffect(effect) &&
    dispellableActiveEffectMatchesOngoingTarget(effect, target)
  );
}

function spellLightEmitterMatchesOngoingTarget(
  emitter: BattleTrackedOngoingSpellLightEmitter,
  target: BattleOngoingSpellTarget,
): boolean {
  if (target.kind === "magicalEffect") {
    return ongoingSpellEffectRefEquals(
      ongoingSpellEffectRefForEmitter(emitter),
      target.effect,
    );
  }
  if (target.kind === "combatant") {
    return (
      emitter.attachment.kind === "combatant" &&
      emitter.attachment.combatantId === target.combatantId
    );
  }
  return (
    emitter.attachment.kind === "object" &&
    emitter.attachment.objectId === target.objectId
  );
}

function dispellableActiveEffectMatchesOngoingTarget(
  effect: TrackedDispellableOngoingSpellActiveEffect,
  target: BattleOngoingSpellTarget,
): boolean {
  if (target.kind === "magicalEffect") {
    return ongoingSpellEffectRefEquals(
      ongoingSpellEffectRefForActiveEffect(effect),
      target.effect,
    );
  }
  if (target.kind === "combatant") {
    return false;
  }
  return effect.kind === "spellObjectContactDamage"
    ? effect.objectId === target.objectId
    : false;
}

function ongoingSpellEndUnrelatedFill(
  fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>,
): string | null {
  return fillSet.targetId !== undefined ||
    fillSet.objectTarget !== undefined ||
    fillSet.objectContactTargets !== undefined ||
    fillSet.objectContactSavingThrowOutcome !== undefined ||
    fillSet.objectDropResolution !== undefined ||
    fillSet.targetSpatialFacts.length > 0 ||
    fillSet.targetAllocation !== undefined ||
    fillSet.targetList !== undefined ||
    fillSet.attackSequencePartFills.some(
      (part) =>
        part.target !== undefined ||
        part.attackRoll !== undefined ||
        part.duplicateHitInterceptionRoll !== undefined ||
        part.damageRoll !== undefined,
    ) ||
    fillSet.attackRoll !== undefined ||
    fillSet.savingThrowOutcomes !== undefined ||
    fillSet.skillChoice !== undefined ||
    fillSet.targetAbilityChoices !== undefined ||
    fillSet.abilityChoice !== undefined ||
    fillSet.temporaryAbilityCheckRollModeActiveEffectCount !== undefined ||
    fillSet.compelledBehaviorOptionChoice !== undefined ||
    fillSet.selfTransformationModeChoice !== undefined ||
    fillSet.conditionChoice !== undefined ||
    fillSet.areaChoice !== undefined ||
    fillSet.teleportDestination !== undefined ||
    fillSet.movableLightPlacement !== undefined ||
    fillSet.damageTypeChoice !== undefined ||
    fillSet.concentrationSavingThrows.length > 0 ||
    fillSet.saveGatedConditionWithRepeatDamageRepeatSaves.length > 0 ||
    fillSet.damageDispositions.length > 0 ||
    fillSet.damageRoll !== undefined ||
    fillSet.duplicateHitInterceptionRoll !== undefined ||
    fillSet.movement !== undefined ||
    fillSet.spellDamageReductionRolls.length > 0 ||
    fillSet.attackBurstDamageRoll !== undefined ||
    fillSet.healingRoll !== undefined
    ? "Ongoing spell ending uses only an ongoing spell target fill and spellcasting ability check fills."
    : null;
}

function pushUniqueOngoingSpellTarget(
  targets: BattleOngoingSpellTarget[],
  target: BattleOngoingSpellTarget,
): void {
  if (
    !targets.some((candidate) => ongoingSpellTargetEquals(candidate, target))
  ) {
    targets.push(target);
  }
}

function isTrackedDispellableOngoingSpellActiveEffect(
  effect: BattleActiveEffect,
): effect is TrackedDispellableOngoingSpellActiveEffect {
  return (
    effect.kind === "spellObjectContactDamage" ||
    effect.kind === "spatialMeleeSpellAttackProxy"
  );
}

function ongoingSpellOccurrenceRef(
  occurrence: BattleTrackedOngoingSpellOccurrence,
): BattleMagicSuppressionOngoingSpellEffectRef {
  return occurrence.kind === "lightEmitter"
    ? magicSuppressionOngoingSpellEffectRefForEmitter(occurrence.emitter)
    : magicSuppressionOngoingSpellEffectRefForActiveEffect(occurrence.effect);
}

function ongoingSpellOccurrenceSourceSpellLevel(
  occurrence: BattleTrackedOngoingSpellOccurrence,
): BattleSpellEffectLevel {
  return occurrence.sourceSpellLevel;
}

function uniqueConcentrationSources(
  sources: readonly {
    readonly sourceCombatantId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
  }[],
): readonly {
  readonly sourceCombatantId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
}[] {
  const unique: (typeof sources)[number][] = [];
  for (const source of sources) {
    const alreadyTracked = unique.some(
      (tracked) =>
        tracked.sourceCombatantId === source.sourceCombatantId &&
        tracked.sourceProcedureRef === source.sourceProcedureRef,
    );
    if (!alreadyTracked) {
      unique.push(source);
    }
  }
  return unique;
}

const OngoingSpellEndInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("ongoingSpellEnd"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("magicAction"),
    rangeFeet: MovementFeet,
    abilityCheckDcBase: DifficultyClass,
  }),
);
export const ongoingSpellEndProfile = {
  procedure: "ongoingSpellEnd",
  executionSchema: OngoingSpellEndInvocationSchema,
  admitMechanics: admitOngoingSpellEndMechanics,
  discoverCastAct: discoverOngoingSpellEndCastAct,
  resolve: resolveOngoingSpellEndSpellAct,
} satisfies SpellProcedureDeclaration<
  "ongoingSpellEnd",
  OngoingSpellEndInvocation,
  OngoingSpellEndMechanicsFacts,
  OngoingSpellEndIssue
>;
