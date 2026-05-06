/**
 * Layer A: Scene Snapshot — pure deterministic projection of BattleContext.
 * No coordinates (pixels), no time, no animation. Grid positions and game-unit measurements only.
 */
import { Option } from "effect";
import { battleSpellIds } from "#/battle-spell-access.ts";

import { isIncapacitated } from "#/battle-machine-creature.ts";
import type {
  AoESpellCtx,
  BattleContext,
  BattleCreatureState,
  BattleEvent,
  PendingInterrupt,
} from "#/battle-machine-types.ts";
import type { Condition, DamageType } from "#/types.ts";
import { CONDITIONS } from "#/types.ts";

// --- Scenario metadata (provided by demo, not in BattleContext) ---

export interface ScenarioMeta {
  names: Record<string, string>;
  teams: { blue: Array<string>; red: Array<string> };
  gridPositions: Record<string, { row: number; col: number }>;
  aoeTargetPoints: Record<string, { row: number; col: number }>;
  spellAnnotations: Record<string, string>;
  sprites?: Record<string, SpriteRect>;
}

export interface SpriteRect {
  url: string;
  x: number;
  y: number;
  w: number;
  h: number;
  imgW: number;
  imgH: number;
  /** Zoom factor for the sprite within the token circle (default 1). */
  scale?: number;
}

/** Everything needed to play back a battle scenario. */
export interface BattleScenario {
  events: ReadonlyArray<BattleEvent>;
  meta: ScenarioMeta;
}

// --- Snapshot types ---

export type InterruptKind = PendingInterrupt["tag"];

export type PhaseSnapshot =
  | { type: "activeTurn" }
  | {
      type: "interrupt";
      interruptKind: InterruptKind;
      reactorId?: string;
      spellCasterId?: string;
    }
  | {
      type: "aoeResolving";
      spellName: string;
      remainingCount: number;
      saveDC: number;
    }
  | { type: "traversalResolving"; remainingCount: number }
  | { type: "movement" }
  | { type: "legendaryAction" };

export interface CreatureSnapshot {
  id: string;
  name: string;
  team: "blue" | "red";
  sprite: SpriteRect | null;
  gridPos: { row: number; col: number };
  hpRatio: number;
  currentHp: number;
  maxHp: number;
  tempHp: number;
  unconscious: boolean;
  dead: boolean;
  reactionAvailable: boolean;
  concentrating: boolean;
  exhaustion: number;
  slotsByLevel: ReadonlyArray<{ current: number; max: number }>;
  deathSaves: { successes: number; failures: number };
  isActive: boolean;
  conditions: ReadonlyArray<Condition>;
  preparedSpells: ReadonlyArray<string>;
}

export interface AoEZoneSnapshot {
  zoneId: string;
  centerGridPos: { row: number; col: number };
  radiusFeet: number;
  damageType: DamageType;
  spellName: string;
}

export interface SceneSnapshot {
  creatures: ReadonlyArray<CreatureSnapshot>;
  phase: PhaseSnapshot;
  aoeZones: ReadonlyArray<AoEZoneSnapshot>;
  aoeTargetPoint: { row: number; col: number } | null;
  round: number;
  activeCreatureId: string | null;
}

// --- Pure projection functions ---

function extractConditions(cs: BattleCreatureState): ReadonlyArray<Condition> {
  const result: Array<Condition> = [];
  for (const c of CONDITIONS) {
    if (c === "incapacitated") {
      if (isIncapacitated(cs)) result.push(c);
    } else if (cs[c]) {
      result.push(c);
    }
  }
  return result;
}

function deriveCreature(
  id: string,
  cs: BattleCreatureState,
  meta: ScenarioMeta,
  activeId: string | null,
  blueSet: ReadonlySet<string>,
): CreatureSnapshot {
  return {
    id,
    name: meta.names[id] ?? id,
    team: blueSet.has(id) ? "blue" : "red",
    sprite: meta.sprites?.[id] ?? null,
    gridPos: meta.gridPositions[id] ?? { row: 0, col: 0 },
    hpRatio: cs.maxHp > 0 ? cs.hp / cs.maxHp : 0,
    currentHp: cs.hp,
    maxHp: cs.maxHp,
    tempHp: cs.tempHp,
    unconscious: cs.unconscious,
    dead: cs.dead,
    reactionAvailable: cs.reactionAvailable,
    concentrating: Option.isSome(cs.concentrationSpellId),
    exhaustion: cs.exhaustion,
    slotsByLevel: cs.slotsMax
      .map((max, i) => ({ current: cs.slotsCurrent[i] ?? 0, max }))
      .filter((s) => s.max > 0),
    deathSaves: cs.deathSaves,
    isActive: id === activeId,
    conditions: extractConditions(cs),
    preparedSpells: [...battleSpellIds(cs.spellAccesses)].sort(),
  };
}

