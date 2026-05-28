// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-marked-damage-rider
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER
//
// The markedDamageRider Spell Procedure Profile: Bonus Action Concentration
// spells that mark one creature, add damage when the caster hits the marked
// creature with an Attack Roll, optionally affect Ability Checks, and move the
// mark after the target drops to 0 Hit Points.
//
// RAW anchors:
//   - SRD 5.2.1 Spells "Hex": Bonus Action, 90 feet, Concentration up to
//     1 hour; extra Necrotic damage on hits with Attack Rolls; chosen Ability
//     Check Disadvantage; later-turn Bonus Action transfer; longer duration
//     with higher-level Spell Slots.
//   - SRD 5.2.1 Spells "Hunter's Mark": Bonus Action, 90 feet, Concentration
//     up to 1 hour; extra Force damage on hits with Attack Rolls; Wisdom
//     (Perception or Survival) finding Advantage; Bonus Action transfer; longer
//     duration with higher-level Spell Slots.
//   - UBIQUITOUS_LANGUAGE.md: Bonus Action, Attack Roll, Ability Check, Damage
//     Roll, Concentration, Spell Slot, Spell Invocation, and Spell Effect.
//
// What lives here: admit, discoverCastAct, castSummary, invocationRef, resolve,
// and applyEffect helpers.
//
import { spendActivationResource } from "@dnd/shared-algebras/action-economy-algebra";
import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet, spellSlotLevel } from "@dnd/shared/types";
import type {
  Ability,
  DamageType,
  DiceExpr,
  EffectAtom,
  SpellRecord,
} from "@dnd/surface/surface/types";
import type { MovementFeet, SpellSlotLevel } from "@dnd/shared/types";
import { Either, Match } from "effect";

