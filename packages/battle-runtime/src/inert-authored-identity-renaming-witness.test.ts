import { describe, expect, test } from "vitest";
import { initiativeOrder } from "@dnd/shared-algebras/initiative-algebra";
import { characterId, combatantId, type CombatantId } from "./identity.ts";
import { statBlockId, unitId } from "@dnd/shared/game-facts";
import type {
  BattleCreatureSnapshot,
  BattleSnapshot,
  BattleState,
  BattleCreatureState,
  BattleActiveEffect,
  BattleTurnResources,
} from "./battle-state-execution.ts";
import { currentActorId } from "./battle-reducer/creature-state-leaves.ts";
import { discoverBattleActCandidatesWithoutSpellProcedures } from "./battle-reducer/battle-discovery.ts";
import { endTurn } from "./battle-execution-composition.ts";
import { snapshotBattle } from "./battle-reducer/battle-snapshot.ts";
import {
  battleId,
  characterSeed,
  fighterVsGoblinBattle,
  goblinId,
  resolveBattleSubject,
  startBattleSessionRight,
  statBlockCatalog,
  statBlockCreatureInit,
  unitLibrary,
} from "./battle-runtime.test-support.ts";
import { discoverBattleActs } from "./battle-act-composition.ts";
import type { BattleRuntimeContext } from "./battle-runtime-context.ts";
import type { BattleDruidWildShapeKnownForm } from "./druid-wild-shape-known-form-execution.ts";
import type { StatBlockExecutionAdmission } from "./stat-block-execution-state.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  battleRuntimeContextForTest,
  battleRuntimeSessionForTest,
} from "./battle-runtime-session.test-support.ts";
import type { BattleFill, BattleHole, BattleSubject } from "./index.ts";

/**
 * Synthetic-renaming witness for inert authored identity fields.
 *
 * This test demonstrates that the fields classified as inert authored identity
 * do not affect reducer-visible mechanical outcomes. It exercises real
 * consumers — act discovery, snapshot production, and the end-of-turn reducer —
 * and compares their outputs using full mechanical payloads: combatant state
 * (including zero-HP lifecycle and hidden-state prerequisites), active effects,
 * resources, procedure bindings, attacks, loadout, class levels, snapshot state,
 * and turn resources. The only differences permitted are the renamed identity
 * fields themselves.
 *
 * Renamed inert fields:
 *   - `BattleCreatureState.origin.kind === "character"`: `characterId`
 *   - `BattleCreatureOriginSnapshot.kind === "statBlock"`: `statBlockId`
 *   - Spell presentation source identity (`AuthoredSelectedSpellInvocation.spell.id`
 *     and `spell.name` derived from `BattleRuntimeContext` character spell
 *     presentation sources)
 *   - Stat Block presentation source labels (`BattleStatBlockPresentationSource`
 *     display names and procedure labels)
 *
 * Excluded fields:
 *   - Authored Unit identity such as `weaponUnitId` used at composition time for
 *     Weapon Mastery / Tactical Master eligibility. These are admitted as
 *     parsed mechanical facts (`hasWeaponMastery`) and are identical between
 *     original and renamed states; the underlying Unit ids are not renamed by
 *     this witness because doing so would change which mechanical facts are
 *     admitted at composition time.
 *   - Other composition-boundary authored identity not renamed by this witness
 *     (e.g., Stat Block form ids retained in character battle state and used to
 *     admit a specific Wild Shape form). Renaming those would select a different
 *     admitted form and therefore change reducer mechanics; they are inventory
 *     composition boundaries. The separate presentation-only
 *     `BattleActPresentation.formStatBlockId` is covered by its own dedicated
 *     witness below.
 */

function isCharacterSnapshot(
  snapshot: BattleCreatureSnapshot,
): snapshot is Extract<
  BattleCreatureSnapshot,
  { readonly origin: { readonly kind: "character" } }
> {
  return snapshot.origin.kind === "character";
}

function activeEffectMechanicalProjection(
  effect: BattleActiveEffect,
): BattleActiveEffect {
  // Include the full active-effect payload. Execution references such as
  // sourceProcedureRef / sourceCombatantId / activeEffectRef are not authored
  // identity and are identical between original and renamed states.
  return effect;
}