function derivePhase(ctx: BattleContext): PhaseSnapshot {
  if (ctx.awaitCtx) {
    const aw = ctx.awaitCtx;
    const firstEligible =
      aw.eligible.size > 0 ? [...aw.eligible][0] : undefined;
    return {
      type: "interrupt",
      interruptKind: aw.interrupt.tag,
      reactorId: firstEligible,
      spellCasterId:
        aw.interrupt.tag === "PISpellCast"
          ? aw.interrupt.ctx.caster
          : undefined,
    };
  }
  if (ctx.aoeCtx) {
    return {
      type: "aoeResolving",
      spellName: "AoE",
      remainingCount: ctx.aoeCtx.remaining.size,
      saveDC: ctx.aoeCtx.saveDC,
    };
  }
  if (ctx.traversalCtx) {
    return {
      type: "traversalResolving",
      remainingCount: ctx.traversalCtx.remaining.length,
    };
  }
  if (ctx.movementCtx) return { type: "movement" };
  if (ctx.laCtx) return { type: "legendaryAction" };
  return { type: "activeTurn" };
}

function extractAoECtx(ctx: BattleContext): AoESpellCtx | null {
  if (ctx.aoeCtx) return ctx.aoeCtx;
  if (ctx.awaitCtx) {
    const pi = ctx.awaitCtx.interrupt;
    if (pi.tag === "PISaveFailedAoE") return pi.aoe;
    if (pi.tag === "PIAfterDamage" && pi.ctx.returnTo.tag === "ADRResolvingAoE")
      return pi.ctx.returnTo.aoe;
  }
  return null;
}

function deriveAoEZones(
  ctx: BattleContext,
  meta: ScenarioMeta,
  eventIndex: string | null,
): ReadonlyArray<AoEZoneSnapshot> {
  const aoe = extractAoECtx(ctx);
  if (!aoe) return [];
  const centerGridPos =
    eventIndex != null
      ? (meta.aoeTargetPoints[eventIndex] ?? { row: 0, col: 0 })
      : { row: 0, col: 0 };
  const spellName =
    eventIndex != null ? (meta.spellAnnotations[eventIndex] ?? "AoE") : "AoE";
  return [
    {
      zoneId: `aoe-${eventIndex ?? "0"}`,
      centerGridPos,
      radiusFeet: 20, // Fireball default; future: derive from spell catalog
      damageType: aoe.damageType,
      spellName,
    },
  ];
}

/**
 * Derive a SceneSnapshot from BattleContext + scenario metadata.
 * @param ctx - Current battle context from XState
 * @param meta - Scenario metadata (names, teams, positions)
 * @param aoeEventIndex - Event index string for AoE zone lookup (optional)
 */
export function deriveSnapshot(
  ctx: BattleContext,
  meta: ScenarioMeta,
  aoeEventIndex: string | null = null,
): SceneSnapshot {
  if (ctx.creatures.size === 0) {
    return {
      creatures: [],
      phase: derivePhase(ctx),
      aoeZones: deriveAoEZones(ctx, meta, aoeEventIndex),
      aoeTargetPoint:
        aoeEventIndex != null
          ? (meta.aoeTargetPoints[aoeEventIndex] ?? null)
          : null,
      round: 0,
      activeCreatureId: null,
    };
  }

  const activeId = currentActing(ctx.initiative);

  const blueSet = new Set(meta.teams.blue);
  const creatures: Array<CreatureSnapshot> = [];
  for (const id of initiativeOrder(ctx.initiative)) {
    const cs = ctx.creatures.get(id);
    if (cs) creatures.push(deriveCreature(id, cs, meta, activeId, blueSet));
  }

  return {
    creatures,
    phase: derivePhase(ctx),
    aoeZones: deriveAoEZones(ctx, meta, aoeEventIndex),
    aoeTargetPoint:
      aoeEventIndex != null
        ? (meta.aoeTargetPoints[aoeEventIndex] ?? null)
        : null,
    round: ctx.initiative.round,
    activeCreatureId: activeId,
  };
}
import {
  currentActing,
  initiativeOrder,
} from "@dnd/shared-algebras/initiative-algebra";
