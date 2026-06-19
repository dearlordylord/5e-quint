// UNIT-PROFILE-COVERAGE: runtime-owner spell.hit-point-restoration unit-feature.spell-slot-healing-modifier
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HIT_POINT_RESTORATION BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING
//
// The directHitPointRestoration Spell Procedure Profile: prepared spells that
// directly restore Hit Points through target fills and one healing roll, with
// Magic Action or Bonus Action casting.
//
// RAW anchors:
//   - SRD 5.2.1 Rules Glossary "Hit Points": healing restores Hit Points and
//     cannot raise them above the Hit Point maximum.
//   - SRD 5.2.1 Rules Glossary "Bonus Action": Bonus Actions exist only when a
//     rule explicitly grants one.
//   - SRD 5.2.1 Spells "Healing Word" and "Mass Healing Word": Bonus Action
//     restoration spells.
//   - SRD 5.2.1 Spells "Cure Wounds" and "Mass Cure Wounds": Magic Action
//     restoration spells.
//   - SRD 5.2.1 Cleric "Level 3: Disciple of Life": slot-cast spell
//     restoration adds 2 plus the Spell Slot level to each healed creature.

import {
  movementFeet,
  type AbilityModifier,
  type MovementFeet,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import type {
  Attachment,
  DiceExpr,
  SpellRecord,
  TopLevelSpellCastingTime,
  DiceAmount as SurfaceDiceAmount,
  TargetSelection,
} from "@dnd/surface/surface/types";
import { topLevelSpellCastingTime } from "@dnd/surface/surface/types";
import { Match } from "effect";

import type { SpellInvocationRef } from "../../battle-subjects.ts";
import {
  maybeOpenInterruptWindow,
  type ActionSpellBattleResolutionInput,
  type AvailableBattleAct,
  type BattleResolutionResult,
  type BattleState,
  type BonusActionSpellBattleResolutionInput,
  type HealingSpellActionCost,
  type HealingSpellTargeting,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import type { SpellMetamagicApplicationFact } from "../metamagic-support.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import { applyHpHealing } from "../damage-apply.ts";
import { needsHolesResult } from "../hole-helpers.ts";
import { invalidResult } from "../result-helpers.ts";
import { spellCastInterruptFrame } from "../spell-cast-interrupt-frame.ts";
import { spellHealingAmount } from "../spell-effects.ts";
import {
  spellHealingRollHole,
  validateSpellHealingFill,
} from "../spells-damage-fills.ts";
import {
  spellSubjectTagForInvocation,
  targetListSpellUsesTargetListHole,
} from "../spells-discovery.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import { healingSpellTargetSelection } from "../spells-resolve-target-selection.ts";
import { spellTargetHole, spellTargetListHole } from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { spellProcedureInvocationSchema } from "./profile.ts";
import { SupportedHealingSpellInvocationSchema } from "../codec-building-blocks.ts";

type DirectHitPointRestorationInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "directHitPointRestoration" }
>;
type DirectHitPointRestorationResolveInput = SpellProcedureProfileResolveInput<
  DirectHitPointRestorationInvocation,
  ActionSpellBattleResolutionInput | BonusActionSpellBattleResolutionInput
> & {
  readonly actionCostOverride?: "magicAction" | "bonusAction";
  readonly metamagicApplications?: readonly SpellMetamagicApplicationFact[];
};

function admitDirectHitPointRestoration(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly DirectHitPointRestorationInvocation[] {
  const projection = directHitPointRestorationProjection(spell);
  if (projection === null) {
    return [];
  }
  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly DirectHitPointRestorationInvocation[] => {
      if (Number(slot.spellLevel) < spell.mechanics.level) {
        return [];
      }
      const healingExpr = supportedHitPointRestorationAmountExpr(
        projection.amount,
        spell.mechanics.level,
        slot.spellLevel,
        ctx.actor.origin.spellcasting.spellcastingAbilityModifier,
      );
      return healingExpr === null
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
              procedure: "directHitPointRestoration",
              spell,
              actionCost: projection.actionCost,
              targeting: projection.targeting,
              healing: { expr: healingExpr },
              rangeFeet: projection.rangeFeet,
            },
          ];
    },
  );
}

