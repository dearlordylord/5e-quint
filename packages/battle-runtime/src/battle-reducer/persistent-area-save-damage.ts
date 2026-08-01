import { rolledDiceTotal } from "@dnd/shared-algebras/runtime-dice-algebra";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { Match } from "effect";

import type { BattleInterruptTrigger } from "../battle-interrupt-triggers.ts";
import type {
  BattleCloudkillAreaMembershipTrigger,
  BattleInsectPlagueAreaMembershipTrigger,
  BattleSubject,
} from "../battle-subjects.ts";
import type {
  BattleActiveEffect,
  BattleCloudkillAreaHazardDamageRollHole,
  BattleCloudkillAreaHazardSavingThrowOutcomeHole,
  BattleCloudkillAreaHazardTrigger,
  BattleCreatureState,
  BattleFill,
  BattleInsectPlagueAreaHazardDamageRollHole,
  BattleInsectPlagueAreaHazardSavingThrowOutcomeHole,
  BattleInsectPlagueAreaHazardTrigger,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleSavingThrowOutcome,
  BattleState,
} from "../battle-state-execution.ts";
import { validateRolledDiceFillForDiceExpr } from "../battle-state-execution.ts";
import type { BattleAreaId, CombatantId } from "../identity.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import { concentrationSavingThrowHole } from "./damage-apply.ts";
import { damageAmountAfterTargetAdjustments } from "./damage-helpers.ts";
import {
  rolledDiceFillForHole,
  savingThrowOutcomeFillForHole,
} from "./fill-hole-protocol.ts";
import { maybeOpenInterruptWindow } from "./interrupt-execution.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import { invalidResult } from "./result-helpers.ts";
import {
  markCloudkillAreaHazardSavedThisTurn,
  markInsectPlagueAreaHazardSavedThisTurn,
} from "./spells-active-effects.ts";
import {
  applyPreparedSlotSpellDamage,
  applySaveDamageResult,
  savingThrowFlatBonusProjections,
  savingThrowRollModeProjections,
} from "./spells-damage-fills.ts";
import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";

type InsectPlagueAreaHazardEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "insectPlagueAreaHazard" }
>;

type CloudkillAreaHazardEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "cloudkillAreaHazard" }
>;

type InsectPlagueResolutionInput = BattleResolutionInput & {
  readonly subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "insectPlagueAreaHazardSave";
    }
  >;
  readonly handledInterruptTrigger?: BattleInterruptTrigger;
};

type CloudkillResolutionInput = BattleResolutionInput & {
  readonly subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "cloudkillAreaHazardSave";
    }
  >;
  readonly handledInterruptTrigger?: BattleInterruptTrigger;
};

type SaveTurnTracking =
  | { readonly kind: "appearance" }
  | {
      readonly kind: "trackForCurrentTurn";
      readonly apply: (state: BattleState) => BattleState;
    };

type ParsedPersistentAreaSaveDamageProcedure =
  | {
      readonly kind: "insectPlague";
      readonly resolution: InsectPlagueResolutionInput;
      readonly target: BattleCreatureState;
      readonly effect: InsectPlagueAreaHazardEffect;
      readonly saveHole: BattleInsectPlagueAreaHazardSavingThrowOutcomeHole;
      readonly damageHole: BattleInsectPlagueAreaHazardDamageRollHole;
      readonly turnTracking: SaveTurnTracking;
    }
  | {
      readonly kind: "cloudkill";
      readonly resolution: CloudkillResolutionInput;
      readonly target: BattleCreatureState;
      readonly effect: CloudkillAreaHazardEffect;
      readonly saveHole: BattleCloudkillAreaHazardSavingThrowOutcomeHole;
      readonly damageHole: BattleCloudkillAreaHazardDamageRollHole;
      readonly turnTracking: SaveTurnTracking;
    };

