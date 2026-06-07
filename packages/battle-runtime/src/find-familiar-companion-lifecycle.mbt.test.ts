// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.find-familiar-lifecycle
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE
// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Find Familiar:
//   chosen familiar form, Celestial/Fey/Fiend type override, telepathic
//   connection within 100 feet, Bonus Action shared senses, Touch spell
//   delivery using the familiar's Reaction, combatant Initiative, and one
//   familiar only with recast form replacement.
// - .references/srd-5.2.1/Classes/Warlock.md#Pact of the Chain:
//   Pact of the Chain learns Find Familiar, widens eligible forms, and lets
//   the owner forgo one Attack-action attack so the familiar attacks with its
//   Reaction.
// - UBIQUITOUS_LANGUAGE.md: Companion, Magic Action, Bonus Action, Reaction,
//   Spell Invocation, Spell Effect, Attack Roll, and Hit Points.
import * as path from "node:path";

import { canSpendBonusAction } from "@dnd/shared-algebras/action-economy-algebra";
import {
  abilityModifier,
  DieRollResult,
  proficiencyBonus,
} from "@dnd/shared/types";
import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import * as Either from "effect/Either";
import { describe, expect, it } from "vitest";

import {
  battleId,
  castFindFamiliar,
  combatantId,
  deliverTouchSpellThroughFindFamiliar,
  discoverBattleActs,
  findFamiliarCompanionEntryForOwner,
  findFamiliarFormEligibilityForSpell,
  findFamiliarTelepathicConnection,
  initiativeScore,
  resolveBattleSubject,
  shareFindFamiliarSenses,
  startBattle,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type AvailableBattleAct,
  type BattleSubject,
  type FindFamiliarFormEligibility,
  type PactOfTheChainFamiliarAttackSubject,
} from "./index.ts";
import {
  characterCreature,
  requireCombatant,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  oppositionSide,
  partySide,
  statBlockCatalog,
} from "./unit-profile-admission-catalog-support.ts";

const FAMILIAR_STATUSES = ["none", "present"] as const;
type FamiliarStatus = (typeof FAMILIAR_STATUSES)[number];
const FAMILIAR_IDS = ["none", "primary"] as const;
type FamiliarIdentity = (typeof FAMILIAR_IDS)[number];
const FAMILIAR_FORMS = ["none", "cat", "rat"] as const;
type FamiliarForm = (typeof FAMILIAR_FORMS)[number];
const CREATURE_TYPE_OVERRIDES = ["none", "fey"] as const;
type CreatureTypeOverride = (typeof CREATURE_TYPE_OVERRIDES)[number];
const LAST_RESULTS = [
  "init",
  "createdCat",
  "replacedRat",
  "sharedSenses",
  "touchDelivered",
  "pactAttack",
] as const;
type LastResult = (typeof LAST_RESULTS)[number];

type FindFamiliarCompanionProjection = {
  readonly familiarStatus: FamiliarStatus;
  readonly familiarId: FamiliarIdentity;
  readonly familiarForm: FamiliarForm;
  readonly creatureTypeOverride: CreatureTypeOverride;
  readonly companionCount: number;
  readonly telepathyAvailable: boolean;
  readonly sharedSensesActive: boolean;
  readonly bonusActionAvailable: boolean;
  readonly ownerAttackAvailable: boolean;
  readonly familiarReactionAvailable: boolean;
  readonly touchDeliveryReactionSpent: boolean;
  readonly pactReactionAttackResolved: boolean;
  readonly spellSlotCommitted: boolean;
  readonly targetHp: number;
  readonly lastResult: LastResult;
};

type FindFamiliarCompanionRuntimeState = {
  readonly battle: BattleState;
  readonly lastResult: LastResult;
};

const casterId = combatantId("find-familiar-mbt-caster");
const familiarId = combatantId("find-familiar-mbt-familiar");
const targetId = combatantId("find-familiar-mbt-target");
const initialTargetHp = 12;
const findFamiliarSpell = spellRecord("find_familiar");
const cureWoundsSpell = spellRecord("cure_wounds");
const familiarEligibility = requireFindFamiliarEligibility(
  findFamiliarFormEligibilityForSpell(findFamiliarSpell),
);