function directHitPointRestorationProjection(spell: SpellRecord): {
  readonly actionCost: HealingSpellActionCost;
  readonly targeting: HealingSpellTargeting;
  readonly amount: SurfaceDiceAmount;
  readonly rangeFeet: MovementFeet;
} | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const castingTime = topLevelSpellCastingTime(spell.mechanics);
  const phase = spell.mechanics.phases[0];
  const effect = phase?.kind === "direct" ? phase.effects?.[0] : undefined;
  const actionCost =
    castingTime === null ? null : hitPointRestorationActionCost(castingTime);
  const targeting =
    phase?.kind === "direct" && phase.attachment.kind === "hole"
      ? hitPointRestorationTargeting(phase.attachment.value)
      : null;
  const rangeFeet = hitPointRestorationRangeFeet(spell.mechanics.range);
  if (
    actionCost === null ||
    rangeFeet === null ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "hole" ||
    targeting === null ||
    phase.effects?.length !== 1 ||
    effect?.kind !== "heal_hp"
  ) {
    return null;
  }
  return {
    actionCost,
    targeting,
    amount: effect.amount,
    rangeFeet,
  };
}

function hitPointRestorationTargeting(
  attachment: Attachment,
): HealingSpellTargeting | null {
  if (attachment.kind === "target") {
    const targetBounds = hitPointRestorationTargetBounds(attachment.selection);
    return targetBounds === null
      ? null
      : {
          kind: "targetList",
          minTargets: 1,
          maxTargets: targetBounds.maxTargets,
        };
  }

  if (attachment.kind === "area") {
    const targetBounds =
      attachment.selection === undefined
        ? null
        : hitPointRestorationTargetBounds(attachment.selection);
    if (
      targetBounds === null ||
      attachment.origin.kind !== "point_within_range" ||
      attachment.shape.kind !== "sphere" ||
      typeof attachment.shape.radiusFeet !== "number"
    ) {
      return null;
    }
    return {
      kind: "pointOriginSphereTargetList",
      minTargets: 1,
      maxTargets: targetBounds.maxTargets,
      area: {
        kind: "pointOriginSphere",
        radiusFeet: movementFeet(attachment.shape.radiusFeet),
      },
    };
  }

  return null;
}

function hitPointRestorationActionCost(
  castingTime: TopLevelSpellCastingTime,
): HealingSpellActionCost | null {
  return Match.value(castingTime).pipe(
    Match.when({ kind: "action" }, () => "magicAction" as const),
    Match.when({ kind: "bonus_action" }, () => "bonusAction" as const),
    Match.orElse(() => null),
  );
}

function hitPointRestorationTargetBounds(
  selection: TargetSelection,
): { readonly maxTargets: number } | null {
  if (selection.mode === "one") {
    return { maxTargets: 1 };
  }
  if (
    selection.mode === "choose_up_to" &&
    typeof selection.count === "number" &&
    selection.count >= 1
  ) {
    return { maxTargets: selection.count };
  }
  return null;
}

function hitPointRestorationRangeFeet(
  range: SpellRecord["mechanics"]["range"],
): MovementFeet | null {
  return Match.value(range).pipe(
    Match.when({ kind: "point" }, (point) =>
      typeof point.feet === "number" ? movementFeet(point.feet) : null,
    ),
    Match.when({ kind: "touch" }, () => movementFeet(5)),
    Match.orElse(() => null),
  );
}

