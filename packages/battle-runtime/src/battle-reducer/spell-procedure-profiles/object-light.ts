import { optionalProperty } from "../../optional-property.ts";
import { maybeOpenSpellCastReactionWindow } from "../spell-cast-reaction-window.ts";
import type { BattleSpellExecutionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-object-light
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-cast-range-increase
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.OBJECT_LIGHT_EMITTER_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_DISTANT_CAST_RANGE_INCREASE
//
// The objectLight Spell Procedure Profile: an action spell that attaches a
// Bright Light and Dim Light emitter to a touched object.
//
// What lives here:
//   - admit()           - was supportedCantripObjectLightSpellProfile and
//                         supportedPreparedObjectLightSpellProfile in
//                         spells-profiles.ts
//   - discoverCastAct() - was the objectLight branch in spells-discovery.ts
//   - castSummary()     - was the objectLight branch in spells-discovery.ts
//   - resolve()         - was resolveObjectLightSpellAct in
//                         spells-resolve-release.ts
//   - applyEffect()     - was applyObjectLightSpellEffect in
//                         spells-active-effects.ts
//
// What stays in shared infrastructure:
//   - spellObjectLightTargetFact and spellObjectTargetHole stay in
//     spells-targeting.ts until target legality and hole dispatch migrate.

import {
  elapsedTimeTicksFromTimeSpanDuration,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet, PositiveInteger } from "@dnd/shared/types";
import { Match, Result } from "effect";
import type { SpellMechanics } from "@dnd/surface/surface/types";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellDurationEndingPath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import {
  battleSpellEffectOccurrenceId,
  type BattleObjectId,
  type CombatantId,
} from "../../identity.ts";
import { allocateBattleStoredLightEmitterForCreature } from "../../effect-execution-ref.ts";
import {
  type BattleActDiscoveryCandidate,
  type BattleCreatureState,
  type BattleResolutionResult,
  type BattleState,
  type BattleExecutableSpellInvocation,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";

import { needsHolesResult } from "../needs-holes-result.ts";
import { invalidResult, resolutionFromStateResult } from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { spellInvocationEffectiveSpellLevel } from "../spells-effective-level.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import {
  spellObjectLightTargetFact,
  spellObjectTargetHole,
  spellObjectTargetHoleId,
  type ObjectLightTargetFact,
} from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { cantripSpellAccessFor } from "./profile.ts";
import { Schema } from "effect";
import { BattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  CantripSpellAccessSchema,
  MovementFeet,
  NoSpellInvocationResourceSchema,
  PreparedSpellAccessSchema,
  SizeSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import { discoverDistantSpellMetamagicSelections } from "../metamagic-support.ts";
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

const LIGHT_OBJECT_MAX_SIZE = "large" as const;
const OBJECT_LIGHT_BRIGHT_RADIUS_FEET = 20;
const OBJECT_LIGHT_DIM_ADDITIONAL_FEET = 20;
const LIGHT_CANTRIP_DURATION_HOURS = 1;
const PERMANENT_OBJECT_LIGHT_MATERIAL_COST_GP = 50;

type ActivationPhase = Extract<
  SpellMechanics,
  { readonly family: "activation" }
>["phases"][number];
type ObjectLightInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "objectLight" }
>;

type ObjectLightMechanics = Extract<
  SpellMechanics,
  { readonly family: "activation" }
>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- This module-private tuple is the canonical source for ObjectLightVariant.
const OBJECT_LIGHT_VARIANTS = [
  "lightCantripObject",
  "permanentTouchedObject",
] as const;
type ObjectLightVariant = (typeof OBJECT_LIGHT_VARIANTS)[number];
type ObjectLightMechanicsFacts = SpellProcedureMechanicsFacts &
  (
    | {
        readonly kind: (typeof OBJECT_LIGHT_VARIANTS)[0];
        readonly durationTicks: ElapsedTimeTicks;
        readonly maxObjectSize: typeof LIGHT_OBJECT_MAX_SIZE;
      }
    | { readonly kind: (typeof OBJECT_LIGHT_VARIANTS)[1] }
  ) & {
    readonly brightRadiusFeet: ReturnType<typeof movementFeet>;
    readonly dimAdditionalFeet: ReturnType<typeof movementFeet>;
  };
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- This module-private tuple is the canonical source for ObjectLightFailedFact.
const OBJECT_LIGHT_FAILED_FACTS = [
  "level",
  "school",
  "castingTime",
  "range",
  "components",
  "duration",
  "durationEnding",
  "phaseCount",
  "phase",
  "attachment",
  "lightEffect",
] as const;
type ObjectLightFailedFact = (typeof OBJECT_LIGHT_FAILED_FACTS)[number];
type ObjectLightAdmissionIssue = SpellProcedureAdmissionIssue<
  "objectLight",
  ObjectLightFailedFact,
  UnitMechanicsPath
>;

function admitCantripObjectLight(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: Extract<
    ObjectLightMechanicsFacts,
    { readonly kind: "lightCantripObject" }
  >,
): readonly ObjectLightInvocation[] {
  return [
    {
      access: cantripSpellAccessFor(ctx.castingSource),
      resource: { tag: "none" },
      procedure: "objectLight",
      spell,
      actionCost: "magicAction",
      targeting: {
        kind: "singleObject",
        object: {
          kind: "lightCantripObject",
          maxSize: facts.maxObjectSize,
        },
      },
      light: {
        kind: "brightAndDim",
        brightRadiusFeet: facts.brightRadiusFeet,
        dimAdditionalFeet: facts.dimAdditionalFeet,
      },
      expiresAt: { kind: "duration", durationTicks: facts.durationTicks },
    },
  ];
}

const OBJECT_LIGHT_ROOT_FIELDS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "castingTime",
  "family",
  "phases",
] as const satisfies ReadonlyArray<keyof ObjectLightMechanics>;
const OBJECT_LIGHT_RANGE_FIELDS = ["kind"] as const;
const OBJECT_LIGHT_CASTING_TIME_FIELDS = ["kind"] as const;
const OBJECT_LIGHT_PHASE_FIELDS = ["kind", "attachment", "effects"] as const;
const OBJECT_LIGHT_ATTACHMENT_FIELDS = [
  "kind",
  "holeId",
  "label",
  "value",
] as const;
const OBJECT_LIGHT_CANTRIP_VALUE_FIELDS = ["kind", "count", "filter"] as const;
const OBJECT_LIGHT_PERMANENT_VALUE_FIELDS = ["kind", "count"] as const;
const OBJECT_LIGHT_FILTER_FIELDS = ["targetRelation", "maxSize"] as const;
const OBJECT_LIGHT_EFFECT_FIELDS = [
  "kind",
  "brightRadiusFeet",
  "dimAdditionalFeet",
] as const;
const OBJECT_LIGHT_CANTRIP_COMPONENT_FIELDS = ["v", "s", "m"] as const;
const OBJECT_LIGHT_PERMANENT_COMPONENT_FIELDS = [
  "v",
  "s",
  "m",
  "materialConsumed",
  "materialCostGp",
] as const;
const OBJECT_LIGHT_TIMED_DURATION_FIELDS = [
  "kind",
  "value",
  "earlyEnd",
] as const;
const OBJECT_LIGHT_DURATION_VALUE_FIELDS = ["unit", "amount"] as const;
const OBJECT_LIGHT_ENDING_FIELDS = ["kind"] as const;
const OBJECT_LIGHT_PERMANENT_DURATION_FIELDS = ["kind", "endsOn"] as const;

