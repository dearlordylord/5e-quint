// KERNEL-COVERAGE: runtime-owner BATTLE.ACTION.ATTACK_WEAPON_CHANGE
//
// SRD 5.2.1 Rules Glossary, "Attack [Action]", Equipping and Unequipping
// Weapons: "You can either equip or unequip one weapon when you make an attack
// as part of this action. You do so either before or after the attack. If you
// equip a weapon before an attack, you don't need to use it for that attack."
//
// Before: the Attack action subject carries the change, which Battle applies
// before it looks up the attack. A Grapple or Shove that takes the place of an
// attack of the action ("Unarmed Strike") carries it the same way. After: an
// attack made without one leaves the `weaponChangeAfterAttack` allowance,
// which the `changeWeaponAfterAttack` command spends before the Attack
// action's next attack (ASSUMPTIONS.md A63). A readied attack's release
// carries its change before or after it (readied-attack-weapon-change.ts).
import { Result } from "effect";
import {
  spendUnarmedStrikeActionResource,
  type RuntimeActionResource,
} from "@dnd/shared-algebras/action-economy-algebra";
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
  ownedWeaponChangeIsApplied,
  ownedWeaponChangeIssue,
  ownedWeaponChanges,
  stateWithOwnedWeaponChange,
  type AppliedAttackWeaponChange,
} from "./owned-weapon-custody.ts";
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

/** A Grapple or Shove: an Unarmed Strike option an attack can take. */
type UnarmedStrikeOptionSubject = Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "grapple" | "shove" }
>;

/** The subjects that can carry a weapon change before them. */
type WeaponChangeBeforeSubject =
  | AttackActionSubject
  | UnarmedStrikeOptionSubject;

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
    subjectWeaponChange(subject) === undefined ? "available" : "unavailable",
  );
}

/**
 * The weapon change a Grapple or Shove leaves after it. One that replaces an
 * attack of the Attack action leaves what any other attack of the action
 * leaves: one after it, unless it carried its change before. One another
 * feature pays for, such as a Flurry of Blows Unarmed Strike, leaves the
 * window as it was.
 */
export function stateWithWeaponChangeAfterUnarmedStrikeOption(
  state: BattleState,
  subject: UnarmedStrikeOptionSubject,
  spentResource: RuntimeActionResource,
): BattleState {
  return ACTION_RESOURCE_SOURCE_TAKES_ATTACK_ACTION_ATTACK[spentResource.source]
    ? stateWithWeaponChangeAllowanceAfter(
        state,
        subject.actorId,
        subjectWeaponChange(subject) === undefined
          ? "available"
          : "unavailable",
      )
    : state;
}

/**
 * Whether the next Grapple or Shove would take the place of an attack of the
 * Attack action, by the action resource it would spend, so it can carry a
 * weapon change before it. One that Flurry of Blows pays for can't.
 */
