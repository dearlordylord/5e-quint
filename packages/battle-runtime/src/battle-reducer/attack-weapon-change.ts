// KERNEL-COVERAGE: runtime-owner BATTLE.ACTION.ATTACK_WEAPON_CHANGE
//
// SRD 5.2.1 Rules Glossary, "Attack [Action]", Equipping and Unequipping
// Weapons: "You can either equip or unequip one weapon when you make an attack
// as part of this action. You do so either before or after the attack. If you
// equip a weapon before an attack, you don't need to use it for that attack."
//
// Before: the Attack action subject carries the change, which Battle applies
// before it looks up the attack. After: an attack made without one leaves the
// `weaponChangeAfterAttack` allowance, which the `changeWeaponAfterAttack`
// command spends before the Attack action's next attack (ASSUMPTIONS.md A63).
import type { RuntimeActionResource } from "@dnd/shared-algebras/action-economy-algebra";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import type {
  BattleActDiscoveryCandidate,
  BattleAttackHostSubject,
  BattleCreatureState,
  BattleDroppedObjectOutcome,
  BattleFill,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleState,
  BattleWeaponDropPositionHole,
  WeaponChangeAfterAttackState,
} from "../battle-state-execution.ts";
import type { AttackWeaponChange, BattleSubject } from "../battle-subjects.ts";
import type { BattleObjectId, CombatantId } from "../identity.ts";
import {
  combatantCanTakeActions,
  currentActorId,
} from "./creature-state-leaves.ts";
import {
  loadoutWeaponChangeIsApplied,
  loadoutWeaponChangeIssue,
  loadoutWeaponChanges,
  stateWithLoadoutWeaponChange,
  type AppliedAttackWeaponChange,
} from "./loadout-weapon-custody.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import { invalidResult, resolvedResult } from "./result-helpers.ts";

export type ChangeWeaponAfterAttackSubject = Extract<
  BattleSubject,
  {
    readonly tag: "runtimeCommand";
    readonly command: "changeWeaponAfterAttack";
  }
>;

/** Whether a subject spends the weapon change an attack left after it. */
export function isChangeWeaponAfterAttackSubject(
  subject: BattleSubject,
): subject is ChangeWeaponAfterAttackSubject {
  return (
    subject.tag === "runtimeCommand" &&
    subject.command === "changeWeaponAfterAttack"
  );
}

type AttackActionSubject = Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
>;

const WEAPON_DROP_POSITION_HOLE_INSTANCE = holeInstanceKey(
  "battle:attack-weapon-change:drop-position",
);

export function weaponDropPositionHole(
  actorId: CombatantId,
  objectId: BattleObjectId,
): BattleWeaponDropPositionHole {
  return {
    holeInstanceKey: WEAPON_DROP_POSITION_HOLE_INSTANCE,
    holeId: holeId(
      `battle:attack-weapon-change:drop-position:${actorId}:${objectId}`,
    ),
    kind: "weaponDropPosition",
    label: "Where does the dropped weapon land?",
    actorId,
    objectId,
  };
}

/** The holes a weapon change asks before Battle can apply it. */
export function weaponChangeInitialHoles(
  actorId: CombatantId,
  change: AttackWeaponChange,
): readonly BattleWeaponDropPositionHole[] {
  return change.kind === "drop"
    ? [weaponDropPositionHole(actorId, change.objectId)]
    : [];
}

/**
 * The weapon change a character's Attack action attack on its own turn
 * leaves, once Battle accepts it: one after the attack, unless the attack
 * carried its change before the roll. Other attacks, such as a Legendary
 * Action's, leave the allowance as it was.
 */
export function stateWithWeaponChangeAfterAttackAllowance(
  state: BattleState,
  subject: BattleAttackHostSubject,
): BattleState {
  if (subject.tag !== "action" || subject.action !== "attack") return state;
  return stateWithWeaponChangeAllowanceAfter(
    state,
    subject.actorId,
    attackSubjectWeaponChange(subject) === undefined
      ? "available"
      : "unavailable",
  );
}

/**
 * The weapon change a Grapple or Shove leaves after it. One that replaces an
 * attack of the Attack action opens the same window as any other attack of
 * the action; it carries no change before it. One another feature pays for,
 * such as a Flurry of Blows Unarmed Strike, leaves the window as it was.
 */
