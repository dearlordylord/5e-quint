import { describe, expect, test } from "vitest";
import { initiativeOrder } from "@dnd/shared-algebras/initiative-algebra";
import { characterId, combatantId, type CombatantId } from "./identity.ts";
import { unitId } from "@dnd/shared/game-facts";
import type {
  BattleCreatureSnapshot,
  BattleSnapshot,
  BattleState,
  BattleCreatureState,
  BattleActiveEffect,
  BattleTurnResources,
} from "./battle-state-execution.ts";
import type { CharacterProcedureBinding } from "./character-execution-vocabulary.ts";

import { currentActorId } from "./battle-reducer/creature-state-leaves.ts";
import { discoverBattleActCandidatesWithoutSpellProcedures } from "./battle-reducer/battle-discovery.ts";
import { endTurn } from "./battle-execution-composition.ts";
import { snapshotBattle } from "./battle-reducer/battle-snapshot.ts";
import {
  battleId,
  characterSeed,
  fighterVsGoblinBattle,
  goblinId,
  startBattleSessionRight,
  statBlockCreatureInit,
} from "./battle-runtime-test-support.ts";
import { discoverBattleActs } from "./battle-act-composition.ts";
import type { BattleRuntimeContext } from "./battle-runtime-context.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  battleRuntimeContextForTest,
  battleRuntimeSessionForTest,
} from "./battle-runtime-session.test-support.ts";

/**
 * Synthetic-renaming witness for inert authored identity fields.
 *
 * This test demonstrates that the fields classified as "inert" in the #224
 * inventory do not affect reducer-visible mechanical outcomes. It exercises
 * real consumers — act discovery, snapshot production, and the end-of-turn
 * reducer — and compares their outputs. The only differences permitted are the
 * renamed identity fields themselves.
 *
 * Covered inert fields:
 *   - `BattleCreatureState.origin.kind === "character"`: `characterId`, `displayName`
 *   - `BattleCreatureOriginSnapshot.kind === "statBlock"`: `statBlockId`
 *   - Spell presentation source identity (`SpellInvocationRef.spellId` derived
 *     from `BattleRuntimeContext` character spell presentation sources)
 *   - Stat Block presentation source labels (`BattleStatBlockPresentationSource`
 *     display names and procedure labels)
 *
 * Behavior-driving identity fields (e.g. weaponUnitId for mastery, loadout
 * unitId for Wild Shape equipment, paladinSacredWeapon.weaponItemId) are
 * excluded because renaming them currently changes outcomes.
 */

function isCharacterSnapshot(
  snapshot: BattleCreatureSnapshot,
): snapshot is Extract<
  BattleCreatureSnapshot,
  { readonly origin: { readonly kind: "character" } }
> {
  return snapshot.origin.kind === "character";
}

function activeEffectKindCounts(
  effects: readonly BattleActiveEffect[],
): ReadonlyArray<readonly [string, number]> {
  const counts = new Map<string, number>();
  for (const effect of effects) {
    counts.set(effect.kind, (counts.get(effect.kind) ?? 0) + 1);
  }
  return Array.from(counts.entries()).sort(([a], [b]) => a.localeCompare(b));
}

const ACTIVE_EFFECT_IDENTITY_KEYS = new Set<string>([
  "sourceProcedureRef",
  "sourceCombatantId",
  "activeEffectRef",
  "effectRef",
]);

function activeEffectMechanicalProjection(
  effect: BattleActiveEffect,
): Record<string, unknown> {
  const projection: Record<string, unknown> = { kind: effect.kind };
  for (const [key, value] of Object.entries(effect)) {
    if (ACTIVE_EFFECT_IDENTITY_KEYS.has(key)) {
      continue;
    }
    projection[key] = value;
  }
  return projection;
}

function procedureBindingProjection(binding: CharacterProcedureBinding) {
  // Include the full procedure payload; the procedureRef is an execution key,
  // not an authored identity field, and is identical between original and
  // renamed states for this witness.
  return {
    procedureRef: binding.procedureRef,
    procedure: binding.procedure,
  };
}

function turnResourcesProjection(turnResources: BattleTurnResources) {
  // Include the full turn resources; none of these fields are the authored
  // identity fields being renamed.
  return { ...turnResources };
}

