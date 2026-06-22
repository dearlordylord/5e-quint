// KERNEL-COVERAGE: parity-witness CHARACTER.LIFECYCLE.LAYER_PROJECTION
import * as path from "node:path";

import {
  battleCombatantSide,
  battleCreatureInitFromStatBlock,
  battleId,
  combatantId,
  initiativeScore,
  discoverBattleActs,
  resolveBattleSubject,
  startBattle,
  type BattleCreatureState,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
} from "@dnd/battle-runtime";
import {
  abilityScoreAssignment,
  characterBuildHitPoints,
  characterDraftId,
  creationChoiceOptionId,
  createCharacterDraft,
  discoverCreationHoles,
  fillCreationHoles,
  finalizeCharacterDraft,
  loadoutEquipmentUnitId,
  loadoutSourceHoleIdText,
  parseCreationHoleId,
  unitChoiceKey,
  unitChoiceSourceHoleIdText,
  unitChoiceSourceUnitId,
  type AbilityScoreAssignment,
  type CharacterBuild,
  type CharacterDraft,
  type CreationFill,
  type LoadoutSlot,
} from "@dnd/character-creation-runtime";
import {
  characterSheetCurrentHp,
  characterSheetHitPointMaximum,
  characterSheetId,
  createFreshCharacterSheet,
  type CharacterSheet,
} from "@dnd/character-sheet-runtime";
import { DieRollResult, Hp } from "@dnd/shared/types";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import {
  characterSheetBattleInit,
  settleCharacterSheetFromBattle,
} from "./index.ts";

const characterLifecycleLayers = [
  "Draft",
  "Build",
  "Sheet",
  "BattleInitProjection",
  "BattleRuntime",
  "Settlement",
] as const;
type CharacterLifecycleLayer = (typeof characterLifecycleLayers)[number];
const lifecycleReplayStepCount = characterLifecycleLayers.length - 1;
const lifecycleSheetMaximumHp = 12;
const lifecycleSettledHp = 8;

type CharacterLifecycleProjection = {
  readonly layer: CharacterLifecycleLayer;
  readonly draftHasOpenHoles: boolean;
  readonly buildFinalized: boolean;
  readonly sheetOwnsHitPoints: boolean;
  readonly sheetCurrentHp: number;
  readonly sheetMaxHp: number;
  readonly battleInitCharacterCombatant: boolean;
  readonly battleRuntimeCharacterHp: number;
  readonly battleRuntimeHpChanged: boolean;
  readonly settlementCurrentHp: number;
  readonly settlementPersistedBattleHp: boolean;
  readonly buildIdentityUnchanged: boolean;
  readonly replayIndex: number;
};

type CharacterBattleCombatant = BattleCreatureState & {
  readonly origin: Extract<
    BattleCreatureState["origin"],
    { readonly kind: "character" }
  >;
};

type AttackBattleSubject = Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
>;
type BattleAct = ReturnType<typeof discoverBattleActs>[number];
type AttackBattleAct = BattleAct & { readonly subject: AttackBattleSubject };

type LifecycleSession = {
  readonly draft?: CharacterDraft;
  readonly build?: CharacterBuild;
  readonly buildSignature?: string;
  readonly sheet?: CharacterSheet;
  readonly battleState?: BattleState;
  readonly characterCombatant?: CharacterBattleCombatant;
  readonly battleRuntimeCharacterHp?: number;
};

const lifecycleDriverSchema = {
  init: {},
  doFinalizeDraftToBuild: {},
  doCreateSheetFromBuild: {},
  doProjectSheetToBattleInit: {},
  doResolveSkeletonShortswordAttack: {},
  doSettleBattleToSheet: {},
  step: {},
} as const;

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});
if (unitCatalogResult.tag !== "ok" || statBlockCatalogResult.tag !== "ok") {
  throw new Error("Character lifecycle projection catalogs must build.");
}
const unitLibrary = unitCatalogResult.catalog;
const statBlockCatalog = statBlockCatalogResult.catalog;
const lifecycleCharacterId = characterSheetId(
  "character:layer-projection-lifecycle",
);
const lifecycleCharacterCombatantId = combatantId(
  "combatant:layer-projection-character",
);
const lifecycleSkeletonCombatantId = combatantId(
  "combatant:layer-projection-skeleton",
);
const lifecycleStateCheck = stateCheck(
  normalizeLifecycleQuintState,
  compareLifecycleState,
);