function turnResourcesProjection(turnResources: BattleTurnResources) {
  // Include the full turn resources; none of these fields are the authored
  // identity fields being renamed.
  return { ...turnResources };
}

function wildShapeAvailableFormsMechanicalProjection(
  forms:
    | readonly StatBlockExecutionAdmission<BattleDruidWildShapeKnownForm>[]
    | undefined,
) {
  if (forms === undefined) return undefined;
  // Strip composition/selection identity from each admitted form. After
  // admission it is mechanically inert; mechanical facts (support profile, AC,
  // size, speeds, procedures) remain compared.
  return forms.map((admission) => {
    const { id: _id, ...statBlockWithoutId } = admission.statBlock;
    const { displayName: _displayName, ...innerStatBlockWithoutDisplayName } =
      statBlockWithoutId.statBlock;
    return {
      ...admission,
      statBlock: {
        ...statBlockWithoutId,
        statBlock: innerStatBlockWithoutDisplayName,
      },
    };
  });
}

function combatantMechanicalProjection(combatant: BattleCreatureState) {
  const base = {
    combatantId: combatant.combatantId,
    initiative: combatant.initiative,
    hp: Number(combatant.hp),
    maxHp: Number(combatant.maxHp),
    tempHp: Number(combatant.tempHp),
    positiveHpUnconscious: combatant.positiveHpUnconscious,
    armorClass: combatant.armorClass,
    size: combatant.size,
    movementSpentFeet: Number(combatant.movementSpentFeet),
    reactionAvailable: combatant.reactionAvailable,
    conditions: combatant.conditions,
    activeEffects: combatant.activeEffects.map(
      activeEffectMechanicalProjection,
    ),
    activeOngoingFeatureOccurrences: Array.from(
      combatant.activeOngoingFeatureOccurrences.entries(),
    ),
    attackRollMissToHitReplacementsUsedSinceTurnStart:
      combatant.attackRollMissToHitReplacementsUsedSinceTurnStart,
    concentration: combatant.concentration,
    hidden: combatant.hidden,
    dodging: combatant.dodging,
    zeroHpLifecycle: combatant.zeroHpLifecycle,
  };
  if (combatant.origin.kind !== "character") {
    return {
      ...base,
      origin: {
        kind: combatant.origin.kind,
        mechanics: combatant.origin.mechanics,
        execution: combatant.origin.execution,
      },
    };
  }
  return {
    ...base,
    origin: {
      kind: combatant.origin.kind,
      execution: combatant.origin.execution,
      classLevels: combatant.origin.classLevels,
      knownLanguages: combatant.origin.knownLanguages,
      d20Statistics: combatant.origin.d20Statistics,
      weaponProficiencies: combatant.origin.weaponProficiencies,
      selectedLoadout: combatant.origin.selectedLoadout,
      invocationFeatures: combatant.origin.invocationFeatures,
      speed: combatant.origin.speed,
      attack: combatant.origin.attack,
      unarmedStrike: combatant.origin.unarmedStrike,
      offHandAttack: combatant.origin.offHandAttack,
      resources: combatant.origin.resources,
      metamagic: combatant.origin.metamagic,
      spellcasting: combatant.origin.spellcasting,
      druidWildShapeAvailableForms: wildShapeAvailableFormsMechanicalProjection(
        combatant.origin.druidWildShapeAvailableForms,
      ),
    },
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
    battleId: state.battleId,
    initiativeOrder: initiativeOrder(state.initiative),
    combatants,
    executionScopeCursors: Array.from(state.executionScopeCursors.entries()),
    companions: state.companions,
    objectOutlines: state.objectOutlines,
    lightEmitters: state.lightEmitters,
    hidePrerequisites: Array.from(state.hidePrerequisites.entries()),
    turnResources: turnResourcesProjection(state.currentTurnResources),
    readiedSpells: Array.from(state.readiedSpells.entries()),
    readiedResponses: Array.from(state.readiedResponses.entries()),
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
    return {
      ...rest,
      druidWildShapeAvailableForms: origin.druidWildShapeAvailableForms.map(
        (form) => {
          const { statBlockId: _statBlockId, ...formRest } = form;
          return formRest;
        },
      ),
    };
  }
  const { statBlockId: _statBlockId, ...rest } = origin;
  return rest;
}