function combatantMechanicalProjection(combatant: BattleCreatureState) {
  return {
    hp: Number(combatant.hp),
    maxHp: Number(combatant.maxHp),
    tempHp: Number(combatant.tempHp),
    armorClass: combatant.armorClass,
    size: combatant.size,
    movementSpentFeet: Number(combatant.movementSpentFeet),
    reactionAvailable: combatant.reactionAvailable,
    conditions: combatant.conditions,
    activeEffectMechanicalProjections: combatant.activeEffects.map(
      activeEffectMechanicalProjection,
    ),
    activeEffectKindCounts: activeEffectKindCounts(combatant.activeEffects),
    concentration: combatant.concentration,
    hidden: combatant.hidden !== null,
    dodging: combatant.dodging,
    ...(combatant.origin.kind === "character"
      ? {
          procedureBindings: combatant.origin.execution.procedureBindings.map(
            procedureBindingProjection,
          ),
          characterResources: combatant.origin.resources,
          spellcasting: combatant.origin.spellcasting,
          druidWildShapeAvailableForms:
            combatant.origin.druidWildShapeAvailableForms,
        }
      : {}),
  };
}

function stateMechanicalProjection(state: BattleState) {
  const combatants = new Map<
    CombatantId,
    ReturnType<typeof combatantMechanicalProjection>
  >(
    Array.from(state.combatants.entries()).map(([id, combatant]) => [
      id,
      combatantMechanicalProjection(combatant),
    ]),
  );
  return {
    initiativeOrder: initiativeOrder(state.initiative),
    combatants,
    executionScopeCursors: Array.from(state.executionScopeCursors.entries()),
    companions: state.companions,
    objectOutlines: state.objectOutlines,
    lightEmitters: state.lightEmitters,
    turnResources: turnResourcesProjection(state.currentTurnResources),
    readiedSpells: Array.from(state.readiedSpells.entries()),
    readiedMovements: Array.from(state.readiedMovements.entries()),
    helpAttacks: state.helpAttacks,
    grapples: state.grapples,
    interruptStack: state.interruptStack,
    legendaryActionWindow: state.legendaryActionWindow,
  };
}

function snapshotCombatantMechanicalProjection(
  combatant: BattleCreatureSnapshot,
) {
  return {
    combatantId: combatant.combatantId,
    initiative: combatant.initiative,
    hp: Number(combatant.hp),
    maxHp: Number(combatant.maxHp),
    tempHp: Number(combatant.tempHp),
    nextActiveEffectOrdinal: combatant.nextActiveEffectOrdinal,
    activeEffectRefs: combatant.activeEffectRefs,
    armorClass: combatant.armorClass,
    size: combatant.size,
    zeroHpLifecycle: combatant.zeroHpLifecycle,
    conditions: combatant.conditions,
    concentrating: combatant.concentrating,
    dodging: combatant.dodging,
    reactionAvailable: combatant.reactionAvailable,
    movement: combatant.movement,
    origin: snapshotOriginMechanicalProjection(combatant.origin),
  };
}

function snapshotOriginMechanicalProjection(
  origin: BattleCreatureSnapshot["origin"],
) {
  if (origin.kind === "character") {
    const { characterId: _characterId, ...rest } = origin;
    return rest;
  }
  const { statBlockId: _statBlockId, ...rest } = origin;
  return rest;
}

function snapshotMechanicalProjection(snapshot: BattleSnapshot) {
  return {
    battleId: snapshot.battleId,
    executionScopeCursors: snapshot.executionScopeCursors,
    retiredExecutionScopeAllocations: snapshot.retiredExecutionScopeAllocations,
    round: snapshot.round,
    currentActorId: snapshot.currentActorId,
    turnOrder: snapshot.turnOrder,
    combatants: snapshot.combatants.map((combatant) =>
      snapshotCombatantMechanicalProjection(combatant),
    ),
    companions: snapshot.companions,
    lightEmitters: snapshot.lightEmitters,
    obscurementZones: snapshot.obscurementZones,
    acts: snapshot.acts,
    turn: snapshot.turn,
    readiedResponses: snapshot.readiedResponses,
  };
}

function snapshotIdentityProjection(snapshot: BattleSnapshot) {
  return snapshot.combatants.map((combatant) => ({
    combatantId: combatant.combatantId,
    originKind: combatant.origin.kind,
    characterId:
      combatant.origin.kind === "character"
        ? combatant.origin.characterId
        : undefined,
    statBlockId:
      combatant.origin.kind === "statBlock"
        ? combatant.origin.statBlockId
        : undefined,
  }));
}

function actExecutionProjection(state: BattleState) {
  return discoverBattleActCandidatesWithoutSpellProcedures(state).map(
    (act) => ({
      subject: act.subject,
      initialHoles: act.initialHoles,
    }),
  );
}

function renameInertIdentityFields(state: BattleState): BattleState {
  const syntheticCharacterId = characterId("synthetic-character-id-witness");
  const syntheticDisplayName = "Synthetic Witness Name";

  const renamedCombatants = new Map(
    Array.from(state.combatants.entries()).map(([id, combatant]) => {
      if (combatant.origin.kind !== "character") {
        return [id, combatant];
      }
      return [
        id,
        {
          ...combatant,
          origin: {
            ...combatant.origin,
            characterId: syntheticCharacterId,
            displayName: syntheticDisplayName,
          },
        },
      ];
    }),
  );

  return { ...state, combatants: renamedCombatants };
}