describe("Character layer projection lifecycle deterministic QNT replay", () => {
  it("replays Draft to Build to Sheet to battle runtime to settlement", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../character-layer-projection-lifecycle.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createLifecycleDriver(),
      backend: "typescript",
      nTraces: 1,
      maxSteps: lifecycleReplayStepCount,
      stateCheck: lifecycleStateCheck,
    });
  }, 120_000);
});

function createLifecycleDriver() {
  return defineDriver(lifecycleDriverSchema, () => {
    let session: LifecycleSession = {};
    let projection = initialProjection();

    function reset(): void {
      const draft = createCharacterDraft({
        unitLibrary,
        draftId: characterDraftId("draft:layer-projection-lifecycle"),
      });
      const holes = discoverCreationHoles({ draft, unitLibrary });
      session = { draft };
      projection = {
        ...initialProjection(),
        draftHasOpenHoles: holes.length > 0,
      };
    }

    return {
      init: reset,
      doFinalizeDraftToBuild: () => {
        runLifecycleAction("finalize Draft to Build", () => {
          const build = finalizeLifecycleDraft(requireSessionDraft(session));
          session = {
            ...session,
            build,
            buildSignature: JSON.stringify(build),
          };
          projection = {
            ...initialProjection(),
            layer: "Build",
            buildFinalized: true,
            replayIndex: 1,
          };
        });
      },
      doCreateSheetFromBuild: () => {
        runLifecycleAction("create Sheet from Build", () => {
          const build = requireSessionBuild(session);
          const maximumHp = lifecycleBuildMaximumHp(build);
          if (maximumHp !== lifecycleSheetMaximumHp) {
            throw new Error("Expected lifecycle Fighter build to have 12 HP.");
          }
          const sheet = requireRight(
            createFreshCharacterSheet({
              characterId: lifecycleCharacterId,
              build,
              currentHp: Hp(maximumHp),
              tempHp: Hp(0),
              hitPointMaximumReduction: Hp(0),
              conditions: [],
              unitLibrary,
            }),
          );
          session = { ...session, sheet };
          projection = {
            ...initialProjection(),
            layer: "Sheet",
            buildFinalized: true,
            sheetOwnsHitPoints: true,
            sheetCurrentHp: Number(characterSheetCurrentHp(sheet)),
            sheetMaxHp: Number(
              requireRight(
                characterSheetHitPointMaximum({ sheet, unitLibrary }),
              ),
            ),
            replayIndex: 2,
          };
        });
      },
      doProjectSheetToBattleInit: () => {
        runLifecycleAction("project Sheet to battle init", () => {
          const battle = startLifecycleBattle(requireSessionSheet(session));
          session = {
            ...session,
            battleState: battle.state,
            characterCombatant: battle.combatant,
          };
          projection = {
            ...projection,
            layer: "BattleInitProjection",
            battleInitCharacterCombatant: true,
            replayIndex: 3,
          };
        });
      },
      doResolveSkeletonShortswordAttack: () => {
        runLifecycleAction("resolve Skeleton Shortsword attack", () => {
          const battleState = resolveSkeletonShortswordAttack(
            requireSessionBattleState(session),
          );
          const combatant = requireCharacterCombatant(
            battleState.combatants.get(lifecycleCharacterCombatantId),
          );
          const battleRuntimeCharacterHp = Number(combatant.hp);
          if (battleRuntimeCharacterHp !== lifecycleSettledHp) {
            throw new Error("Expected Skeleton Shortsword to leave 8 HP.");
          }
          session = {
            ...session,
            battleState,
            characterCombatant: combatant,
            battleRuntimeCharacterHp,
          };
          projection = {
            ...projection,
            layer: "BattleRuntime",
            battleRuntimeCharacterHp,
            battleRuntimeHpChanged:
              battleRuntimeCharacterHp !== projection.sheetCurrentHp,
            replayIndex: 4,
          };
        });
      },
      doSettleBattleToSheet: () => {
        runLifecycleAction("settle Battle back to Sheet", () => {
          const sheet = requireSessionSheet(session);
          const combatant = requireSessionCombatant(session);
          const settled = requireRight(
            settleCharacterSheetFromBattle({
              sheet,
              state: requireSessionBattleState(session),
              combatant,
              unitLibrary,
            }),
          );
          session = { ...session, sheet: settled };
          const settlementCurrentHp = Number(characterSheetCurrentHp(settled));
          if (settlementCurrentHp !== lifecycleSettledHp) {
            throw new Error("Expected settlement to persist 8 HP.");
          }
          projection = {
            ...projection,
            layer: "Settlement",
            settlementCurrentHp,
            settlementPersistedBattleHp:
              settlementCurrentHp === session.battleRuntimeCharacterHp,
            buildIdentityUnchanged:
              JSON.stringify(settled.build) ===
              requireSessionBuildSignature(session),
            replayIndex: 5,
          };
        });
      },
      step: () => {},
      getState: () => projection,
    };
  });
}

