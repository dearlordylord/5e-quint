// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ongoing-spell-ending

import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { difficultyClass } from "@dnd/shared/types";
import {
  maybeOpenReactionWindow,
  snapshotBattle,
  type ActionSpellBattleResolutionInput,
  type BattleActiveEffect,
  type BattleCreatureState,
  type BattleOngoingSpellEffectRef,
  type BattleOngoingSpellTarget,
  type BattleOngoingSpellTargetChoiceHole,
  type BattleOngoingSpellTargetWithinRangeFact,
  type BattleResolutionResult,
  type BattleSpellcastingAbilityCheckHole,
  type BattleState,
  type BattleTrackedOngoingSpellLightEmitter,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";
import { needsHolesResult } from "./hole-helpers.ts";
import { invalidResult } from "./result-helpers.ts";
import {
  isTrackedOngoingSpellLightEmitter,
  ongoingSpellEffectRefEquals,
  ongoingSpellEffectRefForActiveEffect,
  ongoingSpellEffectRefForEmitter,
  ongoingSpellEffectRefKey,
} from "./antimagic-field-suppression.ts";
import { combatantsAfterConcentrationSpellEffectsEndedIfNoEffects } from "./spell-condition-effects-helpers.ts";
import { spellCastReactionFrame } from "./spell-cast-reaction-frame.ts";
import type { BattleSpellEffectLevel } from "./spells-effective-level.ts";
import type { SpellFillSet } from "./spells-resolve-fill-set.ts";
import { spendSpellCastResources } from "./spells-resolve-resources.ts";

export const ONGOING_SPELL_TARGET_CHOICE_HOLE_ID = holeId(
  "battle:spell:ongoing-end:target",
);
export const ONGOING_SPELL_TARGET_CHOICE_HOLE_INSTANCE = holeInstanceKey(
  "battle:spell:ongoing-end:target",
);

type TrackedDispellableOngoingSpellActiveEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "spellObjectContactDamage" }
>;

type BattleTrackedOngoingSpellOccurrence =
  | {
      readonly kind: "lightEmitter";
      readonly emitter: BattleTrackedOngoingSpellLightEmitter;
    }
  | {
      readonly kind: "activeEffect";
      readonly effect: TrackedDispellableOngoingSpellActiveEffect;
    };

export function ongoingSpellTargetChoiceHole(
  state: BattleState,
  casterId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "ongoingSpellEnd" }
  >,
): BattleOngoingSpellTargetChoiceHole {
  return {
    holeInstanceKey: ONGOING_SPELL_TARGET_CHOICE_HOLE_INSTANCE,
    holeId: ONGOING_SPELL_TARGET_CHOICE_HOLE_ID,
    kind: "ongoingSpellTargetChoice",
    label: `${invocation.spell.name} target`,
    requiresTableSpatialFact: true,
    casterId,
    spellId: invocation.spell.id,
    rangeFeet: invocation.rangeFeet,
    choices: ongoingSpellTargetChoices(state),
  };
}

export function ongoingSpellTargetEquals(
  left: BattleOngoingSpellTarget,
  right: BattleOngoingSpellTarget,
): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === "combatant" && right.kind === "combatant") {
    return left.combatantId === right.combatantId;
  }
  if (left.kind === "object" && right.kind === "object") {
    return left.objectId === right.objectId;
  }
  return (
    left.kind === "magicalEffect" &&
    right.kind === "magicalEffect" &&
    ongoingSpellEffectRefEquals(left.effect, right.effect)
  );
}

export function ongoingSpellTargetMatchesFact(input: {
  readonly fact: BattleOngoingSpellTargetWithinRangeFact;
  readonly casterId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "ongoingSpellEnd" }
  >;
  readonly target: BattleOngoingSpellTarget;
}): boolean {
  return (
    input.fact.kind === "ongoingSpellTargetWithinRange" &&
    input.fact.casterId === input.casterId &&
    input.fact.spellId === input.invocation.spell.id &&
    Number(input.fact.rangeFeet) <= Number(input.invocation.rangeFeet) &&
    ongoingSpellTargetEquals(input.fact.target, input.target)
  );
}

export function resolveOngoingSpellEndSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "ongoingSpellEnd" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  const unrelatedFill = ongoingSpellEndUnrelatedFill(input.fillSet);
  if (unrelatedFill !== null) {
    return invalidResult(input.input.state, "invalidFill", unrelatedFill);
  }
  if (input.fillSet.ongoingSpellTarget === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      ongoingSpellTargetChoiceHole(
        input.input.state,
        input.actorId,
        input.invocation,
      ),
    ]);
  }
  if (
    input.fillSet.ongoingSpellTarget.holeId !==
    ONGOING_SPELL_TARGET_CHOICE_HOLE_ID
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Ongoing spell target fill must use the selected spell act target hole.",
    );
  }
  const selectedTarget = input.fillSet.ongoingSpellTarget.target;
  if (
    !input.fillSet.ongoingSpellTarget.spatialFacts.some((fact) =>
      ongoingSpellTargetMatchesFact({
        fact,
        casterId: input.actorId,
        invocation: input.invocation,
        target: selectedTarget,
      }),
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Ongoing spell target does not satisfy the selected spell's range.",
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    spellCastReactionFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds:
        selectedTarget.kind === "combatant" ? [selectedTarget.combatantId] : [],
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "magicAction" },
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

  const targetOccurrences = matchingTrackedOngoingSpellOccurrences(
    input.input.state,
    selectedTarget,
  );
  const casterSlotLevel = Number(input.invocation.resource.slotLevel);
  const automaticallyEnded = targetOccurrences.filter(
    (occurrence) =>
      ongoingSpellOccurrenceSourceSpellLevel(occurrence) <= casterSlotLevel,
  );
  const gatedOccurrences = targetOccurrences.filter(
    (occurrence) =>
      ongoingSpellOccurrenceSourceSpellLevel(occurrence) > casterSlotLevel,
  );
  const gatedHoles = gatedOccurrences.map((occurrence) =>
    ongoingSpellEndAbilityCheckHole(
      input.actorId,
      input.invocation,
      selectedTarget,
      occurrence,
    ),
  );
  const abilityCheckByHoleId = new Map(
    input.fillSet.ongoingSpellAbilityChecks.map((fill) => [fill.holeId, fill]),
  );
  const unknownAbilityCheck = input.fillSet.ongoingSpellAbilityChecks.find(
    (fill) => !gatedHoles.some((hole) => hole.holeId === fill.holeId),
  );
  if (unknownAbilityCheck !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Ongoing spell ending ability check fill does not match this spell act.",
    );
  }
  const missingHoles = gatedHoles.filter(
    (hole) => !abilityCheckByHoleId.has(hole.holeId),
  );
  if (missingHoles.length > 0) {
    return needsHolesResult(
      input.input.state,
      input.input.subject,
      missingHoles,
    );
  }

  const successfullyChecked = gatedOccurrences.filter((occurrence) => {
    const hole = ongoingSpellEndAbilityCheckHole(
      input.actorId,
      input.invocation,
      selectedTarget,
      occurrence,
    );
    const fill = abilityCheckByHoleId.get(hole.holeId);
    return fill !== undefined && fill.value.total >= Number(hole.dc);
  });
  const endedKeys = new Set(
    [...automaticallyEnded, ...successfullyChecked].map((occurrence) =>
      ongoingSpellEffectRefKey(ongoingSpellOccurrenceRef(occurrence)),
    ),
  );
  const combatantsWithoutDispelledEffects: ReadonlyMap<
    CombatantId,
    BattleCreatureState
  > = new Map(
    [...input.input.state.combatants].map(([combatantId, combatant]) => {
      let removedTrackedEffect = false;
      const activeEffects = combatant.activeEffects.filter((effect) => {
        const keep =
          !isTrackedDispellableOngoingSpellActiveEffect(effect) ||
          !endedKeys.has(
            ongoingSpellEffectRefKey(
              ongoingSpellEffectRefForActiveEffect(effect),
            ),
          );
        if (!keep) {
          removedTrackedEffect = true;
        }
        return keep;
      });
      const nextCombatant = removedTrackedEffect
        ? { ...combatant, activeEffects }
        : combatant;
      return [combatantId, nextCombatant] as const;
    }),
  );
  const concentrationSources = uniqueConcentrationSources(
    [...automaticallyEnded, ...successfullyChecked].flatMap((occurrence) =>
      occurrence.kind === "activeEffect" &&
      occurrence.effect.expiresAt.kind === "concentration"
        ? [
            {
              sourceCombatantId: occurrence.effect.sourceCombatantId,
              sourceSpellId: occurrence.effect.sourceSpellId,
            },
          ]
        : [],
    ),
  );
  const combatants = concentrationSources.reduce<
    ReadonlyMap<CombatantId, BattleCreatureState>
  >(
    (currentCombatants, source) =>
      combatantsAfterConcentrationSpellEffectsEndedIfNoEffects(
        currentCombatants,
        source,
      ),
    combatantsWithoutDispelledEffects,
  );
  const effected: BattleState = {
    ...input.input.state,
    combatants,
    lightEmitters: input.input.state.lightEmitters.filter(
      (emitter) =>
        !(
          isTrackedOngoingSpellLightEmitter(emitter) &&
          endedKeys.has(
            ongoingSpellEffectRefKey(ongoingSpellEffectRefForEmitter(emitter)),
          )
        ),
    ),
  };
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resourced.tag === "invalid"
    ? resourced
    : {
        tag: "resolved",
        state: resourced.state,
        snapshot: snapshotBattle(resourced.state),
      };
}

