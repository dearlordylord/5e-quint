// RAW-COVERAGE: runtime-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.passive-ability-check-roll-mode unit-feature.passive-damage-resistance unit-feature.passive-saving-throw-roll-mode
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L3MSPEC-11-SPECIES-SELECTED-IDENTITY-AUDIT species_dragonborn_damage_resistance dwarf_dwarven_resilience species_goliath_powerful_build
// UNIT-IDENTITY-MBT-REPLAY: L3MSPEC-11-SPECIES-SELECTED-IDENTITY-AUDIT species_dragonborn_damage_resistance doDragonbornDamageResistance
// UNIT-IDENTITY-MBT-REPLAY: L3MSPEC-11-SPECIES-SELECTED-IDENTITY-AUDIT dwarf_dwarven_resilience doDwarvenResilience
// UNIT-IDENTITY-MBT-REPLAY: L3MSPEC-11-SPECIES-SELECTED-IDENTITY-AUDIT species_goliath_powerful_build doGoliathPowerfulBuild
import * as path from "node:path";

import { decodeSpeciesRecordSync } from "@dnd/surface/surface/schema";
import * as Either from "effect/Either";

import speciesDragonbornInput from "../../surface/content/species_dragonborn.json";
import { damageAmountAfterTargetAdjustments } from "./battle-reducer/damage-helpers.ts";
import { savingThrowRollModeProjections } from "./battle-reducer/spells-damage-fills.ts";
import {
  battleId,
  combatantId,
  endTurn,
  resolveBattleSubject,
  startBattle,
  type BattleState,
} from "./index.ts";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import {
  dwarfDwarvenResilienceUnitId,
  oppositionSide,
  partySide,
  speciesDragonbornDamageResistanceUnitId,
  unitLibrary,
} from "./unit-profile-admission-catalog-support.ts";
import { characterCreature } from "./unit-profile-admission-creature-fixture-support.ts";
import { battleUnitRefWithSupportProfiles } from "./unit-profile-admission-test-support.ts";
import {
  grappleOutcomeFill,
  requireHole,
  requireResolved,
  targetFill,
} from "./battle-runtime-test-support.ts";

const speciesGoliathPowerfulBuildUnitId = "species_goliath_powerful_build";
const dragonbornSpeciesRecord = decodeSpeciesRecordSync(speciesDragonbornInput);
if (dragonbornSpeciesRecord.species !== "dragonborn") {
  throw new Error("Expected Dragonborn species source record.");
}
const selectedDraconicAncestry =
  dragonbornSpeciesRecord.draconicAncestry.damageType.options.find(
    (option) => option.id === "red",
  );
if (selectedDraconicAncestry === undefined) {
  throw new Error("Expected Red Draconic Ancestry source option.");
}
const draconicAncestrySourceFacts = {
  draconicAncestryDamageType: selectedDraconicAncestry.damageType,
} as const;

type SpeciesPassiveTraitLastResult =
  | "init"
  | "dragonbornDamageResistance"
  | "dwarvenResilience"
  | "goliathPowerfulBuild";
type ProjectedRollMode = "advantage" | "disadvantage" | "normal";
type SpeciesPassiveTraitProjection = {
  readonly dragonbornFireDamageAfter: number;
  readonly dragonbornColdDamageAfter: number;
  readonly dwarfPoisonDamageAfter: number;
  readonly dwarfFireDamageAfter: number;
  readonly dwarfPoisonedSaveAdvantage: boolean;
  readonly dwarfCharmedSaveAdvantage: boolean;
  readonly goliathEscapeRollMode: ProjectedRollMode;
  readonly goliathPoisonedEscapeRollMode: ProjectedRollMode;
  readonly lastResult: SpeciesPassiveTraitLastResult;
};

