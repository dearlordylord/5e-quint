// UNIT-PROFILE-COVERAGE: runtime-owner spell.scalar-buff
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-glyph-stored-concentration-full-duration
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS
//
// The scalarBuff Spell Procedure Profile: prepared spells that grant a scalar
// creature buff such as Temporary Hit Points, Hit Point Maximum increase, Armor
// Class floor/bonus, Speed increase, or special Speed grant, with self or
// target-list targeting and Magic Action or Bonus Action casting.
//
// What lives here:
//   - admit()           - was supportedPreparedScalarBuffSpellProfile in
//                         spells-profiles-support.ts
//   - discoverCastAct() - was the scalarBuff branch in
//                         spells-discovery.ts
//   - castSummary()     - was the scalarBuff branch in
//                         spellInvocationCastSummary
//   - invocationRef()   - was the scalarBuff Match case in
//                         supportedSpellInvocationRef
//   - resolve()         - was resolveScalarBuffSpellAct in
//                         spells-resolve-support-effects.ts
//   - applyEffect()     - was applyScalarBuffSpellEffect in
//                         spells-active-effects.ts
//
// What stays in shared infrastructure:
//   - scalarBuffSpellActionCost / RangeFeet / Targeting / Effect stay in
//     spells-profiles-support.ts because later bonus-action/movement profiles
//     still share those projection helpers.
//   - scalarBuffSpellTargetSelection stays in spells-resolve-target-selection.ts
//     while fill and targeting families remain shared.
//   - spellScalarBuffRollHole and fill validation stay with hole/fill helpers.
//   - The metamagic table entry remains for the Wave 9 cross-cutting cleanup.

import {
  isEffectAtom,
  topLevelSpellCastingTime,
} from "@dnd/surface/surface/types";
import type {
  Attachment,
  EffectAtom,
  OngoingEffect,
  SpellRecord,
} from "@dnd/surface/surface/types";

import type { SpellInvocationRef } from "../../battle-subjects.ts";
import {
  maybeOpenInterruptWindow,
  snapshotBattle,
  type ActionSpellBattleResolutionInput,
  type AvailableBattleAct,
  type BattleFill,
  type BattleResolutionResult,
  type BattleState,
  type BonusActionSpellBattleResolutionInput,
  type HealingSpellActionCost,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import type { SpellMetamagicApplicationFact } from "../metamagic-support.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import { battleCreatureWithSpellActiveEffects } from "../../active-effect/lifecycle.ts";
import {
  applyHitPointMaximumIncrease,
  applyTemporaryHitPoints,
  breakBattleConcentration,
} from "../damage-apply.ts";
import {
  battleStateWithFlySpeedGrantEndFallCleanupFrames,
  flySpeedGrantEndFallCleanupFramesForExpiredEffects,
} from "../fly-speed-grant-end-fall-cleanup.ts";
import { needsHolesResult } from "../hole-helpers.ts";
import { invalidResult } from "../result-helpers.ts";
import { spellCastInterruptFrame } from "../spell-cast-interrupt-frame.ts";
import { scalarBuffTemporaryHitPointsAmount } from "../spell-effects.ts";
import {
  readiedSpellAct,
  spellSubjectTagForInvocation,
  targetListSpellUsesTargetListHole,
} from "../spells-discovery.ts";
import { isScalarBuffTargetListInvocation } from "../spells-invocation-guards.ts";
import {
  spellScalarBuffRollHole,
  validateScalarBuffTemporaryHitPointsFill,
} from "../spells-damage-fills.ts";
import {
  scalarBuffSpellActionCost,
  scalarBuffSpellEffect,
  scalarBuffSpellRangeFeet,
  scalarBuffSpellTargeting,
} from "../spells-profiles-support.ts";
import {
  spellRequiresConcentration,
  spendSpellCastResources,
} from "../spells-resolve-resources.ts";
import { scalarBuffSpellTargetSelection } from "../spells-resolve-target-selection.ts";
import { spellTargetHole, spellTargetListHole } from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
  SpellProcedureStoredGlyphReleaseOptions,
} from "./profile.ts";
import { Schema } from "effect";
import { spellProcedureInvocationSchema } from "./profile.ts";
import {
  BattleRuntimeObjectSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type ScalarBuffInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "scalarBuff" }