type PersistentAreaProcedureParseResult =
  | {
      readonly tag: "parsed";
      readonly procedure: ParsedPersistentAreaSaveDamageProcedure;
    }
  | {
      readonly tag: "invalid";
      readonly result: Extract<
        BattleResolutionResult,
        { readonly tag: "invalid" }
      >;
    };

export function resolveInsectPlagueAreaSaveDamage(
  resolution: InsectPlagueResolutionInput,
): BattleResolutionResult {
  const allowedFillIssue = persistentAreaAllowedFillIssue(
    resolution,
    "Insect Plague",
  );
  if (allowedFillIssue !== null) {
    return allowedFillIssue;
  }
  const parsed = parseInsectPlagueAreaSaveDamage(resolution);
  return parsed.tag === "invalid"
    ? parsed.result
    : resolveParsedPersistentAreaSaveDamage(parsed.procedure);
}

export function resolveCloudkillAreaSaveDamage(
  resolution: CloudkillResolutionInput,
): BattleResolutionResult {
  const allowedFillIssue = persistentAreaAllowedFillIssue(
    resolution,
    "Cloudkill",
  );
  if (allowedFillIssue !== null) {
    return allowedFillIssue;
  }
  const parsed = parseCloudkillAreaSaveDamage(resolution);
  return parsed.tag === "invalid"
    ? parsed.result
    : resolveParsedPersistentAreaSaveDamage(parsed.procedure);
}

function persistentAreaAllowedFillIssue(
  resolution: BattleResolutionInput,
  procedureName: "Insect Plague" | "Cloudkill",
): Extract<BattleResolutionResult, { readonly tag: "invalid" }> | null {
  return resolution.fills.some(
    (fill) =>
      fill.kind !== "savingThrowOutcome" &&
      fill.kind !== "rolledDice" &&
      fill.kind !== "concentrationSavingThrow",
  )
    ? invalidResult(
        resolution.state,
        "invalidFill",
        `${procedureName} save accepts only save, damage, and Concentration fills.`,
      )
    : null;
}

function parseInsectPlagueAreaSaveDamage(
  resolution: InsectPlagueResolutionInput,
): PersistentAreaProcedureParseResult {
  const effect = activeEffectForArea(
    resolution.state,
    resolution.subject.areaMembershipTrigger.areaId,
    (candidate): candidate is InsectPlagueAreaHazardEffect =>
      candidate.kind === "insectPlagueAreaHazard",
  );
  const target = resolution.state.combatants.get(resolution.subject.actorId);
  if (effect === undefined || target === undefined) {
    return {
      tag: "invalid",
      result: invalidResult(
        resolution.state,
        "staleSubject",
        "Insect Plague save is no longer available.",
      ),
    };
  }
  const trigger = insectPlagueTriggerFromMembershipFact(
    resolution.subject.areaMembershipTrigger,
  );
  if (
    trigger !== "appearsInArea" &&
    effect.savedThisTurn.includes(resolution.subject.actorId)
  ) {
    return {
      tag: "invalid",
      result: invalidResult(
        resolution.state,
        "staleSubject",
        "Insect Plague save was already resolved for this target this turn.",
      ),
    };
  }
  return {
    tag: "parsed",
    procedure: {
      kind: "insectPlague",
      resolution,
      target,
      effect,
      saveHole: insectPlagueAreaHazardSavingThrowOutcomeHole(
        resolution.state,
        resolution.subject.actorId,
        effect,
        trigger,
      ),
      damageHole: insectPlagueAreaHazardDamageRollHole(
        resolution.subject.actorId,
        effect,
        trigger,
      ),
      turnTracking:
        trigger === "appearsInArea"
          ? { kind: "appearance" }
          : {
              kind: "trackForCurrentTurn",
              apply: (state) =>
                markInsectPlagueAreaHazardSavedThisTurn(
                  state,
                  resolution.subject.actorId,
                  effect,
                ),
            },
    },
  };
}