function runLifecycleAction(label: string, action: () => void): void {
  try {
    action();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`${label}: ${error.message}`);
    }
    throw new Error(`${label}: ${JSON.stringify(error)}`);
  }
}

function initialProjection(): CharacterLifecycleProjection {
  return {
    layer: "Draft",
    draftHasOpenHoles: false,
    buildFinalized: false,
    sheetOwnsHitPoints: false,
    sheetCurrentHp: 0,
    sheetMaxHp: 0,
    battleInitCharacterCombatant: false,
    battleRuntimeCharacterHp: 0,
    battleRuntimeHpChanged: false,
    settlementCurrentHp: 0,
    settlementPersistedBattleHp: false,
    buildIdentityUnchanged: false,
    replayIndex: 0,
  };
}

function finalizeLifecycleDraft(draft: CharacterDraft): CharacterBuild {
  const afterInitial = requireAcceptedBatch(
    fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: initialManifestFills(),
    }),
  );
  const afterChoices = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterInitial,
      unitLibrary,
      expectedRevision: afterInitial.revision,
      fills: [
        choiceFill(
          unitChoiceHoleId("class_fighter", "class_skill_proficiency_choice"),
          "perception",
          "survival",
        ),
        choiceFill(
          unitChoiceHoleId(
            "fighter_fighting_style",
            "class_feature_feat_choice",
          ),
          "defense",
        ),
        choiceFill(
          unitChoiceHoleId("fighter_weapon_mastery", "weapon_mastery_options"),
          "weapon_longsword",
          "weapon_spear",
          "weapon_flail",
        ),
        choiceFill(
          unitChoiceHoleId(
            "background_soldier",
            "background_ability_score_increase",
          ),
          "two_and_one:str:con",
        ),
        choiceFill(
          unitChoiceHoleId("background_soldier", "background_tool_choice"),
          "tool_dice_set",
        ),
        choiceFill(
          unitChoiceHoleId("class_fighter", "class_equipment_choice"),
          "option_c",
        ),
        choiceFill(
          unitChoiceHoleId("background_soldier", "background_equipment_choice"),
          "option_b",
        ),
      ],
    }),
  );
  const afterPurchase = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterChoices,
      unitLibrary,
      expectedRevision: afterChoices.revision,
      fills: [
        choiceFill(
          unitChoiceHoleId("class_fighter", "equipment_purchase"),
          "armor_chain_mail",
          "weapon_longsword",
          "equipment_shield",
        ),
      ],
    }),
  );
  const completeDraft = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterPurchase,
      unitLibrary,
      expectedRevision: afterPurchase.revision,
      fills: [
        choiceFill(loadoutHoleId("armor_chain_mail", "armor"), "worn"),
        choiceFill(loadoutHoleId("equipment_shield", "shield"), "wielded"),
        choiceFill(
          loadoutHoleId("weapon_longsword", "weapon"),
          "wielded_one_handed",
        ),
      ],
    }),
  );
  const remainingHoles = discoverCreationHoles({
    draft: completeDraft,
    unitLibrary,
  });
  if (remainingHoles.length > 0) {
    throw new Error("Expected lifecycle draft to have no remaining holes.");
  }
  const finalization = finalizeCharacterDraft({
    draft: completeDraft,
    unitLibrary,
  });
  if (finalization.tag !== "ready") {
    throw new Error(`Expected ready build, received ${finalization.tag}.`);
  }
  return finalization.build;
}

