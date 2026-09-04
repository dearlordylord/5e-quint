import type { BattleSpellExecutionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-dancing-lights-movable-dim-light
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.DANCING_LIGHTS_EMITTER_LIFECYCLE
//
// The Dancing Lights profile family: a Magic Action cantrip cast creates either
// one combined Medium form or one to four separate movable Dim Light emitters,
// and later Bonus Actions reposition the active lights while Concentration
// persists.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-A-D.md "Dancing Lights":
//     Action; 120 feet; Concentration up to 1 minute; up to four
//     torch-size lights or one combined Medium form; each sheds Dim Light in a
//     10-foot radius; Bonus Action movement up to 60 feet; each light must be
//     within 20 feet of another light; a light vanishes if it exceeds range.
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Bonus Action, Concentration,
//     Spell Invocation, Spell Effect, Illumination, and Dim.
//
// What stays in shared infrastructure: the resolver body remains in
// spells-resolve-release.ts because the release resolver owns spell-cast
// interrupt checkpoints, active-effect commit, spell-resource spend, and placement
// validation for held-light and other release-style spells too.

import {
  elapsedTimeTicksFromTimeSpanDuration,
  ElapsedTimeTicksSchema,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import { MovementFeet, movementFeet, PositiveInteger } from "@dnd/shared/types";
import { Match, Result } from "effect";
import type { SpellMechanics } from "@dnd/surface/surface/types";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
import {
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
  spellOngoingAttachmentPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";

import {
  type BattleActDiscoveryCandidate,
  type ActionSpellBattleResolutionInput,
  type BattleExecutableSpellInvocation,
  type BattleActiveEffect,
  type BattleResolutionResult,
  type BattleState,
  type BonusActionSpellBattleResolutionInput,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import {
  BattleEffectExecutionRef,
  BattleProcedureExecutionRef,
  CombatantId,
} from "../../identity.ts";
import {
  MOVABLE_LIGHT_DIM_LIGHT_RADIUS_FEET,
  movableLightFromEffect,
} from "../spells-active-effects.ts";
import {
  resolveMovableLightCastSpellAct,
  resolveMovableLightRepositionSpellAct,
} from "../spells-resolve-release.ts";
import { invalidResult } from "../result-helpers.ts";
import { spellMovableLightPlacementHole } from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { cantripSpellAccessFor } from "./profile.ts";
import { Schema } from "effect";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  CantripSpellAccessSchema,
  NoSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  spellConsumedMaterialEvidencePaths,
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

const MovableLightExpirationSchema = Schema.Struct({
  kind: Schema.Literal("concentration"),
  combatantId: CombatantId,
  durationTicks: ElapsedTimeTicksSchema,
});

const MOVABLE_LIGHT_RANGE_FEET = 120;
const MOVABLE_LIGHT_DURATION_MINUTES = 1;
const MOVABLE_LIGHT_REPOSITION_MAX_FEET = 60;
const MOVABLE_LIGHT_SPACING_FEET = 20;

type MovableLightSeparateCastInvocation = Extract<
  SupportedSpellInvocation,
  {
    readonly procedure: "movableLightManifestation";
    readonly operation: "create";
    readonly form: "separateLights";
  }
>;
type MovableLightCombinedCastInvocation = Extract<
  SupportedSpellInvocation,
  {
    readonly procedure: "movableLightManifestation";
    readonly operation: "create";
    readonly form: "combinedMediumForm";
  }
>;
type MovableLightRepositionInvocation = Extract<
  SupportedSpellInvocation,
  {
    readonly procedure: "movableLightManifestation";
    readonly operation: "reposition";
  }
>;
type MovableLightCastInvocation =
  | MovableLightSeparateCastInvocation
  | MovableLightCombinedCastInvocation;
type MovableLightCastResolveInput =
  SpellProcedureProfileResolveInput<MovableLightCastInvocation>;
type MovableLightRepositionResolveInput =
  SpellProcedureProfileResolveInput<MovableLightRepositionInvocation>;
type ExecutableMovableLightManifestationInvocation = Extract<
  BattleExecutableSpellInvocation,
  { readonly procedure: "movableLightManifestation" }
>;
type ExecutableMovableLightCastInvocation = Extract<
  ExecutableMovableLightManifestationInvocation,
  { readonly operation: "create" }
>;
type ExecutableMovableLightRepositionInvocation = Extract<
  ExecutableMovableLightManifestationInvocation,
  { readonly operation: "reposition" }
>;
type ExecutableMovableLightCastResolveInput = MovableLightCastResolveInput & {
  readonly input: ActionSpellBattleResolutionInput;
  readonly invocation: ExecutableMovableLightCastInvocation;
};
type ExecutableMovableLightRepositionResolveInput =
  MovableLightRepositionResolveInput & {
    readonly input: BonusActionSpellBattleResolutionInput;
    readonly invocation: ExecutableMovableLightRepositionInvocation;
  };

function admitMovableLightSeparateCast(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: MovableLightMechanicsFacts,
): readonly MovableLightSeparateCastInvocation[] {
  return [
    {
      ...movableLightCantripBase(spell, facts),
      procedure: "movableLightManifestation",
      operation: "create",
      actionCost: "magicAction",
      form: "separateLights",
      expiresAt: {
        kind: "concentration",
        combatantId: ctx.actor.combatantId,
        durationTicks: facts.durationTicks,
      },
    },
  ];
}

function admitMovableLightCombinedCast(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: MovableLightMechanicsFacts,
): readonly MovableLightCombinedCastInvocation[] {
  return [
    {
      ...movableLightCantripBase(spell, facts),
      procedure: "movableLightManifestation",
      operation: "create",
      actionCost: "magicAction",
      form: "combinedMediumForm",
      expiresAt: {
        kind: "concentration",
        combatantId: ctx.actor.combatantId,
        durationTicks: facts.durationTicks,
      },
    },
  ];
}

function movableLightCantripBase(
  spell: BattleSpellExecutionSource,
  facts: MovableLightMechanicsFacts,
) {
  return {
    access: cantripSpellAccessFor(spell.castingSource),
    resource: { tag: "none" as const },
    spell,
    dimRadiusFeet: facts.dimRadiusFeet,
    rangeFeet: facts.rangeFeet,
    maxMoveFeet: facts.maxMoveFeet,
    spacingFeet: facts.spacingFeet,
  };
}

type MovableLightSpellProfile = {
  readonly durationTicks: ElapsedTimeTicks;
  readonly dimRadiusFeet: MovementFeet;
  readonly rangeFeet: MovementFeet;
  readonly maxMoveFeet: MovementFeet;
  readonly spacingFeet: MovementFeet;
};
type MovableLightMechanics = Extract<
  SpellMechanics,
  { readonly family: "ongoing_effect" }
>;
type MovableLightMechanicsFacts = SpellProcedureMechanicsFacts &
  MovableLightSpellProfile;
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- This module-private tuple is the canonical source for MovableLightFailedFact.
const MOVABLE_LIGHT_FAILED_FACTS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "castingTime",
  "attachment",
  "initialPhase",
  "authoredConditionalEffects",
  "operationCount",
  "illusionOperation",
  "illuminationOperation",
  "repositionOperation",
] as const;
type MovableLightFailedFact = (typeof MOVABLE_LIGHT_FAILED_FACTS)[number];
type MovableLightAdmissionIssue = SpellProcedureAdmissionIssue<
  "movableLightManifestation",
  MovableLightFailedFact,
  UnitMechanicsPath
>;
type MovableLightOperation = MovableLightMechanics["operations"][number];

const MOVABLE_LIGHT_ROOT_FIELDS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "castingTime",
  "family",
  "attachment",
  "initialPhase",
  "operations",
  "authoredConditionalEffects",
] as const satisfies ReadonlyArray<keyof MovableLightMechanics>;
const MOVABLE_LIGHT_RANGE_FIELDS = ["kind", "feet"] as const;
const MOVABLE_LIGHT_CASTING_TIME_FIELDS = ["kind"] as const;
const MOVABLE_LIGHT_COMPONENT_FIELDS = ["v", "s", "m"] as const;
const MOVABLE_LIGHT_DURATION_FIELDS = ["kind", "upTo"] as const;
const MOVABLE_LIGHT_DURATION_VALUE_FIELDS = ["unit", "amount"] as const;
const MOVABLE_LIGHT_ATTACHMENT_FIELDS = [
  "kind",
  "holeId",
  "label",
  "value",
] as const;
const MOVABLE_LIGHT_AREA_FIELDS = ["kind", "origin", "shape"] as const;
const MOVABLE_LIGHT_ORIGIN_FIELDS = ["kind"] as const;
const MOVABLE_LIGHT_SHAPE_FIELDS = ["kind", "radiusFeet"] as const;
const MOVABLE_LIGHT_OPERATION_FIELDS = ["trigger", "effect"] as const;
const MOVABLE_LIGHT_PASSIVE_TRIGGER_FIELDS = ["kind"] as const;
const MOVABLE_LIGHT_REPOSITION_TRIGGER_FIELDS = ["kind", "cost"] as const;
const MOVABLE_LIGHT_ACTION_COST_FIELDS = ["kind"] as const;
const MOVABLE_LIGHT_ILLUSION_EFFECT_FIELDS = [
  "kind",
  "channels",
  "maxSize",
] as const;
const MOVABLE_LIGHT_ILLUMINATION_EFFECT_FIELDS = [
  "kind",
  "radiusFeet",
] as const;
const MOVABLE_LIGHT_REPOSITION_EFFECT_FIELDS = ["kind", "maxMoveFeet"] as const;

function movableLightIssue(
  failedFact: MovableLightFailedFact,
  mechanicsPath: UnitMechanicsPath,
): MovableLightAdmissionIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "movableLightManifestation",
    failedFact,
    mechanicsPath,
    message: `Unsupported movableLightManifestation mechanics fact: ${failedFact}.`,
  };
}