import {
  classFeatureFreeCastSpellInvocationRef,
  spellEffectInvocationRef,
  type SpellInvocationRef,
} from "../../battle-subjects.ts";
import {
  snapshotBattle,
  type AvailableBattleAct,
  type BattleActiveEffect,
  type BattleActiveEffectExpiration,
  type BattleResolutionResult,
  type BattleState,
  type BonusActionSpellBattleResolutionInput,
  type MarkedDamageRiderCastAbilityCheckBehavior,
  type MarkedDamageRiderRetargetTiming,
  type MarkedDamageRiderTransferState,
  type SpellMarkedDamageRider,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import {
  characterResourceIsFavoredEnemyFreeCast,
  resourceHasUsesRemaining,
} from "../../character-battle-resources.ts";
import { activeMarkedDamageRiderEffect } from "../damage-helpers.ts";
import { currentActorId } from "../creature-state-leaves.ts";
import { breakBattleConcentration } from "../damage-apply.ts";
import { maybeOpenReactionWindow } from "../dispatcher.ts";
import { needsHolesResult } from "../hole-helpers.ts";
import { invalidResult } from "../result-helpers.ts";
import { battleStateAfterTargetActionEarlyEndForActor } from "../sanctuary-targeting-interdiction.ts";
import { expendSpellSlot } from "../spell-effects.ts";
import { spellCastReactionFrame } from "../spell-cast-reaction-frame.ts";
import { spellAbilityChoiceHole } from "../spells-damage-fills.ts";
import { sameStringSet } from "../spells-profile-shared.ts";
import { HUNTERS_MARK_FINDING_SKILLS } from "../domain-constants.ts";
import { supportedDamageAmountExpr } from "../spells-profile-shared.ts";
import { markSpellSlotExpendedThisTurn } from "../spell-turn-resources.ts";
import {
  spendClassFeatureFreeCastResource,
  startSpellEffectConcentration,
  type SpellCastResourceSpendResult,
} from "../spells-resolve-resources.ts";
import { spellTargetHole, spellTargetIsLegal } from "../spells-targeting.ts";
import { clearPendingAttackRollMissToHitReplacementSelection } from "../statblock-attacks.ts";
import type {
  SpellAdmissionBattleTurn,
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import {
  spellAdmissionBattleTurn,
  spellInvocationSchemaUnavailable,
} from "./profile.ts";

type MarkedDamageRiderInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "markedDamageRider" }
>;
type MarkedDamageRiderCastInvocation = Extract<
  MarkedDamageRiderInvocation,
  { readonly action: "cast" }
>;
type MarkedDamageRiderResolveInput = SpellProcedureProfileResolveInput<
  MarkedDamageRiderInvocation,
  BonusActionSpellBattleResolutionInput
>;

function admitMarkedDamageRider(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly MarkedDamageRiderInvocation[] {
  const projection = markedDamageRiderSpellProjection(spell);
  if (projection === null) {
    return [];
  }
  const { abilityCheckBehavior, damageType, expr, rangeFeet, retargetTiming } =
    projection;
  const activeMark = activeMarkedDamageRiderEffect(ctx.actor, spell.id);
  if (activeMark !== null) {
    // TODO: Allow an ordinary recast while the current mark is still active.
    // RAW permits replacing Concentration by casting the spell again and
    // choosing a new quarry; this branch currently exposes only the slotless
    // Bonus Action transfer after the marked target drops to 0 Hit Points.
    return markedDamageRiderTransferIsDiscoverable(
      activeMark,
      spellAdmissionBattleTurn(ctx),
    )
      ? [
          {
            access: { tag: "prepared" },
            resource: { tag: "none" },
            procedure: "markedDamageRider",
            action: "transfer",
            spell,
            actionCost: "bonusAction",
            targeting: { kind: "singleCombatant" },
            damage: { expr, damageType },
            rangeFeet,
            activeEffect: activeMark,
          },
        ]
      : [];
  }
  const favoredEnemyResource = ctx.actor.origin.resources.find(
    (resource) =>
      characterResourceIsFavoredEnemyFreeCast(resource) &&
      resourceHasUsesRemaining(resource),
  );
  const favoredEnemyExpiresAt = markedDamageRiderConcentrationExpirationForSlot(
    ctx.actor.combatantId,
    spell,
    spellSlotLevel(1),
  );
  const freeCastInvocations: readonly MarkedDamageRiderInvocation[] =
    favoredEnemyResource === undefined || favoredEnemyExpiresAt === null
      ? []
      : [
          {
            access: { tag: "prepared" },
            resource: {
              tag: "classFeatureFreeCast",
              resourceUnitId: favoredEnemyResource.unit.id,
            },
            procedure: "markedDamageRider",
            action: "cast",
            spell,
            actionCost: "bonusAction",
            targeting: { kind: "singleCombatant" },
            damage: { expr, damageType },
            abilityCheckBehavior,
            retargetTiming,
            rangeFeet,
            expiresAt: favoredEnemyExpiresAt,
          },
        ];
  const slotInvocations = ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly MarkedDamageRiderInvocation[] => {
      const expiresAt = markedDamageRiderConcentrationExpirationForSlot(
        ctx.actor.combatantId,
        spell,
        slot.spellLevel,
      );
      return Number(slot.spellLevel) < spell.mechanics.level ||
        expiresAt === null
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
              procedure: "markedDamageRider",
              action: "cast",
              spell,
              actionCost: "bonusAction",
              targeting: { kind: "singleCombatant" },
              damage: { expr, damageType },
              abilityCheckBehavior,
              retargetTiming,
              rangeFeet,
              expiresAt,
            },
          ];
    },
  );
  return [...freeCastInvocations, ...slotInvocations];
}

function markedDamageRiderTransferIsDiscoverable(
  activeMark: SpellMarkedDamageRider,
  battleTurn: SpellAdmissionBattleTurn | undefined,
): boolean {
  if (activeMark.transfer.kind === "available") {
    return true;
  }
  if (activeMark.transfer.kind === "awaitingTargetDrop") {
    return false;
  }
  return (
    battleTurn !== undefined &&
    (battleTurn.currentActorId !== activeMark.transfer.droppedOnTurn.actorId ||
      battleTurn.round !== activeMark.transfer.droppedOnTurn.round)
  );
}