function initialManifestFills(): readonly CreationFill[] {
  return [
    choiceFill(
      "cc:draft:draft.progression.initial",
      "13:class_fighter:level_1:maximum_hit_die",
    ),
    choiceFill("cc:draft:draft.background", "background_soldier"),
    choiceFill("cc:draft:draft.species", "species_orc"),
    {
      kind: "abilityScores",
      holeId: draftHoleId("cc:draft:draft.abilityScoreGeneration"),
      method: "standardArray",
      value: abilityScores({
        str: 15,
        dex: 14,
        con: 13,
        int: 8,
        wis: 10,
        cha: 12,
      }),
    },
    choiceFill("cc:draft:draft.languages", "Dwarvish", "Goblin"),
    choiceFill("cc:draft:draft.alignment", "lawful_good"),
  ];
}

function startLifecycleBattle(sheet: CharacterSheet): {
  readonly state: BattleState;
  readonly combatant: CharacterBattleCombatant;
} {
  const characterInit = requireRight(
    characterSheetBattleInit({
      sheet,
      unitLibrary,
      statBlockCatalog,
      combatantId: lifecycleCharacterCombatantId,
      displayName: "Lifecycle Fighter",
      initiative: initiativeScore(10),
      side: battleCombatantSide("party"),
    }),
  );
  const state = requireRight(
    startBattle({
      battleId: battleId("battle:layer-projection-lifecycle"),
      combatants: [
        characterInit,
        battleCreatureInitFromStatBlock({
          combatantId: lifecycleSkeletonCombatantId,
          statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
          initiative: initiativeScore(20),
          side: battleCombatantSide("monsters"),
        }),
      ],
    }),
  );
  const combatant = requireCharacterCombatant(
    state.combatants.get(lifecycleCharacterCombatantId),
  );
  return { state, combatant };
}

function resolveSkeletonShortswordAttack(state: BattleState): BattleState {
  const act = requireSkeletonShortswordAct(state);
  const target = requireHoleFromList(act.initialHoles, "targetChoice");
  const targetFillValue = targetChoiceFill(target, act.subject);
  const attackRoll = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFillValue],
    }),
    "attackRoll",
  );
  const attackRollFillValue = attackRollFill(attackRoll, {
    total: 20,
    naturalD20: 15,
  });
  const damage = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFillValue, attackRollFillValue],
    }),
    "rolledDice",
  );
  const resolved = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      targetFillValue,
      attackRollFillValue,
      rolledDiceFill(damage, [[1]]),
    ],
  });
  if (resolved.tag !== "resolved") {
    throw new Error(
      `Expected resolved Shortsword attack, got ${resolved.tag}.`,
    );
  }
  return resolved.state;
}

function requireSkeletonShortswordAct(state: BattleState): AttackBattleAct {
  const act = discoverBattleActs(state).find(isSkeletonShortswordAttackAct);
  if (act === undefined) {
    throw new Error("Expected Skeleton Shortsword attack act.");
  }
  return act;
}

function isSkeletonShortswordAttackAct(act: BattleAct): act is AttackBattleAct {
  return (
    act.subject.tag === "action" &&
    act.subject.action === "attack" &&
    act.subject.actorId === lifecycleSkeletonCombatantId &&
    act.subject.attackName === "Shortsword"
  );
}

function targetChoiceFill(
  hole: BattleHole,
  subject: AttackBattleSubject,
): BattleFill {
  if (hole.kind !== "targetChoice") {
    throw new Error("Expected targetChoice hole.");
  }
  if (!hole.choices.includes(lifecycleCharacterCombatantId)) {
    throw new Error("Expected lifecycle character to be a target choice.");
  }
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: lifecycleCharacterCombatantId,
    spatialFacts: [
      {
        kind: "attackTargetInMeleeReach",
        actorId: subject.actorId,
        targetId: lifecycleCharacterCombatantId,
        attackName: subject.attackName,
      },
    ],
  };
}