function movableLightPassiveOperationShellIsSupported(
  operation: MovableLightOperation,
): boolean {
  return (
    spellMechanicsObjectHasOnlyKeys(
      operation,
      MOVABLE_LIGHT_OPERATION_FIELDS,
    ) &&
    operation.trigger.kind === "passive" &&
    spellMechanicsObjectHasOnlyKeys(
      operation.trigger,
      MOVABLE_LIGHT_PASSIVE_TRIGGER_FIELDS,
    )
  );
}

function movableLightRepositionOperationShellIsSupported(
  operation: MovableLightOperation,
): boolean {
  return (
    spellMechanicsObjectHasOnlyKeys(
      operation,
      MOVABLE_LIGHT_OPERATION_FIELDS,
    ) &&
    operation.trigger.kind === "on_caster_spends_action" &&
    spellMechanicsObjectHasOnlyKeys(
      operation.trigger,
      MOVABLE_LIGHT_REPOSITION_TRIGGER_FIELDS,
    ) &&
    operation.trigger.cost?.kind === "bonus_action" &&
    spellMechanicsObjectHasOnlyKeys(
      operation.trigger.cost,
      MOVABLE_LIGHT_ACTION_COST_FIELDS,
    )
  );
}

function movableLightIllusionOperationIsSupported(
  operation: MovableLightOperation,
): boolean {
  return (
    movableLightPassiveOperationShellIsSupported(operation) &&
    operation.effect.kind === "create_illusion" &&
    spellMechanicsObjectHasOnlyKeys(
      operation.effect,
      MOVABLE_LIGHT_ILLUSION_EFFECT_FIELDS,
    ) &&
    operation.effect.channels.length === 1 &&
    operation.effect.channels[0] === "visual" &&
    operation.effect.maxSize === "medium"
  );
}

