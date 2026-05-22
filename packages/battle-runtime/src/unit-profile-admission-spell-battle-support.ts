import { abilityModifier } from "@dnd/shared-algebras/armor-class-algebra";
import { proficiencyBonus, type ProficiencyBonus } from "@dnd/shared/types";
import type {
  SpellRecord,
  StatBlockRecord,
  WeaponProficiency,
} from "@dnd/surface/surface/types";
import * as Either from "effect/Either";
import { expect } from "vitest";
import {
  battleId,
  resolveBattleSubject,
  startBattle,
  type BattleCreatureInit,
  type BattleState,
  type CombatantId,
} from "./index.ts";
import {
  animalFriendshipUnitId,
  oppositionSide,
  partySide,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  characterCreature,
  requireHole,
  requireResultHole,
  statBlockCreature,
  statBlockWithCreatureType,
} from "./unit-profile-admission-creature-fixture-support.ts";
import {
  savingThrowOutcomeFill,
  spellAct,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import {
  singleSpellcastingSourceClassName,
  spellRecord,
} from "./unit-profile-admission-spell-record-support.ts";

export function spellBattle(input: {
  readonly cantrips?: readonly SpellRecord[];
  readonly preparedSpells?: readonly SpellRecord[];
  readonly attack?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"];
  readonly spellSlots?: readonly {
    readonly spellLevel: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
    readonly count: number;
  }[];
  readonly extraTargetIds?: readonly CombatantId[];
  readonly targetHp?: number;
  readonly targetMaxHp?: number;
  readonly targetAttack?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"];
  readonly targetArmorClass?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["armorClass"];
  readonly targetResources?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"];
  readonly targetUnitRefs?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"];
  readonly targetSpellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
  readonly targetPreparedSpells?: readonly SpellRecord[];
  readonly casterClassLevels?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["classLevels"];
  readonly casterProficiencyBonus?: ProficiencyBonus;
  readonly casterWeaponProficiencies?: readonly WeaponProficiency[];
  readonly statBlockTargets?: readonly {
    readonly combatantId: CombatantId;
    readonly statBlock: StatBlockRecord;
    readonly initiative: number;
    readonly side?: typeof partySide | typeof oppositionSide;
  }[];
}): BattleState {
  const casterClassLevels = input.casterClassLevels ?? [
    { className: "wizard", level: 1 },
  ];
  const result = startBattle({
    battleId: battleId("unit-profile-spell-admission"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Spellcaster",
        initiative: 20,
        side: partySide,
        spellcasting: {
          sourceClassName: singleSpellcastingSourceClassName(casterClassLevels),
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: input.casterProficiencyBonus ?? proficiencyBonus(2),
          canCastSpells: true,
          cantrips: input.cantrips ?? [],
          preparedSpells: input.preparedSpells ?? [],
          featurePreparedSpells: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: input.spellSlots ?? [{ spellLevel: 1, count: 2 }],
        },
        ...(input.attack === undefined ? {} : { attack: input.attack }),
        classLevels: casterClassLevels,
        ...(input.casterWeaponProficiencies === undefined
          ? {}
          : { weaponProficiencies: input.casterWeaponProficiencies }),
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
        ...(input.targetAttack === undefined
          ? {}
          : { attack: input.targetAttack }),
        ...(input.targetArmorClass === undefined
          ? {}
          : { armorClass: input.targetArmorClass }),
        ...(input.targetHp === undefined ? {} : { currentHp: input.targetHp }),
        ...(input.targetMaxHp === undefined
          ? {}
          : { maxHp: input.targetMaxHp }),
        ...(input.targetResources === undefined
          ? {}
          : { resources: input.targetResources }),
        ...(input.targetUnitRefs === undefined
          ? {}
          : { characterUnitRefs: input.targetUnitRefs }),
        ...(input.targetSpellcasting === undefined &&
        input.targetPreparedSpells === undefined
          ? {}
          : {
              spellcasting: input.targetSpellcasting ?? {
                sourceClassName: "wizard",
                spellcastingAbilityModifier: abilityModifier(3),
                proficiencyBonus: proficiencyBonus(2),
                canCastSpells: true,
                cantrips: [],
                preparedSpells: input.targetPreparedSpells ?? [],
                featurePreparedSpells: [],
                spellbookRitualSpellAccesses: [],
                invocationSpellAccesses: [],
                spellSlots: [{ spellLevel: 1, count: 1 }],
              },
            }),
      }),
      ...(input.extraTargetIds ?? []).map((combatantId, index) =>
        characterCreature({
          combatantId,
          displayName: `Target ${index + 2}`,
          initiative: 9 - index,
          side: oppositionSide,
        }),
      ),
      ...(input.statBlockTargets ?? []).map((target) =>
        statBlockCreature({
          combatantId: target.combatantId,
          statBlock: target.statBlock,
          initiative: target.initiative,
          ...(target.side === undefined ? {} : { side: target.side }),
        }),
      ),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

export function resolvedAnimalFriendshipState(
  beastId: CombatantId,
  additionalStatBlockTargets: NonNullable<
    Parameters<typeof spellBattle>[0]["statBlockTargets"]
  >,
): BattleState {
  const spell = spellRecord(animalFriendshipUnitId);
  const state = spellBattle({
    preparedSpells: [spell],
    statBlockTargets: [
      {
        combatantId: beastId,
        statBlock: statBlockWithCreatureType("beast"),
        initiative: 9,
      },
      ...additionalStatBlockTargets,
    ],
  });
  const act = spellAct({ state, spellId: animalFriendshipUnitId });
  const targetHole = requireHole(act.initialHoles, "spellTargetList");
  const targetFill = spellTargetListFill(
    targetHole,
    spellCasterId,
    animalFriendshipUnitId,
    [beastId],
  );
  const saveHole = requireResultHole(
    resolveBattleSubject({ state, subject: act.subject, fills: [targetFill] }),
    "savingThrowOutcome",
  );
  const resolved = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      targetFill,
      savingThrowOutcomeFill(saveHole, [
        { targetId: beastId, succeeded: false },
      ]),
    ],
  });
  expect(resolved).toMatchObject({ tag: "resolved" });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Animal Friendship to resolve.");
  }
  return resolved.state;
}
