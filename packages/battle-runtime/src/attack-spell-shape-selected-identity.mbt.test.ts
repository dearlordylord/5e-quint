// UNIT-IDENTITY-EVIDENCE: selected-identity-replay attack-spell-shape fire_bolt chill_touch guiding_bolt inflict_wounds shocking_grasp
// UNIT-IDENTITY-REPLAY: attack-spell-shape fire_bolt doFireBoltHit
// UNIT-IDENTITY-REPLAY: attack-spell-shape chill_touch doChillTouchHitPointRegainPrevention
// UNIT-IDENTITY-REPLAY: attack-spell-shape guiding_bolt doGuidingBoltNextAttackAdvantage
// UNIT-IDENTITY-REPLAY: attack-spell-shape inflict_wounds doInflictWoundsFailedSave doInflictWoundsSuccessfulSave
// UNIT-IDENTITY-REPLAY: attack-spell-shape shocking_grasp doShockingGraspOpportunityAttackDenied
import { Either } from "effect";
import { expect, it } from "vitest";

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
  battleId,
  characterId,
  combatantId,
  battleReducerStartRouteEvent,
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
  type BattleReducerRouteEvent,
  type BattleResolutionResult,
  type BattleRolledDiceFill,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.ts";
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";

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

const ATTACK_SPELL_SHAPE_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG = {
  Init: "init",
  FireBolt: "fireBolt",
  ChillTouch: "chillTouch",
  GuidingBolt: "guidingBolt",
  InflictWoundsFailure: "inflictWoundsFailure",
  InflictWoundsSuccess: "inflictWoundsSuccess",
  ShockingGrasp: "shockingGrasp",
} as const;

type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
};

const casterId = combatantId("attack-spell-shape-caster");
const targetId = combatantId("attack-spell-shape-target");

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Attack spell shape selected identity Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;