function movableLightIlluminationOperationIsSupported(
  operation: MovableLightOperation,
): boolean {
  return (
    movableLightPassiveOperationShellIsSupported(operation) &&
    operation.effect.kind === "emit_dim_illumination" &&
    spellMechanicsObjectHasOnlyKeys(
      operation.effect,
      MOVABLE_LIGHT_ILLUMINATION_EFFECT_FIELDS,
    ) &&
    operation.effect.radiusFeet === Number(MOVABLE_LIGHT_DIM_LIGHT_RADIUS_FEET)
  );
}

function movableLightRepositionOperationIsSupported(
  operation: MovableLightOperation,
): boolean {
  return (
    movableLightRepositionOperationShellIsSupported(operation) &&
    operation.effect.kind === "reposition_attachment" &&
    spellMechanicsObjectHasOnlyKeys(
      operation.effect,
      MOVABLE_LIGHT_REPOSITION_EFFECT_FIELDS,
    ) &&
    operation.effect.maxMoveFeet === MOVABLE_LIGHT_REPOSITION_MAX_FEET
  );
}

const MOVABLE_LIGHT_OPERATION_CHECKS = [
  {
    failedFact: "illusionOperation" as const,
    represented: (operation: MovableLightOperation) =>
      operation.effect.kind === "create_illusion",
    shellSupported: movableLightPassiveOperationShellIsSupported,
    supported: movableLightIllusionOperationIsSupported,
  },
  {
    failedFact: "illuminationOperation" as const,
    represented: (operation: MovableLightOperation) =>
      operation.effect.kind === "emit_dim_illumination",
    shellSupported: movableLightPassiveOperationShellIsSupported,
    supported: movableLightIlluminationOperationIsSupported,
  },
  {
    failedFact: "repositionOperation" as const,
    represented: (operation: MovableLightOperation) =>
      operation.effect.kind === "reposition_attachment",
    shellSupported: movableLightRepositionOperationShellIsSupported,
    supported: movableLightRepositionOperationIsSupported,
  },
] as const;