function renameSnapshotInertIdentityFields(
  snapshot: BattleSnapshot,
): BattleSnapshot {
  const syntheticStatBlockId = "synthetic-stat-block-id-witness";

  return {
    ...snapshot,
    combatants: snapshot.combatants.map((combatant) => {
      if (combatant.origin.kind !== "statBlock") {
        return combatant;
      }
      return {
        ...combatant,
        origin: {
          ...combatant.origin,
          statBlockId: syntheticStatBlockId,
        },
      };
    }),
  };
}

function renameContextInertIdentityFields(
  context: BattleRuntimeContext,
): BattleRuntimeContext {
  const syntheticSpellId = "synthetic-spell-id-witness";
  const syntheticSpellName = "Synthetic Spell";
  const syntheticStatBlockDisplayName = "Synthetic Stat Block";
  const syntheticProcedureLabel = "Synthetic Procedure";

  const characters = new Map(
    Array.from(context.characters.entries()).map(([id, character]) => [
      id,
      {
        ...character,
        spellPresentationSources: character.spellPresentationSources.map(
          (source) => ({
            ...source,
            invocation: {
              ...source.invocation,
              spell: {
                ...source.invocation.spell,
                id: unitId(syntheticSpellId),
                name: syntheticSpellName,
              },
            },
          }),
        ),
      },
    ]),
  );

  const statBlocks = new Map(
    Array.from(context.statBlocks.entries()).map(([id, source]) => [
      id,
      {
        ...source,
        displayName: syntheticStatBlockDisplayName,
        procedures: source.procedures.map((procedure) => ({
          ...procedure,
          ...(procedure.kind === "attack"
            ? { name: syntheticProcedureLabel }
            : { label: syntheticProcedureLabel }),
        })),
      },
    ]),
  );

  return battleRuntimeContextForTest(characters, statBlocks);
}

