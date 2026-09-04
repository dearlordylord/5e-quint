import { optionalProperty } from "../../optional-property.ts";
import { discoverTargetSavingThrowSpellCastActs } from "../saving-throw-metamagic-holes.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-command-approach-route spell.invocation-command-drop-held-object spell.invocation-command-flee-route spell.invocation-command-halt-grovel
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-careful-save-protection
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-heightened-save-disadvantage
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_CAREFUL_SAVE_PROTECTION BATTLE.FEATURE.METAMAGIC_HEIGHTENED_SAVE_DISADVANTAGE
// KERNEL-COVERAGE: runtime-owner BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING
//
// The command Spell Procedure Profile: action-time Spell Slot casting where
// target-list creatures make a Wisdom Saving Throw before failed-save targets
// receive a table-selected next-turn Command option.
//
// RAW anchors:
//   - SRD 5.2.1 Spells: Command names five options: Approach, Drop, Flee,
//     Grovel, and Halt. Failed-save targets follow the selected command on
//     their next turn, and higher-level slots add one target per Spell Slot
//     level above 1.
//   - UBIQUITOUS_LANGUAGE.md: Table Decisions, Saving Throw, Turn, Prone,
//     Magic Action, and Spell Invocation.

import { PositiveInteger } from "@dnd/shared/types";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellActivationRepeatPath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type {
  ActivationPhase,
  Components,
  SpellMechanics,
} from "@dnd/surface/surface/types";
import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleSpellExecutionSource,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { type CombatantId } from "../../identity.ts";
import { resolveCompelledNextTurnBehaviorSpellAct } from "../spells-resolve-save-gates.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Match, Schema } from "effect";
import {
  SpellRuleExecutionFactsSchema,
  spellInvocationResourceForCastOption,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  DcSourceSchema,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  compelledBehaviorOptionChoiceHole,
  spellTargetListHole,
} from "../spells-holes-fills.ts";
import {
  saveGateTargetCountFactsFromSelection,
  saveGatedConditionTargetingFromFacts,
  type SaveGateTargetCountFacts,
} from "./_save-gate-helpers.ts";
import {
  spellConsumedMaterialEvidencePaths,
  spellDurationChildCoordinates,
  spellDurationChildFailedFact,
  spellDurationChildPath,
  spellMechanicsObjectHasOnlyKeys,
  spellProcedureHasRedundantSignature,
  spellProcedureMapNonEmpty,
  spellProcedureNonEmpty,
  spellUniqueMechanicsIssues,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureAdmissionIssue,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsFacts,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";

type CompelledNextTurnBehaviorSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "compelledNextTurnBehavior" }
>;

type CompelledBehaviorMechanics = Extract<
  SpellMechanics,
  { readonly family: "activation" }
>;
type CompelledBehaviorPhase = Extract<
  ActivationPhase,
  { readonly kind: "save_gate" }
>;
type CompelledBehaviorHoleAttachment = Extract<
  CompelledBehaviorPhase["attachment"],
  { readonly kind: "hole" }
>;
type CompelledBehaviorTargetAttachment = CompelledBehaviorHoleAttachment & {
  readonly value: Extract<
    CompelledBehaviorHoleAttachment["value"],
    { readonly kind: "target" }
  >;
};
type CommandAttachmentKeySpace = Pick<
  CompelledBehaviorTargetAttachment,
  "kind" | "holeId" | "label" | "value"
>;
type CommandTargetValueKeySpace = Pick<
  CompelledBehaviorTargetAttachment["value"],
  "kind" | "selection"