export function stateWithWeaponChangeAfterUnarmedStrikeOption(
  state: BattleState,
  actorId: CombatantId,
  spentResource: RuntimeActionResource,
): BattleState {
  return ACTION_RESOURCE_SOURCE_TAKES_ATTACK_ACTION_ATTACK[spentResource.source]
    ? stateWithWeaponChangeAllowanceAfter(state, actorId, "available")
    : state;
}

/**
 * Whether an attack an action resource from each source pays for is one of
 * the Attack action's attacks: the turn's action, or another action taken as
 * the Attack action, and the extra attacks of that action. A Stat Block's
 * Multiattack is its own action, and Flurry of Blows is a Bonus Action.
 */
const ACTION_RESOURCE_SOURCE_TAKES_ATTACK_ACTION_ATTACK = {
  turn: true,
  unit: true,
  spellEffect: true,
  classFeatureExtraAttack: true,
  statBlockMultiattack: false,
  monkFocusFlurryOfBlows: false,
} as const satisfies {
  readonly [Source in RuntimeActionResource["source"]]: boolean;
};

function stateWithWeaponChangeAllowanceAfter(
  state: BattleState,
  actorId: CombatantId,
  weaponChangeAfterAttack: WeaponChangeAfterAttackState,
): BattleState {
  if (
    actorId !== currentActorId(state) ||
    state.combatants.get(actorId)?.origin.kind !== "character"
  ) {
    return state;
  }
  return {
    ...state,
    currentTurnResources: {
      ...state.currentTurnResources,
      weaponChangeAfterAttack,
    },
  };
}

/** The weapon changes the current actor can still make after its attack. */
export function changeWeaponAfterAttackActs(
  state: BattleState,
  actor: BattleCreatureState,
): readonly BattleActDiscoveryCandidate[] {
  if (!weaponChangeAfterAttackIsAvailable(state, actor)) return [];
  return loadoutWeaponChanges(state, actor).map((weaponChange) => ({
    subject: {
      tag: "runtimeCommand",
      actorId: actor.combatantId,
      command: "changeWeaponAfterAttack",
      weaponChange,
    },
    initialHoles: weaponChangeInitialHoles(actor.combatantId, weaponChange),
  }));
}

export function resolveChangeWeaponAfterAttack(
  input: BattleResolutionInput & {
    readonly subject: ChangeWeaponAfterAttackSubject;
  },
): BattleResolutionResult {
  const actor = input.state.combatants.get(input.subject.actorId);
  if (
    actor === undefined ||
    !weaponChangeAfterAttackIsAvailable(input.state, actor)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "No weapon change is left from an attack this turn.",
    );
  }
  if (
    !weaponChangeTakesFills(
      input.subject.actorId,
      input.subject.weaponChange,
      input.fills,
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "A weapon change takes only a dropped weapon's landing position.",
    );
  }
  const applied = appliedWeaponChange(
    input.state,
    input.subject,
    input.subject.weaponChange,
    input.fills,
  );
  if (applied.tag !== "applied") return applied.result;
  return withWeaponDropOutcome(
    resolvedResult({
      ...applied.state,
      currentTurnResources: {
        ...applied.state.currentTurnResources,
        weaponChangeAfterAttack: "unavailable",
      },
    }),
    input.subject.actorId,
    input.subject.weaponChange,
  );
}

/**
 * Whether every fill is the change's own: only a drop asks where the weapon
 * lands, and nothing else answers a weapon change.
 */
function weaponChangeTakesFills(
  actorId: CombatantId,
  change: AttackWeaponChange,
  fills: readonly BattleFill[],
): boolean {
  if (change.kind !== "drop") return fills.length === 0;
  const hole = weaponDropPositionHole(actorId, change.objectId);
  return fills.every(
    (fill) => fill.kind === "weaponDropPosition" && fill.holeId === hole.holeId,
  );
}

/**
 * A resolved result that reports a weapon the change dropped, as Battle
 * reports every object that falls, so the caller learns that it lies on the
 * ground.
 */
function withWeaponDropOutcome(
  result: BattleResolutionResult,
  actorId: CombatantId,
  change: AttackWeaponChange,
): BattleResolutionResult {
  if (result.tag !== "resolved" || change.kind !== "drop") return result;
  const dropped: BattleDroppedObjectOutcome = {
    kind: "objectDropped",
    actorId,
    objectId: change.objectId,
    source: { kind: "attackWeaponChange" },
  };
  return {
    ...result,
    droppedObjects: [...(result.droppedObjects ?? []), dropped],
  };
}

