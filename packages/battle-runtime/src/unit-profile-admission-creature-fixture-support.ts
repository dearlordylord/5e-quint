import {
  abilityModifier,
  defaultArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import {
  attackBonus,
  DieRollResult,
  Hp,
  movementFeet,
} from "@dnd/shared/types";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import type {
  StatBlockRecord,
  UnitRecord,
  WeaponProficiency,
} from "@dnd/surface/surface/types";
import { expect } from "vitest";
import weaponClubInput from "../../surface/content/weapon_club.json";
import weaponGreatswordInput from "../../surface/content/weapon_greatsword.json";
import {
  characterId,
  discoverBattleActs,
  initiativeScore,
  resolveBattleSubject,
  type AvailableBattleAct,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import {
  oppositionSide,
  partySide,
  spellCasterId,
  spellTargetId,
  statBlockCatalog,
  unitLibrary,
} from "./unit-profile-admission-catalog-support.ts";

const testUnitRecords = [
  decodeUnitRecordSync(weaponClubInput),
  decodeUnitRecordSync(weaponGreatswordInput),
] satisfies ReadonlyArray<UnitRecord>;

const testUnitRecordsById: ReadonlyMap<UnitRecord["id"], UnitRecord> = new Map(
  testUnitRecords.map((unit): readonly [UnitRecord["id"], UnitRecord] => [
    unit.id,
    unit,
  ]),
);

function requireTestOrCatalogUnit(unitId: UnitRecord["id"]): UnitRecord {
  return testUnitRecordsById.get(unitId) ?? unitLibrary.requireUnit(unitId);
}

export function characterCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly side: typeof partySide | typeof oppositionSide;
  readonly attack?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"];
  readonly offHandAttack?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["offHandAttack"];
  readonly characterUnitRefs?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"];
  readonly spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
  readonly classLevels?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["classLevels"];
  readonly weaponProficiencies?: readonly WeaponProficiency[];
  readonly currentHp?: number;
  readonly maxHp?: number;
  readonly tempHp?: number;
  readonly resources?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"];
  readonly metamagic?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["metamagic"];
  readonly conditions?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["conditions"];
  readonly armorClass?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["armorClass"];
  readonly selectedLoadout?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["selectedLoadout"];
  readonly unitFeatures?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["unitFeatures"];
}): BattleCreatureInit {
  const attack = input.attack ?? null;
  const selectedLoadout =
    input.selectedLoadout ??
    (attack === null
      ? {}
      : {
          weapon: {
            itemId: `main:${attack.weapon.id}`,
            unitId: attack.weapon.id,
            grip: "one_handed" as const,
          },
        });
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    side: input.side,
    creatureInit: {
      kind: "character",
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: input.characterUnitRefs ?? [],
      classLevels: input.classLevels ?? [{ className: "wizard", level: 1 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics(),
      ...(input.weaponProficiencies === undefined
        ? {}
        : { weaponProficiencies: input.weaponProficiencies }),
      armorClass:
        input.armorClass !== undefined
          ? input.armorClass
          : {
              ...defaultArmorClassState(),
              leftHandUse:
                selectedLoadout.shield !== undefined
                  ? "shield"
                  : selectedLoadout.offHandWeapon !== undefined
                    ? "offWeapon"
                    : "free",
              rightHandUse:
                selectedLoadout.weapon === undefined ? "free" : "mainWeapon",
            },
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(input.currentHp ?? 12),
      maxHp: Hp(input.maxHp ?? 12),
      tempHp: Hp(input.tempHp ?? 0),
      selectedLoadout,
      attack,
      ...(input.offHandAttack === undefined
        ? {}
        : { offHandAttack: input.offHandAttack }),
      ...(input.unitFeatures === undefined
        ? {}
        : { unitFeatures: input.unitFeatures }),
      ...(input.resources === undefined ? {} : { resources: input.resources }),
      ...(input.metamagic === undefined ? {} : { metamagic: input.metamagic }),
      ...(input.conditions === undefined
        ? {}
        : { conditions: input.conditions }),
      unarmedStrike: {
        kind: "unarmedStrike",
        effect: {
          kind: "damage",
          damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
        },
        attackAbility: "str",
        attackAbilityModifier: abilityModifier(0),
        attackBonus: attackBonus(2),
        damageAbilityModifier: abilityModifier(0),
      },
      ...(input.spellcasting === undefined
        ? {}
        : { spellcasting: input.spellcasting }),
    },
  };
}

export function statBlockWithCreatureType(
  creatureType: StatBlockRecord["statBlock"]["creatureType"],
): StatBlockRecord {
  const base = statBlockCatalog.requireStatBlock("stat_block_goblin_warrior");
  return {
    ...base,
    id: `stat_block_test_${creatureType}`,
    name: `Test ${creatureType}`,
    statBlock: {
      ...base.statBlock,
      displayName: `Test ${creatureType}`,
      creatureType,
    },
  };
}

export function legendaryActionStatBlock(): StatBlockRecord {
  const base = statBlockCatalog.requireStatBlock("stat_block_goblin_warrior");
  const scimitar = base.statBlock.actions?.attacks?.find(
    (attack) => attack.name === "Scimitar",
  );
  if (scimitar === undefined) {
    throw new Error("Expected Goblin Warrior Scimitar fixture.");
  }
  return {
    ...base,
    id: "stat_block_command_legendary",
    name: "Command Legendary",
    statBlock: {
      ...base.statBlock,
      displayName: "Command Legendary",
      legendaryActions: {
        uses: 1,
        actions: {
          attacks: [
            {
              ...scimitar,
              name: "Tail Swipe",
            },
          ],
        },
      },
    },
  };
}

export function statBlockCreature(input: {
  readonly combatantId: CombatantId;
  readonly statBlock: StatBlockRecord;
  readonly initiative: number;
  readonly side?: typeof partySide | typeof oppositionSide;
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.statBlock.statBlock.displayName,
    initiative: initiativeScore(input.initiative),
    side: input.side ?? oppositionSide,
    creatureInit: {
      kind: "statBlock",
      statBlock: input.statBlock,
      currentHp: Hp(statBlockLiteralNumber(input.statBlock.statBlock.hp)),
      maxHp: Hp(statBlockLiteralNumber(input.statBlock.statBlock.hp)),
      tempHp: Hp(0),
    },
  };
}

export function statBlockLiteralNumber(
  value: StatBlockRecord["statBlock"]["hp"],
): number {
  if (typeof value === "number") {
    return value;
  }
  if (value.kind === "literal") {
    return value.value;
  }
  throw new Error("Expected literal stat block number.");
}

export function statBlockAttackAct(
  state: BattleState,
  actorId: CombatantId,
  attackName: string,
): AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "action" }>;
} {
  const matchingActs = discoverBattleActs(state).filter(
    (
      candidate,
    ): candidate is AvailableBattleAct & {
      readonly subject: Extract<BattleSubject, { readonly tag: "action" }>;
    } =>
      candidate.subject.tag === "action" &&
      candidate.subject.actorId === actorId &&
      candidate.subject.action === "attack" &&
      candidate.subject.statBlockDamageNotation === undefined &&
      candidate.summary === `Take the Attack action with ${attackName}.`,
  );
  expect(matchingActs).toHaveLength(1);
  const [act] = matchingActs;
  if (act === undefined) {
    throw new Error(`Expected one rolled ${attackName} Stat Block attack act.`);
  }
  return act;
}

