// KERNEL-COVERAGE: runtime-owner BATTLE.SANCTUARY.TARGETING_INTERDICTION BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE
import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { movementFeet } from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";
import type {
  BattleActiveEffect,
  BattleCreatureState,
  BattleFill,
  BattleHoleId,
  BattleSanctuaryInterdictionOutcome,
  BattleSanctuaryInterdictionOutcomeHole,
  BattleState,
  SanctuaryTargetingInterdictionSpellInvocation,
  SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type { CharacterBattleSpellcastingState } from "../character-battle-resources.ts";
import type { CombatantId } from "../identity.ts";
import { battleCreatureWithSpellActiveEffects } from "../active-effect/lifecycle.ts";
import {
  combatantsAfterConcentrationSpellEffectsEndedIfNoEffects,
  conditionsAfterExpiringSpellConditionEffects,
} from "./spell-condition-effects-helpers.ts";
import { sameStringSet } from "./spells-profile-shared.ts";

export function supportedPreparedSanctuaryTargetingInterdictionSpellProfile(
  actorId: CombatantId,
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const projection = sanctuaryTargetingInterdictionProjection(actorId, spell);
  if (projection === null) {
    return [];
  }
  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] =>
    Number(slot.spellLevel) < spell.mechanics.level
      ? []
      : [
          {
            access: { tag: "prepared" },
            resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
            procedure: "sanctuaryTargetingInterdiction",
            spell,
            actionCost: "bonusAction",
            targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
            ...projection,
          },
        ],
  );
}

function sanctuaryTargetingInterdictionProjection(
  actorId: CombatantId,
  spell: SpellRecord,
): Pick<
  SanctuaryTargetingInterdictionSpellInvocation,
  "activeEffect" | "rangeFeet"
> | null {
  if (
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "bonus_action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 30 ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "minute" ||
    spell.mechanics.duration.value.amount !== 1 ||
    spell.mechanics.operations.length !== 1
  ) {
    return null;
  }
  const attachment = spell.mechanics.attachment;
  const targetSelection =
    attachment.kind === "hole" && attachment.value.kind === "target"
      ? attachment.value.selection
      : null;
  const operation = spell.mechanics.operations[0];
  const earlyEnd =
    spell.mechanics.duration.kind === "timed"
      ? (spell.mechanics.duration.earlyEnd ?? [])
      : [];
  if (
    targetSelection?.mode !== "one" ||
    !sameStringSet(targetSelection.targetKinds ?? [], ["creature"]) ||
    operation?.trigger.kind !== "on_attached_targeted" ||
    operation.trigger.excludes !== "area_of_effect" ||
    !sameStringSet(operation.trigger.targeting, [
      "attack_roll",
      "damaging_spell",
    ]) ||
    operation.effect.kind !== "save_gate" ||
    operation.effect.ability !== "wis" ||
    operation.effect.dc.kind !== "caster_spell_save_dc" ||
    operation.effect.onSuccess.kind !== "none" ||
    operation.effect.onFail.kind !== "choose_new_target_or_lose" ||
    operation.effect.onFail.subject !== "triggering_attack_or_spell" ||
    !sameStringSet(
      earlyEnd.map((end) => end.kind),
      ["target_makes_attack_roll", "target_casts_spell", "target_deals_damage"],
    )
  ) {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.value,
  );
  return Either.isLeft(durationTicks)
    ? null
    : {
        rangeFeet: movementFeet(30),
        activeEffect: {
          kind: "sanctuaryWard",
          sourceSpellId: spell.id,
          sourceCombatantId: actorId,
          save: { ability: "wis", dc: operation.effect.dc },
          expiresAt: { kind: "duration", durationTicks: durationTicks.right },
        },
      };
}

