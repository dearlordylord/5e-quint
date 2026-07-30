import {
  maybeOpenConfiguredSpellCastReactionWindow,
  spendConfiguredSpellCastResources,
} from "../spell-active-effect-resolution.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
import {
  actionSpellCastCandidatesForTargetHole,
  spellCastCandidate,
} from "../spell-cast-candidate.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spell-created-held-object
import { DiceExprSchema } from "@dnd/surface/surface/schema";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SPELL_CREATED_HELD_OBJECT_LIFECYCLE
//
// The spellCreatedHeldObject profile family: a prepared Bonus Action spell
// creates a spell effect held in the caster's free hand, the held object can be
// used for a Magic Action melee Spell Attack, and the same spell effect can be
// re-evoked with a Bonus Action after the caster lets it go.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-E-L.md "Flame Blade":
//     Bonus Action; Self; Concentration up to 10 minutes; evoke a fiery blade
//     in a free hand; disappears when let go; can be evoked again as a Bonus
//     Action; Magic Action melee Spell Attack; Fire damage equal to 3d6 plus
//     spellcasting ability modifier; sheds Bright and Dim Light; higher-level
//     slots add 1d6 damage.
//   - UBIQUITOUS_LANGUAGE.md: Free Hand, Holding / Wielding, Magic Action,
//     Spell Attack, Spell Slot, Spell Invocation, and Spell Effect.
//
// What stays in shared infrastructure:
//   - The active-effect state transitions and light projection stay in
//     spells-active-effects.ts.
//   - The Magic Action spell attack damage lifecycle stays in the shared
//     spell attack resolver because held-light hurls, spell-created held-object
//     attacks, spiritual weapon attacks, object-contact repeats, and ordinary
//     spell attacks share target, attack-roll, damage, reaction, and reduction
//     flow.
//   - The release runtime command remains outside this profile because it is a
//     command over an existing Spell Effect, not a Spell Invocation.

import { spendActivationResource } from "@dnd/shared-algebras/action-economy-algebra";
import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  attackBonus,
  movementFeet,
  type AbilityModifier,
  type ProficiencyBonus as ProficiencyBonusType,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import { DamageTypeSchema } from "@dnd/surface/surface/schema";
import type {
  DiceAmount as SurfaceDiceAmount,
  DiceExpr,
} from "@dnd/surface/surface/types";
import { Either, Schema } from "effect";
import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleFill,
  type BattleResolutionResult,
  type BattleState,
  type SpellCreatedHeldObjectActiveEffect,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { snapshotBattle } from "../interrupt-execution.ts";
import {
  BattleActiveEffectExecutionRef,
  BattleProcedureExecutionRef,
  CombatantId,
} from "../../identity.ts";
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
import { allocateBattleActiveEffectRef } from "../../active-effect/execution-ref.ts";
import { invalidResult } from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { spellCreatedHeldObjectHasFreeHand } from "../spell-created-held-object.ts";
import { spellTargetHole } from "../spells-targeting.ts";
import { resolveSpellAttackDamageAct } from "../spells-resolve.ts";
import type { SpellProcedureExecutionRegistry } from "./execution-registry.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
  SynthesizedSpellProcedureDeclaration,
} from "./profile.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  AttackBonus,
  MovementFeet,
  NoSpellInvocationResourceSchema,
  PreparedSpellAccessSchema,
  SpellEffectSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  applySpellCreatedHeldObjectEffect,
  setSpellCreatedHeldObjectState,
} from "../spells-active-effects.ts";

type SpellCreatedHeldObjectInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "spellCreatedHeldObject" }
>;

const SpellCreatedHeldObjectTemplateSchema = Schema.Struct({
  kind: Schema.Literal("spellCreatedHeldObject"),
  sourceCombatantId: CombatantId,
  objectState: Schema.Struct({ kind: Schema.Literal("held") }),
  light: Schema.Struct({
    brightRadiusFeet: MovementFeet,
    dimAdditionalFeet: MovementFeet,
  }),
  attack: Schema.Struct({
    damage: Schema.Struct({
      expr: DiceExprSchema,
      damageType: DamageTypeSchema,
    }),
    attackKind: Schema.Literal("melee_spell_attack"),
    attackBonus: AttackBonus,
  }),
  expiresAt: Schema.Struct({
    kind: Schema.Literal("concentration"),
    combatantId: CombatantId,
    durationTicks: ElapsedTimeTicksSchema,
  }),
});

type SpellCreatedHeldObjectAttackInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "spellCreatedHeldObjectAttack" }
>;
type SpellCreatedHeldObjectReEvokeInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "spellCreatedHeldObjectReEvoke" }
>;
type OngoingEffectSpellMechanics = Extract<
  BattleSpellAdmissionSource["mechanics"],
  { readonly family: "ongoing_effect" }
>;
type OngoingEffectInitialEffect = NonNullable<
  Extract<
    NonNullable<OngoingEffectSpellMechanics["initialPhase"]>,
    { readonly kind: "direct" }
  >["effects"]
>[number];
type SpellCreatedHeldObjectEffect = Extract<
  OngoingEffectInitialEffect,
  { readonly kind: "spell_created_held_object" }
>;
type SpellCreatedHeldObjectAttackOperation =
  OngoingEffectSpellMechanics["operations"][number] & {
    readonly effect: Extract<
      OngoingEffectSpellMechanics["operations"][number]["effect"],
      { readonly kind: "attack_roll" }
    >;
  };
type SpellCreatedHeldObjectLightOperation =
  OngoingEffectSpellMechanics["operations"][number] & {
    readonly effect: Extract<
      OngoingEffectSpellMechanics["operations"][number]["effect"],
      { readonly kind: "emit_light" }
    >;
  };

type SpellCreatedHeldObjectResolveInput =
  SpellProcedureProfileResolveInput<SpellCreatedHeldObjectInvocation>;
type SpellCreatedHeldObjectAttackResolveInput =
  SpellProcedureProfileResolveInput<SpellCreatedHeldObjectAttackInvocation>;
type SpellCreatedHeldObjectReEvokeResolveInput =
  SpellProcedureProfileResolveInput<SpellCreatedHeldObjectReEvokeInvocation>;

function admitSpellCreatedHeldObject(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly SpellCreatedHeldObjectInvocation[] {
  const spellcasting = ctx.actor.origin.spellcasting;
  return spellcasting.spellSlots.flatMap(
    (slot): readonly SpellCreatedHeldObjectInvocation[] => {
      if (Number(slot.spellLevel) < spell.mechanics.level) {
        return [];
      }
      const activeEffect = spellCreatedHeldObjectActiveEffectProjection({
        actorId: ctx.actor.combatantId,
        spell,
        slotLevel: slot.spellLevel,
        spellcastingAbilityModifier: spellcasting.spellcastingAbilityModifier,
        proficiencyBonus: spellcasting.proficiencyBonus,
      });
      return activeEffect === null
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
              procedure: "spellCreatedHeldObject",
              spell,
              actionCost: "bonusAction",
              activeEffect,
            },
          ];
    },
  );
}

