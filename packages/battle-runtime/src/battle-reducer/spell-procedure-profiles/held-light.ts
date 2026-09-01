import { resolveSpellActiveEffectCast } from "../spell-active-effect-resolution.ts";
import type {
  BattleSpellAdmissionSource,
  BattleSpellExecutionSource,
} from "../../battle-state-execution.ts";
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
//   - isHeldFlameAttackOngoingEffectSpell - shared shape parser for the paired
//                                       heldLightHurl profile
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

import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import { attackBonus, movementFeet, PositiveInteger } from "@dnd/shared/types";
import { Result, Schema } from "effect";
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
import { supportedDamageAmountExpr } from "../spells-execution-facts.ts";
import type { HeldLightHurlMechanicalFacts } from "../../battle-state-execution.ts";
import { characterExecutionWithHeldLightHurl } from "../../character-execution-queries.ts";
import type { HeldLightHurlSpellProcedureExecution } from "../../character-execution.ts";
import type { DiceAmount, SpellMechanics } from "@dnd/surface/surface/types";
import {
  spellConsumedMaterialEvidencePaths,
  spellProcedureHasRedundantSignature,
  spellProcedureMapNonEmpty,
  spellProcedureNonEmpty,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureAdmissionIssue,
  type SpellProcedureMechanicsFacts,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  spellDurationEndingPath,
  spellDurationExtensionPath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellOngoingAttachmentPath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";

type HeldLightInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "heldLight" }
>;

type HeldLightMechanics = Extract<
  SpellMechanics,
  { readonly family: "ongoing_effect" }
>;
type HeldLightOperationOccurrence = {
  readonly operation: HeldLightMechanics["operations"][number];
  readonly ordinal: PositiveInteger;
};
type HeldLightMechanicsFacts = SpellProcedureMechanicsFacts & {
  readonly light: {
    readonly brightRadiusFeet: number;
    readonly dimAdditionalFeet: number;
  };
  readonly hurl: {
    readonly damageAmount: DiceAmount;
  };
};
type HeldLightFailedFact =
  | "level"
  | "castingTime"
  | "range"
  | "duration"
  | "durationExtension"
  | "durationEnding"
  | "attachment"
  | "operation"
  | "operationCount"
  | "light"
  | "hurl";
type HeldLightAdmissionIssue = SpellProcedureAdmissionIssue<
  "heldLight",
  HeldLightFailedFact,
  SpellMechanicsBranchPath
>;

function heldLightOperationOccurrences(
  mechanics: HeldLightMechanics,
): readonly HeldLightOperationOccurrence[] {
  return mechanics.operations.map((operation, index) => ({
    operation,
    ordinal: PositiveInteger(index + 1),
  }));
}

function heldLightLightOperation(
  operation: HeldLightOperationOccurrence,
): boolean {
  return (
    operation.operation.trigger.kind === "passive" &&
    operation.operation.effect.kind === "emit_bright_and_dim_illumination"
  );
}

function heldLightHurlOperation(
  operation: HeldLightOperationOccurrence,
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

function heldLightUnconditionalOperation(
  operation: HeldLightOperationOccurrence,
): boolean {
  return (
    operation.operation.predicate === undefined &&
    operation.operation.targetLimit === undefined &&
    operation.operation.usageLimit === undefined
  );
}

function heldLightRepresentation(
  mechanics: SpellMechanics,
): mechanics is HeldLightMechanics {
  if (mechanics.family !== "ongoing_effect") return false;
  const occurrences = heldLightOperationOccurrences(mechanics);
  const hasLightOperation = occurrences.some(
    (occurrence) =>
      heldLightLightOperation(occurrence) &&
      heldLightUnconditionalOperation(occurrence),
  );
  const hasHurlOperation = occurrences.some(
    (occurrence) =>
      heldLightHurlOperation(occurrence) &&
      heldLightUnconditionalOperation(occurrence),
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
        hasLightOperation,
        hasHurlOperation,
        hasBonusAction,
        hasTenMinuteDuration,
        hasSelfAttachment || hasSelfRange,
      ],
    })
  );
}

export function isHeldFlameAttackOngoingEffectSpell(
  spell: BattleSpellAdmissionSource,
): spell is BattleSpellAdmissionSource & {
  readonly mechanics: Extract<
    BattleSpellAdmissionSource["mechanics"],
    { family: "ongoing_effect" }
  >;
} {
  return heldLightRepresentation(spell.mechanics);
}