function markedDamageRiderSpellProjection(spell: SpellRecord): {
  readonly abilityCheckBehavior: MarkedDamageRiderCastAbilityCheckBehavior;
  readonly damageType: DamageType;
  readonly expr: DiceExpr;
  readonly rangeFeet: MovementFeet;
  readonly retargetTiming: MarkedDamageRiderRetargetTiming;
} | null {
  if (
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "bonus_action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 90 ||
    spell.mechanics.attachment.kind !== "hole" ||
    spell.mechanics.attachment.value.kind !== "mark" ||
    spell.mechanics.attachment.value.selection.mode !== "one" ||
    spell.mechanics.duration.kind !== "concentration"
  ) {
    return null;
  }

  if (spell.mechanics.operations.length === 1) {
    return markedDamageRiderDamageProjection(
      spell,
      "force",
      {
        kind: "findingAdvantage",
        ability: "wis",
        skills: HUNTERS_MARK_FINDING_SKILLS,
      },
      "sameTurn",
    );
  }

  if (spell.mechanics.operations.length === 2) {
    const passive = spell.mechanics.operations[1];
    const passiveEffect = passive?.effect;
    const abilityChoices = hexAbilityChoices(
      passiveEffect?.kind === "modify_roll_advantage"
        ? passiveEffect
        : undefined,
    );
    return abilityChoices === null
      ? null
      : markedDamageRiderDamageProjection(
          spell,
          "necrotic",
          { kind: "chosenAbilityDisadvantage", choices: abilityChoices },
          "laterTurn",
        );
  }

  return null;
}

function markedDamageRiderDamageProjection(
  spell: SpellRecord,
  damageType: DamageType,
  abilityCheckBehavior: MarkedDamageRiderCastAbilityCheckBehavior,
  retargetTiming: MarkedDamageRiderRetargetTiming,
): {
  readonly abilityCheckBehavior: MarkedDamageRiderCastAbilityCheckBehavior;
  readonly damageType: DamageType;
  readonly expr: DiceExpr;
  readonly rangeFeet: MovementFeet;
  readonly retargetTiming: MarkedDamageRiderRetargetTiming;
} | null {
  const mechanics = spell.mechanics;
  if (
    mechanics.family !== "ongoing_effect" ||
    mechanics.range.kind !== "point" ||
    typeof mechanics.range.feet !== "number"
  ) {
    return null;
  }
  const operation = mechanics.operations[0];
  if (
    operation?.trigger.kind !== "on_caster_attack_hit" ||
    operation.effect.kind !== "damage" ||
    operation.effect.damageType !== damageType ||
    operation.effect.amount === undefined
  ) {
    return null;
  }
  const expr = supportedDamageAmountExpr({ amount: operation.effect.amount });
  return expr === null
    ? null
    : {
        abilityCheckBehavior,
        damageType,
        expr,
        rangeFeet: movementFeet(mechanics.range.feet),
        retargetTiming,
      };
}

function hexAbilityChoices(
  effect: EffectAtom | undefined,
): readonly Ability[] | null {
  if (effect === undefined || effect.kind !== "modify_roll_advantage") {
    return null;
  }
  const abilityFilter = effect.abilityFilter;
  if (
    effect.mode !== "disadvantage" ||
    (effect.affects ?? "self_roll") !== "self_roll" ||
    !sameStringSet(effect.on, ["ability_check"]) ||
    abilityFilter === undefined ||
    !("kind" in abilityFilter)
  ) {
    return null;
  }
  if (abilityFilter.kind !== "hole" || abilityFilter.value.kind !== "choice") {
    return null;
  }
  const options = abilityFilter.value.options;
  return sameStringSet(options, ["str", "dex", "con", "int", "wis", "cha"])
    ? options
    : null;
}

function markedDamageRiderConcentrationExpirationForSlot(
  actorId: CombatantId,
  spell: SpellRecord,
  slotLevel: SpellSlotLevel,
): Extract<
  BattleActiveEffectExpiration,
  { readonly kind: "concentration" }
