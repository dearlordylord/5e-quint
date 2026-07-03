// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt roll-modifier-buff bless bane guidance resistance shield_of_faith
// UNIT-IDENTITY-MBT-REPLAY: roll-modifier-buff bless doBlessAttackAndSaveModifier
// UNIT-IDENTITY-MBT-REPLAY: roll-modifier-buff bane doBaneFailedSavePenalty
// UNIT-IDENTITY-MBT-REPLAY: roll-modifier-buff guidance doGuidanceSkillAbilityCheckModifier
// UNIT-IDENTITY-MBT-REPLAY: roll-modifier-buff resistance doResistanceReducesMatchingDamage
// UNIT-IDENTITY-MBT-REPLAY: roll-modifier-buff shield_of_faith doShieldOfFaithArmorClassBonus
// KERNEL-COVERAGE: parity-witness BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION
import { describe, expect, it } from "vitest";
import { Either } from "effect";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  DieRollResult,
  Hp,
  abilityModifier,
  attackBonus,
  movementFeet,
  proficiencyBonus,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { SpellRecord } from "@dnd/surface/surface/types";

import {
  battleCombatantSide,
  battleId,
  characterId,
  combatantId,
  discoverBattleActs,
  endTurn,
  initiativeScore,
  resolveBattleSubject,
  snapshotBattle,
  startBattle,
  type AvailableBattleAct,
  type BattleActiveEffect,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleRolledDiceFill,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import {
  MBT_TEST_TIMEOUT_MS,
  decodeReducerRoute,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  quintField,
  quintStateRecord,
  reducerRouteDiscoverBattleActs,
  reducerRouteResolveBattleSubject,
  reducerRouteResolveBattleSubjectWithoutFill,
  reducerRouteStartBattle,
  run,
  stateCheck,
  type ReducerRouteEvent,
} from "./battle-runtime-mbt-driver-kit.ts";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import { damageTypeChoiceFill } from "./unit-profile-admission-spell-fill-support.ts";

const rollModifierBuffSpellIds = [
  "bless",
  "bane",
  "guidance",
  "resistance",
  "shield_of_faith",
] as const;
type RollModifierBuffSpellId = (typeof rollModifierBuffSpellIds)[number];

type RollModifierBuffSelectedIdentityProjection = {
  readonly casterConcentrating: boolean;
  readonly casterHp: number;
  readonly casterEffectCount: number;
  readonly primaryTargetEffectCount: number;
  readonly secondaryTargetEffectCount: number;
  readonly primaryTargetArmorClass: number;
  readonly primaryTargetHp: number;
  readonly d20ModifierSign: "+" | "-" | "none";
  readonly d20ModifierAttackRoll: boolean;
  readonly d20ModifierSavingThrow: boolean;
  readonly d20ModifierAbilityCheck: boolean;
  readonly d20ModifierSkill: "stealth" | "none";
  readonly invalidTargetRejected: boolean;
  readonly damageReductionType: "bludgeoning" | "none";
  readonly damageReductionUsed: boolean;
  readonly lastResult:
    | "init"
    | "bless"
    | "bane"
    | "guidance"
    | "resistance"
    | "shieldOfFaith";
};

type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
};
type BonusActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "bonusActionSpell" }
  >;
};
type D20RollModifierEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "d20RollModifier" }
>;
type SpellDamageReductionEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "spellDamageReduction" }
>;

const casterId = combatantId("roll-modifier-buff-caster");
const primaryTargetId = combatantId("roll-modifier-buff-target");
const secondaryTargetId = combatantId("roll-modifier-buff-second-target");
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Roll modifier buff selected identity Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;

