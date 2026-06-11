// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L3CF-03-PALADIN-SACRED-WEAPON-ACTIVATION paladin_sacred_weapon
// UNIT-IDENTITY-MBT-REPLAY: L3CF-03-PALADIN-SACRED-WEAPON-ACTIVATION paladin_sacred_weapon doActivateSacredWeapon doRejectSacredWeaponNoResource doRejectSacredWeaponRangedWeapon doRecastSacredWeapon
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L3CF-04-PALADIN-SACRED-WEAPON-ATTACK-DAMAGE-LIGHT paladin_sacred_weapon
// UNIT-IDENTITY-MBT-REPLAY: L3CF-04-PALADIN-SACRED-WEAPON-ATTACK-DAMAGE-LIGHT paladin_sacred_weapon doProjectSacredWeaponAttackDamageAndLight doDismissSacredWeapon doEndSacredWeaponWhenNotCarryingWeapon
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.paladin-sacred-weapon
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.paladin-sacred-weapon
import { describe, expect, test } from "vitest";

import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import {
  attackTargetFill,
  battleId,
  battleUnitRefWithSupportProfiles,
  combatantId,
  discoverBattleActs,
  Either,
  oppositionSide,
  partySide,
  requireResultHole,
  resolveBattleSubject,
  snapshotBattle,
  startBattle,
  type AvailableBattleAct,
  type BattleActiveEffect,
  type BattleHole,
  type BattleState,
  type BattleSubject,
  unitLibrary,
} from "./unit-profile-admission-test-support.ts";
import {
  paladinChannelDivinityUnitId,
  paladinSacredWeaponUnitId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  characterCreature,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { normalizeEarlyEndedOngoingFeatures } from "./battle-reducer/creature-state.ts";

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

const paladinId = combatantId("sacred-weapon-paladin");
const targetId = combatantId("sacred-weapon-target");
const clericChannelDivinityUnitId = "cleric_channel_divinity";

describe("Sacred Weapon activation", () => {
  test("admits only the Sacred Weapon Channel Divinity spend resource for this battle path", () => {
    expect(sacredWeaponActorResourceUnitIds(sacredWeaponBattle({}))).toEqual([
      paladinChannelDivinityUnitId,
    ]);
    expect(
      sacredWeaponActorResourceUnitIds(sacredWeaponBattle({})),
    ).not.toContain(clericChannelDivinityUnitId);
  });

  test("discovers activation only for selected profile, Channel Divinity use, and held Melee weapon", () => {
    expect(sacredWeaponAct(sacredWeaponBattle({}))).toBeDefined();
    expect(
      sacredWeaponAct(sacredWeaponBattle({ channelDivinityUsesRemaining: 0 })),
    ).toBeUndefined();
    expect(
      sacredWeaponAct(sacredWeaponBattle({ weaponUnitId: "weapon_shortbow" })),
    ).toBeUndefined();
    expect(
      sacredWeaponAct(sacredWeaponBattle({ selectedProfile: false })),
    ).toBeUndefined();
  });

  test("spends one Attack action and one Paladin Channel Divinity use, then binds the selected held weapon", () => {
    const state = sacredWeaponBattle({});
    const act = requireSacredWeaponAct(state);
    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [],
    });
    expect(resolved.tag).toBe("resolved");
    if (resolved.tag !== "resolved") return;

    const projection = sacredWeaponProjection(resolved.state, "activated");
    expect(projection).toMatchObject({
      activationOffered: false,
      channelDivinityUsesRemaining: 1,
      boundWeaponItemId: "main:weapon_longsword",
      activeEffectCount: 1,
      rejected: false,
    });
    expect(
      resolved.state.currentTurnResources.actionResources.some(
        (resource) => resource.source === "turn",
      ),
    ).toBe(false);
  });

  test("stale weapon activation rejection preserves action and Channel Divinity resources", () => {
    const state = sacredWeaponBattle({});
    const act = requireSacredWeaponAct(state);
    const staleState = sacredWeaponBattle({ weaponUnitId: "weapon_shortbow" });
    const rejected = resolveBattleSubject({
      state: staleState,
      subject: act.subject,
      fills: [],
    });
    expect(rejected).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
    expect(sacredWeaponProjection(staleState, "rangedWeapon")).toMatchObject({
      channelDivinityUsesRemaining: 2,
      activeEffectCount: 0,
    });
  });

  test("recast spends another Channel Divinity use and replaces the prior weapon binding", () => {
    const state = sacredWeaponBattle({});
    const first = resolveSacredWeapon(state, requireSacredWeaponAct(state));
    const secondReady = withFreshAttackAction(
      withMainWeaponItemId(first, "second:weapon_longsword"),
      state,
    );
    const second = resolveSacredWeapon(
      secondReady,
      requireSacredWeaponAct(secondReady),
    );

    expect(sacredWeaponProjection(second, "recast")).toMatchObject({
      activationOffered: false,
      channelDivinityUsesRemaining: 0,
      boundWeaponItemId: "second:weapon_longsword",
      activeEffectCount: 1,
      rejected: false,
    });
  });

  test("active binding adds Charisma attack-roll bonus with minimum 1 and offers normal or Radiant damage", () => {
    const state = sacredWeaponBattle({ charismaScore: 8 });
    const activated = withFreshAttackAction(
      resolveSacredWeapon(state, requireSacredWeaponAct(state)),
      state,
    );

    const attackNames = discoverBattleActs(activated)
      .filter(
        (
          act,
        ): act is AvailableBattleAct & {
          readonly subject: Extract<
            BattleSubject,
            { readonly tag: "action"; readonly action: "attack" }
          >;
        } => isPaladinAttackAct(act),
      )
      .map((act) => act.subject.attackName);
    expect(attackNames).toEqual(
      expect.arrayContaining(["Longsword (slashing)", "Longsword (radiant)"]),
    );

    const attackRoll = sacredWeaponAttackRoll(activated, "Longsword (radiant)");
    expect(Number(attackRoll.attackBonus)).toBe(1);
    if (!("attack" in attackRoll)) {
      throw new Error("Expected weapon attack roll hole.");
    }
    expect(attackRoll.attack.kind).toBe("weapon");
    if (attackRoll.attack.kind !== "weapon") return;
    expect(attackRoll.attack.weapon.damage.damageType).toBe("radiant");
  });

  test("active binding projects Bright and Dim light from the carried weapon", () => {
    const state = sacredWeaponBattle({});
    const activated = resolveSacredWeapon(state, requireSacredWeaponAct(state));

    expect(snapshotBattle(activated).lightEmitters).toEqual([
      expect.objectContaining({
        kind: "unitFeatureLightEmitter",
        sourceUnitId: paladinSacredWeaponUnitId,
        sourceCombatantId: paladinId,
        attachment: { kind: "combatant", combatantId: paladinId },
        emission: {
          kind: "brightAndDim",
          brightRadiusFeet: 20,
          dimAdditionalFeet: 20,
        },
      }),
    ]);
  });

  test("dismissal and no-longer-carried cleanup end the active binding and light", () => {
    const state = sacredWeaponBattle({});
    const activated = resolveSacredWeapon(state, requireSacredWeaponAct(state));
    const dismiss = sacredWeaponDismissAct(activated);
    expect(dismiss).toBeDefined();
    if (dismiss === undefined) return;

    const dismissed = resolveBattleSubject({
      state: activated,
      subject: dismiss.subject,
      fills: [],
    });
    expect(dismissed).toMatchObject({
      tag: "resolved",
      state: { lightEmitters: [] },
      snapshot: { lightEmitters: [] },
    });
    if (dismissed.tag !== "resolved") return;
    expect(sacredWeaponProjection(dismissed.state, "dismissed")).toMatchObject({
      activeEffectCount: 0,
      boundWeaponItemId: "none",
    });

    const detached = normalizeEarlyEndedOngoingFeatures(
      withMainWeaponItemId(activated, "dropped:weapon_longsword"),
    );
    expect(snapshotBattle(detached).lightEmitters).toEqual([]);
    expect(sacredWeaponProjection(detached, "notCarryingWeapon")).toMatchObject(
      {
        activeEffectCount: 0,
        boundWeaponItemId: "none",
      },
    );
    expect(sacredWeaponDismissAct(detached)).toBeUndefined();
  });
});

