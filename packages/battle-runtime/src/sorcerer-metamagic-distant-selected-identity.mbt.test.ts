// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.metamagic-cast-range-increase
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L3MMETA-15-DISTANT-OBJECT-LIGHT sorcerer_metamagic
// UNIT-IDENTITY-MBT-REPLAY: L3MMETA-15-DISTANT-OBJECT-LIGHT sorcerer_metamagic doResolveDistantObjectLight
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.METAMAGIC_DISTANT_CAST_RANGE_INCREASE
// RAW trace:
// - .references/srd-5.2.1/Classes/Sorcerer.md#Distant Spell: Touch range
//   becomes 30 feet for the selected cast and spends 1 Sorcery Point.
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Light: the object
//   emits Bright Light 20 feet plus Dim Light for 20 more feet.
import * as path from "node:path";

import { resourceCount } from "@dnd/shared/types";

import { DISTANT_METAMAGIC_EFFECT_KIND } from "./battle-reducer/metamagic.ts";
import {
  characterBattleResourceIsPointPool,
  type CharacterBattleMetamagicOptionFact,
  type CharacterBattlePointPoolResourceState,
} from "./character-battle-resources.ts";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import {
  lightUnitId,
  spellCasterId,
  unitLibrary,
} from "./unit-profile-admission-catalog-support.ts";
import { requireHole } from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  spellDistantObjectLightTargetFill,
  spellAct,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  battleObjectId,
  discoverBattleActs,
  movementFeet,
  resolveBattleSubject,
  type BattleState,
} from "./unit-profile-admission-test-support.ts";

type DistantObjectLightProjection = {
  readonly sorceryPointsRemaining: number;
  readonly lightEmitterCount: number;
  readonly brightRadiusFeet: number;
  readonly dimAdditionalFeet: number;
  readonly lastResult: "init" | "distantObjectLight";
};

defineSelectedIdentityWitness({
  describeLabel: "Sorcerer Distant Spell object-light selected identity MBT",
  taskId: "L3MMETA-15-DISTANT-OBJECT-LIGHT",
  specFile: path.resolve(
    import.meta.dirname,
    "../battle-runtime-sorcerer-metamagic-distant-selected-identity.mbt.qnt",
  ),
  projectionSchema: {
    sorceryPointsRemaining: "int",
    lightEmitterCount: "int",
    brightRadiusFeet: "int",
    dimAdditionalFeet: "int",
    lastResult: "str",
  },
  initialProjection: {
    sorceryPointsRemaining: 2,
    lightEmitterCount: 0,
    brightRadiusFeet: 0,
    dimAdditionalFeet: 0,
    lastResult: "init",
  },
  units: [
    {
      unitId: "sorcerer_metamagic",
      procedures: [
        {
          actionName: "doResolveDistantObjectLight",
          projectionAfter: {
            sorceryPointsRemaining: 1,
            lightEmitterCount: 1,
            brightRadiusFeet: 20,
            dimAdditionalFeet: 20,
            lastResult: "distantObjectLight",
          },
          discover: () =>
            distantObjectLightProjection(resolveDistantObjectLight()),
        },
      ],
    },
  ],
});

function resolveDistantObjectLight(): BattleState {
  const spell = spellRecord(lightUnitId);
  const state = spellBattle({
    cantrips: [spell],
    casterClassLevels: [{ className: "sorcerer", level: 2 }],
    casterResources: [
      {
        unit: unitLibrary.requireUnit("sorcerer_font_of_magic"),
        pointsRemaining: resourceCount(2),
      },
    ],
    casterMetamagic: {
      sorceryPointResourceUnitId: "sorcerer_font_of_magic",
      spellUseLimit: "one_per_spell_unless_option_allows_stacking",
      knownOptions: [distantMetamagicOption()],
    },
  });
  spellAct({ state, spellId: lightUnitId });
  const distantAct = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.spellId === lightUnitId &&
      candidate.subject.invocation.procedure === "objectLight" &&
      candidate.subject.metamagic?.some(
        (selection) => selection.effectKind === DISTANT_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (distantAct === undefined || distantAct.subject.tag !== "actionSpell") {
    throw new Error("Expected Distant Light spell act.");
  }
  const resolved = resolveBattleSubject({
    state,
    subject: distantAct.subject,
    fills: [
      spellDistantObjectLightTargetFill({
        hole: requireHole(distantAct.initialHoles, "objectTargetChoice"),
        objectId: battleObjectId("selected-identity-distant-light"),
        spellId: lightUnitId,
        casterId: spellCasterId,
        rangeFeet: movementFeet(30),
      }),
    ],
  });
  if (resolved.tag !== "resolved") {
    throw new Error(`Expected Distant Light to resolve, got ${resolved.tag}.`);
  }
  return resolved.state;
}

function distantMetamagicOption(): CharacterBattleMetamagicOptionFact {
  return {
    effectKind: DISTANT_METAMAGIC_EFFECT_KIND,
    stackingMode: "one_per_spell",
    sorceryPointCost: resourceCount(1),
  };
}

function distantObjectLightProjection(
  state: BattleState,
): DistantObjectLightProjection {
  const emitter = state.lightEmitters[0];
  const caster = state.combatants.get(spellCasterId);
  const sorceryPointResource =
    caster?.origin.kind === "character"
      ? caster.origin.resources.find(
          (candidate): candidate is CharacterBattlePointPoolResourceState =>
            candidate.unit.id === "sorcerer_font_of_magic" &&
            characterBattleResourceIsPointPool(candidate),
        )
      : undefined;
  const sorceryPointsRemaining =
    sorceryPointResource === undefined
      ? 0
      : Number(sorceryPointResource.pointsRemaining);
  return {
    sorceryPointsRemaining,
    lightEmitterCount: state.lightEmitters.length,
    brightRadiusFeet:
      emitter?.emission.kind === "brightAndDim"
        ? Number(emitter.emission.brightRadiusFeet)
        : 0,
    dimAdditionalFeet:
      emitter?.emission.kind === "brightAndDim"
        ? Number(emitter.emission.dimAdditionalFeet)
        : 0,
    lastResult: "distantObjectLight",
  };
}