defineSelectedIdentityWitness({
  describeLabel: "Roll modifier buff selected identity MBT",
  taskId: "roll-modifier-buff",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-roll-modifier-buff-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: {
      Init: "init",
      Bless: "bless",
      Bane: "bane",
      Guidance: "guidance",
      Resistance: "resistance",
      ShieldOfFaith: "shieldOfFaith",
    },
  },
  projectionSchema: {
    casterConcentrating: "bool",
    casterHp: "int",
    casterEffectCount: "int",
    primaryTargetEffectCount: "int",
    secondaryTargetEffectCount: "int",
    primaryTargetArmorClass: "int",
    primaryTargetHp: "int",
    d20ModifierSign: "str",
    d20ModifierAttackRoll: "bool",
    d20ModifierSavingThrow: "bool",
    d20ModifierAbilityCheck: "bool",
    d20ModifierSkill: "str",
    invalidTargetRejected: "bool",
    damageReductionType: "str",
    damageReductionUsed: "bool",
    lastResult: "variant",
  },
  initialProjection: expectedProjection(),
  units: [
    {
      unitId: "bless",
      procedures: [
        {
          actionName: "doBlessAttackAndSaveModifier",
          projectionAfter: expectedProjection({
            casterConcentrating: true,
            primaryTargetEffectCount: 1,
            secondaryTargetEffectCount: 1,
            d20ModifierSign: "+",
            d20ModifierAttackRoll: true,
            d20ModifierSavingThrow: true,
            lastResult: "bless",
          }),
          discover: blessAttackAndSaveModifier,
        },
      ],
    },
    {
      unitId: "bane",
      procedures: [
        {
          actionName: "doBaneFailedSavePenalty",
          projectionAfter: expectedProjection({
            casterConcentrating: true,
            primaryTargetEffectCount: 1,
            d20ModifierSign: "-",
            d20ModifierAttackRoll: true,
            d20ModifierSavingThrow: true,
            lastResult: "bane",
          }),
          discover: baneFailedSavePenalty,
        },
      ],
    },
    {
      unitId: "guidance",
      procedures: [
        {
          actionName: "doGuidanceSkillAbilityCheckModifier",
          projectionAfter: expectedProjection({
            casterConcentrating: true,
            casterEffectCount: 1,
            d20ModifierSign: "+",
            d20ModifierAbilityCheck: true,
            d20ModifierSkill: "stealth",
            invalidTargetRejected: true,
            lastResult: "guidance",
          }),
          discover: guidanceSkillAbilityCheckModifier,
        },
      ],
    },
    {
      unitId: "resistance",
      procedures: [
        {
          actionName: "doResistanceReducesMatchingDamage",
          projectionAfter: expectedProjection({
            casterConcentrating: true,
            casterEffectCount: 1,
            damageReductionType: "bludgeoning",
            damageReductionUsed: true,
            lastResult: "resistance",
          }),
          discover: resistanceReducesMatchingDamage,
        },
      ],
    },
    {
      unitId: "shield_of_faith",
      procedures: [
        {
          actionName: "doShieldOfFaithArmorClassBonus",
          projectionAfter: expectedProjection({
            casterConcentrating: true,
            primaryTargetEffectCount: 1,
            primaryTargetArmorClass: 12,
            lastResult: "shieldOfFaith",
          }),
          discover: shieldOfFaithArmorClassBonus,
        },
      ],
    },
  ],
});

function blessAttackAndSaveModifier(): RollModifierBuffSelectedIdentityProjection {
  const state = rollModifierBuffBattle({
    preparedSpells: [spellRecord("bless")],
    includeSecondaryTarget: true,
  });
  const act = actionSpellAct(state, "bless");
  const targetList = requireHoleFromList(act.initialHoles, "spellTargetList");
  return resolvedProjection(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetListFill(targetList, "bless", [
          primaryTargetId,
          secondaryTargetId,
        ]),
      ],
    }),
    false,
    "bless",
  );
}

function baneFailedSavePenalty(): RollModifierBuffSelectedIdentityProjection {
  const state = rollModifierBuffBattle({
    preparedSpells: [spellRecord("bane")],
    includeSecondaryTarget: true,
  });
  const act = actionSpellAct(state, "bane");
  const targetList = requireHoleFromList(act.initialHoles, "spellTargetList");
  const targetFill = spellTargetListFill(targetList, "bane", [
    primaryTargetId,
    secondaryTargetId,
  ]);
  const save = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill],
    }),
    "savingThrowOutcome",
  );
  return resolvedProjection(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        savingThrowOutcomeFill(save, [
          { targetId: primaryTargetId, succeeded: false },
          { targetId: secondaryTargetId, succeeded: true },
        ]),
      ],
    }),
    false,
    "bane",
  );
}

function guidanceSkillAbilityCheckModifier(): RollModifierBuffSelectedIdentityProjection {
  const state = rollModifierBuffBattle({
    cantrips: [spellRecord("guidance")],
    spellSlots: [],
  });
  const act = actionSpellAct(state, "guidance");
  const target = requireHoleFromList(act.initialHoles, "targetChoice");
  const skill = requireHoleFromList(act.initialHoles, "skillChoice");
  const invalidTarget = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      spellTargetFill(target, "guidance", primaryTargetId),
      skillChoiceFill(skill, "stealth"),
    ],
  });
  const invalidTargetRejected =
    invalidTarget.tag === "invalid" && invalidTarget.reason === "invalidFill";
  if (!invalidTargetRejected) {
    throw new Error("Expected Guidance to reject an unwilling target.");
  }
  return resolvedProjection(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(target, "guidance", casterId),
        skillChoiceFill(skill, "stealth"),
      ],
    }),
    invalidTargetRejected,
    "guidance",
  );
}