export function zeroAbilityWeaponAttack(
  unitId: Extract<UnitRecord, { readonly kind: "weapon" }>["id"],
): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"]
> {
  const weapon = requireTestOrCatalogUnit(unitId);
  if (weapon.kind !== "weapon") {
    throw new Error(`Expected ${unitId} weapon Unit.`);
  }
  return {
    kind: "weapon",
    weapon,
    ability: "str",
    abilityModifier: abilityModifier(0),
  };
}

export function sameClubMainAndOffHandLoadout(): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["selectedLoadout"]
> {
  return {
    weapon: {
      itemId: "main:weapon_club",
      unitId: "weapon_club",
      grip: "one_handed",
    },
    offHandWeapon: {
      itemId: "off:weapon_club",
      unitId: "weapon_club",
    },
  };
}

export function weaponAttackSubject(
  state: BattleState,
  attackName: string,
): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  const subject = discoverBattleActs(state).find(
    (act) =>
      act.subject.tag === "action" &&
      act.subject.action === "attack" &&
      act.subject.actorId === spellCasterId &&
      act.summary === `Take the Attack action with ${attackName}.`,
  )?.subject;
  if (subject?.tag !== "action" || subject.action !== "attack") {
    throw new Error(`Expected discovered ${attackName} attack.`);
  }
  return subject;
}

export function requireHole<K extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  const hole = holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: K }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

export function requireResultHole<K extends BattleHole["kind"]>(
  result: ReturnType<typeof resolveBattleSubject>,
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  if (result.tag !== "needsHoles") {
    throw new Error(
      `Expected ${kind} hole result, got ${result.tag}: ${"message" in result ? result.message : "no message"}.`,
    );
  }
  expect(result).toMatchObject({ tag: "needsHoles" });
  return requireHole(result.holes, kind);
}

export function requireCombatant(
  state: BattleState,
  combatantId: CombatantId,
): NonNullable<
  BattleState["combatants"] extends ReadonlyMap<CombatantId, infer C>
    ? C
    : never
> {
  const combatant = state.combatants.get(combatantId);
  if (combatant === undefined) {
    throw new Error(`Expected combatant ${combatantId}.`);
  }
  return combatant;
}

