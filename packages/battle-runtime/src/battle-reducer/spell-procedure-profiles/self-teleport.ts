import {
  maybeOpenConfiguredSpellCastReactionWindow,
  spendConfiguredSpellCastResources,
} from "../spell-active-effect-resolution.ts";
import type { BattleSpellExecutionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-self-teleport
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SELF_TELEPORT_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ANTIMAGIC_FIELD_TRANSIT_BLOCKING
//
// The selfTeleport Spell Procedure Profile: a prepared Bonus Action spell that
// requires a caller-supplied table destination witness and emits a teleport
// outcome rather than spending Movement. Antimagic Field transit blocking is
// handled from caller-supplied aura origin/destination membership witnesses on
// that same destination fact.
//
// RAW anchors:
//   - SRD 5.2.1 Spells "Misty Step": Bonus Action, Self, Instantaneous;
//     teleport up to 30 feet to an unoccupied space the caster can see.
//   - SRD 5.2.1 Rules Glossary "Teleportation": teleportation does not expend
//     Movement, never provokes Opportunity Attacks, and transports worn and
//     carried equipment.
//   - SRD 5.2.1 Playing the Game "Bonus Actions" and "Opportunity Attacks":
//     one Bonus Action on a turn, and teleportation avoids Opportunity Attacks.
//   - UBIQUITOUS_LANGUAGE.md: Bonus Action, Spell Slot, Movement, Opportunity
//     Attack, and Teleportation.

import { movementFeet, PositiveInteger } from "@dnd/shared/types";

import {
  type BattleActDiscoveryCandidate,
  type BattleFill,
  type BattleResolutionResult,
  type BattleExecutableSpellInvocation,
  type BattleState,
  type BattleTeleportDestination,
  type BattleTeleportDestinationFact,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { snapshotBattle } from "../interrupt-execution.ts";
import { type CombatantId } from "../../identity.ts";

import { needsHolesResult } from "../needs-holes-result.ts";
import { invalidResult } from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import {
  spellTeleportDestinationHole,
  spellTeleportDestinationHoleId,
} from "../spells-targeting.ts";
import { magicSuppressionTransitInvalidReason } from "../magic-suppression-transit-blocking.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import type { SpellDefinitionRuleFacts } from "../../procedure-execution/spell-rule-facts.ts";
import {
  spellMechanicsObjectHasOnlyKeys,
  spellConsumedMaterialEvidencePaths,
  spellProcedureNonEmpty,
  spellUniqueMechanicsIssues,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
  type SpellProcedureAdmissionIssue,
} from "./spell-mechanics-admission.ts";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
import type { Components, SpellMechanics } from "@dnd/surface/surface/types";
import { Schema } from "effect";
import {
  spellInvocationResourceForCastOption,
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type SelfTeleportInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "selfTeleport" }
>;
type SelfTeleportResolveInput =
  SpellProcedureProfileResolveInput<SelfTeleportInvocation>;

type SelfTeleportMechanicsFacts = SpellDefinitionRuleFacts & {
  readonly maxDistanceFeet: ReturnType<typeof movementFeet>;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- This module-private tuple is the canonical source for SelfTeleportFailedFact.
const SELF_TELEPORT_FAILED_FACTS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "castingTime",
  "phaseCount",
  "phase",
  "phaseOrder",
  "attachment",
  "effects",
  "mode",
  "teleport",
] as const;
type SelfTeleportFailedFact = (typeof SELF_TELEPORT_FAILED_FACTS)[number];
type SelfTeleportMechanicsIssue = SpellProcedureAdmissionIssue<
  "selfTeleport",
  SelfTeleportFailedFact,
  UnitMechanicsPath
>;

type SelfTeleportMechanicsInspection = SpellProcedureMechanicsInspection<
  "selfTeleport",
  SelfTeleportMechanicsFacts,
  SelfTeleportInvocation,
  SelfTeleportMechanicsIssue
>;

function selfTeleportMechanicsIssue(
  failedFact: SelfTeleportFailedFact,
  mechanicsPath: UnitMechanicsPath,
): SelfTeleportMechanicsIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "selfTeleport",
    failedFact,
    mechanicsPath,
    message: `Unsupported selfTeleport mechanics fact: ${failedFact}.`,
  };
}