function resistanceReducesMatchingDamage(): RollModifierBuffSelectedIdentityProjection {
  const state = rollModifierBuffBattle({
    cantrips: [spellRecord("resistance")],
    spellSlots: [],
  });
  const act = actionSpellAct(state, "resistance");
  const target = requireHoleFromList(act.initialHoles, "targetChoice");
  const damageType = requireHoleFromList(act.initialHoles, "damageTypeChoice");
  const cast = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(target, "resistance", casterId),
        damageTypeChoiceFill(damageType, "bludgeoning"),
      ],
    }),
  );
  const nextTurn = requireResolved(
    endTurn({ state: cast.state, actorId: casterId }),
  );
  const postTurnState = nextTurn.state;
  const subject = unarmedStrikeSubject(primaryTargetId);
  const attackTarget = requireResultHole(
    resolveBattleSubject({ state: postTurnState, subject, fills: [] }),
    "targetChoice",
  );
  const targetFill = attackTargetFill(attackTarget, primaryTargetId, casterId);
  const attack = requireResultHole(
    resolveBattleSubject({
      state: postTurnState,
      subject,
      fills: [targetFill],
    }),
    "attackRoll",
  );
  const attackFill = attackRollFill(attack, {
    total: 18,
    naturalD20: 12,
  });
  const needsReduction = resolveBattleSubject({
    state: postTurnState,
    subject,
    fills: [targetFill, attackFill],
  });
  const reduction = requireSpellDamageReductionHole(needsReduction);
  return resolvedProjection(
    resolveBattleSubject({
      state: postTurnState,
      subject,
      fills: [
        targetFill,
        attackFill,
        damageRollFillWithGroups(reduction, [[1]]),
      ],
    }),
    false,
    "resistance",
  );
}

function shieldOfFaithArmorClassBonus(): RollModifierBuffSelectedIdentityProjection {
  const state = rollModifierBuffBattle({
    preparedSpells: [spellRecord("shield_of_faith")],
  });
  const act = bonusActionSpellAct(state, "shield_of_faith");
  const target = requireHoleFromList(act.initialHoles, "targetChoice");
  return resolvedProjection(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [spellTargetFill(target, "shield_of_faith", primaryTargetId)],
    }),
    false,
    "shieldOfFaith",
  );
}

function resolvedProjection(
  result: BattleResolutionResult,
  invalidTargetRejected: boolean,
  lastResult: Exclude<
    RollModifierBuffSelectedIdentityProjection["lastResult"],
    "init"
  >,
): RollModifierBuffSelectedIdentityProjection {
  if (result.tag !== "resolved") {
    throw new Error(
      `Expected roll modifier buff action to resolve, got ${result.tag}.`,
    );
  }
  return projectRollModifierBuffSelectedIdentityState(
    result.state,
    invalidTargetRejected,
    lastResult,
  );
}

function expectedProjection(
  overrides: Partial<RollModifierBuffSelectedIdentityProjection> = {},
): RollModifierBuffSelectedIdentityProjection {
  return {
    casterConcentrating: false,
    casterHp: 12,
    casterEffectCount: 0,
    primaryTargetEffectCount: 0,
    secondaryTargetEffectCount: 0,
    primaryTargetArmorClass: 10,
    primaryTargetHp: 12,
    d20ModifierSign: "none",
    d20ModifierAttackRoll: false,
    d20ModifierSavingThrow: false,
    d20ModifierAbilityCheck: false,
    d20ModifierSkill: "none",
    invalidTargetRejected: false,
    damageReductionType: "none",
    damageReductionUsed: false,
    lastResult: "init",
    ...overrides,
  };
}

