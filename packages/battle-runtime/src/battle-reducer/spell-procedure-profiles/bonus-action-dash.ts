import { maybeOpenSpellCastReactionWindow } from "../spell-cast-reaction-window.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-expeditious-retreat-dash
import { ConcentrationBattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.EXPEDITIOUS_RETREAT_DASH_LIFECYCLE
//
// The grantedAlternateActionCost Spell Procedure Profile: a self-targeted Bonus
// Action spell that immediately resolves Dash and stores a Concentration-owned
// permission to take Dash as a Bonus Action while the spell lasts.
//
// RAW anchors:
//   - SRD 5.2.1 Spells "Expeditious Retreat": Bonus Action, Self,
//     Concentration up to 10 minutes; take Dash immediately and again as a
//     Bonus Action until the spell ends.
//   - SRD 5.2.1 Rules Glossary "Bonus Action": Bonus Actions exist only when
//     explicitly granted.
//   - UBIQUITOUS_LANGUAGE.md: Speed is capacity; Movement is consumption; Dash
//     grants additional movement budget rather than changing Speed.

import { spendActivationResource } from "@dnd/shared-algebras/action-economy-algebra";
import { PositiveInteger } from "@dnd/shared/types";
import type { ElapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import type { SpellMechanics } from "@dnd/surface/surface/types";
import { Result, Match } from "effect";

import {
  type BattleSpellExecutionSource,
  type BattleActDiscoveryCandidate,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import type { SpellDefinitionRuleFacts } from "../../procedure-execution/spell-rule-facts.ts";
import { activeOngoingFeaturesPreventSpellInvocation } from "../spells-invocation-guards.ts";
import { snapshotBattle } from "../interrupt-execution.ts";
import { CombatantId } from "../../identity.ts";
import { allocateBattleEffectExecutionRefForCreature } from "../../effect-execution-ref.ts";
import { applyDashToActor } from "../mobility-actions.ts";
import { breakBattleConcentration } from "../damage-apply.ts";
import { revealHidden } from "../hole-helpers.ts";
import { representedMovementSpeedKinds } from "../movement-speed.ts";
import { invalidResult } from "../result-helpers.ts";
import { battleStateAfterTargetActionEarlyEndForActor } from "../targeting-save-interdiction.ts";
import { expendSpellSlot } from "../spell-effects.ts";
import { spendSpellAccessFreeCastResource } from "../spells-resolve-resources.ts";
import {
  markSpellSlotExpendedThisTurn,
  spellActTurnResourceAvailable,
  spellHasAvailableSpend,
} from "../spell-turn-resources.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { spellInvocationResourceForCastOption } from "./profile.ts";
import {
  isSpellCanonicalDurationValue,
  spellDurationChildCoordinates,
  spellDurationChildPath,
  spellDurationTicksFromCanonicalValue,
  spellProcedureHasCompleteSignature,
  spellProcedureNonEmpty,
  spellConsumedMaterialEvidencePaths,
  type SpellCanonicalDurationValue,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellOngoingAttachmentPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import { Schema } from "effect";
import { BattleEffectOccurrenceTemplateSchemaFields } from "../../active-effect/template-codec.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type GrantedAlternateActionCostInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "grantedAlternateActionCost" }
>;

const SpellDashBonusActionEffectSchema = Schema.Struct({
  ...BattleEffectOccurrenceTemplateSchemaFields,
  kind: Schema.Literal("spellDashBonusAction"),
  sourceCombatantId: CombatantId,
  expiresAt: ConcentrationBattleActiveEffectExpirationSchema,
});
type GrantedAlternateActionCostResolveInput =
  SpellProcedureProfileResolveInput<GrantedAlternateActionCostInvocation>;

type GrantedAlternateActionCostMechanicsFacts = Omit<
  SpellDefinitionRuleFacts,
  "range" | "duration"
> & {
  readonly range: Extract<
    SpellDefinitionRuleFacts["range"],
    {
      readonly kind: "self";
    }
  >;
  readonly duration: Extract<
    SpellDefinitionRuleFacts["duration"],
    { readonly kind: "concentration" }
  > & { readonly upTo: SpellCanonicalDurationValue };
  readonly durationTicks: ElapsedTimeTicks;
};

export const GRANTED_ALTERNATE_ACTION_COST_FAILED_FACTS = [
  "level",
  "castingTime",
  "range",
  "duration",
  "durationExtension",
  "durationEnding",
  "attachment",
  "initialPhase",
  "initialEffect",
  "operationCount",
  "operation",
  "operationEffect",
] as const;
type GrantedAlternateActionCostFailedFact =
  (typeof GRANTED_ALTERNATE_ACTION_COST_FAILED_FACTS)[number];

type GrantedAlternateActionCostIssue = {
  readonly failedFact: GrantedAlternateActionCostFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

type GrantedAlternateActionCostInspection = SpellProcedureMechanicsInspection<
  "grantedAlternateActionCost",
  GrantedAlternateActionCostMechanicsFacts,
  GrantedAlternateActionCostInvocation,
  ReturnType<typeof grantedAlternateActionCostIssueResult>
>;

function grantedAlternateActionCostIssue(
  failedFact: GrantedAlternateActionCostFailedFact,
  mechanicsPath: SpellMechanicsBranchPath,
): GrantedAlternateActionCostIssue {
  return { failedFact, mechanicsPath };
}

function grantedAlternateActionCostIssueResult(
  issue: GrantedAlternateActionCostIssue,
) {
  return {
    tag: "spellProcedureAdmissionIssue" as const,
    procedure: "grantedAlternateActionCost" as const,
    failedFact: issue.failedFact,
    mechanicsPath: issue.mechanicsPath,
    message: `Unsupported grantedAlternateActionCost mechanics fact: ${issue.failedFact}.`,
  };
}

function grantedAlternateActionCostDurationIssues(
  duration: Extract<
    SpellMechanics["duration"],
    { readonly kind: "concentration" }
  >,
): readonly GrantedAlternateActionCostIssue[] {
  const issues: GrantedAlternateActionCostIssue[] = [];
  for (const child of spellDurationChildCoordinates(duration)) {
    issues.push(
      grantedAlternateActionCostIssue(
        child.branch === "extension" ? "durationExtension" : "durationEnding",
        spellDurationChildPath(child),
      ),
    );
  }
  return issues;
}

type GrantedAlternateActionCostDuration =
  GrantedAlternateActionCostMechanicsFacts["duration"];

type GrantedAlternateActionCostRange =
  GrantedAlternateActionCostMechanicsFacts["range"];

function isGrantedAlternateActionCostRange(
  range: SpellDefinitionRuleFacts["range"],
): range is GrantedAlternateActionCostRange {
  return range.kind === "self";
}

function isGrantedAlternateActionCostDuration(
  duration: SpellDefinitionRuleFacts["duration"],
): duration is GrantedAlternateActionCostDuration {
  return (
    duration.kind === "concentration" &&
    duration.upTo.unit === "minute" &&
    duration.upTo.amount === 10 &&
    isSpellCanonicalDurationValue(duration.upTo)
  );
}

function isGrantedAlternateActionCostRootShape(
  mechanics: SpellMechanics,
): mechanics is Extract<SpellMechanics, { readonly family: "ongoing_effect" }> {
  if (mechanics.family !== "ongoing_effect") return false;
  const initialEffect =
    mechanics.initialPhase?.kind === "direct"
      ? mechanics.initialPhase.effects?.[0]
      : undefined;
  const operation = mechanics.operations[0];
  return (
    initialEffect?.kind === "take_standard_action" ||
    operation?.effect.kind === "grant_alternate_action_cost"
  );
}

function grantedAlternateActionCostIssueUnless(
  present: boolean,
  failedFact: GrantedAlternateActionCostFailedFact,
  mechanicsPath: SpellMechanicsBranchPath,
): readonly GrantedAlternateActionCostIssue[] {
  return present
    ? []
    : [grantedAlternateActionCostIssue(failedFact, mechanicsPath)];
}

function grantedAlternateActionCostOperationCountIssues(
  mechanics: Extract<SpellMechanics, { readonly family: "ongoing_effect" }>,
): readonly GrantedAlternateActionCostIssue[] {
  if (mechanics.operations.length === 1) return [];
  if (mechanics.operations.length === 0) {
    return [
      grantedAlternateActionCostIssue(
        "operation",
        spellOngoingOperationPath(PositiveInteger(1)),
      ),
    ];
  }
  return mechanics.operations
    .slice(1)
    .map((_operation, index) =>
      grantedAlternateActionCostIssue(
        "operationCount",
        spellOngoingOperationPath(PositiveInteger(index + 2)),
      ),
    );
}

function grantedAlternateActionCostOperationIssues(
  operation:
    | Extract<
        SpellMechanics,
        { readonly family: "ongoing_effect" }
      >["operations"][number]
    | undefined,
): readonly GrantedAlternateActionCostIssue[] {
  if (operation === undefined) return [];
  const alternateActionEffect =
    operation.effect.kind === "grant_alternate_action_cost"
      ? operation.effect
      : undefined;
  const effectIsSupported =
    alternateActionEffect !== undefined &&
    spellProcedureHasCompleteSignature([
      {
        name: "fromKind",
        present: alternateActionEffect.from.kind === "standard_action",
      },
      {
        name: "actionCount",
        present: alternateActionEffect.from.actions.length === 1,
      },
      {
        name: "dash",
        present: alternateActionEffect.from.actions[0] === "dash",
      },
      {
        name: "toKind",
        present: alternateActionEffect.to.kind === "bonus_action",
      },
    ]);
  return [
    ...grantedAlternateActionCostIssueUnless(
      operation.trigger.kind === "passive",
      "operation",
      spellOngoingOperationPath(PositiveInteger(1)),
    ),
    ...grantedAlternateActionCostIssueUnless(
      effectIsSupported,
      "operationEffect",
      spellOngoingOperationEffectPath(PositiveInteger(1)),
    ),
  ];
}

function grantedAlternateActionCostInitialPhaseIsSupported(
  initialPhase: Extract<
    SpellMechanics,
    { readonly family: "ongoing_effect" }
  >["initialPhase"],
): boolean {
  return (
    initialPhase?.kind === "direct" &&
    initialPhase.attachment.kind === "self" &&
    initialPhase.effects?.length === 1
  );
}

type GrantedAlternateActionCostInitialEffect = NonNullable<
  Extract<
    NonNullable<
      Extract<
        SpellMechanics,
        { readonly family: "ongoing_effect" }
      >["initialPhase"]
    >,
    { readonly kind: "direct" }
  >["effects"]
>[number];

function grantedAlternateActionCostInitialEffectIsSupported(
  initialEffect: GrantedAlternateActionCostInitialEffect | undefined,
): boolean {
  if (initialEffect === undefined) return true;
  if (initialEffect.kind !== "take_standard_action") return false;
  return spellProcedureHasCompleteSignature([
    { name: "action", present: initialEffect.action === "dash" },
    {
      name: "cost",
      present: initialEffect.cost === "included_in_effect",
    },
  ]);
}

function grantedAlternateActionCostAdmissionIssues(
  mechanics: Extract<SpellMechanics, { readonly family: "ongoing_effect" }>,
): readonly GrantedAlternateActionCostIssue[] {
  const initialPhase = mechanics.initialPhase;
  const initialEffect =
    initialPhase?.kind === "direct" ? initialPhase.effects?.[0] : undefined;
  const initialEffectIsSupported =
    grantedAlternateActionCostInitialEffectIsSupported(initialEffect);
  return [
    ...grantedAlternateActionCostIssueUnless(
      mechanics.level === 1,
      "level",
      spellMechanicsHeaderPath("level"),
    ),
    ...grantedAlternateActionCostIssueUnless(
      mechanics.castingTime.kind === "bonus_action",
      "castingTime",
      spellMechanicsHeaderPath("castingTime"),
    ),
    ...grantedAlternateActionCostIssueUnless(
      isGrantedAlternateActionCostRange(mechanics.range),
      "range",
      spellMechanicsHeaderPath("range"),
    ),
    ...grantedAlternateActionCostIssueUnless(
      isGrantedAlternateActionCostDuration(mechanics.duration),
      "duration",
      spellDurationValuePath(),
    ),
    ...(mechanics.duration.kind === "concentration"
      ? grantedAlternateActionCostDurationIssues(mechanics.duration)
      : []),
    ...grantedAlternateActionCostIssueUnless(
      mechanics.attachment.kind === "self",
      "attachment",
      spellOngoingAttachmentPath(),
    ),
    ...grantedAlternateActionCostIssueUnless(
      grantedAlternateActionCostInitialPhaseIsSupported(initialPhase),
      "initialPhase",
      spellOngoingInitialPhasePath(),
    ),
    ...grantedAlternateActionCostIssueUnless(
      initialEffectIsSupported,
      "initialEffect",
      spellOngoingInitialPhasePath(),
    ),
    ...grantedAlternateActionCostOperationCountIssues(mechanics),
    ...grantedAlternateActionCostOperationIssues(mechanics.operations[0]),
  ];
}

type GrantedAlternateActionCostFactsResolution =
  | {
      readonly tag: "supported";
      readonly facts: GrantedAlternateActionCostMechanicsFacts;
    }
  | {
      readonly tag: "unsupported";
      readonly issue: GrantedAlternateActionCostIssue;
    };

function grantedAlternateActionCostFacts(
  source: SpellMechanicsAdmissionSource,
): GrantedAlternateActionCostFactsResolution {
  const range = source.spellDefinitionRuleFacts.range;
  if (!isGrantedAlternateActionCostRange(range)) {
    return {
      tag: "unsupported",
      issue: grantedAlternateActionCostIssue(
        "range",
        spellMechanicsHeaderPath("range"),
      ),
    };
  }
  const duration = source.spellDefinitionRuleFacts.duration;
  if (!isGrantedAlternateActionCostDuration(duration)) {
    return {
      tag: "unsupported",
      issue: grantedAlternateActionCostIssue(
        "duration",
        spellDurationValuePath(),
      ),
    };
  }
  return {
    tag: "supported",
    facts: {
      ...source.spellDefinitionRuleFacts,
      range,
      duration,
      durationTicks: spellDurationTicksFromCanonicalValue(duration.upTo),
    },
  };
}

function admitGrantedAlternateActionCostMechanics(
  source: SpellMechanicsAdmissionSource,
): GrantedAlternateActionCostInspection {
  if (!isGrantedAlternateActionCostRootShape(source.mechanics)) {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const issues = grantedAlternateActionCostAdmissionIssues(mechanics);
  const nonEmpty = spellProcedureNonEmpty(issues);
  if (nonEmpty !== undefined) {
    const [firstIssue, ...remainingIssues] = nonEmpty;
    return {
      tag: "unsupported",
      issues: [
        grantedAlternateActionCostIssueResult(firstIssue),
        ...remainingIssues.map(grantedAlternateActionCostIssueResult),
      ],
    };
  }
  const factsResolution = grantedAlternateActionCostFacts(source);
  if (factsResolution.tag === "unsupported") {
    return {
      tag: "unsupported",
      issues: [grantedAlternateActionCostIssueResult(factsResolution.issue)],
    };
  }
  const facts = factsResolution.facts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "grantedAlternateActionCost",
      facts,
      evidence: grantedAlternateActionCostMechanicsEvidence(mechanics),
      admit: (executionSource, ctx) =>
        admitGrantedAlternateActionCost(executionSource, ctx, facts),
    },
  };
}

function grantedAlternateActionCostMechanicsEvidence(
  mechanics: Extract<SpellMechanics, { readonly family: "ongoing_effect" }>,
): SpellProcedureMechanicsEvidence {
  const consumed: [SpellMechanicsBranchPath, ...SpellMechanicsBranchPath[]] = [
    spellMechanicsHeaderPath("level"),
    spellMechanicsHeaderPath("school"),
    spellMechanicsHeaderPath("range"),
    spellMechanicsHeaderPath("components"),
    spellMechanicsHeaderPath("duration"),
    spellMechanicsHeaderPath("castingTime"),
    spellMechanicsHeaderPath("family"),
    spellDurationValuePath(),
    ...spellDurationChildCoordinates(mechanics.duration).map(
      spellDurationChildPath,
    ),
    spellOngoingAttachmentPath(),
    spellOngoingInitialPhasePath(),
    spellOngoingOperationPath(PositiveInteger(1)),
    spellOngoingOperationEffectPath(PositiveInteger(1)),
    ...spellConsumedMaterialEvidencePaths(mechanics.components),
  ];
  return { consumed, unowned: [] };
}

function admitGrantedAlternateActionCost(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: GrantedAlternateActionCostMechanicsFacts,
): readonly GrantedAlternateActionCostInvocation[] {
  const activeEffect: GrantedAlternateActionCostInvocation["activeEffect"] = {
    kind: "spellDashBonusAction",
    sourceCombatantId: ctx.actor.combatantId,
    expiresAt: {
      kind: "concentration",
      combatantId: ctx.actor.combatantId,
      durationTicks: facts.durationTicks,
    },
  };
  return ctx.spellCastOptions.flatMap(
    (slot): readonly GrantedAlternateActionCostInvocation[] =>
      Number(slot.spellLevel) < facts.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "grantedAlternateActionCost",
              spell,
              actionCost: "bonusAction",
              activeEffect,
            },
          ],
  );
}

function discoverGrantedAlternateActionCostCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: import("../../battle-state-execution.ts").BattleExecutableSpellInvocation<GrantedAlternateActionCostInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return [];
  }
  return representedMovementSpeedKinds(actor).map((speedKind) => ({
    subject: {
      tag: "bonusActionDashSpell" as const,
      actorId,
      procedureRef: invocation.sourceProcedureRef,
      mode: { tag: "cast" as const },
      speedKind,
    },
    initialHoles: [],
  }));
}

