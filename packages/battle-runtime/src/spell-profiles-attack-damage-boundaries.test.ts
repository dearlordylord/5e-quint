import { unitId as parseUnitId } from "@dnd/shared/game-facts";
import { proficiencyBonus } from "@dnd/shared/types";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Match } from "effect";
import { describe, expect, test } from "vitest";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { combatantId } from "./identity.ts";
import {
  battleId,
  characterSeed,
  discoverBattleActs,
  skeletonCreatureInit,
  startBattleSessionRight,
  spellRecord,
  testCharacterD20Statistics,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";

type ActivationMechanics = Extract<
  SpellRecord["mechanics"],
  { readonly family: "activation" }
>;
type AttackRollPhase = Extract<
  ActivationMechanics["phases"][number],
  { readonly kind: "attack_roll" }
>;
type DamageEffect = Extract<
  AttackRollPhase["onHit"][number],
  { readonly kind: "damage" }
>;
type SaveGatePhase = Extract<
  ActivationMechanics["phases"][number],
  { readonly kind: "save_gate" }
>;
type HoleAttachment = Extract<
  SaveGatePhase["attachment"],
  { readonly kind: "hole" }
>;

type SpellAccess = "cantrip" | "prepared";
type ActivationFixture = {
  readonly base: SpellRecord;
  readonly phase: AttackRollPhase;
};
type BoundaryCase = {
  readonly name: string;
  readonly control: SpellRecord;
  readonly spell: SpellRecord;
  readonly spellAccess: SpellAccess;
};
type CasterKind = "warlock" | "wizard";
const syntheticCasterId = combatantId("synthetic-spell-caster");

function boundaryCase(
  name: string,
  spell: SpellRecord,
  spellAccess: SpellAccess,
  control: SpellRecord,
): BoundaryCase {
  return { control, name, spell, spellAccess };
}

function syntheticActivationSpell(
  base: SpellRecord,
  id: string,
  mutate: (mechanics: ActivationMechanics) => unknown,
): SpellRecord {
  if (base.mechanics.family !== "activation") {
    throw new Error("Expected an activation spell fixture.");
  }
  const decoded = decodeUnitRecordSync({
    ...base,
    id: parseUnitId(id),
    name: `Synthetic attack-damage boundary ${id}`,
    provenance: {
      kind: "synthetic-test",
      section: `battle-runtime attack-damage boundary ${id}`,
    },
    mechanics: mutate(base.mechanics),
  });
  if (decoded.kind !== "spell") {
    throw new Error("Expected synthetic attack-damage boundary spell.");
  }
  return decoded;
}

function attackPhase(mechanics: ActivationMechanics): AttackRollPhase {
  const phase = mechanics.phases[0];
  if (phase?.kind !== "attack_roll") {
    throw new Error("Expected an attack-roll phase.");
  }
  return phase;
}

function saveGatePhase(mechanics: ActivationMechanics): SaveGatePhase {
  const phase = mechanics.phases[1];
  if (phase?.kind !== "save_gate") {
    throw new Error("Expected a save-gate phase.");
  }
  return phase;
}

function holeAttachment(phase: SaveGatePhase): HoleAttachment {
  const attachment = phase.attachment;
  if (attachment.kind !== "hole") {
    throw new Error("Expected a hole attachment.");
  }
  return attachment;
}

function activationFixture(spellId: string): ActivationFixture {
  const base = spellRecord(spellId);
  if (base.mechanics.family !== "activation") {
    throw new Error("Expected an activation spell fixture.");
  }
  return { base, phase: attackPhase(base.mechanics) };
}

function damageEffect(phase: AttackRollPhase): DamageEffect {
  const damage = phase.onHit[0];
  if (damage?.kind !== "damage") {
    throw new Error("Expected an attack damage effect.");
  }
  return damage;
}

function mutateAttackPhase(
  fixture: ActivationFixture,
  id: string,
  mutate: (phase: AttackRollPhase) => AttackRollPhase,
): SpellRecord {
  return syntheticActivationSpell(fixture.base, id, (mechanics) => ({
    ...mechanics,
    phases: [mutate(attackPhase(mechanics)), ...mechanics.phases.slice(1)],
  }));
}

function rejectAttackPhase(
  fixture: ActivationFixture,
  name: string,
  id: string,
  spellAccess: SpellAccess,
  mutate: (phase: AttackRollPhase) => AttackRollPhase,
  control: SpellRecord = fixture.base,
): BoundaryCase {
  return boundaryCase(
    name,
    mutateAttackPhase(fixture, id, mutate),
    spellAccess,
    control,
  );
}

function rejectActivation(
  fixture: ActivationFixture,
  name: string,
  id: string,
  spellAccess: SpellAccess,
  mutate: (mechanics: ActivationMechanics) => unknown,
  control: SpellRecord = fixture.base,
): BoundaryCase {
  return boundaryCase(
    name,
    syntheticActivationSpell(fixture.base, id, mutate),
    spellAccess,
    control,
  );
}

function warlockSpellcasting(
  input?: Parameters<typeof wizardSpellcasting>[0],
): ReturnType<typeof wizardSpellcasting> {
  return {
    ...wizardSpellcasting(input),
    proficiencyBonus: proficiencyBonus(3),
    sourceClassName: "warlock",
  };
}

function casterFixture(casterKind: CasterKind) {
  return Match.value(casterKind).pipe(
    Match.when("warlock", () => ({
      classLevels: [{ className: "warlock", level: 5 }] as const,
      d20Statistics: testCharacterD20Statistics({ cha: 16 }),
      spellcasting: warlockSpellcasting({
        spellSlots: [{ spellLevel: 3, count: 2 }],
      }),
    })),
    Match.when("wizard", () => ({
      classLevels: [{ className: "wizard", level: 3 }] as const,
      d20Statistics: testCharacterD20Statistics({ int: 16 }),
      spellcasting: wizardSpellcasting({
        spellSlots: [
          { spellLevel: 1, count: 1 },
          { spellLevel: 2, count: 1 },
        ],
      }),
    })),
    Match.exhaustive,
  );
}

function spellLists(record: SpellRecord, spellAccess: SpellAccess) {
  return Match.value(spellAccess).pipe(
    Match.when("cantrip", () => ({ cantrips: [record], preparedSpells: [] })),
    Match.when("prepared", () => ({ cantrips: [], preparedSpells: [record] })),
    Match.exhaustive,
  );
}

function spellSession(
  record: SpellRecord,
  spellAccess: SpellAccess,
  casterKind: CasterKind,
) {
  const caster = casterFixture(casterKind);
  return startBattleSessionRight({
    battleId: battleId(
      `attack-damage-boundary-${casterKind}-${String(record.id)}`,
    ),
    combatants: [
      characterSeed({
        ...caster,
        combatantId: syntheticCasterId,
        displayName: "Synthetic Attack-Damage Caster",
        initiative: 20,
        attack: null,
        spellcasting: {
          ...caster.spellcasting,
          ...spellLists(record, spellAccess),
        },
      }),
      skeletonCreatureInit({ initiative: 10 }),
    ],
  });
}

function actionSpellForRecord(
  session: ReturnType<typeof spellSession>,
  record: SpellRecord,
) {
  return discoverBattleActs(session).find(
    (candidate) =>
      candidate.subject.tag === "actionSpell" &&
      battleActSpellPresentation(candidate)?.invocation.spellId ===
        String(record.id),
  );
}

function expectNoActionSpell(
  boundary: BoundaryCase,
  casterKind: CasterKind,
): void {
  expect(
    actionSpellForRecord(
      spellSession(boundary.control, boundary.spellAccess, casterKind),
      boundary.control,
    ),
  ).toBeDefined();
  expect(
    actionSpellForRecord(
      spellSession(boundary.spell, boundary.spellAccess, casterKind),
      boundary.spell,
    ),
  ).toBeUndefined();
}

function expectAttackBurstActionSpell(record: SpellRecord): void {
  const session = spellSession(record, "prepared", "wizard");
  const act = actionSpellForRecord(session, record);
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error("Expected the synthetic attack-burst action spell.");
  }
  expect(battleActSpellPresentation(act)?.invocation.spellId).toBe(
    String(record.id),
  );
  expect(battleActSpellPresentation(act)?.invocation.procedure).toBe(
    "attackBurstSaveDamage",
  );
}

