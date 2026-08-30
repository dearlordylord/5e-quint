import { assertStatBlockForTest } from "@dnd/surface/surface/stat-block-catalog.test-support";
import {
  abilityModifier,
  defaultArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import { Result } from "effect";
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
import { Result } from "effect";
import { statBlockId, unitId as parseUnitId } from "@dnd/shared/game-facts";
import weaponClubInput from "../../surface/content/weapon_club.json";
import weaponGreatswordInput from "../../surface/content/weapon_greatsword.json";
import {
  characterId,
  discoverBattleActCandidates,
  discoverBattleActs,
  initiativeScore,
  resolveBattleSubject,
  type AvailableBattleAct,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleProcedureExecutionRef,
  type BattleState,
  type BattleRuntimeSession,
  type BattleSubject,
  type CharacterWeaponAttackActionOption,
  type CombatantId,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import { admitCharacterWeaponAttackExecutionWeapon } from "./character-weapon-execution-admission.ts";
import { battleObjectId } from "./identity.ts";
import { attackActionOptionForSubject } from "./battle-reducer/attack-damage-apply.ts";
import { battleStatBlockCombatantSource } from "./stat-block-combatant-admission.ts";
import {
  battleAmmunitionStock,
  requiredAmmunitionKinds,
} from "./battle-ammunition.ts";
import { projectAuthoredStatBlock } from "./stat-block-authored-projection.ts";
import { battleStatBlockCombatantSource } from "./stat-block-combatant-admission.ts";
import {
  spellCasterId,
  spellTargetId,
  statBlockCatalog,
  unitLibrary,
} from "./unit-profile-admission-catalog.test-support.ts";

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

type AttackProcedureEntry = Extract<
  NonNullable<StatBlockRecord["statBlock"]["actions"]>[number],
  { readonly kind: "executable" }
> & {
  readonly procedure: Extract<
    Extract<
      NonNullable<StatBlockRecord["statBlock"]["actions"]>[number],
      { readonly kind: "executable" }
    >["procedure"],
    { readonly kind: "attack_roll" }
  >;
};

function requireTestOrCatalogUnit(unitId: string): UnitRecord {
  return (
    testUnitRecordsById.get(parseUnitId(unitId)) ??
    unitLibrary.requireUnit(unitId)
  );
}

export function characterCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
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
  readonly d20Statistics?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["d20Statistics"];
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
            itemId: battleObjectId(`main:${attack.weapon.weaponUnitId}`),
            unitId: attack.weapon.weaponUnitId,
            grip: "one_handed" as const,
          },
        });
  const weaponPresentationUnitRefs = [attack, input.offHandAttack].flatMap(
    (candidate) => {
      if (candidate === null || candidate === undefined) return [];
      const unit = [...unitLibrary.listUnits(), ...testUnitRecords].find(
        (entry) =>
          entry.kind === "weapon" && entry.id === candidate.weapon.weaponUnitId,
      );
      return unit?.kind === "weapon" ? [{ unit, supportProfiles: [] }] : [];
    },
  );
  const characterUnitRefs = [
    ...new Map(
      [...weaponPresentationUnitRefs, ...(input.characterUnitRefs ?? [])].map(
        (ref) => [ref.unit.id, ref],
      ),
    ).values(),
  ];
  const ammunitionKinds = new Set(
    [attack, input.offHandAttack].flatMap((candidate) => {
      if (candidate === null || candidate === undefined) return [];
      const ammunition = candidate.weapon.properties.find(
        (property) => property.kind === "ammunition",
      );
      return ammunition === undefined ? [] : [ammunition.ammunition];
    }),
  );
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    creatureInit: {
      kind: "character",
      ammunitionStocks: [...ammunitionKinds].map((ammunition) =>
        battleAmmunitionStock(ammunition, 20),
      ),
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs,
      classLevels: input.classLevels ?? [{ className: "wizard", level: 1 }],
      knownLanguages: ["Common"],
      d20Statistics: input.d20Statistics ?? testCharacterD20Statistics(),
      weaponMasteries: [],
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
  const base = assertStatBlockForTest(
    statBlockCatalog,
    statBlockId("stat_block_goblin_warrior"),
  );
  return {
    ...base,
    id: statBlockId(`stat_block_test_${creatureType}`),
    name: `Test ${creatureType}`,
    statBlock: {
      ...base.statBlock,
      creatureType,
    },
  };
}

