// KERNEL-COVERAGE: runtime-owner BATTLE.ATTACK.MINIMAL_RESOLUTION

import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import type { BattleSubject } from "../battle-subjects.ts";
import type { CombatantId } from "../identity.ts";
import {
  activeEffectArmorClass,
  combatantCanTakeActions,
} from "./creature-state-execution.ts";
import { currentActorId } from "./creature-state-leaves.ts";
import { applyBattleHitPointDamage } from "./damage-apply.ts";
import type {
  BattleActDiscoveryCandidate,
  BattleCreatureState,
  BattleDamageRelationshipDecisions,
  BattleFill,
  BattleHole,
  BattleResolutionInput,
  BattleState,
} from "../battle-state-execution.ts";
import { statBlockAttackActionOptions } from "../stat-block-execution-state.ts";

export type CreatureAttackSubject = Extract<
  BattleSubject,
  { readonly tag: "creatureAttack" }
>;
type CreatureAttackDamageFill = Extract<
  BattleFill,
  { readonly kind: "creatureAttackZeroDamage" | "rolledDice" }
>;

export const CREATURE_ATTACK_ROLL_HOLE_ID = holeId(
  "battle:creature-attack:roll",
);
export const CREATURE_ATTACK_ROLL_HOLE_INSTANCE = holeInstanceKey(
  "battle:creature-attack:roll",
);
export const CREATURE_ATTACK_DAMAGE_HOLE_ID = holeId(
  "battle:creature-attack:damage",
);
export const CREATURE_ATTACK_DAMAGE_HOLE_INSTANCE = holeInstanceKey(
  "battle:creature-attack:damage",
);

export function minimalCreatureAttackActs(
  state: BattleState,
): readonly BattleActDiscoveryCandidate[] {
  const actorId = currentActorId(state);
  const actor = state.combatants.get(actorId);
  if (
    actor === undefined ||
    !creatureAttackPilotActor(actor) ||
    !combatantCanTakeActions(actor) ||
    !canSpendAction(state.currentTurnResources, "attack")
  ) {
    return [];
  }
  const targetIds = [...state.combatants.keys()];
  return targetIds
    .filter((targetId) => targetId !== actorId)
    .map((targetId): BattleActDiscoveryCandidate => {
      const subject: CreatureAttackSubject = {
        tag: "creatureAttack",
        actorId,
        targetId,
      };
      return {
        subject,
        initialHoles: [creatureAttackRollHole(subject)],
      };
    });
}

export function creatureAttackPilotActor(
  combatant: BattleCreatureState,
): boolean {
  return (
    combatant.origin.kind === "statBlock" &&
    statBlockAttackActionOptions(combatant.origin.execution).length === 0
  );
}

export function creatureAttackRollHole(
  subject: CreatureAttackSubject,
): BattleHole {
  return {
    holeInstanceKey: CREATURE_ATTACK_ROLL_HOLE_INSTANCE,
    holeId: CREATURE_ATTACK_ROLL_HOLE_ID,
    kind: "attackRoll",
    label: `Attack roll against ${subject.targetId}`,
    rollMode: "normal",
    creatureAttack: {
      actorId: subject.actorId,
      targetId: subject.targetId,
    },
  };
}

export function creatureAttackDamageHole(
  subject: CreatureAttackSubject,
): BattleHole {
  return {
    holeInstanceKey: CREATURE_ATTACK_DAMAGE_HOLE_INSTANCE,
    holeId: CREATURE_ATTACK_DAMAGE_HOLE_ID,
    kind: "rolledDice",
    label: `Damage roll against ${subject.targetId}`,
    creatureAttack: {
      actorId: subject.actorId,
      targetId: subject.targetId,
    },
  };
}

export function creatureAttackSubjectCombatants(input: {
  readonly state: BattleState;
  readonly subject: CreatureAttackSubject;
}):
  | {
      readonly tag: "ok";
      readonly actor: BattleCreatureState;
      readonly target: BattleCreatureState;
    }
  | { readonly tag: "missing"; readonly combatantId: CombatantId } {
  const actor = input.state.combatants.get(input.subject.actorId);
  if (actor === undefined) {
    return { tag: "missing", combatantId: input.subject.actorId };
  }
  const target = input.state.combatants.get(input.subject.targetId);
  if (target === undefined) {
    return { tag: "missing", combatantId: input.subject.targetId };
  }
  return { tag: "ok", actor, target };
}