const driverSchema = {
  init: {},
  doCreateCatFamiliar: {},
  doReplaceWithRatFamiliar: {},
  doShareSenses: {},
  doDeliverTouchSpell: {},
  doPactFamiliarAttack: {},
  step: {},
} as const;

function createFindFamiliarCompanionLifecycleDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doCreateCatFamiliar: () => {
        state = createCatFamiliar(state);
      },
      doReplaceWithRatFamiliar: () => {
        state = replaceWithRatFamiliar(state);
      },
      doShareSenses: () => {
        state = shareSenses(state);
      },
      doDeliverTouchSpell: () => {
        state = deliverTouchSpell(state);
      },
      doPactFamiliarAttack: () => {
        state = resolvePactFamiliarAttack(state);
      },
      step: () => {},
      getState: () => findFamiliarCompanionProjection(state),
    };
  });
}

const findFamiliarCompanionStateCheck = stateCheck(
  normalizeFindFamiliarCompanionQuintState,
  compareFindFamiliarCompanionStates,
);

describe("Find Familiar companion lifecycle MBT parity", () => {
  it("creates and replaces one owner-linked companion with selected form and type facts", () => {
    const created = createCatFamiliar(initialRuntimeState());
    const replaced = replaceWithRatFamiliar(created);

    expect(findFamiliarCompanionProjection(created)).toMatchObject({
      familiarStatus: "present",
      familiarId: "primary",
      familiarForm: "cat",
      creatureTypeOverride: "fey",
      companionCount: 1,
      telepathyAvailable: true,
      lastResult: "createdCat",
    });
    expect(findFamiliarCompanionProjection(replaced)).toMatchObject({
      familiarStatus: "present",
      familiarId: "primary",
      familiarForm: "rat",
      creatureTypeOverride: "fey",
      companionCount: 1,
      telepathyAvailable: true,
      lastResult: "replacedRat",
    });
  });

  it("projects telepathy, shared senses, and Touch delivery through runtime state", () => {
    const shared = shareSenses(createCatFamiliar(initialRuntimeState()));
    const delivered = deliverTouchSpell(shared);

    expect(findFamiliarCompanionProjection(shared)).toMatchObject({
      telepathyAvailable: true,
      sharedSensesActive: true,
      bonusActionAvailable: false,
      familiarReactionAvailable: true,
      lastResult: "sharedSenses",
    });
    expect(findFamiliarCompanionProjection(delivered)).toMatchObject({
      familiarReactionAvailable: false,
      touchDeliveryReactionSpent: true,
      spellSlotCommitted: true,
      targetHp: initialTargetHp,
      lastResult: "touchDelivered",
    });
  });

  it("spends the owner Attack-action attack and familiar Reaction for Pact of the Chain", () => {
    const resolved = resolvePactFamiliarAttack(
      createCatFamiliar(initialRuntimeState()),
    );

    expect(findFamiliarCompanionProjection(resolved)).toMatchObject({
      ownerAttackAvailable: false,
      familiarReactionAvailable: false,
      pactReactionAttackResolved: true,
      targetHp: initialTargetHp - 1,
      lastResult: "pactAttack",
    });
  });

  it("matches the focused companion lifecycle against bounded random MBT traces", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-find-familiar-companion-lifecycle.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createFindFamiliarCompanionLifecycleDriver(),
      backend: "typescript",
      nTraces: 10,
      maxSteps: 5,
      stateCheck: findFamiliarCompanionStateCheck,
    });
  }, 120_000);
});

