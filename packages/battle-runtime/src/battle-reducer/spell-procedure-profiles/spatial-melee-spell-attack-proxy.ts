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
  type SpellSlotLevel,
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
  TargetRelativePosition,
  TargetSelection,
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
const SPATIAL_MELEE_SPELL_ATTACK_PROXY_BASE_SLOT_LEVEL = 2;
const SPATIAL_MELEE_SPELL_ATTACK_PROXY_CAST_RANGE_FEET = 60;
const SPATIAL_MELEE_SPELL_ATTACK_PROXY_FORCE_REACH_FEET = 5;
const SPATIAL_MELEE_SPELL_ATTACK_PROXY_REPEAT_MOVE_MAX_FEET = 20;
const SPATIAL_MELEE_SPELL_ATTACK_PROXY_DAMAGE_DICE = 1;
const SPATIAL_MELEE_SPELL_ATTACK_PROXY_DAMAGE_DIE_SIZE = 8;
type SupportedSpatialMeleeSpellAttackProxyDamageAmount =
  LinearPerLevelDiceAmount & {
    readonly axis: "slot";
    readonly base: DiceExpr & {
      readonly dice: typeof SPATIAL_MELEE_SPELL_ATTACK_PROXY_DAMAGE_DICE;
      readonly dieSize: typeof SPATIAL_MELEE_SPELL_ATTACK_PROXY_DAMAGE_DIE_SIZE;
      readonly flat?: undefined;
      readonly spellcastingMod: true;
      readonly abilityModifier?: undefined;
    };
    readonly perLevel: DiceExprDelta & {
      readonly dice: typeof SPATIAL_MELEE_SPELL_ATTACK_PROXY_DAMAGE_DICE;
      readonly dieSize: typeof SPATIAL_MELEE_SPELL_ATTACK_PROXY_DAMAGE_DIE_SIZE;
      readonly flat?: undefined;
    };
    readonly startingAtLevel: typeof SPATIAL_MELEE_SPELL_ATTACK_PROXY_BASE_SLOT_LEVEL;
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
type SpatialMeleeSpellAttackProxyHoleAttachment = Extract<
  Attachment,
  { readonly kind: "hole" }
>;
type SpatialMeleeSpellAttackProxyLocationAttachmentValue = Extract<
  SpatialMeleeSpellAttackProxyHoleAttachment["value"],
  { readonly kind: "location" }
>;
type SpatialMeleeSpellAttackProxyInitialPhase = Extract<
  NonNullable<SpatialMeleeSpellAttackProxyMechanics["initialPhase"]>,
  { readonly kind: "attack_roll" }
>;
type SpatialMeleeSpellAttackProxyOperation =
  SpatialMeleeSpellAttackProxyMechanics["operations"][number];
type SpatialMeleeSpellAttackProxyRepeatTrigger = Extract<
  SpatialMeleeSpellAttackProxyOperation["trigger"],
  { readonly kind: "bonus_action" }
>;
type SpatialMeleeSpellAttackProxyRepeatCost = NonNullable<
  SpatialMeleeSpellAttackProxyRepeatTrigger["cost"]
>;
type SpatialMeleeSpellAttackProxyCompositeEffect = Extract<
  OngoingEffect,
  { readonly kind: "composite_ongoing" }
>;
type SpatialMeleeSpellAttackProxyRepositionEffect = Extract<
  OngoingEffect,
  { readonly kind: "reposition_attachment" }
>;
type SpatialMeleeSpellAttackProxyRepeatAttack = Extract<
  OngoingEffect,
  { readonly kind: "attack_roll" }
>;
type SpatialMeleeSpellAttackProxyRelativePosition = Extract<
  NonNullable<TargetRelativePosition>,
  { readonly kind: "within_feet_of_attachment" }
>;
type SpatialMeleeSpellAttackProxyTargetSelection = TargetSelection & {
  readonly relativePosition?: TargetRelativePosition;
};
type SpatialMeleeSpellAttackProxyDamageEffect = Extract<
  EffectAtom,
  { readonly kind: "damage" }
>;
type SpatialMeleeSpellAttackProxyNoneEffect = Extract<
  EffectAtom,
  { readonly kind: "none" }
>;
type SpatialMeleeSpellAttackProxyCastingTime = Extract<
  SpatialMeleeSpellAttackProxyMechanics["castingTime"],
  { readonly kind: "bonus_action" }
>;
type SpatialMeleeSpellAttackProxyDuration = Extract<
  SpellMechanics["duration"],
  { readonly kind: "concentration" }
>;
type SpatialMeleeSpellAttackProxyRange = Extract<
  SpellMechanics["range"],
  { readonly kind: "point" }
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- This module-private tuple is the canonical source for SpatialMeleeSpellAttackProxyFailedFact.
const SPATIAL_MELEE_SPELL_ATTACK_PROXY_FAILED_FACTS = [
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
type SpatialMeleeSpellAttackProxySupportedForceAttachment = Extract<
  Attachment,
  { readonly kind: "hole" }
> & {
  readonly value: { readonly kind: "location" };
};
type SpatialMeleeSpellAttackProxyStructureProjection = {
  readonly forceAttachment:
    | SpatialMeleeSpellAttackProxySupportedForceAttachment
    | undefined;
  readonly forceHoleId: SpatialMeleeSpellAttackProxyForceHoleId | undefined;
  readonly initialPhase: SpatialMeleeSpellAttackProxyInitialPhase | undefined;
  readonly operationIndex: number;
  readonly operation: SpatialMeleeSpellAttackProxyOperation | undefined;
  readonly repeatEffects: readonly OngoingEffect[];
  readonly reposition: OngoingEffect | undefined;
  readonly repeatAttack: OngoingEffect | undefined;
  readonly initialHit: EffectAtom | undefined;
  readonly initialMiss: EffectAtom | undefined;
  readonly repeatHit: EffectAtom | undefined;
  readonly repeatMiss: EffectAtom | undefined;
};
type SpatialMeleeSpellAttackProxyRepeatStructureProjection = Pick<
  SpatialMeleeSpellAttackProxyStructureProjection,
  "repeatEffects" | "reposition" | "repeatAttack" | "repeatHit" | "repeatMiss"
>;
type SpatialMeleeSpellAttackProxyDefinitionProjection = {
  readonly durationValid: boolean;
  readonly durationValue: SpellCanonicalDurationValue | undefined;
  readonly rangeFeet: MovementFeet | undefined;
};
type SpatialMeleeSpellAttackProxySemanticProjection = {
  readonly initialAttackValid: boolean;
  readonly repeatAttackValid: boolean;
  readonly initialDamageValid: boolean;
  readonly repeatDamageValid: boolean;
  readonly initialDamage:
    | SupportedSpatialMeleeSpellAttackProxyDamageEffect
    | undefined;
  readonly repeatDamage:
    | SupportedSpatialMeleeSpellAttackProxyDamageEffect
    | undefined;
  readonly attackKind: "melee_spell_attack" | undefined;
  readonly damageType: Extract<DamageType, "force"> | undefined;
  readonly damageAmountsCorrelated: boolean;
  readonly forceReachFeet: MovementFeet | undefined;
  readonly repositionValid: boolean;
  readonly repeatMoveMaxFeet: MovementFeet | undefined;
  readonly operationValid: boolean;
};
type SpatialMeleeSpellAttackProxyAdmissionProjection =
  SpatialMeleeSpellAttackProxyStructureProjection &
    SpatialMeleeSpellAttackProxyDefinitionProjection &
    SpatialMeleeSpellAttackProxySemanticProjection;
type SpatialMeleeSpellAttackProxyCompleteProjection =
  SpatialMeleeSpellAttackProxyAdmissionProjection & {
    readonly durationValue: SpellCanonicalDurationValue;
    readonly rangeFeet: MovementFeet;
    readonly forceReachFeet: MovementFeet;
    readonly repeatMoveMaxFeet: MovementFeet;
    readonly forceAttachment: SpatialMeleeSpellAttackProxySupportedForceAttachment;
    readonly initialDamageValid: true;
    readonly repeatDamageValid: true;
    readonly damageAmountsCorrelated: true;
    readonly reposition: SpatialMeleeSpellAttackProxyRepositionEffect;
    readonly repositionValid: true;
    readonly operationValid: true;
    readonly attackKind: "melee_spell_attack";
    readonly damageType: Extract<DamageType, "force">;
  };

const SPATIAL_ONGOING_ATTACHMENT_FIELDS = [
  "kind",
  "holeId",
  "label",
  "value",
] as const satisfies ReadonlyArray<
  keyof SpatialMeleeSpellAttackProxyHoleAttachment
>;
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
] as const satisfies ReadonlyArray<keyof SpatialMeleeSpellAttackProxyMechanics>;
const SPATIAL_LOCATION_VALUE_FIELDS = [
  "kind",
  "description",
] as const satisfies ReadonlyArray<
  keyof SpatialMeleeSpellAttackProxyLocationAttachmentValue
>;
const SPATIAL_INITIAL_PHASE_FIELDS = [
  "kind",
  "attachment",
  "attackKind",
  "onHit",
  "onMiss",
  "continue",
] as const satisfies ReadonlyArray<
  keyof SpatialMeleeSpellAttackProxyInitialPhase
>;
const SPATIAL_CASTING_TIME_FIELDS = ["kind"] as const satisfies ReadonlyArray<
  keyof SpatialMeleeSpellAttackProxyCastingTime
>;
const SPATIAL_DURATION_FIELDS = [
  "kind",
  "upTo",
  "earlyEnd",
  "permanentIfMaintainedFull",
] as const satisfies ReadonlyArray<keyof SpatialMeleeSpellAttackProxyDuration>;
const SPATIAL_DURATION_VALUE_FIELDS = [
  "unit",
  "amount",
  "upcastTiers",
] as const satisfies ReadonlyArray<
  keyof SpatialMeleeSpellAttackProxyDuration["upTo"]
>;
const SPATIAL_RANGE_FIELDS = ["kind", "feet"] as const satisfies ReadonlyArray<
  keyof SpatialMeleeSpellAttackProxyRange
>;
const SPATIAL_COMPONENT_FIELDS = [
  "v",
  "s",
  "m",
] as const satisfies ReadonlyArray<keyof SpellMechanics["components"]>;
const SPATIAL_REPEAT_OPERATION_FIELDS = [
  "trigger",
  "predicate",
  "targetLimit",
  "effect",
  "usageLimit",
] as const satisfies ReadonlyArray<keyof SpatialMeleeSpellAttackProxyOperation>;
const SPATIAL_REPEAT_TRIGGER_FIELDS = [
  "kind",
  "cost",
  "laterTurnsOnly",
] as const satisfies ReadonlyArray<
  keyof SpatialMeleeSpellAttackProxyRepeatTrigger
>;
const SPATIAL_REPEAT_COST_FIELDS = ["kind"] as const satisfies ReadonlyArray<
  keyof SpatialMeleeSpellAttackProxyRepeatCost
>;
const SPATIAL_COMPOSITE_EFFECT_FIELDS = [
  "kind",
  "effects",
] as const satisfies ReadonlyArray<
  keyof SpatialMeleeSpellAttackProxyCompositeEffect
>;
const SPATIAL_REPOSITION_FIELDS = [
  "kind",
  "maxMoveFeet",
  "destination",
] as const satisfies ReadonlyArray<
  keyof SpatialMeleeSpellAttackProxyRepositionEffect
>;
const SPATIAL_ATTACK_PHASE_FIELDS = [
  "kind",
  "attachment",
  "attackKind",
  "onHit",
  "onMiss",
] as const satisfies ReadonlyArray<
  keyof SpatialMeleeSpellAttackProxyRepeatAttack
>;
const SPATIAL_TARGET_SELECTION_FIELDS = [
  "mode",
  "targetKinds",
  "relativePosition",
] as const satisfies ReadonlyArray<
  keyof SpatialMeleeSpellAttackProxyTargetSelection
>;
const SPATIAL_RELATIVE_POSITION_FIELDS = [
  "kind",
  "attachmentHoleId",
  "feet",
] as const satisfies ReadonlyArray<
  keyof SpatialMeleeSpellAttackProxyRelativePosition
>;
const SPATIAL_DAMAGE_EFFECT_FIELDS = [
  "kind",
  "damageType",
  "amount",
  "timing",
] as const satisfies ReadonlyArray<
  keyof SpatialMeleeSpellAttackProxyDamageEffect
>;
const SPATIAL_NONE_EFFECT_FIELDS = ["kind"] as const satisfies ReadonlyArray<
  keyof SpatialMeleeSpellAttackProxyNoneEffect
>;
const SPATIAL_DAMAGE_AMOUNT_FIELDS = [
  "kind",
  "axis",
  "base",
  "perLevel",
  "startingAtLevel",
] as const satisfies ReadonlyArray<keyof LinearPerLevelDiceAmount>;
const SPATIAL_BASE_EXPR_FIELDS = [
  "dice",
  "dieSize",
  "flat",
  "spellcastingMod",
  "abilityModifier",
] as const satisfies ReadonlyArray<keyof DiceExpr>;
const SPATIAL_DELTA_EXPR_FIELDS = [
  "dice",
  "dieSize",
  "flat",
] as const satisfies ReadonlyArray<keyof DiceExprDelta>;
type SpatialMeleeSpellAttackProxyForceHoleId = Extract<
  Attachment,
  { readonly kind: "hole" }
>["holeId"];

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
      return [
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
            expr: spatialMeleeSpellAttackProxyDamageExpr(
              facts.damageAmount,
              slot.spellLevel,
              ctx.castingSource.abilityModifier,
            ),
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

function spatialMeleeSpellAttackProxyDamageExpr(
  amount: SupportedSpatialMeleeSpellAttackProxyDamageAmount,
  slotLevel: SpellSlotLevel,
  spellcastingAbilityModifier: AbilityModifier,
): DiceExpr {
  const slotDelta = Math.max(0, Number(slotLevel) - amount.startingAtLevel);
  return {
    dice: amount.base.dice + amount.perLevel.dice * slotDelta,
    dieSize: amount.base.dieSize,
    flat: Number(spellcastingAbilityModifier),
  };
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
    mechanics.level === SPATIAL_MELEE_SPELL_ATTACK_PROXY_BASE_SLOT_LEVEL &&
    mechanics.castingTime.kind === "bonus_action" &&
    mechanics.range.kind === "point" &&
    mechanics.range.feet === SPATIAL_MELEE_SPELL_ATTACK_PROXY_CAST_RANGE_FEET &&
    mechanics.duration.kind === "concentration"
  );
}

function spatialMeleeSpellAttackProxyForceAttachmentIsSupported(
  attachment: Attachment | undefined,
): attachment is SpatialMeleeSpellAttackProxySupportedForceAttachment {
  return (
    attachment?.kind === "hole" &&
    attachment.value !== undefined &&
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
  if (duration.kind !== "concentration") return false;
  return [
    spellMechanicsObjectHasOnlyKeys(duration, SPATIAL_DURATION_FIELDS) &&
      spellMechanicsObjectHasOnlyKeys(
        duration.upTo,
        SPATIAL_DURATION_VALUE_FIELDS,
      ),
    duration.upTo.unit === "minute",
    duration.upTo.amount === 1,
    isSpellCanonicalDurationValue(duration.upTo),
    duration.upTo.upcastTiers === undefined,
    duration.earlyEnd === undefined,
    duration.permanentIfMaintainedFull === undefined,
  ].every(Boolean);
}

function spatialMeleeSpellAttackProxyAttackPhaseIsSupported(
  phase:
    | Extract<
        SpatialMeleeSpellAttackProxyMechanics["initialPhase"],
        { readonly kind: "attack_roll" }
      >
    | undefined,
  forceHoleId: SpatialMeleeSpellAttackProxyForceHoleId | undefined,
): phase is Extract<
  SpatialMeleeSpellAttackProxyMechanics["initialPhase"],
  { readonly kind: "attack_roll" }
> {
  return (
    phase !== undefined &&
    forceHoleId !== undefined &&
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
  forceHoleId: SpatialMeleeSpellAttackProxyForceHoleId | undefined,
): phase is Extract<OngoingEffect, { readonly kind: "attack_roll" }> {
  return (
    phase !== undefined &&
    forceHoleId !== undefined &&
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
  if (operation === undefined) return false;
  if (operation.trigger.kind !== "on_caster_spends_action") return false;
  if (operation.effect.kind !== "composite_ongoing") return false;
  return [
    spellMechanicsObjectHasOnlyKeys(operation, SPATIAL_REPEAT_OPERATION_FIELDS),
    operation.predicate === undefined,
    operation.targetLimit === undefined,
    operation.usageLimit === undefined,
    spellMechanicsObjectHasOnlyKeys(
      operation.trigger,
      SPATIAL_REPEAT_TRIGGER_FIELDS,
    ),
    spellMechanicsObjectHasOnlyKeys(
      operation.trigger.cost,
      SPATIAL_REPEAT_COST_FIELDS,
    ),
    operation.trigger.cost.kind === "bonus_action",
    operation.trigger.laterTurnsOnly === true,
    spellMechanicsObjectHasOnlyKeys(
      operation.effect,
      SPATIAL_COMPOSITE_EFFECT_FIELDS,
    ),
  ].every(Boolean);
}

function spatialMeleeSpellAttackProxyRepositionIsSupported(
  effect: OngoingEffect | undefined,
): effect is Extract<
  OngoingEffect,
  { readonly kind: "reposition_attachment" }
> & {
  readonly maxMoveFeet: typeof SPATIAL_MELEE_SPELL_ATTACK_PROXY_REPEAT_MOVE_MAX_FEET;
} {
  return (
    effect !== undefined &&
    effect.kind === "reposition_attachment" &&
    spellMechanicsObjectHasOnlyKeys(effect, SPATIAL_REPOSITION_FIELDS) &&
    effect.maxMoveFeet ===
      SPATIAL_MELEE_SPELL_ATTACK_PROXY_REPEAT_MOVE_MAX_FEET &&
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
    amount.startingAtLevel !==
      SPATIAL_MELEE_SPELL_ATTACK_PROXY_BASE_SLOT_LEVEL ||
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
    amount.dice === SPATIAL_MELEE_SPELL_ATTACK_PROXY_DAMAGE_DICE &&
    amount.dieSize === SPATIAL_MELEE_SPELL_ATTACK_PROXY_DAMAGE_DIE_SIZE &&
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
    amount.dice === SPATIAL_MELEE_SPELL_ATTACK_PROXY_DAMAGE_DICE &&
    amount.dieSize === SPATIAL_MELEE_SPELL_ATTACK_PROXY_DAMAGE_DIE_SIZE &&
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
  forceHoleId: SpatialMeleeSpellAttackProxyForceHoleId | undefined,
): boolean {
  return (
    spatialMeleeSpellAttackProxyForceReachFeet(attachment, forceHoleId) !==
    undefined
  );
}

function spatialMeleeSpellAttackProxyRelativePositionFeet(
  relativePosition: SpatialMeleeSpellAttackProxyRelativePosition | undefined,
  forceHoleId: SpatialMeleeSpellAttackProxyForceHoleId,
): MovementFeet | undefined {
  if (relativePosition === undefined) return undefined;
  const supported = [
    spellMechanicsObjectHasOnlyKeys(
      relativePosition,
      SPATIAL_RELATIVE_POSITION_FIELDS,
    ),
    relativePosition.kind === "within_feet_of_attachment",
    relativePosition.attachmentHoleId === forceHoleId,
    relativePosition.feet === SPATIAL_MELEE_SPELL_ATTACK_PROXY_FORCE_REACH_FEET,
  ].every(Boolean);
  return supported ? movementFeet(relativePosition.feet) : undefined;
}

function spatialMeleeSpellAttackProxyTargetIsSupported(
  selection: SpatialMeleeSpellAttackProxyTargetSelection,
): boolean {
  return [
    selection.mode === "one",
    selection.targetKinds !== undefined,
    selection.targetKinds?.length === 1,
    selection.targetKinds?.[0] === "creature",
  ].every(Boolean);
}

function spatialMeleeSpellAttackProxyForceReachFeet(
  attachment: Attachment | undefined,
  forceHoleId: SpatialMeleeSpellAttackProxyForceHoleId | undefined,
): MovementFeet | undefined {
  if (attachment?.kind !== "hole") return undefined;
  if (forceHoleId === undefined) return undefined;
  const admitted = admitSpellTargetAttachment(
    attachment,
    SPATIAL_TARGET_SELECTION_FIELDS,
  );
  if (admitted.tag !== "admitted") return undefined;
  const selection = admitted.attachment.value.selection;
  if (!spatialMeleeSpellAttackProxyTargetIsSupported(selection)) {
    return undefined;
  }
  const relativePosition =
    "relativePosition" in selection ? selection.relativePosition : undefined;
  return spatialMeleeSpellAttackProxyRelativePositionFeet(
    relativePosition,
    forceHoleId,
  );
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

function spatialMeleeSpellAttackProxyInitialAttackPhase(
  phase: SpatialMeleeSpellAttackProxyMechanics["initialPhase"],
): SpatialMeleeSpellAttackProxyInitialPhase | undefined {
  return phase?.kind === "attack_roll" ? phase : undefined;
}

function spatialMeleeSpellAttackProxyOperationAt(
  operations: SpatialMeleeSpellAttackProxyMechanics["operations"],
  index: number,
): SpatialMeleeSpellAttackProxyOperation | undefined {
  return index < 0 ? undefined : operations[index];
}

function spatialMeleeSpellAttackProxyEffectAt(
  effects: readonly OngoingEffect[],
  index: number,
): OngoingEffect | undefined {
  return index < 0 ? undefined : effects[index];
}

function spatialMeleeSpellAttackProxyRepeatAttackPhase(
  effect: OngoingEffect | undefined,
): SpatialMeleeSpellAttackProxyRepeatAttack | undefined {
  return effect?.kind === "attack_roll" ? effect : undefined;
}

function spatialMeleeSpellAttackProxyForceAttachmentOrUndefined(
  attachment: Attachment | undefined,
): SpatialMeleeSpellAttackProxySupportedForceAttachment | undefined {
  return spatialMeleeSpellAttackProxyForceAttachmentIsSupported(attachment)
    ? attachment
    : undefined;
}

function spatialMeleeSpellAttackProxyForceHoleId(
  attachment: SpatialMeleeSpellAttackProxySupportedForceAttachment | undefined,
): SpatialMeleeSpellAttackProxyForceHoleId | undefined {
  return attachment?.holeId;
}

function spatialMeleeSpellAttackProxyOperationProjection(
  operations: SpatialMeleeSpellAttackProxyMechanics["operations"],
): Pick<
  SpatialMeleeSpellAttackProxyStructureProjection,
  "operationIndex" | "operation"
> {
  const operationIndex = operations.findIndex(
    (operation) => operation.effect.kind === "composite_ongoing",
  );
  return {
    operationIndex,
    operation: spatialMeleeSpellAttackProxyOperationAt(
      operations,
      operationIndex,
    ),
  };
}

function spatialMeleeSpellAttackProxyRepeatStructureProjection(
  operation: SpatialMeleeSpellAttackProxyOperation | undefined,
): SpatialMeleeSpellAttackProxyRepeatStructureProjection {
  const repeatEffect =
    operation?.effect.kind === "composite_ongoing"
      ? operation.effect
      : undefined;
  const repeatEffects = repeatEffect?.effects ?? [];
  const reposition = spatialMeleeSpellAttackProxyEffectAt(
    repeatEffects,
    repeatEffects.findIndex(
      (effect) => effect.kind === "reposition_attachment",
    ),
  );
  const repeatAttack = spatialMeleeSpellAttackProxyEffectAt(
    repeatEffects,
    repeatEffects.findIndex((effect) => effect.kind === "attack_roll"),
  );
  const repeatAttackPhase =
    spatialMeleeSpellAttackProxyRepeatAttackPhase(repeatAttack);
  return {
    repeatEffects,
    reposition,
    repeatAttack,
    repeatHit: repeatAttackPhase?.onHit[0],
    repeatMiss: repeatAttackPhase?.onMiss[0],
  };
}

function spatialMeleeSpellAttackProxyInitialEffects(
  initialPhase: SpatialMeleeSpellAttackProxyInitialPhase | undefined,
): Pick<
  SpatialMeleeSpellAttackProxyStructureProjection,
  "initialHit" | "initialMiss"
> {
  return {
    initialHit: initialPhase?.onHit[0],
    initialMiss: initialPhase?.onMiss[0],
  };
}

function spatialMeleeSpellAttackProxyStructureProjection(
  mechanics: SpatialMeleeSpellAttackProxyMechanics,
): SpatialMeleeSpellAttackProxyStructureProjection {
  const forceAttachment =
    spatialMeleeSpellAttackProxyForceAttachmentOrUndefined(
      mechanics.attachment,
    );
  const forceHoleId = spatialMeleeSpellAttackProxyForceHoleId(forceAttachment);
  const initialPhase = spatialMeleeSpellAttackProxyInitialAttackPhase(
    mechanics.initialPhase,
  );
  const { operationIndex, operation } =
    spatialMeleeSpellAttackProxyOperationProjection(mechanics.operations);
  const repeat =
    spatialMeleeSpellAttackProxyRepeatStructureProjection(operation);
  const initial = spatialMeleeSpellAttackProxyInitialEffects(initialPhase);
  return {
    forceAttachment,
    forceHoleId,
    initialPhase,
    operationIndex,
    operation,
    ...repeat,
    ...initial,
  };
}

function spatialMeleeSpellAttackProxyDurationValue(
  duration: SpatialMeleeSpellAttackProxyMechanics["duration"],
): SpellCanonicalDurationValue | undefined {
  return duration.kind === "concentration" &&
    isSpellCanonicalDurationValue(duration.upTo)
    ? duration.upTo
    : undefined;
}

function spatialMeleeSpellAttackProxyDefinitionProjection(
  source: SpellMechanicsAdmissionSource,
  mechanics: SpatialMeleeSpellAttackProxyMechanics,
): SpatialMeleeSpellAttackProxyDefinitionProjection {
  return {
    durationValid: spatialMeleeSpellAttackProxyDurationIsSupported(
      mechanics.duration,
    ),
    durationValue: spatialMeleeSpellAttackProxyDurationValue(
      mechanics.duration,
    ),
    rangeFeet: spellDefinitionPointRangeFeet(
      source.spellDefinitionRuleFacts.range,
    ),
  };
}

function spatialMeleeSpellAttackProxyDamageProjection(
  structure: SpatialMeleeSpellAttackProxyStructureProjection,
): Pick<
  SpatialMeleeSpellAttackProxySemanticProjection,
  | "initialDamageValid"
  | "repeatDamageValid"
  | "initialDamage"
  | "repeatDamage"
  | "damageType"
  | "damageAmountsCorrelated"
> {
  const initialDamage = isSupportedSpatialMeleeSpellAttackProxyDamageEffect(
    structure.initialHit,
  )
    ? structure.initialHit
    : undefined;
  const repeatDamage = isSupportedSpatialMeleeSpellAttackProxyDamageEffect(
    structure.repeatHit,
  )
    ? structure.repeatHit
    : undefined;
  return {
    initialDamageValid: initialDamage !== undefined,
    repeatDamageValid: repeatDamage !== undefined,
    initialDamage,
    repeatDamage,
    damageType: initialDamage?.damageType,
    damageAmountsCorrelated:
      initialDamage !== undefined &&
      repeatDamage !== undefined &&
      sameSpatialMeleeSpellAttackProxyDamageEffect(initialDamage, repeatDamage),
  };
}

function spatialMeleeSpellAttackProxyAttackProjection(
  structure: SpatialMeleeSpellAttackProxyStructureProjection,
): Pick<
  SpatialMeleeSpellAttackProxySemanticProjection,
  "initialAttackValid" | "repeatAttackValid" | "attackKind" | "forceReachFeet"
> {
  const repeatAttackPhase = spatialMeleeSpellAttackProxyRepeatAttackPhase(
    structure.repeatAttack,
  );
  return {
    initialAttackValid: spatialMeleeSpellAttackProxyAttackPhaseIsSupported(
      structure.initialPhase,
      structure.forceHoleId,
    ),
    repeatAttackValid: spatialMeleeSpellAttackProxyRepeatAttackPhaseIsSupported(
      repeatAttackPhase,
      structure.forceHoleId,
    ),
    attackKind:
      structure.initialPhase?.attackKind === "melee_spell_attack"
        ? structure.initialPhase.attackKind
        : undefined,
    forceReachFeet:
      structure.initialPhase === undefined
        ? undefined
        : spatialMeleeSpellAttackProxyForceReachFeet(
            structure.initialPhase.attachment,
            structure.forceHoleId,
          ),
  };
}

function spatialMeleeSpellAttackProxyRepositionProjection(
  structure: SpatialMeleeSpellAttackProxyStructureProjection,
): Pick<
  SpatialMeleeSpellAttackProxySemanticProjection,
  "repositionValid" | "repeatMoveMaxFeet"
> {
  const supportedReposition = spatialMeleeSpellAttackProxyRepositionIsSupported(
    structure.reposition,
  )
    ? structure.reposition
    : undefined;
  return {
    repositionValid: supportedReposition !== undefined,
    repeatMoveMaxFeet:
      supportedReposition === undefined
        ? undefined
        : movementFeet(supportedReposition.maxMoveFeet),
  };
}

function spatialMeleeSpellAttackProxySemanticProjection(
  structure: SpatialMeleeSpellAttackProxyStructureProjection,
): SpatialMeleeSpellAttackProxySemanticProjection {
  const damage = spatialMeleeSpellAttackProxyDamageProjection(structure);
  const attack = spatialMeleeSpellAttackProxyAttackProjection(structure);
  const reposition =
    spatialMeleeSpellAttackProxyRepositionProjection(structure);
  return {
    ...damage,
    ...attack,
    ...reposition,
    operationValid: spatialMeleeSpellAttackProxyOperationIsSupported(
      structure.operation,
    ),
  };
}

function spatialMeleeSpellAttackProxyAdmissionProjection(
  source: SpellMechanicsAdmissionSource,
  mechanics: SpatialMeleeSpellAttackProxyMechanics,
): SpatialMeleeSpellAttackProxyAdmissionProjection {
  const structure = spatialMeleeSpellAttackProxyStructureProjection(mechanics);
  const definition = spatialMeleeSpellAttackProxyDefinitionProjection(
    source,
    mechanics,
  );
  const semantic = spatialMeleeSpellAttackProxySemanticProjection(structure);
  return { ...structure, ...definition, ...semantic };
}

function spatialMeleeSpellAttackProxyIssueIf(
  supported: boolean,
  failedFact: SpatialMeleeSpellAttackProxyFailedFact,
  mechanicsPath: SpellMechanicsBranchPath,
): readonly SpatialMeleeSpellAttackProxyMechanicsIssue[] {
  return supported ? [] : [{ failedFact, mechanicsPath }];
}

function spatialMeleeSpellAttackProxyHeaderIssues(
  mechanics: SpatialMeleeSpellAttackProxyMechanics,
  rangeFeet: MovementFeet | undefined,
): readonly SpatialMeleeSpellAttackProxyMechanicsIssue[] {
  return [
    ...spatialMeleeSpellAttackProxyIssueIf(
      mechanics.level === SPATIAL_MELEE_SPELL_ATTACK_PROXY_BASE_SLOT_LEVEL,
      "level",
      spellMechanicsHeaderPath("level"),
    ),
    ...spatialMeleeSpellAttackProxyIssueIf(
      spellMechanicsObjectHasOnlyKeys(mechanics, SPATIAL_ROOT_FIELDS),
      "operation",
      spellMechanicsHeaderPath("family"),
    ),
    ...spatialMeleeSpellAttackProxyIssueIf(
      mechanics.school === "evocation",
      "school",
      spellMechanicsHeaderPath("school"),
    ),
    ...spatialMeleeSpellAttackProxyIssueIf(
      mechanics.range.kind === "point" &&
        mechanics.range.feet ===
          SPATIAL_MELEE_SPELL_ATTACK_PROXY_CAST_RANGE_FEET &&
        spellMechanicsObjectHasOnlyKeys(mechanics.range, SPATIAL_RANGE_FIELDS),
      "range",
      spellMechanicsHeaderPath("range"),
    ),
    ...spatialMeleeSpellAttackProxyIssueIf(
      rangeFeet !== undefined,
      "range",
      spellMechanicsHeaderPath("range"),
    ),
    ...spatialMeleeSpellAttackProxyIssueIf(
      mechanics.components.v === true &&
        mechanics.components.s === true &&
        mechanics.components.m === false &&
        spellMechanicsObjectHasOnlyKeys(
          mechanics.components,
          SPATIAL_COMPONENT_FIELDS,
        ),
      "components",
      spellMechanicsHeaderPath("components"),
    ),
  ];
}

function spatialMeleeSpellAttackProxyDurationIssues(
  mechanics: SpatialMeleeSpellAttackProxyMechanics,
  durationValid: boolean,
): readonly SpatialMeleeSpellAttackProxyMechanicsIssue[] {
  if (durationValid) return [];
  return [
    {
      failedFact: "duration",
      mechanicsPath: spellMechanicsHeaderPath("duration"),
    },
    ...spellDurationValueEvidencePaths(mechanics.duration).map(
      (mechanicsPath): SpatialMeleeSpellAttackProxyMechanicsIssue => ({
        failedFact: "durationValue",
        mechanicsPath,
      }),
    ),
    ...spellDurationChildCoordinates(mechanics.duration).map(
      (child): SpatialMeleeSpellAttackProxyMechanicsIssue => ({
        failedFact: spellDurationChildFailedFact(child),
        mechanicsPath: spellDurationChildPath(child),
      }),
    ),
  ];
}

function spatialMeleeSpellAttackProxyCastingTimeIsSupported(
  castingTime: SpatialMeleeSpellAttackProxyMechanics["castingTime"],
): boolean {
  return (
    castingTime.kind === "bonus_action" &&
    castingTime.trigger === undefined &&
    spellMechanicsObjectHasOnlyKeys(castingTime, SPATIAL_CASTING_TIME_FIELDS)
  );
}

function spatialMeleeSpellAttackProxyLifecycleIssues(
  mechanics: SpatialMeleeSpellAttackProxyMechanics,
  projection: SpatialMeleeSpellAttackProxyAdmissionProjection,
): readonly SpatialMeleeSpellAttackProxyMechanicsIssue[] {
  return [
    ...spatialMeleeSpellAttackProxyDurationIssues(
      mechanics,
      projection.durationValid,
    ),
    ...spatialMeleeSpellAttackProxyIssueIf(
      spatialMeleeSpellAttackProxyCastingTimeIsSupported(mechanics.castingTime),
      "castingTime",
      spellMechanicsHeaderPath("castingTime"),
    ),
    ...spatialMeleeSpellAttackProxyIssueIf(
      projection.forceAttachment !== undefined,
      "attachment",
      spellOngoingAttachmentPath(),
    ),
  ];
}

function spatialMeleeSpellAttackProxyInitialIssues(
  projection: SpatialMeleeSpellAttackProxyAdmissionProjection,
): readonly SpatialMeleeSpellAttackProxyMechanicsIssue[] {
  const initialPhasePath = spellOngoingInitialPhasePath();
  return [
    ...spatialMeleeSpellAttackProxyIssueIf(
      projection.initialAttackValid,
      "initialPhase",
      initialPhasePath,
    ),
    ...spatialMeleeSpellAttackProxyIssueIf(
      projection.initialAttackValid,
      "initialAttack",
      initialPhasePath,
    ),
    ...spatialMeleeSpellAttackProxyIssueIf(
      projection.initialDamageValid,
      "initialDamage",
      initialPhasePath,
    ),
    ...spatialMeleeSpellAttackProxyIssueIf(
      isSupportedSpatialMeleeSpellAttackProxyMissEffect(projection.initialMiss),
      "initialMiss",
      initialPhasePath,
    ),
  ];
}

function spatialMeleeSpellAttackProxyOperationCountIssues(
  operations: SpatialMeleeSpellAttackProxyMechanics["operations"],
  operationIndex: number,
): readonly SpatialMeleeSpellAttackProxyMechanicsIssue[] {
  if (operations.length === 1) return [];
  const extraIssues = operations.flatMap(
    (
      _operation,
      index,
    ): readonly SpatialMeleeSpellAttackProxyMechanicsIssue[] =>
      index === operationIndex
        ? []
        : [
            {
              failedFact: "operationCount",
              mechanicsPath: spellOngoingOperationPath(
                PositiveInteger(index + 1),
              ),
            },
          ],
  );
  return operations.length === 0
    ? [
        {
          failedFact: "operationCount",
          mechanicsPath: spellOngoingOperationPath(PositiveInteger(1)),
        },
      ]
    : extraIssues;
}

function spatialMeleeSpellAttackProxyRepeatIssues(
  projection: SpatialMeleeSpellAttackProxyAdmissionProjection,
): readonly SpatialMeleeSpellAttackProxyMechanicsIssue[] {
  const operationOrdinal = PositiveInteger(
    Math.max(1, projection.operationIndex + 1),
  );
  const operationPath = spellOngoingOperationPath(operationOrdinal);
  const operationEffectPath = spellOngoingOperationEffectPath(operationOrdinal);
  return [
    ...spatialMeleeSpellAttackProxyIssueIf(
      projection.operationValid,
      "operation",
      operationPath,
    ),
    ...spatialMeleeSpellAttackProxyIssueIf(
      projection.operationValid,
      "operationEffect",
      operationEffectPath,
    ),
    ...spatialMeleeSpellAttackProxyIssueIf(
      projection.repeatEffects.length === 2,
      "operationEffect",
      operationEffectPath,
    ),
    ...spatialMeleeSpellAttackProxyIssueIf(
      projection.repositionValid,
      "repositionEffect",
      operationEffectPath,
    ),
    ...spatialMeleeSpellAttackProxyIssueIf(
      projection.repeatAttackValid,
      "repeatAttack",
      operationEffectPath,
    ),
    ...spatialMeleeSpellAttackProxyIssueIf(
      projection.repeatDamageValid,
      "repeatDamage",
      operationEffectPath,
    ),
    ...spatialMeleeSpellAttackProxyIssueIf(
      isSupportedSpatialMeleeSpellAttackProxyMissEffect(projection.repeatMiss),
      "repeatMiss",
      operationEffectPath,
    ),
    ...spatialMeleeSpellAttackProxyIssueIf(
      projection.damageAmountsCorrelated,
      "damageAmount",
      operationEffectPath,
    ),
  ];
}

function spatialMeleeSpellAttackProxyMechanicsIssues(
  mechanics: SpatialMeleeSpellAttackProxyMechanics,
  projection: SpatialMeleeSpellAttackProxyAdmissionProjection,
): readonly SpatialMeleeSpellAttackProxyMechanicsIssue[] {
  return [
    ...spatialMeleeSpellAttackProxyHeaderIssues(
      mechanics,
      projection.rangeFeet,
    ),
    ...spatialMeleeSpellAttackProxyLifecycleIssues(mechanics, projection),
    ...spatialMeleeSpellAttackProxyInitialIssues(projection),
    ...spatialMeleeSpellAttackProxyOperationCountIssues(
      mechanics.operations,
      projection.operationIndex,
    ),
    ...spatialMeleeSpellAttackProxyRepeatIssues(projection),
  ];
}

function spatialMeleeSpellAttackProxyProjectionIsComplete(
  projection: SpatialMeleeSpellAttackProxyAdmissionProjection,
): projection is SpatialMeleeSpellAttackProxyCompleteProjection {
  return [
    projection.durationValid,
    projection.durationValue !== undefined,
    projection.rangeFeet !== undefined,
    projection.forceReachFeet !== undefined,
    projection.repeatMoveMaxFeet !== undefined,
    projection.forceAttachment !== undefined,
    projection.initialDamageValid,
    projection.repeatDamageValid,
    projection.damageAmountsCorrelated,
    projection.reposition !== undefined,
    projection.repositionValid,
    projection.operationValid,
    projection.attackKind !== undefined,
    projection.damageType !== undefined,
  ].every(Boolean);
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
  const projection = spatialMeleeSpellAttackProxyAdmissionProjection(
    source,
    mechanics,
  );
  const issues = spatialMeleeSpellAttackProxyMechanicsIssues(
    mechanics,
    projection,
  );

  const uniqueIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (uniqueIssues !== undefined) {
    const [first, ...rest] = uniqueIssues.map(
      spatialMeleeSpellAttackProxyIssueResult,
    );
    return { tag: "unsupported", issues: [first, ...rest] };
  }
  if (!spatialMeleeSpellAttackProxyProjectionIsComplete(projection)) {
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
  const damageAmount = projection.initialDamage?.amount;
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
    durationValue: projection.durationValue,
    rangeFeet: projection.rangeFeet,
    forceReachFeet: projection.forceReachFeet,
    repeatMoveMaxFeet: projection.repeatMoveMaxFeet,
    damageAmount,
    attackKind: projection.attackKind,
    damageType: projection.damageType,
  } satisfies SpatialMeleeSpellAttackProxyMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "spatialMeleeSpellAttackProxy",
      facts,
      evidence: spatialMeleeSpellAttackProxyMechanicsEvidence(
        mechanics,
        projection.operationIndex,
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