defineSelectedIdentityWitness({
  describeLabel: "Species passive trait selected identity MBT",
  taskId: "L3MSPEC-11-SPECIES-SELECTED-IDENTITY-AUDIT",
  specFile: path.resolve(
    import.meta.dirname,
    "../battle-runtime-species-passive-trait-selected-identity.mbt.qnt",
  ),
  projectionSchema: {
    dragonbornFireDamageAfter: "int",
    dragonbornColdDamageAfter: "int",
    dwarfPoisonDamageAfter: "int",
    dwarfFireDamageAfter: "int",
    dwarfPoisonedSaveAdvantage: "bool",
    dwarfCharmedSaveAdvantage: "bool",
    goliathEscapeRollMode: "str",
    goliathPoisonedEscapeRollMode: "str",
    lastResult: "str",
  },
  initialProjection: expectedProjection(),
  units: [
    {
      unitId: speciesDragonbornDamageResistanceUnitId,
      procedures: [
        {
          actionName: "doDragonbornDamageResistance",
          projectionAfter: expectedProjection({
            dragonbornFireDamageAfter: 4,
            lastResult: "dragonbornDamageResistance",
          }),
          discover: () =>
            projectDragonbornDamageResistance(
              dragonbornDamageResistanceBattle(),
            ),
        },
      ],
    },
    {
      unitId: dwarfDwarvenResilienceUnitId,
      procedures: [
        {
          actionName: "doDwarvenResilience",
          projectionAfter: expectedProjection({
            dwarfPoisonDamageAfter: 4,
            dwarfPoisonedSaveAdvantage: true,
            lastResult: "dwarvenResilience",
          }),
          discover: () => projectDwarvenResilience(dwarvenResilienceBattle()),
        },
      ],
    },
    {
      unitId: speciesGoliathPowerfulBuildUnitId,
      procedures: [
        {
          actionName: "doGoliathPowerfulBuild",
          projectionAfter: expectedProjection({
            goliathEscapeRollMode: "advantage",
            lastResult: "goliathPowerfulBuild",
          }),
          discover: () => ({
            ...expectedProjection({
              goliathEscapeRollMode: escapeGrappleRollMode({
                selected: true,
              }),
              goliathPoisonedEscapeRollMode: escapeGrappleRollMode({
                selected: true,
                poisoned: true,
              }),
              lastResult: "goliathPowerfulBuild",
            }),
          }),
        },
      ],
    },
  ],
});

function expectedProjection(
  overrides: Partial<SpeciesPassiveTraitProjection> = {},
): SpeciesPassiveTraitProjection {
  return {
    dragonbornFireDamageAfter: 9,
    dragonbornColdDamageAfter: 9,
    dwarfPoisonDamageAfter: 9,
    dwarfFireDamageAfter: 9,
    dwarfPoisonedSaveAdvantage: false,
    dwarfCharmedSaveAdvantage: false,
    goliathEscapeRollMode: "normal",
    goliathPoisonedEscapeRollMode: "normal",
    lastResult: "init",
    ...overrides,
  };
}