function heldLightIssue(
  failedFact: HeldLightFailedFact,
  mechanicsPath: SpellMechanicsBranchPath,
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
  operation: HeldLightOperationOccurrence,
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
  const occurrences = heldLightOperationOccurrences(mechanics);
  const lightOperation = occurrences.find(heldLightLightOperation);
  const hurlOperation = occurrences.find(heldLightHurlOperation);
  const selectedOrdinals = new Set(
    [lightOperation?.ordinal, hurlOperation?.ordinal].filter(
      (ordinal): ordinal is PositiveInteger => ordinal !== undefined,
    ),
  );
  const issues: Array<{
    readonly failedFact: HeldLightFailedFact;
    readonly mechanicsPath: SpellMechanicsBranchPath;
  }> = [];
  const pushIssue = (
    failedFact: HeldLightFailedFact,
    mechanicsPath: SpellMechanicsBranchPath,
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
    for (const [index] of (
      mechanics.duration.value.upcastTiers ?? []
    ).entries()) {
      pushIssue(
        "durationExtension",
        spellDurationExtensionPath(PositiveInteger(index + 1)),
      );
    }
    const endings = mechanics.duration.earlyEnd ?? [];
    const firstEnding = endings[0];
    if (
      firstEnding === undefined ||
      firstEnding.kind !== "caster_recasts_spell"
    ) {
      pushIssue("durationEnding", spellDurationEndingPath(PositiveInteger(1)));
    }
    for (const [index] of endings.entries()) {
      if (index > 0) {
        pushIssue(
          "durationEnding",
          spellDurationEndingPath(PositiveInteger(index + 1)),
        );
      }
    }
    if (mechanics.duration.permanentAfter !== undefined) {
      pushIssue(
        "durationEnding",
        spellDurationEndingPath(PositiveInteger(endings.length + 1)),
      );
    }
  } else if (mechanics.duration.kind === "slot_tiered") {
    pushIssue("duration", spellDurationValuePath());
    for (const [index] of mechanics.duration.tiers.entries()) {
      pushIssue(
        "durationExtension",
        spellDurationExtensionPath(PositiveInteger(index + 1)),
      );
    }
  } else {
    pushIssue("duration", spellDurationValuePath());
  }
  if (mechanics.attachment.kind !== "self") {
    pushIssue("attachment", spellOngoingAttachmentPath());
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

  let light: HeldLightMechanicsFacts["light"] | undefined;
  if (lightOperation === undefined) {
    pushIssue("operation", spellOngoingOperationPath(PositiveInteger(1)));
    pushIssue("light", spellOngoingOperationEffectPath(PositiveInteger(1)));
  } else if (
    !heldLightUnconditionalOperation(lightOperation) ||
    lightOperation.operation.effect.kind !==
      "emit_bright_and_dim_illumination" ||
    lightOperation.operation.effect.brightRadiusFeet !== 20 ||
    lightOperation.operation.effect.dimAdditionalFeet !== 20
  ) {
    pushIssue("light", spellOngoingOperationEffectPath(lightOperation.ordinal));
  } else {
    light = {
      brightRadiusFeet: lightOperation.operation.effect.brightRadiusFeet,
      dimAdditionalFeet: lightOperation.operation.effect.dimAdditionalFeet,
    };
  }

  let damageAmount: DiceAmount | undefined;
  if (hurlOperation === undefined) {
    pushIssue("operation", spellOngoingOperationPath(PositiveInteger(1)));
    pushIssue("hurl", spellOngoingOperationEffectPath(PositiveInteger(1)));
  } else {
    const candidate = heldLightHurlDamageAmount(hurlOperation);
    if (
      !heldLightUnconditionalOperation(hurlOperation) ||
      candidate === null ||
      supportedDamageAmountExpr({ amount: candidate, characterLevel: 1 }) ===
        null
    ) {
      pushIssue("hurl", spellOngoingOperationEffectPath(hurlOperation.ordinal));
    } else {
      damageAmount = candidate;
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
  if (light === undefined || damageAmount === undefined) {
    return {
      tag: "unsupported",
      issues: [
        heldLightIssue(
          "operation",
          spellOngoingOperationPath(PositiveInteger(1)),
        ),
      ],
    };
  }

  const facts = {
    ...source.spellDefinitionRuleFacts,
    light,
    hurl: { damageAmount },
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

function heldLightHurlFromFacts(
  facts: HeldLightMechanicsFacts,
  ctx: SpellAdmissionContext,
): HeldLightHurlMechanicalFacts | null {
  const damageExpr = supportedDamageAmountExpr({
    amount: facts.hurl.damageAmount,
    spellLevel: Number(facts.level),
    characterLevel: spellAdmissionCharacterLevel(ctx),
  });
  return damageExpr === null
    ? null
    : {
        targeting: { kind: "singleCreatureOrObject" },
        damage: { expr: damageExpr, damageType: "fire" },
        rangeFeet: movementFeet(60),
        attackKind: "ranged_spell_attack",
        attackBonus: attackBonus(
          Number(ctx.castingSource.abilityModifier) +
            Number(ctx.actor.origin.spellcasting.proficiencyBonus),
        ),
      };
}

function admitHeldLight(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: HeldLightMechanicsFacts,
): readonly HeldLightInvocation[] {
  if (facts.duration.kind !== "timed") return [];
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    facts.duration.value,
  );
  const hurl = heldLightHurlFromFacts(facts, ctx);
  return Result.isFailure(durationTicks) || hurl === null
    ? []
    : [
        {
          access: cantripSpellAccessFor(ctx.castingSource),
          resource: { tag: "none" },
          procedure: "heldLight",
          spell,
          actionCost: "bonusAction",
          light: {
            brightRadiusFeet: movementFeet(facts.light.brightRadiusFeet),
            dimAdditionalFeet: movementFeet(facts.light.dimAdditionalFeet),
          },
          hurl,
          expiresAt: { kind: "duration", durationTicks: durationTicks.success },
        },
      ];
}

export function heldLightHurlMechanicalFacts(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): HeldLightHurlMechanicalFacts | null {
  if (!heldLightRepresentation(spell.mechanics)) return null;
  const occurrences = heldLightOperationOccurrences(spell.mechanics);
  const hurlOperation = occurrences.find(heldLightHurlOperation);
  const amount =
    hurlOperation === undefined
      ? null
      : heldLightHurlDamageAmount(hurlOperation);
  return amount === null
    ? null
    : heldLightHurlFromFacts(
        {
          ...spell.spellDefinitionRuleFacts,
          light: { brightRadiusFeet: 20, dimAdditionalFeet: 20 },
          hurl: { damageAmount: amount },
        },
        ctx,
      );
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
