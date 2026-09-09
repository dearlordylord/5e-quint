import { resolveSpellActiveEffectCast } from "../spell-active-effect-resolution.ts";
import type { BattleSpellExecutionSource } from "../../battle-state-execution.ts";
import { spellCastCandidate } from "../spell-cast-candidate.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-held-light-emitter
//
// The heldLight Spell Procedure Profile: a cantrip-access spell (today Produce
// Flame) that creates a caster-held Bright Light and Dim Light emitter.
//
// What lives here:
//   - admit()                         - was
//                                       supportedCantripHeldLightSpellProfile
//                                       in spells-profiles.ts
//   - discoverCastAct()               - was the heldLight branch in
//                                       spells-discovery.ts:discoverBattleActs
//   - castSummary()                   - was the heldLight branch in
//                                       spells-discovery.ts
//                                       spells-invocation-ref.ts
//   - resolve()                       - was resolveHeldLightSpellAct in
//                                       spells-resolve-release.ts
//   - applyEffect()                   - was applyHeldLightSpellEffect in
//                                       spells-active-effects.ts
//
// What stays in shared infrastructure:
//   - heldLightHurl has its own paired profile; the shared attack/damage
//     resolver still owns the hurl damage lifecycle.

import { attackBonus, movementFeet, PositiveInteger } from "@dnd/shared/types";
import type {
  CharacterLevel,
  MovementFeet as MovementFeetType,
} from "@dnd/shared/types";
import { Match, Schema } from "effect";
import { allocateBattleEffectExecutionRefForCreature } from "../../effect-execution-ref.ts";