function spellCreatedHeldObjectActiveEffectProjection(input: {
  readonly actorId: CombatantId;
  readonly spell: BattleSpellAdmissionSource;
  readonly slotLevel: SpellSlotLevel;
  readonly spellcastingAbilityModifier: AbilityModifier;
  readonly proficiencyBonus: ProficiencyBonusType;
}):
  | (Omit<
      SpellCreatedHeldObjectActiveEffect,
      "effectRef" | "sourceProcedureRef"
    > & {
      readonly objectState: { readonly kind: "held" };
    })
  | null {
  const spell = input.spell;
  if (spell.mechanics.family !== "ongoing_effect") {
    return null;
  }
  const mechanics = spell.mechanics;
  const initialPhase = mechanics.initialPhase;
  if (
    mechanics.castingTime.kind !== "bonus_action" ||
    mechanics.range.kind !== "self" ||
    mechanics.attachment.kind !== "self" ||
    mechanics.duration.kind !== "concentration" ||
    initialPhase?.kind !== "direct" ||
    initialPhase.attachment.kind !== "self" ||
    initialPhase.effects === undefined
  ) {
    return null;
  }
  const heldObjectEffects = initialPhase.effects.filter(
    (effect) => effect.kind === "spell_created_held_object",
  );
  const lightOperations = mechanics.operations.filter(
    (operation): operation is SpellCreatedHeldObjectLightOperation =>
      operation.trigger.kind === "passive" &&
      operation.predicate?.kind === "spell_created_held_object_active" &&
      operation.effect.kind === "emit_light",
  );
  const attackOperations = mechanics.operations.filter(
    (operation): operation is SpellCreatedHeldObjectAttackOperation =>
      operation.trigger.kind === "on_caster_spends_action" &&
      operation.trigger.cost?.kind === "standard_action" &&
      operation.trigger.cost.action === "magic" &&
      operation.predicate?.kind === "spell_created_held_object_active" &&
      operation.effect.kind === "attack_roll",
  );
  const heldObject = heldObjectEffects[0];
  const lightOperation = lightOperations[0];
  const attackOperation = attackOperations[0];
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    mechanics.duration.upTo,
  );
  if (
    initialPhase.effects.length !== 1 ||
    heldObjectEffects.length !== 1 ||
    mechanics.operations.length !== 2 ||
    lightOperations.length !== 1 ||
    attackOperations.length !== 1 ||
    heldObject?.kind !== "spell_created_held_object" ||
    !spellCreatedHeldObjectLifecycleIsSupported(heldObject) ||
    lightOperation?.effect.kind !== "emit_light" ||
    lightOperation.effect.brightRadiusFeet === undefined ||
    lightOperation.effect.dimAdditionalFeet === undefined ||
    attackOperation === undefined ||
    Either.isLeft(durationTicks)
  ) {
    return null;
  }
  const damageEffect = attackOperation.effect.onHit[0];
  const missEffect = attackOperation.effect.onMiss[0];
  if (
    attackOperation.effect.attackKind !== "melee_spell_attack" ||
    attackOperation.effect.onHit.length !== 1 ||
    damageEffect?.kind !== "damage" ||
    damageEffect.amount === undefined ||
    !Schema.is(DamageTypeSchema)(damageEffect.damageType) ||
    attackOperation.effect.onMiss.length !== 1 ||
    missEffect?.kind !== "none"
  ) {
    return null;
  }
  const damageExpr = spellCreatedHeldObjectDamageExpr(
    damageEffect.amount,
    mechanics.level,
    input.slotLevel,
    input.spellcastingAbilityModifier,
  );
  if (damageExpr === null) {
    return null;
  }
  return {
    kind: "spellCreatedHeldObject",
    sourceCombatantId: input.actorId,
    objectState: { kind: "held" },
    light: {
      brightRadiusFeet: movementFeet(lightOperation.effect.brightRadiusFeet),
      dimAdditionalFeet: movementFeet(lightOperation.effect.dimAdditionalFeet),
    },
    attack: {
      damage: {
        expr: damageExpr,
        damageType: damageEffect.damageType,
      },
      attackKind: attackOperation.effect.attackKind,
      attackBonus: attackBonus(
        Number(input.spellcastingAbilityModifier) +
          Number(input.proficiencyBonus),
      ),
    },
    expiresAt: {
      kind: "concentration",
      combatantId: input.actorId,
      durationTicks: durationTicks.right,
    },
  };
}

function spellCreatedHeldObjectLifecycleIsSupported(
  effect: SpellCreatedHeldObjectEffect,
): boolean {
  return (
    effect.heldBy === "caster" &&
    sameStringSet(effect.requirements, ["free_hand"]) &&
    sameStringSet(effect.disappearsWhen, ["caster_lets_go"]) &&
    effect.reEvoke.cost.kind === "bonus_action" &&
    sameStringSet(effect.reEvoke.requirements, ["free_hand"])
  );
}