function selfTeleportMechanicsRepresentation(
  mechanics: SpellMechanics,
): mechanics is Extract<SpellMechanics, { readonly family: "activation" }> {
  if (mechanics.family !== "activation") return false;
  const hasDistinctiveHeaders =
    mechanics.level === 2 &&
    mechanics.school === "conjuration" &&
    mechanics.range.kind === "self" &&
    mechanics.duration.kind === "instantaneous" &&
    mechanics.castingTime.kind === "bonus_action";
  return (
    hasDistinctiveHeaders ||
    mechanics.phases.some(
      (phase) =>
        phase.kind === "direct" &&
        phase.effects?.some((effect) => effect.kind === "teleport") === true,
    )
  );
}

const SELF_TELEPORT_ROOT_FIELDS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "castingTime",
  "family",
  "phases",
] as const;
const SELF_TELEPORT_RANGE_FIELDS = ["kind"] as const;
const SELF_TELEPORT_COMPONENT_FIELDS = [
  "v",
  "s",
  "m",
  "materialCostGp",
  "materialConsumed",
] as const;
const SELF_TELEPORT_DURATION_FIELDS = ["kind"] as const;
const SELF_TELEPORT_CASTING_TIME_FIELDS = ["kind", "trigger"] as const;
const SELF_TELEPORT_PHASE_FIELDS = [
  "kind",
  "attachment",
  "effects",
  "mode",
] as const;
const SELF_TELEPORT_EFFECT_FIELDS = ["kind", "destination", "maxFeet"] as const;

type GenericSpellComponents = Extract<
  Components,
  { readonly m: false | string }
>;

function isGenericSpellComponents(
  components: Components,
): components is GenericSpellComponents {
  return components.m === false || typeof components.m === "string";
}

function selfTeleportMechanicsEvidence(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
  phaseOrdinal: ReturnType<typeof PositiveInteger>,
  phase: Extract<
    Extract<
      SpellMechanics,
      { readonly family: "activation" }
    >["phases"][number],
    { readonly kind: "direct" }
  >,
): SpellProcedureMechanicsEvidence {
  const consumed: [SpellMechanicsBranchPath, ...SpellMechanicsBranchPath[]] = [
    spellMechanicsHeaderPath("level"),
    spellMechanicsHeaderPath("school"),
    spellMechanicsHeaderPath("range"),
    spellMechanicsHeaderPath("components"),
    spellMechanicsHeaderPath("duration"),
    spellMechanicsHeaderPath("castingTime"),
    spellMechanicsHeaderPath("family"),
    spellActivationPhasePath(phaseOrdinal),
    spellActivationAttachmentPath(phaseOrdinal),
    ...(phase.effects ?? []).map((_effect, index) =>
      spellActivationEffectPath(phaseOrdinal, PositiveInteger(index + 1)),
    ),
    ...spellConsumedMaterialEvidencePaths(mechanics.components),
  ];
  return { consumed, unowned: [] };
}

function selfTeleportIssueUnless(
  present: boolean,
  failedFact: SelfTeleportFailedFact,
  mechanicsPath: UnitMechanicsPath,
): readonly SelfTeleportMechanicsIssue[] {
  return present ? [] : [selfTeleportMechanicsIssue(failedFact, mechanicsPath)];
}

function selfTeleportComponentsAreSupported(components: Components): boolean {
  if (!isGenericSpellComponents(components)) return false;
  return [
    components.m === false,
    components.v === true,
    components.s === false,
    spellMechanicsObjectHasOnlyKeys<GenericSpellComponents>(
      components,
      SELF_TELEPORT_COMPONENT_FIELDS,
    ),
    !("materialCostGp" in components),
    !("materialConsumed" in components),
  ].every(Boolean);
}

function selfTeleportCastingTimeIsSupported(
  castingTime: Extract<
    SpellMechanics,
    { readonly family: "activation" }
  >["castingTime"],
): boolean {
  if (castingTime.kind !== "bonus_action") return false;
  return [
    castingTime.trigger === undefined,
    spellMechanicsObjectHasOnlyKeys(
      castingTime,
      SELF_TELEPORT_CASTING_TIME_FIELDS,
    ),
  ].every(Boolean);
}