>;
type CommandSelectionKeySpace = {
  readonly mode: unknown;
  readonly targetKinds?: unknown;
  readonly count?: unknown;
  readonly visibility?: unknown;
};
type CompelledBehaviorMechanicsFacts = SpellProcedureMechanicsFacts & {
  readonly ability: "wis";
  readonly dc: CompelledNextTurnBehaviorSpellInvocation["dc"];
  readonly targetCount: SaveGateTargetCountFacts;
  readonly visibility: "caster_can_see";
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Canonical source for CompelledBehaviorFailedFact.
const COMPELLED_BEHAVIOR_FAILED_FACTS = [
  "mechanics",
  "level",
  "school",
  "range",
  "components",
  "duration",
  "durationValue",
  "durationExtension",
  "durationEnding",
  "castingTime",
  "phaseCount",
  "phaseOrder",
  "phaseShape",
  "attachmentShape",
  "attachmentKind",
  "attachmentHoleId",
  "attachmentLabel",
  "attachmentValueKind",
  "selectionShape",
  "selectionMode",
  "selectionTargetKinds",
  "targetCount",
  "visibility",
  "saveAbility",
  "saveDc",
  "saveDcShape",
  "successOutcome",
  "successShape",
  "failureEffect",
  "failureShape",
  "failureExecution",
  "optionsShape",
  "approachShape",
  "approachRoute",
  "approachEndDistance",
  "dropShape",
  "dropObjectSet",
  "dropAfterward",
  "fleeShape",
  "fleeDirection",
  "fleeMeans",
  "fleeDuration",
  "grovelShape",
  "grovelCondition",
  "grovelAfterward",
  "haltShape",
  "haltMovement",
  "haltAction",
  "haltBonusAction",
  "haltDuration",
  "repeatSave",
] as const;
type CompelledBehaviorFailedFact =
  (typeof COMPELLED_BEHAVIOR_FAILED_FACTS)[number];
type CompelledBehaviorAdmissionIssue = SpellProcedureAdmissionIssue<
  "compelledNextTurnBehavior",
  CompelledBehaviorFailedFact,
  UnitMechanicsPath
>;
type CompelledBehaviorIssueFact = {
  readonly failedFact: CompelledBehaviorFailedFact;
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
] as const satisfies ReadonlyArray<keyof CompelledBehaviorMechanics>;
const RANGE_FIELDS = ["kind", "feet"] as const;
type CommandComponentKeySpace = Pick<Components, "v" | "s" | "m">;
const COMPONENT_FIELDS = ["v", "s", "m"] as const satisfies ReadonlyArray<
  keyof CommandComponentKeySpace
>;
const DURATION_FIELDS = ["kind"] as const;
const CASTING_TIME_FIELDS = ["kind"] as const;
const PHASE_FIELDS = [
  "kind",
  "attachment",
  "ability",
  "dc",
  "onFail",
  "onSuccess",
  "repeatSaves",
] as const;
const ATTACHMENT_FIELDS = ["kind", "holeId", "label", "value"] as const;
const TARGET_VALUE_FIELDS = ["kind", "selection"] as const;
const SELECTION_FIELDS = [
  "mode",
  "targetKinds",
  "count",
  "visibility",
] as const;
const DC_FIELDS = ["kind"] as const;
const SUCCESS_FIELDS = ["kind"] as const;
const FAILURE_FIELDS = ["kind", "execution", "options"] as const;
const OPTIONS_FIELDS = ["approach", "drop", "flee", "grovel", "halt"] as const;
const APPROACH_FIELDS = ["route", "endsTurnWhenWithinFeet"] as const;
const DROP_FIELDS = ["objectSet", "afterward"] as const;
const FLEE_FIELDS = ["direction", "means", "duration"] as const;
const GROVEL_FIELDS = ["condition", "afterward"] as const;
const HALT_FIELDS = ["movement", "action", "bonusAction", "duration"] as const;

type CompelledBehaviorResolveInput =
  SpellProcedureProfileResolveInput<CompelledNextTurnBehaviorSpellInvocation>;

function admitCompelledNextTurnBehavior(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: CompelledBehaviorMechanicsFacts,
): readonly CompelledNextTurnBehaviorSpellInvocation[] {
  return ctx.spellCastOptions.flatMap(
    (castOption): readonly CompelledNextTurnBehaviorSpellInvocation[] =>
      Number(castOption.spellLevel) < facts.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(castOption),
              spell,
              procedure: "compelledNextTurnBehavior",
              actionCost: "magicAction",
              ability: facts.ability,
              dc: facts.dc,
              visibility: facts.visibility,
              targeting: saveGatedConditionTargetingFromFacts(
                { kind: "targetList", count: facts.targetCount },
                castOption.spellLevel,
              ),
            },
          ],
  );
}