import type { CombatantId } from "../../identity.ts";
import {
  type BattleActDiscoveryCandidate,
  type BattleResolutionResult,
  type BattleState,
  type BattleExecutableSpellInvocation,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { invalidResult } from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { spellAdmissionCharacterLevel } from "./profile.ts";
import { cantripSpellAccessFor } from "./profile.ts";
import { BattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  AttackBonus,
  CantripSpellAccessSchema,
  DamageTypeSchema,
  MovementFeet,
  NoSpellInvocationResourceSchema,
  SingleCreatureOrObjectSpellTargetingSchema,
} from "../codec-building-blocks.ts";
import { DiceExprSchema } from "@dnd/surface/surface/schema";
import {
  diceExprWithDelta,
  supportedDamageAmountExpr,
} from "../spells-execution-facts.ts";
import { characterExecutionWithHeldLightHurl } from "../../character-execution-queries.ts";
import type { HeldLightHurlSpellProcedureExecution } from "../../character-execution.ts";
import type {
  DiceAmount,
  DiceExpr,
  SpellMechanics,
} from "@dnd/surface/surface/types";
import {
  isSpellCanonicalDurationValue,
  spellOngoingOperationOccurrences,
  spellOngoingOperationUnsupportedFacts,
  spellDurationChildCoordinates,
  spellDurationChildPath,
  spellDurationTicksFromCanonicalValue,
  spellConsumedMaterialEvidencePaths,
  spellProcedureHasRedundantSignature,
  spellProcedureMapNonEmpty,
  spellProcedureNonEmpty,
  type SpellOngoingOperationOccurrence,
  type SpellMechanicsAdmissionSource,
  type SpellCanonicalDurationValue,
  type SpellProcedureAdmissionIssue,
  type SpellProcedureMechanicsFacts,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  spellDurationEndingPath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
  spellOngoingAttachmentPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";

const FIRST_ORDINAL = PositiveInteger(1);

type HeldLightInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "heldLight" }
>;

type HeldLightMechanics = Extract<
  SpellMechanics,
  { readonly family: "ongoing_effect" }
>;
type HeldLightDamageAmount =
  | Extract<DiceAmount, { readonly kind: "fixed" }>
  | (Extract<DiceAmount, { readonly kind: "threshold_tiers" }> & {
      readonly axis: "character";
    });
type HeldLightDuration = Extract<
  SpellProcedureMechanicsFacts["duration"],
  { readonly kind: "timed" }
> & { readonly value: SpellCanonicalDurationValue };
type HeldRadianceAttackRollEffect = Extract<
  SpellOngoingOperationOccurrence["operation"]["effect"],
  { readonly kind: "attack_roll" }
>;

function isHeldLightDuration(
  duration: SpellProcedureMechanicsFacts["duration"],
): duration is HeldLightDuration {
  return (
    duration.kind === "timed" && isSpellCanonicalDurationValue(duration.value)
  );
}
type HeldLightMechanicsFacts = Omit<
  SpellProcedureMechanicsFacts,
  "range" | "duration"
> & {
  readonly range: Extract<
    SpellProcedureMechanicsFacts["range"],
    { readonly kind: "self" }
  >;
  readonly duration: HeldLightDuration;
  readonly light: {
    readonly brightRadiusFeet: MovementFeetType;
    readonly dimAdditionalFeet: MovementFeetType;
  };
  readonly hurl: {
    readonly damageAmount: HeldLightDamageAmount;
  };
};
type HeldLightFailedFact =
  | "level"
  | "castingTime"
  | "range"
  | "duration"
  | "durationExtension"
  | "durationEnding"
  | "initialPhase"
  | "authoredConditionalMechanics"
  | "attachment"
  | "predicate"
  | "targetLimit"
  | "usageLimit"
  | "laterTurnsOnly"
  | "timing"
  | "operation"
  | "operationCount"
  | "light"
  | "hurl";
type HeldLightAdmissionIssue = SpellProcedureAdmissionIssue<
  "heldLight",
  HeldLightFailedFact,
  UnitMechanicsPath
>;

function heldLightLightOperation(
  operation: SpellOngoingOperationOccurrence,
): boolean {
  return (
    operation.operation.trigger.kind === "passive" &&
    operation.operation.effect.kind === "emit_bright_and_dim_illumination"
  );
}

function heldLightHurlOperation(
  operation: SpellOngoingOperationOccurrence,
): boolean {
  const { trigger, effect } = operation.operation;
  return (
    trigger.kind === "on_caster_spends_action" &&
    trigger.cost?.kind === "standard_action" &&
    trigger.cost.action === "magic" &&
    effect.kind === "attack_roll" &&
    effect.attackKind === "ranged_spell_attack"
  );
}

function heldLightRepresentation(
  mechanics: SpellMechanics,
): mechanics is HeldLightMechanics {
  if (mechanics.family !== "ongoing_effect") return false;
  const occurrences = spellOngoingOperationOccurrences(mechanics);
  const hasLightOperation = occurrences.some((occurrence) =>
    heldLightLightOperation(occurrence),
  );
  const hasHurlOperation = occurrences.some((occurrence) =>
    heldLightHurlOperation(occurrence),
  );
  const hasBonusAction = mechanics.castingTime.kind === "bonus_action";
  const hasTenMinuteDuration =
    mechanics.duration.kind === "timed" &&
    mechanics.duration.value.unit === "minute" &&
    mechanics.duration.value.amount === 10;
  const hasSelfAttachment = mechanics.attachment.kind === "self";
  const hasSelfRange = mechanics.range.kind === "self";
  return (
    heldRadianceHasRepresentativeOperations({
      hasTenMinuteDuration,
      hasLightOperation,
      hasHurlOperation,
    }) &&
    spellProcedureHasRedundantSignature({
      kind: "twoWitnessesMayBeMissing",
      witnesses: [
        { name: "lightOperation", present: hasLightOperation },
        { name: "hurlOperation", present: hasHurlOperation },
        { name: "bonusAction", present: hasBonusAction },
        { name: "tenMinuteDuration", present: hasTenMinuteDuration },
        {
          name: "selfAttachmentOrRange",
          present: hasSelfAttachment || hasSelfRange,
        },
      ],
    })
  );
}

function heldRadianceHasRepresentativeOperations(input: {
  readonly hasTenMinuteDuration: boolean;
  readonly hasLightOperation: boolean;
  readonly hasHurlOperation: boolean;
}): boolean {
  return (
    (input.hasTenMinuteDuration || input.hasHurlOperation) &&
    (input.hasLightOperation || input.hasHurlOperation)
  );
}

function heldLightIssue(
  failedFact: HeldLightFailedFact,
  mechanicsPath: UnitMechanicsPath,
): HeldLightAdmissionIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "heldLight",
    failedFact,
    mechanicsPath,
    message: `Unsupported heldLight mechanics fact: ${failedFact}.`,
  };
}