function rollModifierBuffBattle(
  input: {
    readonly cantrips?: readonly SpellRecord[];
    readonly preparedSpells?: readonly SpellRecord[];
    readonly spellSlots?: readonly {
      readonly spellLevel: 1;
      readonly count: number;
    }[];
    readonly includeSecondaryTarget?: boolean;
  } = {},
): BattleState {
  const result = startBattle({
    battleId: battleId("roll-modifier-buff-selected-identity"),
    combatants: [
      rollModifierBuffCreature({
        combatantId: casterId,
        displayName: "Roll modifier caster",
        initiative: 20,
        side: partySide,
        spellcasting: {
          sourceClassName: "cleric",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: input.cantrips ?? [],
          preparedSpells: input.preparedSpells ?? [],
          featurePreparedSpells: [],
          invocationSpellAccesses: [],
          spellbookRitualSpellAccesses: [],
          spellSlots: input.spellSlots ?? [{ spellLevel: 1, count: 2 }],
        },
      }),
      rollModifierBuffCreature({
        combatantId: primaryTargetId,
        displayName: "Roll modifier target",
        initiative: 10,
        side: oppositionSide,
      }),
      ...(input.includeSecondaryTarget === true
        ? [
            rollModifierBuffCreature({
              combatantId: secondaryTargetId,
              displayName: "Roll modifier second target",
              initiative: 9,
              side: oppositionSide,
            }),
          ]
        : []),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function rollModifierBuffCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly side: typeof partySide | typeof oppositionSide;
  readonly spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    side: input.side,
    creatureInit: {
      kind: "character",
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: [],
      classLevels: [{ className: "cleric", level: 1 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics(),
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
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

function spellRecord(spellId: RollModifierBuffSpellId): SpellRecord {
  const unit = unitLibrary.requireUnit(spellId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected SRD catalog unit ${spellId} to be a Spell.`);
  }
  return unit;
}

function actionSpellAct(
  state: BattleState,
  spellId: RollModifierBuffSpellId,
): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.spellId === spellId,
  );
  if (act === undefined) {
    throw new Error(`Expected ${spellId} action Spell act.`);
  }
  return act;
}

function bonusActionSpellAct(
  state: BattleState,
  spellId: RollModifierBuffSpellId,
): BonusActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is BonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      candidate.subject.invocation.spellId === spellId,
  );
  if (act === undefined) {
    throw new Error(`Expected ${spellId} Bonus Action Spell act.`);
  }
  return act;
}

function unarmedStrikeSubject(
  actorId: CombatantId,
): Extract<BattleSubject, { readonly tag: "action" }> {
  return {
    tag: "action",
    actorId,
    action: "attack",
    attackName: "Unarmed Strike",
  };
}

function spellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  spellId: RollModifierBuffSpellId,
  selectedTargetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: selectedTargetId,
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId,
        targetId: selectedTargetId,
        spellId,
      },
    ],
  };
}

function spellTargetListFill(
  hole: Extract<BattleHole, { readonly kind: "spellTargetList" }>,
  spellId: RollModifierBuffSpellId,
  targetIds: readonly CombatantId[],
): Extract<BattleFill, { readonly kind: "spellTargetList" }> {
  return {
    kind: "spellTargetList",
    holeId: hole.holeId,
    value: { targetIds },
    spatialFacts: targetIds.map((targetId) => ({
      kind: "spellTarget",
      casterId,
      targetId,
      spellId,
    })),
  };
}

function savingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: { outcomes },
  };
}

function skillChoiceFill(
  hole: Extract<BattleHole, { readonly kind: "skillChoice" }>,
  value: Extract<BattleFill, { readonly kind: "skillChoice" }>["value"],
): Extract<BattleFill, { readonly kind: "skillChoice" }> {
  return {
    kind: "skillChoice",
    holeId: hole.holeId,
    value,
  };
}

function attackTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  actorId: CombatantId,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "attackTargetInMeleeReach",
        actorId,
        targetId,
        attackName: "Unarmed Strike",
      },
    ],
  };
}

function attackRollFill(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
  value: { readonly total: number; readonly naturalD20: number },
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: {
      total: value.total,
      naturalD20: DieRollResult(value.naturalD20),
    },
  };
}

function damageRollFillWithGroups(
  hole: Pick<BattleHole, "kind" | "holeId">,
  groups: readonly (readonly number[])[],
): BattleRolledDiceFill {
  if (hole.kind !== "rolledDice") {
    throw new Error("Expected rolledDice hole.");
  }
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: rolledDiceGroups(groups),
  };
}

function rolledDiceGroups(
  groups: readonly (readonly number[])[],
): BattleRolledDiceFill["value"] {
  const [firstGroup, ...restGroups] = groups;
  if (firstGroup === undefined) {
    throw new Error("Expected at least one rolled dice group.");
  }
  return [
    rolledDiceGroup(firstGroup),
    ...restGroups.map((group) => rolledDiceGroup(group)),
  ];
}

function rolledDiceGroup(
  group: readonly number[],
): BattleRolledDiceFill["value"][number] {
  const [firstRoll, ...restRolls] = group;
  if (firstRoll === undefined) {
    throw new Error("Expected at least one die result.");
  }
  return {
    results: [DieRollResult(firstRoll), ...restRolls.map(DieRollResult)],
  };
}

function requireResolved(
  result: BattleResolutionResult,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  if (result.tag !== "resolved") {
    throw new Error(`Expected resolved result, got ${result.tag}.`);
  }
  return result;
}

function requireResultHole<K extends BattleHole["kind"]>(
  result: BattleResolutionResult,
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected needsHoles result, got ${result.tag}.`);
  }
  return requireHoleFromList(result.holes, kind);
}

function requireHoleFromList<K extends BattleHole["kind"]>(
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

function requireSpellDamageReductionHole(
  result: BattleResolutionResult,
): Extract<BattleHole, { readonly kind: "rolledDice" }> & {
  readonly spellDamageReduction: unknown;
} {
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected needsHoles result, got ${result.tag}.`);
  }
  const hole = result.holes.find(
    (
      candidate,
    ): candidate is Extract<BattleHole, { readonly kind: "rolledDice" }> & {
      readonly spellDamageReduction: unknown;
    } => candidate.kind === "rolledDice" && "spellDamageReduction" in candidate,
  );
  if (hole === undefined) {
    throw new Error("Expected spell damage reduction roll hole.");
  }
  return hole;
}

function projectRollModifierBuffSelectedIdentityState(
  state: BattleState,
  invalidTargetRejected: boolean,
  lastResult: RollModifierBuffSelectedIdentityProjection["lastResult"],
): RollModifierBuffSelectedIdentityProjection {
  const snapshot = snapshotBattle(state);
  const caster = requiredSnapshotCombatant(snapshot.combatants, casterId);
  const primaryTarget = requiredSnapshotCombatant(
    snapshot.combatants,
    primaryTargetId,
  );
  const d20Modifier = firstTrackedD20Modifier(state);
  const damageReduction = firstTrackedDamageReduction(state);
  return {
    casterConcentrating: caster.concentrating,
    casterHp: caster.hp,
    casterEffectCount: trackedEffectCount(state, casterId),
    primaryTargetEffectCount: trackedEffectCount(state, primaryTargetId),
    secondaryTargetEffectCount: trackedEffectCount(state, secondaryTargetId),
    primaryTargetArmorClass: primaryTarget.armorClass,
    primaryTargetHp: primaryTarget.hp,
    d20ModifierSign: d20Modifier?.delta.sign ?? "none",
    d20ModifierAttackRoll: d20Modifier?.on.includes("attack_roll") ?? false,
    d20ModifierSavingThrow: d20Modifier?.on.includes("saving_throw") ?? false,
    d20ModifierAbilityCheck: d20Modifier?.on.includes("ability_check") ?? false,
    d20ModifierSkill: d20Modifier?.skill === "stealth" ? "stealth" : "none",
    invalidTargetRejected,
    damageReductionType:
      damageReduction?.damageType === "bludgeoning" ? "bludgeoning" : "none",
    damageReductionUsed: damageReduction?.usedThisTurn ?? false,
    lastResult,
  };
}

function requiredSnapshotCombatant(
  combatants: ReturnType<typeof snapshotBattle>["combatants"],
  id: CombatantId,
): ReturnType<typeof snapshotBattle>["combatants"][number] {
  const combatant = combatants.find(
    (candidate) => candidate.combatantId === id,
  );
  if (combatant === undefined) {
    throw new Error(`Expected combatant ${id}.`);
  }
  return combatant;
}

function trackedEffectCount(
  state: BattleState,
  combatantId: CombatantId,
): number {
  return activeEffectsFor(state, combatantId).filter(isTrackedSpellEffect)
    .length;
}

function firstTrackedD20Modifier(
  state: BattleState,
): D20RollModifierEffect | undefined {
  return activeEffectsForTrackedCombatants(state).find(
    (effect): effect is D20RollModifierEffect =>
      effect.kind === "d20RollModifier" && isTrackedSpellEffect(effect),
  );
}

function firstTrackedDamageReduction(
  state: BattleState,
): SpellDamageReductionEffect | undefined {
  return activeEffectsForTrackedCombatants(state).find(
    (effect): effect is SpellDamageReductionEffect =>
      effect.kind === "spellDamageReduction" && isTrackedSpellEffect(effect),
  );
}

function activeEffectsForTrackedCombatants(
  state: BattleState,
): readonly BattleActiveEffect[] {
  return [casterId, primaryTargetId, secondaryTargetId].flatMap((combatantId) =>
    activeEffectsFor(state, combatantId),
  );
}

function activeEffectsFor(
  state: BattleState,
  combatantId: CombatantId,
): readonly BattleActiveEffect[] {
  return state.combatants.get(combatantId)?.activeEffects ?? [];
}

function isTrackedSpellEffect(
  effect: BattleActiveEffect,
): effect is BattleActiveEffect & {
  readonly sourceSpellId: RollModifierBuffSpellId;
} {
  return (
    "sourceSpellId" in effect &&
    (rollModifierBuffSpellIds as readonly string[]).includes(
      effect.sourceSpellId,
    )
  );
}

type SpellDamageReductionRouteProjection = {
  readonly route: readonly ReducerRouteEvent[];
};

const spellDamageReductionRouteDriverSchema = {
  init: {},
  doDiscoverResistanceTargetChoice: {},
  doFillResistanceTarget: {},
  doChooseResistanceDamageType: {},
  doApplyResistanceReductionRoll: {},
  step: {},
} as const;

describe("Spell damage-reduction route MBT", () => {
  it(
    "routes Resistance through target, damage-type, active-effect, and reduction-roll owners",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-spell-damage-reduction.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createSpellDamageReductionRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(4),
        stateCheck: spellDamageReductionRouteStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function createSpellDamageReductionRouteDriver() {
  return defineDriver<
    typeof spellDamageReductionRouteDriverSchema,
    SpellDamageReductionRouteProjection
  >(spellDamageReductionRouteDriverSchema, () => {
    let route: readonly ReducerRouteEvent[] = [];

    function reset(): void {
      route = [reducerRouteStartBattle("battleActionEconomy")];
    }

    reset();

    return {
      init: reset,
      doDiscoverResistanceTargetChoice: () => {
        route = [
          ...route,
          reducerRouteDiscoverBattleActs({
            subject: "spellDamageReduction",
            holes: [{ kind: "targetChoice" }],
            owner: "battleSpellSlotAndActionEconomy",
          }),
        ];
      },
      doFillResistanceTarget: () => {
        route = [
          ...route,
          reducerRouteResolveBattleSubject({
            subject: "spellDamageReduction",
            fill: "targetChoice",
            holes: [{ kind: "damageTypeChoice" }],
            owner: "battleTargetSelection",
          }),
        ];
      },
      doChooseResistanceDamageType: () => {
        route = [
          ...route,
          reducerRouteResolveBattleSubject({
            subject: "spellDamageReduction",
            fill: "damageTypeChoice",
            holes: [],
            owner: "battleActiveEffect",
          }),
          reducerRouteResolveBattleSubjectWithoutFill({
            subject: "spellDamageReduction",
            holes: [],
            owner: "battleConcentration",
          }),
        ];
      },
      doApplyResistanceReductionRoll: () => {
        route = [
          ...route,
          reducerRouteDiscoverBattleActs({
            subject: "spellDamageReduction",
            holes: [{ kind: "rolledDice" }],
            owner: "battleDamageAdjustment",
          }),
          reducerRouteResolveBattleSubject({
            subject: "spellDamageReduction",
            fill: "rolledDice",
            holes: [],
            owner: "battleDamageAdjustment",
          }),
          reducerRouteResolveBattleSubjectWithoutFill({
            subject: "spellDamageReduction",
            holes: [],
            owner: "battleActiveEffect",
          }),
        ];
      },
      step: () => {},
      getState: () => ({ route }),
    };
  });
}

const spellDamageReductionRouteStateCheck = stateCheck(
  normalizeSpellDamageReductionRouteQuintState,
  compareSpellDamageReductionRouteStates,
);

function normalizeSpellDamageReductionRouteQuintState(
  raw: unknown,
): SpellDamageReductionRouteProjection {
  const state = quintStateRecord(raw);
  return {
    route: decodeReducerRoute(quintField(state, "qRoute")),
  };
}

function compareSpellDamageReductionRouteStates(
  spec: SpellDamageReductionRouteProjection,
  impl: SpellDamageReductionRouteProjection,
): boolean {
  expect(impl).toEqual(spec);
  return true;
}