function rayOfFrostBoundaryCases(): readonly BoundaryCase[] {
  const fixture = activationFixture("ray_of_frost");
  const { phase } = fixture;
  const damage = damageEffect(phase);
  return [
    rejectAttackPhase(
      fixture,
      "rejects a non-decreasing Speed rider",
      "synthetic-ray-frost-positive-speed",
      "cantrip",
      (phase) => ({
        ...phase,
        onHit: [damage, { kind: "modify_speed", delta: 10, unit: "feet" }],
      }),
    ),
    rejectAttackPhase(
      fixture,
      "rejects an unsupported post-damage effect",
      "synthetic-ray-frost-unsupported-rider",
      "cantrip",
      (phase) => ({
        ...phase,
        onHit: [...phase.onHit, { kind: "set_speed", feet: 10 }],
      }),
    ),
    rejectActivation(
      fixture,
      "rejects an unsupported slot-scaled damage amount",
      "synthetic-ray-frost-slot-amount",
      "prepared",
      (mechanics) => ({
        ...mechanics,
        level: 1,
        phases: [
          {
            ...attackPhase(mechanics),
            onHit: [
              {
                ...damageEffect(attackPhase(mechanics)),
                amount: {
                  kind: "linear_per_level",
                  axis: "slot",
                  startingAtLevel: 4,
                  base: { dice: 1, dieSize: 8 },
                  perLevel: { dice: 1 },
                },
              },
            ],
          },
        ],
      }),
      spellRecord("guiding_bolt"),
    ),
  ];
}

