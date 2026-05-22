// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt attack-spell-shape fire_bolt chill_touch guiding_bolt inflict_wounds shocking_grasp
// UNIT-IDENTITY-MBT-REPLAY: attack-spell-shape fire_bolt doFireBoltHit
// UNIT-IDENTITY-MBT-REPLAY: attack-spell-shape chill_touch doChillTouchHitPointRegainPrevention
// UNIT-IDENTITY-MBT-REPLAY: attack-spell-shape guiding_bolt doGuidingBoltNextAttackAdvantage
// UNIT-IDENTITY-MBT-REPLAY: attack-spell-shape inflict_wounds doInflictWoundsFailedSave doInflictWoundsSuccessfulSave
// UNIT-IDENTITY-MBT-REPLAY: attack-spell-shape shocking_grasp doShockingGraspOpportunityAttackDenied
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

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

const attackSpellShapeSelectedIdentityDriverSchema = {
  init: {},
  doFireBoltHit: {},
  doChillTouchHitPointRegainPrevention: {},
  doGuidingBoltNextAttackAdvantage: {},
  doInflictWoundsFailedSave: {},
  doInflictWoundsSuccessfulSave: {},
  doShockingGraspOpportunityAttackDenied: {},
  step: {},
} as const;
type AttackSpellShapeSelectedIdentityDriverAction = Exclude<
  keyof typeof attackSpellShapeSelectedIdentityDriverSchema,
  "init" | "step"
>;

const attackSpellShapeSpellIds = [
  "fire_bolt",
  "chill_touch",
  "guiding_bolt",
  "inflict_wounds",
  "shocking_grasp",
] as const;
type AttackSpellShapeSpellId = (typeof attackSpellShapeSpellIds)[number];
type AttackSpellShapeActiveEffectKind =
  | "none"
  | "hitPointRegainPrevented"
  | "nextAttackRollAgainstSelf"
  | "opportunityAttackDenied";

type AttackSpellShapeSelectedIdentityProjection = {
  readonly targetHp: number;
  readonly spellSlotSpentThisTurn: boolean;
  readonly level1SlotsRemaining: number;
  readonly activeEffectKind: AttackSpellShapeActiveEffectKind;
  readonly activeEffectCount: number;
  readonly lastResult:
    | "init"
    | "fireBolt"
    | "chillTouch"
    | "guidingBolt"
    | "inflictWoundsFailure"
    | "inflictWoundsSuccess"
    | "shockingGrasp";
};
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly AttackSpellShapeSelectedIdentityDriverAction[];
  readonly expected: AttackSpellShapeSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "attack-spell-shape";
  readonly unitId: AttackSpellShapeSpellId;
  readonly actions: readonly AttackSpellShapeSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
};

const casterId = combatantId("attack-spell-shape-caster");
const targetId = combatantId("attack-spell-shape-target");
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Attack spell shape selected identity Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;