>;
type ScalarBuffResolveInput = SpellProcedureProfileResolveInput<
  ScalarBuffInvocation,
  ActionSpellBattleResolutionInput | BonusActionSpellBattleResolutionInput
> & {
  readonly actionCostOverride?: "magicAction" | "bonusAction";
  readonly metamagicApplications?: readonly SpellMetamagicApplicationFact[];
} & SpellProcedureStoredGlyphReleaseOptions;

function admitScalarBuff(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly ScalarBuffInvocation[] {
  const projection = scalarBuffSpellProjection(spell);
  if (projection === null) {
    return [];
  }

  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly ScalarBuffInvocation[] => {
      if (Number(slot.spellLevel) < spell.mechanics.level) {
        return [];
      }
      const targeting = scalarBuffSpellTargeting(
        projection.attachment,
        spell.mechanics.level,
        slot.spellLevel,
      );
      const scalarEffect = scalarBuffSpellEffect(
        ctx.actor.combatantId,
        spell,
        projection.effect,
        projection.duration,
        spell.mechanics.level,
        slot.spellLevel,
      );
      return targeting === null || scalarEffect === null
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
              procedure: "scalarBuff",
              spell,
              actionCost: projection.actionCost,
              targeting,
              effect: scalarEffect,
              rangeFeet: projection.rangeFeet,
            },
          ];
    },
  );
}

function scalarBuffSpellProjection(spell: SpellRecord): {
  readonly actionCost: HealingSpellActionCost;
  readonly rangeFeet: ScalarBuffInvocation["rangeFeet"];
  readonly attachment: Attachment;
  readonly duration: SpellRecord["mechanics"]["duration"];
  readonly effect: EffectAtom | OngoingEffect;
} | null {
  const castingTime = topLevelSpellCastingTime(spell.mechanics);
  const actionCost =
    castingTime === null ? null : scalarBuffSpellActionCost(castingTime);
  const rangeFeet = scalarBuffSpellRangeFeet(spell.mechanics.range);
  if (actionCost === null || rangeFeet === null) {
    return null;
  }

  if (spell.mechanics.family === "activation") {
    const phase = spell.mechanics.phases[0];
    const effect = phase?.kind === "direct" ? phase.effects?.[0] : undefined;
    return spell.mechanics.phases.length !== 1 ||
      phase?.kind !== "direct" ||
      phase.effects?.length !== 1 ||
      effect === undefined ||
      !isEffectAtom(effect)
      ? null
      : {
          actionCost,
          rangeFeet,
          attachment: phase.attachment,
          duration: spell.mechanics.duration,
          effect,
        };
  }

  if (spell.mechanics.family !== "ongoing_effect") {
    return null;
  }

  const operation = spell.mechanics.operations[0];
  return spell.mechanics.initialPhase !== undefined ||
    spell.mechanics.operations.length !== 1 ||
    operation === undefined ||
    operation.trigger.kind !== "passive" ||
    operation.predicate !== undefined ||
    operation.targetLimit !== undefined ||
    operation.usageLimit !== undefined
    ? null
    : {
        actionCost,
        rangeFeet,
        attachment: spell.mechanics.attachment,
        duration: spell.mechanics.duration,
        effect: operation.effect,
      };
}

function discoverScalarBuffCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: ScalarBuffInvocation,
): readonly AvailableBattleAct[] {
  if (invocation.targeting.kind === "self") {
    const castActs = [
      {
        subject: {
          tag: spellSubjectTagForInvocation(invocation),
          actorId,
          invocation: scalarBuffInvocationRef(invocation),
          mode: { tag: "cast" as const },
        },
        label: invocation.spell.name,
        summary: scalarBuffCastSummary(invocation),
        initialHoles: scalarBuffInitialHoles(invocation),
      },
    ];
    return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
  }
  if (!isScalarBuffTargetListInvocation(invocation)) {
    return [];
  }
  const targetHole = targetListSpellUsesTargetListHole(invocation)
    ? spellTargetListHole(state, actorId, invocation)
    : spellTargetHole(state, actorId, invocation);
  const castActs =
    targetHole.choices.length === 0
      ? []
      : [
          {
            subject: {
              tag: spellSubjectTagForInvocation(invocation),
              actorId,
              invocation: scalarBuffInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: scalarBuffCastSummary(invocation),
            initialHoles: [targetHole],
          },
        ];
  return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
}

function scalarBuffInitialHoles(
  invocation: ScalarBuffInvocation,
): readonly ReturnType<typeof spellScalarBuffRollHole>[] {
  return invocation.effect.kind === "temporaryHitPoints"
    ? [spellScalarBuffRollHole(invocation)]
    : [];
}

function scalarBuffInvocationRef(
  invocation: ScalarBuffInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "scalarBuff",
  };
}

function scalarBuffCastSummary(invocation: ScalarBuffInvocation): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function applyScalarBuffEffect(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: ScalarBuffInvocation,
  temporaryHitPointsRoll:
    | Extract<BattleFill, { readonly kind: "rolledDice" }>
    | undefined,
): BattleState {
  const scalarEffect = invocation.effect;
  return targetIds.reduce((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    if (scalarEffect.kind === "temporaryHitPoints") {
      const nextTarget =
        temporaryHitPointsRoll === undefined
          ? target
          : applyTemporaryHitPoints(
              target,
              scalarBuffTemporaryHitPointsAmount(
                invocation,
                temporaryHitPointsRoll,
              ),
            );
      return {
        ...nextState,
        combatants: new Map(nextState.combatants).set(targetId, nextTarget),
      };
    }
    if (scalarEffect.kind === "hitPointMaximumIncrease") {
      const nextTarget = applyHitPointMaximumIncrease(target, {
        ...scalarEffect.activeEffect,
        sourceCombatantId: actorId,
      });
      return {
        ...nextState,
        combatants: new Map(nextState.combatants).set(targetId, nextTarget),
      };
    }
    const replacing = target.activeEffects.filter(
      (effect) =>
        effect.kind === scalarEffect.activeEffect.kind &&
        effect.sourceSpellId === invocation.spell.id,
    );
    const nextTarget = battleCreatureWithSpellActiveEffects(target, [
      ...target.activeEffects.filter((effect) => !replacing.includes(effect)),
      {
        ...scalarEffect.activeEffect,
        sourceCombatantId: actorId,
      },
    ]);
    const applied = {
      ...nextState,
      combatants: new Map(nextState.combatants).set(targetId, nextTarget),
    };
    return battleStateWithFlySpeedGrantEndFallCleanupFrames(
      applied,
      flySpeedGrantEndFallCleanupFramesForExpiredEffects(targetId, replacing),
    );
  }, state);
}