export function legendaryActionStatBlock(): StatBlockRecord {
  const base = assertStatBlockForTest(
    statBlockCatalog,
    statBlockId("stat_block_goblin_warrior"),
  );
  const scimitar = base.statBlock.actions?.find(
    (entry): entry is AttackProcedureEntry =>
      entry.kind === "executable" &&
      entry.procedure.kind === "attack_roll" &&
      entry.procedure.name === "Scimitar",
  );
  if (scimitar === undefined) {
    throw new Error("Expected Goblin Warrior Scimitar fixture.");
  }
  return {
    ...base,
    id: statBlockId("stat_block_command_legendary"),
    name: "Command Legendary",
    statBlock: {
      ...base.statBlock,
      legendaryActions: {
        uses: { kind: "fixed", uses: 1 },
        entries: [
          {
            ...scimitar,
            procedure: {
              ...scimitar.procedure,
              name: "Tail Swipe",
            },
          },
        ],
      },
    },
  };
}

export function statBlockCreature(input: {
  readonly combatantId: CombatantId;
  readonly statBlock: StatBlockRecord;
  readonly initiative: number;
}): BattleCreatureInit {
  const projected = Result.getOrThrow(
    projectAuthoredStatBlock(input.statBlock),
  );
  const attacks = projected.runtime.procedures.flatMap((procedure) =>
    procedure.kind === "attack" ? [procedure.attack] : [],
  );
  return {
    combatantId: input.combatantId,
    initiative: initiativeScore(input.initiative),
    creatureInit: {
      kind: "statBlock",
      source: Result.getOrThrow(
        battleStatBlockCombatantSource(input.statBlock),
      ),
      currentHp: Hp(statBlockLiteralNumber(input.statBlock.statBlock.hp)),
      tempHp: Hp(0),
      ammunitionStocks: requiredAmmunitionKinds(attacks).map((ammunition) =>
        battleAmmunitionStock(ammunition, 20),
      ),
      conditions: [],
      presentation: projected.presentation,
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
  session: BattleRuntimeSession,
  actorId: CombatantId,
  attackName: string,
): AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >;
} {
  const matchingActs = discoverBattleActs(session).filter(
    (
      candidate,
    ): candidate is AvailableBattleAct & {
      readonly subject: Extract<
        BattleSubject,
        { readonly tag: "action"; readonly action: "attack" }
      >;
    } =>
      candidate.subject.tag === "action" &&
      candidate.subject.actorId === actorId &&
      candidate.subject.action === "attack" &&
      (candidate.subject.statBlockDamageSelection === undefined ||
        statBlockAttackDamageSelectionUsesOnlyComponentNotation(
          candidate.subject.statBlockDamageSelection,
          "rolled",
        )) &&
      candidate.presentation.kind === "attack" &&
      candidate.presentation.name === attackName,
  );
  expect(matchingActs.length).toBeGreaterThan(0);
  const [act] = matchingActs;
  if (act === undefined) {
    throw new Error(`Expected one rolled ${attackName} Stat Block attack act.`);
  }
  return act;
}

export function zeroAbilityWeaponAttack(
  unitId: string,
): CharacterWeaponAttackActionOption {
  const weapon = requireTestOrCatalogUnit(unitId);
  if (weapon.kind !== "weapon") {
    throw new Error(`Expected ${unitId} weapon Unit.`);
  }
  return {
    kind: "weapon",
    ...admitCharacterWeaponAttackExecutionWeapon(
      weapon,
      battleObjectId(`main:${weapon.id}`),
      [],
    ),
    ability: weapon.usage === "ranged" ? "dex" : "str",
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
      itemId: battleObjectId("main:weapon_club"),
      unitId: parseUnitId("weapon_club"),
      grip: "one_handed",
    },
    offHandWeapon: {
      itemId: battleObjectId("off:weapon_club"),
      unitId: parseUnitId("weapon_club"),
    },
  };
}

