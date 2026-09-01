import type {
  BattleSpellAdmissionSource,
  BattleSpellExecutionSource,
} from "../../battle-state-execution.ts";
import {
  ongoingSpellRepeatCastIsAvailable,
  ongoingSpellRepeatIsOnLaterTurn,
} from "../ongoing-spell-repeat-cast.ts";
import { spellCastCandidate } from "../spell-cast-candidate.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spiritual-weapon-attack-proxy
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
import { DiceExprSchema } from "@dnd/surface/surface/schema";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SPIRITUAL_WEAPON_ATTACK_PROXY
//
// The Spiritual Weapon profile family: a prepared Bonus Action spell creates a
// spell-owned spectral force attack proxy, and later Bonus Actions move the
// force and repeat the melee Spell Attack.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-S-Z.md "Spiritual Weapon":
//     Bonus Action; 60 feet; Concentration up to 1 minute; spectral force
//     appears in a chosen space; immediate melee Spell Attack against one
//     creature within 5 feet of the force; Force damage 1d8 plus spellcasting
//     ability modifier; later-turn Bonus Action moves up to 20 feet and repeats
//     the attack; higher-level slots add 1d8 per slot level above 2.
//   - UBIQUITOUS_LANGUAGE.md: Bonus Action, Spell Attack, Attack Roll, Damage
//     Roll, Damage Type, Spell Slot, Spell Invocation, and Spell Effect.
//
// What lives here: shape admission, active-effect repeat admission, discovery,
// cast summaries, invocation references, and the profile-owned resolve entry.
//
// What stays in shared infrastructure: the attack/damage resolver body remains
// in spells-resolve.ts because ordinary spell attacks, held-light hurls,
// spell-created held-object attacks, object-contact repeats, and Spiritual
// Weapon attacks share one target, attack-roll, damage, reaction, reduction,
// and concentration-save lifecycle.

import {
  attackBonus,
  movementFeet,
  PositiveInteger,
  type AbilityModifier,
  type ProficiencyBonus as ProficiencyBonusType,
} from "@dnd/shared/types";
import type {
  Attachment,
  DamageType,
  DiceAmount,
  DiceExpr,
  DiceExprDelta,
  EffectAtom,
  OngoingEffect,
  SpellMechanics,
} from "@dnd/surface/surface/types";
import { Match } from "effect";
import {
  type BattleActDiscoveryCandidate,
  type BattleActiveEffect,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import {
  BattleEffectExecutionRef,
  BattleProcedureExecutionRef,
  CombatantId,
} from "../../identity.ts";
import { magicSuppressionOngoingSpellEffectRefForActiveEffect } from "../magic-suppression-ongoing-effect.ts";
import {
  spatialMeleeSpellAttackProxyPositionHole,
  spellTargetHole,
} from "../spells-targeting.ts";
import { resolveBonusActionSpellAttackProxyAct } from "../spells-resolve.ts";
import { characterRetainedSpellProcedureExecution } from "../../character-execution-queries.ts";
import type { SpellProcedureExecutionRegistry } from "./execution-registry.ts";
import { supportedDamageAmountExpr } from "../spells-execution-facts.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import {
  AttackBonus,
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  spellAdmissionBattleTurn,
  spellAdmissionOngoingSpellEffectSuppressed,
  spellInvocationResourceForCastOption,
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  admitSpellTargetAttachment,
  spellDurationChildCoordinates,
  spellDurationChildFailedFact,
  spellDurationChildPath,
  spellDurationEvidencePaths,
  spellDurationValueEvidencePaths,
  spellMechanicsObjectHasOnlyKeys,
  spellProcedureNonEmpty,
  spellUniqueMechanicsIssues,
  spellDurationTicksFromCanonicalValue,
  spellDefinitionPointRangeFeet,
  isSpellCanonicalDurationValue,
  type SpellCanonicalDurationValue,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  spellMechanicsHeaderPath,
  spellOngoingAttachmentPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { SpellDefinitionRuleFacts } from "../../procedure-execution/spell-rule-facts.ts";

type SpatialMeleeSpellAttackProxyAttackProxyInvocation = Extract<
  SupportedSpellInvocation,
  {
    readonly procedure: "spatialMeleeSpellAttackProxy";
    readonly operation: "createAndAttack";
  }
>;
type SpatialMeleeSpellAttackProxyRepeatAttackInvocation = Extract<
  SupportedSpellInvocation,
  {
    readonly procedure: "spatialMeleeSpellAttackProxy";
    readonly operation: "repositionAndAttack";
  }
>;
type SpatialMeleeSpellAttackProxyInvocation =
  | SpatialMeleeSpellAttackProxyAttackProxyInvocation
  | SpatialMeleeSpellAttackProxyRepeatAttackInvocation;
type SpatialMeleeSpellAttackProxyResolveInput =
  SpellProcedureProfileResolveInput<SpatialMeleeSpellAttackProxyInvocation>;
type LinearPerLevelDiceAmount = Extract<
  DiceAmount,
  { readonly kind: "linear_per_level" }
>;
type SupportedSpatialMeleeSpellAttackProxyDamageAmount =
  LinearPerLevelDiceAmount & {
    readonly axis: "slot";
    readonly base: DiceExpr & {
      readonly dice: 1;
      readonly dieSize: 8;
      readonly flat?: undefined;
      readonly spellcastingMod: true;
      readonly abilityModifier?: undefined;
    };
    readonly perLevel: DiceExprDelta & {
      readonly dice: 1;
      readonly dieSize: 8;
      readonly flat?: undefined;
    };
    readonly startingAtLevel: 2;
  };
type SupportedSpatialMeleeSpellAttackProxyDamageEffect = Extract<
  EffectAtom,
  { readonly kind: "damage" }
> & {
  readonly damageType: "force";
  readonly amount: SupportedSpatialMeleeSpellAttackProxyDamageAmount;
};

type SpatialMeleeSpellAttackProxyMechanics = Extract<
  BattleSpellAdmissionSource["mechanics"],
  { readonly family: "ongoing_effect" }
>;
type SpatialMeleeSpellAttackProxyMechanicsFacts = SpellDefinitionRuleFacts & {
  readonly durationValue: SpellCanonicalDurationValue;
  readonly rangeFeet: MovementFeet;
  readonly forceReachFeet: MovementFeet;
  readonly repeatMoveMaxFeet: MovementFeet;
  readonly damageAmount: SupportedSpatialMeleeSpellAttackProxyDamageAmount;
  readonly attackKind: "melee_spell_attack";
  readonly damageType: Extract<DamageType, "force">;
};

export const SPATIAL_MELEE_SPELL_ATTACK_PROXY_FAILED_FACTS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "durationValue",
  "durationExtension",
  "durationEnding",
  "castingTime",
  "attachment",
  "initialPhase",
  "initialAttack",
  "initialDamage",
  "initialMiss",
  "operationCount",
  "operation",
  "operationEffect",
  "repositionEffect",
  "repeatAttack",
  "repeatDamage",
  "repeatMiss",
  "damageAmount",
] as const;
type SpatialMeleeSpellAttackProxyFailedFact =
  (typeof SPATIAL_MELEE_SPELL_ATTACK_PROXY_FAILED_FACTS)[number];
