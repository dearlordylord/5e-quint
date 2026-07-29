import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { classLevel } from "@dnd/shared/types";
import { characterBattleFeatureInitForTest } from "./battle-runtime.test-support.ts";
import { battleObjectId } from "./identity.ts";
import type { BattleActDiscoveryCandidate } from "./battle-state-execution.ts";
import {
  attackTargetFill,
  battleId,
  battleUnitRefWithSupportProfiles,
  combatantId,
  discoverBattleActCandidates,
  Either,
  requireResultHole,
  resolveBattleSubject,
  startBattle,
  type AvailableBattleAct,
  type BattleActiveEffect,
  type BattleHole,
  type BattleRuntimeSession,
  type BattleState,
  type BattleSubject,
  unitLibrary,
} from "./unit-profile-admission.test-support.ts";
import {
  paladinChannelDivinityUnitId,
  paladinSacredWeaponUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  characterCreature,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";

type SacredWeaponProjection = {
  readonly activationOffered: boolean;
  readonly channelDivinityUsesRemaining: number;
  readonly boundWeaponItemId: string;
  readonly activeEffectCount: number;
  readonly rejected: boolean;
  readonly lastResult:
    | "init"
    | "activated"
    | "noResource"
    | "rangedWeapon"
    | "recast"
    | "attackEffects"
    | "dismissed"
    | "notCarryingWeapon";
};

export const paladinId = combatantId("sacred-weapon-paladin");
const targetId = combatantId("sacred-weapon-target");
export const clericChannelDivinityUnitId = "cleric_channel_divinity";

type SacredWeaponFixtureInput = {
  readonly selectedProfile?: boolean;
  readonly channelDivinityUsesRemaining?: number;
  readonly weaponUnitId?: "weapon_longsword" | "weapon_shortbow";
  readonly charismaScore?: number;
  readonly alternateAbilityChoices?: NonNullable<
    ReturnType<typeof zeroAbilityWeaponAttack>["alternateAbilityChoices"]
  >;
};

export function sacredWeaponBattle(
  input: SacredWeaponFixtureInput,
): BattleState {
  return sacredWeaponSession(input).state;
}

export function sacredWeaponSession(
  input: SacredWeaponFixtureInput,
): BattleRuntimeSession {
  const sacredWeapon = unitLibrary.requireUnit(paladinSacredWeaponUnitId);
  const channelDivinity = unitLibrary.requireUnit(paladinChannelDivinityUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: sacredWeapon.id },
    unit: sacredWeapon,
  });
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  const state = startBattle({
    battleId: battleId("paladin-sacred-weapon-activation"),
    combatants: [
      characterCreature({
        combatantId: paladinId,
        displayName: "Sacred Weapon Paladin",
        initiative: 18,
        characterUnitRefs:
          input.selectedProfile === false ? [] : [unitRef.right],
        classLevels: [{ className: "paladin", level: 3 }],
        attack: {
          ...zeroAbilityWeaponAttack(input.weaponUnitId ?? "weapon_longsword"),
          ...(input.alternateAbilityChoices === undefined
            ? {}
            : { alternateAbilityChoices: input.alternateAbilityChoices }),
        },
        unitFeatures:
          input.selectedProfile === false
            ? []
            : [
                characterBattleFeatureInitForTest(sacredWeapon, [
                  { className: "paladin", level: classLevel(3) },
                ]),
              ],
        resources: [
          {
            unit: channelDivinity,
            usesRemaining: input.channelDivinityUsesRemaining ?? 2,
          },
        ],
      }),
      characterCreature({
        combatantId: targetId,
        displayName: "Sacred Weapon Target",
        initiative: 10,
      }),
    ],
  });
  if (Either.isLeft(state)) {
    throw new Error(battleStateInitIssueMessage(state.left));
  }
  return input.charismaScore === undefined
    ? state.right
    : battleRuntimeSessionForTest({
        ...state.right,
        state: withCharismaScore(state.right.state, input.charismaScore),
      });
}

export function sacredWeaponAct(
  state: BattleState,
): BattleActDiscoveryCandidate | undefined {
  return discoverBattleActCandidates(state).find(
    (act) => act.subject.tag === "unitFeatureHeldWeaponActivation",
  );
}

export function isPaladinAttackAct(
  act: AvailableBattleAct,
): act is AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >;
} {
  return (
    act.subject.tag === "action" &&
    act.subject.actorId === paladinId &&
    act.subject.action === "attack"
  );
}

export function requireSacredWeaponAct(
  state: BattleState,
): BattleActDiscoveryCandidate & {
  readonly subject: Extract<
    BattleActDiscoveryCandidate["subject"],
    { readonly tag: "unitFeatureHeldWeaponActivation" }
  >;
} {
  const act = sacredWeaponAct(state);
  if (act?.subject.tag !== "unitFeatureHeldWeaponActivation") {
    throw new Error("Expected Sacred Weapon held-weapon activation act.");
  }
  return { ...act, subject: act.subject };
}

