// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt B23-FIREBALL-IDENTITY-WITNESS fireball
// UNIT-IDENTITY-MBT-REPLAY: B23-FIREBALL-IDENTITY-WITNESS fireball doDiscoverFireballSaveGatedDamage
import * as path from "node:path";

import type { SpellRecord } from "@dnd/surface/surface/types";
import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { describe, expect, it } from "vitest";

import type { BattleState } from "./index.ts";
import {
  fireballUnitId,
  spellCasterId,
} from "./unit-profile-admission-catalog-support.ts";
import { requireHole } from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  spellAct,
  spellHoleInvocation,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import { spellSlotInvocationRef } from "./unit-profile-admission-test-support.ts";

const fireballSelectedIdentityDriverSchema = {
  init: {},
  doDiscoverFireballSaveGatedDamage: {},
  step: {},
} as const;
type FireballSelectedIdentityDriverAction = Exclude<
  keyof typeof fireballSelectedIdentityDriverSchema,
  "init" | "step"
>;

const fireballSelectedIdentityResults = [
  "init",
  "fireballSaveGatedDamage",
] as const;
type FireballSelectedIdentityResult =
  (typeof fireballSelectedIdentityResults)[number];
type FireballSelectedIdentityProjection = {
  readonly lastResult: FireballSelectedIdentityResult;
};
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly FireballSelectedIdentityDriverAction[];
  readonly expected: FireballSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "B23-FIREBALL-IDENTITY-WITNESS";
  readonly unitId: typeof fireballUnitId;
  readonly actions: readonly FireballSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "B23-FIREBALL-IDENTITY-WITNESS",
    unitId: "fireball",
    actions: ["doDiscoverFireballSaveGatedDamage"],
    sequences: [
      {
        name: "magic-action-selected-fireball-save-gated-damage",
        actions: ["doDiscoverFireballSaveGatedDamage"],
        expected: expectedProjection("fireballSaveGatedDamage"),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Fireball selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions = new Set<FireballSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createFireballSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Fireball selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Fireball selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays Fireball selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-fireball-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createFireballSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: fireballSelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createFireballSelectedIdentityDriver() {
  return defineDriver(fireballSelectedIdentityDriverSchema, () => {
    let projection = expectedProjection("init");

    function reset(): void {
      projection = expectedProjection("init");
    }

    function discoverFireballSaveGatedDamage(): void {
      const spell = spellRecord(fireballUnitId);
      const state = selectedSpellBattle(spell);
      const act = spellAct({
        state,
        spellId: fireballUnitId,
        slotLevel: 3,
      });

      expect(act.subject).toEqual({
        tag: "actionSpell",
        actorId: spellCasterId,
        invocation: spellSlotInvocationRef(
          fireballUnitId,
          3,
          "saveGatedDamage",
        ),
        mode: { tag: "cast" },
      });
      const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
      expect(savingThrow).toEqual(
        expect.objectContaining({
          label: "Fireball point-origin Sphere Saving Throw outcomes",
          ability: "dex",
          dc: { kind: "caster_spell_save_dc" },
        }),
      );
      expect(spellHoleInvocation([savingThrow])).toEqual(
        expect.objectContaining({
          procedure: "saveGatedDamage",
          spell,
          resource: { tag: "spellSlot", slotLevel: 3 },
          ability: "dex",
          targeting: { kind: "pointOriginSphere", radiusFeet: 20 },
          damage: {
            expr: { dice: 8, dieSize: 6 },
            damageType: "fire",
          },
          successDamage: "half",
          rangeFeet: 150,
          postSaveAreaEffect: { kind: "fireballObjectIgnition" },
        }),
      );
      projection = expectedProjection("fireballSaveGatedDamage");
    }

    return {
      init: reset,
      doDiscoverFireballSaveGatedDamage: discoverFireballSaveGatedDamage,
      getState: () => projection,
      step: () => {},
    };
  });
}

function expectedProjection(
  lastResult: FireballSelectedIdentityResult,
): FireballSelectedIdentityProjection {
  return { lastResult };
}

function selectedSpellBattle(spell: SpellRecord): BattleState {
  return spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 3, count: 1 }],
  });
}

function normalizeFireballSelectedIdentityQuintState(
  raw: unknown,
): FireballSelectedIdentityProjection {
  const state = quintStateRecord(raw);
  return {
    lastResult: mbtLastResult(state["qLastResult"]),
  };
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint state record.");
  }
  return Object.fromEntries(Object.entries(raw));
}

function mbtLastResult(
  raw: unknown,
): FireballSelectedIdentityProjection["lastResult"] {
  if (typeof raw === "string" && isFireballSelectedIdentityResult(raw)) {
    return raw;
  }
  throw new Error(`Unexpected Fireball selected identity result ${String(raw)}.`);
}

function isFireballSelectedIdentityResult(
  value: string,
): value is FireballSelectedIdentityResult {
  return fireballSelectedIdentityResults.some((result) => result === value);
}

const fireballSelectedIdentityStateCheck = stateCheck(
  normalizeFireballSelectedIdentityQuintState,
  (
    spec: FireballSelectedIdentityProjection,
    impl: FireballSelectedIdentityProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