type SpatialMeleeSpellAttackProxyMechanicsIssue = {
  readonly failedFact: SpatialMeleeSpellAttackProxyFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

const SPATIAL_ONGOING_ATTACHMENT_FIELDS = [
  "kind",
  "holeId",
  "label",
  "value",
] as const;
const SPATIAL_ROOT_FIELDS = [
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
] as const;
const SPATIAL_LOCATION_VALUE_FIELDS = ["kind", "description"] as const;
const SPATIAL_INITIAL_PHASE_FIELDS = [
  "kind",
  "attachment",
  "attackKind",
  "onHit",
  "onMiss",
  "continue",
] as const;
const SPATIAL_CASTING_TIME_FIELDS = ["kind"] as const;
const SPATIAL_REPEAT_OPERATION_FIELDS = [
  "trigger",
  "predicate",
  "targetLimit",
  "effect",
  "usageLimit",
] as const;
const SPATIAL_REPEAT_TRIGGER_FIELDS = [
  "kind",
  "cost",
  "laterTurnsOnly",
] as const;
const SPATIAL_REPEAT_COST_FIELDS = ["kind"] as const;
const SPATIAL_COMPOSITE_EFFECT_FIELDS = ["kind", "effects"] as const;
const SPATIAL_REPOSITION_FIELDS = [
  "kind",
  "maxMoveFeet",
  "destination",
] as const;
const SPATIAL_ATTACK_PHASE_FIELDS = [
  "kind",
  "attachment",
  "attackKind",
  "onHit",
  "onMiss",
] as const;
const SPATIAL_TARGET_SELECTION_FIELDS = [
  "mode",
  "targetKinds",
  "relativePosition",
] as const;
const SPATIAL_RELATIVE_POSITION_FIELDS = [
  "kind",
  "attachmentHoleId",
  "feet",
] as const;
const SPATIAL_DAMAGE_EFFECT_FIELDS = [
  "kind",
  "damageType",
  "amount",
  "timing",
] as const;
const SPATIAL_NONE_EFFECT_FIELDS = ["kind"] as const;
const SPATIAL_DAMAGE_AMOUNT_FIELDS = [
  "kind",
  "axis",
  "base",
  "perLevel",
  "startingAtLevel",
] as const;
const SPATIAL_BASE_EXPR_FIELDS = [
  "dice",
  "dieSize",
  "flat",
  "spellcastingMod",
  "abilityModifier",
] as const;
const SPATIAL_DELTA_EXPR_FIELDS = ["dice", "dieSize", "flat"] as const;

function admitSpatialMeleeSpellAttackProxyAttackProxy(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: SpatialMeleeSpellAttackProxyMechanicsFacts,
): readonly SpatialMeleeSpellAttackProxyAttackProxyInvocation[] {
  const spellcasting = ctx.actor.origin.spellcasting;
  const durationTicks = spellDurationTicksFromCanonicalValue(
    facts.durationValue,
  );
  return ctx.spellCastOptions.flatMap(
    (slot): readonly SpatialMeleeSpellAttackProxyAttackProxyInvocation[] => {
      if (Number(slot.spellLevel) < facts.level) return [];
      const damageExpr = supportedDamageAmountExpr({
        amount: facts.damageAmount,
        spellLevel: facts.level,
        slotLevel: slot.spellLevel,
      });
      return damageExpr === null
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "spatialMeleeSpellAttackProxy",
              operation: "createAndAttack",
              spell,
              actionCost: "bonusAction",
              targeting: { kind: "singleCombatant" },
              durationTicks,
              rangeFeet: facts.rangeFeet,
              forceReachFeet: facts.forceReachFeet,
              repeatMoveMaxFeet: facts.repeatMoveMaxFeet,
              damage: {
                kind: "fixedSpellAttackDamage",
                expr: {
                  ...damageExpr,
                  flat: Number(ctx.castingSource.abilityModifier),
                },
                damageType: facts.damageType,
              },
              attackKind: facts.attackKind,
              attackBonus: spatialMeleeSpellAttackProxyAttackBonus({
                spellcastingAbilityModifier: ctx.castingSource.abilityModifier,
                proficiencyBonus: spellcasting.proficiencyBonus,
              }),
            },
          ];
    },
  );
}

