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
  | "authoredConditionalEffects"
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
    (hasLightOperation || hasHurlOperation) &&
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
  if (
    operation.operation.effect.kind !== "attack_roll" ||
    operation.operation.effect.attackKind !== "ranged_spell_attack" ||
    operation.operation.effect.onHit.length !== 1 ||
    operation.operation.effect.onMiss.length !== 1 ||
    operation.operation.effect.onMiss[0]?.kind !== "none"
  ) {
    return null;
  }
  const damageEffect = operation.operation.effect.onHit[0];
  return damageEffect?.kind === "damage" &&
    Schema.is(DamageTypeSchema)(damageEffect.damageType) &&
    damageEffect.damageType === "fire"
    ? damageEffect.amount
    : null;
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
  const issues: Array<{
    readonly failedFact: HeldLightFailedFact;
    readonly mechanicsPath: UnitMechanicsPath;
  }> = [];
  const pushIssue = (
    failedFact: HeldLightFailedFact,
    mechanicsPath: UnitMechanicsPath,
  ): void => {
    issues.push({ failedFact, mechanicsPath });
  };

  if (mechanics.level !== 0) {
    pushIssue("level", spellMechanicsHeaderPath("level"));
  }
  if (mechanics.castingTime.kind !== "bonus_action") {
    pushIssue("castingTime", spellMechanicsHeaderPath("castingTime"));
  }
  if (mechanics.range.kind !== "self") {
    pushIssue("range", spellMechanicsHeaderPath("range"));
  }
  if (mechanics.duration.kind === "timed") {
    if (
      mechanics.duration.value.unit !== "minute" ||
      mechanics.duration.value.amount !== 10
    ) {
      pushIssue("duration", spellDurationValuePath());
    }
    const durationChildren = spellDurationChildCoordinates(mechanics.duration);
    const firstEnding = durationChildren.find(
      (child) => child.branch === "ending" && child.ordinal === FIRST_ORDINAL,
    );
    if (
      firstEnding?.branch !== "ending" ||
      firstEnding.ending.kind !== "earlyEnd" ||
      firstEnding.ending.trigger.kind !== "caster_recasts_spell"
    ) {
      pushIssue(
        "durationEnding",
        firstEnding === undefined
          ? spellDurationEndingPath(FIRST_ORDINAL)
          : spellDurationChildPath(firstEnding),
      );
    }
    for (const child of durationChildren) {
      if (child.branch === "extension") {
        pushIssue("durationExtension", spellDurationChildPath(child));
      } else if (child.ordinal !== FIRST_ORDINAL) {
        pushIssue("durationEnding", spellDurationChildPath(child));
      }
    }
  } else if (mechanics.duration.kind === "slot_tiered") {
    pushIssue("duration", spellDurationValuePath());
    for (const child of spellDurationChildCoordinates(mechanics.duration)) {
      if (child.branch === "extension") {
        pushIssue("durationExtension", spellDurationChildPath(child));
      }
    }
  } else {
    pushIssue("duration", spellDurationValuePath());
  }
  if (mechanics.attachment.kind !== "self") {
    pushIssue("attachment", spellOngoingAttachmentPath());
  }
  if (mechanics.initialPhase !== undefined) {
    pushIssue("initialPhase", spellOngoingInitialPhasePath());
  }
  if (mechanics.authoredConditionalEffects !== undefined) {
    pushIssue("authoredConditionalEffects", spellMechanicsRootPath());
  }
  for (const occurrence of occurrences) {
    for (const failedFact of spellOngoingOperationUnsupportedFacts(
      occurrence.operation,
    )) {
      pushIssue(failedFact, spellOngoingOperationPath(occurrence.ordinal));
    }
  }

  if (
    mechanics.operations.length !== 2 &&
    selectedOrdinals.size === mechanics.operations.length
  ) {
    pushIssue(
      "operationCount",
      spellOngoingOperationPath(
        PositiveInteger(mechanics.operations.length + 1),
      ),
    );
  }
  for (const occurrence of occurrences) {
    if (!selectedOrdinals.has(occurrence.ordinal)) {
      pushIssue(
        "operationCount",
        spellOngoingOperationPath(occurrence.ordinal),
      );
    }
  }

  const lightProjection =
    lightOperation === undefined
      ? ({ tag: "unsupported" } as const)
      : lightOperation.operation.effect.kind ===
            "emit_bright_and_dim_illumination" &&
          lightOperation.operation.effect.brightRadiusFeet === 20 &&
          lightOperation.operation.effect.dimAdditionalFeet === 20
        ? {
            tag: "supported" as const,
            light: {
              brightRadiusFeet: movementFeet(
                lightOperation.operation.effect.brightRadiusFeet,
              ),
              dimAdditionalFeet: movementFeet(
                lightOperation.operation.effect.dimAdditionalFeet,
              ),
            },
          }
        : ({ tag: "unsupported" } as const);
  if (lightOperation === undefined) {
    pushIssue("operation", spellOngoingOperationPath(PositiveInteger(1)));
    pushIssue("light", spellOngoingOperationEffectPath(PositiveInteger(1)));
  } else if (lightProjection.tag === "unsupported") {
    pushIssue("light", spellOngoingOperationEffectPath(lightOperation.ordinal));
  }

  const hurlProjection =
    hurlOperation === undefined
      ? ({ tag: "unsupported" } as const)
      : heldLightDamageAmountProjection(
          heldLightHurlDamageAmount(hurlOperation),
        );
  if (hurlOperation === undefined) {
    pushIssue("operation", spellOngoingOperationPath(PositiveInteger(1)));
    pushIssue("hurl", spellOngoingOperationEffectPath(PositiveInteger(1)));
  } else {
    for (const { failedFact, mechanicsPath } of heldLightHurlOptionalIssues(
      hurlOperation,
    )) {
      pushIssue(failedFact, mechanicsPath);
    }
    if (hurlProjection.tag === "unsupported") {
      pushIssue("hurl", spellOngoingOperationEffectPath(hurlOperation.ordinal));
    }
  }

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
  if (
    rangeFacts === undefined ||
    durationFacts === undefined ||
    lightProjection.tag !== "supported" ||
    hurlProjection.tag !== "supported"
  ) {
    const fallbackIssue =
      rangeFacts === undefined
        ? heldLightIssue("range", spellMechanicsHeaderPath("range"))
        : durationFacts === undefined
          ? heldLightIssue("duration", spellDurationValuePath())
          : lightProjection.tag !== "supported"
            ? heldLightIssue(
                "light",
                spellOngoingOperationEffectPath(
                  lightOperation?.ordinal ?? PositiveInteger(1),
                ),
              )
            : heldLightIssue(
                "hurl",
                spellOngoingOperationEffectPath(
                  hurlOperation?.ordinal ?? PositiveInteger(1),
                ),
              );
    return { tag: "unsupported", issues: [fallbackIssue] };
  }

  const facts = {
    ...source.spellDefinitionRuleFacts,
    range: rangeFacts,
    duration: durationFacts,
    light: lightProjection.light,
    hurl: { damageAmount: hurlProjection.amount },
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
          spellDurationEndingPath(PositiveInteger(1)),
          spellOngoingAttachmentPath(),
          ...occurrences
            .filter(({ ordinal }) => selectedOrdinals.has(ordinal))
            .flatMap(({ ordinal }) => [
              spellOngoingOperationPath(ordinal),
              spellOngoingOperationEffectPath(ordinal),
            ]),
          ...spellConsumedMaterialEvidencePaths(mechanics.components),
        ],
        unowned: [],
      },
      admit: (executionSource, ctx) =>
        admitHeldLight(executionSource, ctx, facts),
    },
  };
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
