// RAW-COVERAGE: verification-owner:runtime-test RAW-STAT-BLOCK-SPELL-INVOCATION-UNRESTRICTED-001
// KERNEL-COVERAGE: parity-witness BATTLE.STAT_BLOCK.SPELL_INVOCATION_UNRESTRICTED
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test stat-block.spell-invocation.unrestricted
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-flaming-sphere-hazard-ram
import type { StatBlockRecord } from "@dnd/surface/surface/stat-block-types";
import { statBlockId, unitId } from "@dnd/shared/game-facts";
import { Result } from "effect";
import { expect, it } from "vitest";
import {
  startBattle,
  discoverBattleActs,
  resolveBattleSubject,
} from "./index.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { battleId, combatantId } from "./identity.ts";
import {
  statBlockRecord,
  statBlockCreatureInit,
  unitLibrary,
} from "./battle-runtime.test-support.ts";
import { syntheticSpellcastingProcedureEntry } from "./stat-block-spellcasting-procedure.test-support.ts";
import {
  damageRollFillWithGroups,
  requireResultHole,
  requireHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  flamingSphereRamAct,
  flamingSphereRamMovementFill,
  singleTargetSavingThrowOutcomeFill,
  flamingSphereAreaFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { boundPersistentAreaSaveDamageEffect } from "./battle-reducer/persistent-area-save-damage-binding.ts";

it("retains a Stat Block persistent area owner after a source-backed public cast", () => {
  const base = statBlockRecord();
  const entry = syntheticSpellcastingProcedureEntry();
  const group = entry.procedure.groups.find(
    (candidate) => candidate.kind === "at_will",
  );
  if (group?.kind !== "at_will") throw new Error("Expected at-will fixture.");
  const actorId = combatantId("synthetic-persistent-area-caster");
  const targetId = combatantId("persistent-area-target");
  const record: StatBlockRecord = {
    ...base,
    id: statBlockId("synthetic_persistent_area_caster"),
    name: "Synthetic Persistent Area Caster",
    provenance: {
      kind: "synthetic-test" as const,
      section: "persistent area ownership",
    },
    statBlock: {
      ...base.statBlock,
      actions: [
        {
          ...entry,
          procedure: {
            ...entry.procedure,
            groups: [
              { ...group, spells: [{ spellId: unitId("flaming_sphere") }] },
            ],
          },
        },
      ],
    },
  };
  const started = startBattle({
    battleId: battleId("stat-block-persistent-area-owner"),
    combatants: [
      {
        ...statBlockCreatureInit({
          combatantId: actorId,
          initiative: 20,
          statBlock: record,
        }),
        unitCatalog: unitLibrary,
      },
      statBlockCreatureInit({ combatantId: targetId, initiative: 10 }),
    ],
  });
  if (Result.isFailure(started)) throw new Error("Expected parent admission.");
  const session = battleRuntimeSessionForTest(started.success);
  const act = discoverBattleActs(session).find(
    (candidate) =>
      battleActSpellPresentation(candidate)?.invocation.spellId ===
      "flaming_sphere",
  );
  expect(act).toBeDefined();
  if (act === undefined) throw new Error("Expected executable area spell.");
  const cast = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [
      flamingSphereAreaFill(requireHole(act.initialHoles, "spellAreaChoice")),
    ],
  });
  expect(cast.tag).toBe("resolved");
  if (cast.tag !== "resolved")
    throw new Error("Expected persistent area cast.");
  const owner = cast.state.combatants.get(actorId);
  if (owner === undefined) throw new Error("Expected caster.");
  const effect = owner.activeEffects.find(
    (candidate) => candidate.kind === "persistentAreaSaveDamage",
  );
  expect(effect).toBeDefined();
  if (effect?.kind !== "persistentAreaSaveDamage")
    throw new Error("Expected persistent area effect.");
  expect(boundPersistentAreaSaveDamageEffect(owner, effect)).toBeDefined();
  const ram = flamingSphereRamAct(
    battleRuntimeSessionForTest({ ...session, state: cast.state }),
    actorId,
    targetId,
  );
  const movement = flamingSphereRamMovementFill(
    requireHole(ram.initialHoles, "movableZoneRamMovement"),
  );
  const save = singleTargetSavingThrowOutcomeFill(
    requireHole(ram.initialHoles, "savingThrowOutcome"),
    targetId,
    true,
  );
  const needsDamage = resolveBattleSubject({
    state: cast.state,
    subject: ram.subject,
    fills: [movement, save],
  });
  const damage = requireResultHole(needsDamage, "rolledDice");
  const resolved = resolveBattleSubject({
    state: cast.state,
    subject: ram.subject,
    fills: [movement, save, damageRollFillWithGroups(damage, [[3, 3]])],
  });
  expect(resolved.tag).toBe("resolved");
  if (resolved.tag !== "resolved")
    throw new Error("Expected ongoing sphere ram.");
  expect(resolved.state.currentTurnResources.currentHasBonusAction).toBe(false);
  expect(Number(resolved.state.combatants.get(targetId)?.hp)).toBe(
    Number(cast.state.combatants.get(targetId)?.hp) - 3,
  );
  expect(resolved.state.combatants.get(actorId)?.origin).toEqual(owner.origin);
});
