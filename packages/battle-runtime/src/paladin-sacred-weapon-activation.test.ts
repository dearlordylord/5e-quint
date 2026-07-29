// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.paladin-sacred-weapon
import { describe, expect, test } from "vitest";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { assertBattleSnapshotCodecRoundTripForTest } from "./battle-runtime.test-support.ts";
import { normalizeEarlyEndedOngoingFeatures } from "./battle-reducer/creature-state.ts";
import { attackActionOptionsForActor } from "./battle-reducer/attack-damage-apply.ts";
import {
  abilityModifier,
  attackBonus,
  discoverBattleActs,
  resolveBattleSubject,
  snapshotBattle,
  type AvailableBattleAct,
  type BattleSubject,
} from "./unit-profile-admission.test-support.ts";
import { paladinChannelDivinityUnitId } from "./unit-profile-admission-catalog.test-support.ts";
import {
  clericChannelDivinityUnitId,
  isPaladinAttackAct,
  paladinId,
  requireSacredWeaponAct,
  resolveSacredWeapon,
  sacredWeaponAct,
  sacredWeaponActorResourceUnitIds,
  sacredWeaponAttackRoll,
  sacredWeaponBattle,
  sacredWeaponDismissAct,
  sacredWeaponProjection,
  sacredWeaponSession,
  withFreshAttackAction,
  withMainWeaponItemId,
} from "./paladin-sacred-weapon-activation.test-support.ts";

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
    const session = sacredWeaponSession({
      charismaScore: 8,
      alternateAbilityChoices: [
        {
          ability: "dex",
          abilityModifier: abilityModifier(2),
          attackBonus: attackBonus(4),
          damageAbilityModifier: abilityModifier(2),
        },
      ],
    });
    const state = session.state;
    const activated = withFreshAttackAction(
      resolveSacredWeapon(state, requireSacredWeaponAct(state)),
      state,
    );
    expect(
      attackActionOptionsForActor(activated, paladinId).find(
        (attack) => attack.kind === "weapon" && attack.ability === "dex",
      ),
    ).toMatchObject({
      ability: "dex",
      abilityModifier: 2,
      attackBonus: 5,
      damageAbilityModifier: 2,
    });

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
    const snapshot = snapshotBattle(activated);

    expect(snapshot.lightEmitters).toEqual([
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
    assertBattleSnapshotCodecRoundTripForTest(snapshot);
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
