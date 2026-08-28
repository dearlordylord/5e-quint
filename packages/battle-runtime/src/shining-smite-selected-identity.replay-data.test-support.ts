import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { expect } from "vitest";
import {
  battleFrontierInterruptDecisionForState,
  characterSpellInvocationRefForProcedureRefForTest,
} from "./battle-runtime.test-support.ts";

import { SHINING_SMITE_BRIGHT_LIGHT_RADIUS_FEET } from "./battle-reducer/spells-active-effects.ts";
import {
  shiningSmiteUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  attackRollFill,
  attackTargetFill,
  damageRollFillWithGroups,
  interruptDecisionFill,
  requireHole,
  requireResultHole,
  weaponAttackSubject,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  elapsedTimeTicks,
  movementFeet,
  resolveBattleInterrupt,
  resolveBattleSubject,
  snapshotBattle,
  spellSlotInvocationRef,
} from "./unit-profile-admission.test-support.ts";
import type { SelectedIdentityReplayWitness } from "./selected-identity-witness.test-support.ts";

export const shiningSmiteSelectedIdentityReplay = {
  describeLabel: "Shining Smite selected identity replay",
  taskId: "B25-SHINING-SMITE-IDENTITY-WITNESS",
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
            const subject = weaponAttackSubject(state, "Longsword");
            const target = requireResultHole(
              resolveBattleSubject({ state: state.state, subject, fills: [] }),
              "targetChoice",
            );
            const targetFill = attackTargetFill(
              target,
              spellCasterId,
              spellTargetId,
            );
            const roll = requireResultHole(
              resolveBattleSubject({
                state: state.state,
                subject,
                fills: [targetFill],
              }),
              "attackRoll",
            );
            const rollFill = attackRollFill(roll, {
              total: 15,
              naturalD20: 10,
            });
            const awaitingReaction = resolveBattleSubject({
              state: state.state,
              subject,
              fills: [targetFill, rollFill],
            });
            if (awaitingReaction.tag !== "needsHoles") {
              throw new Error("Expected Shining Smite attack-hit window.");
            }
            const choice = battleFrontierInterruptDecisionForState(
              awaitingReaction.state,
            )?.choices.find((candidate) => {
              if (
                candidate.kind !== "nestedProcedure" ||
                candidate.subject.command !== "castAttackHitBonusActionSpell"
              ) {
                return false;
              }
              return (
                characterSpellInvocationRefForProcedureRefForTest(
                  battleRuntimeSessionForTest({
                    state: awaitingReaction.state,
                    context: state.context,
                  }),
                  candidate.subject.casterId,
                  candidate.subject.procedureRef,
                ).spellId === shiningSmiteUnitId
              );
            });
            if (
              choice === undefined ||
              choice.kind !== "nestedProcedure" ||
              choice.subject.command !== "castAttackHitBonusActionSpell"
            ) {
              throw new Error(
                "Expected selected Shining Smite after-hit choice.",
              );
            }
            const selectedProcedureRef = choice.subject.procedureRef;
            expect(
              characterSpellInvocationRefForProcedureRefForTest(
                battleRuntimeSessionForTest({
                  state: awaitingReaction.state,
                  context: state.context,
                }),
                choice.subject.casterId,
                selectedProcedureRef,
              ),
            ).toEqual(
              spellSlotInvocationRef(
                shiningSmiteUnitId,
                3,
                "afterHitDamageAndIllumination",
              ),
            );

            const afterShining = resolveBattleInterrupt({
              state: awaitingReaction.state,
              fill: interruptDecisionFill(
                requireHole(awaitingReaction.holes, "interruptDecision"),
                {
                  kind: "resolve",
                  responderId: spellCasterId,
                  choice: {
                    kind: "castAttackHitBonusActionSpell",
                    procedureRef: selectedProcedureRef,
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
                    sourceProcedureRef: selectedProcedureRef,
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
            expect(
              snapshotBattle(afterWeaponDamage.state).lightEmitters,
            ).toEqual([
              {
                kind: "spellLightEmitter",
                sourceProcedureRef: selectedProcedureRef,
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
            return {
              lastResult: "shiningSmiteAfterHitDamageIllumination",
            };
          },
        },
      ],
    },
  ],
} satisfies SelectedIdentityReplayWitness<Readonly<Record<string, unknown>>>;