function initialRuntimeState(): FindFamiliarCompanionRuntimeState {
  const result = startBattle({
    battleId: battleId("find-familiar-companion-lifecycle-mbt"),
    combatants: [
      characterCreature({
        combatantId: casterId,
        displayName: "Pact Caster",
        initiative: 20,
        side: partySide,
        classLevels: [{ className: "warlock", level: 1 }],
        spellcasting: {
          sourceClassName: "warlock",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [cureWoundsSpell],
          featurePreparedSpells: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [
            {
              tag: "pactOfTheChainFindFamiliar",
              spell: findFamiliarSpell,
            },
          ],
          spellSlots: [{ spellLevel: 1, count: 1 }],
        },
      }),
      characterCreature({
        combatantId: targetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
        currentHp: initialTargetHp,
        maxHp: initialTargetHp,
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return { battle: result.right, lastResult: "init" };
}

function createCatFamiliar(
  state: FindFamiliarCompanionRuntimeState,
): FindFamiliarCompanionRuntimeState {
  return castNormalFamiliar(state, "cat", "createdCat");
}

function replaceWithRatFamiliar(
  state: FindFamiliarCompanionRuntimeState,
): FindFamiliarCompanionRuntimeState {
  return castNormalFamiliar(state, "rat", "replacedRat");
}

function castNormalFamiliar(
  state: FindFamiliarCompanionRuntimeState,
  formId: Extract<FamiliarForm, "cat" | "rat">,
  lastResult: Extract<LastResult, "createdCat" | "replacedRat">,
): FindFamiliarCompanionRuntimeState {
  const result = castFindFamiliar({
    state: state.battle,
    casterId,
    catalog: statBlockCatalog,
    eligibility: familiarEligibility,
    selection: { tag: "normalNamedForm", formId },
    creatureTypeOverrideChoiceId: "fey",
    familiarId,
    initiative: initiativeScore(18),
    placement: { kind: "unoccupiedSpaceWithinSpellRange" },
  });
  return { battle: requireResolved(result), lastResult };
}

function shareSenses(
  state: FindFamiliarCompanionRuntimeState,
): FindFamiliarCompanionRuntimeState {
  const result = shareFindFamiliarSenses({
    state: state.battle,
    casterId,
    fact: familiarWithin100FeetFact(),
  });
  return { battle: requireResolved(result), lastResult: "sharedSenses" };
}

function deliverTouchSpell(
  state: FindFamiliarCompanionRuntimeState,
): FindFamiliarCompanionRuntimeState {
  const act = actionSpellAct(state.battle, "cure_wounds");
  const targetFill = touchSpellTargetFill(
    requireHole(act.initialHoles, "targetChoice"),
  );
  const awaitingHealingRoll = deliverTouchSpellThroughFindFamiliar({
    state: state.battle,
    subject: act.subject,
    fills: [targetFill],
    fact: familiarWithin100FeetFact(),
  });
  if (awaitingHealingRoll.tag !== "needsHoles") {
    throw new Error("Expected Find Familiar Touch delivery healing roll hole.");
  }
  const result = deliverTouchSpellThroughFindFamiliar({
    state: state.battle,
    subject: act.subject,
    fills: [
      targetFill,
      healingRollFill(requireHole(awaitingHealingRoll.holes, "rolledDice")),
    ],
    fact: familiarWithin100FeetFact(),
  });
  return { battle: requireResolved(result), lastResult: "touchDelivered" };
}

function resolvePactFamiliarAttack(
  state: FindFamiliarCompanionRuntimeState,
): FindFamiliarCompanionRuntimeState {
  const result = resolveBattleSubject({
    state: state.battle,
    subject: pactScratchSubject(),
    fills: pactScratchFilledAttackFills(state.battle),
  });
  return { battle: requireResolved(result), lastResult: "pactAttack" };
}

function findFamiliarCompanionProjection(
  state: FindFamiliarCompanionRuntimeState,
): FindFamiliarCompanionProjection {
  const familiarEntry = findFamiliarCompanionEntryForOwner(
    state.battle,
    casterId,
  );
  const familiar = familiarEntry?.companion ?? null;
  const familiarCombatant =
    familiarEntry !== null && familiarEntry.companion.status === "present"
      ? state.battle.combatants.get(familiarEntry.companionId)
      : undefined;
  const familiarReactionAvailable =
    familiarCombatant?.reactionAvailable === true;
  const spellSlotCommitted =
    state.battle.currentTurnResources.spellSlotUsesThisTurn.some(
      (use) => use.kind === "committed",
    );
  const targetHp = Number(requireCombatant(state.battle, targetId).hp);
  const connection = findFamiliarTelepathicConnection(
    state.battle,
    familiarWithin100FeetFact(),
  );
  const caster = requireCombatant(state.battle, casterId);
  const projection = {
    familiarStatus: familiar?.status === "present" ? "present" : "none",
    familiarId: familiar?.status === "present" ? "primary" : "none",
    familiarForm:
      familiar?.formSelection.tag === "normalNamedForm"
        ? familiarForm(familiar.formSelection.formId)
        : "none",
    creatureTypeOverride: creatureTypeOverride(
      familiar?.creatureTypeOverride ?? "none",
    ),
    companionCount: state.battle.companions.size,
    telepathyAvailable: connection !== null,
    sharedSensesActive: caster.activeEffects.some(
      (effect) =>
        effect.kind === "findFamiliarSharedSenses" &&
        effect.familiarId === familiarId,
    ),
    bonusActionAvailable: canSpendBonusAction(
      state.battle.currentTurnResources,
    ),
    ownerAttackAvailable:
      state.battle.currentTurnResources.actionResources.length > 0,
    familiarReactionAvailable,
    touchDeliveryReactionSpent:
      spellSlotCommitted && !familiarReactionAvailable,
    pactReactionAttackResolved:
      targetHp === initialTargetHp - 1 && !spellSlotCommitted,
    spellSlotCommitted,
    targetHp,
    lastResult: state.lastResult,
  } satisfies FindFamiliarCompanionProjection;
  expect(projection.companionCount).toBe(
    projection.familiarStatus === "present" ? 1 : 0,
  );
  return projection;
}

function familiarWithin100FeetFact() {
  return {
    kind: "findFamiliarWithin100FeetOfOwner" as const,
    ownerId: casterId,
    familiarId,
  };
}

function actionSpellAct(
  state: BattleState,
  spellId: "cure_wounds",
): AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
} {
  const act = discoverBattleActs(state).find(
    (
      candidate,
    ): candidate is AvailableBattleAct & {
      readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
    } =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.spellId === spellId,
  );
  if (act === undefined) {
    throw new Error(`Expected ${spellId} action spell act.`);
  }
  return act;
}

function requireFindFamiliarEligibility(
  eligibility: FindFamiliarFormEligibility | null,
): FindFamiliarFormEligibility {
  if (eligibility === null) {
    throw new Error("Expected Find Familiar form eligibility.");
  }
  return eligibility;
}

function touchSpellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "findFamiliarTouchSpellTarget",
        ownerId: casterId,
        familiarId,
        targetId,
        spellId: "cure_wounds",
      },
    ],
  };
}