> | null {
  if (
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "hour" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    !hasSupportedMarkedDamageRiderDurationTiers(spell.mechanics.duration.upTo)
  ) {
    return null;
  }
  const upTo = spell.mechanics.duration.upTo;
  const amount =
    upTo.upcastTiers?.reduce(
      (currentAmount, tier) =>
        Number(slotLevel) >= tier.atSlot ? tier.amount : currentAmount,
      upTo.amount,
    ) ?? upTo.amount;
  const ticks = elapsedTimeTicksFromTimeSpanDuration({
    unit: upTo.unit,
    amount,
  });
  return Either.isLeft(ticks)
    ? null
    : {
        kind: "concentration",
        combatantId: actorId,
        durationTicks: ticks.right,
      };
}

function hasSupportedMarkedDamageRiderDurationTiers(
  upTo: Extract<
    SpellRecord["mechanics"]["duration"],
    { readonly kind: "concentration" }
  >["upTo"],
): boolean {
  const tiers = upTo.upcastTiers ?? [];
  return (
    durationTiersEqual(tiers, [
      { atSlot: 3, amount: 8 },
      { atSlot: 5, amount: 24 },
    ]) ||
    durationTiersEqual(tiers, [
      { atSlot: 2, amount: 4 },
      { atSlot: 3, amount: 8 },
      { atSlot: 5, amount: 24 },
    ])
  );
}

function durationTiersEqual(
  tiers: readonly { readonly atSlot: number; readonly amount: number }[],
  expected: readonly { readonly atSlot: number; readonly amount: number }[],
): boolean {
  return (
    tiers.length === expected.length &&
    tiers.every(
      (tier, index) =>
        tier.atSlot === expected[index]?.atSlot &&
        tier.amount === expected[index]?.amount,
    )
  );
}

function discoverMarkedDamageRiderCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: MarkedDamageRiderInvocation,
): readonly AvailableBattleAct[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  const initialHoles =
    invocation.action === "cast" &&
    invocation.abilityCheckBehavior.kind === "chosenAbilityDisadvantage"
      ? [targetHole, spellAbilityChoiceHole(invocation)]
      : [targetHole];
  return targetHole.choices.length === 0
    ? []
    : [
        {
          subject: {
            tag: "bonusActionSpell" as const,
            actorId,
            invocation: markedDamageRiderInvocationRef(invocation),
            mode: { tag: "cast" as const },
          },
          label: invocation.spell.name,
          summary: markedDamageRiderCastSummary(invocation),
          initialHoles,
        },
      ];
}

function markedDamageRiderInvocationRef(
  invocation: MarkedDamageRiderInvocation,
): SpellInvocationRef {
  return invocation.action === "transfer"
    ? spellEffectInvocationRef(
        invocation.spell.id,
        invocation.activeEffect.sourceCombatantId,
        "markedDamageRiderTransfer",
      )
    : invocation.resource.tag === "classFeatureFreeCast"
      ? classFeatureFreeCastSpellInvocationRef(
          invocation.spell.id,
          invocation.resource.resourceUnitId,
          "markedDamageRider",
        )
      : {
          tag: "spellSlot" as const,
          spellId: spellId(invocation.spell.id),
          slotLevel: invocation.resource.slotLevel,
          procedure: "markedDamageRider" as const,
        };
}

