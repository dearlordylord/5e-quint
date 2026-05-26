// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt B25-SHINING-SMITE-IDENTITY-WITNESS shining_smite
// UNIT-IDENTITY-MBT-REPLAY: B25-SHINING-SMITE-IDENTITY-WITNESS shining_smite doDiscoverShiningSmiteAfterHitDamageIllumination
import * as path from "node:path";

import { expect } from "vitest";

import { SHINING_SMITE_BRIGHT_LIGHT_RADIUS_FEET } from "./battle-reducer/spells-active-effects.ts";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import {
  shiningSmiteUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  attackRollFill,
  attackTargetFill,
  damageRollFillWithGroups,
  reactionDecisionFill,
  requireHole,
  requireResultHole,
  weaponAttackSubject,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  elapsedTimeTicks,
  movementFeet,
  resolveBattleReaction,
  resolveBattleSubject,
  snapshotBattle,
  spellSlotInvocationRef,
} from "./unit-profile-admission-test-support.ts";

defineSelectedIdentityWitness({
  describeLabel: "Shining Smite selected identity MBT",
  taskId: "B25-SHINING-SMITE-IDENTITY-WITNESS",
  specFile: path.resolve(
    import.meta.dirname,
    "../battle-runtime-shining-smite-selected-identity.mbt.qnt",
  ),
  projectionSchema: { lastResult: "str" },
  initialProjection: { lastResult: "init" },
  units: [
    {
      unitId: shiningSmiteUnitId,
      procedures: [
        {
          actionName: "doDiscoverShiningSmiteAfterHitDamageIllumination",
          projectionAfter: {
            lastResult: "shiningSmiteAfterHitDamageIllumination",
          },
          discover: () => {
            const spell = spellRecord(shiningSmiteUnitId);
            const state = spellBattle({
              preparedSpells: [spell],
              spellSlots: [{ spellLevel: 3, count: 1 }],
              attack: zeroAbilityWeaponAttack("weapon_longsword"),
              targetHp: 30,
              targetMaxHp: 30,
            });
            const subject = weaponAttackSubject("Longsword");
            const target = requireResultHole(
              resolveBattleSubject({ state, subject, fills: [] }),
              "targetChoice",
            );
            const targetFill = attackTargetFill(
              target,
              spellCasterId,
              spellTargetId,
              "Longsword",
            );
            const roll = requireResultHole(
              resolveBattleSubject({ state, subject, fills: [targetFill] }),
              "attackRoll",
            );
            const rollFill = attackRollFill(roll, {
              total: 15,
              naturalD20: 10,
            });
            const awaitingReaction = resolveBattleSubject({
              state,
              subject,
              fills: [targetFill, rollFill],
            });
            if (awaitingReaction.tag !== "needsHoles") {
              throw new Error("Expected Shining Smite attack-hit window.");
            }
            const choice =
              awaitingReaction.snapshot.pendingReaction?.choices.find(
                (candidate) =>
                  candidate.kind === "castAttackHitBonusActionSpell" &&
                  candidate.invocation.spellId === shiningSmiteUnitId,
              );
            if (
              choice === undefined ||
              choice.kind !== "castAttackHitBonusActionSpell"
            ) {
              throw new Error(
                "Expected selected Shining Smite after-hit choice.",
              );
            }
            expect(choice.invocation).toEqual(
              spellSlotInvocationRef(
                shiningSmiteUnitId,
                3,
                "afterHitDamageAndIllumination",
              ),
            );

            const afterShining = resolveBattleReaction({
              state: awaitingReaction.state,
              fill: reactionDecisionFill(
                requireHole(awaitingReaction.holes, "reactionDecision"),
                {
                  kind: "resolve",
                  reactorId: spellCasterId,
                  choice: {
                    kind: "castAttackHitBonusActionSpell",
                    invocation: choice.invocation,
                    fills: [],
                  },
                },
              ),
            });
            if (afterShining.tag !== "needsHoles") {
              throw new Error(
                "Expected Shining Smite to request attack damage.",
              );
            }
            const damage = requireHole(afterShining.holes, "rolledDice");
            expect(damage).toEqual(
              expect.objectContaining({
                spellWeaponDamageRiders: [
                  expect.objectContaining({
                    sourceSpellId: shiningSmiteUnitId,
                    damage: {
                      expr: { dice: 3, dieSize: 6 },
                      damageType: "radiant",
                    },
                  }),
                ],
              }),
            );
            const afterWeaponDamage = resolveBattleSubject({
              state: afterShining.state,
              subject,
              fills: [
                targetFill,
                rollFill,
                damageRollFillWithGroups(damage, [[4], [1, 2, 3]]),
              ],
            });
            if (afterWeaponDamage.tag !== "resolved") {
              throw new Error("Expected Shining Smite host attack to resolve.");
            }
            expect(snapshotBattle(afterWeaponDamage.state).lightEmitters).toEqual([
              {
                kind: "spellLightEmitter",
                sourceSpellId: shiningSmiteUnitId,
                sourceCombatantId: spellCasterId,
                attachment: { kind: "combatant", combatantId: spellTargetId },
                emission: {
                  kind: "brightAndDim",
                  brightRadiusFeet: SHINING_SMITE_BRIGHT_LIGHT_RADIUS_FEET,
                  dimAdditionalFeet: movementFeet(0),
                },
                opaqueCoverInteraction: { kind: "doesNotBlockEmission" },
                expiresAt: {
                  kind: "concentration",
                  combatantId: spellCasterId,
                  durationTicks: elapsedTimeTicks(10),
                },
              },
            ]);
          },
        },
      ],
    },
  ],
});