defineSelectedIdentityWitness({
  describeLabel: "Paladin Sacred Weapon selected identity MBT",
  taskId: "L3CF-03-PALADIN-SACRED-WEAPON-ACTIVATION",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-paladin-sacred-weapon-selected-identity.mbt.qnt",
  ),
  projectionSchema: {
    activationOffered: "bool",
    channelDivinityUsesRemaining: "int",
    boundWeaponItemId: "str",
    activeEffectCount: "int",
    rejected: "bool",
    lastResult: "str",
  },
  initialProjection: {
    activationOffered: false,
    channelDivinityUsesRemaining: 2,
    boundWeaponItemId: "none",
    activeEffectCount: 0,
    rejected: false,
    lastResult: "init",
  },
  units: [
    {
      unitId: paladinSacredWeaponUnitId,
      procedures: [
        {
          actionName: "doActivateSacredWeapon",
          projectionAfter: {
            activationOffered: false,
            channelDivinityUsesRemaining: 1,
            boundWeaponItemId: "main:weapon_longsword",
            activeEffectCount: 1,
            rejected: false,
            lastResult: "activated",
          },
          discover: () => {
            const state = sacredWeaponBattle({});
            return sacredWeaponProjection(
              resolveSacredWeapon(state, requireSacredWeaponAct(state)),
              "activated",
            );
          },
        },
        {
          actionName: "doRejectSacredWeaponNoResource",
          projectionAfter: {
            activationOffered: false,
            channelDivinityUsesRemaining: 0,
            boundWeaponItemId: "none",
            activeEffectCount: 0,
            rejected: true,
            lastResult: "noResource",
          },
          discover: () =>
            sacredWeaponProjection(
              sacredWeaponBattle({ channelDivinityUsesRemaining: 0 }),
              "noResource",
            ),
        },
        {
          actionName: "doRejectSacredWeaponRangedWeapon",
          projectionAfter: {
            activationOffered: false,
            channelDivinityUsesRemaining: 2,
            boundWeaponItemId: "none",
            activeEffectCount: 0,
            rejected: true,
            lastResult: "rangedWeapon",
          },
          discover: () =>
            sacredWeaponProjection(
              sacredWeaponBattle({ weaponUnitId: "weapon_shortbow" }),
              "rangedWeapon",
            ),
        },
        {
          actionName: "doRecastSacredWeapon",
          projectionAfter: {
            activationOffered: false,
            channelDivinityUsesRemaining: 0,
            boundWeaponItemId: "second:weapon_longsword",
            activeEffectCount: 1,
            rejected: false,
            lastResult: "recast",
          },
          discover: () => {
            const state = sacredWeaponBattle({});
            const first = resolveSacredWeapon(
              state,
              requireSacredWeaponAct(state),
            );
            const secondReady = withFreshAttackAction(
              withMainWeaponItemId(first, "second:weapon_longsword"),
              state,
            );
            return sacredWeaponProjection(
              resolveSacredWeapon(
                secondReady,
                requireSacredWeaponAct(secondReady),
              ),
              "recast",
            );
          },
        },
        {
          actionName: "doProjectSacredWeaponAttackDamageAndLight",
          projectionAfter: {
            activationOffered: false,
            channelDivinityUsesRemaining: 1,
            boundWeaponItemId: "main:weapon_longsword",
            activeEffectCount: 1,
            rejected: false,
            lastResult: "attackEffects",
          },
          discover: () => {
            const state = sacredWeaponBattle({});
            return sacredWeaponProjection(
              resolveSacredWeapon(state, requireSacredWeaponAct(state)),
              "attackEffects",
            );
          },
        },
        {
          actionName: "doDismissSacredWeapon",
          projectionAfter: {
            activationOffered: false,
            channelDivinityUsesRemaining: 1,
            boundWeaponItemId: "none",
            activeEffectCount: 0,
            rejected: false,
            lastResult: "dismissed",
          },
          discover: () => {
            const state = sacredWeaponBattle({});
            const activated = resolveSacredWeapon(
              state,
              requireSacredWeaponAct(state),
            );
            const dismiss = sacredWeaponDismissAct(activated);
            if (dismiss === undefined) {
              throw new Error("Expected Sacred Weapon dismissal act.");
            }
            const dismissed = resolveBattleSubject({
              state: activated,
              subject: dismiss.subject,
              fills: [],
            });
            if (dismissed.tag !== "resolved") {
              throw new Error("Expected Sacred Weapon dismissal to resolve.");
            }
            return sacredWeaponProjection(dismissed.state, "dismissed");
          },
        },
        {
          actionName: "doEndSacredWeaponWhenNotCarryingWeapon",
          projectionAfter: {
            activationOffered: false,
            channelDivinityUsesRemaining: 1,
            boundWeaponItemId: "none",
            activeEffectCount: 0,
            rejected: false,
            lastResult: "notCarryingWeapon",
          },
          discover: () => {
            const state = sacredWeaponBattle({});
            const activated = resolveSacredWeapon(
              state,
              requireSacredWeaponAct(state),
            );
            return sacredWeaponProjection(
              normalizeEarlyEndedOngoingFeatures(
                withMainWeaponItemId(activated, "dropped:weapon_longsword"),
              ),
              "notCarryingWeapon",
            );
          },
        },
      ],
    },
  ],
});