function parseCloudkillAreaSaveDamage(
  resolution: CloudkillResolutionInput,
): PersistentAreaProcedureParseResult {
  const effect = activeEffectForArea(
    resolution.state,
    resolution.subject.areaMembershipTrigger.areaId,
    (candidate): candidate is CloudkillAreaHazardEffect =>
      candidate.kind === "cloudkillAreaHazard",
  );
  if (effect === undefined) {
    return {
      tag: "invalid",
      result: invalidResult(
        resolution.state,
        "staleSubject",
        "Cloudkill save is no longer available.",
      ),
    };
  }
  const target = resolution.state.combatants.get(resolution.subject.actorId);
  if (target === undefined) {
    return {
      tag: "invalid",
      result: invalidResult(
        resolution.state,
        "staleSubject",
        "Cloudkill save target is no longer available.",
      ),
    };
  }
  const trigger = cloudkillTriggerFromMembershipFact(
    resolution.subject.areaMembershipTrigger,
  );
  if (
    trigger !== "appearsInArea" &&
    effect.savedThisTurn.includes(resolution.subject.actorId)
  ) {
    return {
      tag: "invalid",
      result: invalidResult(
        resolution.state,
        "staleSubject",
        "Cloudkill save was already resolved for this target this turn.",
      ),
    };
  }
  return {
    tag: "parsed",
    procedure: {
      kind: "cloudkill",
      resolution,
      target,
      effect,
      saveHole: cloudkillAreaHazardSavingThrowOutcomeHole(
        resolution.state,
        resolution.subject.actorId,
        effect,
        trigger,
      ),
      damageHole: cloudkillAreaHazardDamageRollHole(
        resolution.subject.actorId,
        effect,
        trigger,
      ),
      turnTracking:
        trigger === "appearsInArea"
          ? { kind: "appearance" }
          : {
              kind: "trackForCurrentTurn",
              apply: (state) =>
                markCloudkillAreaHazardSavedThisTurn(
                  state,
                  resolution.subject.actorId,
                  effect,
                ),
            },
    },
  };
}