describe("inert authored identity renaming witness (#224)", () => {
  test("renaming characterId and displayName does not change discovery, snapshot mechanics, or state mechanics", () => {
    const state = fighterVsGoblinBattle();
    const renamed = renameInertIdentityFields(state);

    expect(stateMechanicalProjection(renamed)).toEqual(
      stateMechanicalProjection(state),
    );
    expect(snapshotMechanicalProjection(snapshotBattle(renamed))).toEqual(
      snapshotMechanicalProjection(snapshotBattle(state)),
    );
    expect(actExecutionProjection(renamed)).toEqual(
      actExecutionProjection(state),
    );
  });

  test("renaming characterId and displayName changes only those identity fields in the snapshot", () => {
    const state = fighterVsGoblinBattle();
    const originalSnapshot = snapshotBattle(state);
    const renamedSnapshot = snapshotBattle(renameInertIdentityFields(state));

    expect(snapshotMechanicalProjection(renamedSnapshot)).toEqual(
      snapshotMechanicalProjection(originalSnapshot),
    );

    const fighterOriginal = originalSnapshot.combatants.find(
      (c) => c.combatantId === combatantId("fighter"),
    );
    const fighterRenamed = renamedSnapshot.combatants.find(
      (c) => c.combatantId === combatantId("fighter"),
    );
    expect(fighterOriginal?.origin.kind).toBe("character");
    expect(fighterRenamed?.origin.kind).toBe("character");
    if (fighterRenamed === undefined || !isCharacterSnapshot(fighterRenamed)) {
      return;
    }
    expect(fighterRenamed.origin.characterId).toBe(
      characterId("synthetic-character-id-witness"),
    );
    expect(fighterRenamed.displayName).toBe("Synthetic Witness Name");
  });

  test("renaming snapshot statBlockId does not change snapshot mechanics", () => {
    const state = fighterVsGoblinBattle();
    const snapshot = snapshotBattle(state);
    const renamedSnapshot = renameSnapshotInertIdentityFields(snapshot);

    expect(snapshotIdentityProjection(renamedSnapshot)).not.toEqual(
      snapshotIdentityProjection(snapshot),
    );
    expect(snapshotMechanicalProjection(renamedSnapshot)).toEqual(
      snapshotMechanicalProjection(snapshot),
    );

    const goblinRenamed = renamedSnapshot.combatants.find(
      (c) => c.combatantId === combatantId("goblin"),
    );
    expect(goblinRenamed?.origin.kind).toBe("statBlock");
    if (goblinRenamed?.origin.kind !== "statBlock") return;
    expect(goblinRenamed.origin.statBlockId).toBe(
      "synthetic-stat-block-id-witness",
    );
  });

  test("renaming characterId and displayName does not change reducer transitions", () => {
    const state = fighterVsGoblinBattle();
    const renamed = renameInertIdentityFields(state);
    const actorId = currentActorId(state);

    const originalResult = endTurn({ state, actorId });
    const renamedResult = endTurn({ state: renamed, actorId });

    expect(originalResult.tag).toBe("resolved");
    expect(renamedResult.tag).toBe("resolved");
    if (originalResult.tag !== "resolved" || renamedResult.tag !== "resolved") {
      return;
    }

    expect(stateMechanicalProjection(renamedResult.state)).toEqual(
      stateMechanicalProjection(originalResult.state),
    );
    expect(snapshotMechanicalProjection(renamedResult.snapshot)).toEqual(
      snapshotMechanicalProjection(originalResult.snapshot),
    );
  });

  test("the state witness actually mutates the inert fields", () => {
    const state = fighterVsGoblinBattle();
    const fighter = state.combatants.get(combatantId("fighter"));
    expect(fighter?.origin.kind).toBe("character");
    if (fighter?.origin.kind !== "character") return;

    const renamed = renameInertIdentityFields(state);
    const renamedFighter = renamed.combatants.get(combatantId("fighter"));
    expect(renamedFighter?.origin.kind).toBe("character");
    if (renamedFighter?.origin.kind !== "character") return;

    expect(renamedFighter.origin.characterId).toBe(
      characterId("synthetic-character-id-witness"),
    );
    expect(renamedFighter.origin.displayName).toBe("Synthetic Witness Name");
  });

  test("renaming spell presentation source identity does not change spell act execution structure", () => {
    const session = spellBattle({
      preparedSpells: [spellRecord("magic_missile")],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });

    const renamedContext = renameContextInertIdentityFields(session.context);
    const renamedSession = battleRuntimeSessionForTest({
      state: session.state,
      context: renamedContext,
    });

    const originalActs = discoverBattleActs(session);
    const renamedActs = discoverBattleActs(renamedSession);

    const executionProjection = (acts: typeof originalActs) =>
      acts.map((act) => ({
        subject: act.subject,
        initialHoles: act.initialHoles,
        label: act.label,
        summary: act.summary,
      }));

    // Execution structure (subjects and holes) must be identical.
    expect(
      renamedActs.map((act) => ({
        subject: act.subject,
        initialHoles: act.initialHoles,
      })),
    ).toEqual(
      originalActs.map((act) => ({
        subject: act.subject,
        initialHoles: act.initialHoles,
      })),
    );

    // Presentation labels must differ because the spell presentation source identity changed.
    expect(executionProjection(renamedActs)).not.toEqual(
      executionProjection(originalActs),
    );

    // The spell act's presentation carries the synthetic identity from the context source.
    const renamedSpellAct = renamedActs.find(
      (act) => act.presentation.kind === "spell",
    );
    expect(renamedSpellAct).toBeDefined();
    if (renamedSpellAct?.presentation.kind !== "spell") return;
    expect(renamedSpellAct.presentation.invocation.spellId).toBe(
      "synthetic-spell-id-witness",
    );
  });

  test("renaming Stat Block presentation labels does not change stat block act execution structure", () => {
    const session = startBattleSessionRight({
      battleId: battleId("stat-block-witness"),
      combatants: [
        statBlockCreatureInit({ combatantId: goblinId, initiative: 20 }),
        characterSeed({ initiative: 10 }),
      ],
    });

    const renamedContext = renameContextInertIdentityFields(session.context);
    const renamedSession = battleRuntimeSessionForTest({
      state: session.state,
      context: renamedContext,
    });

    const originalActs = discoverBattleActs(session);
    const renamedActs = discoverBattleActs(renamedSession);

    const executionProjection = (acts: typeof originalActs) =>
      acts.map((act) => ({
        subject: act.subject,
        initialHoles: act.initialHoles,
        label: act.label,
        summary: act.summary,
      }));

    // Execution structure (subjects and holes) must be identical.
    expect(
      renamedActs.map((act) => ({
        subject: act.subject,
        initialHoles: act.initialHoles,
      })),
    ).toEqual(
      originalActs.map((act) => ({
        subject: act.subject,
        initialHoles: act.initialHoles,
      })),
    );

    // Presentation labels must differ because Stat Block display name and procedure labels changed.
    expect(executionProjection(renamedActs)).not.toEqual(
      executionProjection(originalActs),
    );

    // The Stat Block act's presentation carries the renamed procedure label.
    const renamedStatBlockAct = renamedActs.find(
      (act) => act.presentation.kind === "attack",
    );
    expect(renamedStatBlockAct).toBeDefined();
    if (renamedStatBlockAct?.presentation.kind !== "attack") {
      return;
    }
    expect(renamedStatBlockAct.label + renamedStatBlockAct.summary).toContain(
      "Synthetic Procedure",
    );
  });
});
