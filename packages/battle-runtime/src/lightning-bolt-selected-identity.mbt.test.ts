// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt B24-LIGHTNING-BOLT-IDENTITY-WITNESS lightning_bolt
// UNIT-IDENTITY-MBT-REPLAY: B24-LIGHTNING-BOLT-IDENTITY-WITNESS lightning_bolt doDiscoverLightningBoltSaveGatedDamage
import * as path from "node:path";

import type { SpellRecord } from "@dnd/surface/surface/types";
import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { describe, expect, it } from "vitest";

import type { BattleState } from "./index.ts";
import {
  lightningBoltUnitId,
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

const lightningBoltSelectedIdentityDriverSchema = {
  init: {},
  doDiscoverLightningBoltSaveGatedDamage: {},
  step: {},
} as const;
type LightningBoltSelectedIdentityDriverAction = Exclude<
  keyof typeof lightningBoltSelectedIdentityDriverSchema,
  "init" | "step"
>;

const lightningBoltSelectedIdentityResults = [
  "init",
  "lightningBoltSaveGatedDamage",
] as const;
type LightningBoltSelectedIdentityResult =
  (typeof lightningBoltSelectedIdentityResults)[number];
type LightningBoltSelectedIdentityProjection = {
  readonly lastResult: LightningBoltSelectedIdentityResult;
};
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly LightningBoltSelectedIdentityDriverAction[];
  readonly expected: LightningBoltSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "B24-LIGHTNING-BOLT-IDENTITY-WITNESS";
  readonly unitId: typeof lightningBoltUnitId;
  readonly actions: readonly LightningBoltSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "B24-LIGHTNING-BOLT-IDENTITY-WITNESS",
    unitId: "lightning_bolt",
    actions: ["doDiscoverLightningBoltSaveGatedDamage"],
    sequences: [
      {
        name: "magic-action-selected-lightning-bolt-save-gated-damage",
        actions: ["doDiscoverLightningBoltSaveGatedDamage"],
        expected: expectedProjection("lightningBoltSaveGatedDamage"),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Lightning Bolt selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<LightningBoltSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createLightningBoltSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Lightning Bolt selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Lightning Bolt selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays Lightning Bolt selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-lightning-bolt-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createLightningBoltSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: lightningBoltSelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createLightningBoltSelectedIdentityDriver() {
  return defineDriver(lightningBoltSelectedIdentityDriverSchema, () => {
    let projection = expectedProjection("init");

    function reset(): void {
      projection = expectedProjection("init");
    }

    function discoverLightningBoltSaveGatedDamage(): void {
      const spell = spellRecord(lightningBoltUnitId);
      const state = selectedSpellBattle(spell);
      const act = spellAct({
        state,
        spellId: lightningBoltUnitId,
        slotLevel: 3,
      });

      expect(act.subject).toEqual({
        tag: "actionSpell",
        actorId: spellCasterId,
        invocation: spellSlotInvocationRef(
          lightningBoltUnitId,
          3,
          "saveGatedDamage",
        ),
        mode: { tag: "cast" },
      });
      const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
      expect(savingThrow).toEqual(
        expect.objectContaining({
          label: "Lightning Bolt self-origin Line Saving Throw outcomes",
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
          targeting: { kind: "selfOriginLine", lengthFeet: 100, widthFeet: 5 },
          damage: {
            expr: { dice: 8, dieSize: 6 },
            damageType: "lightning",
          },
          successDamage: "half",
          rangeFeet: 0,
          failedSavePostDamageRiders: [],
        }),
      );
      projection = expectedProjection("lightningBoltSaveGatedDamage");
    }

    return {
      init: reset,
      doDiscoverLightningBoltSaveGatedDamage:
        discoverLightningBoltSaveGatedDamage,
      getState: () => projection,
      step: () => {},
    };
  });
}

function expectedProjection(
  lastResult: LightningBoltSelectedIdentityResult,
): LightningBoltSelectedIdentityProjection {
  return { lastResult };
}

function selectedSpellBattle(spell: SpellRecord): BattleState {
  return spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 3, count: 1 }],
  });
}

function normalizeLightningBoltSelectedIdentityQuintState(
  raw: unknown,
): LightningBoltSelectedIdentityProjection {
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
): LightningBoltSelectedIdentityProjection["lastResult"] {
  if (typeof raw === "string" && isLightningBoltSelectedIdentityResult(raw)) {
    return raw;
  }
  throw new Error(
    `Unexpected Lightning Bolt selected identity result ${String(raw)}.`,
  );
}

function isLightningBoltSelectedIdentityResult(
  value: string,
): value is LightningBoltSelectedIdentityResult {
  return lightningBoltSelectedIdentityResults.some(
    (result) => result === value,
  );
}

const lightningBoltSelectedIdentityStateCheck = stateCheck(
  normalizeLightningBoltSelectedIdentityQuintState,
  (
    spec: LightningBoltSelectedIdentityProjection,
    impl: LightningBoltSelectedIdentityProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