function objectLightIssue(
  failedFact: ObjectLightFailedFact,
  mechanicsPath: UnitMechanicsPath,
): ObjectLightAdmissionIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "objectLight",
    failedFact,
    mechanicsPath,
    message: `Unsupported objectLight mechanics fact: ${failedFact}.`,
  };
}

function objectLightVariant(
  mechanics: ObjectLightMechanics,
): ObjectLightVariant | undefined {
  const phase = mechanics.phases[0];
  const hasCantripFilter =
    phase?.kind === "direct" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "object" &&
    phase.attachment.value.filter?.targetRelation === "not_worn_or_carried";
  const cantripWitnesses = [
    mechanics.level === 0,
    mechanics.duration.kind === "timed",
    mechanics.components.s === false,
    hasCantripFilter,
  ].filter(Boolean).length;
  const hasPermanentMaterial =
    mechanics.components.m !== false &&
    "materialConsumed" in mechanics.components &&
    mechanics.components.materialConsumed === true;
  const permanentWitnesses = [
    mechanics.level === 2,
    mechanics.duration.kind === "permanent",
    mechanics.components.s === true,
    hasPermanentMaterial,
  ].filter(Boolean).length;
  if (cantripWitnesses > permanentWitnesses) return "lightCantripObject";
  if (permanentWitnesses > cantripWitnesses) return "permanentTouchedObject";
  return undefined;
}