function attackRollFill(
  hole: BattleHole,
  value: { readonly total: number; readonly naturalD20: number },
): BattleFill {
  if (hole.kind !== "attackRoll") {
    throw new Error("Expected attackRoll hole.");
  }
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: {
      total: value.total,
      naturalD20: DieRollResult(value.naturalD20),
    },
  };
}

function rolledDiceFill(
  hole: BattleHole,
  groups: readonly (readonly number[])[],
): BattleFill {
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
): Extract<BattleFill, { readonly kind: "rolledDice" }>["value"] {
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
): Extract<BattleFill, { readonly kind: "rolledDice" }>["value"][number] {
  const [first, ...rest] = group;
  if (first === undefined) {
    throw new Error("Expected at least one die result.");
  }
  return {
    results: [
      DieRollResult(first),
      ...rest.map((dieResult) => DieRollResult(dieResult)),
    ],
  };
}

function lifecycleBuildMaximumHp(build: CharacterBuild): number {
  const hitPoints = requireRight(characterBuildHitPoints(build, unitLibrary));
  return Number(hitPoints.maximum);
}

function abilityScores(
  scores: Parameters<typeof abilityScoreAssignment>[0],
): AbilityScoreAssignment {
  return requireRight(abilityScoreAssignment(scores));
}

function choiceFill(
  holeId: string,
  ...optionIds: readonly string[]
): CreationFill {
  return {
    kind: "choice",
    holeId: draftHoleId(holeId),
    optionIds: optionIds.map(creationChoiceOptionId),
  };
}

function draftHoleId(
  holeId: string,
): NonNullable<ReturnType<typeof parseCreationHoleId>> {
  const parsed = parseCreationHoleId(holeId);
  if (parsed === null) {
    throw new Error(`Expected supported creation hole id: ${holeId}`);
  }
  return parsed;
}

function unitChoiceHoleId(unitId: string, choiceKey: string): string {
  return unitChoiceSourceHoleIdText({
    tag: "unitChoice",
    unitId: requireRight(unitChoiceSourceUnitId(unitId)),
    choiceKey: requireRight(unitChoiceKey(choiceKey)),
  });
}

function loadoutHoleId(equipmentUnitId: string, slot: LoadoutSlot): string {
  return loadoutSourceHoleIdText({
    tag: "loadout",
    equipmentUnitId: requireRight(loadoutEquipmentUnitId(equipmentUnitId)),
    slot,
  });
}