function snapshotMechanicalProjection(snapshot: BattleSnapshot) {
  return {
    battleId: snapshot.battleId,
    round: snapshot.round,
    currentActorId: snapshot.currentActorId,
    turnOrder: snapshot.turnOrder,
    combatants: snapshot.combatants.map((combatant) =>
      snapshotCombatantMechanicalProjection(combatant),
    ),
    companions: snapshot.companions,
    lightEmitters: snapshot.lightEmitters,
    obscurementZones: snapshot.obscurementZones,
    turn: snapshot.turn,
    readiedResponses: snapshot.readiedResponses,
    helpAttackMarkers: snapshot.helpAttackMarkers,
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

function wildShapeFormAdmissionWithRenamedPresentationIdentity(
  admission: StatBlockExecutionAdmission<BattleDruidWildShapeKnownForm>,
  id: ReturnType<typeof statBlockId>,
  displayName: string,
): StatBlockExecutionAdmission<BattleDruidWildShapeKnownForm> {
  // Only composition/selection identity (`statBlock.id` and nested
  // `statBlock.statBlock.displayName`) is rewritten. After admission it is
  // mechanically inert; mechanical facts and eligibility remain identical, so
  // no type assertions are required.
  return {
    ...admission,
    statBlock: {
      ...admission.statBlock,
      id,
      statBlock: {
        ...admission.statBlock.statBlock,
        displayName,
      },
    },
  };
}

function requireWildShapeEquipmentDispositionHole(
  holes: readonly BattleHole[],
): Extract<BattleHole, { readonly kind: "wildShapeEquipmentDisposition" }> {
  const hole = holes.find(
    (
      candidate,
    ): candidate is Extract<
      BattleHole,
      { readonly kind: "wildShapeEquipmentDisposition" }
    > => candidate.kind === "wildShapeEquipmentDisposition",
  );
  if (hole === undefined) {
    throw new Error("Expected Wild Shape equipment disposition hole.");
  }
  return hole;
}

function wildShapeEquipmentDispositionFill(
  hole: Extract<BattleHole, { readonly kind: "wildShapeEquipmentDisposition" }>,
): Extract<BattleFill, { readonly kind: "wildShapeEquipmentDisposition" }> {
  return {
    kind: "wildShapeEquipmentDisposition",
    holeId: hole.holeId,
    value: {
      formLimbs: { kind: "cannotHandleObjects" },
      choices: [],
    },
  };
}

function resolveDruidWildShapeWithoutLoadoutEquipment(
  state: BattleState,
  subject: Extract<BattleSubject, { readonly tag: "druidWildShape" }>,
) {
  const needsDisposition = resolveBattleSubject({ state, subject, fills: [] });
  if (needsDisposition.tag !== "needsHoles") {
    throw new Error("Expected Wild Shape equipment disposition hole.");
  }
  const hole = requireWildShapeEquipmentDispositionHole(needsDisposition.holes);
  return resolveBattleSubject({
    state,
    subject,
    fills: [wildShapeEquipmentDispositionFill(hole)],
  });
}

function renameFormStatBlockIdPresentationFields(
  state: BattleState,
): BattleState {
  const syntheticFormStatBlockId = statBlockId(
    "synthetic-form-stat-block-id-witness",
  );
  const syntheticFormDisplayName = "Synthetic Form";

  const renamedCombatants = new Map(
    Array.from(state.combatants.entries()).map(([id, combatant]) => {
      if (
        combatant.origin.kind !== "character" ||
        combatant.origin.druidWildShapeAvailableForms === undefined ||
        combatant.origin.druidWildShapeAvailableForms.length === 0
      ) {
        return [id, combatant];
      }
      const renamedForms = combatant.origin.druidWildShapeAvailableForms.map(
        (admission) =>
          wildShapeFormAdmissionWithRenamedPresentationIdentity(
            admission,
            syntheticFormStatBlockId,
            syntheticFormDisplayName,
          ),
      );
      return [
        id,
        {
          ...combatant,
          origin: {
            ...combatant.origin,
            druidWildShapeAvailableForms: renamedForms,
          },
        },
      ];
    }),
  );

  return { ...state, combatants: renamedCombatants };
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

  test("renaming characterId changes only that identity field in the snapshot", () => {
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
    expect(fighterRenamed).not.toHaveProperty("displayName");
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

  test("the state witness actually mutates the inert identity field", () => {
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

  test("renaming BattleActPresentation.formStatBlockId does not change Wild Shape act execution structure", () => {
    const druidCombatantId = combatantId("form-id-witness-druid");
    const session = startBattleSessionRight({
      battleId: battleId("form-id-witness"),
      combatants: [
        characterSeed({
          combatantId: druidCombatantId,
          displayName: "Druid",
          initiative: 20,
          classLevels: [{ className: "druid", level: 2 }],
          resources: [{ unit: unitLibrary.requireUnit("druid_wild_shape") }],
          selectedLoadout: {},
          attack: null,
          druidWildShapeAvailableForms: [
            statBlockCatalog.requireStatBlock("stat_block_cat"),
          ],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });

    const renamedState = renameFormStatBlockIdPresentationFields(session.state);
    const renamedSession = battleRuntimeSessionForTest({
      state: renamedState,
      context: session.context,
    });

    const originalActs = discoverBattleActs(session);
    const renamedActs = discoverBattleActs(renamedSession);

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

    // Presentation labels must differ because the form display name changed.
    const labelProjection = (acts: typeof originalActs) =>
      acts.map((act) => ({
        label: act.label,
        summary: act.summary,
      }));
    expect(labelProjection(renamedActs)).not.toEqual(
      labelProjection(originalActs),
    );

    const originalFormAct = originalActs.find(
      (act) => act.presentation.kind === "druidWildShapeForm",
    );
    const renamedFormAct = renamedActs.find(
      (act) => act.presentation.kind === "druidWildShapeForm",
    );
    expect(originalFormAct).toBeDefined();
    expect(renamedFormAct).toBeDefined();
    if (
      originalFormAct?.presentation.kind !== "druidWildShapeForm" ||
      renamedFormAct?.presentation.kind !== "druidWildShapeForm"
    ) {
      return;
    }

    if (
      originalFormAct.subject.tag !== "druidWildShape" ||
      renamedFormAct.subject.tag !== "druidWildShape"
    ) {
      throw new Error("Expected Wild Shape subject.");
    }

    // formExecutionRef is unchanged; only the presentation identity and label changed.
    expect(renamedFormAct.presentation.formExecutionRef).toBe(
      originalFormAct.presentation.formExecutionRef,
    );
    expect(renamedFormAct.presentation.formStatBlockId).toBe(
      statBlockId("synthetic-form-stat-block-id-witness"),
    );
    expect(renamedFormAct.label + renamedFormAct.summary).toContain(
      "Synthetic Form",
    );

    // Resolving the Wild Shape act in both sessions produces identical mechanical
    // state, proving the renamed presentation identity does not alter reducer
    // behavior.
    const originalResolved = resolveDruidWildShapeWithoutLoadoutEquipment(
      session.state,
      originalFormAct.subject,
    );
    const renamedResolved = resolveDruidWildShapeWithoutLoadoutEquipment(
      renamedSession.state,
      renamedFormAct.subject,
    );
    expect(originalResolved.tag).toBe("resolved");
    expect(renamedResolved.tag).toBe("resolved");
    if (
      originalResolved.tag !== "resolved" ||
      renamedResolved.tag !== "resolved"
    ) {
      return;
    }
    expect(stateMechanicalProjection(renamedResolved.state)).toEqual(
      stateMechanicalProjection(originalResolved.state),
    );
    expect(
      snapshotMechanicalProjection(snapshotBattle(renamedResolved.state)),
    ).toEqual(
      snapshotMechanicalProjection(snapshotBattle(originalResolved.state)),
    );
  });
});