function objectLightRepresentation(mechanics: SpellMechanics):
  | {
      readonly mechanics: ObjectLightMechanics;
      readonly variant: ObjectLightVariant;
    }
  | undefined {
  if (mechanics.family !== "activation") return undefined;
  const variant = objectLightVariant(mechanics);
  if (variant === undefined) return undefined;
  const hasHeader = mechanics.school === "evocation";
  const hasCastingRange =
    mechanics.castingTime.kind === "action" && mechanics.range.kind === "touch";
  const hasVariantHeader =
    variant === "lightCantripObject"
      ? mechanics.level === 0 && mechanics.components.s === false
      : mechanics.level === 2 && mechanics.components.s === true;
  const hasVariantDuration =
    variant === "lightCantripObject"
      ? mechanics.duration.kind === "timed"
      : mechanics.duration.kind === "permanent";
  const hasLightPhase = mechanics.phases.some((phase) =>
    phase.kind === "direct"
      ? phase.effects?.some(
          (effect) => effect.kind === "emit_bright_and_dim_illumination",
        ) === true
      : false,
  );
  return spellProcedureHasRedundantSignature({
    kind: "oneOfFiveWitnessesMayBeMissing",
    witnesses: [
      { name: "header", present: hasHeader },
      { name: "castingRange", present: hasCastingRange },
      { name: "variantHeader", present: hasVariantHeader },
      { name: "variantDuration", present: hasVariantDuration },
      { name: "lightPhase", present: hasLightPhase },
    ],
  })
    ? { mechanics, variant }
    : undefined;
}

function objectLightDirectPhaseShellIsSupported(
  phase: ActivationPhase,
): phase is Extract<ActivationPhase, { readonly kind: "direct" }> {
  return (
    phase.kind === "direct" &&
    spellMechanicsObjectHasOnlyKeys(phase, OBJECT_LIGHT_PHASE_FIELDS) &&
    phase.effects?.length === 1
  );
}

function objectLightAttachmentIsSupported(
  phase: Extract<ActivationPhase, { readonly kind: "direct" }>,
  variant: ObjectLightVariant,
): boolean {
  const attachment = phase.attachment;
  if (
    attachment.kind !== "hole" ||
    !spellMechanicsObjectHasOnlyKeys(
      attachment,
      OBJECT_LIGHT_ATTACHMENT_FIELDS,
    ) ||
    attachment.value.kind !== "object" ||
    attachment.value.count !== 1
  )
    return false;
  if (variant === "lightCantripObject") {
    if (
      !spellMechanicsObjectHasOnlyKeys(
        attachment.value,
        OBJECT_LIGHT_CANTRIP_VALUE_FIELDS,
      ) ||
      attachment.value.filter?.targetRelation !== "not_worn_or_carried" ||
      attachment.value.filter.maxSize !== LIGHT_OBJECT_MAX_SIZE ||
      !spellMechanicsObjectHasOnlyKeys(
        attachment.value.filter,
        OBJECT_LIGHT_FILTER_FIELDS,
      )
    )
      return false;
  } else if (
    !spellMechanicsObjectHasOnlyKeys(
      attachment.value,
      OBJECT_LIGHT_PERMANENT_VALUE_FIELDS,
    )
  ) {
    return false;
  }
  return true;
}

function admitObjectLightMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "objectLight",
  ObjectLightMechanicsFacts,
  ObjectLightInvocation,
  ObjectLightAdmissionIssue