export function weaponAttackRollHole(input: {
  readonly state: BattleState;
  readonly attackName: "Longsword" | "Shortbow";
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
}): Extract<BattleHole, { readonly kind: "attackRoll" }> {
  const subject = discoverBattleActs(input.state).find(
    (act) =>
      act.subject.tag === "action" &&
      act.subject.action === "attack" &&
      act.subject.actorId === input.actorId &&
      act.summary === `Take the Attack action with ${input.attackName}.`,
  )?.subject;
  if (subject?.tag !== "action" || subject.action !== "attack") {
    throw new Error(`Expected discovered ${input.attackName} attack.`);
  }
  const targetHole = requireResultHole(
    resolveBattleSubject({ state: input.state, subject, fills: [] }),
    "targetChoice",
  );
  return requireResultHole(
    resolveBattleSubject({
      state: input.state,
      subject,
      fills: [
        attackTargetFill(
          targetHole,
          input.actorId,
          input.targetId,
          input.attackName,
        ),
      ],
    }),
    "attackRoll",
  );
}

export function interruptDecisionFill(
  hole: Extract<BattleHole, { readonly kind: "interruptDecision" }>,
  value: Extract<BattleFill, { readonly kind: "interruptDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "interruptDecision" }> {
  return { kind: "interruptDecision", holeId: hole.holeId, value };
}

export function abilityCheckFill(
  hole: Extract<BattleHole, { readonly kind: "abilityCheck" }>,
  value:
    | number
    | {
        readonly total: number;
        readonly naturalD20?: number;
        readonly d20TestNaturalOneReroll?: Extract<
          BattleFill,
          { readonly kind: "abilityCheck" }
        >["value"]["d20TestNaturalOneReroll"];
      },
  spatialFacts?: Extract<
    BattleFill,
    { readonly kind: "abilityCheck" }
  >["spatialFacts"],
): Extract<BattleFill, { readonly kind: "abilityCheck" }> {
  const checkValue = typeof value === "number" ? { total: value } : value;
  return {
    kind: "abilityCheck",
    holeId: hole.holeId,
    value: {
      total: checkValue.total,
      ...(checkValue.naturalD20 === undefined
        ? {}
        : { naturalD20: DieRollResult(checkValue.naturalD20) }),
      ...(checkValue.d20TestNaturalOneReroll === undefined
        ? {}
        : { d20TestNaturalOneReroll: checkValue.d20TestNaturalOneReroll }),
    },
    ...(spatialFacts === undefined ? {} : { spatialFacts }),
  };
}

export function resolveWeaponAttack(
  state: BattleState,
  attackName: "Longsword" | "Shortbow",
): ReturnType<typeof resolveBattleSubject> {
  const subject = weaponAttackSubject(state, attackName);
  const target = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const roll = requireResultHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        attackTargetFill(target, spellCasterId, spellTargetId, attackName),
      ],
    }),
    "attackRoll",
  );
  const damage = requireResultHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        attackTargetFill(target, spellCasterId, spellTargetId, attackName),
        attackRollFill(roll, { total: 15, naturalD20: 10 }),
      ],
    }),
    "rolledDice",
  );
  return resolveBattleSubject({
    state,
    subject,
    fills: [
      attackTargetFill(target, spellCasterId, spellTargetId, attackName),
      attackRollFill(roll, { total: 15, naturalD20: 10 }),
      damageRollFillWithGroups(damage, [[4]]),
    ],
  });
}

export function completedWeaponDamageInput(state: BattleState): {
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
} {
  const subject = weaponAttackSubject(state, "Longsword");
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
  const attack = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [targetFill] }),
    "attackRoll",
  );
  const attackFill = attackRollFill(attack, {
    total: 18,
    naturalD20: 12,
  });
  const damage = requireResultHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [targetFill, attackFill],
    }),
    "rolledDice",
  );
  return {
    subject,
    fills: [targetFill, attackFill, damageRollFillWithGroups(damage, [[4]])],
  };
}

export function attackTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  actorId: CombatantId,
  targetId: CombatantId,
  attackName = "Unarmed Strike",
  extraSpatialFacts: Extract<
    BattleFill,
    { readonly kind: "targetChoice" }
  >["spatialFacts"] = [],
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      hole.attack?.targetConstraint === "rangedRange" ||
      attackName === "Shortbow"
        ? {
            kind: "attackTargetInRangedRange",
            actorId,
            targetId,
            ...(hole.attack?.selection ?? { attackName }),
            rangeBand: "normal",
          }
        : {
            kind: "attackTargetInMeleeReach",
            actorId,
            targetId,
            ...(hole.attack?.selection ?? { attackName }),
          },
      ...extraSpatialFacts,
    ],
  };
}