function markedDamageRiderCastSummary(
  invocation: MarkedDamageRiderInvocation,
): string {
  if (invocation.action === "transfer") {
    return `Move ${invocation.spell.name} to a new target.`;
  }
  return invocation.resource.tag === "classFeatureFreeCast"
    ? `Cast ${invocation.spell.name} using Favored Enemy.`
    : `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function resolveMarkedDamageRider(
  input: MarkedDamageRiderResolveInput,
): BattleResolutionResult {
  if (
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Marked damage rider spells use one target fill.",
    );
  }
  if (input.fillSet.targetId === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellTargetHole(input.input.state, input.actorId, input.invocation),
    ]);
  }
  if (
    !spellTargetIsLegal(
      input.input.state,
      input.actorId,
      input.fillSet.targetId,
      input.invocation,
      input.fillSet.targetSpatialFacts,
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Marked spell target must be a combatant within the selected spell's supported range.",
    );
  }
  if (input.invocation.action === "transfer") {
    const activeMark = activeMarkedDamageRiderEffect(
      input.input.state.combatants.get(input.actorId),
      input.invocation.spell.id,
    );
    if (
      activeMark === null ||
      !markedDamageRiderTransferIsAvailable(input.input.state, activeMark)
    ) {
      return invalidResult(
        input.input.state,
        "staleSubject",
        "Marked damage rider spells can move only after the marked target drops to 0 Hit Points and any later-turn timing is satisfied.",
      );
    }
  }
  if (
    input.invocation.action === "cast" &&
    input.invocation.abilityCheckBehavior.kind === "chosenAbilityDisadvantage"
  ) {
    if (input.fillSet.abilityChoice === undefined) {
      return needsHolesResult(input.input.state, input.input.subject, [
        spellAbilityChoiceHole(input.invocation),
      ]);
    }
  } else if (input.fillSet.abilityChoice !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "This marked damage rider spell does not choose an ability.",
    );
  }
  if (input.invocation.action === "cast") {
    const spellCastReactionWindow = maybeOpenReactionWindow(
      input.input.state,
      spellCastReactionFrame({
        casterId: input.actorId,
        invocation: input.invocation,
        targetIds: [input.fillSet.targetId],
        reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
        castingResource: { kind: "bonusAction" },
        continuation: {
          kind: "replay",
          subject: input.input.subject,
          fills: input.input.fills,
        },
      }),
      input.input.suppressedReactionTrigger,
    );
    if (spellCastReactionWindow !== null) {
      return spellCastReactionWindow;
    }
  }

  const spent = spendActivationResource(
    input.input.state.currentTurnResources,
    {
      kind: "bonusAction",
    },
  );
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Bonus Action spell is no longer available for the current actor.",
    );
  }
  if (input.invocation.action === "transfer") {
    const nextState = applyMarkedDamageRiderSpellEffect(
      {
        ...input.input.state,
        currentTurnResources:
          clearPendingAttackRollMissToHitReplacementSelection(
            spent.right,
            input.actorId,
          ),
      },
      input.actorId,
      input.fillSet.targetId,
      input.invocation,
      input.fillSet.abilityChoice,
    );
    return {
      tag: "resolved",
      state: nextState,
      snapshot: snapshotBattle(nextState),
    };
  }
  const concentrationBase = breakBattleConcentration(
    input.input.state,
    input.actorId,
  );
  const turnResources = clearPendingAttackRollMissToHitReplacementSelection(
    spent.right,
    input.actorId,
  );
  const resourced =
    input.invocation.resource.tag === "classFeatureFreeCast"
      ? spendClassFeatureFreeCastResource(
          {
            ...concentrationBase,
            currentTurnResources: turnResources,
          },
          input.actorId,
          input.invocation.resource.resourceUnitId,
          input.invocation,
          input.input.state,
        )
      : spendMarkedDamageRiderSpellSlot(
          {
            ...concentrationBase,
            currentTurnResources: turnResources,
          },
          input.actorId,
          input.invocation.resource.slotLevel,
          input.input.state,
        );
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const effected = applyMarkedDamageRiderSpellEffect(
    resourced.state,
    input.actorId,
    input.fillSet.targetId,
    input.invocation,
    input.fillSet.abilityChoice,
  );
  const nextState = startSpellEffectConcentration(
    effected,
    input.actorId,
    input.invocation,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function spendMarkedDamageRiderSpellSlot(
  state: BattleState,
  actorId: CombatantId,
  slotLevel: Extract<
    MarkedDamageRiderCastInvocation["resource"],
    { readonly tag: "spellSlot" }
  >["slotLevel"],
  errorState: BattleState,
): SpellCastResourceSpendResult {
  const spellCastState = battleStateAfterTargetActionEarlyEndForActor(
    state,
    actorId,
  );
  const slotTurnResources = markSpellSlotExpendedThisTurn(
    spellCastState.currentTurnResources,
    actorId,
  );
  if (Either.isLeft(slotTurnResources)) {
    return invalidResult(
      errorState,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  return {
    tag: "resolved",
    state: expendSpellSlot(
      {
        ...spellCastState,
        currentTurnResources: slotTurnResources.right,
      },
      actorId,
      slotLevel,
    ),
  };
}

function markedDamageRiderTransferIsAvailable(
  state: BattleState,
  activeMark: SpellMarkedDamageRider,
): boolean {
  if (activeMark.transfer.kind === "available") {
    return true;
  }
  if (activeMark.transfer.kind === "awaitingTargetDrop") {
    return false;
  }
  return (
    currentActorId(state) !== activeMark.transfer.droppedOnTurn.actorId ||
    state.initiative.round !== activeMark.transfer.droppedOnTurn.round
  );
}

function applyMarkedDamageRiderSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  invocation: MarkedDamageRiderInvocation,
  selectedAbility?: Ability,
): BattleState {
  const caster = state.combatants.get(actorId);
  if (caster === undefined) {
    return state;
  }
  const existingExpiresAt =
    invocation.action === "transfer"
      ? invocation.activeEffect.expiresAt
      : invocation.expiresAt;
  const transfer: MarkedDamageRiderTransferState = {
    kind: "awaitingTargetDrop",
    retargetTiming:
      invocation.action === "transfer"
        ? invocation.activeEffect.transfer.retargetTiming
        : invocation.retargetTiming,
  };
  const activeEffects = [
    ...caster.activeEffects.filter(
      (effect) =>
        !(
          effect.kind === "spellMarkedDamageRider" &&
          effect.sourceSpellId === invocation.spell.id &&
          effect.sourceCombatantId === actorId
        ),
    ),
    {
      kind: "spellMarkedDamageRider" as const,
      sourceSpellId: invocation.spell.id,
      sourceCombatantId: actorId,
      targetCombatantId: targetId,
      transfer,
      abilityCheckBehavior:
        invocation.action === "transfer"
          ? invocation.activeEffect.abilityCheckBehavior
          : markedDamageRiderActiveAbilityCheckBehavior(
              invocation.abilityCheckBehavior,
              selectedAbility,
            ),
      damage: invocation.damage,
      expiresAt: existingExpiresAt,
    },
  ];
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...caster,
      activeEffects,
    }),
  };
}

function markedDamageRiderActiveAbilityCheckBehavior(
  behavior: MarkedDamageRiderCastInvocation["abilityCheckBehavior"],
  selectedAbility: Ability | undefined,
): Extract<
  BattleActiveEffect,
  { readonly kind: "spellMarkedDamageRider" }
>["abilityCheckBehavior"] {
  return Match.value(behavior).pipe(
    Match.when({ kind: "none" }, () => ({ kind: "none" as const })),
    Match.when({ kind: "findingAdvantage" }, (findingAdvantage) => ({
      kind: "findingAdvantage" as const,
      ability: findingAdvantage.ability,
      skills: findingAdvantage.skills,
    })),
    Match.when({ kind: "chosenAbilityDisadvantage" }, () =>
      selectedAbility === undefined
        ? { kind: "none" as const }
        : { kind: "abilityDisadvantage" as const, ability: selectedAbility },
    ),
    Match.exhaustive,
  );
}

export const markedDamageRiderProfile: SpellProcedureProfile<
  "markedDamageRider",
  MarkedDamageRiderInvocation,
  BonusActionSpellBattleResolutionInput
> = {
  procedure: "markedDamageRider",
  invocationSchema: spellInvocationSchemaUnavailable(),
  metamagicCompatibility: "notActionSpellCasting",
  isTargetListInvocation: false,
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitMarkedDamageRider,
  discoverCastAct: discoverMarkedDamageRiderCastAct,
  castSummary: markedDamageRiderCastSummary,
  invocationRef: markedDamageRiderInvocationRef,
  resolve: resolveMarkedDamageRider,
};