function spellCreatedHeldObjectDamageExpr(
  amount: SurfaceDiceAmount,
  spellLevel: number,
  slotLevel: SpellSlotLevel,
  spellcastingAbilityModifier: AbilityModifier,
): DiceExpr | null {
  if (
    amount.kind !== "linear_per_level" ||
    amount.axis !== "slot" ||
    amount.startingAtLevel !== spellLevel ||
    amount.base.dieSize === undefined ||
    amount.base.spellcastingMod !== true ||
    amount.base.abilityModifier !== undefined ||
    amount.perLevel?.dieSize !== amount.base.dieSize
  ) {
    return null;
  }
  const slotDelta = Math.max(0, Number(slotLevel) - amount.startingAtLevel);
  return {
    dice: amount.base.dice + (amount.perLevel?.dice ?? 0) * slotDelta,
    dieSize: amount.base.dieSize,
    flat:
      (amount.base.flat ?? 0) +
      (amount.perLevel?.flat ?? 0) * slotDelta +
      Number(spellcastingAbilityModifier),
  };
}

function discoverSpellCreatedHeldObjectCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: import("../../battle-state-execution.ts").BattleExecutableSpellInvocation<SpellCreatedHeldObjectInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  if (!spellCreatedHeldObjectHasFreeHand(state, actorId)) {
    return [];
  }
  return [
    spellCastCandidate(
      "bonusActionSpell",
      actorId,
      invocation.sourceProcedureRef,
      [],
    ),
  ];
}

function discoverSpellCreatedHeldObjectAttackCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<SpellCreatedHeldObjectAttackInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const effect = state.combatants
    .get(actorId)
    ?.activeEffects.find(
      (candidate): candidate is SpellCreatedHeldObjectActiveEffect =>
        candidate.kind === "spellCreatedHeldObject" &&
        candidate.effectRef === invocation.sourceEffectRef &&
        candidate.sourceProcedureRef ===
          invocation.sourceHeldObjectProcedureRef &&
        candidate.sourceCombatantId === actorId,
    );
  if (effect?.objectState.kind !== "held") return [];
  const targetHole = spellTargetHole(state, actorId, invocation);
  return actionSpellCastCandidatesForTargetHole(
    actorId,
    invocation.sourceProcedureRef,
    targetHole,
  );
}

function discoverSpellCreatedHeldObjectReEvokeCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: import("../../battle-state-execution.ts").BattleExecutableSpellInvocation<SpellCreatedHeldObjectReEvokeInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  if (!spellCreatedHeldObjectHasFreeHand(state, actorId)) {
    return [];
  }
  const effect = state.combatants
    .get(actorId)
    ?.activeEffects.find(
      (candidate): candidate is SpellCreatedHeldObjectActiveEffect =>
        candidate.kind === "spellCreatedHeldObject" &&
        candidate.effectRef === invocation.sourceEffectRef &&
        candidate.sourceProcedureRef ===
          invocation.sourceHeldObjectProcedureRef &&
        candidate.sourceCombatantId === actorId,
    );
  if (effect?.objectState.kind !== "notHeld") return [];
  return [
    spellCastCandidate(
      "bonusActionSpell",
      actorId,
      invocation.sourceProcedureRef,
      [],
    ),
  ];
}