function compelledBehaviorIssue(
  failedFact: CompelledBehaviorFailedFact,
  mechanicsPath: UnitMechanicsPath,
): CompelledBehaviorAdmissionIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "compelledNextTurnBehavior",
    failedFact,
    mechanicsPath,
    message: `Unsupported compelledNextTurnBehavior mechanics fact: ${failedFact}.`,
  };
}

function compelledBehaviorRepresentation(
  mechanics: SpellMechanics,
): mechanics is CompelledBehaviorMechanics {
  if (mechanics.family !== "activation") return false;
  const phase = mechanics.phases.find(
    (candidate): candidate is CompelledBehaviorPhase =>
      candidate.kind === "save_gate" &&
      candidate.onFail.kind === "compelled_target_next_turn",
  );
  return spellProcedureHasRedundantSignature({
    kind: "twoWitnessesMayBeMissing",
    witnesses: [
      {
        name: "header",
        present:
          mechanics.level === 1 &&
          mechanics.school === "enchantment" &&
          mechanics.castingTime.kind === "action",
      },
      {
        name: "range",
        present:
          mechanics.range.kind === "point" && mechanics.range.feet === 60,
      },
      {
        name: "componentsAndDuration",
        present:
          mechanics.components.v === true &&
          mechanics.components.s === false &&
          mechanics.components.m === false &&
          mechanics.duration.kind === "instantaneous",
      },
      {
        name: "saveGate",
        present: phase?.ability === "wis",
      },
      {
        name: "compelledBehavior",
        present: phase?.onFail.kind === "compelled_target_next_turn",
      },
    ],
  });
}

function isCompelledBehaviorTargetAttachment(
  attachment: CompelledBehaviorPhase["attachment"],
): attachment is CompelledBehaviorTargetAttachment {
  return attachment.kind === "hole" && attachment.value.kind === "target";
}

type CompelledBehaviorInspection =
  | { readonly tag: "notRepresented" }
  | {
      readonly tag: "unsupported";
      readonly issues: readonly [
        CompelledBehaviorIssueFact,
        ...CompelledBehaviorIssueFact[],
      ];
    }
  | {
      readonly tag: "parsed";
      readonly facts: CompelledBehaviorMechanicsFacts;
      readonly evidence: SpellProcedureMechanicsEvidence;
    };

