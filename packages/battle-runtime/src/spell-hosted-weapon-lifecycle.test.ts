// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-spell-hosted-weapon-attack
import { describe, expect, test } from "vitest";

import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { discoverBattleActs } from "./battle-act-composition.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  battleProcedureExecutionRefForTest,
  removeBattleCombatantsRight,
} from "./battle-runtime.test-support.ts";
import { battleObjectId, battleTablePositionId } from "./identity.ts";
import { battleStateWithGroundObjects } from "./battle-reducer/battle-object-lifecycle.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  maybeSpellAct,
  spellAct,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  attackRollFill,
  attackTargetFill,
  requireHole,
  requireResultHole,
  sameClubMainAndOffHandLoadout,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  spellCasterId,
  spellTargetId,
  trueStrikeUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  classLevel,
  decodeUnitRecordSync,
  DieRollResult,
  resolveBattleSubject,
  trueStrikeInput,
} from "./unit-profile-admission.test-support.ts";

describe("spell-hosted weapon lifecycle", () => {
  test("property-restricted Martial proficiency admits only a matching material weapon", () => {
    const trueStrike = spellRecord(trueStrikeUnitId);
    const eligible = spellBattle({
      cantrips: [trueStrike],
      spellSlots: [],
      attack: zeroAbilityWeaponAttack("weapon_shortsword"),
      casterWeaponProficiencies: [
        {
          kind: "weapon_category_with_properties",
          category: "martial",
          anyOfProperties: ["finesse", "light"],
        },
      ],
    });
    const ineligible = spellBattle({
      cantrips: [trueStrike],
      spellSlots: [],
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
      casterWeaponProficiencies: [
        {
          kind: "weapon_category_with_properties",
          category: "martial",
          anyOfProperties: ["finesse", "light"],
        },
      ],
    });

    expect(
      maybeSpellAct({
        session: eligible,
        spellId: trueStrikeUnitId,
        componentWeaponObjectId: battleObjectId("main:weapon_shortsword"),
      }),
    ).toBeDefined();
    expect(
      discoverBattleActs(ineligible).some(
        (act) =>
          act.subject.tag === "actionSpell" &&
          battleActSpellPresentation(act)?.invocation.spellId ===
            trueStrikeUnitId,
      ),
    ).toBe(false);
  });

  test("category proficiency admits both eligible held component weapons", () => {
    const club = zeroAbilityWeaponAttack("weapon_club");
    const session = spellBattle({
      cantrips: [spellRecord(trueStrikeUnitId)],
      spellSlots: [],
      attack: club,
      offHandAttack: club,
      selectedLoadout: sameClubMainAndOffHandLoadout(),
      casterWeaponProficiencies: [
        { kind: "weapon_category", category: "simple" },
      ],
    });

    expect(
      maybeSpellAct({
        session,
        spellId: trueStrikeUnitId,
        componentWeaponObjectId: battleObjectId("main:weapon_club"),
      }),
    ).toBeDefined();
    expect(
      maybeSpellAct({
        session,
        spellId: trueStrikeUnitId,
        componentWeaponObjectId: battleObjectId("off:weapon_club"),
      }),
    ).toBeDefined();
  });

  test.each([
    {
      label: "non-direct phase",
      mutate: (input: typeof trueStrikeInput) => ({
        ...input,
        mechanics: {
          ...input.mechanics,
          phases: [
            {
              kind: "random_table",
              roll: { die: 2 },
              outcomes: [
                { min: 1, max: 1, label: "quiet" },
                { min: 2, max: 2, label: "loud" },
              ],
            },
          ],
        },
      }),
    },
    {
      label: "direct phase without an effect",
      mutate: (input: typeof trueStrikeInput) => ({
        ...input,
        mechanics: {
          ...input.mechanics,
          phases: [
            {
              kind: "direct",
              attachment: { kind: "self" },
            },
          ],
        },
      }),
    },
    {
      label: "non-weapon-attack effect",
      mutate: (input: typeof trueStrikeInput) => ({
        ...input,
        mechanics: {
          ...input.mechanics,
          phases: [
            {
              kind: "direct",
              attachment: { kind: "self" },
              effects: [
                {
                  kind: "damage",
                  amount: {
                    kind: "fixed",
                    expr: { dice: 1, dieSize: 4 },
                  },
                  damageType: "radiant",
                },
              ],
            },
          ],
        },
      }),
    },
    {
      label: "unsupported bonus-damage scale",
      mutate: (input: typeof trueStrikeInput) => ({
        ...input,
        mechanics: {
          ...input.mechanics,
          phases: [
            {
              ...input.mechanics.phases[0],
              effects: [
                {
                  ...input.mechanics.phases[0].effects[0],
                  bonusDamage: {
                    damageType: "radiant",
                    amount: { kind: "resource_spent" },
                  },
                },
              ],
            },
          ],
        },
      }),
    },
  ])(
    "rejects a synthetic hosted-weapon candidate with $label",
    ({ mutate }) => {
      const decoded = decodeUnitRecordSync({
        ...mutate(trueStrikeInput),
        id: "synthetic_hosted_weapon_candidate",
        name: "Synthetic Hosted Weapon Candidate",
        provenance: {
          kind: "synthetic-test",
          section: "Synthetic Hosted Weapon Candidate",
        },
      });
      if (decoded.kind !== "spell") {
        throw new Error("Expected a synthetic spell candidate.");
      }
      const session = spellBattle({
        cantrips: [decoded],
        spellSlots: [],
        attack: zeroAbilityWeaponAttack("weapon_dagger"),
        casterWeaponProficiencies: [
          { kind: "weapon_category", category: "simple" },
        ],
      });

      expect(discoverBattleActs(session)).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({
            subject: expect.objectContaining({ tag: "actionSpell" }),
          }),
        ]),
      );
    },
  );

  test("offers no cast when the component weapon has no eligible attack target", () => {
    const session = spellBattle({
      cantrips: [spellRecord(trueStrikeUnitId)],
      spellSlots: [],
      attack: zeroAbilityWeaponAttack("weapon_dagger"),
      casterWeaponProficiencies: [
        { kind: "weapon_category", category: "simple" },
      ],
    });
    const withoutTargets = battleRuntimeSessionForTest({
      ...session,
      state: removeBattleCombatantsRight({
        state: session.state,
        combatantIds: [spellTargetId],
      }),
    });

    expect(
      discoverBattleActs(withoutTargets).some(
        (act) =>
          act.subject.tag === "actionSpell" &&
          battleActSpellPresentation(act)?.invocation.spellId ===
            trueStrikeUnitId,
      ),
    ).toBe(false);
  });

  test("a dropped component weapon removes its cast and makes a selected cast stale", () => {
    const session = spellBattle({
      cantrips: [spellRecord(trueStrikeUnitId)],
      spellSlots: [],
      attack: zeroAbilityWeaponAttack("weapon_dagger"),
      casterWeaponProficiencies: [
        { kind: "weapon_category", category: "simple" },
      ],
    });
    const selected = spellAct({
      session,
      spellId: trueStrikeUnitId,
      componentWeaponObjectId: battleObjectId("main:weapon_dagger"),
    });
    const dropped = battleStateWithGroundObjects(session.state, [
      {
        actorId: spellCasterId,
        objectId: battleObjectId("main:weapon_dagger"),
        positionId: battleTablePositionId("hosted-weapon-drop-position"),
        source: {
          kind: "spell",
          sourceCombatantId: spellCasterId,
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            "synthetic-held-weapon-drop",
          ),
        },
      },
    ]);
    expect(dropped.tag).toBe("applied");
    if (dropped.tag !== "applied") {
      throw new Error("Expected the held component weapon to drop.");
    }
    const afterDrop = battleRuntimeSessionForTest({
      ...session,
      state: dropped.state,
    });

    expect(
      maybeSpellAct({
        session: afterDrop,
        spellId: trueStrikeUnitId,
        componentWeaponObjectId: battleObjectId("main:weapon_dagger"),
      }),
    ).toBeUndefined();
    expect(
      resolveBattleSubject({
        state: dropped.state,
        subject: selected.subject,
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("normal weapon damage stays normal and has no cantrip bonus before level 5", () => {
    const session = spellBattle({
      cantrips: [spellRecord(trueStrikeUnitId)],
      spellSlots: [],
      attack: zeroAbilityWeaponAttack("weapon_dagger"),
      casterClassLevels: [{ className: "wizard", level: classLevel(1) }],
      casterWeaponProficiencies: [
        { kind: "weapon_category", category: "simple" },
      ],
    });
    const act = spellAct({ session, spellId: trueStrikeUnitId });
    const damageType = requireHole(act.initialHoles, "damageTypeChoice");
    const target = requireHole(act.initialHoles, "targetChoice");
    const fills = [
      {
        kind: "damageTypeChoice" as const,
        holeId: damageType.holeId,
        value: "piercing" as const,
      },
      attackTargetFill(target, spellCasterId, spellTargetId),
    ];
    const attack = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills,
      }),
      "attackRoll",
    );
    const damage = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [
          ...fills,
          attackRollFill(attack, {
            total: 15,
            naturalD20: DieRollResult(12),
          }),
        ],
      }),
      "rolledDice",
    );
    if (!("attack" in damage) || damage.attack.kind !== "weapon") {
      throw new Error("Expected hosted weapon attack damage.");
    }

    expect(damage.attack.weapon.damage).toEqual(
      expect.objectContaining({ damageType: "piercing", dice: 1, dieSize: 4 }),
    );
    expect(damage.spellWeaponDamageRiders).toBeUndefined();
  });
});