export function weaponAttackSubject(
  session: BattleRuntimeSession,
  attackName: string,
): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  const subject = discoverBattleActs(session).find(
    (act) =>
      act.subject.tag === "action" &&
      act.subject.action === "attack" &&
      act.subject.actorId === spellCasterId &&
      act.presentation.kind === "attack" &&
      act.presentation.name === attackName,
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

type WeaponAttackRollInput = {
  readonly session: BattleRuntimeSession;
  readonly attackName: "Longsword" | "Shortbow";
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
};

function weaponAttackRollFacts(input: WeaponAttackRollInput) {
  const subject = discoverBattleActs(input.session).find(
    (act) =>
      act.subject.tag === "action" &&
      act.subject.action === "attack" &&
      act.subject.actorId === input.actorId &&
      act.presentation.kind === "attack" &&
      act.presentation.name === input.attackName,
  )?.subject;
  if (subject?.tag !== "action" || subject.action !== "attack") {
    throw new Error(`Expected discovered ${input.attackName} attack.`);
  }
  const targetHole = requireResultHole(
    resolveBattleSubject({ state: input.session.state, subject, fills: [] }),
    "targetChoice",
  );
  const targetFill = attackTargetFill(
    targetHole,
    input.actorId,
    input.targetId,
  );
  const attackRoll = requireResultHole(
    resolveBattleSubject({
      state: input.session.state,
      subject,
      fills: [targetFill],
    }),
    "attackRoll",
  );
  return { subject, targetFill, attackRoll } as const;
}

export function weaponAttackRollHole(
  input: WeaponAttackRollInput,
): Extract<BattleHole, { readonly kind: "attackRoll" }> {
  return weaponAttackRollFacts(input).attackRoll;
}

export function resolveWeaponAttackMiss(input: WeaponAttackRollInput): {
  readonly attackRoll: Extract<BattleHole, { readonly kind: "attackRoll" }>;
  readonly state: BattleState;
} {
  const { subject, targetFill, attackRoll } = weaponAttackRollFacts(input);
  const resolved = resolveBattleSubject({
    state: input.session.state,
    subject,
    fills: [
      targetFill,
      attackRollFill(attackRoll, {
        total: 1,
        naturalD20: 1,
        ...(attackRoll.rollMode === undefined
          ? {}
          : { rollMode: attackRoll.rollMode }),
      }),
    ],
  });
  if (resolved.tag !== "resolved") {
    throw new Error(`Expected discovered ${input.attackName} miss to resolve.`);
  }
  return { attackRoll, state: resolved.state };
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

export function singleCharacterWeaponAttackSubject(
  state: BattleState,
  attackName: "Longsword" | "Shortbow",
): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  const attackSubjects = discoverBattleActCandidates(state).flatMap(
    (candidate) => {
      const subject = candidate.subject;
      if (
        subject.tag !== "action" ||
        subject.action !== "attack" ||
        subject.actorId !== spellCasterId
      ) {
        return [];
      }
      const attack = attackActionOptionForSubject(state, subject);
      const expectedWeaponUnitId =
        attackName === "Longsword" ? "weapon_longsword" : "weapon_shortbow";
      return attack?.kind === "weapon" &&
        attack.weapon.weaponUnitId === expectedWeaponUnitId
        ? [subject]
        : [];
    },
  );
  if (attackSubjects.length !== 1 || attackSubjects[0] === undefined) {
    throw new Error(
      `Expected one admitted mechanical ${attackName} character weapon attack.`,
    );
  }
  return attackSubjects[0];
}

export function resolveWeaponAttack(
  state: BattleState,
  attackName: "Longsword" | "Shortbow",
): ReturnType<typeof resolveBattleSubject> {
  const subject = singleCharacterWeaponAttackSubject(state, attackName);
  const target = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const roll = requireResultHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [attackTargetFill(target, spellCasterId, spellTargetId)],
    }),
    "attackRoll",
  );
  const damage = requireResultHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        attackTargetFill(target, spellCasterId, spellTargetId),
        attackRollFill(roll, { total: 15, naturalD20: 10 }),
      ],
    }),
    "rolledDice",
  );
  return resolveBattleSubject({
    state,
    subject,
    fills: [
      attackTargetFill(target, spellCasterId, spellTargetId),
      attackRollFill(roll, { total: 15, naturalD20: 10 }),
      damageRollFillWithGroups(damage, [[4]]),
    ],
  });
}