function selfTeleportHeaderIssues(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): readonly SelfTeleportMechanicsIssue[] {
  const componentsSupported = selfTeleportComponentsAreSupported(
    mechanics.components,
  );
  return [
    ...selfTeleportIssueUnless(
      mechanics.level === 2,
      "level",
      spellMechanicsHeaderPath("level"),
    ),
    ...selfTeleportIssueUnless(
      mechanics.school === "conjuration",
      "school",
      spellMechanicsHeaderPath("school"),
    ),
    ...selfTeleportIssueUnless(
      spellMechanicsObjectHasOnlyKeys(mechanics, SELF_TELEPORT_ROOT_FIELDS),
      "phase",
      spellMechanicsHeaderPath("family"),
    ),
    ...selfTeleportIssueUnless(
      [
        mechanics.range.kind === "self",
        spellMechanicsObjectHasOnlyKeys(
          mechanics.range,
          SELF_TELEPORT_RANGE_FIELDS,
        ),
      ].every(Boolean),
      "range",
      spellMechanicsHeaderPath("range"),
    ),
    ...selfTeleportIssueUnless(
      componentsSupported,
      "components",
      spellMechanicsHeaderPath("components"),
    ),
    ...(componentsSupported
      ? []
      : spellConsumedMaterialEvidencePaths(mechanics.components).map((path) =>
          selfTeleportMechanicsIssue("components", path),
        )),
    ...selfTeleportIssueUnless(
      [
        mechanics.duration.kind === "instantaneous",
        spellMechanicsObjectHasOnlyKeys(
          mechanics.duration,
          SELF_TELEPORT_DURATION_FIELDS,
        ),
      ].every(Boolean),
      "duration",
      spellMechanicsHeaderPath("duration"),
    ),
    ...selfTeleportIssueUnless(
      selfTeleportCastingTimeIsSupported(mechanics.castingTime),
      "castingTime",
      spellMechanicsHeaderPath("castingTime"),
    ),
  ];
}

function selfTeleportPhaseCountIssues(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
  phaseIndex: number,
): readonly SelfTeleportMechanicsIssue[] {
  if (mechanics.phases.length === 1) return [];
  if (mechanics.phases.length === 0) {
    return [selfTeleportMechanicsIssue("phaseCount", spellMechanicsRootPath())];
  }
  return mechanics.phases.flatMap((_phase, index) =>
    index === phaseIndex
      ? []
      : [
          selfTeleportMechanicsIssue(
            "phaseCount",
            spellActivationPhasePath(PositiveInteger(index + 1)),
          ),
        ],
  );
}

function selfTeleportPhaseOrderIssues(
  phaseIndex: number,
  phaseOrdinal: ReturnType<typeof PositiveInteger>,
): readonly SelfTeleportMechanicsIssue[] {
  if (phaseIndex < 0) {
    return [
      selfTeleportMechanicsIssue(
        "phase",
        spellActivationPhasePath(phaseOrdinal),
      ),
    ];
  }
  return phaseIndex === 0
    ? []
    : [
        selfTeleportMechanicsIssue(
          "phaseOrder",
          spellActivationPhasePath(phaseOrdinal),
        ),
      ];
}

function selfTeleportEffectCountIssues(
  effects: readonly unknown[],
  phaseOrdinal: ReturnType<typeof PositiveInteger>,
): readonly SelfTeleportMechanicsIssue[] {
  if (effects.length === 1) return [];
  if (effects.length === 0) {
    return [
      selfTeleportMechanicsIssue(
        "effects",
        spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
      ),
    ];
  }
  return effects
    .slice(1)
    .map((_effect, index) =>
      selfTeleportMechanicsIssue(
        "effects",
        spellActivationEffectPath(phaseOrdinal, PositiveInteger(index + 2)),
      ),
    );
}

function selfTeleportPhaseIssues(
  phase:
    | Extract<
        Extract<
          SpellMechanics,
          { readonly family: "activation" }
        >["phases"][number],
        { readonly kind: "direct" }
      >
    | undefined,
  phaseOrdinal: ReturnType<typeof PositiveInteger>,
): readonly SelfTeleportMechanicsIssue[] {
  if (phase === undefined) {
    return [
      selfTeleportMechanicsIssue(
        "phase",
        spellActivationPhasePath(phaseOrdinal),
      ),
    ];
  }
  const effects = phase.effects ?? [];
  const firstEffect = effects[0];
  const teleportIsSupported =
    firstEffect !== undefined &&
    firstEffect.kind === "teleport" &&
    [
      firstEffect.destination === "unoccupied_visible_space",
      firstEffect.maxFeet === 30,
      spellMechanicsObjectHasOnlyKeys(firstEffect, SELF_TELEPORT_EFFECT_FIELDS),
    ].every(Boolean);
  return [
    ...selfTeleportIssueUnless(
      [
        spellMechanicsObjectHasOnlyKeys(phase, SELF_TELEPORT_PHASE_FIELDS),
        phase.attachment.kind === "self",
      ].every(Boolean),
      "attachment",
      spellActivationAttachmentPath(phaseOrdinal),
    ),
    ...selfTeleportIssueUnless(
      phase.mode === undefined,
      "mode",
      spellActivationPhasePath(phaseOrdinal),
    ),
    ...selfTeleportEffectCountIssues(effects, phaseOrdinal),
    ...selfTeleportIssueUnless(
      teleportIsSupported,
      "teleport",
      spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
    ),
  ];
}