function spatialMeleeSpellAttackProxyRepeatEffectIsAvailable(
  effect: BattleActiveEffect,
  ctx: SpellAdmissionContext,
): effect is Extract<
  BattleActiveEffect,
  { readonly kind: "spatialMeleeSpellAttackProxy" }
> {
  return (
    effect.kind === "spatialMeleeSpellAttackProxy" &&
    effect.sourceCombatantId === ctx.actor.combatantId &&
    !spellAdmissionOngoingSpellEffectSuppressed(
      ctx,
      magicSuppressionOngoingSpellEffectRefForActiveEffect(effect),
    ) &&
    spatialMeleeSpellAttackProxyRepeatIsLaterTurn(effect, ctx)
  );
}

function spatialMeleeSpellAttackProxyRepeatBindingFor(
  effect: Extract<
    BattleActiveEffect,
    { readonly kind: "spatialMeleeSpellAttackProxy" }
  >,
  ctx: SpellAdmissionContext,
) {
  const procedure = ctx.actor.origin.execution.procedureBindings.find(
    (binding) =>
      binding.procedure.kind === "spellInvocation" &&
      binding.procedure.execution.procedure ===
        "spatialMeleeSpellAttackProxy" &&
      binding.procedure.execution.operation === "repositionAndAttack" &&
      binding.procedure.execution.activeEffectRef === effect.effectRef &&
      binding.procedure.execution.activeEffectSourceProcedureRef ===
        effect.sourceProcedureRef,
  )?.procedure;
  return procedure?.kind === "spellInvocation" ? procedure.execution : null;
}

function spatialMeleeSpellAttackProxyRepeatExecutionFacts(
  effect: Extract<
    BattleActiveEffect,
    { readonly kind: "spatialMeleeSpellAttackProxy" }
  >,
  ctx: SpellAdmissionContext,
) {
  const source = characterRetainedSpellProcedureExecution(
    ctx.actor.origin.execution,
    effect.sourceProcedureRef,
  );
  if (source?.procedure !== "spatialMeleeSpellAttackProxy") return null;
  if (source.operation !== "createAndAttack") return null;
  const repeat = spatialMeleeSpellAttackProxyRepeatBindingFor(effect, ctx);
  if (repeat === null) return null;
  if (repeat.procedure !== "spatialMeleeSpellAttackProxy") return null;
  if (repeat.operation !== "repositionAndAttack") return null;
  return { source, repeat };
}

function admitSpatialMeleeSpellAttackProxyRepeatAttack(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
): readonly SpatialMeleeSpellAttackProxyRepeatAttackInvocation[] {
  return ctx.actor.activeEffects.flatMap(
    (effect): readonly SpatialMeleeSpellAttackProxyRepeatAttackInvocation[] => {
      if (!spatialMeleeSpellAttackProxyRepeatEffectIsAvailable(effect, ctx)) {
        return [];
      }
      const execution = spatialMeleeSpellAttackProxyRepeatExecutionFacts(
        effect,
        ctx,
      );
      if (execution === null) return [];
      return [
        {
          access: {
            tag: "spellEffect",
            sourceCombatantId: effect.sourceCombatantId,
          },
          resource: { tag: "none" },
          procedure: "spatialMeleeSpellAttackProxy",
          operation: "repositionAndAttack",
          spell,
          actionCost: "bonusAction",
          activeEffect: effect,
          targeting: { kind: "singleCombatant" },
          repeatTargeting: execution.repeat.repeatTargeting,
          damage: execution.source.damage,
          attackKind: execution.source.attackKind,
          attackBonus: execution.source.attackBonus,
          forceReachFeet: execution.source.forceReachFeet,
          repeatMoveMaxFeet: execution.source.repeatMoveMaxFeet,
        },
      ];
    },
  );
}

function spatialMeleeSpellAttackProxyAttackBonus(input: {
  readonly spellcastingAbilityModifier: AbilityModifier;
  readonly proficiencyBonus: ProficiencyBonusType;
}) {
  return attackBonus(
    Number(input.spellcastingAbilityModifier) + Number(input.proficiencyBonus),
  );
}

function spatialMeleeSpellAttackProxyRepeatIsLaterTurn(
  effect: Extract<
    BattleActiveEffect,
    { readonly kind: "spatialMeleeSpellAttackProxy" }
  >,
  ctx: SpellAdmissionContext,
): boolean {
  const battleTurn = spellAdmissionBattleTurn(ctx);
  return (
    battleTurn !== undefined &&
    ongoingSpellRepeatIsOnLaterTurn(battleTurn, effect)
  );
}

function spatialMeleeSpellAttackProxySemanticCandidate(
  mechanics: SpellMechanics,
): boolean {
  return (
    mechanics.family === "ongoing_effect" &&
    mechanics.initialPhase?.kind === "attack_roll" &&
    mechanics.operations.some(
      (operation) => operation.effect.kind === "composite_ongoing",
    )
  );
}

function spatialMeleeSpellAttackProxyDistinctiveHeaderFallback(
  mechanics: SpellMechanics,
): boolean {
  return (
    mechanics.family === "ongoing_effect" &&
    mechanics.level === 2 &&
    mechanics.castingTime.kind === "bonus_action" &&
    mechanics.range.kind === "point" &&
    mechanics.range.feet === 60 &&
    mechanics.duration.kind === "concentration"
  );
}