function resolveScalarBuff(
  input: ScalarBuffResolveInput,
): BattleResolutionResult {
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.targetAbilityChoices !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Scalar buff spells use target fills and optional scalar dice roll.",
    );
  }
  const targetSelection = scalarBuffSpellTargetSelection(input);
  if (targetSelection.tag === "needsHoles") {
    return needsHolesResult(input.input.state, input.input.subject, [
      targetSelection.hole,
    ]);
  }
  if (targetSelection.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      targetSelection.message,
    );
  }

  if (input.opensSpellCastReactionWindow !== false) {
    const spellCastReactionWindow = maybeOpenInterruptWindow(
      input.input.state,
      spellCastInterruptFrame({
        casterId: input.actorId,
        invocation: input.invocation,
        targetIds: targetSelection.targetIds,
        reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
        castingResource:
          input.actionCostOverride === "bonusAction" ||
          input.input.subject.tag === "bonusActionSpell"
            ? { kind: "bonusAction" }
            : { kind: "magicAction" },
        continuation: {
          kind: "replay",
          subject: input.input.subject,
          fills: input.input.fills,
        },
      }),
      input.input.handledInterruptTrigger,
    );
    if (spellCastReactionWindow !== null) {
      return spellCastReactionWindow;
    }
  }

  if (
    input.invocation.effect.kind === "temporaryHitPoints" &&
    input.fillSet.healingRoll == null
  ) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellScalarBuffRollHole(input.invocation),
    ]);
  }
  if (
    input.invocation.effect.kind === "temporaryHitPoints" &&
    input.fillSet.healingRoll !== undefined
  ) {
    const validation = validateScalarBuffTemporaryHitPointsFill(
      input.fillSet.healingRoll,
      input.invocation,
    );
    if (validation !== null) {
      return invalidResult(input.input.state, "invalidFill", validation);
    }
  }

  const concentrationBase =
    input.startsOrdinaryConcentration === false
      ? input.input.state
      : spellRequiresConcentration(input.invocation)
        ? breakBattleConcentration(input.input.state, input.actorId)
        : input.input.state;
  const effected = applyScalarBuffEffect(
    concentrationBase,
    input.actorId,
    targetSelection.targetIds,
    input.invocation,
    input.fillSet.healingRoll,
  );
  if (input.spendsCastResources === false) {
    return {
      tag: "resolved",
      state: effected,
      snapshot: snapshotBattle(effected),
    };
  }
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    ...(input.startsOrdinaryConcentration === false
      ? { startConcentration: false }
      : {}),
    ...(input.actionCostOverride === undefined
      ? {}
      : { actionCostOverride: input.actionCostOverride }),
    ...(input.metamagicApplications === undefined
      ? {}
      : { metamagicApplications: input.metamagicApplications }),
  });
  return resourced.tag === "invalid"
    ? resourced
    : {
        tag: "resolved",
        state: resourced.state,
        snapshot: snapshotBattle(resourced.state),
      };
}

const ScalarBuffInvocationSchema = spellProcedureInvocationSchema<
  Extract<SupportedSpellInvocation, { readonly procedure: "scalarBuff" }>
>(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("scalarBuff"),
    spell: BattleRuntimeObjectSchema,
    actionCost: Schema.Literal("magicAction", "bonusAction"),
    targeting: Schema.Union(
      Schema.Struct({
        kind: Schema.Literal("self"),
      }),
      Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Number,
        requiredTargetDisposition: Schema.Literal("unrestricted", "willing"),
      }),
    ),
    effect: Schema.Union(
      Schema.Struct({
        kind: Schema.Literal("temporaryHitPoints"),
        amount: Schema.Struct({
          expr: BattleRuntimeObjectSchema,
        }),
      }),
      Schema.Struct({
        kind: Schema.Literal("activeEffect"),
        activeEffect: BattleRuntimeObjectSchema,
      }),
      Schema.Struct({
        kind: Schema.Literal("hitPointMaximumIncrease"),
        activeEffect: BattleRuntimeObjectSchema,
      }),
    ),
    rangeFeet: MovementFeet,
  }),
);
export const scalarBuffProfile = {
  procedure: "scalarBuff",
  invocationSchema: ScalarBuffInvocationSchema,
  metamagicCompatibility: "bonusActionRewrite",
  targetListInvocation: {
    kind: "byTargetingKind",
    targetingKind: "targetList",
  },
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitScalarBuff,
  discoverCastAct: discoverScalarBuffCastAct,
  castSummary: scalarBuffCastSummary,
  invocationRef: scalarBuffInvocationRef,
  resolve: resolveScalarBuff,
} satisfies SpellProcedureProfile<
  "scalarBuff",
  ScalarBuffInvocation,
  ActionSpellBattleResolutionInput | BonusActionSpellBattleResolutionInput
>;