export function unarmedStrikeOptionTakesAttackActionAttack(
  state: BattleState,
): boolean {
  const spent = spendUnarmedStrikeActionResource(state.currentTurnResources);
  return (
    Result.isSuccess(spent) &&
    ACTION_RESOURCE_SOURCE_TAKES_ATTACK_ACTION_ATTACK[
      spent.success.spentResource.source
    ]
  );
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
  return ownedWeaponChanges(state, actor).map((weaponChange) => ({
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
    input.subject.actorId,
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

/** The report of a weapon a weapon change dropped. */
export function weaponChangeDropOutcome(
  actorId: CombatantId,
  objectId: BattleObjectId,
): BattleDroppedObjectOutcome {
  return {
    kind: "objectDropped",
    actorId,
    objectId,
    source: { kind: "attackWeaponChange" },
  };
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
  return {
    ...result,
    droppedObjects: [
      ...(result.droppedObjects ?? []),
      weaponChangeDropOutcome(actorId, change.objectId),
    ],
  };
}

/**
 * Resolves an attack of the Attack action, or a Grapple or Shove in its place,
 * first applying the weapon change its subject carries.
 */
export function resolveAttackWithWeaponChange<
  Input extends BattleResolutionInput & {
    readonly subject: WeaponChangeBeforeSubject;
  },
>(
  input: Input,
  resolveAttack: (input: Input) => BattleResolutionResult,
): BattleResolutionResult {
  const change = subjectWeaponChange(input.subject);
  if (change === undefined) return resolveAttack(input);
  if (
    input.subject.action !== "attack" &&
    !unarmedStrikeOptionTakesAttackActionAttack(input.state)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Only a Grapple or Shove in place of an Attack action attack can carry a weapon change.",
    );
  }
  return withWeaponDropOutcome(
    resolveWithWeaponChangeBefore(
      input,
      input.subject.actorId,
      change,
      resolveAttack,
    ),
    input.subject.actorId,
    change,
  );
}

/**
 * Resolves an attack after the weapon change its attacker makes right before
 * it. A resumed subject finds the change already applied, so Battle applies it
 * once; the drop position fill is the change's own and never reaches the
 * attack. The caller reports a dropped weapon once the attack is over.
 */
export function resolveWithWeaponChangeBefore<
  Input extends BattleResolutionInput,
>(
  input: Input,
  attackerId: CombatantId,
  change: AttackWeaponChange,
  resolveAttack: (input: Input) => BattleResolutionResult,
): BattleResolutionResult {
  const attackFills = fillsWithoutWeaponChange(attackerId, change, input.fills);
  if (
    input.state.subjectResolutionPhase.kind === "subjectContinuation" &&
    ownedWeaponChangeIsApplied(input.state, attackerId, change)
  ) {
    return resolveAttack({ ...input, fills: attackFills });
  }
  const applied = appliedWeaponChange(
    input.state,
    input.subject,
    attackerId,
    change,
    input.fills,
  );
  if (applied.tag !== "applied") return applied.result;
  return resolveAttack({ ...input, state: applied.state, fills: attackFills });
}

/**
 * Asks where a weapon dropped after the attack lands before the attack
 * starts, then resolves the attack. The caller makes the change once the
 * attack is over (stateWithWeaponChangeAfterAttack).
 */
export function resolveBeforeWeaponChangeAfter<
  Input extends BattleResolutionInput,
>(
  input: Input,
  attackerId: CombatantId,
  change: AttackWeaponChange,
  resolveAttack: (input: Input) => BattleResolutionResult,
): BattleResolutionResult {
  const facts = appliedWeaponChangeFacts(attackerId, change, input.fills);
  // The landing position stays among the attack's fills, so that an attack
  // resumed after a Reaction to its hit replays it; the attack reads only
  // its own (readiedReleaseFills).
  return facts.tag === "needsHoles"
    ? needsHolesResult(input.state, input.subject, [facts.hole])
    : resolveAttack(input);
}

/**
 * The battle once an attacker who can still act makes the weapon change it
 * chose for right after its attack, with the landing position among `fills`.
 * Undefined when it can't: an attacker that can no longer take actions
 * doesn't finish its action, and a weapon no longer where the change needs
 * it can't be changed.
 */
export function stateWithWeaponChangeAfterAttack(
  state: BattleState,
  attackerId: CombatantId,
  change: AttackWeaponChange,
  fills: readonly BattleFill[],
): BattleState | undefined {
  const facts = appliedWeaponChangeFacts(attackerId, change, fills);
  if (
    !combatantCanTakeActions(state.combatants.get(attackerId)) ||
    facts.tag !== "applied"
  ) {
    return undefined;
  }
  const changed = stateWithOwnedWeaponChange(state, attackerId, facts.change);
  return changed.tag === "applied" ? changed.state : undefined;
}

/** The fills that answer the attack: every one but the weapon change's own. */
export function fillsWithoutWeaponChange(
  attackerId: CombatantId,
  change: AttackWeaponChange,
  fills: readonly BattleFill[],
): readonly BattleFill[] {
  const changeFillIds = new Set(
    weaponChangeInitialHoles(attackerId, change).map((hole) => hole.holeId),
  );
  return fills.filter((fill) => !changeFillIds.has(fill.holeId));
}

function subjectWeaponChange(
  subject: WeaponChangeBeforeSubject,
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
  actorId: CombatantId,
  change: AttackWeaponChange,
  fills: readonly BattleFill[],
):
  | { readonly tag: "applied"; readonly state: BattleState }
  | { readonly tag: "result"; readonly result: BattleResolutionResult } {
  const withFacts = appliedWeaponChangeFacts(actorId, change, fills);
  if (withFacts.tag === "needsHoles") {
    const issue = ownedWeaponChangeIssue(state, actorId, change);
    if (issue !== null) {
      return {
        tag: "result",
        result: invalidResult(state, "staleSubject", issue.message),
      };
    }

    return {
      tag: "result",
      result: needsHolesResult(state, subject, [withFacts.hole]),
    };
  }
  const changed = stateWithOwnedWeaponChange(state, actorId, withFacts.change);
  if (changed.tag === "invalid") {
    return {
      tag: "result",
      result: invalidResult(state, "staleSubject", changed.message),
    };
  }
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
    return { tag: "applied", change };
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