function spatialMeleeSpellAttackProxyForceAttachmentIsSupported(
  attachment: Attachment,
): attachment is Extract<Attachment, { readonly kind: "hole" }> & {
  readonly value: { readonly kind: "location" };
} {
  return (
    attachment.kind === "hole" &&
    spellMechanicsObjectHasOnlyKeys(
      attachment,
      SPATIAL_ONGOING_ATTACHMENT_FIELDS,
    ) &&
    attachment.value.kind === "location" &&
    spellMechanicsObjectHasOnlyKeys(
      attachment.value,
      SPATIAL_LOCATION_VALUE_FIELDS,
    )
  );
}

function spatialMeleeSpellAttackProxyDurationIsSupported(
  duration: SpellMechanics["duration"],
): duration is Extract<
  SpatialMeleeSpellAttackProxyMechanics["duration"],
  { readonly kind: "concentration"; readonly upTo: SpellCanonicalDurationValue }
> {
  return (
    duration.kind === "concentration" &&
    spellMechanicsObjectHasOnlyKeys(duration, [
      "kind",
      "upTo",
      "earlyEnd",
      "permanentIfMaintainedFull",
    ]) &&
    spellMechanicsObjectHasOnlyKeys(duration.upTo, [
      "unit",
      "amount",
      "upcastTiers",
    ]) &&
    duration.upTo.unit === "minute" &&
    duration.upTo.amount === 1 &&
    isSpellCanonicalDurationValue(duration.upTo) &&
    duration.upTo.upcastTiers === undefined &&
    duration.earlyEnd === undefined &&
    duration.permanentIfMaintainedFull === undefined
  );
}

function spatialMeleeSpellAttackProxyAttackPhaseIsSupported(
  phase:
    | Extract<
        SpatialMeleeSpellAttackProxyMechanics["initialPhase"],
        { readonly kind: "attack_roll" }
      >
    | undefined,
  forceHoleId: string,
): phase is Extract<
  SpatialMeleeSpellAttackProxyMechanics["initialPhase"],
  { readonly kind: "attack_roll" }
> {
  return (
    phase !== undefined &&
    spellMechanicsObjectHasOnlyKeys(phase, SPATIAL_INITIAL_PHASE_FIELDS) &&
    phase.continue === undefined &&
    phase.attackKind === "melee_spell_attack" &&
    spatialMeleeSpellAttackProxyAttackTargetMatchesForce(
      phase.attachment,
      forceHoleId,
    ) &&
    phase.onHit.length === 1 &&
    phase.onMiss.length === 1
  );
}

function spatialMeleeSpellAttackProxyRepeatAttackPhaseIsSupported(
  phase: Extract<OngoingEffect, { readonly kind: "attack_roll" }> | undefined,
  forceHoleId: string,
): phase is Extract<OngoingEffect, { readonly kind: "attack_roll" }> {
  return (
    phase !== undefined &&
    spellMechanicsObjectHasOnlyKeys(phase, SPATIAL_ATTACK_PHASE_FIELDS) &&
    phase.attackKind === "melee_spell_attack" &&
    spatialMeleeSpellAttackProxyAttackTargetMatchesForce(
      phase.attachment,
      forceHoleId,
    ) &&
    phase.onHit.length === 1 &&
    phase.onMiss.length === 1
  );
}

function spatialMeleeSpellAttackProxyOperationIsSupported(
  operation:
    | SpatialMeleeSpellAttackProxyMechanics["operations"][number]
    | undefined,
): operation is SpatialMeleeSpellAttackProxyMechanics["operations"][number] & {
  readonly effect: Extract<
    OngoingEffect,
    { readonly kind: "composite_ongoing" }
  >;
} {
  return (
    operation !== undefined &&
    spellMechanicsObjectHasOnlyKeys(
      operation,
      SPATIAL_REPEAT_OPERATION_FIELDS,
    ) &&
    operation.predicate === undefined &&
    operation.targetLimit === undefined &&
    operation.usageLimit === undefined &&
    operation.trigger.kind === "on_caster_spends_action" &&
    spellMechanicsObjectHasOnlyKeys(
      operation.trigger,
      SPATIAL_REPEAT_TRIGGER_FIELDS,
    ) &&
    spellMechanicsObjectHasOnlyKeys(
      operation.trigger.cost,
      SPATIAL_REPEAT_COST_FIELDS,
    ) &&
    operation.trigger.cost.kind === "bonus_action" &&
    operation.trigger.laterTurnsOnly === true &&
    operation.effect.kind === "composite_ongoing" &&
    spellMechanicsObjectHasOnlyKeys(
      operation.effect,
      SPATIAL_COMPOSITE_EFFECT_FIELDS,
    )
  );
}

function spatialMeleeSpellAttackProxyRepositionIsSupported(
  effect: OngoingEffect | undefined,
): effect is Extract<
  OngoingEffect,
  { readonly kind: "reposition_attachment" }
> & {
  readonly maxMoveFeet: 20;
} {
  return (
    effect !== undefined &&
    effect.kind === "reposition_attachment" &&
    spellMechanicsObjectHasOnlyKeys(effect, SPATIAL_REPOSITION_FIELDS) &&
    effect.maxMoveFeet === 20 &&
    effect.destination === undefined
  );
}