function resolveSpellCreatedHeldObject(
  input: SpellCreatedHeldObjectResolveInput,
): BattleResolutionResult {
  const handStateError = spellCreatedHeldObjectHandStateError(
    input.input.state,
    input.actorId,
    input.input.fills,
    {
      allowSpellCastReactionFacts: true,
      unrelatedFillsMessage:
        "Spell-created held object creation only accepts spell-cast Reaction facts.",
    },
  );
  if (handStateError !== null) {
    return invalidResult(
      input.input.state,
      handStateError.reason,
      handStateError.message,
    );
  }
  const resolution = { ...input, actionCostOverride: "bonusAction" as const };
  const spellCastReactionWindow = maybeOpenConfiguredSpellCastReactionWindow({
    resolution,
    targetIds: [input.actorId],
  });
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }
  const resourced = spendConfiguredSpellCastResources({
    resolution,
    state: input.input.state,
  });
  /* v8 ignore start -- The dispatcher rechecks the stored Bonus Action subject against current turn and slot resources before invoking this profile; this fallback preserves the shared resource-spender contract. */
  if (resourced.tag === "invalid") {
    return resourced;
  }
  /* v8 ignore stop */
  const allocation = allocateBattleActiveEffectRef({
    state: resourced.state,
    ownerId: input.actorId,
  });
  /* v8 ignore start -- Resource spending cannot remove combatants, and dispatcher admission established this actor immediately before resolution; allocation retains a typed failure for callers without that proof. */
  if (allocation.tag === "ownerNotFound") {
    return invalidResult(
      resourced.state,
      "staleSubject",
      "Held-object effect owner is no longer in the battle.",
    );
  }
  /* v8 ignore stop */
  const effected = applySpellCreatedHeldObjectEffect({
    state: allocation.state,
    actorId: input.actorId,
    activeEffect: {
      ...input.invocation.activeEffect,
      sourceProcedureRef: input.input.subject.procedureRef,
      effectRef: allocation.effectRef,
    },
    sourceExecution: input.invocation,
  });
  /* v8 ignore start -- The hand-state check above proves the actor and free hand, while this admitted spell procedure proves a character owner; resource spending and effect-ref allocation preserve all three facts. */
  if (effected.tag === "invalid") {
    return invalidResult(input.input.state, "staleSubject", effected.message);
  }
  /* v8 ignore stop */
  return {
    tag: "resolved",
    state: effected.state,
    snapshot: snapshotBattle(effected.state),
  };
}

function resolveSpellCreatedHeldObjectAttack(
  input: SpellCreatedHeldObjectAttackResolveInput,
  executionRegistry: SpellProcedureExecutionRegistry,
): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fillSet.reactionSpellTargetFacts.length > 0) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell-created held object attacks are not spell casts and do not accept spell-cast Reaction facts.",
    );
  }
  /* v8 ignore stop */
  return resolveSpellAttackDamageAct(input, executionRegistry);
}

function resolveSpellCreatedHeldObjectReEvoke(
  input: SpellCreatedHeldObjectReEvokeResolveInput,
): BattleResolutionResult {
  const handStateError = spellCreatedHeldObjectHandStateError(
    input.input.state,
    input.actorId,
    input.input.fills,
    {
      allowSpellCastReactionFacts: false,
      unrelatedFillsMessage:
        "Spell-created held object re-evocation does not accept fills.",
    },
  );
  if (handStateError !== null) {
    return invalidResult(
      input.input.state,
      handStateError.reason,
      handStateError.message,
    );
  }
  const actor = input.input.state.combatants.get(input.actorId);
  const activeEffect = actor?.activeEffects.find(
    (effect): effect is SpellCreatedHeldObjectActiveEffect =>
      effect.kind === "spellCreatedHeldObject" &&
      effect.effectRef === input.invocation.sourceEffectRef &&
      effect.sourceProcedureRef ===
        input.invocation.sourceHeldObjectProcedureRef &&
      effect.sourceCombatantId === input.actorId,
  );
  if (
    activeEffect === undefined ||
    activeEffect.objectState.kind !== "notHeld"
  ) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Spell-created held object can no longer be re-evoked.",
    );
  }
  const spent = spendActivationResource(
    input.input.state.currentTurnResources,
    {
      kind: "bonusAction",
    },
  );
  /* v8 ignore start -- The dispatcher rechecks the stored Bonus Action subject before invoking this synthesized profile; this fallback keeps direct callers of the action-economy operation total. */
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Bonus Action spell-created held object re-evocation is no longer available.",
    );
  }
  /* v8 ignore stop */
  const reEvoked = setSpellCreatedHeldObjectState({
    state: { ...input.input.state, currentTurnResources: spent.right },
    actorId: input.actorId,
    effect: activeEffect,
    objectState: { kind: "held" },
  });
  /* v8 ignore start -- The checks above prove the actor, matching not-held effect, and free hand that setSpellCreatedHeldObjectState requires; spending a Bonus Action changes none of those facts. */
  if (reEvoked.tag === "invalid") {
    return invalidResult(input.input.state, "staleSubject", reEvoked.message);
  }
  /* v8 ignore stop */
  return {
    tag: "resolved",
    state: reEvoked.state,
    snapshot: snapshotBattle(reEvoked.state),
  };
}