function sacredWeaponBattle(input: {
  readonly selectedProfile?: boolean;
  readonly channelDivinityUsesRemaining?: number;
  readonly weaponUnitId?: "weapon_longsword" | "weapon_shortbow";
  readonly charismaScore?: number;
}): BattleState {
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
        side: partySide,
        characterUnitRefs:
          input.selectedProfile === false ? [] : [unitRef.right],
        classLevels: [{ className: "paladin", level: 3 }],
        attack: zeroAbilityWeaponAttack(
          input.weaponUnitId ?? "weapon_longsword",
        ),
        unitFeatures: [{ unit: sacredWeapon }],
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
        side: oppositionSide,
      }),
    ],
  });
  if (Either.isLeft(state)) {
    throw new Error(state.left.message);
  }
  return input.charismaScore === undefined
    ? state.right
    : withCharismaScore(state.right, input.charismaScore);
}

function sacredWeaponAct(state: BattleState): AvailableBattleAct | undefined {
  return discoverBattleActs(state).find(
    (act) =>
      act.subject.tag === "unitFeatureHeldWeaponActivation" &&
      act.subject.unitId === paladinSacredWeaponUnitId,
  );
}

function isPaladinAttackAct(
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

function requireSacredWeaponAct(state: BattleState): AvailableBattleAct & {
  readonly subject: Extract<
    AvailableBattleAct["subject"],
    { readonly tag: "unitFeatureHeldWeaponActivation" }
  >;
} {
  const act = sacredWeaponAct(state);
  if (act?.subject.tag !== "unitFeatureHeldWeaponActivation") {
    throw new Error("Expected Sacred Weapon held-weapon activation act.");
  }
  return { ...act, subject: act.subject };
}

function sacredWeaponDismissAct(state: BattleState):
  | (AvailableBattleAct & {
      readonly subject: Extract<
        AvailableBattleAct["subject"],
        { readonly tag: "unitFeature" }
      >;
    })
  | undefined {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "unitFeature" &&
      candidate.subject.unitId === paladinSacredWeaponUnitId,
  );
  return act?.subject.tag === "unitFeature"
    ? { ...act, subject: act.subject }
    : undefined;
}