function requireAcceptedBatch(
  result: ReturnType<typeof fillCreationHoles>,
): CharacterDraft {
  if (result.tag !== "accepted") {
    throw new Error(
      `Expected accepted character-creation fill batch, received ${JSON.stringify(result.issues)}`,
    );
  }
  return result.draft;
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

function requireResultHole<K extends BattleHole["kind"]>(
  result: BattleResolutionResult,
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  if (result.tag !== "needsHoles") {
    throw new Error(
      `Expected needsHoles, got ${result.tag}${
        result.tag === "invalid" ? `: ${result.message}` : ""
      }.`,
    );
  }
  return requireHoleFromList(result.holes, kind);
}

function requireCharacterCombatant(
  combatant: BattleCreatureState | undefined,
): CharacterBattleCombatant {
  if (!isCharacterBattleCombatant(combatant)) {
    throw new Error("Expected character-origin battle combatant.");
  }
  return combatant;
}

function isCharacterBattleCombatant(
  combatant: BattleCreatureState | undefined,
): combatant is CharacterBattleCombatant {
  return combatant?.origin.kind === "character";
}

function requireSessionDraft(session: LifecycleSession): CharacterDraft {
  if (session.draft === undefined) {
    throw new Error("Expected lifecycle draft.");
  }
  return session.draft;
}

function requireSessionBuild(session: LifecycleSession): CharacterBuild {
  if (session.build === undefined) {
    throw new Error("Expected lifecycle build.");
  }
  return session.build;
}

function requireSessionBuildSignature(session: LifecycleSession): string {
  if (session.buildSignature === undefined) {
    throw new Error("Expected lifecycle build signature.");
  }
  return session.buildSignature;
}

function requireSessionSheet(session: LifecycleSession): CharacterSheet {
  if (session.sheet === undefined) {
    throw new Error("Expected lifecycle sheet.");
  }
  return session.sheet;
}

function requireSessionBattleState(session: LifecycleSession): BattleState {
  if (session.battleState === undefined) {
    throw new Error("Expected lifecycle battle state.");
  }
  return session.battleState;
}

function requireSessionCombatant(
  session: LifecycleSession,
): CharacterBattleCombatant {
  if (session.characterCombatant === undefined) {
    throw new Error("Expected lifecycle character combatant.");
  }
  return session.characterCombatant;
}

function normalizeLifecycleQuintState(
  raw: unknown,
): CharacterLifecycleProjection {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint lifecycle projection state object.");
  }
  const state: Readonly<Record<string, unknown>> = Object.fromEntries(
    Object.entries(raw),
  );
  return {
    layer: lifecycleLayerField(state["qLayer"]),
    draftHasOpenHoles: booleanField(
      state["qDraftHasOpenHoles"],
      "qDraftHasOpenHoles",
    ),
    buildFinalized: booleanField(state["qBuildFinalized"], "qBuildFinalized"),
    sheetOwnsHitPoints: booleanField(
      state["qSheetOwnsHitPoints"],
      "qSheetOwnsHitPoints",
    ),
    sheetCurrentHp: numberFromQuintInt(
      state["qSheetCurrentHp"],
      "qSheetCurrentHp",
    ),
    sheetMaxHp: numberFromQuintInt(state["qSheetMaxHp"], "qSheetMaxHp"),
    battleInitCharacterCombatant: booleanField(
      state["qBattleInitCharacterCombatant"],
      "qBattleInitCharacterCombatant",
    ),
    battleRuntimeCharacterHp: numberFromQuintInt(
      state["qBattleRuntimeCharacterHp"],
      "qBattleRuntimeCharacterHp",
    ),
    battleRuntimeHpChanged: booleanField(
      state["qBattleRuntimeHpChanged"],
      "qBattleRuntimeHpChanged",
    ),
    settlementCurrentHp: numberFromQuintInt(
      state["qSettlementCurrentHp"],
      "qSettlementCurrentHp",
    ),
    settlementPersistedBattleHp: booleanField(
      state["qSettlementPersistedBattleHp"],
      "qSettlementPersistedBattleHp",
    ),
    buildIdentityUnchanged: booleanField(
      state["qBuildIdentityUnchanged"],
      "qBuildIdentityUnchanged",
    ),
    replayIndex: numberFromQuintInt(state["qReplayIndex"], "qReplayIndex"),
  };
}

function compareLifecycleState(
  runtime: CharacterLifecycleProjection,
  quint: CharacterLifecycleProjection,
): boolean {
  try {
    expect(runtime).toEqual(quint);
  } catch (error) {
    if (error instanceof Error) throw new Error(error.message);
    throw error;
  }
  return true;
}

function lifecycleLayerField(raw: unknown): CharacterLifecycleLayer {
  if (typeof raw === "string" && isLifecycleLayer(raw)) {
    return raw;
  }
  if (
    raw != null &&
    typeof raw === "object" &&
    "tag" in raw &&
    typeof raw.tag === "string" &&
    isLifecycleLayer(raw.tag)
  ) {
    return raw.tag;
  }
  throw new Error(`Unknown lifecycle layer ${String(raw)}.`);
}

function isLifecycleLayer(raw: string): raw is CharacterLifecycleLayer {
  return characterLifecycleLayers.some((layer) => layer === raw);
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}

function booleanField(raw: unknown, field: string): boolean {
  if (typeof raw === "boolean") return raw;
  throw new Error(`Expected Quint boolean field ${field}.`);
}

function requireRight<A, E>(either: Either.Either<A, E>): A {
  if (Either.isRight(either)) return either.right;
  throw new Error(`Expected Either.right, got ${JSON.stringify(either.left)}.`);
}
