import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { decodeUnitRecordSync } from "@dnd/prototype-content-surface/surface/schema";
import type { ActivationPhase } from "@dnd/prototype-content-surface/surface/types";

import { loadAuthoredUnit } from "#/authored-library.ts";
import { projectPhasePrompts } from "#/runtime-holes.ts";

function activationPhase(unitId: string, phaseIndex: number) {
  const unit = loadAuthoredUnit(unitId);
  if (!("mechanics" in unit) || unit.mechanics.family !== "activation") {
    throw new Error(`expected activation unit: ${unitId}`);
  }

  const phase = unit.mechanics.phases[phaseIndex];
  if (phase === undefined) {
    throw new Error(`expected phase ${phaseIndex} for ${unitId}`);
  }

  return phase;
}

function decodeAuthoredUnitUnchecked(unitId: string) {
  const raw = readFileSync(
    join(
      import.meta.dirname,
      "..",
      "..",
      "prototype-content-surface",
      "content",
      `${unitId}.json`,
    ),
    "utf8",
  );
  return decodeUnitRecordSync(JSON.parse(raw));
}

describe("projectPhasePrompts", () => {
  it("returns an empty list for a holeless activation phase", () => {
    expect(projectPhasePrompts(
      activationPhase("fighter_action_surge_l2", 0),
      "activation:0",
    )).toEqual([]);
  });

  it("projects the cure wounds target hole", () => {
    expect(projectPhasePrompts(
      activationPhase("cure_wounds", 0),
      "activation:0",
    )).toEqual([
      {
        promptInstanceKey: "activation:0:surface:cure_wounds_target",
        holeId: "cure_wounds_target",
        kind: "surfaceAttachment",
        label: "healing target",
        attachment: {
          kind: "target",
          selection: { mode: "one" },
        },
      },
    ]);
  });

  it("projects the fireball point-of-explosion hole", () => {
    expect(projectPhasePrompts(
      activationPhase("fireball", 0),
      "activation:0",
    )).toEqual([
      {
        promptInstanceKey: "activation:0:surface:fireball_point",
        holeId: "fireball_point",
        kind: "surfaceAttachment",
        label: "point of explosion",
        attachment: {
          kind: "area",
          origin: { kind: "point_within_range" },
          shape: {
            kind: "sphere",
            radiusFeet: 20,
          },
        },
      },
    ]);
  });

  it("projects chromatic orb current-phase target, attack roll, and damage-type holes", () => {
    const unit = decodeAuthoredUnitUnchecked("chromatic_orb");
    if (!("mechanics" in unit) || unit.mechanics.family !== "activation") {
      throw new Error("expected activation mechanics");
    }
    const phase = unit.mechanics.phases[0];
    if (phase === undefined) {
      throw new Error("expected phase 0 for chromatic_orb");
    }

    expect(projectPhasePrompts(
      phase,
      "activation:0",
    )).toEqual([
      {
        promptInstanceKey: "activation:0:surface:chromatic_orb_primary_target",
        holeId: "chromatic_orb_primary_target",
        kind: "surfaceAttachment",
        label: "primary target",
        attachment: {
          kind: "target",
          selection: { mode: "one" },
        },
      },
      {
        promptInstanceKey: "activation:0:runtime:attackRoll",
        kind: "attackRoll",
        attackKind: "ranged_spell_attack",
      },
      {
        promptInstanceKey: "activation:0:surface:chromatic_orb_damage_type",
        holeId: "chromatic_orb_damage_type",
        kind: "surfaceDamageTypeRef",
        label: "orb type",
        damageTypeRef: {
          kind: "choice",
          label: "orb type",
          options: ["acid", "cold", "fire", "lightning", "poison", "thunder"],
        },
      },
    ]);
  });

  it("can project a later activation phase explicitly", () => {
    const unit = decodeAuthoredUnitUnchecked("scorching_ray");
    if (!("mechanics" in unit) || unit.mechanics.family !== "activation") {
      throw new Error("expected activation mechanics");
    }
    const phase = unit.mechanics.phases[1];
    if (phase === undefined) {
      throw new Error("expected phase 1 for scorching_ray");
    }

    expect(projectPhasePrompts(phase, "activation:1")).toEqual([
      {
        promptInstanceKey: "activation:1:runtime:attackRoll",
        kind: "attackRoll",
        attackKind: "ranged_spell_attack",
      },
    ]);
  });

  it("uses step-scoped prompt instance identity for repeated continuation-style phases", () => {
    const unit = decodeAuthoredUnitUnchecked("chromatic_orb");
    if (!("mechanics" in unit) || unit.mechanics.family !== "activation") {
      throw new Error("expected activation mechanics");
    }

    const phase = unit.mechanics.phases[0];
    if (phase.kind !== "attack_roll" || phase.continue === undefined) {
      throw new Error("expected attack-roll continuation");
    }

    expect(projectPhasePrompts(
      phase.continue.next[0],
      "continuation:1",
    )).toEqual([
      {
        promptInstanceKey: "continuation:1:surface:chromatic_orb_leap_target",
        holeId: "chromatic_orb_leap_target",
        kind: "surfaceAttachment",
        label: "leap target",
        attachment: {
          kind: "target",
          selection: { mode: "one" },
        },
      },
      {
        promptInstanceKey: "continuation:1:runtime:attackRoll",
        kind: "attackRoll",
        attackKind: "ranged_spell_attack",
      },
    ]);
  });

  it("rejects duplicate prompt instance identity within one phase", () => {
    const phase = {
      kind: "direct",
      attachment: { kind: "self" },
      effects: [
        {
          kind: "damage",
          damageType: {
            kind: "hole",
            holeId: "shared",
            value: "fire",
          },
          amount: { kind: "fixed", expr: { dice: 1, dieSize: 6 } },
        },
        {
          kind: "damage",
          damageType: {
            kind: "hole",
            holeId: "shared",
            value: "cold",
          },
          amount: { kind: "fixed", expr: { dice: 1, dieSize: 6 } },
        },
      ],
    } satisfies ActivationPhase;

    expect(() => projectPhasePrompts(phase, "activation:0")).toThrow(
      "duplicate prompt instance key",
    );
  });

  it("rejects gated branch-owned damage-type prompts for now", () => {
    const phase = {
      kind: "save_gate",
      attachment: { kind: "self" },
      ability: "dex",
      dc: { kind: "fixed", dc: 15 },
      onFail: {
        kind: "damage",
        damageType: {
          kind: "hole",
          holeId: "branch_damage_type",
          value: "fire",
        },
        amount: { kind: "fixed", expr: { dice: 1, dieSize: 6 } },
      },
      onSuccess: { kind: "half_damage" },
    } satisfies ActivationPhase;

    expect(() => projectPhasePrompts(phase, "activation:0")).toThrow(
      "unsupported gated damage-type prompt",
    );
  });
});