it("observes selected attack spell shape qRoute through public reducer events", () => {
  expect(
    resolveSpellAttackHitRoute({
      state: attackSpellShapeBattle({
        sourceClassName: "wizard",
        cantrips: [spellRecord("fire_bolt")],
      }),
      spellId: "fire_bolt",
      damageGroups: [[4]],
    }),
  ).toEqual(
    spellAttackHitRoute({
      discoveryOwner: "battleActionEconomy",
      includesObjectTargetBoundary: true,
    }),
  );

  expect(
    resolveSpellAttackHitRoute({
      state: attackSpellShapeBattle({
        sourceClassName: "wizard",
        cantrips: [spellRecord("chill_touch")],
      }),
      spellId: "chill_touch",
      damageGroups: [[4]],
    }),
  ).toEqual([
    ...spellAttackHitRoute({
      discoveryOwner: "battleActionEconomy",
      includesObjectTargetBoundary: true,
    }),
    routeResolveSubjectWithoutFill({
      subject: "hitPointRegainPrevention",
      owner: "battleActiveEffect",
    }),
  ]);

  expect(
    resolveSpellAttackHitRoute({
      state: attackSpellShapeBattle({
        sourceClassName: "cleric",
        preparedSpells: [spellRecord("guiding_bolt")],
      }),
      spellId: "guiding_bolt",
      damageGroups: [[1, 1, 1, 1]],
    }),
  ).toEqual([
    ...spellAttackHitRoute({
      discoveryOwner: "battleSpellSlotAndActionEconomy",
    }),
    routeResolveSubjectWithoutFill({
      subject: "nextAttackRollMode",
      owner: "battleActiveEffect",
    }),
  ]);

  expect(
    resolveSaveDamageRoute({
      state: attackSpellShapeBattle({
        sourceClassName: "cleric",
        preparedSpells: [spellRecord("inflict_wounds")],
      }),
      spellId: "inflict_wounds",
      succeeded: false,
      damageGroups: [[3, 3]],
    }),
  ).toEqual(saveGatedDamageRoute());

  expect(
    resolveSaveDamageRoute({
      state: attackSpellShapeBattle({
        sourceClassName: "cleric",
        preparedSpells: [spellRecord("inflict_wounds")],
      }),
      spellId: "inflict_wounds",
      succeeded: true,
      damageGroups: [[3, 3]],
    }),
  ).toEqual(saveGatedDamageRoute());

  expect(
    resolveSpellAttackHitRoute({
      state: attackSpellShapeBattle({
        sourceClassName: "wizard",
        cantrips: [spellRecord("shocking_grasp")],
      }),
      spellId: "shocking_grasp",
      damageGroups: [[4]],
    }),
  ).toEqual([
    ...spellAttackHitRoute({ discoveryOwner: "battleActionEconomy" }),
    routeResolveSubjectWithoutFill({
      subject: "reactionInterdiction",
      owner: "battleActiveEffect",
    }),
  ]);
});

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Attack spell shape selected identity replay",
  taskId: "attack-spell-shape",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-attack-spell-shape-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: ATTACK_SPELL_SHAPE_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG,
  },
  projectionSchema: {
    targetHp: "int",
    spellSlotSpentThisTurn: "bool",
    level1SlotsRemaining: "int",
    activeEffectKind: "str",
    activeEffectCount: "int",
    lastResult: "variant",
  },
  initialProjection: expectedProjection(),
  units: [
    {
      unitId: "fire_bolt",
      procedures: [
        {
          actionName: "doFireBoltHit",
          discover: () =>
            resolveAttackSpellShapeProjection({
              state: attackSpellShapeBattle({
                sourceClassName: "wizard",
                cantrips: [spellRecord("fire_bolt")],
              }),
              spellId: "fire_bolt",
              damageGroups: [[4]],
              lastResult: "fireBolt",
            }),
        },
      ],
    },
    {
      unitId: "chill_touch",
      procedures: [
        {
          actionName: "doChillTouchHitPointRegainPrevention",
          discover: () =>
            resolveAttackSpellShapeProjection({
              state: attackSpellShapeBattle({
                sourceClassName: "wizard",
                cantrips: [spellRecord("chill_touch")],
              }),
              spellId: "chill_touch",
              damageGroups: [[4]],
              lastResult: "chillTouch",
            }),
        },
      ],
    },
    {
      unitId: "guiding_bolt",
      procedures: [
        {
          actionName: "doGuidingBoltNextAttackAdvantage",
          discover: () =>
            resolveAttackSpellShapeProjection({
              state: attackSpellShapeBattle({
                sourceClassName: "cleric",
                preparedSpells: [spellRecord("guiding_bolt")],
              }),
              spellId: "guiding_bolt",
              damageGroups: [[1, 1, 1, 1]],
              lastResult: "guidingBolt",
            }),
        },
      ],
    },
    {
      unitId: "inflict_wounds",
      procedures: [
        {
          actionName: "doInflictWoundsFailedSave",
          discover: () =>
            resolveSaveDamageProjection({
              state: attackSpellShapeBattle({
                sourceClassName: "cleric",
                preparedSpells: [spellRecord("inflict_wounds")],
              }),
              spellId: "inflict_wounds",
              succeeded: false,
              damageGroups: [[3, 3]],
              lastResult: "inflictWoundsFailure",
            }),
        },
        {
          actionName: "doInflictWoundsSuccessfulSave",
          discover: () =>
            resolveSaveDamageProjection({
              state: attackSpellShapeBattle({
                sourceClassName: "cleric",
                preparedSpells: [spellRecord("inflict_wounds")],
              }),
              spellId: "inflict_wounds",
              succeeded: true,
              damageGroups: [[3, 3]],
              lastResult: "inflictWoundsSuccess",
            }),
        },
      ],
    },
    {
      unitId: "shocking_grasp",
      procedures: [
        {
          actionName: "doShockingGraspOpportunityAttackDenied",
          discover: () =>
            resolveAttackSpellShapeProjection({
              state: attackSpellShapeBattle({
                sourceClassName: "wizard",
                cantrips: [spellRecord("shocking_grasp")],
              }),
              spellId: "shocking_grasp",
              damageGroups: [[4]],
              lastResult: "shockingGrasp",
            }),
        },
      ],
    },
  ],
});

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

function requireResolvedAttackSpellShape(
  result: BattleResolutionResult,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  if (result.tag !== "resolved") {
    throw new Error(
      `Expected attack spell shape action to resolve, got ${result.tag}: ${
        "reason" in result ? result.reason : "unknown"
      } ${"message" in result ? result.message : ""}`,
    );
  }
  return result;
}