function movableLightRepresentation(
  mechanics: SpellMechanics,
): mechanics is MovableLightMechanics {
  if (mechanics.family !== "ongoing_effect") return false;
  const hasCharacteristicOperation = MOVABLE_LIGHT_OPERATION_CHECKS.some(
    (check) => mechanics.operations.some(check.represented),
  );
  const hasHeader =
    mechanics.level === 0 &&
    mechanics.school === "illusion" &&
    mechanics.castingTime.kind === "action";
  const hasRange =
    mechanics.range.kind === "point" &&
    mechanics.range.feet === MOVABLE_LIGHT_RANGE_FEET;
  const hasDuration =
    mechanics.duration.kind === "concentration" &&
    mechanics.duration.upTo.unit === "minute" &&
    mechanics.duration.upTo.amount === MOVABLE_LIGHT_DURATION_MINUTES;
  const hasAreaAttachment =
    mechanics.attachment.kind === "hole" &&
    mechanics.attachment.value.kind === "area" &&
    mechanics.attachment.value.origin.kind === "point_within_range" &&
    mechanics.attachment.value.shape.kind === "sphere" &&
    mechanics.attachment.value.shape.radiusFeet === 10;
  return (
    hasCharacteristicOperation &&
    spellProcedureHasRedundantSignature({
      kind: "oneOfFiveWitnessesMayBeMissing",
      witnesses: [
        { name: "operations", present: hasCharacteristicOperation },
        { name: "header", present: hasHeader },
        { name: "range", present: hasRange },
        { name: "duration", present: hasDuration },
        { name: "attachment", present: hasAreaAttachment },
      ],
    })
  );
}

function movableLightAttachmentIsSupported(
  attachment: MovableLightMechanics["attachment"],
): boolean {
  return (
    attachment.kind === "hole" &&
    spellMechanicsObjectHasOnlyKeys(
      attachment,
      MOVABLE_LIGHT_ATTACHMENT_FIELDS,
    ) &&
    attachment.value.kind === "area" &&
    spellMechanicsObjectHasOnlyKeys(
      attachment.value,
      MOVABLE_LIGHT_AREA_FIELDS,
    ) &&
    attachment.value.origin.kind === "point_within_range" &&
    spellMechanicsObjectHasOnlyKeys(
      attachment.value.origin,
      MOVABLE_LIGHT_ORIGIN_FIELDS,
    ) &&
    attachment.value.shape.kind === "sphere" &&
    attachment.value.shape.radiusFeet === 10 &&
    spellMechanicsObjectHasOnlyKeys(
      attachment.value.shape,
      MOVABLE_LIGHT_SHAPE_FIELDS,
    )
  );
}

function movableLightMechanicsEvidence(
  mechanics: MovableLightMechanics,
): SpellProcedureMechanicsEvidence {
  return {
    consumed: [
      spellMechanicsHeaderPath("level"),
      spellMechanicsHeaderPath("school"),
      spellMechanicsHeaderPath("range"),
      spellMechanicsHeaderPath("components"),
      spellMechanicsHeaderPath("duration"),
      spellMechanicsHeaderPath("castingTime"),
      spellMechanicsHeaderPath("family"),
      spellDurationValuePath(),
      spellOngoingAttachmentPath(),
      ...mechanics.operations.flatMap((_operation, index) => [
        spellOngoingOperationPath(PositiveInteger(index + 1)),
        spellOngoingOperationEffectPath(PositiveInteger(index + 1)),
      ]),
      ...spellConsumedMaterialEvidencePaths(mechanics.components),
    ],
    unowned: [],
  };
}

function admitMovableLightMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "movableLightManifestation",
  MovableLightMechanicsFacts,
  MovableLightCastInvocation,
  MovableLightAdmissionIssue
> {
  if (!movableLightRepresentation(source.mechanics)) {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const issues: Array<{
    readonly failedFact: MovableLightFailedFact;
    readonly mechanicsPath: UnitMechanicsPath;
  }> = [];
  const pushIssue = (
    failedFact: MovableLightFailedFact,
    mechanicsPath: UnitMechanicsPath,
  ): void => {
    issues.push({ failedFact, mechanicsPath });
  };

  if (mechanics.level !== 0)
    pushIssue("level", spellMechanicsHeaderPath("level"));
  if (mechanics.school !== "illusion")
    pushIssue("school", spellMechanicsHeaderPath("school"));
  if (
    mechanics.range.kind !== "point" ||
    mechanics.range.feet !== MOVABLE_LIGHT_RANGE_FEET ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.range,
      MOVABLE_LIGHT_RANGE_FIELDS,
    )
  )
    pushIssue("range", spellMechanicsHeaderPath("range"));
  if (
    mechanics.castingTime.kind !== "action" ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.castingTime,
      MOVABLE_LIGHT_CASTING_TIME_FIELDS,
    )
  )
    pushIssue("castingTime", spellMechanicsHeaderPath("castingTime"));
  if (
    mechanics.components.v !== true ||
    mechanics.components.s !== true ||
    typeof mechanics.components.m !== "string" ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.components,
      MOVABLE_LIGHT_COMPONENT_FIELDS,
    )
  )
    pushIssue("components", spellMechanicsHeaderPath("components"));
  const durationTicks =
    mechanics.duration.kind === "concentration"
      ? elapsedTimeTicksFromTimeSpanDuration(mechanics.duration.upTo)
      : undefined;
  if (
    mechanics.duration.kind !== "concentration" ||
    mechanics.duration.upTo.unit !== "minute" ||
    mechanics.duration.upTo.amount !== MOVABLE_LIGHT_DURATION_MINUTES ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.duration,
      MOVABLE_LIGHT_DURATION_FIELDS,
    ) ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.duration.upTo,
      MOVABLE_LIGHT_DURATION_VALUE_FIELDS,
    ) ||
    durationTicks === undefined ||
    Result.isFailure(durationTicks)
  )
    pushIssue("duration", spellDurationValuePath());
  if (!movableLightAttachmentIsSupported(mechanics.attachment))
    pushIssue("attachment", spellOngoingAttachmentPath());
  if (mechanics.initialPhase !== undefined)
    pushIssue("initialPhase", spellOngoingInitialPhasePath());
  if (
    mechanics.authoredConditionalEffects !== undefined ||
    !spellMechanicsObjectHasOnlyKeys(mechanics, MOVABLE_LIGHT_ROOT_FIELDS)
  )
    pushIssue("authoredConditionalEffects", spellMechanicsRootPath());

  const missingChecks = MOVABLE_LIGHT_OPERATION_CHECKS.filter(
    (check) => !mechanics.operations.some(check.represented),
  );
  for (const [missingIndex, check] of missingChecks.entries()) {
    pushIssue(
      check.failedFact,
      spellOngoingOperationEffectPath(
        PositiveInteger(mechanics.operations.length + missingIndex + 1),
      ),
    );
  }
  for (const check of MOVABLE_LIGHT_OPERATION_CHECKS) {
    const represented = mechanics.operations.flatMap((operation, index) =>
      check.represented(operation) ? [{ operation, index }] : [],
    );
    for (const { operation, index } of represented) {
      if (!check.supported(operation))
        pushIssue(
          check.failedFact,
          check.shellSupported(operation)
            ? spellOngoingOperationEffectPath(PositiveInteger(index + 1))
            : spellOngoingOperationPath(PositiveInteger(index + 1)),
        );
    }
    for (const { index } of represented.slice(1))
      pushIssue(
        "operationCount",
        spellOngoingOperationPath(PositiveInteger(index + 1)),
      );
  }
  for (const [index, operation] of mechanics.operations.entries()) {
    if (
      !MOVABLE_LIGHT_OPERATION_CHECKS.some((check) =>
        check.represented(operation),
      )
    )
      pushIssue(
        "operationCount",
        spellOngoingOperationPath(PositiveInteger(index + 1)),
      );
  }
  if (mechanics.operations.length < MOVABLE_LIGHT_OPERATION_CHECKS.length) {
    for (
      let missingOrdinal = mechanics.operations.length + 1;
      missingOrdinal <= MOVABLE_LIGHT_OPERATION_CHECKS.length;
      missingOrdinal += 1
    )
      pushIssue(
        "operationCount",
        spellOngoingOperationPath(PositiveInteger(missingOrdinal)),
      );
  }

  const failures = spellProcedureNonEmpty(spellUniqueMechanicsIssues(issues));
  if (failures !== undefined) {
    return {
      tag: "unsupported",
      issues: spellProcedureMapNonEmpty(
        failures,
        ({ failedFact, mechanicsPath }) =>
          movableLightIssue(failedFact, mechanicsPath),
      ),
    };
  }
  if (durationTicks === undefined || Result.isFailure(durationTicks)) {
    return {
      tag: "unsupported",
      issues: [movableLightIssue("duration", spellDurationValuePath())],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    durationTicks: durationTicks.success,
    dimRadiusFeet: MOVABLE_LIGHT_DIM_LIGHT_RADIUS_FEET,
    rangeFeet: movementFeet(MOVABLE_LIGHT_RANGE_FEET),
    maxMoveFeet: movementFeet(MOVABLE_LIGHT_REPOSITION_MAX_FEET),
    spacingFeet: movementFeet(MOVABLE_LIGHT_SPACING_FEET),
  } satisfies MovableLightMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "movableLightManifestation",
      facts,
      evidence: movableLightMechanicsEvidence(mechanics),
      admit: (spell, ctx) => [
        ...admitMovableLightSeparateCast(spell, ctx, facts),
        ...admitMovableLightCombinedCast(spell, ctx, facts),
      ],
    },
  };
}

function discoverMovableLightCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: ExecutableMovableLightManifestationInvocation,
): readonly BattleActDiscoveryCandidate[] {
  if (invocation.operation !== "create") return [];
  return [
    {
      subject: {
        tag: "actionSpell",
        actorId,
        procedureRef: invocation.sourceProcedureRef,
        mode: { tag: "cast" },
      },
      initialHoles: [
        spellMovableLightPlacementHole(invocation, invocation.form, []),
      ],
    },
  ];
}

function discoverMovableLightRepositionAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: ExecutableMovableLightManifestationInvocation,
): readonly BattleActDiscoveryCandidate[] {
  if (invocation.operation !== "reposition") return [];
  const activeEffect = activeMovableLightEffect(state, actorId, invocation);
  return activeEffect === undefined
    ? []
    : [
        {
          subject: {
            tag: "bonusActionSpell",
            actorId,
            procedureRef: invocation.sourceProcedureRef,
            mode: { tag: "cast" },
          },
          initialHoles: [
            spellMovableLightPlacementHole(
              invocation,
              activeEffect.form,
              movableLightFromEffect(activeEffect).map(
                (light) => light.lightId,
              ),
            ),
          ],
        },
      ];
}

function activeMovableLightEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: ExecutableMovableLightRepositionInvocation,
):
  | Extract<BattleActiveEffect, { readonly kind: "movableLightManifestation" }>
  | undefined {
  return state.combatants
    .get(actorId)
    ?.activeEffects.find(
      (
        effect,
      ): effect is Extract<
        BattleActiveEffect,
        { readonly kind: "movableLightManifestation" }
      > =>
        effect.kind === "movableLightManifestation" &&
        effect.effectRef === invocation.activeEffectRef &&
        effect.sourceProcedureRef ===
          invocation.sourceManifestationProcedureRef &&
        effect.sourceCombatantId === actorId,
    );
}

function resolveMovableLightCast(
  input: MovableLightCastResolveInput,
): BattleResolutionResult {
  if (!isExecutableMovableLightCastResolveInput(input)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Movable-light creation is no longer available.",
    );
  }
  return resolveMovableLightCastSpellAct({
    ...input,
  });
}

function resolveMovableLightReposition(
  input: MovableLightRepositionResolveInput,
): BattleResolutionResult {
  if (!isExecutableMovableLightRepositionResolveInput(input)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Movable-light reposition is no longer available.",
    );
  }
  return resolveMovableLightRepositionSpellAct({
    ...input,
  });
}