export function ongoingSpellEndAbilityCheckHole(
  casterId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "ongoingSpellEnd" }
  >,
  target: BattleOngoingSpellTarget,
  occurrence: BattleTrackedOngoingSpellOccurrence,
): BattleSpellcastingAbilityCheckHole {
  const effect = ongoingSpellOccurrenceRef(occurrence);
  const contestedSpellLevel = ongoingSpellOccurrenceSourceSpellLevel(occurrence);
  const dc = difficultyClass(10 + contestedSpellLevel);
  return {
    holeInstanceKey: holeInstanceKey(
      `battle:spell:ongoing-end:check:${ongoingSpellEffectRefKey(effect)}`,
    ),
    holeId: holeId(
      `battle:spell:ongoing-end:check:${ongoingSpellEffectRefKey(effect)}`,
    ),
    kind: "spellcastingAbilityCheck",
    label: `${invocation.spell.name} spellcasting ability check (DC ${dc})`,
    dc,
    spellcastingAbilityCheck: {
      casterId,
      sourceSpellId: invocation.spell.id,
      target,
      effect,
      contestedSpellLevel,
    },
  };
}

function ongoingSpellTargetChoices(
  state: BattleState,
): readonly BattleOngoingSpellTarget[] {
  const choices: BattleOngoingSpellTarget[] = [...state.combatants.keys()].map(
    (combatantId) => ({
      kind: "combatant" as const,
      combatantId,
    }),
  );
  for (const emitter of state.lightEmitters) {
    if (!isTrackedOngoingSpellLightEmitter(emitter)) {
      continue;
    }
    if (emitter.attachment.kind === "object") {
      pushUniqueOngoingSpellTarget(choices, {
        kind: "object",
        objectId: emitter.attachment.objectId,
      });
    }
    pushUniqueOngoingSpellTarget(choices, {
      kind: "magicalEffect",
      effect: ongoingSpellEffectRefForEmitter(emitter),
    });
  }
  for (const combatant of state.combatants.values()) {
    for (const effect of combatant.activeEffects) {
      if (!isTrackedDispellableOngoingSpellActiveEffect(effect)) {
        continue;
      }
      pushUniqueOngoingSpellTarget(choices, {
        kind: "object",
        objectId: effect.objectId,
      });
      pushUniqueOngoingSpellTarget(choices, {
        kind: "magicalEffect",
        effect: ongoingSpellEffectRefForActiveEffect(effect),
      });
    }
  }
  return choices;
}

function matchingTrackedOngoingSpellOccurrences(
  state: BattleState,
  target: BattleOngoingSpellTarget,
): readonly BattleTrackedOngoingSpellOccurrence[] {
  const lightEmitters = state.lightEmitters.flatMap((emitter) =>
    isTrackedOngoingSpellLightEmitter(emitter) &&
    spellLightEmitterMatchesOngoingTarget(emitter, target)
      ? [{ kind: "lightEmitter" as const, emitter }]
      : [],
  );
  const activeEffects = [...state.combatants.values()].flatMap((combatant) =>
    combatant.activeEffects.flatMap((effect) =>
      isTrackedDispellableOngoingSpellActiveEffect(effect) &&
      dispellableActiveEffectMatchesOngoingTarget(effect, target)
        ? [{ kind: "activeEffect" as const, effect }]
        : [],
    ),
  );
  return [...lightEmitters, ...activeEffects];
}

function spellLightEmitterMatchesOngoingTarget(
  emitter: BattleTrackedOngoingSpellLightEmitter,
  target: BattleOngoingSpellTarget,
): boolean {
  if (target.kind === "magicalEffect") {
    return ongoingSpellEffectRefEquals(
      ongoingSpellEffectRefForEmitter(emitter),
      target.effect,
    );
  }
  if (target.kind === "combatant") {
    return (
      emitter.attachment.kind === "combatant" &&
      emitter.attachment.combatantId === target.combatantId
    );
  }
  return (
    emitter.attachment.kind === "object" &&
    emitter.attachment.objectId === target.objectId
  );
}

