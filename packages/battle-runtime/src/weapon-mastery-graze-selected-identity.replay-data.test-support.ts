import { Result } from "effect";
import { expect } from "vitest";
import {
  attackInitialTargetHole,
  attackRollFill,
  attackRollHoleAfterTarget,
  fighterAttackSubject,
  fighterVsGoblinBattle,
  goblinId,
  grazeWeaponMasterySelections,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  targetFill,
  testGrazeWeaponAttack,
  testGrazeWeaponUnitRef,
  unitLibrary,
} from "./battle-runtime.test-support.ts";
import { battleUnitRefWithSupportProfiles } from "./unit-feature-support.ts";
import type { SelectedIdentityReplayWitness } from "./selected-identity-witness.test-support.ts";

// SRD 5.2.1 equipment.md, Graze: an unlocked weapon miss may deal the
// attack ability modifier in the weapon's damage type. The catalog contains
// the SRD mastery; the fixture is synthetic because the installed weapon catalog
// has no Graze weapon.
export const grazeSelectedIdentityReplay = {
  describeLabel: "Graze selected identity replay",
  taskId: "GH530-WEAPON-MASTERY-GRAZE",
  initialProjection: { lastResult: "init", targetHp: 10 },
  units: [
    {
      unitId: "mastery_graze",
      procedures: [
        {
          actionName: "doResolveGrazeMasteryMiss",
          projectionAfter: { lastResult: "resolved", targetHp: 7 },
          discover: () => {
            const graze = unitLibrary.requireUnit("mastery_graze");
            const grazeRef = battleUnitRefWithSupportProfiles({
              unit: graze,
              unitRef: { unitId: graze.id },
            });
            if (Result.isFailure(grazeRef)) {
              throw new Error(grazeRef.failure.message);
            }
            const weapon = testGrazeWeaponUnitRef();
            const state = fighterVsGoblinBattle({
              characterUnitRefs: [grazeRef.success, weapon],
              weaponMasteries: grazeWeaponMasterySelections(),
              attack: testGrazeWeaponAttack(),
            });
            const subject = fighterAttackSubject(state, String(weapon.unit.id));
            const targetHole = attackInitialTargetHole(state, subject);
            const rollHole = attackRollHoleAfterTarget(
              state,
              targetHole,
              subject,
            );
            const fills = [
              targetFill(targetHole, goblinId),
              attackRollFill(rollHole, { total: 10, naturalD20: 8 }),
            ];
            const missed = resolveBattleSubject({ state, subject, fills });
            const decision = requireHole(missed, "unitFeatureDecision");
            expect(decision).toMatchObject({
              label: "Use Graze",
              choices: ["use", "decline"],
            });
            const resolved = requireResolved(
              resolveBattleSubject({
                state,
                subject,
                fills: [
                  ...fills,
                  {
                    kind: "unitFeatureDecision",
                    holeId: decision.holeId,
                    value: "use",
                  },
                ],
              }),
            );
            const goblin = resolved.state.combatants.get(goblinId);
            if (goblin === undefined)
              throw new Error("Expected the Graze target.");
            return { lastResult: resolved.tag, targetHp: Number(goblin.hp) };
          },
        },
      ],
    },
  ],
} satisfies SelectedIdentityReplayWitness<Readonly<Record<string, unknown>>>;