export function completedWeaponDamageInput(state: BattleState): {
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
} {
  const subject = singleCharacterWeaponAttackSubject(state, "Longsword");
  const target = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const targetFill = attackTargetFill(target, spellCasterId, spellTargetId);
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
  extraSpatialFacts: Extract<
    BattleFill,
    { readonly kind: "targetChoice" }
  >["spatialFacts"] = [],
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  if (hole.attack === undefined) {
    throw new Error("Expected bound creature-fixture attack selection.");
  }
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    ...(hole.relationshipFactRequest?.kind === "attackRollTargetIsEnemy"
      ? {
          relationshipFacts: [
            {
              kind: "attackRollTargetIsEnemy" as const,
              attackerId: hole.relationshipFactRequest.attackerId,
              targetId,
              targetIsEnemy: true,
            },
          ],
        }
      : {}),
    spatialFacts: [
      {
        kind: "attackTargetDistance",
        actorId,
        targetId,
        ...hole.attack.selection,
        distanceFeet: movementFeet(5),
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
    readonly missToHitReplacementProcedureRef?: BattleProcedureExecutionRef;
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
      ...(value.missToHitReplacementProcedureRef === undefined
        ? {}
        : {
            missToHitReplacementProcedureRef:
              value.missToHitReplacementProcedureRef,
          }),
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
    readonly fixedCostMovementReplacement?: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["fixedCostMovementReplacement"];
    readonly controlledVerticalSuspensionMovement?: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["controlledVerticalSuspensionMovement"];
    readonly areaDifficultTerrain?: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["areaDifficultTerrain"];
    readonly acrobaticMovement?: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["acrobaticMovement"];
    readonly directionalPersistentAreaMovement?: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["directionalPersistentAreaMovement"];
  },
): Extract<BattleFill, { readonly kind: "movement" }> {
  return {
    kind: "movement",
    holeId: hole.holeId,
    value: {
      speedKind: value.speedKind ?? "walk",
      movementCostFeet: movementFeet(value.movementCostFeet),
      provokedOpportunityAttacks: value.provokedOpportunityAttacks,
      ...(value.fixedCostMovementReplacement === undefined
        ? {}
        : { fixedCostMovementReplacement: value.fixedCostMovementReplacement }),
      ...(value.controlledVerticalSuspensionMovement === undefined
        ? {}
        : {
            controlledVerticalSuspensionMovement:
              value.controlledVerticalSuspensionMovement,
          }),
      ...(value.areaDifficultTerrain === undefined
        ? {}
        : { areaDifficultTerrain: value.areaDifficultTerrain }),
      ...(value.acrobaticMovement === undefined
        ? {}
        : { acrobaticMovement: value.acrobaticMovement }),
      ...(value.directionalPersistentAreaMovement === undefined
        ? {}
        : {
            directionalPersistentAreaMovement:
              value.directionalPersistentAreaMovement,
          }),
    },
  };
}

export function damageRollFillWithGroups(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
  groups: readonly (readonly number[])[],
  selectedAttackDamageRiderProcedureRefs?: readonly BattleProcedureExecutionRef[],
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
    ...(selectedAttackDamageRiderProcedureRefs === undefined
      ? {}
      : { selectedAttackDamageRiderProcedureRefs }),
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