function resolveSacredWeapon(
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

function sacredWeaponAttackRoll(
  state: BattleState,
  attackName: "Longsword (slashing)" | "Longsword (radiant)",
): Extract<BattleHole, { readonly kind: "attackRoll" }> {
  const subject = {
    tag: "action" as const,
    actorId: paladinId,
    action: "attack" as const,
    attackName,
  };
  const target = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  return requireResultHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [attackTargetFill(target, paladinId, targetId, attackName)],
    }),
    "attackRoll",
  );
}

function sacredWeaponProjection(
  state: BattleState,
  lastResult: SacredWeaponProjection["lastResult"],
): SacredWeaponProjection {
  const actor = state.combatants.get(paladinId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected Sacred Weapon character actor.");
  }
  const resource = actor.origin.resources.find(
    (candidate) => candidate.unit.id === paladinChannelDivinityUnitId,
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

function sacredWeaponActorResourceUnitIds(
  state: BattleState,
): readonly string[] {
  const actor = state.combatants.get(paladinId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected Sacred Weapon character actor.");
  }
  return actor.origin.resources.map((resource) => resource.unit.id);
}

function isSacredWeaponEffect(
  effect: BattleActiveEffect,
): effect is Extract<
  BattleActiveEffect,
  { readonly kind: "paladinSacredWeapon" }
> {
  return effect.kind === "paladinSacredWeapon";
}

function withMainWeaponItemId(state: BattleState, itemId: string): BattleState {
  const actor = state.combatants.get(paladinId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected Sacred Weapon character actor.");
  }
  const weapon = actor.origin.selectedLoadout.weapon;
  if (weapon === undefined) {
    throw new Error("Expected selected main weapon.");
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(paladinId, {
      ...actor,
      origin: {
        ...actor.origin,
        selectedLoadout: {
          ...actor.origin.selectedLoadout,
          weapon: { ...weapon, itemId },
        },
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

function withFreshAttackAction(
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