function dragonbornDamageResistanceBattle(): BattleState {
  const unit = unitLibrary.requireUnit(speciesDragonbornDamageResistanceUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
    sourceFacts: draconicAncestrySourceFacts,
  });
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  const targetId = combatantId("species-passive-dragonborn-target");
  const result = startBattle({
    battleId: battleId("species-passive-dragonborn-resistance"),
    combatants: [
      characterCreature({
        combatantId: targetId,
        displayName: "Dragonborn Target",
        initiative: 10,
        side: partySide,
        characterUnitRefs: [unitRef.right],
      }),
      characterCreature({
        combatantId: combatantId("species-passive-dragonborn-attacker"),
        displayName: "Attacker",
        initiative: 5,
        side: oppositionSide,
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function projectDragonbornDamageResistance(
  state: BattleState,
): SpeciesPassiveTraitProjection {
  const target = state.combatants.get(
    combatantId("species-passive-dragonborn-target"),
  );
  if (target === undefined) {
    throw new Error("Expected Dragonborn target combatant.");
  }
  return expectedProjection({
    dragonbornFireDamageAfter: damageAmountAfterTargetAdjustments(
      target,
      9,
      "fire",
    ),
    dragonbornColdDamageAfter: damageAmountAfterTargetAdjustments(
      target,
      9,
      "cold",
    ),
    lastResult: "dragonbornDamageResistance",
  });
}

function dwarvenResilienceBattle(): BattleState {
  const unit = unitLibrary.requireUnit(dwarfDwarvenResilienceUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  const targetId = combatantId("species-passive-dwarf-target");
  const result = startBattle({
    battleId: battleId("species-passive-dwarven-resilience"),
    combatants: [
      characterCreature({
        combatantId: targetId,
        displayName: "Dwarf Target",
        initiative: 10,
        side: partySide,
        unitFeatures: [{ unit }],
        characterUnitRefs: [unitRef.right],
      }),
      characterCreature({
        combatantId: combatantId("species-passive-dwarf-attacker"),
        displayName: "Attacker",
        initiative: 5,
        side: oppositionSide,
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function projectDwarvenResilience(
  state: BattleState,
): SpeciesPassiveTraitProjection {
  const targetId = combatantId("species-passive-dwarf-target");
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    throw new Error("Expected Dwarven Resilience target combatant.");
  }
  const poisonedSaveTargets = savingThrowRollModeProjections(state, "con", {
    condition: "poisoned",
  }).map((projection) => projection.targetId);
  const charmedSaveTargets = savingThrowRollModeProjections(state, "con", {
    condition: "charmed",
  }).map((projection) => projection.targetId);
  return expectedProjection({
    dwarfPoisonDamageAfter: damageAmountAfterTargetAdjustments(
      target,
      9,
      "poison",
    ),
    dwarfFireDamageAfter: damageAmountAfterTargetAdjustments(target, 9, "fire"),
    dwarfPoisonedSaveAdvantage: poisonedSaveTargets.includes(targetId),
    dwarfCharmedSaveAdvantage: charmedSaveTargets.includes(targetId),
    lastResult: "dwarvenResilience",
  });
}

function escapeGrappleRollMode(input: {
  readonly selected: boolean;
  readonly poisoned?: boolean;
}): ProjectedRollMode {
  const unit = unitLibrary.requireUnit(speciesGoliathPowerfulBuildUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  const actorId = combatantId(
    input.poisoned === true
      ? "species-passive-poisoned-goliath"
      : "species-passive-goliath",
  );
  const grapplerId = combatantId(
    input.poisoned === true
      ? "species-passive-poisoned-grappler"
      : "species-passive-grappler",
  );
  const state = startBattle({
    battleId: battleId(
      input.poisoned === true
        ? "species-passive-poisoned-goliath-grapple"
        : "species-passive-goliath-grapple",
    ),
    combatants: [
      characterCreature({
        combatantId: grapplerId,
        displayName: "Grappler",
        initiative: 12,
        side: oppositionSide,
      }),
      characterCreature({
        combatantId: actorId,
        displayName: "Goliath Target",
        initiative: 10,
        side: partySide,
        characterUnitRefs: input.selected ? [unitRef.right] : [],
        unitFeatures: [{ unit }],
        conditions: input.poisoned === true ? ["poisoned"] : [],
      }),
    ],
  });
  if (Either.isLeft(state)) {
    throw new Error(state.left.message);
  }
  const grappleSubject = {
    tag: "action",
    actorId: grapplerId,
    action: "grapple",
  } as const;
  const target = requireHole(
    resolveBattleSubject({
      state: state.right,
      subject: grappleSubject,
      fills: [],
    }),
    "targetChoice",
  );
  const targetChoice = targetFill(target, actorId, [
    { kind: "grappleTargetWithinReach", grapplerId, targetId: actorId },
  ]);
  const outcome = requireHole(
    resolveBattleSubject({
      state: state.right,
      subject: grappleSubject,
      fills: [targetChoice],
    }),
    "grappleOutcome",
  );
  const grappled = requireResolved(
    resolveBattleSubject({
      state: state.right,
      subject: grappleSubject,
      fills: [targetChoice, grappleOutcomeFill(outcome, false)],
    }),
  );
  const actorTurn = requireResolved(
    endTurn({ state: grappled.state, actorId: grapplerId }),
  ).state;
  const escape = requireHole(
    resolveBattleSubject({
      state: actorTurn,
      subject: { tag: "action", actorId, action: "escapeGrapple" },
      fills: [],
    }),
    "grappleOutcome",
  );
  if (escape.kind !== "grappleOutcome") {
    throw new Error("Expected Escape Grapple outcome hole.");
  }
  return escape.rollMode ?? "normal";
}