function inspectCompelledBehaviorMechanics(
  source: SpellMechanicsAdmissionSource,
): CompelledBehaviorInspection {
  if (!compelledBehaviorRepresentation(source.mechanics))
    return { tag: "notRepresented" };
  const mechanics = source.mechanics;
  const issues: CompelledBehaviorIssueFact[] = [];
  const push = (
    failedFact: CompelledBehaviorFailedFact,
    mechanicsPath: UnitMechanicsPath,
  ): void => {
    issues.push({ failedFact, mechanicsPath });
  };
  if (!spellMechanicsObjectHasOnlyKeys(mechanics, ROOT_FIELDS))
    push("mechanics", spellMechanicsRootPath());
  if (mechanics.level !== 1) push("level", spellMechanicsHeaderPath("level"));
  if (mechanics.school !== "enchantment")
    push("school", spellMechanicsHeaderPath("school"));
  if (
    mechanics.range.kind !== "point" ||
    mechanics.range.feet !== 60 ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.range, RANGE_FIELDS)
  )
    push("range", spellMechanicsHeaderPath("range"));
  if (
    mechanics.components.v !== true ||
    mechanics.components.s !== false ||
    mechanics.components.m !== false ||
    !spellMechanicsObjectHasOnlyKeys<CommandComponentKeySpace>(
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
  for (const child of spellDurationChildCoordinates(mechanics.duration))
    push(spellDurationChildFailedFact(child), spellDurationChildPath(child));
  if (
    mechanics.castingTime.kind !== "action" ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.castingTime, CASTING_TIME_FIELDS)
  )
    push("castingTime", spellMechanicsHeaderPath("castingTime"));

  const representedIndex = mechanics.phases.findIndex(
    (candidate) =>
      candidate.kind === "save_gate" &&
      candidate.onFail.kind === "compelled_target_next_turn",
  );
  const saveGateIndex = mechanics.phases.findIndex(
    (candidate) => candidate.kind === "save_gate",
  );
  const phaseIndex = representedIndex >= 0 ? representedIndex : saveGateIndex;
  const phase = mechanics.phases[phaseIndex];
  if (phase === undefined) {
    push("phaseCount", spellMechanicsRootPath());
    return {
      tag: "unsupported",
      issues: spellProcedureNonEmpty(spellUniqueMechanicsIssues(issues)) ?? [
        { failedFact: "phaseCount", mechanicsPath: spellMechanicsRootPath() },
      ],
    };
  }
  const phaseOrdinal = PositiveInteger(phaseIndex + 1);
  for (const [index] of mechanics.phases.entries())
    if (index !== phaseIndex)
      push("phaseCount", spellActivationPhasePath(PositiveInteger(index + 1)));
  if (phaseIndex !== 0)
    push("phaseOrder", spellActivationPhasePath(phaseOrdinal));
  if (phase?.kind !== "save_gate") {
    push("phaseShape", spellActivationPhasePath(phaseOrdinal));
    return {
      tag: "unsupported",
      issues: spellProcedureNonEmpty(spellUniqueMechanicsIssues(issues)) ?? [
        { failedFact: "phaseCount", mechanicsPath: spellMechanicsRootPath() },
      ],
    };
  }
  if (!spellMechanicsObjectHasOnlyKeys(phase, PHASE_FIELDS))
    push("phaseShape", spellActivationPhasePath(phaseOrdinal));
  const saveAbility = phase.ability === "wis" ? phase.ability : undefined;
  if (saveAbility === undefined)
    push("saveAbility", spellActivationPhasePath(phaseOrdinal));
  const saveDc =
    phase.dc.kind === "caster_spell_save_dc" ? phase.dc : undefined;
  if (saveDc === undefined)
    push("saveDc", spellActivationPhasePath(phaseOrdinal));
  if (!spellMechanicsObjectHasOnlyKeys(phase.dc, DC_FIELDS))
    push("saveDcShape", spellActivationPhasePath(phaseOrdinal));
  if (phase.onSuccess.kind !== "none")
    push("successOutcome", spellActivationPhasePath(phaseOrdinal));
  if (!spellMechanicsObjectHasOnlyKeys(phase.onSuccess, SUCCESS_FIELDS))
    push("successShape", spellActivationPhasePath(phaseOrdinal));
  for (const [index] of (phase.repeatSaves ?? []).entries())
    push(
      "repeatSave",
      spellActivationRepeatPath(phaseOrdinal, PositiveInteger(index + 1)),
    );

  const targetAttachment = isCompelledBehaviorTargetAttachment(phase.attachment)
    ? phase.attachment
    : undefined;
  const attachmentPath = spellActivationAttachmentPath(phaseOrdinal);
  if (
    targetAttachment === undefined ||
    !spellMechanicsObjectHasOnlyKeys<CommandAttachmentKeySpace>(
      targetAttachment,
      ATTACHMENT_FIELDS,
    )
  )
    push("attachmentShape", attachmentPath);
  if (phase.attachment.kind !== "hole") push("attachmentKind", attachmentPath);
  if (phase.attachment.kind === "hole") {
    if (phase.attachment.holeId !== "command_target")
      push("attachmentHoleId", attachmentPath);
    if (phase.attachment.label !== "target")
      push("attachmentLabel", attachmentPath);
    if (
      targetAttachment === undefined ||
      !spellMechanicsObjectHasOnlyKeys<CommandTargetValueKeySpace>(
        targetAttachment.value,
        TARGET_VALUE_FIELDS,
      )
    )
      push("attachmentShape", attachmentPath);
    if (phase.attachment.value.kind !== "target")
      push("attachmentValueKind", attachmentPath);
  } else {
    push("attachmentHoleId", attachmentPath);
    push("attachmentLabel", attachmentPath);
    push("attachmentValueKind", attachmentPath);
  }
  const selection = targetAttachment?.value.selection;
  if (
    selection === undefined ||
    !spellMechanicsObjectHasOnlyKeys<CommandSelectionKeySpace>(
      selection,
      SELECTION_FIELDS,
    )
  )
    push("selectionShape", attachmentPath);
  if (selection?.mode !== "choose_up_to") push("selectionMode", attachmentPath);
  if (
    selection?.targetKinds?.length !== 1 ||
    !selection.targetKinds.includes("creature")
  )
    push("selectionTargetKinds", attachmentPath);
  const visibility =
    selection !== undefined &&
    "visibility" in selection &&
    selection.visibility === "caster_can_see"
      ? selection.visibility
      : undefined;
  if (visibility === undefined) push("visibility", attachmentPath);
  const targetCount =
    selection === undefined
      ? null
      : saveGateTargetCountFactsFromSelection(
          selection,
          source.spellDefinitionRuleFacts.level,
        );
  const selectionCount =
    selection !== undefined && "count" in selection
      ? selection.count
      : undefined;
  const independentlyParsedTargetCount =
    selectionCount === undefined
      ? null
      : saveGateTargetCountFactsFromSelection(
          {
            mode: "choose_up_to",
            count: selectionCount,
            targetKinds: ["creature"],
          },
          source.spellDefinitionRuleFacts.level,
        );
  if (independentlyParsedTargetCount === null)
    push("targetCount", attachmentPath);

  const failedEffect = phase.onFail;
  const effectPath = spellActivationEffectPath(
    phaseOrdinal,
    PositiveInteger(1),
  );
  if (failedEffect.kind !== "compelled_target_next_turn") {
    push("failureEffect", effectPath);
  } else {
    if (!spellMechanicsObjectHasOnlyKeys(failedEffect, FAILURE_FIELDS))
      push("failureShape", effectPath);
    if (failedEffect.execution !== "target_next_turn")
      push("failureExecution", effectPath);
    if (!spellMechanicsObjectHasOnlyKeys(failedEffect.options, OPTIONS_FIELDS))
      push("optionsShape", effectPath);
    const { approach, drop, flee, grovel, halt } = failedEffect.options;
    if (!spellMechanicsObjectHasOnlyKeys(approach, APPROACH_FIELDS))
      push("approachShape", effectPath);
    if (approach.route !== "shortest_direct_to_caster")
      push("approachRoute", effectPath);
    if (approach.endsTurnWhenWithinFeet !== 5)
      push("approachEndDistance", effectPath);
    if (!spellMechanicsObjectHasOnlyKeys(drop, DROP_FIELDS))
      push("dropShape", effectPath);
    if (drop.objectSet !== "held_objects") push("dropObjectSet", effectPath);
    if (drop.afterward !== "end_turn") push("dropAfterward", effectPath);
    if (!spellMechanicsObjectHasOnlyKeys(flee, FLEE_FIELDS))
      push("fleeShape", effectPath);
    if (flee.direction !== "away_from_caster")
      push("fleeDirection", effectPath);
    if (flee.means !== "fastest_available") push("fleeMeans", effectPath);
    if (flee.duration !== "target_turn") push("fleeDuration", effectPath);
    if (!spellMechanicsObjectHasOnlyKeys(grovel, GROVEL_FIELDS))
      push("grovelShape", effectPath);
    if (grovel.condition !== "prone") push("grovelCondition", effectPath);
    if (grovel.afterward !== "end_turn") push("grovelAfterward", effectPath);
    if (!spellMechanicsObjectHasOnlyKeys(halt, HALT_FIELDS))
      push("haltShape", effectPath);
    if (halt.movement !== "none") push("haltMovement", effectPath);
    if (halt.action !== "none") push("haltAction", effectPath);
    if (halt.bonusAction !== "none") push("haltBonusAction", effectPath);
    if (halt.duration !== "target_turn") push("haltDuration", effectPath);
  }

  const nonEmptyIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (nonEmptyIssues !== undefined)
    return { tag: "unsupported", issues: nonEmptyIssues };
  if (targetCount === null)
    return {
      tag: "unsupported",
      issues: [{ failedFact: "targetCount", mechanicsPath: attachmentPath }],
    };
  if (saveAbility === undefined)
    return {
      tag: "unsupported",
      issues: [
        {
          failedFact: "saveAbility",
          mechanicsPath: spellActivationPhasePath(phaseOrdinal),
        },
      ],
    };
  if (saveDc === undefined)
    return {
      tag: "unsupported",
      issues: [
        {
          failedFact: "saveDc",
          mechanicsPath: spellActivationPhasePath(phaseOrdinal),
        },
      ],
    };
  if (visibility === undefined)
    return {
      tag: "unsupported",
      issues: [{ failedFact: "visibility", mechanicsPath: attachmentPath }],
    };
  return {
    tag: "parsed",
    facts: {
      ...source.spellDefinitionRuleFacts,
      ability: saveAbility,
      dc: saveDc,
      targetCount,
      visibility,
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
        spellActivationPhasePath(phaseOrdinal),
        spellActivationAttachmentPath(phaseOrdinal),
        effectPath,
      ],
      unowned: [],
    },
  };
}

function admitCompelledBehaviorMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "compelledNextTurnBehavior",
  CompelledBehaviorMechanicsFacts,
  CompelledNextTurnBehaviorSpellInvocation,
  CompelledBehaviorAdmissionIssue
> {
  return Match.value(inspectCompelledBehaviorMechanics(source)).pipe(
    Match.when({ tag: "notRepresented" }, () => ({
      tag: "notRepresented" as const,
    })),
    Match.when({ tag: "unsupported" }, ({ issues }) => ({
      tag: "unsupported" as const,
      issues: spellProcedureMapNonEmpty(
        issues,
        ({ failedFact, mechanicsPath }) =>
          compelledBehaviorIssue(failedFact, mechanicsPath),
      ),
    })),
    Match.when({ tag: "parsed" }, ({ facts, evidence }) => ({
      tag: "supported" as const,
      admitted: {
        binding: "ready" as const,
        procedure: "compelledNextTurnBehavior" as const,
        facts,
        evidence,
        admit: (
          spell: BattleSpellExecutionSource,
          ctx: SpellAdmissionContext,
        ) => admitCompelledNextTurnBehavior(spell, ctx, facts),
      },
    })),
    Match.exhaustive,
  );
}

function discoverCompelledNextTurnBehaviorCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<CompelledNextTurnBehaviorSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return [];
  }

  const targetHole = spellTargetListHole(state, actorId, invocation);
  if (targetHole.choices.length === 0) {
    return [];
  }

  const compelledBehaviorOptionHole =
    compelledBehaviorOptionChoiceHole(invocation);
  return discoverTargetSavingThrowSpellCastActs({
    state,
    actorId,
    actor,
    invocation,
    targetHole,
    additionalHoles: [compelledBehaviorOptionHole],
  });
}

function resolveCompelledNextTurnBehavior(
  input: CompelledBehaviorResolveInput,
): BattleResolutionResult {
  return resolveCompelledNextTurnBehaviorSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
    ...optionalProperty("metamagicApplications", input.metamagicApplications),
  });
}

const CommandInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("compelledNextTurnBehavior"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("magicAction"),
    ability: Schema.Literal("wis"),
    dc: DcSourceSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("targetList"),
      minTargets: Schema.Literal(1),
      maxTargets: Schema.Number,
    }),
    visibility: Schema.Literal("caster_can_see"),
  }),
);
export const compelledNextTurnBehaviorProfile = {
  procedure: "compelledNextTurnBehavior",
  executionSchema: CommandInvocationSchema,
  admitMechanics: admitCompelledBehaviorMechanics,
  discoverCastAct: discoverCompelledNextTurnBehaviorCastAct,
  resolve: resolveCompelledNextTurnBehavior,
} satisfies SpellProcedureDeclaration<
  "compelledNextTurnBehavior",
  CompelledNextTurnBehaviorSpellInvocation,
  CompelledBehaviorMechanicsFacts,
  CompelledBehaviorAdmissionIssue
>;
