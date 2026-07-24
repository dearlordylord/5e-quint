import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3CF-03-PALADIN-SACRED-WEAPON-ACTIVATION paladin_sacred_weapon
// UNIT-IDENTITY-REPLAY: L3CF-03-PALADIN-SACRED-WEAPON-ACTIVATION paladin_sacred_weapon doActivateSacredWeapon doRejectSacredWeaponNoResource doRejectSacredWeaponRangedWeapon doRecastSacredWeapon
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3CF-04-PALADIN-SACRED-WEAPON-ATTACK-DAMAGE-LIGHT paladin_sacred_weapon
// UNIT-IDENTITY-REPLAY: L3CF-04-PALADIN-SACRED-WEAPON-ATTACK-DAMAGE-LIGHT paladin_sacred_weapon doProjectSacredWeaponAttackDamageAndLight doDismissSacredWeapon doEndSacredWeaponWhenNotCarryingWeapon
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.paladin-sacred-weapon
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.paladin-sacred-weapon
import { describe, expect, test } from "vitest";
import { classLevel } from "@dnd/shared/types";
import { characterBattleFeatureInitForTest } from "./battle-runtime-test-support.ts";
import { battleObjectId } from "./identity.ts";

import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.ts";
import type { BattleActDiscoveryCandidate } from "./battle-state-execution.ts";
import {
  attackTargetFill,
  battleId,
  battleUnitRefWithSupportProfiles,
  combatantId,
  discoverBattleActCandidates,
  discoverBattleActs,
  Either,
  requireResultHole,
  resolveBattleSubject,
  snapshotBattle,
  startBattle,
  type AvailableBattleAct,
  type BattleActiveEffect,
  type BattleHole,
  type BattleRuntimeSession,
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
    expect(sacredWeaponActorResourceUnitIds(sacredWeaponSession({}))).toEqual([
      paladinChannelDivinityUnitId,
    ]);
    expect(
      sacredWeaponActorResourceUnitIds(sacredWeaponSession({})),
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
    const session = sacredWeaponSession({ charismaScore: 8 });
    const state = session.state;
    const activated = withFreshAttackAction(
      resolveSacredWeapon(state, requireSacredWeaponAct(state)),
      state,
    );

    const attackSummaries = discoverBattleActs(
      battleRuntimeSessionForTest({
        ...session,
        state: activated,
      }),
    )
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
      .map((act) => act.summary);
    expect(attackSummaries).toEqual(
      expect.arrayContaining([
        "Take the Attack action with Longsword.",
        "Take the Attack action with Longsword (radiant).",
      ]),
    );

    const radiantAct = discoverBattleActs(
      battleRuntimeSessionForTest({
        ...session,
        state: activated,
      }),
    ).find(
      (act) =>
        act.summary === "Take the Attack action with Longsword (radiant).",
    );
    if (
      radiantAct === undefined ||
      radiantAct.subject.tag !== "action" ||
      radiantAct.subject.action !== "attack"
    ) {
      throw new Error("Expected radiant Longsword attack act.");
    }
    const attackRoll = sacredWeaponAttackRoll(activated, radiantAct.subject);
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
        sourceProcedureRef: expect.any(String),
        sourceCombatantId: paladinId,
        attachment: { kind: "combatant", combatantId: paladinId },
        emission: {
          kind: "brightAndDim",
          brightRadiusFeet: 20,
          dimAdditionalFeet: 20,
        },
        opaqueCoverInteraction: { kind: "doesNotBlockEmission" },
        expiresAt: { kind: "duration", durationTicks: 100 },
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

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Paladin Sacred Weapon selected identity replay",
  taskId: "L3CF-03-PALADIN-SACRED-WEAPON-ACTIVATION",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-paladin-sacred-weapon-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: {
      Init: "init",
      Activated: "activated",
      NoResource: "noResource",
      RangedWeapon: "rangedWeapon",
      Recast: "recast",
      AttackEffects: "attackEffects",
      Dismissed: "dismissed",
      NotCarryingWeapon: "notCarryingWeapon",
    },
  },
  projectionSchema: {
    activationOffered: "bool",
    channelDivinityUsesRemaining: "int",
    boundWeaponItemId: "str",
    activeEffectCount: "int",
    rejected: "bool",
    lastResult: "variant",
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
          discover: () =>
            sacredWeaponProjection(
              sacredWeaponBattle({ channelDivinityUsesRemaining: 0 }),
              "noResource",
            ),
        },
        {
          actionName: "doRejectSacredWeaponRangedWeapon",
          discover: () =>
            sacredWeaponProjection(
              sacredWeaponBattle({ weaponUnitId: "weapon_shortbow" }),
              "rangedWeapon",
            ),
        },
        {
          actionName: "doRecastSacredWeapon",
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
  return sacredWeaponSession(input).state;
}

function sacredWeaponSession(input: {
  readonly selectedProfile?: boolean;
  readonly channelDivinityUsesRemaining?: number;
  readonly weaponUnitId?: "weapon_longsword" | "weapon_shortbow";
  readonly charismaScore?: number;
}): BattleRuntimeSession {
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
        attack: zeroAbilityWeaponAttack(
          input.weaponUnitId ?? "weapon_longsword",
        ),
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
    throw new Error(state.left.message);
  }
  return input.charismaScore === undefined
    ? state.right
    : battleRuntimeSessionForTest({
        ...state.right,
        state: withCharismaScore(state.right.state, input.charismaScore),
      });
}

function sacredWeaponAct(
  state: BattleState,
): BattleActDiscoveryCandidate | undefined {
  return discoverBattleActCandidates(state).find(
    (act) => act.subject.tag === "unitFeatureHeldWeaponActivation",
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

function requireSacredWeaponAct(
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

function sacredWeaponDismissAct(state: BattleState):
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
      fills: [
        attackTargetFill(target, paladinId, targetId, "Longsword (radiant)"),
      ],
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

function sacredWeaponActorResourceUnitIds(
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

function withMainWeaponItemId(state: BattleState, itemId: string): BattleState {
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
          weapon: { ...weapon, itemId },
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