function heldLightHurlDamageAmount(
  operation: SpellOngoingOperationOccurrence,
): DiceAmount | null {
  const effect = heldRadianceHurlAttackRollEffect(operation);
  if (effect === undefined) return null;
  const damageEffect = effect.onHit[0];
  if (damageEffect?.kind !== "damage") return null;
  if (!Schema.is(DamageTypeSchema)(damageEffect.damageType)) return null;
  return damageEffect.damageType === "fire" ? damageEffect.amount : null;
}

function heldRadianceHurlAttackRollEffect(
  operation: SpellOngoingOperationOccurrence,
): HeldRadianceAttackRollEffect | undefined {
  const effect = operation.operation.effect;
  if (effect.kind !== "attack_roll") return undefined;
  if (effect.attackKind !== "ranged_spell_attack") return undefined;
  if (effect.onHit.length !== 1) return undefined;
  if (effect.onMiss.length !== 1) return undefined;
  return effect.onMiss[0]?.kind === "none" ? effect : undefined;
}

type HeldLightDamageAmountProjection =
  | { readonly tag: "supported"; readonly amount: HeldLightDamageAmount }
  | { readonly tag: "unsupported" };

function isHeldLightDamageAmount(
  amount: DiceAmount,
): amount is HeldLightDamageAmount {
  if (amount.kind === "fixed") return true;
  return amount.kind === "threshold_tiers" && amount.axis === "character";
}

function heldLightDamageAmountProjection(
  amount: DiceAmount | null,
): HeldLightDamageAmountProjection {
  return amount !== null &&
    isHeldLightDamageAmount(amount) &&
    supportedDamageAmountExpr({ amount, characterLevel: 1 }) !== null
    ? { tag: "supported", amount }
    : { tag: "unsupported" };
}

function heldLightDamageExpr(
  amount: HeldLightDamageAmount,
  characterLevel: CharacterLevel,
): DiceExpr {
  return Match.value(amount).pipe(
    Match.when({ kind: "fixed" }, ({ expr }) => expr),
    Match.when({ kind: "threshold_tiers" }, (threshold) =>
      threshold.tiers.reduce(
        (expr, tier) =>
          characterLevel >= tier.atLevel
            ? diceExprWithDelta(expr, tier.override)
            : expr,
        threshold.base,
      ),
    ),
    Match.exhaustive,
  );
}

function heldLightHurlOptionalIssues(
  occurrence: SpellOngoingOperationOccurrence,
): readonly {
  readonly failedFact: "laterTurnsOnly" | "attachment" | "timing";
  readonly mechanicsPath: UnitMechanicsPath;
}[] {
  const issues: Array<{
    readonly failedFact: "laterTurnsOnly" | "attachment" | "timing";
    readonly mechanicsPath: UnitMechanicsPath;
  }> = [];
  const { operation } = occurrence;
  if (
    operation.trigger.kind === "on_caster_spends_action" &&
    operation.trigger.laterTurnsOnly !== undefined
  ) {
    issues.push({
      failedFact: "laterTurnsOnly",
      mechanicsPath: spellOngoingOperationPath(occurrence.ordinal),
    });
  }
  if (operation.effect.kind !== "attack_roll") return issues;
  if (operation.effect.attachment !== undefined) {
    issues.push({
      failedFact: "attachment",
      mechanicsPath: spellOngoingOperationEffectPath(occurrence.ordinal),
    });
  }
  const hitDamage = operation.effect.onHit[0];
  if (hitDamage?.kind === "damage" && hitDamage.timing !== undefined) {
    issues.push({
      failedFact: "timing",
      mechanicsPath: spellOngoingOperationEffectPath(occurrence.ordinal),
    });
  }
  return issues;
}