type SelfTeleportDirectPhase = Extract<
  Extract<SpellMechanics, { readonly family: "activation" }>["phases"][number],
  { readonly kind: "direct" }
>;

function selfTeleportPhaseInspection(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
) {
  const phaseIndex = mechanics.phases.findIndex(
    (candidate) =>
      candidate.kind === "direct" &&
      candidate.effects?.some((effect) => effect.kind === "teleport") === true,
  );
  const inspectedPhase = mechanics.phases[phaseIndex];
  const phase = inspectedPhase?.kind === "direct" ? inspectedPhase : undefined;
  const phaseOrdinal = PositiveInteger(Math.max(0, phaseIndex) + 1);
  const effects = phase?.effects ?? [];
  const teleport = effects.find((effect) => effect.kind === "teleport");
  return { phaseIndex, phase, phaseOrdinal, effects, teleport };
}

function supportedSelfTeleportPhase(
  inspection: ReturnType<typeof selfTeleportPhaseInspection>,
):
  | {
      readonly phase: SelfTeleportDirectPhase;
      readonly teleport: Extract<
        NonNullable<SelfTeleportDirectPhase["effects"]>[number],
        { readonly kind: "teleport" }
      >;
    }
  | undefined {
  if (
    inspection.phase === undefined ||
    inspection.effects.length !== 1 ||
    inspection.teleport?.kind !== "teleport"
  ) {
    return undefined;
  }
  return { phase: inspection.phase, teleport: inspection.teleport };
}

function admitSelfTeleportMechanics(
  source: SpellMechanicsAdmissionSource,
): SelfTeleportMechanicsInspection {
  if (!selfTeleportMechanicsRepresentation(source.mechanics)) {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const phaseInspection = selfTeleportPhaseInspection(mechanics);
  const { phaseIndex, phase, phaseOrdinal } = phaseInspection;
  const issues = [
    ...selfTeleportHeaderIssues(mechanics),
    ...selfTeleportPhaseCountIssues(mechanics, phaseIndex),
    ...selfTeleportPhaseOrderIssues(phaseIndex, phaseOrdinal),
    ...selfTeleportPhaseIssues(phase, phaseOrdinal),
  ];

  const nonEmpty = spellProcedureNonEmpty(spellUniqueMechanicsIssues(issues));
  if (nonEmpty !== undefined) {
    return { tag: "unsupported", issues: nonEmpty };
  }
  const supportedPhase = supportedSelfTeleportPhase(phaseInspection);
  if (supportedPhase === undefined) {
    return {
      tag: "unsupported",
      issues: [
        selfTeleportMechanicsIssue(
          "teleport",
          spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
        ),
      ],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    maxDistanceFeet: movementFeet(supportedPhase.teleport.maxFeet),
  } satisfies SelfTeleportMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "selfTeleport",
      facts,
      evidence: selfTeleportMechanicsEvidence(
        mechanics,
        phaseOrdinal,
        supportedPhase.phase,
      ),
      admit: (executionSource, ctx) =>
        admitSelfTeleport(executionSource, ctx, facts),
    },
  };
}

function admitSelfTeleport(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: SelfTeleportMechanicsFacts,
): readonly SelfTeleportInvocation[] {
  return ctx.spellCastOptions.flatMap(
    (slot): readonly SelfTeleportInvocation[] =>
      Number(slot.spellLevel) < Number(facts.level)
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "selfTeleport",
              spell,
              actionCost: "bonusAction",
              maxDistanceFeet: facts.maxDistanceFeet,
            },
          ],
  );
}

function discoverSelfTeleportCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: import("../../battle-state-execution.ts").BattleExecutableSpellInvocation<SelfTeleportInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  return [
    {
      subject: {
        tag: "bonusActionSpell" as const,
        actorId,
        procedureRef: invocation.sourceProcedureRef,
        mode: { tag: "cast" as const },
      },
      initialHoles: [spellTeleportDestinationHole(invocation, actorId)],
    },
  ];
}

function resolveSelfTeleport(
  input: SelfTeleportResolveInput,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !fillsBelongToSpellCastHoles(input.input.fills, [
      spellTeleportDestinationHoleId(input.invocation, input.actorId),
    ])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Self-teleport spells use a teleport-destination fill only.",
    );
  }
  /* v8 ignore stop -- @preserve */

  if (input.fillSet.teleportDestination === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellTeleportDestinationHole(input.invocation, input.actorId),
    ]);
  }
  const destinationFill = input.fillSet.teleportDestination;
  const destination = destinationFill.value;
  const validation = validateSelfTeleportDestination(
    input.invocation,
    input.actorId,
    destinationFill,
    destination,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (validation !== null) {
    return invalidResult(input.input.state, "invalidFill", validation);
  }
  /* v8 ignore stop -- @preserve */
  const antimagicTransitInvalidReason = magicSuppressionTransitInvalidReason({
    state: input.input.state,
    actorId: input.actorId,
    witnesses: destination.magicSuppressionTransit,
  });
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (antimagicTransitInvalidReason !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      antimagicTransitInvalidReason,
    );
  }
  /* v8 ignore stop -- @preserve */

  const resolution = { ...input, actionCostOverride: "bonusAction" as const };
  const spellCastReactionWindow = maybeOpenConfiguredSpellCastReactionWindow({
    resolution,
    targetIds: [],
  });
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const resourced = spendConfiguredSpellCastResources({
    resolution,
    state: input.input.state,
  });
  return resourced.tag === "invalid"
    ? resourced
    : {
        tag: "resolved",
        state: resourced.state,
        snapshot: snapshotBattle(resourced.state),
        teleports: [
          {
            kind: "selfTeleport",
            actorId: input.actorId,
            sourceProcedureRef: input.invocation.sourceProcedureRef,
            destination: selfTeleportOutcomeDestination(destination),
            spendsMovement: false,
            provokesOpportunityAttacks: false,
            transportsWornAndCarriedEquipment: true,
          },
        ],
      };
}

function selfTeleportOutcomeDestination(
  destination: BattleTeleportDestinationFact,
): BattleTeleportDestination {
  return {
    kind: destination.kind,
    destinationId: destination.destinationId,
    distanceFeet: destination.distanceFeet,
  };
}

/* v8 ignore start -- @preserve -- Malformed teleport witness: discovery binds the destination hole to this caster and spell and offers only nonzero destinations within the invocation range. */
function validateSelfTeleportDestination(
  invocation: BattleExecutableSpellInvocation<SelfTeleportInvocation>,
  actorId: CombatantId,
  fill: Extract<BattleFill, { readonly kind: "teleportDestination" }>,
  destination: BattleTeleportDestinationFact,
): string | null {
  if (fill.holeId !== spellTeleportDestinationHoleId(invocation, actorId)) {
    return "Teleport destination must use the selected spell act destination hole.";
  }
  if (destination.actorId !== actorId) {
    return "Teleport destination table fact must match the caster.";
  }
  if (destination.sourceProcedureRef !== invocation.sourceProcedureRef) {
    return "Teleport destination table fact must match the spell.";
  }
  if (destination.distanceFeet <= 0) {
    return "Teleport destination must be more than 0 feet away.";
  }
  if (destination.distanceFeet > invocation.maxDistanceFeet) {
    return `Spell destination must be within ${invocation.maxDistanceFeet} feet.`;
  }
  return null;
}
/* v8 ignore stop -- @preserve */

const SelfTeleportInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("selfTeleport"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("bonusAction"),
    maxDistanceFeet: MovementFeet,
  }),
);
export const selfTeleportProfile = {
  procedure: "selfTeleport",
  executionSchema: SelfTeleportInvocationSchema,
  admitMechanics: admitSelfTeleportMechanics,
  discoverCastAct: discoverSelfTeleportCastAct,
  resolve: resolveSelfTeleport,
} satisfies SpellProcedureDeclaration<"selfTeleport", SelfTeleportInvocation>;