function resolveSpellAttackHitRoute(input: {
  readonly state: BattleState;
  readonly spellId: Exclude<AttackSpellShapeSpellId, "inflict_wounds">;
  readonly damageGroups: readonly (readonly number[])[];
}): readonly BattleReducerRouteEvent[] {
  const act = actionSpellAct(input.state, input.spellId);
  const target = requireTypedHole(act.initialHoles, "targetChoice");
  const targetFill = spellTargetFill(target, input.spellId);
  const awaitingAttack = requireNeedsHoles(
    resolveBattleSubject({
      state: input.state,
      subject: act.subject,
      fills: [targetFill],
    }),
  );
  const attack = requireTypedHole(awaitingAttack.holes, "attackRoll");
  const attackFill = attackRollFill(attack, {
    total: 18,
    naturalD20: 12,
  });
  const awaitingDamage = requireNeedsHoles(
    resolveBattleSubject({
      state: input.state,
      subject: act.subject,
      fills: [targetFill, attackFill],
    }),
  );
  const damage = requireTypedHole(awaitingDamage.holes, "rolledDice");
  const resolved = requireResolvedAttackSpellShape(
    resolveBattleSubject({
      state: input.state,
      subject: act.subject,
      fills: [
        targetFill,
        attackFill,
        damageRollFillWithGroups(damage, input.damageGroups),
      ],
    }),
  );
  return [
    battleReducerStartRouteEvent(),
    ...routeEventsOf(act, "spell attack discovery"),
    ...routeEventsOf(awaitingAttack, "spell attack target"),
    ...routeEventsOf(awaitingDamage, "spell attack roll"),
    ...routeEventsOf(resolved, "spell attack damage"),
  ];
}

function resolveSaveDamageRoute(input: {
  readonly state: BattleState;
  readonly spellId: Extract<AttackSpellShapeSpellId, "inflict_wounds">;
  readonly succeeded: boolean;
  readonly damageGroups: readonly (readonly number[])[];
}): readonly BattleReducerRouteEvent[] {
  const act = actionSpellAct(input.state, input.spellId);
  const target = requireTypedHole(act.initialHoles, "targetChoice");
  const targetFill = spellTargetFill(target, input.spellId);
  const awaitingSave = requireNeedsHoles(
    resolveBattleSubject({
      state: input.state,
      subject: act.subject,
      fills: [targetFill],
    }),
  );
  const save = requireTypedHole(awaitingSave.holes, "savingThrowOutcome");
  const saveFill = savingThrowOutcomeFill(save, input.succeeded);
  const awaitingDamage = requireNeedsHoles(
    resolveBattleSubject({
      state: input.state,
      subject: act.subject,
      fills: [targetFill, saveFill],
    }),
  );
  const damage = requireTypedHole(awaitingDamage.holes, "rolledDice");
  const resolved = requireResolvedAttackSpellShape(
    resolveBattleSubject({
      state: input.state,
      subject: act.subject,
      fills: [
        targetFill,
        saveFill,
        damageRollFillWithGroups(damage, input.damageGroups),
      ],
    }),
  );
  return [
    battleReducerStartRouteEvent(),
    ...routeEventsOf(act, "save-gated discovery"),
    ...routeEventsOf(awaitingSave, "save-gated target"),
    ...routeEventsOf(awaitingDamage, "save-gated saving throw"),
    ...routeEventsOf(resolved, "save-gated damage"),
  ];
}

function spellAttackHitRoute(input: {
  readonly discoveryOwner: Extract<
    BattleReducerRouteEvent,
    { readonly kind: "discoverBattleActs" }
  >["owner"];
  readonly includesObjectTargetBoundary?: boolean;
}): readonly BattleReducerRouteEvent[] {
  return [
    battleReducerStartRouteEvent(),
    routeDiscoverBattleActs({
      subject: "spellAttackProcedure",
      holes: ["targetChoice"],
      owner: input.discoveryOwner,
    }),
    ...(input.includesObjectTargetBoundary === true
      ? [
          routeDiscoverBattleActs({
            subject: "spellAttackProcedure",
            holes: ["targetChoice"],
            owner: "battleObjectTargetBoundary",
          }),
        ]
      : []),
    routeResolveSubject({
      subject: "spellAttackProcedure",
      fill: "targetChoice",
      holes: ["attackRoll"],
      owner: "battleTargetSelection",
    }),
    routeResolveSubject({
      subject: "spellAttackProcedure",
      fill: "attackRoll",
      holes: ["rolledDice"],
      owner: "battleAttackRoll",
    }),
    routeResolveSubject({
      subject: "spellAttackProcedure",
      fill: "rolledDice",
      holes: [],
      owner: "battleHitPoint",
    }),
  ];
}