export function attackRollFill(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
  value: {
    readonly total: number;
    readonly naturalD20: number;
    readonly rollMode?: "advantage" | "disadvantage" | "normal";
    readonly missToHitReplacementUnitId?: string;
    readonly d20TestNaturalOneReroll?: Extract<
      BattleFill,
      { readonly kind: "attackRoll" }
    >["value"]["d20TestNaturalOneReroll"];
  },
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: {
      total: value.total,
      naturalD20: DieRollResult(value.naturalD20),
      ...(value.rollMode === undefined ? {} : { rollMode: value.rollMode }),
      ...(value.missToHitReplacementUnitId === undefined
        ? {}
        : { missToHitReplacementUnitId: value.missToHitReplacementUnitId }),
      ...(value.d20TestNaturalOneReroll === undefined
        ? {}
        : { d20TestNaturalOneReroll: value.d20TestNaturalOneReroll }),
    },
  };
}

export function movementFill(
  hole: Extract<BattleHole, { readonly kind: "movement" }>,
  value: {
    readonly speedKind?: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["speedKind"];
    readonly movementCostFeet: number;
    readonly provokedOpportunityAttacks: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["provokedOpportunityAttacks"];
    readonly jumpMovementReplacement?: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["jumpMovementReplacement"];
    readonly levitatedMovement?: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["levitatedMovement"];
    readonly areaDifficultTerrain?: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["areaDifficultTerrain"];
    readonly acrobaticMovement?: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["acrobaticMovement"];
    readonly gustOfWindLineMovement?: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["gustOfWindLineMovement"];
  },
): Extract<BattleFill, { readonly kind: "movement" }> {
  return {
    kind: "movement",
    holeId: hole.holeId,
    value: {
      speedKind: value.speedKind ?? "walk",
      movementCostFeet: movementFeet(value.movementCostFeet),
      provokedOpportunityAttacks: value.provokedOpportunityAttacks,
      ...(value.jumpMovementReplacement === undefined
        ? {}
        : { jumpMovementReplacement: value.jumpMovementReplacement }),
      ...(value.levitatedMovement === undefined
        ? {}
        : { levitatedMovement: value.levitatedMovement }),
      ...(value.areaDifficultTerrain === undefined
        ? {}
        : { areaDifficultTerrain: value.areaDifficultTerrain }),
      ...(value.acrobaticMovement === undefined
        ? {}
        : { acrobaticMovement: value.acrobaticMovement }),
      ...(value.gustOfWindLineMovement === undefined
        ? {}
        : { gustOfWindLineMovement: value.gustOfWindLineMovement }),
    },
  };
}

export function damageRollFillWithGroups(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
  groups: readonly (readonly number[])[],
  selectedAttackDamageRiderUnitIds?: readonly string[],
  weaponDamageDiceRollChoice?: Extract<
    BattleFill,
    { readonly kind: "rolledDice" }
  >["weaponDamageDiceRollChoice"],
  attackDamageDieFloorChoice?: Extract<
    BattleFill,
    { readonly kind: "rolledDice" }
  >["attackDamageDieFloorChoice"],
  attackDamageAbilityModifierChoice?: Extract<
    BattleFill,
    { readonly kind: "rolledDice" }
  >["attackDamageAbilityModifierChoice"],
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  const [firstGroup, ...restGroups] = groups;
  if (firstGroup === undefined) {
    throw new Error("Expected at least one rolled dice group.");
  }
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    ...(selectedAttackDamageRiderUnitIds === undefined
      ? {}
      : { selectedAttackDamageRiderUnitIds }),
    ...(weaponDamageDiceRollChoice === undefined
      ? {}
      : { weaponDamageDiceRollChoice }),
    ...(attackDamageDieFloorChoice === undefined
      ? {}
      : { attackDamageDieFloorChoice }),
    ...(attackDamageAbilityModifierChoice === undefined
      ? {}
      : { attackDamageAbilityModifierChoice }),
    value: [
      rolledDiceGroup(firstGroup),
      ...restGroups.map((group) => rolledDiceGroup(group)),
    ],
  };
}

export function attackDamageDispositionFill(
  hole: Extract<BattleHole, { readonly kind: "attackDamageDisposition" }>,
  value: Extract<
    BattleFill,
    { readonly kind: "attackDamageDisposition" }
  >["value"],
): Extract<BattleFill, { readonly kind: "attackDamageDisposition" }> {
  return {
    kind: "attackDamageDisposition",
    holeId: hole.holeId,
    value,
  };
}

export function rolledDiceGroup(
  group: readonly number[],
): Extract<BattleFill, { readonly kind: "rolledDice" }>["value"][number] {
  const [firstResult, ...restResults] = group;
  if (firstResult === undefined) {
    throw new Error("Expected at least one die roll result.");
  }
  return {
    results: [DieRollResult(firstResult), ...restResults.map(DieRollResult)],
  };
}