function fireBoltBoundaryCases(): readonly BoundaryCase[] {
  const fixture = activationFixture("fire_bolt");
  const { phase } = fixture;
  const damage = damageEffect(phase);
  return [
    rejectAttackPhase(
      fixture,
      "rejects an unsupported miss effect",
      "synthetic-fire-bolt-miss-damage",
      "cantrip",
      (phase) => ({
        ...phase,
        onMiss: [{ kind: "damage", amount: damage.amount, damageType: "fire" }],
      }),
    ),
    rejectAttackPhase(
      fixture,
      "rejects an object target that leaves ignition as an unknown rider",
      "synthetic-fire-bolt-object-rider",
      "cantrip",
      (phase) => ({
        ...phase,
        attachment:
          phase.attachment.kind === "hole"
            ? {
                ...phase.attachment,
                value: {
                  ...phase.attachment.value,
                  selection: { mode: "one", targetKinds: ["creature"] },
                },
              }
            : phase.attachment,
      }),
    ),
    rejectAttackPhase(
      fixture,
      "rejects a non-damage first hit effect",
      "synthetic-fire-bolt-first-effect",
      "cantrip",
      (phase) => ({
        ...phase,
        onHit: [
          {
            kind: "ignite_objects",
            filter: {
              material: "flammable",
              targetRelation: "not_worn_or_carried",
            },
          },
        ],
      }),
    ),
    rejectAttackPhase(
      fixture,
      "rejects an unsupported damage target kind",
      "synthetic-fire-bolt-object-only",
      "cantrip",
      (phase) => ({
        ...phase,
        attachment:
          phase.attachment.kind === "hole"
            ? {
                ...phase.attachment,
                value: {
                  ...phase.attachment.value,
                  selection: { mode: "one", targetKinds: ["object"] },
                },
              }
            : phase.attachment,
      }),
    ),
  ];
}