function saveGatedDamageRoute(): readonly BattleReducerRouteEvent[] {
  return [
    battleReducerStartRouteEvent(),
    routeDiscoverBattleActs({
      subject: "saveGatedSpell",
      holes: ["targetChoice"],
      owner: "battleSpellSlotAndActionEconomy",
    }),
    routeResolveSubject({
      subject: "saveGatedSpell",
      fill: "targetChoice",
      holes: ["savingThrowOutcome"],
      owner: "battleTargetSelection",
    }),
    routeResolveSubject({
      subject: "saveGatedSpell",
      fill: "savingThrowOutcome",
      holes: ["rolledDice"],
      owner: "battleHoleFrontier",
    }),
    routeResolveSubject({
      subject: "saveGatedSpell",
      fill: "rolledDice",
      holes: [],
      owner: "battleHitPoint",
    }),
  ];
}

function routeDiscoverBattleActs(
  input: Omit<
    Extract<BattleReducerRouteEvent, { readonly kind: "discoverBattleActs" }>,
    "kind"
  >,
): BattleReducerRouteEvent {
  return { kind: "discoverBattleActs", ...input };
}

function routeResolveSubject(
  input: Omit<
    Extract<BattleReducerRouteEvent, { readonly kind: "resolveBattleSubject" }>,
    "kind"
  >,
): BattleReducerRouteEvent {
  return { kind: "resolveBattleSubject", ...input };
}

function routeResolveSubjectWithoutFill(
  input: Omit<
    Extract<
      BattleReducerRouteEvent,
      { readonly kind: "resolveBattleSubjectWithoutFill" }
    >,
    "kind" | "holes"
  >,
): BattleReducerRouteEvent {
  return { kind: "resolveBattleSubjectWithoutFill", holes: [], ...input };
}

function routeEventsOf(
  source: { readonly routeEvents?: readonly BattleReducerRouteEvent[] },
  label: string,
): readonly BattleReducerRouteEvent[] {
  if (source.routeEvents === undefined) {
    throw new Error(`Expected ${label} route events.`);
  }
  return source.routeEvents;
}

function requireNeedsHoles(
  result: BattleResolutionResult,
): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> {
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected needsHoles result, got ${result.tag}.`);
  }
  return result;
}

function requireTypedHole<K extends BattleHole["kind"]>(
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

function resolveAttackSpellShapeProjection(input: {
  readonly state: BattleState;
  readonly spellId: Exclude<AttackSpellShapeSpellId, "inflict_wounds">;
  readonly damageGroups: readonly (readonly number[])[];
  readonly lastResult: Exclude<
    AttackSpellShapeSelectedIdentityProjection["lastResult"],
    "init" | "inflictWoundsFailure" | "inflictWoundsSuccess"
  >;
}): AttackSpellShapeSelectedIdentityProjection {
  const resolved = requireResolvedAttackSpellShape(
    resolveSpellAttackHit({
      state: input.state,
      spellId: input.spellId,
      damageGroups: input.damageGroups,
    }),
  );
  return projectAttackSpellShapeSelectedIdentityState(
    resolved.state,
    input.lastResult,
  );
}

function resolveSaveDamageProjection(input: {
  readonly state: BattleState;
  readonly spellId: Extract<AttackSpellShapeSpellId, "inflict_wounds">;
  readonly succeeded: boolean;
  readonly damageGroups: readonly (readonly number[])[];
  readonly lastResult: Extract<
    AttackSpellShapeSelectedIdentityProjection["lastResult"],
    "inflictWoundsFailure" | "inflictWoundsSuccess"
  >;
}): AttackSpellShapeSelectedIdentityProjection {
  const resolved = requireResolvedAttackSpellShape(
    resolveSaveDamageSpell({
      state: input.state,
      spellId: input.spellId,
      succeeded: input.succeeded,
      damageGroups: input.damageGroups,
    }),
  );
  return projectAttackSpellShapeSelectedIdentityState(
    resolved.state,
    input.lastResult,
  );
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
  readonly spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
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
      state.currentTurnResources.spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed",
      ),
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
        "sourceSpellId" in effect &&
        effect.sourceSpellId === "guiding_bolt",
    )
  ) {
    return "nextAttackRollAgainstSelf";
  }
  if (
    effects.some(
      (effect) =>
        effect.kind === "opportunityAttackDenied" &&
        "sourceSpellId" in effect &&
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
        "sourceSpellId" in effect &&
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