function healingRollFill(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: [{ results: [DieRollResult(4), DieRollResult(4)] }],
  };
}

function pactScratchSubject(): PactOfTheChainFamiliarAttackSubject {
  return {
    tag: "pactOfTheChainFamiliarAttack",
    actorId: casterId,
    familiarId,
    attackName: "Scratch",
  };
}

function pactScratchFilledAttackFills(
  state: BattleState,
): readonly BattleFill[] {
  const subject = pactScratchSubject();
  const awaitingTarget = resolveBattleSubject({ state, subject, fills: [] });
  if (awaitingTarget.tag !== "needsHoles") {
    throw new Error("Expected Pact familiar attack target hole.");
  }
  const target = familiarAttackTargetFill(
    requireHole(awaitingTarget.holes, "targetChoice"),
  );
  const awaitingAttackRoll = resolveBattleSubject({
    state,
    subject,
    fills: [target],
  });
  if (awaitingAttackRoll.tag !== "needsHoles") {
    throw new Error("Expected Pact familiar attack roll hole.");
  }
  const attackRoll = attackRollFill(
    requireHole(awaitingAttackRoll.holes, "attackRoll"),
  );
  const awaitingDamage = resolveBattleSubject({
    state,
    subject,
    fills: [target, attackRoll],
  });
  if (awaitingDamage.tag !== "needsHoles") {
    throw new Error("Expected Pact familiar damage roll hole.");
  }
  return [
    target,
    attackRoll,
    fixedDamageRollFill(requireHole(awaitingDamage.holes, "rolledDice")),
  ];
}

function familiarAttackTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "attackTargetInMeleeReach",
        actorId: familiarId,
        targetId,
        attackName: "Scratch",
      },
    ],
  };
}

function attackRollFill(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: {
      total: 23,
      naturalD20: DieRollResult(19),
    },
  };
}

function fixedDamageRollFill(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: [
      {
        // SRD familiar-form attacks such as Cat Scratch are authored as
        // fixed 0d1+1 damage. The runtime still asks for the rolledDice hole
        // for the fixed expression, but the shared fill type currently brands
        // rolled dice groups as non-empty. There is no parser/generic helper
        // for this zero-dice authored shape, so the test narrows exactly this
        // empty dice group at the call boundary.
        results: [] as unknown as Extract<
          BattleFill,
          { readonly kind: "rolledDice" }
        >["value"][number]["results"],
      },
    ],
  };
}

function requireHole<K extends BattleHole["kind"]>(
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

function requireResolved(result: BattleResolutionResult): BattleState {
  expect(result).toMatchObject({ tag: "resolved" });
  if (result.tag !== "resolved") {
    throw new Error("Expected Find Familiar companion action to resolve.");
  }
  return result.state;
}

function normalizeFindFamiliarCompanionQuintState(
  raw: unknown,
): FindFamiliarCompanionProjection {
  const state = quintStateRecord(raw);
  return {
    familiarStatus: literalField(state["qFamiliarStatus"], FAMILIAR_STATUSES),
    familiarId: literalField(state["qFamiliarId"], FAMILIAR_IDS),
    familiarForm: literalField(state["qFamiliarForm"], FAMILIAR_FORMS),
    creatureTypeOverride: literalField(
      state["qCreatureTypeOverride"],
      CREATURE_TYPE_OVERRIDES,
    ),
    companionCount: numberFromQuintInt(
      state["qCompanionCount"],
      "qCompanionCount",
    ),
    telepathyAvailable: booleanField(state, "qTelepathyAvailable"),
    sharedSensesActive: booleanField(state, "qSharedSensesActive"),
    bonusActionAvailable: booleanField(state, "qBonusActionAvailable"),
    ownerAttackAvailable: booleanField(state, "qOwnerAttackAvailable"),
    familiarReactionAvailable: booleanField(
      state,
      "qFamiliarReactionAvailable",
    ),
    touchDeliveryReactionSpent: booleanField(
      state,
      "qTouchDeliveryReactionSpent",
    ),
    pactReactionAttackResolved: booleanField(
      state,
      "qPactReactionAttackResolved",
    ),
    spellSlotCommitted: booleanField(state, "qSpellSlotCommitted"),
    targetHp: numberFromQuintInt(state["qTargetHp"], "qTargetHp"),
    lastResult: literalField(state["qLastResult"], LAST_RESULTS),
  };
}

function compareFindFamiliarCompanionStates(
  runtime: FindFamiliarCompanionProjection,
  quint: FindFamiliarCompanionProjection,
): boolean {
  try {
    expect(runtime).toEqual(quint);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `${error.message}\n${JSON.stringify({ runtime, quint }, null, 2)}`,
      );
    }
    throw error;
  }
  return true;
}

function familiarForm(raw: unknown): FamiliarForm {
  return literalField(raw, FAMILIAR_FORMS);
}

function creatureTypeOverride(raw: unknown): CreatureTypeOverride {
  return literalField(raw, CREATURE_TYPE_OVERRIDES);
}

function literalField<const T extends readonly string[]>(
  raw: unknown,
  values: T,
): T[number] {
  if (typeof raw === "string" && values.includes(raw)) {
    return raw;
  }
  throw new Error(`Unexpected literal value: ${String(raw)}.`);
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (!isRecord(raw)) {
    throw new Error("Expected Quint Find Familiar companion state.");
  }
  return raw;
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
  if (typeof state[field] === "boolean") {
    return state[field];
  }
  throw new Error(`Expected Quint Boolean field ${field}.`);
}

function isRecord(raw: unknown): raw is Readonly<Record<string, unknown>> {
  return typeof raw === "object" && raw !== null;
}