export function creatureAttackHit(input: {
  readonly state: BattleState;
  readonly target: BattleCreatureState;
  readonly attackRoll: Extract<BattleFill, { readonly kind: "attackRoll" }>;
}): boolean {
  return (
    input.attackRoll.value.total >=
    Number(currentArmorClass(activeEffectArmorClass(input.state, input.target)))
  );
}

export function creatureAttackDamageTotal(
  fill: CreatureAttackDamageFill,
): number {
  if (fill.kind === "creatureAttackZeroDamage") {
    return 0;
  }
  return fill.value.reduce(
    (total, group) =>
      total +
      group.results.reduce(
        (groupTotal, result) => groupTotal + Number(result),
        0,
      ),
    0,
  );
}

export function battleStateAfterCreatureAttackDamage(input: {
  readonly state: BattleState;
  readonly actor: BattleCreatureState;
  readonly target: BattleCreatureState;
  readonly damage: number;
  readonly relationshipDecisions?: BattleDamageRelationshipDecisions;
}): BattleState {
  return applyBattleHitPointDamage({
    state: input.state,
    target: input.target,
    damageAmount: input.damage,
    deathFailuresAtZeroHp: 1,
    damageSourceId: input.actor.combatantId,
    ...(input.relationshipDecisions === undefined
      ? {}
      : { relationshipDecisions: input.relationshipDecisions }),
  });
}

export function creatureAttackFillSequence(
  input: BattleResolutionInput & { readonly subject: CreatureAttackSubject },
):
  | { readonly tag: "empty" }
  | {
      readonly tag: "attackRoll";
      readonly attackRoll: Extract<BattleFill, { readonly kind: "attackRoll" }>;
    }
  | {
      readonly tag: "damageRoll";
      readonly attackRoll: Extract<BattleFill, { readonly kind: "attackRoll" }>;
      readonly damageRoll: CreatureAttackDamageFill;
      readonly relationshipFill?: Extract<
        BattleFill,
        { readonly kind: "damageRelationshipDecisions" }
      >;
    }
  | { readonly tag: "invalid"; readonly message: string } {
  const [attackRoll, damageRoll, relationshipFill, extra] = input.fills;
  if (attackRoll === undefined) return { tag: "empty" };
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    attackRoll.kind !== "attackRoll" ||
    attackRoll.holeId !== CREATURE_ATTACK_ROLL_HOLE_ID
  ) {
    return {
      tag: "invalid",
      message: "Creature Attack requires an Attack Roll fill first.",
    };
  }
  /* v8 ignore stop */
  if (damageRoll === undefined) return { tag: "attackRoll", attackRoll };
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!creatureAttackDamageFillMatchesSubject(damageRoll, input.subject)) {
    return {
      tag: "invalid",
      message:
        "Creature Attack damage requires a Rolled Dice fill or zero-damage Creature Attack fill.",
    };
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    relationshipFill !== undefined &&
    relationshipFill.kind !== "damageRelationshipDecisions"
  ) {
    return {
      tag: "invalid",
      message:
        "Creature Attack relationship decisions must fill its emitted relationship hole.",
    };
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (extra !== undefined) {
    return {
      tag: "invalid",
      message:
        "Creature Attack accepts only Attack Roll, damage, and relationship-decision fills.",
    };
  }
  /* v8 ignore stop */
  return {
    tag: "damageRoll",
    attackRoll,
    damageRoll,
    ...(relationshipFill === undefined ? {} : { relationshipFill }),
  };
}

function creatureAttackDamageFillMatchesSubject(
  fill: BattleFill,
  subject: CreatureAttackSubject,
): fill is CreatureAttackDamageFill {
  if (fill.holeId !== CREATURE_ATTACK_DAMAGE_HOLE_ID) {
    return false;
  }
  if (fill.kind === "rolledDice") {
    return true;
  }
  return (
    fill.kind === "creatureAttackZeroDamage" &&
    fill.creatureAttack.actorId === subject.actorId &&
    fill.creatureAttack.targetId === subject.targetId
  );
}