type HeldLightIssueFact = Readonly<{
  failedFact: HeldLightFailedFact;
  mechanicsPath: UnitMechanicsPath;
}>;

function heldLightIssueFact(
  failedFact: HeldLightFailedFact,
  mechanicsPath: UnitMechanicsPath,
): HeldLightIssueFact {
  return { failedFact, mechanicsPath };
}

function heldLightTimedDurationIssues(
  duration: Extract<HeldLightMechanics["duration"], { readonly kind: "timed" }>,
): readonly HeldLightIssueFact[] {
  const valueIssues =
    duration.value.unit === "minute" && duration.value.amount === 10
      ? []
      : [heldLightIssueFact("duration", spellDurationValuePath())];
  const children = spellDurationChildCoordinates(duration);
  const firstEnding = children.find(
    (child) => child.branch === "ending" && child.ordinal === FIRST_ORDINAL,
  );
  const requiredEndingIssues =
    firstEnding?.branch === "ending" &&
    firstEnding.ending.kind === "earlyEnd" &&
    firstEnding.ending.trigger.kind === "caster_recasts_spell"
      ? []
      : [
          heldLightIssueFact(
            "durationEnding",
            firstEnding === undefined
              ? spellDurationEndingPath(FIRST_ORDINAL)
              : spellDurationChildPath(firstEnding),
          ),
        ];
  const childIssues = children.flatMap((child) =>
    child.branch === "extension"
      ? [heldLightIssueFact("durationExtension", spellDurationChildPath(child))]
      : child.ordinal !== FIRST_ORDINAL
        ? [heldLightIssueFact("durationEnding", spellDurationChildPath(child))]
        : [],
  );
  return [...valueIssues, ...requiredEndingIssues, ...childIssues];
}

function heldLightDurationIssues(
  duration: HeldLightMechanics["duration"],
): readonly HeldLightIssueFact[] {
  if (duration.kind === "timed") return heldLightTimedDurationIssues(duration);
  const valueIssue = heldLightIssueFact("duration", spellDurationValuePath());
  if (duration.kind !== "slot_tiered") return [valueIssue];
  return [
    valueIssue,
    ...spellDurationChildCoordinates(duration).flatMap((child) =>
      child.branch === "extension"
        ? [
            heldLightIssueFact(
              "durationExtension",
              spellDurationChildPath(child),
            ),
          ]
        : [],
    ),
  ];
}

function heldLightHeaderIssues(
  mechanics: HeldLightMechanics,
): readonly HeldLightIssueFact[] {
  return [
    ...(mechanics.level === 0
      ? []
      : [heldLightIssueFact("level", spellMechanicsHeaderPath("level"))]),
    ...(mechanics.castingTime.kind === "bonus_action"
      ? []
      : [
          heldLightIssueFact(
            "castingTime",
            spellMechanicsHeaderPath("castingTime"),
          ),
        ]),
    ...(mechanics.range.kind === "self"
      ? []
      : [heldLightIssueFact("range", spellMechanicsHeaderPath("range"))]),
    ...heldLightDurationIssues(mechanics.duration),
    ...(mechanics.attachment.kind === "self"
      ? []
      : [heldLightIssueFact("attachment", spellOngoingAttachmentPath())]),
    ...(mechanics.initialPhase === undefined
      ? []
      : [heldLightIssueFact("initialPhase", spellOngoingInitialPhasePath())]),
    ...(mechanics.authoredConditionalMechanics === undefined
      ? []
      : [
          heldLightIssueFact(
            "authoredConditionalMechanics",
            spellMechanicsRootPath(),
          ),
        ]),
  ];
}