function supportedHitPointRestorationAmountExpr(
  amount: SurfaceDiceAmount,
  spellLevel: number,
  slotLevel: SpellSlotLevel,
  spellcastingAbilityModifier: AbilityModifier,
): DiceExpr | null {
  if (
    amount.kind !== "linear_per_level" ||
    amount.startingAtLevel !== spellLevel ||
    amount.base.spellcastingMod !== true ||
    amount.base.dieSize === undefined
  ) {
    return null;
  }
  const slotDelta = Math.max(0, Number(slotLevel) - amount.startingAtLevel);
  return {
    dice: amount.base.dice + (amount.perLevel?.dice ?? 0) * slotDelta,
    dieSize: amount.base.dieSize,
    flat: Number(spellcastingAbilityModifier),
  };
}

function discoverDirectHitPointRestorationCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: DirectHitPointRestorationInvocation,
): readonly AvailableBattleAct[] {
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
              invocation: directHitPointRestorationInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: directHitPointRestorationCastSummary(invocation),
            initialHoles: [targetHole],
          },
        ];
  return castActs;
}

function directHitPointRestorationInvocationRef(
  invocation: DirectHitPointRestorationInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "directHitPointRestoration",
  };
}

function directHitPointRestorationCastSummary(
  invocation: DirectHitPointRestorationInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function resolveDirectHitPointRestoration(
  input: DirectHitPointRestorationResolveInput,
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
      "Hit Point restoration spells use target fills and one healing roll.",
    );
  }
  const targetSelection = healingSpellTargetSelection(input);
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

  if (input.fillSet.healingRoll == null) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellHealingRollHole(input.invocation),
    ]);
  }
  const healingValidation = validateSpellHealingFill(
    input.fillSet.healingRoll,
    input.invocation,
  );
  if (healingValidation !== null) {
    return invalidResult(input.input.state, "invalidFill", healingValidation);
  }
  const healingAmount = spellHealingAmount(
    input.invocation,
    input.fillSet.healingRoll,
  );
  const healingModifierAmount = spellSlotHealingModifierAmount(
    input.input.state,
    input.actorId,
    input.invocation,
  );
  const healed = targetSelection.targetIds.reduce((state, targetId) => {
    const target = state.combatants.get(targetId);
    return target === undefined
      ? state
      : {
          ...state,
          combatants: new Map(state.combatants).set(
            targetId,
            applyHpHealing(target, healingAmount + healingModifierAmount),
          ),
        };
  }, input.input.state);
  return spendSpellCastResources({
    state: healed,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    ...(input.actionCostOverride === undefined
      ? {}
      : { actionCostOverride: input.actionCostOverride }),
    ...(input.metamagicApplications === undefined
      ? {}
      : { metamagicApplications: input.metamagicApplications }),
  });
}

function spellSlotHealingModifierAmount(
  state: BattleState,
  actorId: CombatantId,
  invocation: DirectHitPointRestorationInvocation,
): number {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    return 0;
  }
  return [...actor.origin.spellSlotHealingModifierProfiles.values()].reduce(
    (total, profile) =>
      total +
      profile.healingModifier.bonus.flat +
      Number(invocation.resource.slotLevel),
    0,
  );
}

const DirectHitPointRestorationInvocationSchema =
  spellProcedureInvocationSchema<
    Extract<
      SupportedSpellInvocation,
      { readonly procedure: "directHitPointRestoration" }
    >
  >(SupportedHealingSpellInvocationSchema);
export const directHitPointRestorationProfile = {
  procedure: "directHitPointRestoration",
  invocationSchema: DirectHitPointRestorationInvocationSchema,
  metamagicCompatibility: "bonusActionRewrite",
  targetListInvocation: { kind: "always" },
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitDirectHitPointRestoration,
  discoverCastAct: discoverDirectHitPointRestorationCastAct,
  castSummary: directHitPointRestorationCastSummary,
  invocationRef: directHitPointRestorationInvocationRef,
  resolve: resolveDirectHitPointRestoration,
} satisfies SpellProcedureProfile<
  "directHitPointRestoration",
  DirectHitPointRestorationInvocation,
  ActionSpellBattleResolutionInput | BonusActionSpellBattleResolutionInput
>;