export type SanctuaryTargetingInterdictionCheck =
  | { readonly tag: "notWarded" }
  | {
      readonly tag: "needsHoles";
      readonly hole: BattleSanctuaryInterdictionOutcomeHole;
    }
  | { readonly tag: "invalid"; readonly message: string }
  | { readonly tag: "saveSucceeded" }
  | { readonly tag: "lost" }
  | {
      readonly tag: "newTarget";
      readonly targetId: CombatantId;
      readonly spatialFacts: Extract<
        Exclude<
          BattleSanctuaryInterdictionOutcome,
          { readonly saveSucceeded: true }
        >["outcome"],
        { readonly kind: "newTarget" }
      >["spatialFacts"];
    };

export function sanctuaryTargetingInterdictionCheck(input: {
  readonly state: BattleState;
  readonly triggeringCombatantId: CombatantId;
  readonly wardedCombatantId: CombatantId;
  readonly triggeringTargetEventId: BattleHoleId;
  readonly fills: readonly BattleFill[];
}): SanctuaryTargetingInterdictionCheck {
  const warded = input.state.combatants.get(input.wardedCombatantId);
  const effect = warded?.activeEffects.find(
    (
      candidate,
    ): candidate is Extract<
      BattleActiveEffect,
      { readonly kind: "sanctuaryWard" }
    > => candidate.kind === "sanctuaryWard",
  );
  if (warded === undefined || effect === undefined) {
    return { tag: "notWarded" };
  }
  const hole = sanctuaryTargetingInterdictionOutcomeHole({
    state: input.state,
    triggeringCombatantId: input.triggeringCombatantId,
    wardedCombatantId: input.wardedCombatantId,
    triggeringTargetEventId: input.triggeringTargetEventId,
    effect,
  });
  const matchingFills = input.fills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "sanctuaryInterdictionOutcome" }
    > =>
      fill.kind === "sanctuaryInterdictionOutcome" &&
      fill.holeId === hole.holeId,
  );
  if (matchingFills.length === 0) {
    return { tag: "needsHoles", hole };
  }
  if (matchingFills.length > 1) {
    return {
      tag: "invalid",
      message: "Sanctuary targeting interdiction was filled twice.",
    };
  }
  const value = matchingFills[0]!.value;
  if (value.saveSucceeded) {
    return { tag: "saveSucceeded" };
  }
  if (value.outcome.kind === "loseAttackOrSpell") {
    return { tag: "lost" };
  }
  if (value.outcome.targetId === input.wardedCombatantId) {
    return {
      tag: "invalid",
      message:
        "Sanctuary replacement target must differ from the warded target.",
    };
  }
  if (!input.state.combatants.has(value.outcome.targetId)) {
    return {
      tag: "invalid",
      message:
        "Sanctuary replacement target must be a combatant in this battle.",
    };
  }
  return {
    tag: "newTarget",
    targetId: value.outcome.targetId,
    spatialFacts: value.outcome.spatialFacts,
  };
}

function sanctuaryTargetingInterdictionOutcomeHole(input: {
  readonly state: BattleState;
  readonly triggeringCombatantId: CombatantId;
  readonly wardedCombatantId: CombatantId;
  readonly triggeringTargetEventId: BattleHoleId;
  readonly effect: Extract<
    BattleActiveEffect,
    { readonly kind: "sanctuaryWard" }
  >;
}): BattleSanctuaryInterdictionOutcomeHole {
  const holeKey = [
    "battle",
    "sanctuary-interdiction",
    input.effect.sourceSpellId,
    input.effect.sourceCombatantId,
    input.wardedCombatantId,
    input.triggeringCombatantId,
    input.triggeringTargetEventId,
  ].join(":");
  return {
    kind: "sanctuaryInterdictionOutcome",
    holeId: holeId(holeKey),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: "Sanctuary Wisdom save and targeting outcome",
    sourceSpellId: input.effect.sourceSpellId,
    sourceCombatantId: input.effect.sourceCombatantId,
    wardedCombatantId: input.wardedCombatantId,
    triggeringCombatantId: input.triggeringCombatantId,
    triggeringTargetEventId: input.triggeringTargetEventId,
    ability: input.effect.save.ability,
    dc: input.effect.save.dc,
    choices: [...input.state.combatants.keys()].filter(
      (id) => id !== input.wardedCombatantId,
    ),
  };
}

type TargetActionEndedSpellConditionEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "targetActionEndedSpellCondition" }
>;

function sameTargetActionConditionSource(
  effect: BattleActiveEffect,
  source: TargetActionEndedSpellConditionEffect,
): boolean {
  return (
    effect.kind === "targetActionEndedSpellCondition" &&
    effect.sourceCombatantId === source.sourceCombatantId &&
    effect.sourceSpellId === source.sourceSpellId
  );
}

export function battleStateAfterTargetActionEarlyEndForActor(
  state: BattleState,
  actorId: CombatantId,
): BattleState {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return state;
  }
  const targetActionConditionSources = actor.activeEffects
    .filter(
      (effect): effect is TargetActionEndedSpellConditionEffect =>
        effect.kind === "targetActionEndedSpellCondition",
    )
    .reduce<readonly TargetActionEndedSpellConditionEffect[]>(
      (sources, effect) =>
        sources.some((source) =>
          sameTargetActionConditionSource(effect, source),
        )
          ? sources
          : [...sources, effect],
      [],
    );
  const sanctuaryActiveEffects = actor.activeEffects.filter(
    (effect) => effect.kind !== "sanctuaryWard",
  );
  const sanctuaryEnded =
    sanctuaryActiveEffects.length === actor.activeEffects.length
      ? state
      : {
          ...state,
          combatants: new Map(state.combatants).set(
            actorId,
            battleCreatureWithSpellActiveEffects(actor, sanctuaryActiveEffects),
          ),
        };
  return targetActionConditionSources.reduce(
    battleStateAfterTargetActionConditionSourceEarlyEnd,
    sanctuaryEnded,
  );
}

function battleStateAfterTargetActionConditionSourceEarlyEnd(
  state: BattleState,
  source: TargetActionEndedSpellConditionEffect,
): BattleState {
  const combatants = new Map(
    [...state.combatants].map(([combatantId, combatant]) => {
      const expiringEffects = combatant.activeEffects.filter((effect) =>
        sameTargetActionConditionSource(effect, source),
      );
      const activeEffects = combatant.activeEffects.filter(
        (effect) => !sameTargetActionConditionSource(effect, source),
      );
      return [
        combatantId,
        activeEffects.length === combatant.activeEffects.length
          ? combatant
          : battleCreatureWithoutExpiringSpellEffects(
              combatant,
              activeEffects,
              expiringEffects,
            ),
      ] as const;
    }),
  );
  return {
    ...state,
    combatants: combatantsAfterConcentrationSpellEffectsEndedIfNoEffects(
      combatants,
      {
        sourceCombatantId: source.sourceCombatantId,
        sourceSpellId: source.sourceSpellId,
      },
    ),
  };
}

function battleCreatureWithoutExpiringSpellEffects(
  combatant: BattleCreatureState,
  activeEffects: readonly BattleActiveEffect[],
  expiringEffects: readonly BattleActiveEffect[],
): BattleCreatureState {
  return combatant.positiveHpUnconscious === null
    ? {
        ...combatant,
        activeEffects,
        conditions: conditionsAfterExpiringSpellConditionEffects(
          combatant.conditions,
          activeEffects,
          expiringEffects,
        ),
      }
    : { ...combatant, activeEffects };
}

export function combatantWithSanctuaryWard(
  target: BattleCreatureState,
  invocation: SanctuaryTargetingInterdictionSpellInvocation,
): BattleCreatureState {
  const replacing = target.activeEffects.filter(
    (effect) =>
      effect.kind === "sanctuaryWard" &&
      effect.sourceSpellId === invocation.activeEffect.sourceSpellId,
  );
  return battleCreatureWithSpellActiveEffects(target, [
    ...target.activeEffects.filter((effect) => !replacing.includes(effect)),
    invocation.activeEffect,
  ]);
}