function heldLightOperationShapeIssues(
  occurrences: readonly SpellOngoingOperationOccurrence[],
  selectedOrdinals: ReadonlySet<PositiveInteger>,
): readonly HeldLightIssueFact[] {
  const unsupported = occurrences.flatMap((occurrence) =>
    spellOngoingOperationUnsupportedFacts(occurrence.operation).map(
      (failedFact) =>
        heldLightIssueFact(
          failedFact,
          spellOngoingOperationPath(occurrence.ordinal),
        ),
    ),
  );
  const missingCount =
    occurrences.length !== 2 && selectedOrdinals.size === occurrences.length
      ? [
          heldLightIssueFact(
            "operationCount",
            spellOngoingOperationPath(PositiveInteger(occurrences.length + 1)),
          ),
        ]
      : [];
  const extras = occurrences.flatMap((occurrence) =>
    selectedOrdinals.has(occurrence.ordinal)
      ? []
      : [
          heldLightIssueFact(
            "operationCount",
            spellOngoingOperationPath(occurrence.ordinal),
          ),
        ],
  );
  return [...unsupported, ...missingCount, ...extras];
}

function heldLightLightIssues(
  operation: SpellOngoingOperationOccurrence | undefined,
  supported: boolean,
): readonly HeldLightIssueFact[] {
  if (operation === undefined)
    return [
      heldLightIssueFact("operation", spellOngoingOperationPath(FIRST_ORDINAL)),
      heldLightIssueFact(
        "light",
        spellOngoingOperationEffectPath(FIRST_ORDINAL),
      ),
    ];
  return supported
    ? []
    : [
        heldLightIssueFact(
          "light",
          spellOngoingOperationEffectPath(operation.ordinal),
        ),
      ];
}

function heldLightHurlIssues(
  operation: SpellOngoingOperationOccurrence | undefined,
  supported: boolean,
): readonly HeldLightIssueFact[] {
  if (operation === undefined)
    return [
      heldLightIssueFact("operation", spellOngoingOperationPath(FIRST_ORDINAL)),
      heldLightIssueFact(
        "hurl",
        spellOngoingOperationEffectPath(FIRST_ORDINAL),
      ),
    ];
  return [
    ...heldLightHurlOptionalIssues(operation),
    ...(supported
      ? []
      : [
          heldLightIssueFact(
            "hurl",
            spellOngoingOperationEffectPath(operation.ordinal),
          ),
        ]),
  ];
}

function heldLightLightProjection(
  operation: SpellOngoingOperationOccurrence | undefined,
):
  | {
      readonly tag: "supported";
      readonly light: HeldLightMechanicsFacts["light"];
    }
  | { readonly tag: "unsupported" } {
  if (
    operation?.operation.effect.kind !== "emit_bright_and_dim_illumination" ||
    operation.operation.effect.brightRadiusFeet !== 20 ||
    operation.operation.effect.dimAdditionalFeet !== 20
  )
    return { tag: "unsupported" };
  return {
    tag: "supported",
    light: {
      brightRadiusFeet: movementFeet(
        operation.operation.effect.brightRadiusFeet,
      ),
      dimAdditionalFeet: movementFeet(
        operation.operation.effect.dimAdditionalFeet,
      ),
    },
  };
}

type HeldLightLightProjection = ReturnType<typeof heldLightLightProjection>;

type HeldLightEnvelopeFacts =
  | {
      readonly tag: "supported";
      readonly range: HeldLightMechanicsFacts["range"];
      readonly duration: HeldLightMechanicsFacts["duration"];
    }
  | { readonly tag: "unsupported"; readonly issue: HeldLightAdmissionIssue };

function heldLightEnvelopeFacts(input: {
  readonly range: HeldLightMechanicsFacts["range"] | undefined;
  readonly duration: HeldLightMechanicsFacts["duration"] | undefined;
}): HeldLightEnvelopeFacts {
  if (input.range === undefined)
    return {
      tag: "unsupported",
      issue: heldLightIssue("range", spellMechanicsHeaderPath("range")),
    };
  if (input.duration === undefined)
    return {
      tag: "unsupported",
      issue: heldLightIssue("duration", spellDurationValuePath()),
    };
  return { tag: "supported", range: input.range, duration: input.duration };
}