function dispellableActiveEffectMatchesOngoingTarget(
  effect: TrackedDispellableOngoingSpellActiveEffect,
  target: BattleOngoingSpellTarget,
): boolean {
  if (target.kind === "magicalEffect") {
    return ongoingSpellEffectRefEquals(
      ongoingSpellEffectRefForActiveEffect(effect),
      target.effect,
    );
  }
  if (target.kind === "combatant") {
    return false;
  }
  return effect.objectId === target.objectId;
}

function ongoingSpellEndUnrelatedFill(
  fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>,
): string | null {
  return fillSet.targetId !== undefined ||
    fillSet.objectTarget !== undefined ||
    fillSet.objectContactTargets !== undefined ||
    fillSet.objectContactSavingThrowOutcome !== undefined ||
    fillSet.objectDropResolution !== undefined ||
    fillSet.targetSpatialFacts.length > 0 ||
    fillSet.targetAllocation !== undefined ||
    fillSet.targetList !== undefined ||
    fillSet.attackSequencePartFills.some(
      (part) =>
        part.target !== undefined ||
        part.attackRoll !== undefined ||
        part.mirrorImageDuplicateRoll !== undefined ||
        part.damageRoll !== undefined,
    ) ||
    fillSet.attackRoll !== undefined ||
    fillSet.savingThrowOutcomes !== undefined ||
    fillSet.skillChoice !== undefined ||
    fillSet.abilityChoice !== undefined ||
    fillSet.thaumaturgyActiveOneMinuteEffectCount !== undefined ||
    fillSet.commandOptionChoice !== undefined ||
    fillSet.selfTransformationModeChoice !== undefined ||
    fillSet.conditionChoice !== undefined ||
    fillSet.areaChoice !== undefined ||
    fillSet.teleportDestination !== undefined ||
    fillSet.dancingLightsPlacement !== undefined ||
    fillSet.damageTypeChoice !== undefined ||
    fillSet.concentrationSavingThrows.length > 0 ||
    fillSet.hideousLaughterDamageRepeatSaves.length > 0 ||
    fillSet.damageDispositions.length > 0 ||
    fillSet.damageRoll !== undefined ||
    fillSet.mirrorImageDuplicateRoll !== undefined ||
    fillSet.movement !== undefined ||
    fillSet.spellDamageReductionRolls.length > 0 ||
    fillSet.attackBurstDamageRoll !== undefined ||
    fillSet.healingRoll !== undefined
    ? "Ongoing spell ending uses only an ongoing spell target fill and spellcasting ability check fills."
    : null;
}

function pushUniqueOngoingSpellTarget(
  targets: BattleOngoingSpellTarget[],
  target: BattleOngoingSpellTarget,
): void {
  if (
    !targets.some((candidate) => ongoingSpellTargetEquals(candidate, target))
  ) {
    targets.push(target);
  }
}

function isTrackedDispellableOngoingSpellActiveEffect(
  effect: BattleActiveEffect,
): effect is TrackedDispellableOngoingSpellActiveEffect {
  return effect.kind === "spellObjectContactDamage";
}

function ongoingSpellOccurrenceRef(
  occurrence: BattleTrackedOngoingSpellOccurrence,
): BattleOngoingSpellEffectRef {
  return occurrence.kind === "lightEmitter"
    ? ongoingSpellEffectRefForEmitter(occurrence.emitter)
    : ongoingSpellEffectRefForActiveEffect(occurrence.effect);
}

function ongoingSpellOccurrenceSourceSpellLevel(
  occurrence: BattleTrackedOngoingSpellOccurrence,
): BattleSpellEffectLevel {
  return occurrence.kind === "lightEmitter"
    ? occurrence.emitter.sourceSpellLevel
    : occurrence.effect.sourceSpellLevel;
}

function uniqueConcentrationSources(
  sources: readonly {
    readonly sourceCombatantId: CombatantId;
    readonly sourceSpellId: string;
  }[],
): readonly {
  readonly sourceCombatantId: CombatantId;
  readonly sourceSpellId: string;
}[] {
  const unique: (typeof sources)[number][] = [];
  for (const source of sources) {
    const alreadyTracked = unique.some(
      (tracked) =>
        tracked.sourceCombatantId === source.sourceCombatantId &&
        tracked.sourceSpellId === source.sourceSpellId,
    );
    if (!alreadyTracked) {
      unique.push(source);
    }
  }
  return unique;
}