export function sacredWeaponDismissAct(state: BattleState):
  | (BattleActDiscoveryCandidate & {
      readonly subject: Extract<
        BattleActDiscoveryCandidate["subject"],
        { readonly tag: "unitFeature" }
      >;
    })
  | undefined {
  const act = discoverBattleActCandidates(state).find(
    (candidate) => candidate.subject.tag === "unitFeature",
  );
  return act?.subject.tag === "unitFeature"
    ? { ...act, subject: act.subject }
    : undefined;
}

export function resolveSacredWeapon(
  state: BattleState,
  act: ReturnType<typeof requireSacredWeaponAct>,
): BattleState {
  const resolved = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [],
  });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Sacred Weapon activation to resolve.");
  }
  return resolved.state;
}

export function sacredWeaponAttackRoll(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >,
): Extract<BattleHole, { readonly kind: "attackRoll" }> {
  const target = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  return requireResultHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [attackTargetFill(target, paladinId, targetId)],
    }),
    "attackRoll",
  );
}

export function sacredWeaponProjection(
  state: BattleState,
  lastResult: SacredWeaponProjection["lastResult"],
): SacredWeaponProjection {
  const actor = state.combatants.get(paladinId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected Sacred Weapon character actor.");
  }
  const resource = actor.origin.resources.find(
    (candidate) =>
      candidate.resourcePoolRef === sacredWeaponResourcePoolRef(state),
  );
  const activeEffects = actor.activeEffects.filter(isSacredWeaponEffect);
  return {
    activationOffered: sacredWeaponAct(state) !== undefined,
    channelDivinityUsesRemaining:
      resource !== undefined && "usesRemaining" in resource
        ? Number(resource.usesRemaining)
        : 0,
    boundWeaponItemId: activeEffects[0]?.weaponItemId ?? "none",
    activeEffectCount: activeEffects.length,
    rejected: lastResult === "noResource" || lastResult === "rangedWeapon",
    lastResult,
  };
}

export function sacredWeaponActorResourceUnitIds(
  session: BattleRuntimeSession,
): readonly string[] {
  return (
    session.context.characters
      .get(paladinId)
      ?.resourceOwnership.map((resource) => resource.unit.id) ?? []
  );
}

function sacredWeaponResourcePoolRef(state: BattleState) {
  const actor = state.combatants.get(paladinId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected Sacred Weapon character actor.");
  }
  for (const binding of actor.origin.execution.procedureBindings) {
    const procedure = binding.procedure;
    if (
      procedure.kind === "unitFeature" &&
      typeof procedure.execution !== "string" &&
      procedure.execution.kind === "paladinSacredWeapon"
    ) {
      return procedure.execution.sacredWeapon.spends.resourcePoolRef;
    }
  }
  throw new Error("Expected resource-backed Sacred Weapon procedure.");
}

function isSacredWeaponEffect(
  effect: BattleActiveEffect,
): effect is Extract<
  BattleActiveEffect,
  { readonly kind: "paladinSacredWeapon" }
> {
  return effect.kind === "paladinSacredWeapon";
}

export function withMainWeaponItemId(
  state: BattleState,
  itemId: string,
): BattleState {
  const actor = state.combatants.get(paladinId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected Sacred Weapon character actor.");
  }
  const weapon = actor.origin.selectedLoadout.weapon;
  if (weapon === undefined) {
    throw new Error("Expected selected main weapon.");
  }
  const attack = actor.origin.attack;
  const updatedAttack =
    attack !== null && attack.kind === "weapon"
      ? { ...attack, weaponObjectId: battleObjectId(itemId) }
      : attack;
  return {
    ...state,
    combatants: new Map(state.combatants).set(paladinId, {
      ...actor,
      origin: {
        ...actor.origin,
        selectedLoadout: {
          ...actor.origin.selectedLoadout,
          weapon: { ...weapon, itemId: battleObjectId(itemId) },
        },
        attack: updatedAttack,
      },
    }),
  };
}

function withCharismaScore(
  state: BattleState,
  charismaScore: number,
): BattleState {
  const actor = state.combatants.get(paladinId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected Sacred Weapon character actor.");
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(paladinId, {
      ...actor,
      origin: {
        ...actor.origin,
        d20Statistics: {
          ...actor.origin.d20Statistics,
          abilityScores: {
            ...actor.origin.d20Statistics.abilityScores,
            cha: charismaScore,
          },
        },
      },
    }),
  };
}

export function withFreshAttackAction(
  state: BattleState,
  source: BattleState,
): BattleState {
  return {
    ...state,
    currentTurnResources: {
      ...state.currentTurnResources,
      actionResources: source.currentTurnResources.actionResources,
    },
  };
}