function acidArrowBoundaryCases(): readonly BoundaryCase[] {
  const fixture = activationFixture("acid_arrow");
  const { phase } = fixture;
  const [initialDamage, laterDamage] = phase.onHit;
  if (
    initialDamage?.kind !== "damage" ||
    laterDamage?.kind !== "damage" ||
    laterDamage.timing !== "end_of_next_turn"
  ) {
    throw new Error("Expected Acid Arrow initial and later damage.");
  }
  return [
    rejectAttackPhase(
      fixture,
      "rejects two later damage effects",
      "synthetic-acid-arrow-two-later-damages",
      "prepared",
      (phase) => ({
        ...phase,
        onHit: [initialDamage, laterDamage, { ...laterDamage }],
      }),
    ),
    rejectAttackPhase(
      fixture,
      "rejects a later damage type mismatch",
      "synthetic-acid-arrow-mismatched-later-type",
      "prepared",
      (phase) => ({
        ...phase,
        onHit: [initialDamage, { ...laterDamage, damageType: "cold" }],
      }),
    ),
  ];
}

function scorchingRayBoundaryCase(): BoundaryCase {
  const fixture = activationFixture("scorching_ray");
  const damage = damageEffect(fixture.phase);
  return rejectAttackPhase(
    fixture,
    "rejects an unsupported Scorching Ray damage amount",
    "synthetic-scorching-ray-unsupported-amount",
    "prepared",
    (phase) => ({
      ...phase,
      onHit: [
        {
          ...damage,
          amount: {
            kind: "linear_per_level",
            axis: "slot",
            startingAtLevel: 4,
            base: { dice: 2, dieSize: 6 },
            perLevel: { dice: 1 },
          },
        },
      ],
    }),
  );
}

function chromaticOrbBoundaryCase(): BoundaryCase {
  const fixture = activationFixture("chromatic_orb");
  const { phase } = fixture;
  const continuation = phase.continue;
  const leapPhase =
    continuation?.kind === "repeat" ? continuation.next[0] : undefined;
  const leapDamage =
    leapPhase?.kind === "attack_roll" ? leapPhase.onHit[0] : undefined;
  if (
    continuation?.kind !== "repeat" ||
    leapPhase?.kind !== "attack_roll" ||
    leapDamage?.kind !== "damage" ||
    leapDamage.amount.kind !== "linear_per_level"
  ) {
    throw new Error("Expected Chromatic Orb chained damage.");
  }
  const leapAmount = leapDamage.amount;
  return rejectAttackPhase(
    fixture,
    "rejects mismatched Chromatic Orb chained dice",
    "synthetic-chromatic-orb-mismatched-dice",
    "prepared",
    (phase) => ({
      ...phase,
      continue: {
        ...continuation,
        next: [
          {
            ...leapPhase,
            onHit: [
              {
                ...leapDamage,
                amount: {
                  ...leapAmount,
                  base: { ...leapAmount.base, dice: 4 },
                },
              },
            ],
          },
        ],
      },
    }),
  );
}