/**
 * Resolves an Attack action subject, first applying the weapon change it
 * carries. A resumed subject finds the change already applied, so Battle
 * applies it once; the drop position fill is the change's own and never
 * reaches the attack.
 */
export function resolveAttackWithWeaponChange<
  Input extends BattleResolutionInput & {
    readonly subject: AttackActionSubject;
  },
>(
  input: Input,
  resolveAttack: (input: Input) => BattleResolutionResult,
): BattleResolutionResult {
  const change = attackSubjectWeaponChange(input.subject);
  if (change === undefined) return resolveAttack(input);
  const actorId = input.subject.actorId;
  const changeFillIds = new Set(
    weaponChangeInitialHoles(actorId, change).map((hole) => hole.holeId),
  );
  const attackFills = input.fills.filter(
    (fill) => !changeFillIds.has(fill.holeId),
  );
  if (
    input.state.subjectResolutionPhase.kind === "subjectContinuation" &&
    loadoutWeaponChangeIsApplied(input.state, actorId, change)
  ) {
    return withWeaponDropOutcome(
      resolveAttack({ ...input, fills: attackFills }),
      actorId,
      change,
    );
  }
  const applied = appliedWeaponChange(
    input.state,
    input.subject,
    change,
    input.fills,
  );
  if (applied.tag !== "applied") return applied.result;
  return withWeaponDropOutcome(
    resolveAttack({ ...input, state: applied.state, fills: attackFills }),
    actorId,
    change,
  );
}

function attackSubjectWeaponChange(
  subject: AttackActionSubject,
): AttackWeaponChange | undefined {
  return "weaponChange" in subject ? subject.weaponChange : undefined;
}

function weaponChangeAfterAttackIsAvailable(
  state: BattleState,
  actor: BattleCreatureState,
): boolean {
  return (
    state.currentTurnResources.weaponChangeAfterAttack === "available" &&
    actor.combatantId === currentActorId(state) &&
    combatantCanTakeActions(actor)
  );
}

function appliedWeaponChange(
  state: BattleState,
  subject: BattleSubject,
  change: AttackWeaponChange,
  fills: readonly BattleFill[],
):
  | { readonly tag: "applied"; readonly state: BattleState }
  | { readonly tag: "result"; readonly result: BattleResolutionResult } {
  const actorId = subject.actorId;
  const issue = loadoutWeaponChangeIssue(state, actorId, change);
  if (issue !== null) {
    return {
      tag: "result",
      result: invalidResult(state, "staleSubject", issue.message),
    };
  }
  const withFacts = appliedWeaponChangeFacts(actorId, change, fills);
  if (withFacts.tag === "needsHoles") {
    return {
      tag: "result",
      result: needsHolesResult(state, subject, [withFacts.hole]),
    };
  }
  const changed = stateWithLoadoutWeaponChange(
    state,
    actorId,
    withFacts.change,
  );
  /* v8 ignore start -- @preserve -- loadoutWeaponChangeIssue has just admitted this change against the same state. */
  if (changed.tag === "invalid") {
    return {
      tag: "result",
      result: invalidResult(state, "staleSubject", changed.message),
    };
  }
  /* v8 ignore stop -- @preserve */
  return { tag: "applied", state: changed.state };
}

function appliedWeaponChangeFacts(
  actorId: CombatantId,
  change: AttackWeaponChange,
  fills: readonly BattleFill[],
):
  | { readonly tag: "applied"; readonly change: AppliedAttackWeaponChange }
  | {
      readonly tag: "needsHoles";
      readonly hole: BattleWeaponDropPositionHole;
    } {
  if (change.kind !== "drop") {
    return {
      tag: "applied",
      change: { kind: change.kind, objectId: change.objectId },
    };
  }
  const hole = weaponDropPositionHole(actorId, change.objectId);
  const fill = fills.find(
    (candidate) =>
      candidate.kind === "weaponDropPosition" &&
      candidate.holeId === hole.holeId,
  );
  return fill?.kind === "weaponDropPosition"
    ? {
        tag: "applied",
        change: {
          kind: "drop",
          objectId: change.objectId,
          positionId: fill.value.positionId,
        },
      }
    : { tag: "needsHoles", hole };
}