function isSupportedSpatialMeleeSpellAttackProxyDamageEffect(
  effect: EffectAtom | undefined,
): effect is SupportedSpatialMeleeSpellAttackProxyDamageEffect {
  if (
    effect?.kind !== "damage" ||
    !spellMechanicsObjectHasOnlyKeys(effect, SPATIAL_DAMAGE_EFFECT_FIELDS) ||
    effect.timing !== undefined
  ) {
    return false;
  }
  return (
    effect.damageType === "force" &&
    isSupportedSpatialMeleeSpellAttackProxyDamageAmount(effect.amount)
  );
}

function isSupportedSpatialMeleeSpellAttackProxyMissEffect(
  effect: EffectAtom | undefined,
): effect is Extract<EffectAtom, { readonly kind: "none" }> {
  return (
    effect?.kind === "none" &&
    spellMechanicsObjectHasOnlyKeys(effect, SPATIAL_NONE_EFFECT_FIELDS)
  );
}

function isSupportedSpatialMeleeSpellAttackProxyDamageAmount(
  amount: DiceAmount,
): amount is SupportedSpatialMeleeSpellAttackProxyDamageAmount {
  if (
    amount.kind !== "linear_per_level" ||
    amount.axis !== "slot" ||
    amount.startingAtLevel !== 2 ||
    !spellMechanicsObjectHasOnlyKeys(amount, SPATIAL_DAMAGE_AMOUNT_FIELDS)
  ) {
    return false;
  }
  return (
    isSupportedSpatialMeleeSpellAttackProxyBaseDamage(amount.base) &&
    isSupportedSpatialMeleeSpellAttackProxyPerLevelDamage(amount.perLevel)
  );
}

function isSupportedSpatialMeleeSpellAttackProxyBaseDamage(
  amount: DiceExpr,
): boolean {
  return (
    spellMechanicsObjectHasOnlyKeys(amount, SPATIAL_BASE_EXPR_FIELDS) &&
    amount.dice === 1 &&
    amount.dieSize === 8 &&
    amount.flat === undefined &&
    amount.spellcastingMod === true &&
    amount.abilityModifier === undefined
  );
}

function isSupportedSpatialMeleeSpellAttackProxyPerLevelDamage(
  amount: DiceExprDelta,
): boolean {
  return (
    spellMechanicsObjectHasOnlyKeys(amount, SPATIAL_DELTA_EXPR_FIELDS) &&
    amount.dice === 1 &&
    amount.dieSize === 8 &&
    amount.flat === undefined
  );
}

function sameSpatialMeleeSpellAttackProxyBaseDamage(
  left: SupportedSpatialMeleeSpellAttackProxyDamageAmount["base"],
  right: SupportedSpatialMeleeSpellAttackProxyDamageAmount["base"],
): boolean {
  return (
    left.dice === right.dice &&
    left.dieSize === right.dieSize &&
    left.flat === right.flat &&
    left.spellcastingMod === right.spellcastingMod &&
    left.abilityModifier === right.abilityModifier
  );
}

function sameSpatialMeleeSpellAttackProxyPerLevelDamage(
  left: SupportedSpatialMeleeSpellAttackProxyDamageAmount["perLevel"],
  right: SupportedSpatialMeleeSpellAttackProxyDamageAmount["perLevel"],
): boolean {
  return (
    left.dice === right.dice &&
    left.dieSize === right.dieSize &&
    left.flat === right.flat
  );
}

function sameSpatialMeleeSpellAttackProxyDamageEffect(
  left: SupportedSpatialMeleeSpellAttackProxyDamageEffect,
  right: SupportedSpatialMeleeSpellAttackProxyDamageEffect,
): boolean {
  return (
    left.damageType === right.damageType &&
    left.amount.axis === right.amount.axis &&
    left.amount.startingAtLevel === right.amount.startingAtLevel &&
    sameSpatialMeleeSpellAttackProxyBaseDamage(
      left.amount.base,
      right.amount.base,
    ) &&
    sameSpatialMeleeSpellAttackProxyPerLevelDamage(
      left.amount.perLevel,
      right.amount.perLevel,
    )
  );
}

function spatialMeleeSpellAttackProxyAttackTargetMatchesForce(
  attachment: Attachment | undefined,
  forceHoleId: string,
): boolean {
  return (
    spatialMeleeSpellAttackProxyForceReachFeet(attachment, forceHoleId) !==
    undefined
  );
}

function spatialMeleeSpellAttackProxyForceReachFeet(
  attachment: Attachment | undefined,
  forceHoleId: string,
): MovementFeet | undefined {
  if (attachment?.kind !== "hole") {
    return undefined;
  }
  const admitted = admitSpellTargetAttachment(
    attachment,
    SPATIAL_TARGET_SELECTION_FIELDS,
  );
  if (admitted.tag !== "admitted") return undefined;
  const selection = admitted.attachment.value.selection;
  if (
    selection.mode !== "one" ||
    selection.targetKinds === undefined ||
    selection.targetKinds.length !== 1 ||
    selection.targetKinds[0] !== "creature"
  ) {
    return undefined;
  }
  const relativePosition =
    "relativePosition" in selection ? selection.relativePosition : undefined;
  return relativePosition !== undefined &&
    spellMechanicsObjectHasOnlyKeys(
      relativePosition,
      SPATIAL_RELATIVE_POSITION_FIELDS,
    ) &&
    relativePosition.kind === "within_feet_of_attachment" &&
    relativePosition.attachmentHoleId === forceHoleId &&
    relativePosition.feet === 5
    ? movementFeet(relativePosition.feet)
    : undefined;
}