function spellCreatedHeldObjectHandStateError(
  state: BattleState,
  actorId: CombatantId,
  fills: readonly BattleFill[],
  options: {
    readonly allowSpellCastReactionFacts: boolean;
    readonly unrelatedFillsMessage: string;
  },
): {
  readonly reason: "invalidFill" | "staleSubject";
  readonly message: string;
} | null {
  /* v8 ignore start -- Replay validation rejects fills that do not correspond to the discovered cast holes before dispatch reaches this profile. */
  if (
    options.allowSpellCastReactionFacts
      ? !fillsBelongToSpellCastHoles(fills)
      : fills.length > 0
  ) {
    return { reason: "invalidFill", message: options.unrelatedFillsMessage };
  }
  /* v8 ignore stop */
  if (!spellCreatedHeldObjectHasFreeHand(state, actorId)) {
    return {
      reason: "staleSubject",
      message: "Spell-created held object requires a free hand.",
    };
  }
  return null;
}

const SpellCreatedHeldObjectInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("spellCreatedHeldObject"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("bonusAction"),
    activeEffect: SpellCreatedHeldObjectTemplateSchema,
  }),
);

const SpellCreatedHeldObjectAttackInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: SpellEffectSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("spellCreatedHeldObjectAttack"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("singleCombatant"),
      }),
      damage: Schema.Struct({
        expr: DiceExprSchema,
        damageType: DamageTypeSchema,
      }),
      rangeFeet: MovementFeet,
      attackKind: Schema.Literal("melee_spell_attack"),
      attackBonus: AttackBonus,
      sourceEffectRef: BattleActiveEffectExecutionRef,
      sourceHeldObjectProcedureRef: BattleProcedureExecutionRef,
    }),
  );

const SpellCreatedHeldObjectReEvokeInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: SpellEffectSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("spellCreatedHeldObjectReEvoke"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("bonusAction"),
      sourceEffectRef: BattleActiveEffectExecutionRef,
      sourceHeldObjectProcedureRef: BattleProcedureExecutionRef,
    }),
  );
export const spellCreatedHeldObjectProfile: SpellProcedureDeclaration<
  "spellCreatedHeldObject",
  SpellCreatedHeldObjectInvocation
> = {
  procedure: "spellCreatedHeldObject",
  executionSchema: SpellCreatedHeldObjectInvocationSchema,
  admit: admitSpellCreatedHeldObject,
  discoverCastAct: discoverSpellCreatedHeldObjectCastAct,
  resolve: resolveSpellCreatedHeldObject,
};

export const spellCreatedHeldObjectAttackProfile = {
  admission: "synthesized",
  procedure: "spellCreatedHeldObjectAttack",
  executionSchema: SpellCreatedHeldObjectAttackInvocationSchema,
  discoverCastAct: discoverSpellCreatedHeldObjectAttackCastAct,
  resolve: resolveSpellCreatedHeldObjectAttack,
} satisfies SynthesizedSpellProcedureDeclaration<"spellCreatedHeldObjectAttack">;

export const spellCreatedHeldObjectReEvokeProfile = {
  admission: "synthesized",
  procedure: "spellCreatedHeldObjectReEvoke",
  executionSchema: SpellCreatedHeldObjectReEvokeInvocationSchema,
  discoverCastAct: discoverSpellCreatedHeldObjectReEvokeCastAct,
  resolve: resolveSpellCreatedHeldObjectReEvoke,
} satisfies SynthesizedSpellProcedureDeclaration<"spellCreatedHeldObjectReEvoke">;
