// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3CF-03-PALADIN-SACRED-WEAPON-ACTIVATION paladin_sacred_weapon
// UNIT-IDENTITY-REPLAY: L3CF-03-PALADIN-SACRED-WEAPON-ACTIVATION paladin_sacred_weapon doActivateSacredWeapon doRejectSacredWeaponNoResource doRejectSacredWeaponRangedWeapon doRecastSacredWeapon
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3CF-04-PALADIN-SACRED-WEAPON-ATTACK-DAMAGE-LIGHT paladin_sacred_weapon
// UNIT-IDENTITY-REPLAY: L3CF-04-PALADIN-SACRED-WEAPON-ATTACK-DAMAGE-LIGHT paladin_sacred_weapon doProjectSacredWeaponAttackDamageAndLight doDismissSacredWeapon doEndSacredWeaponWhenNotCarryingWeapon
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.paladin-sacred-weapon
import { normalizeEarlyEndedOngoingFeatures } from "./battle-reducer/creature-state.ts";
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.test-support.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.test-support.ts";
import { resolveBattleSubject } from "./unit-profile-admission.test-support.ts";
import { paladinSacredWeaponUnitId } from "./unit-profile-admission-catalog.test-support.ts";
import {
  requireSacredWeaponAct,
  resolveSacredWeapon,
  sacredWeaponBattle,
  sacredWeaponDismissAct,
  sacredWeaponProjection,
  withFreshAttackAction,
  withMainWeaponItemId,
} from "./paladin-sacred-weapon-activation.test-support.ts";

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