function spatialMeleeSpellAttackProxyIssueResult(
  issue: SpatialMeleeSpellAttackProxyMechanicsIssue,
) {
  return {
    tag: "spellProcedureAdmissionIssue" as const,
    procedure: "spatialMeleeSpellAttackProxy" as const,
    failedFact: issue.failedFact,
    mechanicsPath: issue.mechanicsPath,
    message: `Unsupported spatialMeleeSpellAttackProxy mechanics fact: ${issue.failedFact}.`,
  };
}

function spatialMeleeSpellAttackProxyMechanicsEvidence(
  mechanics: SpatialMeleeSpellAttackProxyMechanics,
  operationIndex: number,
): SpellProcedureMechanicsEvidence {
  const consumed: [SpellMechanicsBranchPath, ...SpellMechanicsBranchPath[]] = [
    spellMechanicsHeaderPath("level"),
    spellMechanicsHeaderPath("school"),
    spellMechanicsHeaderPath("range"),
    spellMechanicsHeaderPath("components"),
    spellMechanicsHeaderPath("duration"),
    spellMechanicsHeaderPath("castingTime"),
    spellMechanicsHeaderPath("family"),
    ...spellDurationEvidencePaths(mechanics.duration),
    spellOngoingAttachmentPath(),
    spellOngoingInitialPhasePath(),
    spellOngoingOperationPath(PositiveInteger(operationIndex + 1)),
    spellOngoingOperationEffectPath(PositiveInteger(operationIndex + 1)),
  ];
  return { consumed, unowned: [] };
}

function admitSpatialMeleeSpellAttackProxyMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "spatialMeleeSpellAttackProxy",
  SpatialMeleeSpellAttackProxyMechanicsFacts,
  SpatialMeleeSpellAttackProxyInvocation,
  ReturnType<typeof spatialMeleeSpellAttackProxyIssueResult>