> {
  const representation = objectLightRepresentation(source.mechanics);
  if (representation === undefined) return { tag: "notRepresented" };
  const { mechanics, variant } = representation;
  const issues: Array<{
    readonly failedFact: ObjectLightFailedFact;
    readonly mechanicsPath: UnitMechanicsPath;
  }> = [];
  const pushIssue = (
    failedFact: ObjectLightFailedFact,
    mechanicsPath: UnitMechanicsPath,
  ): void => {
    issues.push({ failedFact, mechanicsPath });
  };
  if (mechanics.level !== (variant === "lightCantripObject" ? 0 : 2))
    pushIssue("level", spellMechanicsHeaderPath("level"));
  if (mechanics.school !== "evocation")
    pushIssue("school", spellMechanicsHeaderPath("school"));
  if (
    mechanics.castingTime.kind !== "action" ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.castingTime,
      OBJECT_LIGHT_CASTING_TIME_FIELDS,
    )
  )
    pushIssue("castingTime", spellMechanicsHeaderPath("castingTime"));
  if (
    mechanics.range.kind !== "touch" ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.range, OBJECT_LIGHT_RANGE_FIELDS)
  )
    pushIssue("range", spellMechanicsHeaderPath("range"));
  const componentsSupported =
    variant === "lightCantripObject"
      ? mechanics.components.v === true &&
        mechanics.components.s === false &&
        typeof mechanics.components.m === "string" &&
        spellMechanicsObjectHasOnlyKeys(
          mechanics.components,
          OBJECT_LIGHT_CANTRIP_COMPONENT_FIELDS,
        )
      : mechanics.components.v === true &&
        mechanics.components.s === true &&
        typeof mechanics.components.m === "string" &&
        "materialConsumed" in mechanics.components &&
        mechanics.components.materialConsumed === true &&
        "materialCostGp" in mechanics.components &&
        mechanics.components.materialCostGp ===
          PERMANENT_OBJECT_LIGHT_MATERIAL_COST_GP &&
        spellMechanicsObjectHasOnlyKeys(
          mechanics.components,
          OBJECT_LIGHT_PERMANENT_COMPONENT_FIELDS,
        );
  if (!componentsSupported)
    pushIssue("components", spellMechanicsHeaderPath("components"));

  const durationProjection =
    variant === "lightCantripObject" && mechanics.duration.kind === "timed"
      ? elapsedTimeTicksFromTimeSpanDuration(mechanics.duration.value)
      : undefined;
  const durationTicks =
    durationProjection !== undefined && Result.isSuccess(durationProjection)
      ? durationProjection.success
      : undefined;
  if (variant === "lightCantripObject") {
    const duration = mechanics.duration;
    if (duration.kind !== "timed") {
      pushIssue("duration", spellDurationValuePath());
    } else {
      if (
        duration.value.unit !== "hour" ||
        duration.value.amount !== LIGHT_CANTRIP_DURATION_HOURS ||
        !spellMechanicsObjectHasOnlyKeys(
          duration,
          OBJECT_LIGHT_TIMED_DURATION_FIELDS,
        ) ||
        !spellMechanicsObjectHasOnlyKeys(
          duration.value,
          OBJECT_LIGHT_DURATION_VALUE_FIELDS,
        ) ||
        durationTicks === undefined
      )
        pushIssue("duration", spellDurationValuePath());
      const endings = duration.earlyEnd;
      if (endings === undefined || endings.length === 0) {
        pushIssue(
          "durationEnding",
          spellDurationEndingPath(PositiveInteger(1)),
        );
      } else {
        for (const [index, ending] of endings.entries()) {
          if (
            index > 0 ||
            ending.kind !== "caster_recasts_spell" ||
            !spellMechanicsObjectHasOnlyKeys(ending, OBJECT_LIGHT_ENDING_FIELDS)
          )
            pushIssue(
              "durationEnding",
              spellDurationEndingPath(PositiveInteger(index + 1)),
            );
        }
      }
    }
  } else {
    const duration = mechanics.duration;
    if (duration.kind !== "permanent") {
      pushIssue("duration", spellMechanicsHeaderPath("duration"));
    } else {
      if (
        !spellMechanicsObjectHasOnlyKeys(
          duration,
          OBJECT_LIGHT_PERMANENT_DURATION_FIELDS,
        )
      )
        pushIssue("duration", spellMechanicsHeaderPath("duration"));
      const endings = duration.endsOn;
      if (endings === undefined || endings.length === 0) {
        pushIssue(
          "durationEnding",
          spellDurationEndingPath(PositiveInteger(1)),
        );
      } else {
        for (const [index, ending] of endings.entries()) {
          if (index > 0 || ending !== "dispel")
            pushIssue(
              "durationEnding",
              spellDurationEndingPath(PositiveInteger(index + 1)),
            );
        }
      }
    }
  }

  if (!spellMechanicsObjectHasOnlyKeys(mechanics, OBJECT_LIGHT_ROOT_FIELDS))
    pushIssue("phase", spellMechanicsRootPath());
  for (const [index, phase] of mechanics.phases.entries()) {
    const ordinal = PositiveInteger(index + 1);
    if (index > 0) {
      pushIssue("phaseCount", spellActivationPhasePath(ordinal));
      continue;
    }
    if (!objectLightDirectPhaseShellIsSupported(phase)) {
      pushIssue("phase", spellActivationPhasePath(ordinal));
    }
    if (phase.kind !== "direct") continue;
    if (!objectLightAttachmentIsSupported(phase, variant))
      pushIssue("attachment", spellActivationAttachmentPath(ordinal));
    const effects = phase.effects;
    if (effects === undefined || effects.length === 0) {
      pushIssue(
        "lightEffect",
        spellActivationEffectPath(ordinal, PositiveInteger(1)),
      );
    } else {
      for (const [effectIndex, effect] of effects.entries()) {
        if (
          effectIndex > 0 ||
          effect.kind !== "emit_bright_and_dim_illumination" ||
          effect.brightRadiusFeet !== OBJECT_LIGHT_BRIGHT_RADIUS_FEET ||
          effect.dimAdditionalFeet !== OBJECT_LIGHT_DIM_ADDITIONAL_FEET ||
          !spellMechanicsObjectHasOnlyKeys(effect, OBJECT_LIGHT_EFFECT_FIELDS)
        )
          pushIssue(
            "lightEffect",
            spellActivationEffectPath(
              ordinal,
              PositiveInteger(effectIndex + 1),
            ),
          );
      }
    }
  }

  const failures = spellProcedureNonEmpty(spellUniqueMechanicsIssues(issues));
  if (failures !== undefined)
    return {
      tag: "unsupported",
      issues: spellProcedureMapNonEmpty(
        failures,
        ({ failedFact, mechanicsPath }) =>
          objectLightIssue(failedFact, mechanicsPath),
      ),
    };

  const sharedFacts = {
    ...source.spellDefinitionRuleFacts,
    brightRadiusFeet: movementFeet(OBJECT_LIGHT_BRIGHT_RADIUS_FEET),
    dimAdditionalFeet: movementFeet(OBJECT_LIGHT_DIM_ADDITIONAL_FEET),
  };
  const supportedAdmission = (facts: ObjectLightMechanicsFacts) => ({
    tag: "supported" as const,
    admitted: {
      binding: "ready" as const,
      procedure: "objectLight" as const,
      facts,
      evidence: {
        consumed: [
          spellMechanicsHeaderPath("level"),
          spellMechanicsHeaderPath("school"),
          spellMechanicsHeaderPath("range"),
          spellMechanicsHeaderPath("components"),
          spellMechanicsHeaderPath("duration"),
          spellMechanicsHeaderPath("castingTime"),
          spellMechanicsHeaderPath("family"),
          ...(facts.kind === "lightCantripObject"
            ? [
                spellDurationValuePath(),
                spellDurationEndingPath(PositiveInteger(1)),
              ]
            : [spellDurationEndingPath(PositiveInteger(1))]),
          spellActivationPhasePath(PositiveInteger(1)),
          spellActivationAttachmentPath(PositiveInteger(1)),
          spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
          ...spellConsumedMaterialEvidencePaths(mechanics.components),
        ],
        unowned: [],
      } satisfies SpellProcedureMechanicsEvidence,
      admit: (spell: BattleSpellExecutionSource, ctx: SpellAdmissionContext) =>
        admitObjectLight(spell, ctx, facts),
    },
  });
  if (variant === "permanentTouchedObject") {
    return supportedAdmission({ ...sharedFacts, kind: variant });
  }
  if (durationTicks === undefined) {
    return {
      tag: "unsupported",
      issues: [objectLightIssue("duration", spellDurationValuePath())],
    };
  }
  return supportedAdmission({
    ...sharedFacts,
    kind: variant,
    durationTicks,
    maxObjectSize: LIGHT_OBJECT_MAX_SIZE,
  });
}