const selectedUnitIdentityReplays = [
  {
    taskId: "attack-spell-shape",
    unitId: "fire_bolt",
    actions: ["doFireBoltHit"],
    sequences: [
      {
        name: "ranged-spell-attack-fire-damage",
        actions: ["doFireBoltHit"],
        expected: expectedProjection({
          targetHp: 8,
          lastResult: "fireBolt",
        }),
      },
    ],
  },
  {
    taskId: "attack-spell-shape",
    unitId: "chill_touch",
    actions: ["doChillTouchHitPointRegainPrevention"],
    sequences: [
      {
        name: "melee-spell-attack-necrotic-hit-point-regain-prevention",
        actions: ["doChillTouchHitPointRegainPrevention"],
        expected: expectedProjection({
          targetHp: 8,
          activeEffectKind: "hitPointRegainPrevented",
          activeEffectCount: 1,
          lastResult: "chillTouch",
        }),
      },
    ],
  },
  {
    taskId: "attack-spell-shape",
    unitId: "guiding_bolt",
    actions: ["doGuidingBoltNextAttackAdvantage"],
    sequences: [
      {
        name: "ranged-spell-attack-radiant-next-attack-advantage",
        actions: ["doGuidingBoltNextAttackAdvantage"],
        expected: expectedProjection({
          targetHp: 8,
          spellSlotSpentThisTurn: true,
          level1SlotsRemaining: 1,
          activeEffectKind: "nextAttackRollAgainstSelf",
          activeEffectCount: 1,
          lastResult: "guidingBolt",
        }),
      },
    ],
  },
  {
    taskId: "attack-spell-shape",
    unitId: "inflict_wounds",
    actions: ["doInflictWoundsFailedSave", "doInflictWoundsSuccessfulSave"],
    sequences: [
      {
        name: "constitution-save-failure-full-necrotic-damage",
        actions: ["doInflictWoundsFailedSave"],
        expected: expectedProjection({
          targetHp: 6,
          spellSlotSpentThisTurn: true,
          level1SlotsRemaining: 1,
          lastResult: "inflictWoundsFailure",
        }),
      },
      {
        name: "constitution-save-success-half-necrotic-damage",
        actions: ["doInflictWoundsSuccessfulSave"],
        expected: expectedProjection({
          targetHp: 9,
          spellSlotSpentThisTurn: true,
          level1SlotsRemaining: 1,
          lastResult: "inflictWoundsSuccess",
        }),
      },
    ],
  },
  {
    taskId: "attack-spell-shape",
    unitId: "shocking_grasp",
    actions: ["doShockingGraspOpportunityAttackDenied"],
    sequences: [
      {
        name: "melee-spell-attack-lightning-opportunity-attack-denial",
        actions: ["doShockingGraspOpportunityAttackDenied"],
        expected: expectedProjection({
          targetHp: 8,
          activeEffectKind: "opportunityAttackDenied",
          activeEffectCount: 1,
          lastResult: "shockingGrasp",
        }),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Attack spell shape selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<AttackSpellShapeSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createAttackSpellShapeSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing attack spell shape selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Attack spell shape selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays attack spell shape selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-attack-spell-shape-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createAttackSpellShapeSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: attackSpellShapeSelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createAttackSpellShapeSelectedIdentityDriver() {
  return defineDriver(attackSpellShapeSelectedIdentityDriverSchema, () => {
    let state = attackSpellShapeBattle();
    let lastResult: AttackSpellShapeSelectedIdentityProjection["lastResult"] =
      "init";

    function reset(): void {
      state = attackSpellShapeBattle();
      lastResult = "init";
    }

    function recordResolvedResult(
      result: BattleResolutionResult,
      resultKind: Exclude<
        AttackSpellShapeSelectedIdentityProjection["lastResult"],
        "init"
      >,
    ): void {
      if (result.tag !== "resolved") {
        throw new Error(
          `Expected attack spell shape action to resolve, got ${result.tag}: ${
            "reason" in result ? result.reason : "unknown"
          } ${"message" in result ? result.message : ""}`,
        );
      }
      state = result.state;
      lastResult = resultKind;
    }

    return {
      init: reset,
      doFireBoltHit: () => {
        state = attackSpellShapeBattle({
          sourceClassName: "wizard",
          cantrips: [spellRecord("fire_bolt")],
        });
        recordResolvedResult(
          resolveSpellAttackHit({
            state,
            spellId: "fire_bolt",
            damageGroups: [[4]],
          }),
          "fireBolt",
        );
      },
      doChillTouchHitPointRegainPrevention: () => {
        state = attackSpellShapeBattle({
          sourceClassName: "wizard",
          cantrips: [spellRecord("chill_touch")],
        });
        recordResolvedResult(
          resolveSpellAttackHit({
            state,
            spellId: "chill_touch",
            damageGroups: [[4]],
          }),
          "chillTouch",
        );
      },
      doGuidingBoltNextAttackAdvantage: () => {
        state = attackSpellShapeBattle({
          sourceClassName: "cleric",
          preparedSpells: [spellRecord("guiding_bolt")],
        });
        recordResolvedResult(
          resolveSpellAttackHit({
            state,
            spellId: "guiding_bolt",
            damageGroups: [[1, 1, 1, 1]],
          }),
          "guidingBolt",
        );
      },
      doInflictWoundsFailedSave: () => {
        state = attackSpellShapeBattle({
          sourceClassName: "cleric",
          preparedSpells: [spellRecord("inflict_wounds")],
        });
        recordResolvedResult(
          resolveSaveDamageSpell({
            state,
            spellId: "inflict_wounds",
            succeeded: false,
            damageGroups: [[3, 3]],
          }),
          "inflictWoundsFailure",
        );
      },
      doInflictWoundsSuccessfulSave: () => {
        state = attackSpellShapeBattle({
          sourceClassName: "cleric",
          preparedSpells: [spellRecord("inflict_wounds")],
        });
        recordResolvedResult(
          resolveSaveDamageSpell({
            state,
            spellId: "inflict_wounds",
            succeeded: true,
            damageGroups: [[3, 3]],
          }),
          "inflictWoundsSuccess",
        );
      },
      doShockingGraspOpportunityAttackDenied: () => {
        state = attackSpellShapeBattle({
          sourceClassName: "wizard",
          cantrips: [spellRecord("shocking_grasp")],
        });
        recordResolvedResult(
          resolveSpellAttackHit({
            state,
            spellId: "shocking_grasp",
            damageGroups: [[4]],
          }),
          "shockingGrasp",
        );
      },
      step: () => {},
      getState: () =>
        projectAttackSpellShapeSelectedIdentityState(state, lastResult),
    };
  });
}

function expectedProjection(
  overrides: Partial<AttackSpellShapeSelectedIdentityProjection> = {},
): AttackSpellShapeSelectedIdentityProjection {
  return {
    targetHp: 12,
    spellSlotSpentThisTurn: false,
    level1SlotsRemaining: 2,
    activeEffectKind: "none",
    activeEffectCount: 0,
    lastResult: "init",
    ...overrides,
  };
}

function resolveSpellAttackHit(input: {
  readonly state: BattleState;
  readonly spellId: Exclude<AttackSpellShapeSpellId, "inflict_wounds">;
  readonly damageGroups: readonly (readonly number[])[];
}): BattleResolutionResult {
  const act = actionSpellAct(input.state, input.spellId);
  const target = requireResultHole(
    resolveBattleSubject({
      state: input.state,
      subject: act.subject,
      fills: [],
    }),
    "targetChoice",
  );
  const targetFill = spellTargetFill(target, input.spellId);
  const attack = requireResultHole(
    resolveBattleSubject({
      state: input.state,
      subject: act.subject,
      fills: [targetFill],
    }),
    "attackRoll",
  );
  const attackFill = attackRollFill(attack, {
    total: 18,
    naturalD20: 12,
  });
  const damage = requireResultHole(
    resolveBattleSubject({
      state: input.state,
      subject: act.subject,
      fills: [targetFill, attackFill],
    }),
    "rolledDice",
  );
  return resolveBattleSubject({
    state: input.state,
    subject: act.subject,
    fills: [
      targetFill,
      attackFill,
      damageRollFillWithGroups(damage, input.damageGroups),
    ],
  });
}

function resolveSaveDamageSpell(input: {
  readonly state: BattleState;
  readonly spellId: Extract<AttackSpellShapeSpellId, "inflict_wounds">;
  readonly succeeded: boolean;
  readonly damageGroups: readonly (readonly number[])[];
}): BattleResolutionResult {
  const act = actionSpellAct(input.state, input.spellId);
  const target = requireResultHole(
    resolveBattleSubject({
      state: input.state,
      subject: act.subject,
      fills: [],
    }),
    "targetChoice",
  );
  const targetFill = spellTargetFill(target, input.spellId);
  const save = requireResultHole(
    resolveBattleSubject({
      state: input.state,
      subject: act.subject,
      fills: [targetFill],
    }),
    "savingThrowOutcome",
  );
  const saveFill = savingThrowOutcomeFill(save, input.succeeded);
  const damage = requireResultHole(
    resolveBattleSubject({
      state: input.state,
      subject: act.subject,
      fills: [targetFill, saveFill],
    }),
    "rolledDice",
  );
  return resolveBattleSubject({
    state: input.state,
    subject: act.subject,
    fills: [
      targetFill,
      saveFill,
      damageRollFillWithGroups(damage, input.damageGroups),
    ],
  });
}

function attackSpellShapeBattle(
  input: {
    readonly sourceClassName?: "cleric" | "wizard";
    readonly cantrips?: readonly SpellRecord[];
    readonly preparedSpells?: readonly SpellRecord[];
  } = {},
): BattleState {
  const result = startBattle({
    battleId: battleId("attack-spell-shape-selected-identity"),
    combatants: [
      attackSpellShapeCreature({
        combatantId: casterId,
        displayName: "Attack spell caster",
        initiative: 20,
        side: partySide,
        spellcasting: {
          sourceClassName: input.sourceClassName ?? "wizard",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: input.cantrips ?? [],
          preparedSpells: input.preparedSpells ?? [],
          featurePreparedSpells: [],
          invocationSpellAccesses: [],
          spellbookRitualSpellAccesses: [],
          spellSlots: [{ spellLevel: 1, count: 2 }],
        },
      }),
      attackSpellShapeCreature({
        combatantId: targetId,
        displayName: "Attack spell target",
        initiative: 10,
        side: oppositionSide,
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function attackSpellShapeCreature(input: {
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
      classLevels: [
        {
          className: input.spellcasting?.sourceClassName ?? "wizard",
          level: 1,
        },
      ],
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

function spellRecord(spellId: AttackSpellShapeSpellId): SpellRecord {
  const unit = unitLibrary.requireUnit(spellId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected SRD catalog unit ${spellId} to be a Spell.`);
  }
  return unit;
}

function actionSpellAct(
  state: BattleState,
  spellId: AttackSpellShapeSpellId,
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

function spellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  spellId: AttackSpellShapeSpellId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId,
        targetId,
        spellId,
      },
    ],
  };
}

function savingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  succeeded: boolean,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      outcomes: [{ targetId, succeeded }],
    },
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

function requireResultHole<K extends BattleHole["kind"]>(
  result: BattleResolutionResult,
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected needsHoles result, got ${result.tag}.`);
  }
  const hole = result.holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: K }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function projectAttackSpellShapeSelectedIdentityState(
  state: BattleState,
  lastResult: AttackSpellShapeSelectedIdentityProjection["lastResult"],
): AttackSpellShapeSelectedIdentityProjection {
  const snapshot = snapshotBattle(state);
  const target = snapshot.combatants.find(
    (combatant) => combatant.combatantId === targetId,
  );
  if (target === undefined) {
    throw new Error("Expected attack spell target.");
  }
  const effectKind = activeEffectKind(state);
  return {
    targetHp: target.hp,
    spellSlotSpentThisTurn:
      state.currentTurnResources.spellSlotUsesThisTurn.some((use) => use.kind === "committed"),
    level1SlotsRemaining: level1SlotsRemaining(state, casterId),
    activeEffectKind: effectKind,
    activeEffectCount: activeEffectCount(state, effectKind),
    lastResult,
  };
}

function activeEffectKind(
  state: BattleState,
): AttackSpellShapeActiveEffectKind {
  const target = state.combatants.get(targetId);
  const effects = target?.activeEffects ?? [];
  if (
    effects.some(
      (effect) =>
        effect.kind === "hitPointRegainPrevented" &&
        effect.sourceSpellId === "chill_touch",
    )
  ) {
    return "hitPointRegainPrevented";
  }
  if (
    effects.some(
      (effect) =>
        effect.kind === "nextAttackRollAgainstSelf" &&
        effect.sourceSpellId === "guiding_bolt",
    )
  ) {
    return "nextAttackRollAgainstSelf";
  }
  if (
    effects.some(
      (effect) =>
        effect.kind === "opportunityAttackDenied" &&
        effect.sourceSpellId === "shocking_grasp",
    )
  ) {
    return "opportunityAttackDenied";
  }
  return "none";
}

function activeEffectCount(
  state: BattleState,
  kind: AttackSpellShapeActiveEffectKind,
): number {
  if (kind === "none") {
    return 0;
  }
  const target = state.combatants.get(targetId);
  return (
    target?.activeEffects.filter(
      (effect): effect is BattleActiveEffect & { readonly kind: typeof kind } =>
        effect.kind === kind &&
        effect.sourceSpellId === spellIdForEffectKind(kind),
    ).length ?? 0
  );
}

function spellIdForEffectKind(
  kind: Exclude<AttackSpellShapeActiveEffectKind, "none">,
): AttackSpellShapeSpellId {
  if (kind === "hitPointRegainPrevented") return "chill_touch";
  if (kind === "nextAttackRollAgainstSelf") return "guiding_bolt";
  return "shocking_grasp";
}

function level1SlotsRemaining(
  state: BattleState,
  actorId: CombatantId,
): number {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected character spellcaster.");
  }
  const slot = actor.origin.spellcasting?.spellSlots.find(
    (candidate) => Number(candidate.spellLevel) === 1,
  );
  return slot === undefined ? 0 : Number(slot.count) - Number(slot.expended);
}

function normalizeAttackSpellShapeSelectedIdentityQuintState(
  raw: unknown,
): AttackSpellShapeSelectedIdentityProjection {
  const state = quintStateRecord(raw);
  return {
    targetHp: numberFromQuintInt(state["qTargetHp"], "qTargetHp"),
    spellSlotSpentThisTurn: booleanField(state, "qSpellSlotSpentThisTurn"),
    level1SlotsRemaining: numberFromQuintInt(
      state["qLevel1SlotsRemaining"],
      "qLevel1SlotsRemaining",
    ),
    activeEffectKind: activeEffectKindFromMbt(state["qActiveEffectKind"]),
    activeEffectCount: numberFromQuintInt(
      state["qActiveEffectCount"],
      "qActiveEffectCount",
    ),
    lastResult: mbtLastResult(state["qLastResult"]),
  };
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint state record.");
  }
  return Object.fromEntries(Object.entries(raw));
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}

function booleanField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): boolean {
  const value = state[field];
  if (typeof value === "boolean") return value;
  throw new Error(`Expected Quint boolean field ${field}.`);
}

function activeEffectKindFromMbt(
  raw: unknown,
): AttackSpellShapeSelectedIdentityProjection["activeEffectKind"] {
  if (
    raw === "none" ||
    raw === "hitPointRegainPrevented" ||
    raw === "nextAttackRollAgainstSelf" ||
    raw === "opportunityAttackDenied"
  ) {
    return raw;
  }
  throw new Error(`Unexpected active effect kind ${String(raw)}.`);
}

function mbtLastResult(
  raw: unknown,
): AttackSpellShapeSelectedIdentityProjection["lastResult"] {
  if (
    raw === "init" ||
    raw === "fireBolt" ||
    raw === "chillTouch" ||
    raw === "guidingBolt" ||
    raw === "inflictWoundsFailure" ||
    raw === "inflictWoundsSuccess" ||
    raw === "shockingGrasp"
  ) {
    return raw;
  }
  throw new Error(`Unexpected MBT result ${String(raw)}.`);
}

const attackSpellShapeSelectedIdentityStateCheck = stateCheck(
  normalizeAttackSpellShapeSelectedIdentityQuintState,
  (
    spec: AttackSpellShapeSelectedIdentityProjection,
    impl: AttackSpellShapeSelectedIdentityProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