> {
  if (
    !spatialMeleeSpellAttackProxySemanticCandidate(source.mechanics) &&
    !spatialMeleeSpellAttackProxyDistinctiveHeaderFallback(source.mechanics)
  ) {
    return { tag: "notRepresented" };
  }
  if (source.mechanics.family !== "ongoing_effect") {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const forceAttachment =
    spatialMeleeSpellAttackProxyForceAttachmentIsSupported(mechanics.attachment)
      ? mechanics.attachment
      : undefined;
  const forceHoleId = forceAttachment?.holeId ?? "";
  const initialPhase =
    mechanics.initialPhase?.kind === "attack_roll"
      ? mechanics.initialPhase
      : undefined;
  const operationIndex = mechanics.operations.findIndex(
    (operation) => operation.effect.kind === "composite_ongoing",
  );
  const operation =
    operationIndex < 0 ? undefined : mechanics.operations[operationIndex];
  const repeatEffect =
    operation?.effect.kind === "composite_ongoing"
      ? operation.effect
      : undefined;
  const repeatEffects = repeatEffect?.effects ?? [];
  const repositionIndex = repeatEffects.findIndex(
    (effect) => effect.kind === "reposition_attachment",
  );
  const repeatAttackIndex = repeatEffects.findIndex(
    (effect) => effect.kind === "attack_roll",
  );
  const reposition =
    repositionIndex < 0 ? undefined : repeatEffects[repositionIndex];
  const repeatAttack =
    repeatAttackIndex < 0 ? undefined : repeatEffects[repeatAttackIndex];
  const initialHit = initialPhase?.onHit[0];
  const initialMiss = initialPhase?.onMiss[0];
  const repeatHit =
    repeatAttack?.kind === "attack_roll" ? repeatAttack.onHit[0] : undefined;
  const repeatMiss =
    repeatAttack?.kind === "attack_roll" ? repeatAttack.onMiss[0] : undefined;
  const initialAttackValid =
    forceHoleId !== "" &&
    spatialMeleeSpellAttackProxyAttackPhaseIsSupported(
      initialPhase,
      forceHoleId,
    );
  const repeatAttackValid =
    forceHoleId !== "" &&
    spatialMeleeSpellAttackProxyRepeatAttackPhaseIsSupported(
      repeatAttack?.kind === "attack_roll" ? repeatAttack : undefined,
      forceHoleId,
    );
  const initialDamageValid =
    isSupportedSpatialMeleeSpellAttackProxyDamageEffect(initialHit);
  const repeatDamageValid =
    isSupportedSpatialMeleeSpellAttackProxyDamageEffect(repeatHit);
  const initialDamage = initialDamageValid ? initialHit : undefined;
  const repeatDamage = repeatDamageValid ? repeatHit : undefined;
  const attackKind =
    initialPhase?.attackKind === "melee_spell_attack"
      ? initialPhase.attackKind
      : undefined;
  const damageType = initialDamage?.damageType;
  const damageAmountsCorrelated =
    initialDamage !== undefined &&
    repeatDamage !== undefined &&
    sameSpatialMeleeSpellAttackProxyDamageEffect(initialDamage, repeatDamage);
  const durationValid = spatialMeleeSpellAttackProxyDurationIsSupported(
    mechanics.duration,
  );
  const durationValue =
    mechanics.duration.kind === "concentration" &&
    isSpellCanonicalDurationValue(mechanics.duration.upTo)
      ? mechanics.duration.upTo
      : undefined;
  const rangeFeet = spellDefinitionPointRangeFeet(
    source.spellDefinitionRuleFacts.range,
  );
  const forceReachFeet =
    initialPhase === undefined
      ? undefined
      : spatialMeleeSpellAttackProxyForceReachFeet(
          initialPhase.attachment,
          forceHoleId,
        );
  const repeatMoveMaxFeet = spatialMeleeSpellAttackProxyRepositionIsSupported(
    reposition,
  )
    ? movementFeet(reposition.maxMoveFeet)
    : undefined;
  const operationValid =
    spatialMeleeSpellAttackProxyOperationIsSupported(operation);
  const issues: SpatialMeleeSpellAttackProxyMechanicsIssue[] = [];
  const push = (
    failedFact: SpatialMeleeSpellAttackProxyFailedFact,
    mechanicsPath: SpellMechanicsBranchPath,
  ) => issues.push({ failedFact, mechanicsPath });

  if (mechanics.level !== 2) push("level", spellMechanicsHeaderPath("level"));
  if (!spellMechanicsObjectHasOnlyKeys(mechanics, SPATIAL_ROOT_FIELDS)) {
    push("operation", spellMechanicsHeaderPath("family"));
  }
  if (mechanics.school !== "evocation") {
    push("school", spellMechanicsHeaderPath("school"));
  }
  if (
    mechanics.range.kind !== "point" ||
    mechanics.range.feet !== 60 ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.range, ["kind", "feet"])
  ) {
    push("range", spellMechanicsHeaderPath("range"));
  }
  if (rangeFeet === undefined) {
    push("range", spellMechanicsHeaderPath("range"));
  }
  if (
    mechanics.components.v !== true ||
    mechanics.components.s !== true ||
    mechanics.components.m !== false ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.components, ["v", "s", "m"])
  ) {
    push("components", spellMechanicsHeaderPath("components"));
  }
  if (!durationValid) {
    push("duration", spellMechanicsHeaderPath("duration"));
    for (const path of spellDurationValueEvidencePaths(mechanics.duration)) {
      push("durationValue", path);
    }
    for (const child of spellDurationChildCoordinates(mechanics.duration)) {
      push(spellDurationChildFailedFact(child), spellDurationChildPath(child));
    }
  }
  if (
    mechanics.castingTime.kind !== "bonus_action" ||
    mechanics.castingTime.trigger !== undefined ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.castingTime,
      SPATIAL_CASTING_TIME_FIELDS,
    )
  ) {
    push("castingTime", spellMechanicsHeaderPath("castingTime"));
  }
  if (!forceAttachment) {
    push("attachment", spellOngoingAttachmentPath());
  }
  if (!initialAttackValid) {
    push("initialPhase", spellOngoingInitialPhasePath());
    push("initialAttack", spellOngoingInitialPhasePath());
  }
  if (!initialDamageValid) {
    push("initialDamage", spellOngoingInitialPhasePath());
  }
  if (!isSupportedSpatialMeleeSpellAttackProxyMissEffect(initialMiss)) {
    push("initialMiss", spellOngoingInitialPhasePath());
  }
  if (mechanics.operations.length !== 1) {
    for (const [index] of mechanics.operations.entries()) {
      if (index === operationIndex) continue;
      push(
        "operationCount",
        spellOngoingOperationPath(PositiveInteger(index + 1)),
      );
    }
    if (mechanics.operations.length === 0) {
      push("operationCount", spellOngoingOperationPath(PositiveInteger(1)));
    }
  }
  if (!operationValid) {
    push(
      "operation",
      spellOngoingOperationPath(
        PositiveInteger(Math.max(1, operationIndex + 1)),
      ),
    );
    push(
      "operationEffect",
      spellOngoingOperationEffectPath(
        PositiveInteger(Math.max(1, operationIndex + 1)),
      ),
    );
  }
  if (repeatEffects.length !== 2) {
    push(
      "operationEffect",
      spellOngoingOperationEffectPath(
        PositiveInteger(Math.max(1, operationIndex + 1)),
      ),
    );
  }
  if (!spatialMeleeSpellAttackProxyRepositionIsSupported(reposition)) {
    push(
      "repositionEffect",
      spellOngoingOperationEffectPath(
        PositiveInteger(Math.max(1, operationIndex + 1)),
      ),
    );
  }
  if (!repeatAttackValid) {
    push(
      "repeatAttack",
      spellOngoingOperationEffectPath(
        PositiveInteger(Math.max(1, operationIndex + 1)),
      ),
    );
  }
  if (!repeatDamageValid) {
    push(
      "repeatDamage",
      spellOngoingOperationEffectPath(
        PositiveInteger(Math.max(1, operationIndex + 1)),
      ),
    );
  }
  if (!isSupportedSpatialMeleeSpellAttackProxyMissEffect(repeatMiss)) {
    push(
      "repeatMiss",
      spellOngoingOperationEffectPath(
        PositiveInteger(Math.max(1, operationIndex + 1)),
      ),
    );
  }
  if (!damageAmountsCorrelated) {
    push(
      "damageAmount",
      spellOngoingOperationEffectPath(
        PositiveInteger(Math.max(1, operationIndex + 1)),
      ),
    );
  }
  const uniqueIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (uniqueIssues !== undefined) {
    const [first, ...rest] = uniqueIssues.map(
      spatialMeleeSpellAttackProxyIssueResult,
    );
    return { tag: "unsupported", issues: [first, ...rest] };
  }
  if (
    !durationValid ||
    durationValue === undefined ||
    rangeFeet === undefined ||
    forceReachFeet === undefined ||
    repeatMoveMaxFeet === undefined ||
    !forceAttachment ||
    !initialDamageValid ||
    !repeatDamageValid ||
    !damageAmountsCorrelated ||
    !reposition ||
    !spatialMeleeSpellAttackProxyRepositionIsSupported(reposition) ||
    !operationValid ||
    attackKind === undefined ||
    damageType === undefined
  ) {
    return {
      tag: "unsupported",
      issues: [
        spatialMeleeSpellAttackProxyIssueResult({
          failedFact: "initialPhase",
          mechanicsPath: spellOngoingInitialPhasePath(),
        }),
      ],
    };
  }
  const damageAmount = initialDamage?.amount;
  if (damageAmount === undefined) {
    return {
      tag: "unsupported",
      issues: [
        spatialMeleeSpellAttackProxyIssueResult({
          failedFact: "initialDamage",
          mechanicsPath: spellOngoingInitialPhasePath(),
        }),
      ],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    durationValue,
    rangeFeet,
    forceReachFeet,
    repeatMoveMaxFeet,
    damageAmount,
    attackKind,
    damageType,
  } satisfies SpatialMeleeSpellAttackProxyMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "spatialMeleeSpellAttackProxy",
      facts,
      evidence: spatialMeleeSpellAttackProxyMechanicsEvidence(
        mechanics,
        operationIndex,
      ),
      admit: (executionSource, ctx) => [
        ...admitSpatialMeleeSpellAttackProxyAttackProxy(
          executionSource,
          ctx,
          facts,
        ),
        ...admitSpatialMeleeSpellAttackProxyRepeatAttack(executionSource, ctx),
      ],
    },
  };
}

