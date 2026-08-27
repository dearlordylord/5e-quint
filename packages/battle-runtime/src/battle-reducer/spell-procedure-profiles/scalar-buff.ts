import { optionalProperty } from "../../optional-property.ts";
import {
  completeSpellActiveEffectCast,
  maybeOpenConfiguredSpellCastReactionWindow,
} from "../spell-active-effect-resolution.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.scalar-buff
import { DiceExprSchema } from "@dnd/surface/surface/schema";
import { ArmorClassSchema } from "@dnd/shared-algebras/armor-class-algebra";
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
} from "@dnd/surface/surface/types";
import { BATTLE_SPECIAL_SPEED_KINDS } from "../../battle-subjects.ts";
import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type HealingSpellActionCost,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { CombatantId } from "../../identity.ts";
import { BattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
import { battleCreatureWithSpellActiveEffects } from "../../active-effect/lifecycle.ts";
import {
  applyHitPointMaximumIncrease,
  applyTemporaryHitPoints,
} from "../damage-apply.ts";
import {
  battleStateWithFlySpeedGrantEndFallCleanupFrames,
  flySpeedGrantEndFallCleanupFramesForExpiredEffects,
} from "../fly-speed-grant-end-fall-cleanup.ts";
import {
  needsHolesResult,
  spellSelectionResolution,
} from "../needs-holes-result.ts";
import { invalidResult } from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { ATTACK_TARGET_HOLE_ID } from "../battle-runtime-protocol.ts";
import { scalarBuffTemporaryHitPointsAmount } from "../spell-effects.ts";
import {
  readiedSpellAct,
  spellCastSelectionSubject,
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
import { scalarBuffSpellTargetSelection } from "../spells-resolve-target-selection.ts";
import {
  spellTargetHole,
  spellTargetListHole,
  spellTargetListHoleId,
} from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  MovementDeltaFeet,
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import { discoverSubtleSpellMetamagicSelections } from "../metamagic.ts";

type ScalarBuffInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "scalarBuff" }
>;

const ScalarBuffActiveEffectTemplateSchema = Schema.Union([
  Schema.Struct({
    sourceCombatantId: CombatantId,
    kind: Schema.Literal("speedDelta"),
    deltaFeet: MovementDeltaFeet,
    expiresAt: BattleActiveEffectExpirationSchema,
  }),
  Schema.Struct({
    sourceCombatantId: CombatantId,
    kind: Schema.Literal("specialSpeedGrant"),
    speedKind: Schema.Literals([
      BATTLE_SPECIAL_SPEED_KINDS[0],
      BATTLE_SPECIAL_SPEED_KINDS[1],
    ]),
    speed: Schema.Struct({ kind: Schema.Literal("equalToSpeed") }),
    hover: Schema.Literal(false),
    expiresAt: BattleActiveEffectExpirationSchema,
  }),
  Schema.Struct({
    sourceCombatantId: CombatantId,
    kind: Schema.Literal("specialSpeedGrant"),
    speedKind: Schema.Literal(BATTLE_SPECIAL_SPEED_KINDS[2]),
    speed: Schema.Struct({
      kind: Schema.Literal("fixed"),
      speedFeet: MovementFeet,
    }),
    hover: Schema.Literal(true),
    expiresAt: BattleActiveEffectExpirationSchema,
  }),
  Schema.Struct({
    sourceCombatantId: CombatantId,
    kind: Schema.Literal("spellArmorClassBonus"),
    bonus: Schema.Number,
    negatesRepeatedDamageAllocation: Schema.Boolean,
    expiresAt: BattleActiveEffectExpirationSchema,
  }),
  Schema.Struct({
    sourceCombatantId: CombatantId,
    kind: Schema.Literal("spellArmorClassFloor"),
    floor: ArmorClassSchema,
    expiresAt: BattleActiveEffectExpirationSchema,
  }),
]);

const HitPointMaximumIncreaseTemplateSchema = Schema.Struct({
  sourceCombatantId: CombatantId,
  kind: Schema.Literal("hitPointMaximumIncrease"),
  amount: Schema.Number,
  expiresAt: BattleActiveEffectExpirationSchema,
});
type ScalarBuffResolveInput =
  SpellProcedureProfileResolveInput<ScalarBuffInvocation>;

function admitScalarBuff(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly ScalarBuffInvocation[] {
  const projection = scalarBuffSpellProjection(spell);
  if (projection === null) {
    return [];
  }

  return ctx.spellCastOptions.flatMap(
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
              resource: spellInvocationResourceForCastOption(slot),
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

function scalarBuffSpellProjection(spell: BattleSpellAdmissionSource): {
  readonly actionCost: HealingSpellActionCost;
  readonly rangeFeet: ScalarBuffInvocation["rangeFeet"];
  readonly attachment: Attachment;
  readonly duration: BattleSpellAdmissionSource["mechanics"]["duration"];
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
  invocation: BattleExecutableSpellInvocation<ScalarBuffInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  if (invocation.targeting.kind === "self") {
    const initialHoles = scalarBuffInitialHoles(invocation);
    const castActs = [
      {
        subject: spellCastSelectionSubject(actorId, invocation),
        initialHoles,
      },
      ...scalarBuffSubtleMetamagicCastActs({
        state,
        actorId,
        invocation,
        initialHoles,
      }),
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
            subject: spellCastSelectionSubject(actorId, invocation),
            initialHoles: [targetHole],
          },
          ...scalarBuffSubtleMetamagicCastActs({
            state,
            actorId,
            invocation,
            initialHoles: [targetHole],
          }),
        ];
  return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
}

function scalarBuffSubtleMetamagicCastActs(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation<
    import("../../battle-state-execution.ts").BattleExecutableSpellInvocation<ScalarBuffInvocation>
  >;
  readonly initialHoles: readonly BattleHole[];
}): readonly BattleActDiscoveryCandidate[] {
  const subject = spellCastSelectionSubject(input.actorId, input.invocation);
  return discoverSubtleSpellMetamagicSelections({
    actor: input.state.combatants.get(input.actorId),
    invocation: input.invocation,
    subject,
  }).map((metamagic) => {
    return {
      subject: {
        ...subject,
        metamagic,
      },
      initialHoles: input.initialHoles,
    };
  });
}

function scalarBuffInitialHoles(
  invocation: BattleExecutableSpellInvocation<ScalarBuffInvocation>,
): readonly ReturnType<typeof spellScalarBuffRollHole>[] {
  return invocation.effect.kind === "temporaryHitPoints"
    ? [spellScalarBuffRollHole(invocation)]
    : [];
}

function applyScalarBuffEffect(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: BattleExecutableSpellInvocation<ScalarBuffInvocation>,
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
        sourceProcedureRef: invocation.sourceProcedureRef,
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
        effect.sourceProcedureRef === invocation.sourceProcedureRef,
    );
    const nextTarget = battleCreatureWithSpellActiveEffects(target, [
      ...target.activeEffects.filter((effect) => !replacing.includes(effect)),
      {
        ...scalarEffect.activeEffect,
        sourceProcedureRef: invocation.sourceProcedureRef,
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
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !fillsBelongToSpellCastHoles(input.input.fills, [
      ATTACK_TARGET_HOLE_ID,
      spellTargetListHoleId(input.invocation),
      spellScalarBuffRollHole(input.invocation).holeId,
    ])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Scalar buff spells use target fills and optional scalar dice roll.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const targetSelectionResolution = spellSelectionResolution(
    input.input.state,
    input.input.subject,
    scalarBuffSpellTargetSelection(input),
  );
  if (targetSelectionResolution.tag === "resolution")
    return targetSelectionResolution.result;
  const targetSelection = targetSelectionResolution.selection;

  const spellCastReactionWindow = maybeOpenConfiguredSpellCastReactionWindow({
    resolution: input,
    targetIds: targetSelection.targetIds,
  });
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
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
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (validation !== null) {
      return invalidResult(input.input.state, "invalidFill", validation);
    }
    /* v8 ignore stop -- @preserve */
  }

  return completeSpellActiveEffectCast({
    resolution: input,
    ...optionalProperty("actionCostOverride", input.actionCostOverride),
    ...optionalProperty("metamagicApplications", input.metamagicApplications),
    applyEffect: (state) =>
      applyScalarBuffEffect(
        state,
        input.actorId,
        targetSelection.targetIds,
        input.invocation,
        input.fillSet.healingRoll,
      ),
  });
}

const ScalarBuffInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("scalarBuff"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literals(["magicAction", "bonusAction"]),
    targeting: Schema.Union([
      Schema.Struct({
        kind: Schema.Literal("self"),
      }),
      Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Number,
        requiredTargetDisposition: Schema.Literals(["unrestricted", "willing"]),
      }),
    ]),
    effect: Schema.Union([
      Schema.Struct({
        kind: Schema.Literal("temporaryHitPoints"),
        amount: Schema.Struct({
          expr: DiceExprSchema,
        }),
      }),
      Schema.Struct({
        kind: Schema.Literal("activeEffect"),
        activeEffect: ScalarBuffActiveEffectTemplateSchema,
      }),
      Schema.Struct({
        kind: Schema.Literal("hitPointMaximumIncrease"),
        activeEffect: HitPointMaximumIncreaseTemplateSchema,
      }),
    ]),
    rangeFeet: MovementFeet,
  }),
);
export const scalarBuffProfile = {
  procedure: "scalarBuff",
  executionSchema: ScalarBuffInvocationSchema,
  admit: admitScalarBuff,
  discoverCastAct: discoverScalarBuffCastAct,
  resolve: resolveScalarBuff,
} satisfies SpellProcedureDeclaration<"scalarBuff", ScalarBuffInvocation>;
import { spellInvocationResourceForCastOption } from "./profile.ts";
