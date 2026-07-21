import { abilityModifier } from "@dnd/shared-algebras/armor-class-algebra";
import { proficiencyBonus, type ProficiencyBonus } from "@dnd/shared/types";
import type {
  ClassName,
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
  type BattleRuntimeSession,
  type CombatantId,
} from "./index.ts";
import {
  animalFriendshipUnitId,
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
  readonly casterId?: CombatantId;
  readonly casterSpellcastingSourceClassName?: ClassName;
  readonly cantrips?: readonly SpellRecord[];
  readonly preparedSpells?: readonly SpellRecord[];
  readonly attack?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"];
  readonly offHandAttack?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["offHandAttack"];
  readonly selectedLoadout?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["selectedLoadout"];
  readonly spellSlots?: readonly {
    readonly spellLevel: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
    readonly count: number;
  }[];
  readonly extraTargetIds?: readonly CombatantId[];
  readonly extraTargetHp?: number;
  readonly extraTargetMaxHp?: number;
  readonly targetHp?: number;
  readonly targetMaxHp?: number;
  readonly targetStatBlock?: StatBlockRecord;
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
  readonly targetUnitFeatures?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["unitFeatures"];
  readonly targetSpellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
  readonly targetPreparedSpells?: readonly SpellRecord[];
  readonly casterClassLevels?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["classLevels"];
  readonly casterUnitRefs?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"];
  readonly casterUnitFeatures?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["unitFeatures"];
  readonly casterResources?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"];
  readonly casterMetamagic?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["metamagic"];
  readonly casterProficiencyBonus?: ProficiencyBonus;
  readonly casterWeaponProficiencies?: readonly WeaponProficiency[];
  readonly statBlockTargets?: readonly {
    readonly combatantId: CombatantId;
    readonly statBlock: StatBlockRecord;
    readonly initiative: number;
  }[];
}): BattleRuntimeSession {
  const casterId = input.casterId ?? spellCasterId;
  const casterClassLevels = input.casterClassLevels ?? [
    { className: "wizard", level: 1 },
  ];
  const result = startBattle({
    battleId: battleId("unit-profile-spell-admission"),
    combatants: [
      characterCreature({
        combatantId: casterId,
        displayName: "Spellcaster",
        initiative: 20,
        spellcasting: {
          sourceClassName:
            input.casterSpellcastingSourceClassName ??
            singleSpellcastingSourceClassName(casterClassLevels),
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
        ...(input.offHandAttack === undefined
          ? {}
          : { offHandAttack: input.offHandAttack }),
        ...(input.selectedLoadout === undefined
          ? {}
          : { selectedLoadout: input.selectedLoadout }),
        classLevels: casterClassLevels,
        ...(input.casterWeaponProficiencies === undefined
          ? {}
          : { weaponProficiencies: input.casterWeaponProficiencies }),
        ...(input.casterUnitRefs === undefined
          ? {}
          : { characterUnitRefs: input.casterUnitRefs }),
        ...(input.casterUnitFeatures === undefined
          ? {}
          : { unitFeatures: input.casterUnitFeatures }),
        ...(input.casterResources === undefined
          ? {}
          : { resources: input.casterResources }),
        ...(input.casterMetamagic === undefined
          ? {}
          : { metamagic: input.casterMetamagic }),
      }),
      ...(input.targetStatBlock === undefined
        ? [
            characterCreature({
              combatantId: spellTargetId,
              displayName: "Target",
              initiative: 10,
              ...(input.targetAttack === undefined
                ? {}
                : { attack: input.targetAttack }),
              ...(input.targetArmorClass === undefined
                ? {}
                : { armorClass: input.targetArmorClass }),
              ...(input.targetHp === undefined
                ? {}
                : { currentHp: input.targetHp }),
              ...(input.targetMaxHp === undefined
                ? {}
                : { maxHp: input.targetMaxHp }),
              ...(input.targetResources === undefined
                ? {}
                : { resources: input.targetResources }),
              ...(input.targetUnitRefs === undefined
                ? {}
                : { characterUnitRefs: input.targetUnitRefs }),
              ...(input.targetUnitFeatures === undefined
                ? {}
                : { unitFeatures: input.targetUnitFeatures }),
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
          ]
        : [
            statBlockCreature({
              combatantId: spellTargetId,
              statBlock: input.targetStatBlock,
              initiative: 10,
            }),
          ]),
      ...(input.extraTargetIds ?? []).map((combatantId, index) =>
        characterCreature({
          combatantId,
          displayName: `Target ${index + 2}`,
          initiative: 9 - index,
          ...(input.extraTargetHp === undefined
            ? {}
            : { currentHp: input.extraTargetHp }),
          ...(input.extraTargetMaxHp === undefined
            ? {}
            : { maxHp: input.extraTargetMaxHp }),
        }),
      ),
      ...(input.statBlockTargets ?? []).map((target) =>
        statBlockCreature({
          combatantId: target.combatantId,
          statBlock: target.statBlock,
          initiative: target.initiative,
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
  sourceCasterId: CombatantId = spellCasterId,
): BattleState {
  const spell = spellRecord(animalFriendshipUnitId);
  const session = spellBattle({
    casterId: sourceCasterId,
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
  const state = session.state;
  const act = spellAct({ session, spellId: animalFriendshipUnitId });
  const targetHole = requireHole(act.initialHoles, "spellTargetList");
  const targetFill = spellTargetListFill(
    targetHole,
    sourceCasterId,
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