function admitPreparedObjectLight(
  spell: BattleSpellExecutionSource,
  castOptions: SpellAdmissionContext["spellCastOptions"],
  facts: Extract<
    ObjectLightMechanicsFacts,
    { readonly kind: "permanentTouchedObject" }
  >,
): readonly ObjectLightInvocation[] {
  return castOptions.flatMap((slot): readonly ObjectLightInvocation[] =>
    Number(slot.spellLevel) < facts.level
      ? []
      : [
          {
            access: { tag: "prepared" },
            resource: spellInvocationResourceForCastOption(slot),
            procedure: "objectLight",
            spell,
            actionCost: "magicAction",
            targeting: {
              kind: "singleObject",
              object: { kind: "touchedObject" },
            },
            light: {
              kind: "brightAndDim",
              brightRadiusFeet: facts.brightRadiusFeet,
              dimAdditionalFeet: facts.dimAdditionalFeet,
            },
            expiresAt: { kind: "untilDispelled" },
          },
        ],
  );
}

function admitObjectLight(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: ObjectLightMechanicsFacts,
): readonly ObjectLightInvocation[] {
  return Match.value(facts).pipe(
    Match.when({ kind: "lightCantripObject" }, (cantripFacts) =>
      admitCantripObjectLight(spell, ctx, cantripFacts),
    ),
    Match.when({ kind: "permanentTouchedObject" }, (permanentFacts) =>
      admitPreparedObjectLight(spell, ctx.spellCastOptions, permanentFacts),
    ),
    Match.exhaustive,
  );
}

function discoverObjectLightCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<ObjectLightInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const baseCastAct = {
    subject: {
      tag: "actionSpell" as const,
      actorId,
      procedureRef: invocation.sourceProcedureRef,
      mode: { tag: "cast" as const },
    },
    initialHoles: [spellObjectTargetHole(invocation)],
  };
  const metamagicCastActs = discoverDistantSpellMetamagicSelections({
    actor: state.combatants.get(actorId),
    invocation,
  }).map((metamagic) => {
    return {
      subject: {
        tag: "actionSpell" as const,
        actorId,
        procedureRef: invocation.sourceProcedureRef,
        mode: { tag: "cast" as const },
        metamagic,
      },
      initialHoles: [spellObjectTargetHole(invocation)],
    };
  });
  return [baseCastAct, ...metamagicCastActs];
}

function applyObjectLightEffect(
  state: BattleState,
  actor: BattleCreatureState,
  objectId: BattleObjectId,
  invocation: BattleExecutableSpellInvocation<ObjectLightInvocation>,
): BattleState {
  const actorId = actor.combatantId;
  const retainedEmitters =
    invocation.targeting.object.kind === "lightCantripObject"
      ? state.lightEmitters.filter(
          (emitter) =>
            !(
              emitter.kind === "spellLightEmitter" &&
              emitter.sourceProcedureRef === invocation.sourceProcedureRef &&
              emitter.sourceCombatantId === actorId
            ),
        )
      : state.lightEmitters;
  const allocation = allocateBattleStoredLightEmitterForCreature({
    owner: actor,
    emitter: {
      kind: "spellLightEmitter",
      sourceProcedureRef: invocation.sourceProcedureRef,
      sourceCombatantId: actorId,
      sourceEffectId: objectLightSpellEffectOccurrenceId(
        state,
        actorId,
        objectId,
        invocation,
      ),
      sourceSpellLevel: spellInvocationEffectiveSpellLevel(invocation),
      attachment: { kind: "object", objectId },
      emission: invocation.light,
      opaqueCoverInteraction: { kind: "blocksEmission" },
      expiresAt: invocation.expiresAt,
    },
  });
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, allocation.owner),
    lightEmitters: [...retainedEmitters, allocation.emitter],
  };
}