function isExecutableMovableLightCastResolveInput(
  input: MovableLightCastResolveInput,
): input is ExecutableMovableLightCastResolveInput {
  return movableLightResolutionSubjectMatchesOperation({
    operation: input.invocation.operation,
    subjectTag: input.input.subject.tag,
  });
}

function isExecutableMovableLightRepositionResolveInput(
  input: MovableLightRepositionResolveInput,
): input is ExecutableMovableLightRepositionResolveInput {
  return movableLightResolutionSubjectMatchesOperation({
    operation: input.invocation.operation,
    subjectTag: input.input.subject.tag,
  });
}

export function movableLightResolutionSubjectMatchesOperation(input: {
  readonly operation: "create" | "reposition";
  readonly subjectTag: "actionSpell" | "bonusActionSpell";
}): boolean {
  return Match.value(input).pipe(
    Match.when({ operation: "create", subjectTag: "actionSpell" }, () => true),
    Match.when(
      { operation: "reposition", subjectTag: "bonusActionSpell" },
      () => true,
    ),
    Match.whenOr(
      { operation: "create", subjectTag: "bonusActionSpell" },
      { operation: "reposition", subjectTag: "actionSpell" },
      () => false,
    ),
    Match.exhaustive,
  );
}

const MovableLightSeparateCastInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: CantripSpellAccessSchema,
    resource: NoSpellInvocationResourceSchema,
    procedure: Schema.Literal("movableLightManifestation"),
    operation: Schema.Literal("create"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("magicAction"),
    form: Schema.Literal("separateLights"),
    dimRadiusFeet: MovementFeet,
    rangeFeet: MovementFeet,
    maxMoveFeet: MovementFeet,
    spacingFeet: MovementFeet,
    expiresAt: MovableLightExpirationSchema,
  }),
);

const MovableLightCombinedCastInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: CantripSpellAccessSchema,
    resource: NoSpellInvocationResourceSchema,
    procedure: Schema.Literal("movableLightManifestation"),
    operation: Schema.Literal("create"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("magicAction"),
    form: Schema.Literal("combinedMediumForm"),
    dimRadiusFeet: MovementFeet,
    rangeFeet: MovementFeet,
    maxMoveFeet: MovementFeet,
    spacingFeet: MovementFeet,
    expiresAt: MovableLightExpirationSchema,
  }),
);

const MovableLightRepositionInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: CantripSpellAccessSchema,
    resource: NoSpellInvocationResourceSchema,
    procedure: Schema.Literal("movableLightManifestation"),
    operation: Schema.Literal("reposition"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("bonusAction"),
    activeEffectRef: BattleEffectExecutionRef,
    sourceManifestationProcedureRef: BattleProcedureExecutionRef,
    maxMoveFeet: MovementFeet,
    rangeFeet: MovementFeet,
    spacingFeet: MovementFeet,
  }),
);
export const movableLightManifestationProfile = {
  procedure: "movableLightManifestation",
  executionSchema: Schema.Union([
    MovableLightSeparateCastInvocationSchema,
    MovableLightCombinedCastInvocationSchema,
    MovableLightRepositionInvocationSchema,
  ]),
  admitMechanics: admitMovableLightMechanics,
  discoverCastAct: (state, actorId, invocation) =>
    Match.value(invocation).pipe(
      Match.when({ operation: "create" }, (createInvocation) =>
        discoverMovableLightCastAct(state, actorId, createInvocation),
      ),
      Match.when({ operation: "reposition" }, (repositionInvocation) =>
        discoverMovableLightRepositionAct(state, actorId, repositionInvocation),
      ),
      Match.exhaustive,
    ),
  resolve: (input) =>
    Match.value(input.invocation).pipe(
      Match.when({ operation: "create" }, (invocation) =>
        resolveMovableLightCast({ ...input, invocation }),
      ),
      Match.when({ operation: "reposition" }, (invocation) =>
        resolveMovableLightReposition({ ...input, invocation }),
      ),
      Match.exhaustive,
    ),
} satisfies SpellProcedureDeclaration<
  "movableLightManifestation",
  | MovableLightSeparateCastInvocation
  | MovableLightCombinedCastInvocation
  | MovableLightRepositionInvocation,
  MovableLightMechanicsFacts,
  MovableLightAdmissionIssue
>;