function discoverSpatialMeleeSpellAttackProxyAttackProxyCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<SpatialMeleeSpellAttackProxyAttackProxyInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  return spatialMeleeSpellAttackProxyAttackCandidate(
    state,
    actorId,
    invocation,
  );
}

function discoverSpatialMeleeSpellAttackProxyRepeatAttackCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<SpatialMeleeSpellAttackProxyInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  if (invocation.operation !== "repositionAndAttack") {
    return [];
  }
  if (!ongoingSpellRepeatCastIsAvailable(state, invocation.activeEffect)) {
    return [];
  }
  return spatialMeleeSpellAttackProxyAttackCandidate(
    state,
    actorId,
    invocation,
  );
}

function spatialMeleeSpellAttackProxyAttackCandidate(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<
    | SpatialMeleeSpellAttackProxyAttackProxyInvocation
    | SpatialMeleeSpellAttackProxyRepeatAttackInvocation
  >,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  return targetHole.choices.length === 0
    ? []
    : [
        spellCastCandidate(
          "bonusActionSpell",
          actorId,
          invocation.sourceProcedureRef,
          [spatialMeleeSpellAttackProxyPositionHole(invocation), targetHole],
        ),
      ];
}

function resolveSpatialMeleeSpellAttackProxy(
  input: SpatialMeleeSpellAttackProxyResolveInput,
  executionRegistry: SpellProcedureExecutionRegistry,
): BattleResolutionResult {
  return resolveBonusActionSpellAttackProxyAct(input.input, executionRegistry);
}

const SpatialMeleeSpellAttackProxyAttackProxyInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("spatialMeleeSpellAttackProxy"),
      operation: Schema.Literal("createAndAttack"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("bonusAction"),
      targeting: Schema.Struct({
        kind: Schema.Literal("singleCombatant"),
      }),
      durationTicks: ElapsedTimeTicksSchema,
      rangeFeet: MovementFeet,
      forceReachFeet: MovementFeet,
      repeatMoveMaxFeet: MovementFeet,
      damage: Schema.Struct({
        kind: Schema.Literal("fixedSpellAttackDamage"),
        expr: DiceExprSchema,
        damageType: Schema.Literal("force"),
      }),
      attackKind: Schema.Literal("melee_spell_attack"),
      attackBonus: AttackBonus,
    }),
  );

const SpatialMeleeSpellAttackProxyRepeatAttackInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      procedure: Schema.Literal("spatialMeleeSpellAttackProxy"),
      operation: Schema.Literal("repositionAndAttack"),
      spellRuleFacts: Schema.optionalKey(Schema.Never),
      activeEffectRef: BattleEffectExecutionRef,
      activeEffectSourceProcedureRef: BattleProcedureExecutionRef,
      repeatTargeting: Schema.Union([
        Schema.Struct({ kind: Schema.Literal("unrestricted") }),
        Schema.Struct({
          kind: Schema.Literal("fixedCombatant"),
          combatantId: CombatantId,
        }),
      ]),
    }),
  );
export const spatialMeleeSpellAttackProxyProfile = {
  procedure: "spatialMeleeSpellAttackProxy",
  executionSchema: Schema.Union([
    SpatialMeleeSpellAttackProxyAttackProxyInvocationSchema,
    SpatialMeleeSpellAttackProxyRepeatAttackInvocationSchema,
  ]),
  admitMechanics: admitSpatialMeleeSpellAttackProxyMechanics,
  discoverCastAct: (state, actorId, invocation) =>
    Match.value(invocation).pipe(
      Match.when({ operation: "createAndAttack" }, (createInvocation) =>
        discoverSpatialMeleeSpellAttackProxyAttackProxyCastAct(
          state,
          actorId,
          createInvocation,
        ),
      ),
      Match.when({ operation: "repositionAndAttack" }, (repeatInvocation) =>
        discoverSpatialMeleeSpellAttackProxyRepeatAttackCastAct(
          state,
          actorId,
          repeatInvocation,
        ),
      ),
      Match.exhaustive,
    ),
  resolve: resolveSpatialMeleeSpellAttackProxy,
} satisfies SpellProcedureDeclaration<
  "spatialMeleeSpellAttackProxy",
  SpatialMeleeSpellAttackProxyInvocation
>;