function objectLightSpellEffectOccurrenceId(
  state: BattleState,
  actorId: CombatantId,
  objectId: BattleObjectId,
  invocation: BattleExecutableSpellInvocation<ObjectLightInvocation>,
) {
  const prefix = `${actorId}:${invocation.sourceProcedureRef}:${objectId}:object-light:`;
  const nextOrdinal =
    Math.max(
      0,
      ...state.lightEmitters.flatMap((emitter) => {
        if (
          emitter.kind !== "spellLightEmitter" ||
          !("sourceEffectId" in emitter) ||
          !emitter.sourceEffectId.startsWith(prefix)
        ) {
          return [];
        }
        const ordinal = Number(emitter.sourceEffectId.slice(prefix.length));
        return Number.isInteger(ordinal) && ordinal > 0 ? [ordinal] : [];
      }),
    ) + 1;
  return battleSpellEffectOccurrenceId(`${prefix}${nextOrdinal}`);
}

function resolveObjectLight(
  input: SpellProcedureProfileResolveInput<ObjectLightInvocation>,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !fillsBelongToSpellCastHoles(input.input.fills, [
      spellObjectTargetHoleId(input.invocation),
    ])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Object light spells use only an object target fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (input.fillSet.objectTarget === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellObjectTargetHole(input.invocation),
    ]);
  }
  const objectTarget = input.fillSet.objectTarget;
  const lightFact = spellObjectLightTargetFact(
    objectTarget.spatialFacts.filter(
      (
        fact,
      ): fact is Extract<
        (typeof objectTarget.spatialFacts)[number],
        {
          readonly kind: ObjectLightTargetFactKind;
        }
      > => OBJECT_LIGHT_TARGET_FACT_KINDS.some((kind) => kind === fact.kind),
    ),
    input.actorId,
    objectTarget.objectId,
    input.invocation,
    input.metamagicApplications,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (lightFact === null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Object light target does not satisfy the selected spell's object targeting requirements.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const actor = input.input.state.combatants.get(input.actorId);
  if (actor === undefined) {
    return invalidResult(
      input.input.state,
      "missingCombatant",
      "Object light caster is not in this battle.",
    );
  }

  const spellCastReactionWindow = maybeOpenSpellCastReactionWindow(
    input,
    [],
    { kind: "magicAction" },
    undefined,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const effected = applyObjectLightEffect(
    input.input.state,
    actor,
    objectTarget.objectId,
    input.invocation,
  );
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    ...optionalProperty("metamagicApplications", input.metamagicApplications),
  });
  return resolutionFromStateResult(resourced);
}

const ObjectLightInvocationSchema = spellProcedureExecutionSchema(
  Schema.Union([
    Schema.Struct({
      access: CantripSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("objectLight"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("magicAction"),
      targeting: Schema.Struct({
        kind: Schema.Literal("singleObject"),
        object: Schema.Struct({
          kind: Schema.Literal("lightCantripObject"),
          maxSize: SizeSchema,
        }),
      }),
      light: Schema.Struct({
        kind: Schema.Literal("brightAndDim"),
        brightRadiusFeet: MovementFeet,
        dimAdditionalFeet: MovementFeet,
      }),
      expiresAt: BattleActiveEffectExpirationSchema,
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("objectLight"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("magicAction"),
      targeting: Schema.Struct({
        kind: Schema.Literal("singleObject"),
        object: Schema.Struct({
          kind: Schema.Literal("touchedObject"),
        }),
      }),
      light: Schema.Struct({
        kind: Schema.Literal("brightAndDim"),
        brightRadiusFeet: MovementFeet,
        dimAdditionalFeet: MovementFeet,
      }),
      expiresAt: BattleActiveEffectExpirationSchema,
    }),
  ]),
);
export const objectLightProfile: SpellProcedureDeclaration<
  "objectLight",
  ObjectLightInvocation,
  ObjectLightMechanicsFacts,
  ObjectLightAdmissionIssue
> = {
  procedure: "objectLight",
  executionSchema: ObjectLightInvocationSchema,
  admitMechanics: admitObjectLightMechanics,
  discoverCastAct: discoverObjectLightCastAct,
  resolve: resolveObjectLight,
};

const OBJECT_LIGHT_TARGET_FACT_KINDS = [
  "spellObjectLightTarget",
  "spellDistantObjectLightTarget",
  "spellTouchedObjectTarget",
  "spellDistantTouchedObjectTarget",
] as const satisfies ReadonlyArray<ObjectLightTargetFact["kind"]>;
type ObjectLightTargetFactKind =
  (typeof OBJECT_LIGHT_TARGET_FACT_KINDS)[number];
import { spellInvocationResourceForCastOption } from "./profile.ts";