function resolveParsedPersistentAreaSaveDamage(
  procedure: ParsedPersistentAreaSaveDamageProcedure,
): BattleResolutionResult {
  const { resolution, target, effect, saveHole, damageHole } = procedure;
  const procedureName = persistentAreaProcedureName(procedure.kind);
  const saveFills = resolution.fills.filter(
    (
      fill,
    ): fill is Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> =>
      fill.kind === "savingThrowOutcome" && fill.holeId === saveHole.holeId,
  );
  const damageFills = resolution.fills.filter(
    (fill): fill is Extract<BattleFill, { readonly kind: "rolledDice" }> =>
      fill.kind === "rolledDice" && fill.holeId === damageHole.holeId,
  );
  /* v8 ignore start -- Malformed fill set: each discovered persistent-area save and damage hole can be answered only once. */
  if (saveFills.length > 1 || damageFills.length > 1) {
    return invalidResult(
      resolution.state,
      "invalidFill",
      `${procedureName} save received duplicate fills.`,
    );
  }
  /* v8 ignore stop */

  const saveFill = savingThrowOutcomeFillForHole(saveFills, saveHole);
  if (saveFill === undefined) {
    return needsHolesResult(resolution.state, resolution.subject, [saveHole]);
  }
  const parsedSave = parseSingleTargetPersistentAreaSave(
    saveFill,
    resolution.subject.actorId,
    procedureName,
  );
  /* v8 ignore start -- Malformed fill: the save outcome must answer the discovered single-target hole for the triggering actor. */
  if (parsedSave.tag === "invalid") {
    return invalidResult(resolution.state, "invalidFill", parsedSave.message);
  }
  /* v8 ignore stop */
  const saveOutcome = parsedSave.outcome;
  if (!saveOutcome.succeeded) {
    const saveFailedReactionWindow = maybeOpenInterruptWindow(
      resolution.state,
      {
        trigger: "saveFailed",
        targetId: resolution.subject.actorId,
        sourceProcedureRef: effect.sourceProcedureRef,
        continuation: {
          kind: "replay",
          subject: resolution.subject,
          fills: resolution.fills,
        },
      },
      resolution.handledInterruptTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }

  const damageFill = rolledDiceFillForHole(damageFills, damageHole);
  if (damageFill === undefined) {
    return needsHolesResult(resolution.state, resolution.subject, [damageHole]);
  }
  const damageIssue = validateRolledDiceFillForDiceExpr(
    damageFill,
    effect.damage.expr,
  );
  /* v8 ignore start -- Malformed fill: the damage roll must match the exact expression carried by its discovered hole. */
  if (damageIssue !== null) {
    return invalidResult(resolution.state, "invalidFill", damageIssue);
  }
  /* v8 ignore stop */

  const adjustedDamage = persistentAreaAdjustedDamage({
    state: resolution.state,
    target,
    effect,
    damageFill,
    saveSucceeded: saveOutcome.succeeded,
  });
  const concentrationHole = concentrationSavingThrowHole(
    target,
    adjustedDamage,
  );
  const concentrationFills =
    concentrationHole === null
      ? []
      : resolution.fills.filter(
          (
            fill,
          ): fill is Extract<
            BattleFill,
            { readonly kind: "concentrationSavingThrow" }
          > =>
            fill.kind === "concentrationSavingThrow" &&
            fill.holeId === concentrationHole.holeId,
        );
  /* v8 ignore start -- Malformed fill set: a damaged concentrating target exposes at most one Concentration save hole. */
  if (concentrationFills.length > 1) {
    return invalidResult(
      resolution.state,
      "invalidFill",
      `${procedureName} save received duplicate Concentration save fills.`,
    );
  }
  /* v8 ignore stop */
  const concentrationFill =
    concentrationHole === null
      ? undefined
      : concentrationSavingThrowFillFor(concentrationFills, concentrationHole);
  if (concentrationHole !== null && concentrationFill === undefined) {
    return needsHolesResult(resolution.state, resolution.subject, [
      concentrationHole,
    ]);
  }

  const consumedHoleIds = new Set([
    saveHole.holeId,
    damageHole.holeId,
    ...(concentrationHole === null ? [] : [concentrationHole.holeId]),
  ]);
  /* v8 ignore start -- Malformed fill set: every supplied fill must answer a hole derived for this exact replay subject. */
  if (resolution.fills.some((fill) => !consumedHoleIds.has(fill.holeId))) {
    return invalidResult(
      resolution.state,
      "invalidFill",
      `${procedureName} save received a fill for an unrelated hole.`,
    );
  }
  /* v8 ignore stop */

  const afterDamage = applyPreparedSlotSpellDamage(
    resolution.state,
    resolution.subject.actorId,
    adjustedDamage,
    {
      damageSourceId: effect.sourceCombatantId,
      ...(concentrationFill === undefined
        ? {}
        : { concentrationSavingThrow: concentrationFill }),
      spatialFacts: [],
    },
  );
  const nextState =
    procedure.turnTracking.kind === "trackForCurrentTurn"
      ? procedure.turnTracking.apply(afterDamage)
      : afterDamage;
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function persistentAreaProcedureName(
  kind: ParsedPersistentAreaSaveDamageProcedure["kind"],
): "Insect Plague" | "Cloudkill" {
  return kind === "insectPlague" ? "Insect Plague" : "Cloudkill";
}

type ParsedSingleTargetSave =
  | { readonly tag: "parsed"; readonly outcome: BattleSavingThrowOutcome }
  | { readonly tag: "invalid"; readonly message: string };

function parseSingleTargetPersistentAreaSave(
  fill: Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>,
  targetId: CombatantId,
  procedureName: "Insect Plague" | "Cloudkill",
): ParsedSingleTargetSave {
  if ("area" in fill.value) {
    return {
      tag: "invalid",
      message: `${procedureName} Saving Throw outcome must not include area facts.`,
    };
  }
  const [outcome, ...additionalOutcomes] = fill.value.outcomes;
  if (
    outcome === undefined ||
    additionalOutcomes.length > 0 ||
    outcome.targetId !== targetId
  ) {
    return {
      tag: "invalid",
      message: `${procedureName} Saving Throw outcome must match the triggering target.`,
    };
  }
  return { tag: "parsed", outcome };
}

function persistentAreaAdjustedDamage(input: {
  readonly state: BattleState;
  readonly target: BattleCreatureState;
  readonly effect: InsectPlagueAreaHazardEffect | CloudkillAreaHazardEffect;
  readonly damageFill: Extract<BattleFill, { readonly kind: "rolledDice" }>;
  readonly saveSucceeded: boolean;
}): number {
  const rolledDamage =
    rolledDiceTotal(input.damageFill.value) +
    (input.effect.damage.expr.flat ?? 0);
  return damageAmountAfterTargetAdjustments(
    input.state,
    input.target,
    applySaveDamageResult(rolledDamage, input.saveSucceeded ? "half" : "full"),
    input.effect.damage.damageType,
  );
}

function activeEffectForArea<
  TEffect extends BattleActiveEffect & { readonly areaId: BattleAreaId },
>(
  state: BattleState,
  areaId: BattleAreaId,
  isExpectedEffect: (effect: BattleActiveEffect) => effect is TEffect,
): TEffect | undefined {
  for (const combatant of state.combatants.values()) {
    const effect = combatant.activeEffects.find(
      (candidate): candidate is TEffect =>
        isExpectedEffect(candidate) && candidate.areaId === areaId,
    );
    if (effect !== undefined) return effect;
  }
  return undefined;
}

const byInsectPlagueAreaMembershipTriggerKind = Match.discriminator("kind");

function insectPlagueTriggerFromMembershipFact(
  trigger: BattleInsectPlagueAreaMembershipTrigger,
): BattleInsectPlagueAreaHazardTrigger {
  return Match.value(trigger).pipe(
    byInsectPlagueAreaMembershipTriggerKind(
      "appearsInArea",
      () => "appearsInArea" as const,
    ),
    byInsectPlagueAreaMembershipTriggerKind(
      "firstEntryOnTurn",
      () => "entersArea" as const,
    ),
    byInsectPlagueAreaMembershipTriggerKind(
      "turnEndInArea",
      () => "endsTurnInArea" as const,
    ),
    Match.exhaustive,
  );
}

const byCloudkillAreaMembershipTriggerKind = Match.discriminator("kind");

function cloudkillTriggerFromMembershipFact(
  trigger: BattleCloudkillAreaMembershipTrigger,
): BattleCloudkillAreaHazardTrigger {
  return Match.value(trigger).pipe(
    byCloudkillAreaMembershipTriggerKind(
      "appearsInArea",
      () => "appearsInArea" as const,
    ),
    byCloudkillAreaMembershipTriggerKind(
      "areaMovesIntoSpace",
      () => "movesIntoSpace" as const,
    ),
    byCloudkillAreaMembershipTriggerKind(
      "firstEntryOnTurn",
      () => "entersArea" as const,
    ),
    byCloudkillAreaMembershipTriggerKind(
      "turnEndInArea",
      () => "endsTurnInArea" as const,
    ),
    Match.exhaustive,
  );
}

export function insectPlagueAreaHazardSavingThrowOutcomeHole(
  state: BattleState,
  targetId: CombatantId,
  effect: InsectPlagueAreaHazardEffect,
  trigger: BattleInsectPlagueAreaHazardTrigger,
): BattleInsectPlagueAreaHazardSavingThrowOutcomeHole {
  const key = `battle:insect-plague-area-hazard-save:${targetId}:${effect.sourceCombatantId}:${effect.sourceProcedureRef}:${effect.areaId}:${trigger}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${insectPlagueAreaHazardTriggerLabel(trigger)} CON save`,
    insectPlagueAreaHazard: {
      targetId,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      trigger,
      save: effect.save,
    },
    ability: effect.save.ability,
    dc: effect.save.dc,
    areaChoices: [],
    targetRollModes: savingThrowRollModeProjections(
      state,
      effect.save.ability,
    ).filter((projection) => projection.targetId === targetId),
    targetFlatBonuses: savingThrowFlatBonusProjections(
      state,
      effect.save.ability,
    ).filter((projection) => projection.targetId === targetId),
  };
}

function insectPlagueAreaHazardDamageRollHole(
  targetId: CombatantId,
  effect: InsectPlagueAreaHazardEffect,
  trigger: BattleInsectPlagueAreaHazardTrigger,
): BattleInsectPlagueAreaHazardDamageRollHole {
  const expr = `${effect.damage.expr.dice}d${effect.damage.expr.dieSize}`;
  const key = `battle:insect-plague-area-hazard-damage:${targetId}:${effect.sourceCombatantId}:${effect.sourceProcedureRef}:${effect.areaId}:${trigger}:${expr}`;
  return {
    kind: "rolledDice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${insectPlagueAreaHazardTriggerLabel(trigger)} damage (${expr})`,
    insectPlagueAreaHazard: {
      targetId,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      trigger,
      damage: effect.damage,
    },
    critical: false,
  };
}

function insectPlagueAreaHazardTriggerLabel(
  trigger: BattleInsectPlagueAreaHazardTrigger,
): string {
  return Match.value(trigger).pipe(
    Match.when("appearsInArea", () => "appearance"),
    Match.when("entersArea", () => "entry"),
    Match.when("endsTurnInArea", () => "end-turn"),
    Match.exhaustive,
  );
}

export function cloudkillAreaHazardSavingThrowOutcomeHole(
  state: BattleState,
  targetId: CombatantId,
  effect: CloudkillAreaHazardEffect,
  trigger: BattleCloudkillAreaHazardTrigger,
): BattleCloudkillAreaHazardSavingThrowOutcomeHole {
  const key = `battle:cloudkill-area-hazard-save:${targetId}:${effect.sourceCombatantId}:${effect.sourceProcedureRef}:${effect.areaId}:${trigger}`;
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${cloudkillAreaHazardTriggerLabel(trigger)} CON save`,
    cloudkillAreaHazard: {
      targetId,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      trigger,
      save: effect.save,
    },
    ability: effect.save.ability,
    dc: effect.save.dc,
    areaChoices: [],
    targetRollModes: savingThrowRollModeProjections(
      state,
      effect.save.ability,
    ).filter((projection) => projection.targetId === targetId),
    targetFlatBonuses: savingThrowFlatBonusProjections(
      state,
      effect.save.ability,
    ).filter((projection) => projection.targetId === targetId),
  };
}

function cloudkillAreaHazardDamageRollHole(
  targetId: CombatantId,
  effect: CloudkillAreaHazardEffect,
  trigger: BattleCloudkillAreaHazardTrigger,
): BattleCloudkillAreaHazardDamageRollHole {
  const expr = `${effect.damage.expr.dice}d${effect.damage.expr.dieSize}`;
  const key = `battle:cloudkill-area-hazard-damage:${targetId}:${effect.sourceCombatantId}:${effect.sourceProcedureRef}:${effect.areaId}:${trigger}:${expr}`;
  return {
    kind: "rolledDice",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `${cloudkillAreaHazardTriggerLabel(trigger)} damage (${expr})`,
    cloudkillAreaHazard: {
      targetId,
      sourceProcedureRef: effect.sourceProcedureRef,
      sourceCombatantId: effect.sourceCombatantId,
      areaId: effect.areaId,
      trigger,
      damage: effect.damage,
    },
    critical: false,
  };
}

function cloudkillAreaHazardTriggerLabel(
  trigger: BattleCloudkillAreaHazardTrigger,
): string {
  return Match.value(trigger).pipe(
    Match.when("appearsInArea", () => "appearance"),
    Match.when("movesIntoSpace", () => "cloud-movement"),
    Match.when("entersArea", () => "entry"),
    Match.when("endsTurnInArea", () => "end-turn"),
    Match.exhaustive,
  );
}