type HeldLightEffectFacts =
  | {
      readonly tag: "supported";
      readonly light: Extract<
        HeldLightLightProjection,
        { readonly tag: "supported" }
      >;
      readonly hurl: Extract<
        HeldLightDamageAmountProjection,
        { readonly tag: "supported" }
      >;
    }
  | { readonly tag: "unsupported"; readonly issue: HeldLightAdmissionIssue };

function heldLightEffectFacts(input: {
  readonly light: HeldLightLightProjection;
  readonly hurl: HeldLightDamageAmountProjection;
  readonly lightPath: UnitMechanicsPath;
  readonly hurlPath: UnitMechanicsPath;
}): HeldLightEffectFacts {
  if (input.light.tag === "unsupported")
    return {
      tag: "unsupported",
      issue: heldLightIssue("light", input.lightPath),
    };
  if (input.hurl.tag === "unsupported")
    return {
      tag: "unsupported",
      issue: heldLightIssue("hurl", input.hurlPath),
    };
  return { tag: "supported", light: input.light, hurl: input.hurl };
}

type HeldLightRequiredFacts =
  | {
      readonly tag: "supported";
      readonly range: HeldLightMechanicsFacts["range"];
      readonly duration: HeldLightMechanicsFacts["duration"];
      readonly light: Extract<
        HeldLightLightProjection,
        { readonly tag: "supported" }
      >;
      readonly hurl: Extract<
        HeldLightDamageAmountProjection,
        { readonly tag: "supported" }
      >;
    }
  | { readonly tag: "unsupported"; readonly issue: HeldLightAdmissionIssue };

function heldLightOperationEffectPathOrFirst(
  operation: SpellOngoingOperationOccurrence | undefined,
): UnitMechanicsPath {
  return spellOngoingOperationEffectPath(
    operation === undefined ? FIRST_ORDINAL : operation.ordinal,
  );
}

function heldLightRequiredFacts(input: {
  readonly range: HeldLightMechanicsFacts["range"] | undefined;
  readonly duration: HeldLightMechanicsFacts["duration"] | undefined;
  readonly light: HeldLightLightProjection;
  readonly hurl: HeldLightDamageAmountProjection;
  readonly lightOperation: SpellOngoingOperationOccurrence | undefined;
  readonly hurlOperation: SpellOngoingOperationOccurrence | undefined;
}): HeldLightRequiredFacts {
  const envelope = heldLightEnvelopeFacts(input);
  if (envelope.tag === "unsupported") return envelope;
  const effects = heldLightEffectFacts({
    light: input.light,
    hurl: input.hurl,
    lightPath: heldLightOperationEffectPathOrFirst(input.lightOperation),
    hurlPath: heldLightOperationEffectPathOrFirst(input.hurlOperation),
  });
  if (effects.tag === "unsupported") return effects;
  return {
    tag: "supported",
    range: envelope.range,
    duration: envelope.duration,
    light: effects.light,
    hurl: effects.hurl,
  };
}

function heldLightCandidate(input: {
  readonly source: SpellMechanicsAdmissionSource;
  readonly mechanics: HeldLightMechanics;
  readonly range: HeldLightMechanicsFacts["range"] | undefined;
  readonly duration: HeldLightMechanicsFacts["duration"] | undefined;
  readonly light: HeldLightLightProjection;
  readonly hurl: HeldLightDamageAmountProjection;
  readonly lightOperation: SpellOngoingOperationOccurrence | undefined;
  readonly hurlOperation: SpellOngoingOperationOccurrence | undefined;
  readonly occurrences: readonly SpellOngoingOperationOccurrence[];
  readonly selectedOrdinals: ReadonlySet<PositiveInteger>;
}): Exclude<
  ReturnType<typeof heldLightFactsFromMechanics>,
  { readonly tag: "notRepresented" }
