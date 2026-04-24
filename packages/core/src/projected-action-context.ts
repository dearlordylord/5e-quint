import type { BattleCreatureState } from "#/battle-machine-types.ts";
import {
  getSpellRecordStrict,
  makeSpellLibrary,
  SRD_SPELLS,
} from "#/features/spell-registry.ts";
import type { DndContext } from "#/machine-types.ts";
import { compileProjectedExecutable } from "#/projected-compiler.ts";
import type { ProjectedExecutableAction } from "#/projected-executable.ts";
import type { ProjectedInterpreterActor } from "#/projected-mechanic-interpreter.ts";
import { spellId, type SpellName } from "#/types.ts";
import {
  decodeClassFeatureRecordSync,
  decodeSpellRecordSync,
} from "@dnd/prototype-content-surface/surface/schema";
import type {
  ClassFeatureRecord,
  SpellRecord,
} from "@dnd/prototype-content-surface/surface/types";
import { Match } from "effect";

import type { ProjectedAvailabilityState } from "#/projected-action-bridge-helpers.ts";
import acidSplashSurface from "../../prototype-content-surface/content/acid_splash.json";
import actionSurgeSurface from "../../prototype-content-surface/content/fighter_action_surge_l2.json";
import secondWindSurface from "../../prototype-content-surface/content/fighter_second_wind.json";

const ACID_SPLASH_SURFACE: SpellRecord =
  decodeSpellRecordSync(acidSplashSurface);
const SECOND_WIND_SURFACE: ClassFeatureRecord =
  decodeClassFeatureRecordSync(secondWindSurface);
const ACTION_SURGE_SURFACE: ClassFeatureRecord =
  decodeClassFeatureRecordSync(actionSurgeSurface);

const PROJECTED_SPELL_SAVE_DC_FALLBACK = 8;

export const SECOND_WIND_PROJECTED_ACTION =
  compileProjectedExecutable(SECOND_WIND_SURFACE);
export const ACTION_SURGE_PROJECTED_ACTION =
  compileProjectedExecutable(ACTION_SURGE_SURFACE);
export const SPELL_LIBRARY = makeSpellLibrary(SRD_SPELLS);

export function projectedPreparedSpellAction(
  spellName: SpellName,
): ProjectedExecutableAction | null {
  return Match.value(spellName).pipe(
    Match.when("acid_splash", () =>
      compileProjectedExecutable(ACID_SPLASH_SURFACE),
    ),
    Match.orElse(() => null),
  );
}

export function projectedCharacterLevel(context: DndContext): number {
  return Object.values(context.classStates).reduce(
    (total, entry) => total + (entry?.level ?? 0),
    0,
  );
}

export function projectedSpellSaveDc(
  context: DndContext,
  spellName: SpellName,
): number | null {
  const explicitDc = context.preparedSpellSaveDCs.get(spellId(spellName));
  if (explicitDc != null) return explicitDc;

  return projectedPreparedSpellAction(spellName) == null
    ? null
    : PROJECTED_SPELL_SAVE_DC_FALLBACK;
}

export function projectedActorFromCreatureContext(
  context: DndContext,
  spellName: SpellName,
): ProjectedInterpreterActor {
  return {
    actorId: context.selfId ?? "self",
    characterLevel: projectedCharacterLevel(context),
    fighterLevel: context.classStates.fighter?.level ?? 0,
    spellSaveDc: projectedSpellSaveDc(context, spellName),
  };
}

export function projectedNonSpellActorFromCreatureContext(
  context: DndContext,
): ProjectedInterpreterActor {
  return {
    actorId: context.selfId ?? "self",
    characterLevel: projectedCharacterLevel(context),
    fighterLevel: context.classStates.fighter?.level ?? 0,
    spellSaveDc: null,
  };
}

export function projectedActorFromBattleCreature(
  actorId: string,
  actor: BattleCreatureState,
): ProjectedInterpreterActor {
  return {
    actorId,
    characterLevel: Math.max(actor.fighterLevel, 1),
    fighterLevel: actor.fighterLevel,
    spellSaveDc: null,
  };
}

export function projectedCreatureAvailabilityState(
  context: DndContext,
): ProjectedAvailabilityState {
  return {
    fighterLevel: context.classStates.fighter?.level ?? 0,
    secondWindCharges: context.classStates.fighter?.secondWindCharges ?? 0,
    actionSurgeCharges: context.classStates.fighter?.actionSurgeCharges ?? 0,
    actionSurgeUsedThisTurn:
      context.classStates.fighter?.actionSurgeUsedThisTurn ?? false,
    bonusActionUsed: context.bonusActionUsed,
    actionsRemaining: context.actionsRemaining,
  };
}

export function projectedBattleFighterAvailabilityState(
  actor: BattleCreatureState,
): ProjectedAvailabilityState {
  return {
    fighterLevel: actor.fighterLevel,
    secondWindCharges: 0,
    actionSurgeCharges: actor.actionSurgeCharges,
    actionSurgeUsedThisTurn: actor.actionSurgeUsedThisTurn,
    bonusActionUsed: actor.bonusActionUsed,
    actionsRemaining: actor.actionsRemaining,
  };
}

export function projectedPreparedSpellDefinition(spellName: SpellName) {
  return getSpellRecordStrict(SPELL_LIBRARY, spellName);
}