function iceKnifeBoundaryCases(): {
  readonly rejected: readonly BoundaryCase[];
  readonly admittedDirectEmanation: SpellRecord;
} {
  const fixture = activationFixture("ice_knife");
  const { base } = fixture;
  const rejected: readonly BoundaryCase[] = [
    rejectActivation(
      fixture,
      "rejects a non-damage attack hit",
      "synthetic-ice-knife-first-hit-effect",
      "prepared",
      (mechanics) => ({
        ...mechanics,
        phases: [
          {
            ...attackPhase(mechanics),
            onHit: [
              {
                kind: "ignite_objects",
                filter: {
                  material: "flammable",
                  targetRelation: "not_worn_or_carried",
                },
              },
            ],
          },
          saveGatePhase(mechanics),
        ],
      }),
    ),
    rejectActivation(
      fixture,
      "rejects an attack damage type hole",
      "synthetic-ice-knife-damage-type-hole",
      "prepared",
      (mechanics) => ({
        ...mechanics,
        phases: [
          {
            ...attackPhase(mechanics),
            onHit: [
              {
                ...damageEffect(attackPhase(mechanics)),
                damageType: {
                  kind: "hole",
                  holeId: "synthetic-ice-knife-damage-type",
                  label: "synthetic damage type",
                  value: {
                    kind: "choice",
                    label: "synthetic damage type",
                    options: ["cold", "fire"],
                  },
                },
              },
            ],
          },
          saveGatePhase(mechanics),
        ],
      }),
    ),
    rejectActivation(
      fixture,
      "rejects an unsupported burst damage amount",
      "synthetic-ice-knife-burst-amount",
      "prepared",
      (mechanics) => ({
        ...mechanics,
        phases: [
          attackPhase(mechanics),
          {
            ...saveGatePhase(mechanics),
            onFail: {
              ...saveGatePhase(mechanics).onFail,
              amount: {
                kind: "linear_per_level",
                axis: "slot",
                startingAtLevel: 4,
                base: { dice: 2, dieSize: 6 },
                perLevel: { dice: 1 },
              },
            },
          },
        ],
      }),
    ),
    rejectActivation(
      fixture,
      "rejects a non-five-foot primary-target emanation",
      "synthetic-ice-knife-wide-burst",
      "prepared",
      (mechanics) => {
        const burst = saveGatePhase(mechanics);
        const attachment = holeAttachment(burst);
        return {
          ...mechanics,
          phases: [
            attackPhase(mechanics),
            {
              ...burst,
              attachment: {
                ...attachment,
                value: {
                  ...attachment.value,
                  shape: { kind: "emanation", radiusFeet: 10 },
                },
              },
            },
          ],
        };
      },
    ),
  ];
  return {
    rejected,
    admittedDirectEmanation: syntheticActivationSpell(
      base,
      "synthetic-ice-knife-direct-burst-attachment",
      (mechanics) => {
        const burst = saveGatePhase(mechanics);
        return {
          ...mechanics,
          phases: [
            attackPhase(mechanics),
            { ...burst, attachment: holeAttachment(burst).value },
          ],
        };
      },
    ),
  };
}

function eldritchBlastBoundaryCases(): readonly BoundaryCase[] {
  const fixture = activationFixture("eldritch_blast");
  const { phase } = fixture;
  const damage = damageEffect(phase);
  if (damage?.kind !== "damage" || phase.attachment.kind !== "hole") {
    throw new Error("Expected Eldritch Blast attack shape.");
  }
  const selection = phase.attachment.value;
  if (selection.kind !== "target") {
    throw new Error("Expected Eldritch Blast target attachment.");
  }
  return [
    rejectAttackPhase(
      fixture,
      "rejects an unsupported cantrip damage amount",
      "synthetic-eldritch-blast-slot-amount",
      "cantrip",
      (phase) => ({
        ...phase,
        onHit: [
          {
            ...damage,
            amount: {
              kind: "linear_per_level",
              axis: "slot",
              startingAtLevel: 1,
              base: { dice: 1, dieSize: 10 },
              perLevel: { dice: 1 },
            },
          },
        ],
      }),
    ),
    rejectAttackPhase(
      fixture,
      "rejects a non-threshold cantrip beam count",
      "synthetic-eldritch-blast-linear-count",
      "cantrip",
      (phase) => ({
        ...phase,
        attachment: {
          ...phase.attachment,
          value: {
            ...selection,
            selection: {
              ...selection.selection,
              count: {
                kind: "linear",
                base: 1,
                perSlotAboveBase: 1,
                baseLevel: 1,
              },
            },
          },
        },
      }),
    ),
  ];
}

describe("decoded attack-damage spell profile boundaries", () => {
  const iceKnifeCases = iceKnifeBoundaryCases();
  const boundaryCases: readonly BoundaryCase[] = [
    ...rayOfFrostBoundaryCases(),
    ...fireBoltBoundaryCases(),
    ...acidArrowBoundaryCases(),
    scorchingRayBoundaryCase(),
    chromaticOrbBoundaryCase(),
    ...iceKnifeCases.rejected,
  ];
  for (const boundaryCase of boundaryCases) {
    test(boundaryCase.name, () => {
      expectNoActionSpell(boundaryCase, "wizard");
    });
  }

  for (const boundaryCase of eldritchBlastBoundaryCases()) {
    test(boundaryCase.name, () => {
      expectNoActionSpell(boundaryCase, "warlock");
    });
  }

  test("admits a decoded direct primary-target emanation shape", () => {
    expectAttackBurstActionSpell(iceKnifeCases.admittedDirectEmanation);
  });
});