> {
  const required = heldLightRequiredFacts(input);
  if (required.tag === "unsupported")
    return { tag: "unsupported", issues: [required.issue] };
  const facts = {
    ...input.source.spellDefinitionRuleFacts,
    range: required.range,
    duration: required.duration,
    light: required.light.light,
    hurl: { damageAmount: required.hurl.amount },
  } satisfies HeldLightMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "heldLight",
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
          spellDurationValuePath(),
          spellDurationEndingPath(FIRST_ORDINAL),
          spellOngoingAttachmentPath(),
          ...input.occurrences
            .filter(({ ordinal }) => input.selectedOrdinals.has(ordinal))
            .flatMap(({ ordinal }) => [
              spellOngoingOperationPath(ordinal),
              spellOngoingOperationEffectPath(ordinal),
            ]),
          ...spellConsumedMaterialEvidencePaths(input.mechanics.components),
        ],
        unowned: [],
      },
      admit: (executionSource, ctx) =>
        admitHeldLight(executionSource, ctx, facts),
    },
  };
}

function heldLightFactsFromMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "heldLight",
  HeldLightMechanicsFacts,
  HeldLightInvocation,
  HeldLightAdmissionIssue
> {
  if (!heldLightRepresentation(source.mechanics)) {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const rangeFacts =
    mechanics.range.kind === "self" ? mechanics.range : undefined;
  const durationFacts = isHeldLightDuration(mechanics.duration)
    ? mechanics.duration
    : undefined;
  const occurrences = spellOngoingOperationOccurrences(mechanics);
  const lightOperation = occurrences.find(heldLightLightOperation);
  const hurlOperation = occurrences.find(heldLightHurlOperation);
  const selectedOrdinals = new Set(
    [lightOperation?.ordinal, hurlOperation?.ordinal].filter(
      (ordinal): ordinal is PositiveInteger => ordinal !== undefined,
    ),
  );
  const lightProjection = heldLightLightProjection(lightOperation);

  const hurlProjection =
    hurlOperation === undefined
      ? ({ tag: "unsupported" } as const)
      : heldLightDamageAmountProjection(
          heldLightHurlDamageAmount(hurlOperation),
        );
  const issues = [
    ...heldLightHeaderIssues(mechanics),
    ...heldLightOperationShapeIssues(occurrences, selectedOrdinals),
    ...heldLightLightIssues(
      lightOperation,
      lightProjection.tag === "supported",
    ),
    ...heldLightHurlIssues(hurlOperation, hurlProjection.tag === "supported"),
  ];

  const failures = spellProcedureNonEmpty(issues);
  if (failures !== undefined) {
    return {
      tag: "unsupported",
      issues: spellProcedureMapNonEmpty(
        failures,
        ({ failedFact, mechanicsPath }) =>
          heldLightIssue(failedFact, mechanicsPath),
      ),
    };
  }
  return heldLightCandidate({
    source,
    mechanics,
    range: rangeFacts,
    duration: durationFacts,
    light: lightProjection,
    hurl: hurlProjection,
    lightOperation,
    hurlOperation,
    occurrences,
    selectedOrdinals,
  });
}

function admitHeldLight(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: HeldLightMechanicsFacts,
): readonly HeldLightInvocation[] {
  const damageExpr = heldLightDamageExpr(
    facts.hurl.damageAmount,
    spellAdmissionCharacterLevel(ctx),
  );
  return [
    {
      access: cantripSpellAccessFor(ctx.castingSource),
      resource: { tag: "none" },
      procedure: "heldLight",
      spell,
      actionCost: "bonusAction",
      light: facts.light,
      hurl: {
        targeting: { kind: "singleCreatureOrObject" },
        damage: { expr: damageExpr, damageType: "fire" },
        rangeFeet: movementFeet(60),
        attackKind: "ranged_spell_attack",
        attackBonus: attackBonus(
          Number(ctx.castingSource.abilityModifier) +
            Number(ctx.actor.origin.spellcasting.proficiencyBonus),
        ),
      },
      expiresAt: {
        kind: "duration",
        durationTicks: spellDurationTicksFromCanonicalValue(
          facts.duration.value,
        ),
      },
    },
  ];
}

function discoverHeldLightCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<HeldLightInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  return [
    spellCastCandidate(
      "bonusActionSpell",
      actorId,
      invocation.sourceProcedureRef,
      [],
    ),
  ];
}

function applyHeldLightEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<HeldLightInvocation>,
): BattleState {
  const caster = state.combatants.get(actorId);
  if (caster === undefined) {
    return state;
  }
  const allocation = allocateBattleEffectExecutionRefForCreature({
    owner: caster,
  });
  const hurlExecution = {
    spellRuleFacts: invocation.spellRuleFacts,
    access: invocation.access,
    resource: invocation.resource,
    procedure: "heldLightHurl",
    sourceEffectRef: allocation.effectRef,
    sourceHeldLightProcedureRef: invocation.sourceProcedureRef,
    targeting: invocation.hurl.targeting,
    damage: invocation.hurl.damage,
    rangeFeet: invocation.hurl.rangeFeet,
    attackKind: invocation.hurl.attackKind,
    attackBonus: invocation.hurl.attackBonus,
  } satisfies HeldLightHurlSpellProcedureExecution;
  const owner = allocation.owner;
  if (owner.origin.kind !== "character") return state;
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...owner,
      activeEffects: [
        ...caster.activeEffects.filter(
          (effect) =>
            !(
              effect.kind === "heldLight" &&
              effect.sourceProcedureRef === invocation.sourceProcedureRef &&
              effect.sourceCombatantId === actorId
            ),
        ),
        {
          kind: "heldLight",
          effectRef: allocation.effectRef,
          sourceProcedureRef: invocation.sourceProcedureRef,
          sourceCombatantId: actorId,
          brightRadiusFeet: invocation.light.brightRadiusFeet,
          dimAdditionalFeet: invocation.light.dimAdditionalFeet,
          expiresAt: invocation.expiresAt,
        },
      ],
      origin: {
        ...owner.origin,
        execution: characterExecutionWithHeldLightHurl(
          owner.origin.execution,
          hurlExecution,
        ),
      },
    }),
  };
}

function resolveHeldLight(
  input: SpellProcedureProfileResolveInput<HeldLightInvocation>,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!fillsBelongToSpellCastHoles(input.input.fills)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Held light spells do not use target, roll, damage, or save fills.",
    );
  }
  /* v8 ignore stop -- @preserve */

  return resolveSpellActiveEffectCast({
    resolution: input,
    targetIds: [input.actorId],
    castingResource: { kind: "bonusAction" },
    applyEffect: (state) =>
      applyHeldLightEffect(state, input.actorId, input.invocation),
  });
}

const HeldLightInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: CantripSpellAccessSchema,
    resource: NoSpellInvocationResourceSchema,
    procedure: Schema.Literal("heldLight"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("bonusAction"),
    light: Schema.Struct({
      brightRadiusFeet: MovementFeet,
      dimAdditionalFeet: MovementFeet,
    }),
    hurl: Schema.Struct({
      targeting: SingleCreatureOrObjectSpellTargetingSchema,
      damage: Schema.Struct({
        expr: DiceExprSchema,
        damageType: DamageTypeSchema,
      }),
      rangeFeet: MovementFeet,
      attackKind: Schema.Literal("ranged_spell_attack"),
      attackBonus: AttackBonus,
    }),
    expiresAt: BattleActiveEffectExpirationSchema,
  }),
);
export const heldLightProfile: SpellProcedureDeclaration<
  "heldLight",
  HeldLightInvocation,
  HeldLightMechanicsFacts,
  HeldLightAdmissionIssue
> = {
  procedure: "heldLight",
  executionSchema: HeldLightInvocationSchema,
  admitMechanics: heldLightFactsFromMechanics,
  discoverCastAct: discoverHeldLightCastAct,
  resolve: resolveHeldLight,
};