function resolveGrantedAlternateActionCost(
  input: GrantedAlternateActionCostResolveInput,
): BattleResolutionResult {
  const subject = input.input.subject;
  const actor = input.input.state.combatants.get(subject.actorId);
  /* v8 ignore start -- @preserve -- Internal routing invariant: public resolution verifies that the admitted spell subject still has a battle actor before dispatching to this profile. */
  if (actor === undefined) {
    return invalidResult(
      input.input.state,
      "missingCombatant",
      "bonus-action Dash effect caster is not in this battle.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!fillsBelongToSpellCastHoles(input.input.fills)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "bonus-action Dash effect accepts only spell-cast Reaction trigger facts.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (!spellHasAvailableSpend(actor, input.invocation)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "bonus-action Dash effect no longer has its required runtime spell resource.",
    );
  }
  if (
    !spellActTurnResourceAvailable(
      input.input.state.currentTurnResources,
      input.input.subject.actorId,
      input.invocation,
    )
  ) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  /* v8 ignore start -- @preserve -- Malformed replay subject: ordinary discovery emits one Expeditious Retreat act for each represented movement speed kind and cannot emit an unrelated kind. */
  if (!representedMovementSpeedKinds(actor).includes(subject.speedKind)) {
    return invalidResult(
      input.input.state,
      "unsupportedActOption",
      "bonus-action Dash effect Dash speed kind is not represented for this combatant.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (
    activeOngoingFeaturesPreventSpellInvocation(
      input.input.state,
      actor,
      input.invocation,
    )
  ) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "bonus-action Dash effect is unavailable while an active ongoing feature prevents spellcasting.",
    );
  }

  /* v8 ignore start -- @preserve -- Admitted Expeditious Retreat always has its SRD Verbal component; the non-revealing branch is retained only by the generic spell-facts shape. */
  const castingState = input.invocation.spellRuleFacts.components.verbal
    ? revealHidden(input.input.state, subject.actorId)
    : input.input.state;
  /* v8 ignore stop -- @preserve */
  const spellCastReactionWindow = maybeOpenSpellCastReactionWindow(
    input,
    [subject.actorId],
    { kind: "bonusAction" },
    undefined,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const spellCastState = battleStateAfterTargetActionEarlyEndForActor(
    castingState,
    subject.actorId,
  );
  const spent = spendActivationResource(spellCastState.currentTurnResources, {
    kind: "bonusAction",
  });
  /* v8 ignore start -- @preserve -- Internal preflight invariant: spellActTurnResourceAvailable immediately above proved the same unchanged action-economy state can spend this Bonus Action. */
  if (Result.isFailure(spent)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "bonus-action Dash effect Bonus Action is no longer available for the current actor.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const afterPriorConcentration = breakBattleConcentration(
    spellCastState,
    subject.actorId,
  );
  const resourced = Match.value(input.invocation.resource).pipe(
    Match.when({ tag: "spellAccessFreeCast" }, ({ resourcePoolRef }) =>
      spendSpellAccessFreeCastResource(
        {
          ...afterPriorConcentration,
          currentTurnResources: spent.success,
        },
        subject.actorId,
        resourcePoolRef,
        input.invocation,
        input.input.state,
      ),
    ),
    Match.when({ tag: "spellSlot" }, ({ slotLevel }) => {
      const slotTurnResources = markSpellSlotExpendedThisTurn(
        spent.success,
        input.input.subject.actorId,
      );
      /* v8 ignore start -- @preserve -- Internal preflight invariant: spellActTurnResourceAvailable already proved this actor has no Spell Slot use in the unchanged turn-resource state. */
      if (Result.isFailure(slotTurnResources)) {
        return invalidResult(
          input.input.state,
          "staleSubject",
          "This turn has already expended a Spell Slot.",
        );
      }
      /* v8 ignore stop -- @preserve */
      const slotted = expendSpellSlot(
        afterPriorConcentration,
        subject.actorId,
        slotLevel,
      );
      return {
        tag: "resolved" as const,
        state: {
          ...slotted,
          currentTurnResources: slotTurnResources.success,
        },
      };
    }),
    Match.exhaustive,
  );
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const effectHost = resourced.state.combatants.get(subject.actorId);
  /* v8 ignore start -- @preserve -- Internal roster invariant: the caster lookup succeeded above, and concentration teardown plus Spell Slot expenditure do not remove combatants. */
  if (effectHost === undefined) {
    return invalidResult(
      input.input.state,
      "missingCombatant",
      "bonus-action Dash effect caster is not in this battle.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const allocation = allocateBattleEffectExecutionRefForCreature({
    owner: effectHost,
  });
  const effectedActor = {
    ...allocation.owner,
    concentration: {
      sourceProcedureRef: input.invocation.sourceProcedureRef,
      effectKind: "spellEffect" as const,
    },
    activeEffects: [
      ...effectHost.activeEffects,
      {
        ...input.invocation.activeEffect,
        effectRef: allocation.effectRef,
        sourceProcedureRef: input.invocation.sourceProcedureRef,
      },
    ],
  };
  const effected = {
    ...resourced.state,
    combatants: new Map(resourced.state.combatants).set(
      subject.actorId,
      effectedActor,
    ),
  };
  const dashed = applyDashToActor(
    effected,
    effectedActor,
    subject.speedKind,
    effected.currentTurnResources,
  );
  return {
    tag: "resolved",
    state: dashed,
    snapshot: snapshotBattle(dashed),
  };
}

const GrantedAlternateActionCostInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("grantedAlternateActionCost"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("bonusAction"),
      activeEffect: SpellDashBonusActionEffectSchema,
    }),
  );
export const grantedAlternateActionCostProfile = {
  procedure: "grantedAlternateActionCost",
  executionSchema: GrantedAlternateActionCostInvocationSchema,
  admitMechanics: admitGrantedAlternateActionCostMechanics,
  discoverCastAct: discoverGrantedAlternateActionCostCastAct,
  resolve: resolveGrantedAlternateActionCost,
} satisfies SpellProcedureDeclaration<
  "grantedAlternateActionCost",
  GrantedAlternateActionCostInvocation
>;
